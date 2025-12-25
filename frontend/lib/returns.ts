import { api } from "./api";

export type ReturnRequestItem = {
  id: number;
  orderDetailId: number;
  quantity: number;
  orderDetail?: {
    id: number;
    quantity: number;
    returnedQuantity?: number;
    product?: {
      id: number;
      name: string;
    };
    variant?: {
      id: number;
      color?: string;
      size?: string;
    };
  };
};

export type ReturnRequest = {
  id: number;
  orderId: number;
  userId: number;
  status: "pending" | "approved" | "rejected";
  returnShippingCode?: string | null;
  returnReason?: string | null;
  createdAt: string;
  updatedAt: string;
  order?: {
    id: number;
  };
  user?: {
    id: number;
    name?: string;
    email?: string;
  };
  items: ReturnRequestItem[];
};

export async function createReturnRequest(
  orderId: number | string,
  items: { detailId: number; quantity: number }[],
  reason?: string,
) {
  return api.post<ReturnRequest>(`/orders/${orderId}/return-request`, {
    items,
    reason,
  });
}

export async function fetchReturnRequests() {
  return api.get<ReturnRequest[]>("/orders/admin/return-requests");
}

export async function updateReturnRequestStatus(
  requestId: number,
  status: "approved" | "rejected",
) {
  return api.patch<ReturnRequest>(`/orders/admin/return-requests/${requestId}/status`, {
    status,
  });
}
