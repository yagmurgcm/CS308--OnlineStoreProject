"use client";

import React, { useEffect, useState } from "react";
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
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-gray-900 w-8"></th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-900">Delivery ID</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-900">Customer ID</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-900">Product ID</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-900">Quantity</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-900">Total Price</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-900">Delivery Address</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-900">Delivery Status</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => {
                    const total = coercePrice(order.totalPrice);
                    const totalQuantity = order.details?.reduce((a, d) => a + d.quantity, 0) || 0;
                    const fullAddress = [
                      order.shippingAddress,
                      order.shippingCity,
                      order.shippingCountry
                    ].filter(Boolean).join(", ") || "-";
                    const isExpanded = expandedId === order.id;

                    return (
                      <React.Fragment key={order.id}>
                        {/* Main Row */}
                        <tr 
                          className={`hover:bg-blue-50 transition cursor-pointer border-b border-gray-100 ${isExpanded ? "bg-blue-50" : ""}`}
                          onClick={() => setExpandedId(isExpanded ? null : order.id)}
                        >
                          {/* Expand Icon */}
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-block transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`}>
                              ▼
                            </span>
                          </td>
                          
                          {/* Delivery ID */}
                          <td className="px-4 py-3">
                            <span className="font-bold text-blue-600">#{order.id}</span>
                            <div className="text-xs text-gray-500">
                              {new Date(order.createdAt).toLocaleDateString("tr-TR")}
                            </div>
                          </td>
                          
                          {/* Customer ID */}
                          <td className="px-4 py-3">
                            <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded font-mono text-xs font-medium">
                              #{order.user?.id || "N/A"}
                            </span>
                          </td>
                          
                          {/* Product ID(s) */}
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-1">
                              {order.details?.map((detail, idx) => (
                                <span 
                                  key={idx}
                                  className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded font-mono text-xs"
                                  title={detail.product?.name}
                                >
                                  #{detail.product?.id || "?"}
                                </span>
                              )) || "-"}
                            </div>
                          </td>
                          
                          {/* Quantity */}
                          <td className="px-4 py-3">
                            <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded font-medium">
                              {totalQuantity}
                            </span>
                          </td>
                          
                          {/* Total Price */}
                          <td className="px-4 py-3">
                            <span className="font-bold text-green-700">
                              {priceFmt.format(total)}
                            </span>
                          </td>
                          
                          {/* Delivery Address */}
                          <td className="px-4 py-3">
                            <div className="max-w-[200px] text-xs text-gray-600" title={fullAddress}>
                              {fullAddress.length > 30 ? fullAddress.substring(0, 30) + "..." : fullAddress}
                            </div>
                          </td>
                          
                          {/* Delivery Status */}
                          <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                            <select
                              value={order.status}
                              onChange={(e) => handleStatusChange(order.id, e.target.value)}
                              disabled={updatingId === order.id}
                              className={`px-3 py-1.5 rounded-lg text-xs font-medium border-0 cursor-pointer ${getStatusStyle(order.status)} disabled:opacity-50`}
                            >
                              {STATUS_OPTIONS.map((s) => (
                                <option key={s.value} value={s.value}>
                                  {s.label}
                                </option>
                              ))}
                            </select>
                          </td>
                        </tr>

                        {/* Expanded Details Row */}
                        <tr>
                          <td colSpan={8} className="p-0">
                            <div 
                              className={`overflow-hidden transition-all duration-300 ease-in-out ${
                                isExpanded ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
                              }`}
                            >
                              <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-5 border-b-2 border-blue-200">
                                <div className="grid md:grid-cols-4 gap-4">
                                  {/* Customer Details */}
                                  <div className="bg-white rounded-lg p-4 shadow-sm">
                                    <h4 className="font-semibold text-sm text-gray-700 mb-3 flex items-center gap-2">
                                      👤 Customer Details
                                    </h4>
                                    <div className="text-sm space-y-2 text-gray-600">
                                      <p><strong>ID:</strong> <span className="font-mono">#{order.user?.id || "N/A"}</span></p>
                                      <p><strong>Name:</strong> {order.contactName || order.user?.name || "-"}</p>
                                      <p><strong>Email:</strong> {order.contactEmail || order.user?.email || "-"}</p>
                                      <p><strong>Phone:</strong> {order.contactPhone || "-"}</p>
                                    </div>
                                  </div>

                                  {/* Shipping Details */}
                                  <div className="bg-white rounded-lg p-4 shadow-sm">
                                    <h4 className="font-semibold text-sm text-gray-700 mb-3 flex items-center gap-2">
                                      📍 Shipping Address
                                    </h4>
                                    <div className="text-sm text-gray-600">
                                      {order.shippingAddress ? (
                                        <>
                                          <p>{order.shippingAddress}</p>
                                          <p>{order.shippingCity}{order.shippingCountry && `, ${order.shippingCountry}`}</p>
                                        </>
                                      ) : (
                                        <p className="text-gray-400">No address provided</p>
                                      )}
                                    </div>
                                  </div>

                                  {/* Order Items */}
                                  <div className="bg-white rounded-lg p-4 shadow-sm">
                                    <h4 className="font-semibold text-sm text-gray-700 mb-3 flex items-center gap-2">
                                      📦 Order Items
                                    </h4>
                                    <div className="space-y-2">
                                      {order.details?.map((detail, idx) => (
                                        <div key={idx} className="flex justify-between items-center text-sm border-b border-gray-100 pb-2">
                                          <div>
                                            <span className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-mono text-xs mr-2">
                                              #{detail.product?.id}
                                            </span>
                                            <span className="font-medium">{detail.product?.name || "Unknown"}</span>
                                            <span className="text-gray-500 ml-1">× {detail.quantity}</span>
                                          </div>
                                          <span className="font-medium text-green-700">
                                            {priceFmt.format(coercePrice(detail.price) * detail.quantity)}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>

                                  {/* Delivery Info */}
                                  <div className="bg-white rounded-lg p-4 shadow-sm border-l-4 border-blue-500">
                                    <h4 className="font-semibold text-sm text-gray-700 mb-3 flex items-center gap-2">
                                      🚚 Delivery Info
                                    </h4>
                                    <div className="text-sm space-y-2 text-gray-600">
                                      <p>
                                        <strong>Delivery ID:</strong>{" "}
                                        <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-mono font-bold">
                                          #{order.id}
                                        </span>
                                      </p>
                                      <p>
                                        <strong>Product ID:</strong>{" "}
                                        {order.details?.map((d, i) => (
                                          <span key={i} className="bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded font-mono text-xs mr-1">
                                            #{d.product?.id}
                                          </span>
                                        ))}
                                      </p>
                                      <p>
                                        <strong>Quantity:</strong>{" "}
                                        <span className="bg-purple-100 text-purple-800 px-2 py-0.5 rounded font-medium">
                                          {totalQuantity}
                                        </span>
                                      </p>
                                      <p>
                                        <strong>Total Price:</strong>{" "}
                                        <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded font-bold">
                                          {priceFmt.format(total)}
                                        </span>
                                      </p>
                                      <p>
                                        <strong>Status:</strong>{" "}
                                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusStyle(order.status)}`}>
                                          {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                                        </span>
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
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

