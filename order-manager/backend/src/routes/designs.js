import { DesignRepository } from '../repositories/designRepository.js';

const designRepo = new DesignRepository();

export async function designsRoutes(fastify) {
  fastify.get('/designs', async (request) => {
    const { page = 1, limit = 200 } = request.query;
    return designRepo.findAll(parseInt(page, 10), parseInt(limit, 10));
  });
}
