import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import jwt from '@fastify/jwt';
import dotenv from 'dotenv';
import { ordersRoutes } from './routes/orders.js';
import { customersRoutes } from './routes/customers.js';
import { materialsRoutes } from './routes/materials.js';
import { authRoutes } from './routes/auth.js';
import { rolesRoutes } from './routes/roles.js';
import { usersRoutes } from './routes/users.js';

dotenv.config();

const fastify = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
    transport: {
      target: 'pino-pretty',
      options: {
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname',
      },
    },
  },
});

// Register plugins
await fastify.register(cors, {
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:5173'],
  credentials: true,
  methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Correlation-Id'],
});
await fastify.register(helmet);
await fastify.register(jwt, {
  secret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
});

fastify.decorate('authenticate', async (request, reply) => {
  await request.jwtVerify();
});

fastify.decorate('requireAdmin', async (request, reply) => {
  if (request.user?.roleCode !== 'admin') {
    return reply.code(403).send({ error: 'Forbidden' });
  }
});

// Correlation ID middleware
fastify.addHook('onRequest', async (request, reply) => {
  const correlationId =
    request.headers['x-correlation-id'] ||
    crypto.randomUUID();
  request.log = request.log.child({ correlationId });
  reply.header('X-Correlation-Id', correlationId);
});

// Auth middleware
fastify.addHook('preHandler', async (request, reply) => {
  const isPublicPath =
    request.method === 'OPTIONS' ||
    request.url === '/health' ||
    request.url === '/ready' ||
    request.url === '/api/v1/version' ||
    request.url === '/api/v1/auth/login' ||
    request.url === '/api/v1/auth/register';

  if (isPublicPath) {
    return;
  }

  try {
    await request.jwtVerify();
  } catch {
    return reply.code(401).send({ error: 'Unauthorized' });
  }
});

// Health check endpoint
fastify.get('/health', async (request, reply) => {
  return { status: 'ok', timestamp: new Date().toISOString(), service: 'order-manager' };
});

// Readiness probe
fastify.get('/ready', async (request, reply) => {
  // TODO: check DB connection
  return { ready: true };
});

// API version endpoint
fastify.get('/api/v1/version', async (request, reply) => {
  return { version: '0.1.0', api: 'v1' };
});

// Register domain routes
await fastify.register(ordersRoutes, { prefix: '/api/v1' });
await fastify.register(customersRoutes, { prefix: '/api/v1' });
await fastify.register(materialsRoutes, { prefix: '/api/v1' });
await fastify.register(authRoutes, { prefix: '/api/v1' });
await fastify.register(rolesRoutes, { prefix: '/api/v1' });
await fastify.register(usersRoutes, { prefix: '/api/v1' });

const start = async () => {
  try {
    const port = process.env.PORT || 3000;
    await fastify.listen({ port, host: '0.0.0.0' });
    fastify.log.info(`Order Manager API listening on port ${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
