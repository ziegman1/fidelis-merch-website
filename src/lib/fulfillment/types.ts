import type { OrderItem, ProductVariant, Product } from "@prisma/client";

export type OrderItemWithVariant = OrderItem & {
  variant: ProductVariant & { product: Product };
};

export interface CreateOrderInput {
  orderId: string;
  items: OrderItemWithVariant[];
  shipping: {
    name: string | null;
    line1: string | null;
    line2: string | null;
    city: string | null;
    state: string | null;
    postalCode: string | null;
    country: string | null;
  };
}

export interface CreateOrderResult {
  success: boolean;
  externalOrderId?: string;
  error?: string;
}

export interface FulfillmentProvider {
  readonly id: string;
  createOrder(input: CreateOrderInput): Promise<CreateOrderResult>;
  getOrderStatus?(externalOrderId: string): Promise<string>;
}
