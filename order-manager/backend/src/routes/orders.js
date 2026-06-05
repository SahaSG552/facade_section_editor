import { OrderRepository } from '../repositories/orderRepository.js';
import { CustomerRepository } from '../repositories/customerRepository.js';
import { createOrderSchema, updateOrderSchema, listOrdersQuerySchema } from '../schemas/orderSchemas.js';

const orderRepo = new OrderRepository();
const customerRepo = new CustomerRepository();

export async function ordersRoutes(fastify, options) {
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
    const result = await orderRepo.findAll({ page, limit, status });
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
    const { customerId, status, notes, createdBy, items = [] } = request.body;

    // Verify customer exists
    const customer = await customerRepo.findById(customerId);
    if (!customer) {
      return reply.code(404).send({ error: 'Customer not found' });
    }

    const order = await orderRepo.create(
      { customerId, status, notes, createdBy },
      items
    );

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

    const order = await orderRepo.update(id, { status, notes });
    if (!order) {
      return reply.code(404).send({ error: 'Order not found' });
    }
    return order;
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
