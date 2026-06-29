import { getDb } from '../db.js';

export async function orderStatusesRoutes(fastify) {
  fastify.get('/order-statuses', async () => {
    const db = await getDb();
    const result = await db.query(
      `
        SELECT
          os.id,
          os.code,
          os.name,
          os.stage,
          os.is_active,
          os.sort_order,
          os.is_system,
          os.created_at,
          os.updated_at,
          COALESCE(array_agg(osr.user_id) FILTER (WHERE osr.user_id IS NOT NULL), '{}') AS responsible_user_ids
        FROM order_statuses os
        LEFT JOIN order_status_responsibles osr ON osr.status_id = os.id
        GROUP BY os.id
        ORDER BY os.sort_order, os.code
      `
    );

    return { data: result.rows };
  });

  fastify.post('/order-statuses', {
    preHandler: [fastify.requireAdmin],
  }, async (request, reply) => {
    const { code, name, stage, isActive = true, sortOrder = 100, responsibleUserIds = [] } = request.body || {};

    if (!code || !name || !stage) {
      return reply.code(400).send({ error: 'code, name and stage are required' });
    }

    const db = await getDb();
    const client = await db.connect();
    try {
      await client.query('BEGIN');
      const result = await client.query(
        `
          INSERT INTO order_statuses (code, name, stage, is_active, sort_order, is_system)
          VALUES ($1, $2, $3, $4, $5, false)
          RETURNING id, code, name, stage, is_active, sort_order, is_system, created_at, updated_at
        `,
        [code, name, stage, Boolean(isActive), Number(sortOrder)]
      );

      const status = result.rows[0];
      if (Array.isArray(responsibleUserIds) && responsibleUserIds.length > 0) {
        for (const userId of responsibleUserIds) {
          await client.query(
            `
              INSERT INTO order_status_responsibles (status_id, user_id)
              VALUES ($1, $2)
              ON CONFLICT (status_id, user_id) DO NOTHING
            `,
            [status.id, userId]
          );
        }
      }

      await client.query('COMMIT');
      return reply.code(201).send({
        ...status,
        responsible_user_ids: Array.isArray(responsibleUserIds) ? responsibleUserIds : [],
      });
    } catch (error) {
      await client.query('ROLLBACK');
      return reply.code(400).send({ error: error.message || 'Failed to create status' });
    } finally {
      client.release();
    }
  });

  fastify.patch('/order-statuses/:id', {
    preHandler: [fastify.requireAdmin],
  }, async (request, reply) => {
    const { id } = request.params;
    const { name, stage, isActive, sortOrder, responsibleUserIds } = request.body || {};

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

    if (fields.length === 0 && responsibleUserIds === undefined) {
      return reply.code(400).send({ error: 'No fields to update' });
    }

    const db = await getDb();
    const client = await db.connect();
    try {
      await client.query('BEGIN');

      let result;
      if (fields.length > 0) {
        values.push(id);
        result = await client.query(
          `
            UPDATE order_statuses
            SET ${fields.join(', ')}
            WHERE id = $${i}
            RETURNING id, code, name, stage, is_active, sort_order, is_system, created_at, updated_at
          `,
          values
        );
      } else {
        result = await client.query(
          `
            SELECT id, code, name, stage, is_active, sort_order, is_system, created_at, updated_at
            FROM order_statuses
            WHERE id = $1
            LIMIT 1
          `,
          [id]
        );
      }

      if (result.rows.length === 0) {
        await client.query('ROLLBACK');
        return reply.code(404).send({ error: 'Status not found' });
      }

      if (responsibleUserIds !== undefined) {
        await client.query('DELETE FROM order_status_responsibles WHERE status_id = $1', [id]);
        if (Array.isArray(responsibleUserIds) && responsibleUserIds.length > 0) {
          for (const userId of responsibleUserIds) {
            await client.query(
              `
                INSERT INTO order_status_responsibles (status_id, user_id)
                VALUES ($1, $2)
                ON CONFLICT (status_id, user_id) DO NOTHING
              `,
              [id, userId]
            );
          }
        }
      }

      await client.query('COMMIT');
      return {
        ...result.rows[0],
        responsible_user_ids: Array.isArray(responsibleUserIds) ? responsibleUserIds : undefined,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      return reply.code(400).send({ error: error.message || 'Failed to update status' });
    } finally {
      client.release();
    }
  });
}
