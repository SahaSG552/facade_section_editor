import { getDb } from '../db.js';

export class OrderRepository {
  async findAll(filters = {}) {
    const db = await getDb();
    const { page = 1, limit = 20, status } = filters;
    const offset = (page - 1) * limit;

    let query = `
      SELECT o.*, 
             c.name as customer_name,
             c.email as customer_email
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (status) {
      query += ` AND o.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    query += ` ORDER BY o.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await db.query(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) FROM orders o WHERE 1=1';
    const countParams = [];
    let countIndex = 1;
    if (status) {
      countQuery += ` AND o.status = $${countIndex}`;
      countParams.push(status);
      countIndex++;
    }
    const countResult = await db.query(countQuery, countParams);

    return {
      data: result.rows,
      total: parseInt(countResult.rows[0].count),
      page,
      limit,
    };
  }

  async findById(id) {
    const db = await getDb();
    const query = `
      SELECT o.*, 
             c.name as customer_name,
             c.email as customer_email
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      WHERE o.id = $1
    `;
    const result = await db.query(query, [id]);
    if (result.rows.length === 0) return null;

    const order = result.rows[0];

    // Fetch order items
    const itemsQuery = `
      SELECT oi.*,
             m.name as material_name,
             m.code as material_code,
             co.name as coating_name,
             dc.name as design_name
      FROM order_items oi
      LEFT JOIN materials m ON oi.material_id = m.id
      LEFT JOIN coatings co ON oi.coating_id = co.id
      LEFT JOIN design_catalog dc ON oi.design_id = dc.id
      WHERE oi.order_id = $1
      ORDER BY oi.sequence_auto
    `;
    const itemsResult = await db.query(itemsQuery, [id]);
    order.items = itemsResult.rows;

    return order;
  }

  async create(orderData, items = []) {
    const db = await getDb();
    const client = await db.connect();

    try {
      await client.query('BEGIN');

      // Generate order number
      const orderNumber = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      const orderQuery = `
        INSERT INTO orders (order_number, customer_id, status, notes, created_by)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `;
      const orderResult = await client.query(orderQuery, [
        orderNumber,
        orderData.customerId,
        orderData.status || 'draft',
        orderData.notes || null,
        orderData.createdBy || null,
      ]);

      const order = orderResult.rows[0];

      // Insert items
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const itemQuery = `
          INSERT INTO order_items (
            order_id, sequence_auto, sequence_manual, element_type,
            width, height, quantity, material_id, coating_id,
            design_id, decor, preview_url
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        `;
        await client.query(itemQuery, [
          order.id,
          i + 1,
          item.sequenceManual || null,
          item.elementType,
          item.width,
          item.height,
          item.quantity || 1,
          item.materialId || null,
          item.coatingId || null,
          item.designId || null,
          item.decor || null,
          item.previewUrl || null,
        ]);
      }

      await client.query('COMMIT');
      return this.findById(order.id);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async update(id, orderData) {
    const db = await getDb();
    const fields = [];
    const values = [];
    let paramIndex = 1;

    if (orderData.status) {
      fields.push(`status = $${paramIndex++}`);
      values.push(orderData.status);
    }
    if (orderData.notes !== undefined) {
      fields.push(`notes = $${paramIndex++}`);
      values.push(orderData.notes);
    }

    if (fields.length === 0) {
      return this.findById(id);
    }

    values.push(id);
    const query = `UPDATE orders SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
    const result = await db.query(query, values);

    if (result.rows.length === 0) return null;
    return this.findById(id);
  }

  async delete(id) {
    const db = await getDb();
    const result = await db.query('DELETE FROM orders WHERE id = $1 RETURNING id', [id]);
    return result.rows.length > 0;
  }
}
