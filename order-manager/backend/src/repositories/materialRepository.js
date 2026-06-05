import { getDb } from '../db.js';

export class MaterialRepository {
  async findAll(page = 1, limit = 20) {
    const db = await getDb();
    const offset = (page - 1) * limit;

    const query = `
      SELECT * FROM materials
      ORDER BY name
      LIMIT $1 OFFSET $2
    `;
    const result = await db.query(query, [limit, offset]);

    const countResult = await db.query('SELECT COUNT(*) FROM materials');

    return {
      data: result.rows,
      total: parseInt(countResult.rows[0].count),
      page,
      limit,
    };
  }

  async findById(id) {
    const db = await getDb();
    const result = await db.query('SELECT * FROM materials WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  async findByCode(code) {
    const db = await getDb();
    const result = await db.query('SELECT * FROM materials WHERE code = $1', [code]);
    return result.rows[0] || null;
  }

  async create(materialData) {
    const db = await getDb();
    const query = `
      INSERT INTO materials (code, name, description, thickness, density, cost_per_sqm, supplier, in_stock)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    const result = await db.query(query, [
      materialData.code,
      materialData.name,
      materialData.description || null,
      materialData.thickness || null,
      materialData.density || null,
      materialData.costPerSqm || null,
      materialData.supplier || null,
      materialData.inStock || 0,
    ]);
    return result.rows[0];
  }

  async update(id, materialData) {
    const db = await getDb();
    const fields = [];
    const values = [];
    let paramIndex = 1;

    if (materialData.name) {
      fields.push(`name = $${paramIndex++}`);
      values.push(materialData.name);
    }
    if (materialData.description !== undefined) {
      fields.push(`description = $${paramIndex++}`);
      values.push(materialData.description);
    }
    if (materialData.thickness !== undefined) {
      fields.push(`thickness = $${paramIndex++}`);
      values.push(materialData.thickness);
    }
    if (materialData.costPerSqm !== undefined) {
      fields.push(`cost_per_sqm = $${paramIndex++}`);
      values.push(materialData.costPerSqm);
    }
    if (materialData.inStock !== undefined) {
      fields.push(`in_stock = $${paramIndex++}`);
      values.push(materialData.inStock);
    }

    if (fields.length === 0) return this.findById(id);

    values.push(id);
    const query = `UPDATE materials SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
    const result = await db.query(query, values);
    return result.rows[0] || null;
  }

  async delete(id) {
    const db = await getDb();
    const result = await db.query('DELETE FROM materials WHERE id = $1 RETURNING id', [id]);
    return result.rows.length > 0;
  }
}
