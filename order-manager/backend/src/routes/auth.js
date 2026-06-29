import { getDb } from '../db.js';

function asLifecycle(status) {
  return status === 'profile_submitted' || status === 'registered' ? 'review' : status;
}

async function findUserByLogin(login) {
  const db = await getDb();
  const result = await db.query(
    `
      SELECT
        u.id,
        u.username,
        u.email,
        u.display_name,
        u.user_status,
        u.review_note,
        u.profile_submitted_at,
        u.reviewed_at,
        u.role_id,
        u.is_active,
        u.is_blocked,
        u.block_reason,
        u.deleted_at,
        up.first_name,
        up.last_name,
        up.position_title,
        up.avatar_url,
        up.company_id,
        c.name AS company_name,
        c.status AS company_status,
        r.code AS role_code,
        r.name AS role_name,
        r.menus,
        r.panels,
        r.permissions
      FROM users u
      LEFT JOIN user_profiles up ON up.user_id = u.id
      LEFT JOIN companies c ON c.id = up.company_id
      LEFT JOIN roles r ON r.id = u.role_id
      WHERE (u.username = $1 OR u.email = $1)
      LIMIT 1
    `,
    [login]
  );

  return result.rows[0] || null;
}

async function isBanned(kind, value) {
  const db = await getDb();
  const result = await db.query(
    `
      SELECT id
      FROM banned_identities
      WHERE kind = $1 AND lower(value) = lower($2)
      LIMIT 1
    `,
    [kind, value]
  );

  return result.rows.length > 0;
}

async function verifyPassword(userId, password) {
  const db = await getDb();
  const result = await db.query(
    `
      SELECT id
      FROM users
      WHERE id = $1
      AND password_hash = crypt($2, password_hash)
      LIMIT 1
    `,
    [userId, password]
  );

  return result.rows.length > 0;
}

function toUserPayload(row) {
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    displayName: row.display_name,
    userStatus: asLifecycle(row.user_status || 'registered'),
    reviewNote: row.review_note || null,
    profileSubmittedAt: row.profile_submitted_at || null,
    reviewedAt: row.reviewed_at || null,
    profile: {
      firstName: row.first_name || '',
      lastName: row.last_name || '',
      positionTitle: row.position_title || '',
      avatarUrl: row.avatar_url || null,
      companyId: row.company_id || null,
      companyName: row.company_name || null,
      companyStatus: row.company_status || null,
    },
    role: row.role_id ? {
      id: row.role_id,
      code: row.role_code,
      name: row.role_name,
      menus: row.menus || [],
      panels: row.panels || [],
      permissions: row.permissions || [],
    } : null,
  };
}

export async function authRoutes(fastify) {
  fastify.post('/auth/register', async (request, reply) => {
    const { username, email, password } = request.body || {};

    if (!username || !email || !password) {
      return reply.code(400).send({ error: 'username, email, password are required' });
    }

    if (await isBanned('email', email) || await isBanned('username', username)) {
      return reply.code(403).send({ error: 'Registration denied' });
    }

    const db = await getDb();
    let result;
    try {
      result = await db.query(
        `
          INSERT INTO users (username, email, password_hash, display_name, role_id, is_active)
          VALUES ($1, $2, crypt($3, gen_salt('bf')), NULL, NULL, true)
          RETURNING id, username, email, display_name, user_status, created_at
        `,
        [username, email, password]
      );
    } catch (error) {
      if (error?.code === '23505') {
        return reply.code(409).send({ error: 'User with this username or email already exists' });
      }
      throw error;
    }

    return reply.code(201).send({
      id: result.rows[0].id,
      username: result.rows[0].username,
      email: result.rows[0].email,
      displayName: result.rows[0].display_name,
      userStatus: result.rows[0].user_status,
      createdAt: result.rows[0].created_at,
      status: 'onboarding_required',
    });
  });

  fastify.post('/auth/login', async (request, reply) => {
    const { login, password } = request.body || {};

    if (!login || !password) {
      return reply.code(400).send({ error: 'login and password are required' });
    }

    const userRow = await findUserByLogin(login);
    if (!userRow || !userRow.is_active || userRow.deleted_at) {
      return reply.code(401).send({ error: 'Invalid credentials' });
    }

    if (userRow.is_blocked) {
      return reply.code(403).send({ error: `User is blocked${userRow.block_reason ? `: ${userRow.block_reason}` : ''}` });
    }

    const valid = await verifyPassword(userRow.id, password);
    if (!valid) {
      return reply.code(401).send({ error: 'Invalid credentials' });
    }

    const user = toUserPayload(userRow);
    const token = await reply.jwtSign({
      sub: user.id,
      username: user.username,
      roleId: user.role?.id || null,
      roleCode: user.role?.code || null,
      userStatus: user.userStatus,
    });

    return { token, user };
  });

  fastify.get('/auth/me', async (request, reply) => {
    const identity = request.user;
    const userRow = await findUserByLogin(identity.username);

    if (!userRow || !userRow.is_active || userRow.deleted_at || userRow.is_blocked) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    return { user: toUserPayload(userRow) };
  });

  fastify.post('/auth/onboarding-profile', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const userId = request.user?.sub;
    if (!userId) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    const {
      firstName,
      lastName,
      companyName,
      positionTitle,
      avatarUrl,
    } = request.body || {};

    if (!firstName || !lastName || !companyName || !positionTitle) {
      return reply.code(400).send({ error: 'firstName, lastName, companyName, positionTitle are required' });
    }

    const db = await getDb();
    await db.query('BEGIN');
    try {
      const companyResult = await db.query(
        `
          INSERT INTO companies (name, status)
          VALUES ($1, 'pending_review')
          ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
          RETURNING id
        `,
        [companyName.trim()]
      );
      const companyId = companyResult.rows[0].id;

      await db.query(
        `
          INSERT INTO user_profiles (user_id, first_name, last_name, position_title, avatar_url, company_id)
          VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (user_id)
          DO UPDATE SET
            first_name = EXCLUDED.first_name,
            last_name = EXCLUDED.last_name,
            position_title = EXCLUDED.position_title,
            avatar_url = EXCLUDED.avatar_url,
            company_id = EXCLUDED.company_id,
            updated_at = CURRENT_TIMESTAMP
        `,
        [userId, firstName.trim(), lastName.trim(), positionTitle.trim(), avatarUrl || null, companyId]
      );

      await db.query(
        `
          UPDATE users
          SET user_status = 'profile_submitted',
              profile_submitted_at = CURRENT_TIMESTAMP,
              review_note = NULL,
              reviewed_at = NULL,
              reviewed_by = NULL
          WHERE id = $1
        `,
        [userId]
      );

      await db.query('COMMIT');
    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }

    const refreshed = await findUserByLogin(request.user.username);
    return { user: toUserPayload(refreshed), status: 'submitted_for_review' };
  });
}
