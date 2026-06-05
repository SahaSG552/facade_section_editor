import { getDb } from '../db.js';

export async function rolesRoutes(fastify) {
  fastify.post('/roles', {
    preHandler: [fastify.requireAdmin],
  }, async (request, reply) => {
    const { code, name, menus = [], panels = [], permissions = [] } = request.body || {};

    if (!code || !name) {
      return reply.code(400).send({ error: 'code and name are required' });
    }

    const db = await getDb();
    const result = await db.query(
      `
        INSERT INTO roles (code, name, menus, panels, permissions)
        VALUES ($1, $2, $3::jsonb, $4::jsonb, $5::jsonb)
        RETURNING id, code, name, menus, panels, permissions, is_system, created_at, updated_at
      `,
      [code, name, JSON.stringify(menus), JSON.stringify(panels), JSON.stringify(permissions)]
    );

    return reply.code(201).send(result.rows[0]);
  });

  fastify.get('/roles', async (request, reply) => {
    const db = await getDb();
    const result = await db.query(
      'SELECT id, code, name, menus, panels, permissions, is_system, created_at, updated_at FROM roles ORDER BY code'
    );
    return { data: result.rows };
  });

  fastify.patch('/roles/:id', {
    preHandler: [fastify.requireAdmin],
  }, async (request, reply) => {
    const { id } = request.params;
    const { name, menus, panels, permissions } = request.body || {};

    const fields = [];
    const values = [];
    let i = 1;

    if (name !== undefined) {
      fields.push(`name = $${i++}`);
      values.push(name);
    }
    if (menus !== undefined) {
      fields.push(`menus = $${i++}::jsonb`);
      values.push(JSON.stringify(menus));
    }
    if (panels !== undefined) {
      fields.push(`panels = $${i++}::jsonb`);
      values.push(JSON.stringify(panels));
    }
    if (permissions !== undefined) {
      fields.push(`permissions = $${i++}::jsonb`);
      values.push(JSON.stringify(permissions));
    }

    if (fields.length === 0) {
      return reply.code(400).send({ error: 'No fields to update' });
    }

    values.push(id);

    const db = await getDb();
    const query = `
      UPDATE roles
      SET ${fields.join(', ')}
      WHERE id = $${i}
      RETURNING id, code, name, menus, panels, permissions, is_system, created_at, updated_at
    `;

    const result = await db.query(query, values);
    if (result.rows.length === 0) {
      return reply.code(404).send({ error: 'Role not found' });
    }

    return result.rows[0];
  });
}
