import { api } from "./api";

export type PendingReview = {
  id: number;
  rating: number;
  comment: string;
  createdAt: string;
  user?: { name?: string; email?: string };
  product?: { id?: number; name?: string };
};

export async function fetchPendingReviews() {
  return api.get<PendingReview[]>("/reviews");
}

export async function approveReview(id: number) {
  return api.patch(`/reviews/${id}/approve`);
}

export async function declineReview(id: number) {
  return api.patch(`/reviews/${id}/decline`);
}
