// JSON Schemas for request validation
export const createOrderSchema = {
  type: 'object',
  required: ['customerId'],
  properties: {
    customerId: { type: 'string', format: 'uuid' },
    status: { type: 'string', enum: ['draft', 'confirmed', 'in_production', 'shipped', 'delivered', 'cancelled'] },
    notes: { type: 'string', maxLength: 1000 },
    createdBy: { type: 'string', format: 'uuid' },
    items: {
      type: 'array',
      items: {
        type: 'object',
        required: ['elementType', 'width', 'height'],
        properties: {
          sequenceManual: { type: 'integer', minimum: 1 },
          elementType: { type: 'string', maxLength: 100 },
          width: { type: 'number', minimum: 0.1 },
          height: { type: 'number', minimum: 0.1 },
          quantity: { type: 'integer', minimum: 1, default: 1 },
          materialId: { type: 'string', format: 'uuid' },
          coatingId: { type: 'string', format: 'uuid' },
          designId: { type: 'string', format: 'uuid' },
          decor: { type: 'string', maxLength: 255 },
          previewUrl: { type: 'string', format: 'uri' },
        },
      },
    },
  },
};

export const updateOrderSchema = {
  type: 'object',
  properties: {
    status: { type: 'string', enum: ['draft', 'confirmed', 'in_production', 'shipped', 'delivered', 'cancelled'] },
    notes: { type: 'string', maxLength: 1000 },
  },
};

export const listOrdersQuerySchema = {
  type: 'object',
  properties: {
    page: { type: 'integer', minimum: 1, default: 1 },
    limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
    status: { type: 'string', enum: ['draft', 'confirmed', 'in_production', 'shipped', 'delivered', 'cancelled'] },
  },
};
