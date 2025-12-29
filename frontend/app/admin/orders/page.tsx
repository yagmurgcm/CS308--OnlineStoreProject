"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type OrderDetail = {
  id: number;
  quantity: number;
  price: number | string;
  product?: {
    id: number;
    name: string;
  };
};

type Order = {
  id: number;
  status: string;
  totalPrice: number | string;
  createdAt: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  shippingAddress?: string;
  shippingCity?: string;
  shippingCountry?: string;
  user?: {
    id: number;
    name?: string;
    email?: string;
  };
  details?: OrderDetail[];
};

const STATUS_OPTIONS = [
  { value: "processing", label: "Processing", color: "bg-blue-100 text-blue-800" },
  { value: "in-transit", label: "In Transit", color: "bg-purple-100 text-purple-800" },
  { value: "delivered", label: "Delivered", color: "bg-green-100 text-green-800" },
  { value: "cancelled", label: "Cancelled", color: "bg-red-100 text-red-800" },
];

const priceFmt = new Intl.NumberFormat("tr-TR", {
  style: "currency",
  currency: "TRY",
});

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const fetchOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<Order[]>("/orders/admin/all");
      setOrders(data || []);
    } catch (err) {
      console.error("Failed to fetch orders:", err);
      setError("Failed to load orders. Make sure you're logged in.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleStatusChange = async (orderId: number, newStatus: string) => {
    setUpdatingId(orderId);
    try {
      await api.patch(`/orders/admin/${orderId}/status`, { status: newStatus });
      // Refresh list
      await fetchOrders();
    } catch (err) {
      console.error("Failed to update status:", err);
      alert("Failed to update order status");
    } finally {
      setUpdatingId(null);
    }
  };

  const getStatusStyle = (status: string) => {
    const option = STATUS_OPTIONS.find((s) => s.value === status);
    return option?.color || "bg-gray-100 text-gray-800";
  };

  const coercePrice = (val: number | string | undefined): number => {
    if (val === undefined || val === null) return 0;
    if (typeof val === "number") return val;
    const parsed = parseFloat(val);
    return isNaN(parsed) ? 0 : parsed;
  };

  return (
    <div className="py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Order Management</h1>
          <p className="text-gray-600 mt-1">View and manage all customer orders</p>
        </div>

        {/* Stats */}
        {!loading && !error && orders.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            {STATUS_OPTIONS.map((status) => {
              const count = orders.filter((o) => o.status === status.value).length;
              return (
                <div
                  key={status.value}
                  className={`rounded-xl p-4 ${status.color}`}
                >
                  <div className="text-2xl font-bold">{count}</div>
                  <div className="text-sm">{status.label}</div>
                </div>
              );
            })}
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading orders...</div>
        ) : error ? (
          <div className="text-center py-12 text-red-500">{error}</div>
        ) : orders.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
            <div className="text-5xl mb-4">📦</div>
            <p className="text-gray-600">No orders found.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const total = coercePrice(order.totalPrice);
              const isExpanded = expandedId === order.id;
              const itemCount =
                order.details?.reduce((a, d) => a + d.quantity, 0) || 0;

              return (
                <div
                  key={order.id}
                  className="bg-white rounded-xl border border-gray-200 overflow-hidden"
                >
                  {/* Order Header */}
                  <div
                    className="p-5 cursor-pointer hover:bg-gray-50 transition"
                    onClick={() => setExpandedId(isExpanded ? null : order.id)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      {/* Left Info */}
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <span className="font-bold text-lg">
                            Order #{order.id}
                          </span>
                          <span
                            className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStatusStyle(
                              order.status
                            )}`}
                          >
                            {order.status}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600">
                          {order.user?.name || order.user?.email || order.contactEmail || "Guest"}
                          {" • "}
                          {new Date(order.createdAt).toLocaleString("tr-TR")}
                        </div>
                      </div>

                      {/* Right: Price & Status Selector */}
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="font-bold text-lg">
                            {priceFmt.format(total)}
                          </div>
                          <div className="text-sm text-gray-500">
                            {itemCount} item{itemCount !== 1 ? "s" : ""}
                          </div>
                        </div>

                        {/* Status Dropdown */}
                        <select
                          value={order.status}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleStatusChange(order.id, e.target.value);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          disabled={updatingId === order.id}
                          className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                        >
                          {STATUS_OPTIONS.map((s) => (
                            <option key={s.value} value={s.value}>
                              {s.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Expand indicator */}
                    <div className="mt-2 text-xs text-gray-400">
                      {isExpanded ? "▲ Click to collapse" : "▼ Click to expand details"}
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="border-t border-gray-100 p-5 bg-gray-50">
                      <div className="grid md:grid-cols-2 gap-6">
                        {/* Customer Info */}
                        <div>
                          <h4 className="font-semibold text-sm text-gray-700 mb-2">
                            Customer Information
                          </h4>
                          <div className="text-sm space-y-1 text-gray-600">
                            <p>
                              <strong>Name:</strong>{" "}
                              {order.contactName || order.user?.name || "-"}
                            </p>
                            <p>
                              <strong>Email:</strong>{" "}
                              {order.contactEmail || order.user?.email || "-"}
                            </p>
                            <p>
                              <strong>Phone:</strong> {order.contactPhone || "-"}
                            </p>
                          </div>
                        </div>

                        {/* Shipping Info */}
                        <div>
                          <h4 className="font-semibold text-sm text-gray-700 mb-2">
                            Shipping Address
                          </h4>
                          <div className="text-sm text-gray-600">
                            {order.shippingAddress ? (
                              <>
                                <p>{order.shippingAddress}</p>
                                <p>
                                  {order.shippingCity}
                                  {order.shippingCountry &&
                                    `, ${order.shippingCountry}`}
                                </p>
                              </>
                            ) : (
                              <p className="text-gray-400">No address provided</p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Order Items */}
                      {order.details && order.details.length > 0 && (
                        <div className="mt-6">
                          <h4 className="font-semibold text-sm text-gray-700 mb-2">
                            Order Items
                          </h4>
                          <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
                            {order.details.map((detail) => (
                              <div
                                key={detail.id}
                                className="flex items-center justify-between px-4 py-3"
                              >
                                <div>
                                  <span className="font-medium">
                                    {detail.product?.name || `Product #${detail.product?.id}`}
                                  </span>
                                  <span className="text-gray-500 ml-2">
                                    × {detail.quantity}
                                  </span>
                                </div>
                                <span className="font-medium">
                                  {priceFmt.format(coercePrice(detail.price) * detail.quantity)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Summary */}
        {!loading && !error && orders.length > 0 && (
          <div className="mt-6 text-center text-sm text-gray-500">
            Total: {orders.length} order{orders.length !== 1 ? "s" : ""}
          </div>
        )}
      </div>
    </div>
  );
}

