import { getDb } from '../db.js';

export async function customersRoutes(fastify, options) {
  // GET /api/v1/customers
  fastify.get('/customers', async (request, reply) => {
    const { page = 1, limit = 20 } = request.query;
    const db = await getDb();
    const offset = (page - 1) * limit;

    const result = await db.query('SELECT * FROM customers ORDER BY name LIMIT $1 OFFSET $2', [limit, offset]);
    const countResult = await db.query('SELECT COUNT(*) FROM customers');

    return {
      data: result.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      limit: parseInt(limit),
    };
  });

  // GET /api/v1/customers/:id
  fastify.get('/customers/:id', async (request, reply) => {
    const { id } = request.params;
    const db = await getDb();
    const result = await db.query('SELECT * FROM customers WHERE id = $1', [id]);
    if (!result.rows[0]) return reply.code(404).send({ error: 'Customer not found' });
    return result.rows[0];
  });

  // POST /api/v1/customers
  fastify.post('/customers', {
    schema: {
      body: {
        type: 'object',
        required: ['name'],
        properties: {
          externalId: { type: 'string' },
          code: { type: 'string', minLength: 1, maxLength: 20 },
          name: { type: 'string' },
          email: { type: 'string', format: 'email' },
          phone: { type: 'string' },
          address: { type: 'string' },
          taxId: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    const d = request.body;
    const db = await getDb();
    const result = await db.query(
      `INSERT INTO customers (external_id, code, name, email, phone, address, tax_id) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [d.externalId || null, d.code || null, d.name, d.email || null, d.phone || null, d.address || null, d.taxId || null]
    );
    return reply.code(201).send(result.rows[0]);
  });

  // PATCH /api/v1/customers/:id
  fastify.patch('/customers/:id', async (request, reply) => {
    const { id } = request.params;
    const d = request.body;
    const fields = [];
    const values = [];
    let i = 1;

    if (d.name) { fields.push(`name = $${i++}`); values.push(d.name); }
    if (d.code !== undefined) { fields.push(`code = $${i++}`); values.push(d.code); }
    if (d.email !== undefined) { fields.push(`email = $${i++}`); values.push(d.email); }
    if (d.phone !== undefined) { fields.push(`phone = $${i++}`); values.push(d.phone); }
    if (d.address !== undefined) { fields.push(`address = $${i++}`); values.push(d.address); }
    if (d.taxId !== undefined) { fields.push(`tax_id = $${i++}`); values.push(d.taxId); }

    if (fields.length === 0) {
      const db = await getDb();
      const r = await db.query('SELECT * FROM customers WHERE id = $1', [id]);
      return r.rows[0] || reply.code(404).send({ error: 'Customer not found' });
    }

    values.push(id);
    const db = await getDb();
    const result = await db.query(`UPDATE customers SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`, values);
    if (!result.rows[0]) return reply.code(404).send({ error: 'Customer not found' });
    return result.rows[0];
  });

  // DELETE /api/v1/customers/:id
  fastify.delete('/customers/:id', async (request, reply) => {
    const { id } = request.params;
    const db = await getDb();
    const result = await db.query('DELETE FROM customers WHERE id = $1 RETURNING id', [id]);
    if (!result.rows.length) return reply.code(404).send({ error: 'Customer not found' });
    return reply.code(204).send();
  });
}
