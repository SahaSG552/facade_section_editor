// Auto-generated TypeScript SDK from OpenAPI contract
// Generated manually from order-manager.openapi.yaml v1.0.0

export interface Order {
  id: string;
  customerId: string;
  status: 'draft' | 'confirmed' | 'in_production' | 'shipped' | 'delivered' | 'cancelled';
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
}

export interface OrderItem {
  id: string;
  orderId: string;
  sequenceAuto: number;
  sequenceManual: number | null;
  elementType: string;
  width: number;
  height: number;
  quantity: number;
  materialId: string;
  coatingId: string | null;
  designId: string | null;
  decor: string | null;
  previewUrl: string | null;
}

export interface CreateOrderRequest {
  customerId: string;
  status?: 'draft' | 'confirmed' | 'in_production' | 'shipped' | 'delivered' | 'cancelled';
}

export interface ListOrdersResponse {
  data: Order[];
  total: number;
  page: number;
  limit: number;
}

export class OrderManagerApi {
  private baseUrl: string;
  private headers: Record<string, string>;

  constructor(baseUrl: string = 'http://localhost:3000/api/v1', authToken?: string) {
    this.baseUrl = baseUrl;
    this.headers = {
      'Content-Type': 'application/json',
      ...(authToken && { Authorization: `Bearer ${authToken}` }),
    };
  }

  private async request<T>(
    endpoint: string,
    method: string,
    body?: any,
    idempotencyKey?: string,
    correlationId?: string
  ): Promise<T> {
    const headers = { ...this.headers };
    if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;
    if (correlationId) headers['X-Correlation-Id'] = correlationId;

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async healthCheck(): Promise<{ status: string; timestamp: string; service: string }> {
    return this.request('/health', 'GET');
  }

  async getVersion(): Promise<{ version: string; api: string }> {
    return this.request('/version', 'GET');
  }

  async listOrders(
    page?: number,
    limit?: number,
    status?: string
  ): Promise<ListOrdersResponse> {
    const params = new URLSearchParams();
    if (page) params.append('page', page.toString());
    if (limit) params.append('limit', limit.toString());
    if (status) params.append('status', status);
    const query = params.toString();
    return this.request(`/orders${query ? `?${query}` : ''}`, 'GET');
  }

  async createOrder(
    request: CreateOrderRequest,
    idempotencyKey?: string,
    correlationId?: string
  ): Promise<Order> {
    return this.request('/orders', 'POST', request, idempotencyKey, correlationId);
  }

  async getOrder(orderId: string): Promise<Order> {
    return this.request(`/orders/${orderId}`, 'GET');
  }
}
