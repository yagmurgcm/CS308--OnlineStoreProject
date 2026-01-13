"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { cancelOrder, fetchOrderById, type OrderSummary } from "@/lib/orders";
import { createReturnRequest } from "@/lib/returns";
import { useAuth } from "@/lib/auth-context";

const priceFmt = new Intl.NumberFormat("tr-TR", {
  style: "currency",
  currency: "TRY",
});

const statusLabel = (status: string) =>
  status
    ? status
        .split("_")
        .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
        .join(" ")
    : "";

const statusColor = (status: string) => {
  switch (status?.toLowerCase()) {
    case "pending":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "processing":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "shipped":
    case "in-transit":
      return "bg-purple-100 text-purple-800 border-purple-200";
    case "delivered":
      return "bg-green-100 text-green-800 border-green-200";
    case "cancelled":
      return "bg-red-100 text-red-800 border-red-200";
    case "returned":
      return "bg-gray-100 text-gray-800 border-gray-200";
    case "partially_returned":
      return "bg-orange-100 text-orange-800 border-orange-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
};

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [order, setOrder] = useState<OrderSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [returnQuantities, setReturnQuantities] = useState<Record<number, number>>({});
  const [returnReason, setReturnReason] = useState("");
  const status = (order?.status || "").toLowerCase();
  const createdAt = order?.createdAt ? new Date(order.createdAt) : null;
  const isWithinReturnWindow = createdAt
    ? Date.now() - createdAt.getTime() <= 30 * 24 * 60 * 60 * 1000
    : true;
  // Only "processing" status can be cancelled
  const isCancelableStatus = status === "processing";
  // According to PDF: "it can only be refunded if it is in 'delivered' status"
  // And: "within 30 days of purchase, provided the product has been delivered"
  const isReturnableStatus = ["delivered", "partially_returned"].includes(status);
  const canRequestReturn = isReturnableStatus && isWithinReturnWindow;

  const returnReasons = [
    "Too small",
    "Too large",
    "Not as described",
    "Poor quality",
    "Damaged on arrival",
    "Changed my mind",
  ];

  useEffect(() => {
    if (!user?.id || !params?.id) return;
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchOrderById(params.id);
        if (cancelled) return;
        setOrder(data);
        setReturnQuantities(
          Object.fromEntries(
            (data.details || []).map((d) => [d.id, 0]),
          ),
        );
      } catch (err) {
        console.error("Failed to load order", err);
        if (!cancelled) setError("Failed to load order. Please try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [params?.id, user?.id]);

  const handleCancel = async () => {
    if (!order) return;
    if (!isCancelableStatus) {
      setError("Only orders with 'processing' status can be cancelled.");
      return;
    }
    setActionLoading(true);
    setMessage(null);
    setError(null);
    try {
      const updated = await cancelOrder(order.id);
      setOrder(updated);
      setMessage("Order cancelled and items restocked.");
    } catch (err) {
      console.error("Cancel failed", err);
      setError("Could not cancel the order. Please try again.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReturn = async () => {
    if (!order) return;
    if (!isReturnableStatus) {
      setError("Returns are only available after delivery.");
      return;
    }
    if (!isWithinReturnWindow) {
      setError("The 30-day return window has expired for this order.");
      return;
    }
    const items = Object.entries(returnQuantities)
      .map(([detailId, quantity]) => ({
        detailId: Number(detailId),
        quantity: Number(quantity),
      }))
      .filter((i) => i.quantity > 0);

    if (items.length === 0) {
      setError("Select at least one item to return.");
      return;
    }

    setActionLoading(true);
    setMessage(null);
    setError(null);
    try {
      const request = await createReturnRequest(
        order.id,
        items,
        returnReason.trim() || undefined,
      );
      const code = request?.returnShippingCode;
      setMessage(
        code
          ? `Return request sent. Your return cargo code is ${code}.`
          : "Return request sent. Our team will review it shortly.",
      );
      try {
        const refreshed = await fetchOrderById(order.id);
        setOrder(refreshed);
        setReturnQuantities(
          Object.fromEntries((refreshed.details || []).map((d) => [d.id, 0])),
        );
      } catch (refreshError) {
        console.warn("Failed to refresh order after return request", refreshError);
        setReturnQuantities(
          Object.fromEntries((order.details || []).map((d) => [d.id, 0])),
        );
      }
      setReturnReason("");
    } catch (err) {
      console.error("Return failed", err);
      setError("Could not create the return request. Please try again.");
    } finally {
      setActionLoading(false);
    }
  };

  // Only "processing" status can be cancelled (no return window check needed)
  const isCancelable = order && isCancelableStatus;

  const returnableDetails = useMemo(() => {
    return (order?.details || []).map((detail) => {
      const returned =
        (order?.status || "").toLowerCase() === "cancelled"
          ? detail.quantity
          : detail.returnedQuantity ?? 0;
      const pending = detail.pendingReturnQuantity ?? 0;
      const totalReturned = returned + pending;
      const remaining =
        isReturnableStatus && isWithinReturnWindow
          ? Math.max(0, detail.quantity - totalReturned)
          : 0;
      return { ...detail, remaining, returned, pendingReturnQuantity: pending };
    });
  }, [order, isReturnableStatus, isWithinReturnWindow]);

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Please sign in to view your order.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse h-6 w-32 bg-gray-200 rounded" />
        <div className="space-y-3">
          <div className="h-4 bg-gray-200 rounded" />
          <div className="h-4 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Order</h1>
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4">
          {error}
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-gray-600">
        Order could not be found.{" "}
        <button className="underline" onClick={() => router.push("/account/orders")}>
          Back to orders
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Order #{order.id}</h1>
          <p className="text-sm text-gray-500">
            Placed on {new Date(order.createdAt).toLocaleDateString("tr-TR")}
          </p>
{/* Return window warning moved to prominent banner below */}
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`px-3 py-1 rounded-full text-sm border ${statusColor(order.status)}`}
          >
            {statusLabel(order.status)}
          </span>
          <Link
            href={`/account/orders/${order.id}/invoice`}
            className="text-sm underline text-gray-700 hover:text-black"
          >
            Download invoice
          </Link>
        </div>
      </div>

      {/* 30-Day Return Window Expired - Simple Notice */}
      {!isWithinReturnWindow && isReturnableStatus && (
        <div className="bg-amber-50 border border-amber-300 rounded-lg px-4 py-3 flex items-center gap-3">
          <span className="text-amber-600">⏰</span>
          <p className="text-sm text-amber-700">
            Return window expired — orders can only be returned within 30 days of purchase.
          </p>
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-4">
        <div className="md:col-span-2 space-y-3">
          {returnableDetails.map((detail) => {
            // Calculate discount info
            const product = detail.product as any;
            let unitPrice = Number(detail.price);
            let originalPrice: number | null = null;
            let discountRate: number | null = null;
            let hasDiscount = false;
            
            if (product?.discountedPrice) {
              originalPrice = Number(product.price);
              unitPrice = Number(product.discountedPrice);
              discountRate = originalPrice > 0 
                ? Math.round(((originalPrice - unitPrice) / originalPrice) * 100)
                : 0;
              hasDiscount = discountRate > 0;
            } else if (product?.discountRate && Number(product.discountRate) > 0 && product?.price) {
              originalPrice = Number(product.price);
              discountRate = Number(product.discountRate);
              unitPrice = originalPrice * (1 - discountRate / 100);
              hasDiscount = discountRate > 0;
            }
            
            const lineTotal = unitPrice * detail.quantity;
            const originalLineTotal = originalPrice ? originalPrice * detail.quantity : null;
            
            return (
              <div
                key={detail.id}
                className="p-4 border border-gray-200 rounded-lg flex flex-col gap-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <div className="font-medium text-gray-900">
                        {detail.product?.name || "Product"}
                      </div>
                      {hasDiscount && discountRate && (
                        <span className="text-xs text-emerald-600 font-medium bg-emerald-50 px-2 py-0.5 rounded whitespace-nowrap">
                          {discountRate}% OFF
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-500">
                      {detail.variant?.color ? `Color: ${detail.variant.color}` : ""}
                      {detail.variant?.size ? ` • Size: ${detail.variant.size}` : ""}
                    </div>
                    <div className="text-sm text-gray-600">
                      Purchased: {detail.quantity} | Returned: {detail.returned}
                      {detail.pendingReturnQuantity && detail.pendingReturnQuantity > 0
                        ? ` | Pending: ${detail.pendingReturnQuantity}`
                        : ""}
                    </div>
                    <div className="text-sm text-gray-800 mt-1">
                      {hasDiscount && originalLineTotal && (
                        <div className="text-xs text-gray-400 mb-1">
                          <span className="line-through">{priceFmt.format(originalLineTotal)}</span>
                        </div>
                      )}
                      <div className="font-semibold">{priceFmt.format(lineTotal)}</div>
                    </div>
                  </div>
                <div className="text-right">
                  <label className="text-xs text-gray-500 block mb-1">Return qty</label>
                  <div className="inline-flex items-center border rounded overflow-hidden">
                    <button
                      type="button"
                      onClick={() =>
                        setReturnQuantities((prev) => {
                          const current = prev[detail.id] ?? 0;
                          return {
                            ...prev,
                            [detail.id]: Math.max(0, current - 1),
                          };
                        })
                      }
                      disabled={
                        detail.remaining === 0 ||
                        !canRequestReturn ||
                        (returnQuantities[detail.id] ?? 0) === 0
                      }
                      className="px-2 py-1 text-sm text-gray-700 disabled:opacity-50"
                      aria-label="Decrease return quantity"
                    >
                      -
                    </button>
                    <span className="px-3 py-1 text-sm min-w-[2rem] text-center">
                      {returnQuantities[detail.id] ?? 0}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setReturnQuantities((prev) => {
                          const current = prev[detail.id] ?? 0;
                          return {
                            ...prev,
                            [detail.id]: Math.min(detail.remaining, current + 1),
                          };
                        })
                      }
                      disabled={
                        detail.remaining === 0 ||
                        !canRequestReturn ||
                        (returnQuantities[detail.id] ?? 0) >= detail.remaining
                      }
                      className="px-2 py-1 text-sm text-gray-700 disabled:opacity-50"
                      aria-label="Increase return quantity"
                    >
                      +
                    </button>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {detail.remaining} available to return
                  </div>
                </div>
              </div>
            </div>
            );
          })}
        </div>

        <div className="space-y-3">
          <div className="p-4 border border-gray-200 rounded-lg space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Total</span>
              <span className="font-semibold">
                {priceFmt.format(
                  order.details?.reduce((sum, detail) => {
                    // Use discountedPrice if available, otherwise use detail.price
                    const product = detail.product as any;
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
            <div className="text-sm text-gray-600">
              Ship to:{" "}
              {[order.shippingAddress, order.shippingCity, order.shippingCountry]
                .filter(Boolean)
                .join(", ") || "—"}
            </div>
          </div>

          {message && (
            <div className="bg-green-50 border border-green-200 text-green-700 p-3 rounded">
              {message}
            </div>
          )}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded">
              {error}
            </div>
          )}

          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">
              Return reason (optional)
            </label>
            <select
              value={returnReason}
              onChange={(e) => setReturnReason(e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm"
            >
              <option value="">Select a reason</option>
              {returnReasons.map((reason) => (
                <option key={reason} value={reason}>
                  {reason}
                </option>
              ))}
            </select>
          </div>

          {!isWithinReturnWindow && isReturnableStatus ? (
            <div className="space-y-2">
              <button
                className="w-full btn bg-gray-300 text-gray-500 cursor-not-allowed border-2 border-red-300"
                disabled
              >
                🚫 Return Not Available
              </button>
              <p className="text-center text-sm text-red-600 font-medium bg-red-50 p-2 rounded-lg border border-red-200">
                30-day return window has expired
              </p>
            </div>
          ) : (
            <button
              className="w-full btn btn-primary disabled:opacity-50"
              onClick={handleReturn}
              disabled={actionLoading || !canRequestReturn}
            >
              {actionLoading ? "Processing..." : "Request return"}
            </button>
          )}

          <button
            className={`w-full btn btn-ghost border text-sm ${!isCancelable && !actionLoading ? "opacity-50 cursor-not-allowed" : ""}`}
            onClick={handleCancel}
            disabled={!isCancelable || actionLoading}
          >
            {!isCancelable && !isWithinReturnWindow ? "🚫 " : ""}
            Cancel entire order
          </button>
        </div>
      </div>
    </div>
  );
}
