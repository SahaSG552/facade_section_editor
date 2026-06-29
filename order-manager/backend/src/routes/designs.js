import { getDb } from '../db.js';

export async function designsRoutes(fastify) {
  fastify.get('/designs', async (request) => {
    const { page = 1, limit = 200 } = request.query;
    const db = await getDb();
    const offset = (page - 1) * limit;

    const result = await db.query(
      'SELECT * FROM design_catalog ORDER BY name LIMIT $1 OFFSET $2',
      [limit, offset]
    );

    const countResult = await db.query('SELECT COUNT(*) FROM design_catalog');

    return {
      data: result.rows,
      total: parseInt(countResult.rows[0].count, 10),
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
    };
  });
}
