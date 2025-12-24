"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { fetchUserOrders, type OrderSummary } from "@/lib/orders";

const priceFmt = new Intl.NumberFormat("tr-TR", {
  style: "currency",
  currency: "TRY",
});

const coercePrice = (value: number | string | undefined): number => {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case "pending":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "processing":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "shipped":
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

export default function OrdersPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;

    const loadOrders = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchUserOrders();
        setOrders(data);
      } catch (err) {
        console.error("Failed to load orders", err);
        setError("Failed to load orders. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    loadOrders();
  }, [user?.id]);

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Please sign in to view your orders.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">My Orders</h1>
        <div className="flex items-center gap-2 text-gray-500">
          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span>Loading orders...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">My Orders</h1>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">My Orders</h1>
        <span className="text-sm text-gray-500">
          {orders.length} order{orders.length !== 1 ? "s" : ""}
        </span>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-xl border border-dashed border-gray-300">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
            />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900">No orders yet</h3>
          <p className="mt-2 text-sm text-gray-500">
            When you make a purchase, your orders will appear here.
          </p>
          <button
            type="button"
            onClick={() => router.push("/")}
            className="mt-6 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-black hover:bg-gray-800"
          >
            Start Shopping
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {orders.map((order) => {
            const totalPrice = coercePrice(order.totalPrice);
            const itemCount = order.details?.reduce((acc, d) => acc + d.quantity, 0) || 0;
            const firstProduct = order.details?.[0]?.product;

            return (
              <div
                key={order.id}
                className="bg-white rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all duration-200 overflow-hidden group cursor-pointer"
                onClick={() => router.push(`/account/orders/${order.id}`)}
              >
                <div className="p-5">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold text-lg">Order #{order.id}</h3>
                        <span
                          className={`px-2.5 py-0.5 text-xs font-medium rounded-full border ${getStatusColor(
                            order.status
                          )}`}
                        >
                          {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        {formatDate(order.createdAt)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold">{priceFmt.format(totalPrice)}</p>
                      <p className="text-sm text-gray-500">
                        {itemCount} item{itemCount !== 1 ? "s" : ""}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        View details, invoice, cancel, or return items
                      </p>
                    </div>
                  </div>

                  {/* Products Preview */}
                  <div className="border-t border-gray-100 pt-4">
                    <div className="flex items-center gap-4">
                      {/* Product thumbnails */}
                      <div className="flex -space-x-2">
                        {order.details?.slice(0, 3).map((detail, idx) => (
                          <div
                            key={detail.id}
                            className="w-12 h-12 rounded-lg border-2 border-white bg-gray-100 flex items-center justify-center text-xs font-medium text-gray-500 shadow-sm"
                            style={{ zIndex: 3 - idx }}
                          >
                            {detail.product?.name?.charAt(0) || "P"}
                          </div>
                        ))}
                        {order.details && order.details.length > 3 && (
                          <div className="w-12 h-12 rounded-lg border-2 border-white bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-600 shadow-sm">
                            +{order.details.length - 3}
                          </div>
                        )}
                      </div>

                      {/* Product names */}
                      <div className="flex-1 min-w-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (firstProduct?.id) {
                              router.push(`/products/${firstProduct.id}`);
                            }
                          }}
                          className="text-left text-sm text-gray-700 truncate hover:text-black hover:underline transition-colors"
                        >
                          {firstProduct?.name || "Product"}
                        </button>
                        {order.details && order.details.length > 1 && (
                          <span className="text-gray-500 text-sm">
                            {" "}
                            and {order.details.length - 1} more
                          </span>
                        )}
                      </div>

                      {/* Arrow */}
                      <svg
                        className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </div>
                  </div>

                  {/* Shipping info (if available) */}
                  {order.shippingCity && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <p className="text-xs text-gray-500">
                        <span className="font-medium">Ship to:</span>{" "}
                        {[order.shippingAddress, order.shippingCity, order.shippingCountry]
                          .filter(Boolean)
                          .join(", ")}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
