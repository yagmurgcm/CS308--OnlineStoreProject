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
  contactEmail?: string | null;
  contactName?: string | null;
  contactPhone?: string | null;
  shippingAddress?: string | null;
  shippingCity?: string | null;
  shippingPostalCode?: string | null;
  shippingCountry?: string | null;
  paymentBrand?: string | null;
  paymentLast4?: string | null;
  details: OrderDetail[];
  user?: {
    id?: number;
    email?: string;
    name?: string;
  };
};

export type CheckoutPayload = {
  fullName?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  cardBrand?: string;
  cardLast4?: string;
};

export async function fetchOrderById(orderId: number | string) {
  return api.get<OrderSummary>(`/orders/${orderId}`);
}

export async function checkoutOrder(payload?: CheckoutPayload) {
  return api.post<OrderSummary>("/orders/checkout", payload);
}
