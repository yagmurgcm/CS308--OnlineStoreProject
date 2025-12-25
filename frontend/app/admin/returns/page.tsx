"use client";

import { useEffect, useMemo, useState } from "react";
import {
  fetchReturnRequests,
  updateReturnRequestStatus,
  type ReturnRequest,
} from "@/lib/returns";
import { fetchAdminOrders, type OrderSummary } from "@/lib/orders";

const statusStyles: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
  approved: "bg-green-100 text-green-800 border-green-200",
  rejected: "bg-red-100 text-red-800 border-red-200",
};

export default function AdminReturnsPage() {
  const [requests, setRequests] = useState<ReturnRequest[]>([]);
  const [cancelledOrders, setCancelledOrders] = useState<OrderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"pending" | "all">("pending");
  const [actionId, setActionId] = useState<number | null>(null);

  const filteredRequests = useMemo(() => {
    if (filter === "all") return requests;
    return requests.filter((req) => req.status === "pending");
  }, [filter, requests]);

  const loadRequests = async () => {
    setLoading(true);
    setError(null);
    try {
      const [requestData, orderData] = await Promise.all([
        fetchReturnRequests(),
        fetchAdminOrders(),
      ]);
      setRequests(requestData || []);
      setCancelledOrders(
        (orderData || []).filter(
          (order) => order.status?.toLowerCase?.() === "cancelled",
        ),
      );
    } catch (err) {
      console.error("Failed to fetch return requests:", err);
      setError("Failed to load return requests. Make sure you're logged in.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const handleStatusChange = async (id: number, status: "approved" | "rejected") => {
    setActionId(id);
    try {
      await updateReturnRequestStatus(id, status);
      await loadRequests();
    } catch (err) {
      console.error("Failed to update return request:", err);
      alert("Failed to update return request");
    } finally {
      setActionId(null);
    }
  };

  return (
    <div className="py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Return Requests</h1>
          <p className="text-gray-600 mt-1">
            Review return requests submitted by customers
          </p>
        </div>

        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setFilter("pending")}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              filter === "pending"
                ? "bg-orange-500 text-white"
                : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
            }`}
          >
            Pending
          </button>
          <button
            onClick={() => setFilter("all")}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              filter === "all"
                ? "bg-blue-500 text-white"
                : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
            }`}
          >
            All
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading return requests...</div>
        ) : error ? (
          <div className="text-center py-12 text-red-500">{error}</div>
        ) : filteredRequests.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
            <div className="text-5xl mb-4">R</div>
            <p className="text-gray-600">
              {filter === "pending"
                ? "No pending return requests."
                : "No return requests found."}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredRequests.map((request) => (
              <div
                key={request.id}
                className="bg-white rounded-xl border border-gray-200 overflow-hidden"
              >
                <div className="p-5 flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-gray-900">
                        Return #{request.id}
                      </span>
                      <span
                        className={`px-2.5 py-0.5 text-xs font-medium rounded-full border ${
                          statusStyles[request.status] || statusStyles.pending
                        }`}
                      >
                        {request.status}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600">
                      Order #{request.orderId} •{" "}
                      {request.user?.name || request.user?.email || `User #${request.userId}`}
                    </div>
                    {request.returnShippingCode && (
                      <div className="text-sm text-gray-700">
                        Return cargo code:{" "}
                        <span className="font-semibold">
                          {request.returnShippingCode}
                        </span>
                      </div>
                    )}
                    <div className="text-xs text-gray-500">
                      {new Date(request.createdAt).toLocaleString("tr-TR")}
                    </div>
                  </div>

                  {request.status === "pending" && (
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => handleStatusChange(request.id, "approved")}
                        disabled={actionId === request.id}
                        className="px-4 py-2 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition disabled:opacity-50"
                      >
                        {actionId === request.id ? "..." : "Approve"}
                      </button>
                      <button
                        onClick={() => handleStatusChange(request.id, "rejected")}
                        disabled={actionId === request.id}
                        className="px-4 py-2 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition disabled:opacity-50"
                      >
                        {actionId === request.id ? "..." : "Reject"}
                      </button>
                    </div>
                  )}
                </div>

                <div className="border-t border-gray-100 bg-gray-50 p-5">
                  <h4 className="font-semibold text-sm text-gray-700 mb-3">
                    Requested Items
                  </h4>
                  <div className="space-y-2">
                    {(request.items || []).map((item) => {
                      const detail = item.orderDetail;
                      const productName = detail?.product?.name || "Product";
                      const variant = [
                        detail?.variant?.color ? `Color: ${detail.variant.color}` : null,
                        detail?.variant?.size ? `Size: ${detail.variant.size}` : null,
                      ]
                        .filter(Boolean)
                        .join(" • ");

                      return (
                        <div
                          key={item.id}
                          className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-4 py-3"
                        >
                          <div>
                            <div className="font-medium text-gray-900">
                              {productName}
                            </div>
                            {variant && (
                              <div className="text-xs text-gray-500">{variant}</div>
                            )}
                            <div className="text-xs text-gray-500 mt-1">
                              Purchased: {detail?.quantity ?? "-"} • Returned:{" "}
                              {detail?.returnedQuantity ?? 0}
                            </div>
                          </div>
                          <div className="text-sm font-semibold text-gray-900">
                            Qty {item.quantity}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && !error && cancelledOrders.length > 0 && (
          <div className="mt-10 space-y-4">
            <div>
              <h2 className="text-2xl font-semibold text-gray-900">
                Cancelled Orders
              </h2>
              <p className="text-gray-600 mt-1">
                Items and quantities returned on cancelled orders
              </p>
            </div>

            {cancelledOrders.map((order) => (
              <div
                key={order.id}
                className="bg-white rounded-xl border border-gray-200 overflow-hidden"
              >
                <div className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="font-semibold text-gray-900">
                        Order #{order.id}
                      </div>
                      <div className="text-sm text-gray-600">
                        {order.user?.name || order.user?.email || order.contactEmail || "Guest"}
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(order.createdAt).toLocaleString("tr-TR")}
                      </div>
                    </div>
                    <span className="px-2.5 py-0.5 text-xs font-medium rounded-full border bg-gray-100 text-gray-800 border-gray-200">
                      cancelled
                    </span>
                  </div>
                </div>

                <div className="border-t border-gray-100 bg-gray-50 p-5">
                  <h4 className="font-semibold text-sm text-gray-700 mb-3">
                    Returned Items
                  </h4>
                  <div className="space-y-2">
                    {(order.details || []).map((detail) => (
                      <div
                        key={detail.id}
                        className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-4 py-3"
                      >
                        <div>
                          <div className="font-medium text-gray-900">
                            {detail.product?.name || "Product"}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            Purchased: {detail.quantity} • Returned:{" "}
                            {detail.returnedQuantity ?? 0}
                          </div>
                        </div>
                        <div className="text-sm font-semibold text-gray-900">
                          Qty {detail.returnedQuantity ?? 0}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
