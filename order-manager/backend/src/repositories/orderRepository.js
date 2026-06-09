import { getDb } from '../db.js';

export class OrderRepository {
  async getNextBaseNumber(client, customerCode) {
    await client.query(
      `
        INSERT INTO order_counters (customer_code, next_number)
        VALUES ($1, 1)
        ON CONFLICT (customer_code) DO NOTHING
      `,
      [customerCode]
    );

    const counterResult = await client.query(
      'SELECT next_number FROM order_counters WHERE customer_code = $1 FOR UPDATE',
      [customerCode]
    );

    const baseNumber = counterResult.rows[0].next_number;

    await client.query(
      'UPDATE order_counters SET next_number = $1 WHERE customer_code = $2',
      [baseNumber + 1, customerCode]
    );

    return baseNumber;
  }

  async getParentSplitInfo(client, splitFromOrderId) {
    const parentResult = await client.query(
      'SELECT id, order_number, customer_code, base_number FROM orders WHERE id = $1 LIMIT 1',
      [splitFromOrderId]
    );

    if (parentResult.rows.length === 0) {
      return null;
    }

    const parent = parentResult.rows[0];
    const splitResult = await client.query(
      'SELECT COALESCE(MAX(split_part), 0) AS max_split FROM orders WHERE parent_order_id = $1',
      [parent.id]
    );

    return {
      parent,
      nextSplitPart: Number(splitResult.rows[0].max_split) + 1,
    };
  }

  async ensureUniqueOrderName(client, orderName) {
    const result = await client.query('SELECT id FROM orders WHERE order_number = $1 LIMIT 1', [orderName]);
    if (result.rows.length > 0) {
      throw new Error(`Order with name ${orderName} already exists`);
    }
  }

  async findAll(filters = {}) {
    const db = await getDb();
    const { page = 1, limit = 20, status, customerId } = filters;
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

    if (customerId) {
      query += ` AND o.customer_id = $${paramIndex}`;
      params.push(customerId);
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
    if (customerId) {
      countQuery += ` AND o.customer_id = $${countIndex}`;
      countParams.push(customerId);
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

      const customerResult = await client.query(
        'SELECT id, code FROM customers WHERE id = $1 LIMIT 1',
        [orderData.customerId]
      );

      if (customerResult.rows.length === 0) {
        throw new Error('Customer not found');
      }

      const customerCode = customerResult.rows[0].code;
      if (!customerCode || !String(customerCode).trim()) {
        throw new Error('Customer code is required for order numbering');
      }

      let orderNumber;
      let baseNumber = null;
      let splitPart = null;
      let parentOrderId = null;

      if (orderData.splitFromOrderId) {
        const splitInfo = await this.getParentSplitInfo(client, orderData.splitFromOrderId);
        if (!splitInfo) {
          throw new Error('Parent order for split not found');
        }

        parentOrderId = splitInfo.parent.id;
        baseNumber = splitInfo.parent.base_number;
        splitPart = splitInfo.nextSplitPart;
        orderNumber = `${splitInfo.parent.order_number}-${splitPart}`;
      } else {
        baseNumber = await this.getNextBaseNumber(client, customerCode);
        orderNumber = `${customerCode}${baseNumber}`;
      }

      if (orderData.orderName) {
        orderNumber = orderData.orderName.trim();
      }

      await this.ensureUniqueOrderName(client, orderNumber);

      const orderQuery = `
        INSERT INTO orders (
          order_number,
          customer_id,
          status,
          status_code,
          current_stage,
          notes,
          created_by,
          customer_code,
          base_number,
          parent_order_id,
          split_part,
          order_kind
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *
      `;

      const statusCode = orderData.status || 'client_draft';
      const stage = statusCode.includes('designer')
        ? 'designer'
        : statusCode.includes('technologist')
          ? 'technologist'
          : statusCode === 'approved' || statusCode === 'cancelled'
            ? 'done'
            : 'client';

      const orderResult = await client.query(orderQuery, [
        orderNumber,
        orderData.customerId,
        statusCode,
        statusCode,
        stage,
        orderData.notes || null,
        orderData.createdBy || null,
        customerCode,
        baseNumber,
        parentOrderId,
        splitPart,
        orderData.orderKind || 'normal',
      ]);

      const order = orderResult.rows[0];

      await client.query(
        `
          INSERT INTO order_stage_transitions (
            order_id,
            from_status_code,
            to_status_code,
            from_stage,
            to_stage,
            actor_user_id,
            actor_role_code,
            comment
          )
          VALUES ($1, NULL, $2, NULL, $3, $4, $5, $6)
        `,
        [
          order.id,
          statusCode,
          stage,
          orderData.createdBy || null,
          orderData.actorRoleCode || null,
          'Order created',
        ]
      );

      // Insert items
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const itemQuery = `
          INSERT INTO order_items (
            order_id, sequence_auto, sequence_manual, manual_number, element_type,
            width, height, quantity, material_id, coating_id,
            design_id, decor, modification, attachments, preview_url
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        `;
        await client.query(itemQuery, [
          order.id,
          i + 1,
          item.sequenceManual || null,
          item.manualNumber || null,
          item.elementType,
          item.width,
          item.height,
          item.quantity || 1,
          item.materialId || null,
          item.coatingId || null,
          item.designId || null,
          item.decor || null,
          item.modification || null,
          JSON.stringify(item.attachments || []),
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
    const current = await this.findById(id);
    if (!current) {
      return null;
    }

    const fields = [];
    const values = [];
    let paramIndex = 1;
    let nextStage = current.current_stage;

    if (orderData.status) {
      fields.push(`status = $${paramIndex++}`);
      values.push(orderData.status);

       fields.push(`status_code = $${paramIndex++}`);
       values.push(orderData.status);

      nextStage = orderData.status.includes('designer')
        ? 'designer'
        : orderData.status.includes('technologist')
          ? 'technologist'
          : orderData.status === 'approved' || orderData.status === 'cancelled'
            ? 'done'
            : 'client';

      fields.push(`current_stage = $${paramIndex++}`);
      values.push(nextStage);
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

    if (orderData.status) {
      await db.query(
        `
          INSERT INTO order_stage_transitions (
            order_id,
            from_status_code,
            to_status_code,
            from_stage,
            to_stage,
            actor_user_id,
            actor_role_code,
            comment
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `,
        [
          id,
          current.status_code || current.status,
          orderData.status,
          current.current_stage || 'client',
          nextStage,
          orderData.actorUserId || null,
          orderData.actorRoleCode || null,
          orderData.transitionComment || 'Order status updated',
        ]
      );
    }

    return this.findById(id);
  }

  async delete(id) {
    const db = await getDb();
    const result = await db.query('DELETE FROM orders WHERE id = $1 RETURNING id', [id]);
    return result.rows.length > 0;
  }

  async replaceItems(orderId, items = []) {
    const db = await getDb();
    const client = await db.connect();

    try {
      await client.query('BEGIN');

      const orderCheck = await client.query('SELECT id FROM orders WHERE id = $1 LIMIT 1', [orderId]);
      if (orderCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        return null;
      }

      await client.query('DELETE FROM order_items WHERE order_id = $1', [orderId]);

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        await client.query(
          `
            INSERT INTO order_items (
              order_id,
              sequence_auto,
              sequence_manual,
              manual_number,
              element_type,
              width,
              height,
              quantity,
              material_id,
              coating_id,
              design_id,
              decor,
              modification,
              attachments,
              preview_url
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
          `,
          [
            orderId,
            i + 1,
            item.sequenceManual || null,
            item.manualNumber || null,
            item.elementType || 'panel',
            item.width || 1,
            item.height || 1,
            item.quantity || 1,
            item.materialId || null,
            item.coatingId || null,
            item.designId || null,
            item.decor || null,
            item.modification || null,
            JSON.stringify(item.attachments || []),
            item.previewUrl || null,
          ]
        );
      }

      await client.query('COMMIT');
      return this.findById(orderId);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
