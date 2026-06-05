import { MaterialRepository } from '../repositories/materialRepository.js';

const materialRepo = new MaterialRepository();

export async function materialsRoutes(fastify, options) {
  // GET /api/v1/materials
  fastify.get('/materials', async (request, reply) => {
    const { page = 1, limit = 20 } = request.query;
    const result = await materialRepo.findAll(parseInt(page), parseInt(limit));
    return result;
  });

  // GET /api/v1/materials/:id
  fastify.get('/materials/:id', async (request, reply) => {
    const { id } = request.params;
    const material = await materialRepo.findById(id);
    if (!material) {
      return reply.code(404).send({ error: 'Material not found' });
    }
    return material;
  });

  // GET /api/v1/materials/code/:code
  fastify.get('/materials/code/:code', async (request, reply) => {
    const { code } = request.params;
    const material = await materialRepo.findByCode(code);
    if (!material) {
      return reply.code(404).send({ error: 'Material not found' });
    }
    return material;
  });

  // POST /api/v1/materials
  fastify.post('/materials', {
    schema: {
      body: {
        type: 'object',
        required: ['code', 'name'],
        properties: {
          code: { type: 'string' },
          name: { type: 'string' },
          description: { type: 'string' },
          thickness: { type: 'number' },
          density: { type: 'number' },
          costPerSqm: { type: 'number' },
          supplier: { type: 'string' },
          inStock: { type: 'number' },
        },
      },
    },
  }, async (request, reply) => {
    // Check if material with same code exists
    const existing = await materialRepo.findByCode(request.body.code);
    if (existing) {
      return reply.code(409).send({ error: 'Material with this code already exists' });
    }
    const material = await materialRepo.create(request.body);
    return reply.code(201).send(material);
  });

  // PATCH /api/v1/materials/:id
  fastify.patch('/materials/:id', async (request, reply) => {
    const { id } = request.params;
    const material = await materialRepo.update(id, request.body);
    if (!material) {
      return reply.code(404).send({ error: 'Material not found' });
    }
    return material;
  });

  // DELETE /api/v1/materials/:id
  fastify.delete('/materials/:id', async (request, reply) => {
    const { id } = request.params;
    const deleted = await materialRepo.delete(id);
    if (!deleted) {
      return reply.code(404).send({ error: 'Material not found' });
    }
    return reply.code(204).send();
  });
}
