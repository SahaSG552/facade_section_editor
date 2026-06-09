import { getDb } from '../db.js';

export class CustomerRepository {
  async findAll(page = 1, limit = 20) {
    const db = await getDb();
    const offset = (page - 1) * limit;

    const query = `
      SELECT * FROM customers
      ORDER BY name
      LIMIT $1 OFFSET $2
    `;
    const result = await db.query(query, [limit, offset]);

    const countResult = await db.query('SELECT COUNT(*) FROM customers');

    return {
      data: result.rows,
      total: parseInt(countResult.rows[0].count),
      page,
      limit,
    };
  }

  async findById(id) {
    const db = await getDb();
    const result = await db.query('SELECT * FROM customers WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  async findByExternalId(externalId) {
    const db = await getDb();
    const result = await db.query('SELECT * FROM customers WHERE external_id = $1', [externalId]);
    return result.rows[0] || null;
  }

  async findByEmail(email) {
    const db = await getDb();
    const result = await db.query('SELECT * FROM customers WHERE lower(email) = lower($1) LIMIT 1', [email]);
    return result.rows[0] || null;
  }

  async create(customerData) {
    const db = await getDb();
    const query = `
      INSERT INTO customers (external_id, code, name, email, phone, address, tax_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    const result = await db.query(query, [
      customerData.externalId || null,
      customerData.code || null,
      customerData.name,
      customerData.email || null,
      customerData.phone || null,
      customerData.address || null,
      customerData.taxId || null,
    ]);
    return result.rows[0];
  }

  async update(id, customerData) {
    const db = await getDb();
    const fields = [];
    const values = [];
    let paramIndex = 1;

    if (customerData.name) {
      fields.push(`name = $${paramIndex++}`);
      values.push(customerData.name);
    }
    if (customerData.code !== undefined) {
      fields.push(`code = $${paramIndex++}`);
      values.push(customerData.code);
    }
    if (customerData.email !== undefined) {
      fields.push(`email = $${paramIndex++}`);
      values.push(customerData.email);
    }
    if (customerData.phone !== undefined) {
      fields.push(`phone = $${paramIndex++}`);
      values.push(customerData.phone);
    }
    if (customerData.address !== undefined) {
      fields.push(`address = $${paramIndex++}`);
      values.push(customerData.address);
    }
    if (customerData.taxId !== undefined) {
      fields.push(`tax_id = $${paramIndex++}`);
      values.push(customerData.taxId);
    }

    if (fields.length === 0) return this.findById(id);

    values.push(id);
    const query = `UPDATE customers SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
    const result = await db.query(query, values);
    return result.rows[0] || null;
  }

  async delete(id) {
    const db = await getDb();
    const result = await db.query('DELETE FROM customers WHERE id = $1 RETURNING id', [id]);
    return result.rows.length > 0;
  }
}
