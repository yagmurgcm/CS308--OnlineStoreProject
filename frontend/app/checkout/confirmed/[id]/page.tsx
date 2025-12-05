"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { fetchOrderById, type OrderSummary } from "@/lib/orders";

const priceFmt = new Intl.NumberFormat("tr-TR", {
  style: "currency",
  currency: "TRY",
});

export default function OrderConfirmedPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = params?.id;

  const [order, setOrder] = useState<OrderSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!orderId) return;
      try {
        const data = await fetchOrderById(orderId as string);
        setOrder(data);
      } catch (err) {
        setError("Order not found or access denied.");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [orderId]);

  if (loading) {
    return (
      <main className="container-base py-12">
        <p className="text-sm text-neutral-600">Loading your order...</p>
      </main>
    );
  }

  if (error || !order) {
    return (
      <main className="container-base py-12 space-y-4">
        <p className="text-lg font-semibold text-red-600">{error ?? "Order not found."}</p>
        <Link href="/" className="btn btn-primary">Back to home</Link>
      </main>
    );
  }

  return (
    <main className="container-base py-10 space-y-6">
      <div className="rounded-xl border border-[var(--line)] bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600">Order confirmed</p>
            <h1 className="text-3xl font-semibold">Thanks for your purchase!</h1>
            <p className="text-sm text-neutral-600">
              Order #{order.id}. A PDF invoice was emailed to {order.contactEmail || order.user?.email || "your inbox"}.
            </p>
          </div>
          <div className="flex gap-3">
            <Link href={`/account/orders/${order.id}/invoice`} className="btn btn-secondary">
              View invoice
            </Link>
            <Link href="/account/orders" className="btn btn-ghost">
              Track orders
            </Link>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <section className="space-y-4 rounded-xl border border-[var(--line)] bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Items</h2>
          <div className="divide-y divide-[var(--line)]">
            {order.details?.map((detail) => (
              <div key={detail.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium text-neutral-900">{detail.product?.name ?? "Product"}</p>
                  <p className="text-xs text-neutral-500">
                    Qty {detail.quantity} • Product #{detail.product?.id}
                  </p>
                </div>
                <span className="text-sm font-semibold text-neutral-900">
                  {priceFmt.format(Number(detail.price) * detail.quantity)}
                </span>
              </div>
            ))}
          </div>
        </section>

        <aside className="space-y-4 rounded-xl border border-[var(--line)] bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Order summary</h2>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span>Status</span>
              <span className="font-semibold text-emerald-700">{order.status}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Total</span>
              <span className="font-semibold">{priceFmt.format(Number(order.totalPrice))}</span>
            </div>
            {order.contactName && (
              <div className="flex items-center justify-between">
                <span>Recipient</span>
                <span className="text-neutral-700">{order.contactName}</span>
              </div>
            )}
            {order.shippingAddress && (
              <div className="text-neutral-700 text-sm">
                <p className="font-semibold">Shipping</p>
                <p>{order.shippingAddress}</p>
                <p>{order.shippingCity} {order.shippingPostalCode}</p>
                <p>{order.shippingCountry}</p>
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link href="/" className="btn btn-primary">Continue shopping</Link>
            <button
              className="btn btn-ghost"
              onClick={() => router.push(`/account/orders/${order.id}/invoice`)}
            >
              Download invoice
            </button>
          </div>
        </aside>
      </div>
    </main>
  );
}
