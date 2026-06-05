import { describe, it } from 'node:test';
import assert from 'node:assert';
import { openapi } from '@apidevtools/swagger-parser';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const contractPath = path.resolve(__dirname, '../../contracts/order-manager.openapi.yaml');

describe('OpenAPI Contract Validation', () => {
  it('should parse OpenAPI spec without errors', async () => {
    try {
      const api = await openapi(contractPath);
      assert.ok(api, 'API spec should be valid');
      assert.equal(api.info.version, '1.0.0');
    } catch (err) {
      assert.fail(`OpenAPI validation failed: ${err.message}`);
    }
  });

  it('should have required endpoints defined', async () => {
    const api = await openapi(contractPath);
    const paths = Object.keys(api.paths);
    
    const requiredPaths = ['/health', '/version', '/orders', '/orders/{orderId}'];
    requiredPaths.forEach(reqPath => {
      assert.ok(paths.includes(reqPath), `Missing path: ${reqPath}`);
    });
  });

  it('should define Order schema with required fields', async () => {
    const api = await openapi(contractPath);
    const orderSchema = api.components.schemas.Order;
    
    assert.ok(orderSchema, 'Order schema should be defined');
    
    const requiredFields = ['id', 'customerId', 'status', 'createdAt', 'updatedAt'];
    requiredFields.forEach(field => {
      assert.ok(orderSchema.properties[field], `Missing field: ${field}`);
    });
  });
});
