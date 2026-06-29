import { CoatingsRepository } from '../repositories/coatingsRepository.js';

const coatingsRepo = new CoatingsRepository();

export async function coatingsRoutes(fastify, options) {
  // GET /api/v1/coatings
  fastify.get('/coatings', async (request, reply) => {
    const { page = 1, limit = 100 } = request.query;
    const result = await coatingsRepo.findAll(parseInt(page), parseInt(limit));
    return result;
  });

  // GET /api/v1/coatings/:id
  fastify.get('/coatings/:id', async (request, reply) => {
    const { id } = request.params;
    const coating = await coatingsRepo.findById(id);
    if (!coating) {
      return reply.code(404).send({ error: 'Coating not found' });
    }
    return coating;
  });

  // GET /api/v1/coatings/code/:code
  fastify.get('/coatings/code/:code', async (request, reply) => {
    const { code } = request.params;
    const coating = await coatingsRepo.findByCode(code);
    if (!coating) {
      return reply.code(404).send({ error: 'Coating not found' });
    }
    return coating;
  });

  // POST /api/v1/coatings
  fastify.post('/coatings', {
    schema: {
      body: {
        type: 'object',
        required: ['code', 'name'],
        properties: {
          code: { type: 'string' },
          name: { type: 'string' },
          color: { type: 'string' },
          texture: { type: 'string' },
          direction: { type: 'string', enum: ['none', 'vertical', 'horizontal'] },
        },
      },
    },
  }, async (request, reply) => {
    const existing = await coatingsRepo.findByCode(request.body.code);
    if (existing) {
      return reply.code(409).send({ error: 'Coating with this code already exists' });
    }
    const coating = await coatingsRepo.create(request.body);
    return reply.code(201).send(coating);
  });

  // PATCH /api/v1/coatings/:id
  fastify.patch('/coatings/:id', {
    schema: {
      body: {
        type: 'object',
        properties: {
          code: { type: 'string' },
          name: { type: 'string' },
          color: { type: 'string' },
          texture: { type: 'string' },
          direction: { type: 'string', enum: ['none', 'vertical', 'horizontal'] },
        },
      },
    },
  }, async (request, reply) => {
    const { id } = request.params;
    const coating = await coatingsRepo.update(id, request.body);
    if (!coating) {
      return reply.code(404).send({ error: 'Coating not found' });
    }
    return coating;
  });

  // DELETE /api/v1/coatings/:id
  fastify.delete('/coatings/:id', async (request, reply) => {
    const { id } = request.params;
    const deleted = await coatingsRepo.delete(id);
    if (!deleted) {
      return reply.code(404).send({ error: 'Coating not found' });
    }
    return reply.code(204).send();
  });
}
