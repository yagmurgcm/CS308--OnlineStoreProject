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
    setActionLoading(true);
    setMessage(null);
    setError(null);
    try {
      const status = order.status?.toLowerCase?.() || "";
      if (status === "delivered") {
        const items =
          order.details
            ?.map((detail) => {
              const returned = detail.returnedQuantity ?? 0;
              const remaining = Math.max(0, detail.quantity - returned);
              return { detailId: detail.id, quantity: remaining };
            })
            .filter((item) => item.quantity > 0) || [];

        if (items.length === 0) {
          setError("No items available to return.");
          return;
        }

        const request = await createReturnRequest(
          order.id,
          items,
          returnReason.trim() || undefined,
        );
        const code = request?.returnShippingCode;
        setMessage(
          code
            ? `Return request created. Your return cargo code is ${code}.`
            : "Return request created. Our team will review it shortly.",
        );
      } else {
        const updated = await cancelOrder(order.id);
        setOrder(updated);
        setMessage("Order cancelled and items restocked.");
      }
    } catch (err) {
      console.error("Cancel failed", err);
      setError("Could not cancel the order. Please try again.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReturn = async () => {
    if (!order) return;
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
      setReturnQuantities(
        Object.fromEntries((order.details || []).map((d) => [d.id, 0])),
      );
      setReturnReason("");
    } catch (err) {
      console.error("Return failed", err);
      setError("Could not create the return request. Please try again.");
    } finally {
      setActionLoading(false);
    }
  };

  const isCancelable =
    order &&
    !["cancelled", "returned"].includes(order.status?.toLowerCase?.() || "");

  const returnableDetails = useMemo(() => {
    return (order?.details || []).map((detail) => {
      const returned = detail.returnedQuantity ?? 0;
      const remaining = Math.max(0, detail.quantity - returned);
      return { ...detail, remaining, returned };
    });
  }, [order]);

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

      <div className="grid md:grid-cols-3 gap-4">
        <div className="md:col-span-2 space-y-3">
          {returnableDetails.map((detail) => (
            <div
              key={detail.id}
              className="p-4 border border-gray-200 rounded-lg flex flex-col gap-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-medium text-gray-900">
                    {detail.product?.name || "Product"}
                  </div>
                  <div className="text-sm text-gray-500">
                    {detail.variant?.color ? `Color: ${detail.variant.color}` : ""}
                    {detail.variant?.size ? ` • Size: ${detail.variant.size}` : ""}
                  </div>
                  <div className="text-sm text-gray-600">
                    Purchased: {detail.quantity} | Returned: {detail.returned}
                  </div>
                  <div className="text-sm text-gray-800">
                    {priceFmt.format(Number(detail.price) * detail.quantity)}
                  </div>
                </div>
                <div className="text-right">
                  <label className="text-xs text-gray-500 block mb-1">Return qty</label>
                  <input
                    type="number"
                    min={0}
                    max={detail.remaining}
                    value={returnQuantities[detail.id] ?? 0}
                    onChange={(e) =>
                      setReturnQuantities((prev) => ({
                        ...prev,
                        [detail.id]: Math.min(
                          detail.remaining,
                          Math.max(0, Number(e.target.value) || 0),
                        ),
                      }))
                    }
                    disabled={detail.remaining === 0 || order.status === "cancelled"}
                    className="w-24 border rounded px-2 py-1 text-right"
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    {detail.remaining} available to return
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-3">
          <div className="p-4 border border-gray-200 rounded-lg space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Total</span>
              <span className="font-semibold">
                {priceFmt.format(Number(order.totalPrice))}
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

          <button
            className="w-full btn btn-primary disabled:opacity-50"
            onClick={handleReturn}
            disabled={actionLoading || order.status === "cancelled"}
          >
            {actionLoading ? "Processing..." : "Request return"}
          </button>

          <button
            className="w-full btn btn-ghost border text-sm"
            onClick={handleCancel}
            disabled={!isCancelable || actionLoading}
          >
            Cancel entire order
          </button>
        </div>
      </div>
    </div>
  );
}
