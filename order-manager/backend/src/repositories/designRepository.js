import { getDb } from '../db.js';

export class DesignRepository {
  async findAll(page = 1, limit = 200) {
    const db = await getDb();
    const offset = (page - 1) * limit;

    const query = `
      SELECT *
      FROM design_catalog
      ORDER BY name
      LIMIT $1 OFFSET $2
    `;
    const result = await db.query(query, [limit, offset]);

    const countResult = await db.query('SELECT COUNT(*) FROM design_catalog');

    return {
      data: result.rows,
      total: parseInt(countResult.rows[0].count, 10),
      page,
      limit,
    };
  }
}
