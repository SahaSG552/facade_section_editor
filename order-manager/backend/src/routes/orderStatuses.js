import { getDb } from '../db.js';

export async function orderStatusesRoutes(fastify) {
  fastify.get('/order-statuses', async () => {
    const db = await getDb();
    const result = await db.query(
      `
        SELECT id, code, name, stage, is_active, sort_order, is_system, created_at, updated_at
        FROM order_statuses
        ORDER BY sort_order, code
      `
    );

    return { data: result.rows };
  });

  fastify.post('/order-statuses', {
    preHandler: [fastify.requireAdmin],
  }, async (request, reply) => {
    const { code, name, stage, isActive = true, sortOrder = 100 } = request.body || {};

    if (!code || !name || !stage) {
      return reply.code(400).send({ error: 'code, name and stage are required' });
    }

    const db = await getDb();
    try {
      const result = await db.query(
        `
          INSERT INTO order_statuses (code, name, stage, is_active, sort_order, is_system)
          VALUES ($1, $2, $3, $4, $5, false)
          RETURNING id, code, name, stage, is_active, sort_order, is_system, created_at, updated_at
        `,
        [code, name, stage, Boolean(isActive), Number(sortOrder)]
      );
      return reply.code(201).send(result.rows[0]);
    } catch (error) {
      return reply.code(400).send({ error: error.message || 'Failed to create status' });
    }
  });

  fastify.patch('/order-statuses/:id', {
    preHandler: [fastify.requireAdmin],
  }, async (request, reply) => {
    const { id } = request.params;
    const { name, stage, isActive, sortOrder } = request.body || {};

    const fields = [];
    const values = [];
    let i = 1;

    if (name !== undefined) {
      fields.push(`name = $${i++}`);
      values.push(name);
    }
    if (stage !== undefined) {
      fields.push(`stage = $${i++}`);
      values.push(stage);
    }
    if (isActive !== undefined) {
      fields.push(`is_active = $${i++}`);
      values.push(Boolean(isActive));
    }
    if (sortOrder !== undefined) {
      fields.push(`sort_order = $${i++}`);
      values.push(Number(sortOrder));
    }

    if (fields.length === 0) {
      return reply.code(400).send({ error: 'No fields to update' });
    }

    values.push(id);
    const db = await getDb();
    const result = await db.query(
      `
        UPDATE order_statuses
        SET ${fields.join(', ')}
        WHERE id = $${i}
        RETURNING id, code, name, stage, is_active, sort_order, is_system, created_at, updated_at
      `,
      values
    );

    if (result.rows.length === 0) {
      return reply.code(404).send({ error: 'Status not found' });
    }

    return result.rows[0];
  });
}
