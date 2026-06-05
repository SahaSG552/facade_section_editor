import { getDb } from '../db.js';

async function findUserByLogin(login) {
  const db = await getDb();
  const result = await db.query(
    `
      SELECT
        u.id,
        u.username,
        u.email,
        u.display_name,
        u.role_id,
        u.is_active,
        u.is_blocked,
        u.block_reason,
        u.deleted_at,
        r.code AS role_code,
        r.name AS role_name,
        r.menus,
        r.panels,
        r.permissions
      FROM users u
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
    role: {
      id: row.role_id,
      code: row.role_code,
      name: row.role_name,
      menus: row.menus || [],
      panels: row.panels || [],
      permissions: row.permissions || [],
    },
  };
}

export async function authRoutes(fastify) {
  fastify.post('/auth/register', async (request, reply) => {
    const { username, email, password, displayName } = request.body || {};

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
          VALUES ($1, $2, crypt($3, gen_salt('bf')), $4, NULL, true)
          RETURNING id, username, email, display_name, created_at
        `,
        [username, email, password, displayName || null]
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
      createdAt: result.rows[0].created_at,
      status: 'pending_role_assignment',
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

    if (!userRow.role_id) {
      return reply.code(403).send({ error: 'Role is not assigned yet' });
    }

    const valid = await verifyPassword(userRow.id, password);
    if (!valid) {
      return reply.code(401).send({ error: 'Invalid credentials' });
    }

    const user = toUserPayload(userRow);
    const token = await reply.jwtSign({
      sub: user.id,
      username: user.username,
      roleId: user.role.id,
      roleCode: user.role.code,
    });

    return { token, user };
  });

  fastify.get('/auth/me', async (request, reply) => {
    const identity = request.user;
    const userRow = await findUserByLogin(identity.username);

    if (!userRow || !userRow.is_active || userRow.deleted_at || userRow.is_blocked) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    if (!userRow.role_id) {
      return reply.code(403).send({ error: 'Role is not assigned yet' });
    }

    return { user: toUserPayload(userRow) };
  });
}
