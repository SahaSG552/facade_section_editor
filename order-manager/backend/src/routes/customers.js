import { CustomerRepository } from '../repositories/customerRepository.js';

const customerRepo = new CustomerRepository();

export async function customersRoutes(fastify, options) {
  // GET /api/v1/customers
  fastify.get('/customers', async (request, reply) => {
    const { page = 1, limit = 20 } = request.query;
    const result = await customerRepo.findAll(parseInt(page), parseInt(limit));
    return result;
  });

  // GET /api/v1/customers/:id
  fastify.get('/customers/:id', async (request, reply) => {
    const { id } = request.params;
    const customer = await customerRepo.findById(id);
    if (!customer) {
      return reply.code(404).send({ error: 'Customer not found' });
    }
    return customer;
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
    const customer = await customerRepo.create(request.body);
    return reply.code(201).send(customer);
  });

  // PATCH /api/v1/customers/:id
  fastify.patch('/customers/:id', async (request, reply) => {
    const { id } = request.params;
    const customer = await customerRepo.update(id, request.body);
    if (!customer) {
      return reply.code(404).send({ error: 'Customer not found' });
    }
    return customer;
  });

  // DELETE /api/v1/customers/:id
  fastify.delete('/customers/:id', async (request, reply) => {
    const { id } = request.params;
    const deleted = await customerRepo.delete(id);
    if (!deleted) {
      return reply.code(404).send({ error: 'Customer not found' });
    }
    return reply.code(204).send();
  });
}
