"use client";

import { useEffect, useState } from "react";

import type { OrderSummary } from "@/lib/orders";

type OrderHistoryViewProps = {
  fetchOrders?: () => Promise<OrderSummary[]>;
};

const defaultFetcher = async (): Promise<OrderSummary[]> => [];

export default function OrderHistoryView({
  fetchOrders = defaultFetcher,
}: OrderHistoryViewProps) {
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "empty" | "error">(
    "loading",
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setStatus("loading");
    fetchOrders()
      .then((data) => {
        if (!mounted) return;
        if (!data || data.length === 0) {
          setOrders([]);
          setStatus("empty");
          return;
        }
        setOrders(data);
        setStatus("ready");
      })
      .catch((err) => {
        if (!mounted) return;
        setError(
          err instanceof Error ? err.message : "Failed to load order history",
        );
        setStatus("error");
      });
    return () => {
      mounted = false;
    };
  }, [fetchOrders]);

  if (status === "loading") {
    return <p data-testid="orders-loading">Loading orders...</p>;
  }

  if (status === "error") {
    return (
      <div data-testid="orders-error" className="text-red-600 text-sm">
        {error ?? "Unable to load your orders."}
      </div>
    );
  }

  if (status === "empty") {
    return (
      <p data-testid="orders-empty" className="text-sm text-neutral-600">
        You have no orders yet.
      </p>
    );
  }

  return (
    <section className="space-y-4" data-testid="orders-list">
      {orders.map((order) => (
        <article
          key={order.id}
          data-testid="order-item"
          className="rounded-lg border border-[var(--line)] p-4"
        >
          <div className="flex items-center justify-between text-sm text-neutral-600">
            <span>Order #{order.id}</span>
            <span>{new Date(order.createdAt).toLocaleDateString()}</span>
          </div>
          <div className="mt-2 text-sm">
            Status: <strong>{order.status}</strong>
          </div>
          <div className="text-sm">
            Total: <strong>{order.totalPrice}</strong>
          </div>
          <ul className="mt-3 space-y-1 text-sm text-neutral-700">
            {order.details.map((detail) => (
              <li key={detail.id}>
                {detail.product?.name ?? "Product"} × {detail.quantity}
              </li>
            ))}
          </ul>
        </article>
      ))}
    </section>
  );
}
