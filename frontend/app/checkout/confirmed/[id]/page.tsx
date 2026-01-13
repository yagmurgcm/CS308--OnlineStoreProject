"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { fetchInvoicePdf, fetchOrderById, type OrderSummary } from "@/lib/orders";

const priceFmt = new Intl.NumberFormat("tr-TR", {
  style: "currency",
  currency: "TRY",
});

export default function OrderConfirmedPage() {
  const params = useParams();
  const orderId = params?.id;

  const [order, setOrder] = useState<OrderSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

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

  const handleDownload = async () => {
    if (!order?.id) return;
    setDownloadError(null);
    setDownloading(true);
    try {
      const pdfBlob = await fetchInvoicePdf(order.id);
      const url = URL.createObjectURL(pdfBlob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `invoice-${order.id}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Invoice download failed", err);
      setDownloadError("Unable to download invoice. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <main className="container-base py-10 space-y-6">
      <div className="rounded-xl border border-[var(--line)] bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600">Order confirmed</p>
            <h1 className="text-3xl font-semibold">Thanks for your purchase!</h1>
            <p className="text-sm text-neutral-600">
              Order #{order.id}. Invoice created and email sent successfully to {order.contactEmail || order.user?.email || "your inbox"}.
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
            {order.details?.map((detail) => {
              // Use discountedPrice if available, otherwise use detail.price
              const product = detail.product;
              let unitPrice = Number(detail.price);
              let originalPrice: number | null = null;
              let discountRate: number | null = null;
              let hasDiscount = false;
              
              // Check if product has discountedPrice
              if (product?.discountedPrice) {
                originalPrice = Number(product.price);
                unitPrice = Number(product.discountedPrice);
                discountRate = originalPrice > 0 
                  ? Math.round(((originalPrice - unitPrice) / originalPrice) * 100)
                  : 0;
                hasDiscount = discountRate > 0;
              } 
              // Or calculate from discountRate
              else if (product?.discountRate && Number(product.discountRate) > 0 && product?.price) {
                originalPrice = Number(product.price);
                discountRate = Number(product.discountRate);
                unitPrice = originalPrice * (1 - discountRate / 100);
                hasDiscount = discountRate > 0;
              }
              
              const lineTotal = unitPrice * detail.quantity;
              const originalLineTotal = originalPrice ? originalPrice * detail.quantity : null;
              
              return (
                <div key={detail.id} className="flex items-start justify-between py-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-neutral-900">{detail.product?.name ?? "Product"}</p>
                    <div className="flex items-center gap-2 flex-wrap mt-1">
                      <p className="text-xs text-neutral-500">
                        Qty {detail.quantity} • Product #{detail.product?.id}
                      </p>
                      {hasDiscount && discountRate && (
                        <span className="text-xs text-emerald-600 font-medium bg-emerald-50 px-2 py-0.5 rounded whitespace-nowrap">
                          {discountRate}% OFF
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right ml-4 flex-shrink-0">
                    {hasDiscount && originalLineTotal && (
                      <div className="text-xs text-neutral-400 mb-1">
                        <span className="line-through">{priceFmt.format(originalLineTotal)}</span>
                      </div>
                    )}
                    <span className="text-sm font-semibold text-neutral-900">
                      {priceFmt.format(lineTotal)}
                    </span>
                  </div>
                </div>
              );
            })}
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
              <span className="font-semibold">
                {priceFmt.format(
                  order.details?.reduce((sum, detail) => {
                    // Use discountedPrice if available, otherwise use detail.price
                    const product = detail.product;
                    let unitPrice = Number(detail.price);
                    
                    // Check if product has discountedPrice
                    if (product?.discountedPrice) {
                      unitPrice = Number(product.discountedPrice);
                    } 
                    // Or calculate from discountRate
                    else if (product?.discountRate && Number(product.discountRate) > 0 && product?.price) {
                      const originalPrice = Number(product.price);
                      const discountRate = Number(product.discountRate);
                      unitPrice = originalPrice * (1 - discountRate / 100);
                    }
                    
                    const lineTotal = unitPrice * detail.quantity;
                    return sum + lineTotal;
                  }, 0) || Number(order.totalPrice)
                )}
              </span>
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
              onClick={handleDownload}
              disabled={downloading}
            >
              {downloading ? "Preparing..." : "Download invoice"}
            </button>
            {downloadError && (
              <p className="text-xs text-red-600">{downloadError}</p>
            )}
          </div>
        </aside>
      </div>
    </main>
  );
}
