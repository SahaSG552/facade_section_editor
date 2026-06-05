import { getDb } from '../db.js';

function toUser(row) {
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    displayName: row.display_name,
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
