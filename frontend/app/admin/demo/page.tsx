"use client";

import { useEffect, useState } from "react";
import { approveReview, declineReview, fetchPendingReviews, type PendingReview } from "@/lib/reviews";
import { updateOrderStatus, type OrderStatus } from "@/lib/orders";
import { useAuth } from "@/lib/auth-context";

const statuses: OrderStatus[] = ["processing", "in-transit", "delivered"];

export default function DemoAdminPage() {
  const { user } = useAuth();
  const [pending, setPending] = useState<PendingReview[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [orderIdInput, setOrderIdInput] = useState("");
  const [orderStatus, setOrderStatus] = useState<OrderStatus>("in-transit");

  const loadPending = async () => {
    setLoading(true);
    try {
      const data = await fetchPendingReviews();
      setPending(data ?? []);
    } catch (err) {
      setMessage("Failed to load pending reviews. Are you signed in?");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadPending();
  }, []);

  const handleApprove = async (id: number) => {
    await approveReview(id);
    await loadPending();
  };

  const handleDecline = async (id: number) => {
    await declineReview(id);
    await loadPending();
  };

  const handleUpdateStatus = async () => {
    if (!orderIdInput) return;
    setMessage(null);
    try {
      await updateOrderStatus(orderIdInput, orderStatus);
      setMessage(`Order #${orderIdInput} set to ${orderStatus}`);
    } catch (err) {
      setMessage("Failed to update order status. Check auth and order id.");
    }
  };

  if (!user) {
    return (
      <main className="container-base py-10 space-y-4">
        <h1 className="text-2xl font-semibold">Demo Admin</h1>
        <p className="text-sm text-neutral-600">Sign in to manage statuses and review approvals.</p>
      </main>
    );
  }

  return (
    <main className="container-base py-10 space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Demo Admin Controls</h1>
        <p className="text-sm text-neutral-600">
          Use these during the demo to advance order status and approve/decline reviews.
        </p>
      </header>

      <section className="rounded-xl border border-[var(--line)] bg-white p-6 shadow-sm space-y-3">
        <h2 className="text-lg font-semibold">Order status</h2>
        <div className="flex flex-wrap gap-3 items-center">
          <input
            type="number"
            value={orderIdInput}
            onChange={(e) => setOrderIdInput(e.target.value)}
            placeholder="Order ID"
            className="input input-bordered w-32"
          />
          <select
            className="select select-bordered"
            value={orderStatus}
            onChange={(e) => setOrderStatus(e.target.value as OrderStatus)}
          >
            {statuses.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <button className="btn btn-primary" onClick={handleUpdateStatus}>
            Update status
          </button>
        </div>
      </section>

      <section className="rounded-xl border border-[var(--line)] bg-white p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold">Pending reviews</h2>
            <p className="text-sm text-neutral-600">Approve to show on product page; decline to hide.</p>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={loadPending} disabled={loading}>
            Refresh
          </button>
        </div>

        {loading ? (
          <p className="text-sm text-neutral-500">Loading pending reviews...</p>
        ) : pending.length === 0 ? (
          <p className="text-sm text-neutral-500">No pending reviews.</p>
        ) : (
          <div className="space-y-3">
            {pending.map((rev) => (
              <div
                key={rev.id}
                className="rounded-lg border border-[var(--line)] p-4 flex flex-col gap-2 bg-neutral-50"
              >
                <div className="flex justify-between text-sm text-neutral-700">
                  <span>Review #{rev.id}</span>
                  <span className="font-medium">{rev.rating} ★</span>
                </div>
                <p className="text-sm text-neutral-800">{rev.comment}</p>
                <p className="text-xs text-neutral-500">
                  Product #{rev.product?.id ?? "?"}: {rev.product?.name ?? "N/A"}
                </p>
                <p className="text-xs text-neutral-500">
                  By {rev.user?.name ?? rev.user?.email ?? "User"} on{" "}
                  {new Date(rev.createdAt).toLocaleString()}
                </p>
                <div className="flex gap-2">
                  <button className="btn btn-primary btn-sm" onClick={() => handleApprove(rev.id)}>
                    Approve
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => handleDecline(rev.id)}>
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {message && (
        <div className="alert alert-info shadow-sm">
          <span>{message}</span>
        </div>
      )}
    </main>
  );
}
