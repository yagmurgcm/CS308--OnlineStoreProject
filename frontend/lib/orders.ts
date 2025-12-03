import { api } from "./api";

export type OrderProduct = {
  id: number;
  name: string;
  price: number | string;
  image?: string | null;
};

export type OrderDetail = {
  id: number;
  quantity: number;
  price: number | string;
  product: OrderProduct;
};

export type OrderSummary = {
  id: number;
  status: string;
  totalPrice: number | string;
  createdAt: string;
  updatedAt?: string;
  details: OrderDetail[];
  user?: {
    id?: number;
    email?: string;
    name?: string;
  };
};

export async function fetchOrderById(orderId: number | string) {
  return api.get<OrderSummary>(`/orders/${orderId}`);
}

export async function checkoutOrder() {
  return api.post<OrderSummary>("/orders/checkout");
}
