import { getDb } from '../db.js';

function asLifecycle(status) {
  return status === 'profile_submitted' || status === 'registered' ? 'review' : status;
}

function toUser(row) {
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    displayName: row.display_name,
    userStatus: asLifecycle(row.user_status),
    reviewNote: row.review_note,
    profileSubmittedAt: row.profile_submitted_at,
    reviewedAt: row.reviewed_at,
    company: row.company_id ? {
      id: row.company_id,
      name: row.company_name,
      status: row.company_status,
    } : null,
    profile: {
      firstName: row.first_name || '',
      lastName: row.last_name || '',
      positionTitle: row.position_title || '',
    },
    isActive: row.is_active,
    isBlocked: row.is_blocked,
    blockReason: row.block_reason,
    blockedAt: row.blocked_at,
    deletedAt: row.deleted_at,
    role: row.role_id ? {
      id: row.role_id,
      code: row.role_code,
      name: row.role_name,
      menus: row.menus,
      panels: row.panels,
      permissions: row.permissions,
    } : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toCompany(row) {
  return {
    id: row.id,
    name: row.name,
    legalName: row.legal_name,
    website: row.website,
    logoUrl: row.logo_url,
    contactEmail: row.contact_email,
    socialLinks: row.social_links || {},
    status: row.status,
    reviewNote: row.review_note,
    reviewedAt: row.reviewed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function addBan(kind, value, reason, createdBy) {
  const db = await getDb();
  const exists = await db.query(
    `
      SELECT id
      FROM banned_identities
      WHERE kind = $1 AND lower(value) = lower($2)
      LIMIT 1
    `,
    [kind, value]
  );

  if (exists.rows.length > 0) {
    return;
  }

  await db.query(
    `
      INSERT INTO banned_identities (kind, value, reason, created_by)
      VALUES ($1, $2, $3, $4)
    `,
    [kind, value, reason || null, createdBy || null]
  );
}

export async function usersRoutes(fastify) {
  fastify.get('/users', {
    preHandler: [fastify.requireAdmin],
  }, async () => {
    const db = await getDb();
    const result = await db.query(`
      SELECT
        u.id,
        u.username,
        u.email,
        u.display_name,
        u.user_status,
        u.review_note,
        u.profile_submitted_at,
        u.reviewed_at,
        up.first_name,
        up.last_name,
        up.position_title,
        up.company_id,
        c.name AS company_name,
        c.status AS company_status,
        u.is_active,
        u.is_blocked,
        u.block_reason,
        u.blocked_at,
        u.deleted_at,
        u.created_at,
        u.updated_at,
        r.id AS role_id,
        r.code AS role_code,
        r.name AS role_name,
        r.menus,
        r.panels,
        r.permissions
      FROM users u
      LEFT JOIN user_profiles up ON up.user_id = u.id
      LEFT JOIN companies c ON c.id = up.company_id
      LEFT JOIN roles r ON r.id = u.role_id
      ORDER BY u.created_at DESC
    `);

    return { data: result.rows.map(toUser) };
  });

  fastify.post('/users', {
    preHandler: [fastify.requireAdmin],
  }, async (request, reply) => {
    const { username, email, password, displayName, roleId } = request.body || {};

    if (!username || !email || !password) {
      return reply.code(400).send({ error: 'username, email, password are required' });
    }

    const db = await getDb();
    let result;
    try {
      result = await db.query(
        `
          INSERT INTO users (username, email, password_hash, display_name, role_id)
          VALUES ($1, $2, crypt($3, gen_salt('bf')), $4, $5)
          RETURNING id, username, email, display_name, is_active, is_blocked, block_reason, blocked_at, deleted_at, created_at, updated_at
        `,
        [username, email, password, displayName || null, roleId || null]
      );
    } catch (error) {
      if (error?.code === '23505') {
        return reply.code(409).send({ error: 'User with this username or email already exists' });
      }
      throw error;
    }

    const user = result.rows[0];
    return reply.code(201).send({
      id: user.id,
      username: user.username,
      email: user.email,
      displayName: user.display_name,
      isActive: user.is_active,
      isBlocked: user.is_blocked,
      blockReason: user.block_reason,
      blockedAt: user.blocked_at,
      deletedAt: user.deleted_at,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    });
  });

  fastify.patch('/users/:id/assign-role', {
    preHandler: [fastify.requireAdmin],
  }, async (request, reply) => {
    const { id } = request.params;
    const { roleId } = request.body || {};

    if (!roleId) {
      return reply.code(400).send({ error: 'roleId is required' });
    }

    const db = await getDb();
    const result = await db.query(
      `
        UPDATE users
        SET role_id = $1
        WHERE id = $2
        RETURNING id
      `,
      [roleId, id]
    );

    if (result.rows.length === 0) {
      return reply.code(404).send({ error: 'User not found' });
    }

    return { success: true };
  });

  fastify.patch('/users/:id/review', {
    preHandler: [fastify.requireAdmin],
  }, async (request, reply) => {
    const { id } = request.params;
    const { decision, roleId, reviewNote } = request.body || {};

    if (!['approved', 'rejected'].includes(decision)) {
      return reply.code(400).send({ error: 'decision must be approved or rejected' });
    }
    if (decision === 'approved' && !roleId) {
      return reply.code(400).send({ error: 'roleId is required for approval' });
    }

    const db = await getDb();
    await db.query('BEGIN');
    try {
      const result = await db.query(
        `
          UPDATE users
          SET user_status = $1,
              role_id = CASE WHEN $1 = 'approved' THEN $2 ELSE role_id END,
              review_note = $3,
              reviewed_by = $4,
              reviewed_at = CURRENT_TIMESTAMP
          WHERE id = $5
          RETURNING id
        `,
        [decision, roleId || null, reviewNote || null, request.user?.sub || null, id]
      );

      if (result.rows.length === 0) {
        await db.query('ROLLBACK');
        return reply.code(404).send({ error: 'User not found' });
      }

      if (decision === 'approved') {
        await db.query(
          `
            UPDATE companies c
            SET status = 'approved',
                review_note = NULL,
                reviewed_by = $1,
                reviewed_at = CURRENT_TIMESTAMP
            FROM user_profiles up
            WHERE up.user_id = $2
              AND up.company_id = c.id
              AND c.status = 'pending_review'
          `,
          [request.user?.sub || null, id]
        );
      }

      await db.query('COMMIT');
    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }

    return { success: true };
  });

  fastify.get('/users/review-queue', {
    preHandler: [fastify.requireAdmin],
  }, async () => {
    const db = await getDb();
    const result = await db.query(
      `
        SELECT
          u.id,
          u.username,
          u.email,
          u.user_status,
          u.review_note,
          u.profile_submitted_at,
          up.first_name,
          up.last_name,
          up.position_title,
          up.company_id,
          c.name AS company_name,
          c.status AS company_status,
          u.created_at
        FROM users u
        LEFT JOIN user_profiles up ON up.user_id = u.id
        LEFT JOIN companies c ON c.id = up.company_id
        WHERE u.user_status IN ('registered', 'profile_submitted', 'rejected')
          AND u.deleted_at IS NULL
        ORDER BY u.profile_submitted_at DESC NULLS LAST, u.created_at DESC
      `
    );

    return {
      data: result.rows.map((row) => ({
        id: row.id,
        username: row.username,
        email: row.email,
        userStatus: asLifecycle(row.user_status),
        reviewNote: row.review_note,
        profileSubmittedAt: row.profile_submitted_at,
        firstName: row.first_name || '',
        lastName: row.last_name || '',
        positionTitle: row.position_title || '',
        companyId: row.company_id || null,
        companyName: row.company_name || null,
        companyStatus: row.company_status || null,
        createdAt: row.created_at,
      })),
    };
  });

  fastify.get('/companies', {
    preHandler: [fastify.requireAdmin],
  }, async () => {
    const db = await getDb();
    const result = await db.query(
      `
        SELECT
          id,
          name,
          legal_name,
          website,
          logo_url,
          contact_email,
          social_links,
          status,
          review_note,
          reviewed_at,
          created_at,
          updated_at
        FROM companies
        ORDER BY created_at DESC
      `
    );
    return { data: result.rows.map(toCompany) };
  });

  fastify.get('/companies/my', async (request, reply) => {
    const userId = request.user?.sub;
    if (!userId) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    const db = await getDb();
    const result = await db.query(
      `
        SELECT
          c.id,
          c.name,
          c.legal_name,
          c.website,
          c.logo_url,
          c.contact_email,
          c.social_links,
          c.status,
          c.review_note,
          c.reviewed_at,
          c.created_at,
          c.updated_at
        FROM user_profiles up
        JOIN companies c ON c.id = up.company_id
        WHERE up.user_id = $1
        LIMIT 1
      `,
      [userId]
    );

    return { company: result.rows[0] ? toCompany(result.rows[0]) : null };
  });

  fastify.post('/companies', {
    preHandler: [fastify.requireAdmin],
  }, async (request, reply) => {
    const {
      name,
      legalName,
      website,
      logoUrl,
      contactEmail,
      socialLinks,
      status,
    } = request.body || {};

    if (!name || !String(name).trim()) {
      return reply.code(400).send({ error: 'name is required' });
    }

    const db = await getDb();
    let result;
    try {
      result = await db.query(
        `
          INSERT INTO companies (name, legal_name, website, logo_url, contact_email, social_links, status)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING id, name, legal_name, website, logo_url, contact_email, social_links, status, review_note, reviewed_at, created_at, updated_at
        `,
        [
          String(name).trim(),
          legalName ? String(legalName).trim() : null,
          website ? String(website).trim() : null,
          logoUrl ? String(logoUrl).trim() : null,
          contactEmail ? String(contactEmail).trim().toLowerCase() : null,
          socialLinks && typeof socialLinks === 'object' ? socialLinks : {},
          ['pending_review', 'approved', 'rejected', 'blocked'].includes(status) ? status : 'approved',
        ]
      );
    } catch (error) {
      if (error?.code === '23505') {
        return reply.code(409).send({ error: 'Company with this name already exists' });
      }
      throw error;
    }

    return reply.code(201).send(toCompany(result.rows[0]));
  });

  fastify.patch('/companies/:id', {
    preHandler: [fastify.requireAdmin],
  }, async (request, reply) => {
    const { id } = request.params;
    const {
      name,
      legalName,
      website,
      logoUrl,
      contactEmail,
      status,
      reviewNote,
    } = request.body || {};

    const db = await getDb();
    const result = await db.query(
      `
        UPDATE companies
        SET name = COALESCE($1, name),
            legal_name = COALESCE($2, legal_name),
            website = COALESCE($3, website),
            logo_url = COALESCE($4, logo_url),
            contact_email = COALESCE($5, contact_email),
            status = COALESCE($6, status),
            review_note = COALESCE($7, review_note),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $8
        RETURNING id, name, legal_name, website, logo_url, contact_email, social_links, status, review_note, reviewed_at, created_at, updated_at
      `,
      [
        name ? String(name).trim() : null,
        legalName ? String(legalName).trim() : null,
        website ? String(website).trim() : null,
        logoUrl ? String(logoUrl).trim() : null,
        contactEmail ? String(contactEmail).trim().toLowerCase() : null,
        status && ['pending_review', 'approved', 'rejected', 'blocked'].includes(status) ? status : null,
        reviewNote !== undefined ? reviewNote : null,
        id,
      ]
    );

    if (result.rows.length === 0) {
      return reply.code(404).send({ error: 'Company not found' });
    }

    return { company: toCompany(result.rows[0]) };
  });

  fastify.get('/companies/:id/employees', async (request, reply) => {
    const { id } = request.params;
    const requesterId = request.user?.sub;
    const isAdminUser = request.user?.roleCode === 'admin';

    if (!requesterId) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    const db = await getDb();
    if (!isAdminUser) {
      const access = await db.query(
        `
          SELECT company_id
          FROM user_profiles
          WHERE user_id = $1
            AND company_id = $2
          LIMIT 1
        `,
        [requesterId, id]
      );
      if (access.rows.length === 0) {
        return reply.code(403).send({ error: 'Forbidden' });
      }
    }

    const result = await db.query(
      `
        SELECT
          u.id,
          u.username,
          u.email,
          u.user_status,
          up.first_name,
          up.last_name,
          up.position_title,
          r.code AS role_code,
          r.name AS role_name
        FROM user_profiles up
        JOIN users u ON u.id = up.user_id
        LEFT JOIN roles r ON r.id = u.role_id
        WHERE up.company_id = $1
          AND u.deleted_at IS NULL
        ORDER BY u.created_at DESC
      `,
      [id]
    );

    return {
      data: result.rows.map((row) => ({
        id: row.id,
        username: row.username,
        email: row.email,
        userStatus: asLifecycle(row.user_status),
        firstName: row.first_name || '',
        lastName: row.last_name || '',
        positionTitle: row.position_title || '',
        roleCode: row.role_code || null,
        roleName: row.role_name || null,
      })),
    };
  });

  fastify.patch('/users/:id/company-membership', {
    preHandler: [fastify.requireAdmin],
  }, async (request, reply) => {
    const { id } = request.params;
    const { companyId, positionTitle, roleId, reviewNote, lifecycle } = request.body || {};
    const normalizedLifecycle = lifecycle === 'review' ? 'review' : 'approved';

    if (id === request.user?.sub && normalizedLifecycle !== 'approved') {
      return reply.code(400).send({ error: 'You cannot move your own admin account to review' });
    }

    if (normalizedLifecycle === 'approved' && !companyId) {
      return reply.code(400).send({ error: 'companyId is required for approved lifecycle' });
    }

    const db = await getDb();
    await db.query('BEGIN');
    try {
      const userResult = await db.query('SELECT id FROM users WHERE id = $1 LIMIT 1', [id]);
      if (userResult.rows.length === 0) {
        await db.query('ROLLBACK');
        return reply.code(404).send({ error: 'User not found' });
      }

      if (normalizedLifecycle === 'approved') {
        const companyResult = await db.query('SELECT id FROM companies WHERE id = $1 LIMIT 1', [companyId]);
        if (companyResult.rows.length === 0) {
          await db.query('ROLLBACK');
          return reply.code(404).send({ error: 'Company not found' });
        }

        await db.query(
          `
            INSERT INTO user_profiles (user_id, first_name, last_name, position_title, company_id)
            VALUES ($1, '', '', $2, $3)
            ON CONFLICT (user_id)
            DO UPDATE SET
              position_title = COALESCE($2, user_profiles.position_title),
              company_id = $3,
              updated_at = CURRENT_TIMESTAMP
          `,
          [id, positionTitle ? String(positionTitle).trim() : null, companyId]
        );

        await db.query(
          `
            UPDATE users
            SET user_status = 'approved',
                role_id = COALESCE($1, role_id),
                review_note = $2,
                reviewed_by = $3,
                reviewed_at = CURRENT_TIMESTAMP
            WHERE id = $4
          `,
          [roleId || null, reviewNote || null, request.user?.sub || null, id]
        );

        await db.query(
          `
            UPDATE companies
            SET status = 'approved',
                reviewed_by = $1,
                reviewed_at = CURRENT_TIMESTAMP
            WHERE id = $2
              AND status IN ('pending_review', 'rejected')
          `,
          [request.user?.sub || null, companyId]
        );
      } else {
        await db.query(
          `
            INSERT INTO user_profiles (user_id, first_name, last_name, position_title, company_id)
            VALUES ($1, '', '', $2, NULL)
            ON CONFLICT (user_id)
            DO UPDATE SET
              position_title = COALESCE($2, user_profiles.position_title),
              company_id = NULL,
              updated_at = CURRENT_TIMESTAMP
          `,
          [id, positionTitle ? String(positionTitle).trim() : null]
        );

        await db.query(
          `
            UPDATE users
            SET user_status = 'profile_submitted',
                role_id = COALESCE($1, role_id),
                review_note = $2,
                reviewed_by = $3,
                reviewed_at = CURRENT_TIMESTAMP
            WHERE id = $4
          `,
          [roleId || null, reviewNote || null, request.user?.sub || null, id]
        );
      }

      await db.query('COMMIT');
    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }

    return { success: true };
  });

  fastify.patch('/users/:id/block', {
    preHandler: [fastify.requireAdmin],
  }, async (request, reply) => {
    const { id } = request.params;
    const { reason, addEmailToBanList = true, addUsernameToBanList = true } = request.body || {};
    const db = await getDb();

    const userResult = await db.query('SELECT id, email, username FROM users WHERE id = $1', [id]);
    if (userResult.rows.length === 0) {
      return reply.code(404).send({ error: 'User not found' });
    }

    await db.query(
      `
        UPDATE users
        SET is_blocked = true,
            block_reason = $1,
            blocked_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `,
      [reason || null, id]
    );

    const actorId = request.user?.sub || null;
    const user = userResult.rows[0];

    if (addEmailToBanList && user.email) {
      await addBan('email', user.email, reason || 'Blocked by admin', actorId);
    }
    if (addUsernameToBanList && user.username) {
      await addBan('username', user.username, reason || 'Blocked by admin', actorId);
    }

    return { success: true };
  });

  fastify.patch('/users/:id/unblock', {
    preHandler: [fastify.requireAdmin],
  }, async (request, reply) => {
    const { id } = request.params;
    const db = await getDb();
    const result = await db.query(
      `
        UPDATE users
        SET is_blocked = false,
            block_reason = NULL,
            blocked_at = NULL
        WHERE id = $1
        RETURNING id
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return reply.code(404).send({ error: 'User not found' });
    }

    return { success: true };
  });

  fastify.delete('/users/:id', {
    preHandler: [fastify.requireAdmin],
  }, async (request, reply) => {
    const { id } = request.params;
    const { reason = 'Deleted by admin', addEmailToBanList = false, addUsernameToBanList = false } = request.body || {};
    const db = await getDb();

    const userResult = await db.query('SELECT id, email, username FROM users WHERE id = $1', [id]);
    if (userResult.rows.length === 0) {
      return reply.code(404).send({ error: 'User not found' });
    }

    await db.query(
      `
        UPDATE users
        SET deleted_at = CURRENT_TIMESTAMP,
            is_active = false,
            is_blocked = true,
            block_reason = $1,
            blocked_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `,
      [reason, id]
    );

    const actorId = request.user?.sub || null;
    const user = userResult.rows[0];
    if (addEmailToBanList && user.email) {
      await addBan('email', user.email, reason, actorId);
    }
    if (addUsernameToBanList && user.username) {
      await addBan('username', user.username, reason, actorId);
    }

    return reply.code(204).send();
  });

  fastify.get('/bans', {
    preHandler: [fastify.requireAdmin],
  }, async () => {
    const db = await getDb();
    const result = await db.query(
      `
        SELECT id, kind, value, reason, created_by, created_at
        FROM banned_identities
        ORDER BY created_at DESC
      `
    );
    return { data: result.rows };
  });

  fastify.post('/bans', {
    preHandler: [fastify.requireAdmin],
  }, async (request, reply) => {
    const { kind, value, reason } = request.body || {};

    if (!kind || !value || !['email', 'username'].includes(kind)) {
      return reply.code(400).send({ error: 'kind(email|username) and value are required' });
    }

    const db = await getDb();
    const existing = await db.query(
      `
        SELECT id
        FROM banned_identities
        WHERE kind = $1 AND lower(value) = lower($2)
        LIMIT 1
      `,
      [kind, value]
    );

    let result;
    if (existing.rows.length > 0) {
      result = await db.query(
        `
          UPDATE banned_identities
          SET reason = $1
          WHERE id = $2
          RETURNING id, kind, value, reason, created_by, created_at
        `,
        [reason || null, existing.rows[0].id]
      );
    } else {
      result = await db.query(
        `
          INSERT INTO banned_identities (kind, value, reason, created_by)
          VALUES ($1, $2, $3, $4)
          RETURNING id, kind, value, reason, created_by, created_at
        `,
        [kind, value, reason || null, request.user?.sub || null]
      );
    }

    return reply.code(201).send(result.rows[0]);
  });

  fastify.delete('/bans/:id', {
    preHandler: [fastify.requireAdmin],
  }, async (request, reply) => {
    const { id } = request.params;
    const db = await getDb();
    const result = await db.query('DELETE FROM banned_identities WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) {
      return reply.code(404).send({ error: 'Ban not found' });
    }
    return reply.code(204).send();
  });
}
