import { OrderRepository } from '../repositories/orderRepository.js';
import { CustomerRepository } from '../repositories/customerRepository.js';
import { createOrderSchema, updateOrderSchema, listOrdersQuerySchema } from '../schemas/orderSchemas.js';
import { getDb } from '../db.js';

const orderRepo = new OrderRepository();
const customerRepo = new CustomerRepository();

export async function ordersRoutes(fastify, options) {
  const resolveCustomerForClientUser = async (username) => {
    const database = await getDb();
    const userResult = await database.query(
      'SELECT email FROM users WHERE username = $1 LIMIT 1',
      [username]
    );

    const email = userResult.rows[0]?.email;
    if (!email) {
      return null;
    }

    return customerRepo.findByEmail(email);
  };

  const transitionMatrix = {
    client: ['client_draft', 'sent_to_designer'],
    designer: ['designer_revision', 'sent_to_technologist'],
    technologist: ['technologist_revision', 'approved'],
    admin: ['client_draft', 'sent_to_designer', 'designer_revision', 'sent_to_technologist', 'technologist_revision', 'approved', 'cancelled'],
  };

  // GET /api/v1/orders
  fastify.get('/orders', {
    schema: {
      querystring: listOrdersQuerySchema,
      response: {
        200: {
          type: 'object',
          properties: {
            data: { type: 'array' },
            total: { type: 'integer' },
            page: { type: 'integer' },
            limit: { type: 'integer' },
          },
        },
      },
    },
  }, async (request, reply) => {
    const { page, limit, status } = request.query;
    let customerId;
    if (request.user?.roleCode === 'client') {
      const customer = await resolveCustomerForClientUser(request.user.username);
      customerId = customer?.id;
      if (!customerId) {
        return { data: [], total: 0, page: Number(page || 1), limit: Number(limit || 20) };
      }
    }

    const result = await orderRepo.findAll({ page, limit, status, customerId });
    return result;
  });

  // GET /api/v1/orders/:id
  fastify.get('/orders/:id', async (request, reply) => {
    const { id } = request.params;
    const order = await orderRepo.findById(id);
    if (!order) {
      return reply.code(404).send({ error: 'Order not found' });
    }
    return order;
  });

  // POST /api/v1/orders
  fastify.post('/orders', {
    schema: {
      body: createOrderSchema,
      response: {
        201: {
          type: 'object',
          additionalProperties: true,
        },
        400: { type: 'object', properties: { error: { type: 'string' } } },
        404: { type: 'object', properties: { error: { type: 'string' } } },
      },
    },
  }, async (request, reply) => {
    const {
      customerId: rawCustomerId,
      orderName,
      orderKind,
      splitFromOrderId,
      status,
      notes,
      createdBy,
      items = [],
    } = request.body;

    let customerId = rawCustomerId;
    if (request.user?.roleCode === 'client') {
      const customer = await resolveCustomerForClientUser(request.user.username);
      if (!customer) {
        return reply.code(400).send({ error: 'Client is not linked to a customer by email' });
      }
      customerId = customer.id;
    }

    if (!customerId) {
      return reply.code(400).send({ error: 'customerId is required' });
    }

    // Verify customer exists
    const customer = await customerRepo.findById(customerId);
    if (!customer) {
      return reply.code(404).send({ error: 'Customer not found' });
    }

    let order;
    try {
      order = await orderRepo.create(
        {
          customerId,
          orderName,
          orderKind,
          splitFromOrderId,
          status,
          notes,
          createdBy: createdBy || request.user?.sub || null,
          actorRoleCode: request.user?.roleCode || null,
        },
        items
      );
    } catch (error) {
      return reply.code(400).send({ error: error.message || 'Order creation failed' });
    }

    return reply.code(201).send(order);
  });

  // PATCH /api/v1/orders/:id
  fastify.patch('/orders/:id', {
    schema: {
      body: updateOrderSchema,
    },
  }, async (request, reply) => {
    const { id } = request.params;
    const { status, notes } = request.body;

    let order;
    try {
      order = await orderRepo.update(id, {
        status,
        notes,
        actorUserId: request.user?.sub || null,
        actorRoleCode: request.user?.roleCode || null,
      });
    } catch (error) {
      return reply.code(400).send({ error: error.message || 'Order update failed' });
    }
    if (!order) {
      return reply.code(404).send({ error: 'Order not found' });
    }
    return order;
  });

  // POST /api/v1/orders/:id/transition
  fastify.post('/orders/:id/transition', async (request, reply) => {
    const { id } = request.params;
    const { status, comment } = request.body || {};

    if (!status) {
      return reply.code(400).send({ error: 'status is required' });
    }

    const role = request.user?.roleCode || 'client';
    const allowed = transitionMatrix[role] || [];
    if (!allowed.includes(status)) {
      return reply.code(403).send({ error: `Role ${role} cannot set status ${status}` });
    }

    const order = await orderRepo.update(id, {
      status,
      actorUserId: request.user?.sub || null,
      actorRoleCode: role,
      transitionComment: comment || `Transition by ${role}`,
    });

    if (!order) {
      return reply.code(404).send({ error: 'Order not found' });
    }

    return order;
  });

  // PUT /api/v1/orders/:id/items
  fastify.put('/orders/:id/items', async (request, reply) => {
    const { id } = request.params;
    const { items = [] } = request.body || {};

    if (!Array.isArray(items)) {
      return reply.code(400).send({ error: 'items must be an array' });
    }

    try {
      const order = await orderRepo.replaceItems(id, items);
      if (!order) {
        return reply.code(404).send({ error: 'Order not found' });
      }
      return order;
    } catch (error) {
      return reply.code(400).send({ error: error.message || 'Failed to replace order items' });
    }
  });

  // DELETE /api/v1/orders/:id
  fastify.delete('/orders/:id', async (request, reply) => {
    const { id } = request.params;
    const deleted = await orderRepo.delete(id);
    if (!deleted) {
      return reply.code(404).send({ error: 'Order not found' });
    }
    return reply.code(204).send();
  });
}
