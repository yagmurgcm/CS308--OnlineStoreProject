"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import {
  fetchReturnOrders,
  fetchReturnRequests,
  updateReturnRequestStatus,
  type ReturnOrderSummary,
  type ReturnRequest,
} from "@/lib/returns";

const currency = new Intl.NumberFormat("tr-TR", {
  style: "currency",
  currency: "TRY",
});

type TabKey = "cancelled" | "refunded";

const TAB_CONFIG: { key: TabKey; label: string; statuses: string[] }[] = [
  { key: "cancelled", label: "Cancelled", statuses: ["cancelled"] },
  { key: "refunded", label: "Refunded", statuses: ["returned", "partially_returned"] },
];

export default function SalesManagerReturnsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, initialized } = useAuth();
  const [activeTab, setActiveTab] = useState<TabKey>("cancelled");
  const [orders, setOrders] = useState<ReturnOrderSummary[]>([]);
  const [requests, setRequests] = useState<ReturnRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<number | null>(null);

  const isAdminEmail =
    user?.email?.toLowerCase() === "admin@gmail.com" ||
    user?.email?.toLowerCase() === "product@gmail.com";
  const isAdminRole = user?.role === "ADMIN";
  const canAccess = user?.role === "SALES_MANAGER" || isAdminRole || isAdminEmail;

  useEffect(() => {
    if (!initialized) return;
    if (!user) {
      const redirectTo = pathname || "/sales-manager/returns";
      router.replace(`/sign-in?redirect=${encodeURIComponent(redirectTo)}`);
      return;
    }
    if (!canAccess) {
      router.replace("/");
    }
  }, [initialized, user, canAccess, router, pathname]);

  useEffect(() => {
    if (!initialized || !user) return;
    if (!canAccess) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [ordersData, requestsData] = await Promise.all([
          fetchReturnOrders(),
          fetchReturnRequests(),
        ]);
        if (!cancelled) {
          setOrders(Array.isArray(ordersData) ? ordersData : []);
          setRequests(Array.isArray(requestsData) ? requestsData : []);
        }
      } catch (err) {
        console.error("Failed to load return orders", err);
        if (!cancelled)
          setError("Unable to load return data. Please try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [initialized, user]);

  const filteredOrders = useMemo(() => {
    const statuses = TAB_CONFIG.find((t) => t.key === activeTab)?.statuses || [];
    return orders.filter((order) =>
      statuses.includes((order.status || "").toLowerCase()),
    );
  }, [activeTab, orders]);

  if (!initialized || !user || !canAccess) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <p className="text-lg text-gray-600">Checking access…</p>
      </div>
    );
  }

  const renderOrder = (order: ReturnOrderSummary) => {
    return (
      <div
        key={order.id}
        className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
      >
        <div className="p-5 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-sm text-gray-500">Order #{order.id}</div>
            <div className="text-lg font-semibold text-gray-900">
              {order.user?.name || order.user?.email || "Customer"}
            </div>
            <div className="text-xs text-gray-500">
              {new Date(order.createdAt).toLocaleString("tr-TR")}
            </div>
          </div>
          <div className="text-sm text-gray-600">
            Status: <span className="font-semibold capitalize">{order.status}</span>
          </div>
        </div>

        <div className="border-t border-gray-100 bg-gray-50 p-5 space-y-3">
          {(order.details || []).map((detail) => {
            const purchasedQty = detail.quantity ?? 0;
            const returnedQty = detail.returnedQuantity ?? purchasedQty;
            const unitPrice = detail.unitPrice ?? detail.price ?? 0;
            const totalRefunded = detail.totalRefunded ?? unitPrice * returnedQty;
            return (
              <div
                key={detail.id}
                className="bg-white border border-gray-200 rounded-lg px-4 py-3 flex items-center justify-between"
              >
                <div>
                  <div className="font-medium text-gray-900">
                    {detail.product?.name || "Product"}
                  </div>
                  <div className="text-xs text-gray-500">
                    Purchased: {purchasedQty} • Returned: {returnedQty}
                  </div>
                  <div className="text-xs text-gray-500">
                    Unit: {currency.format(Number(unitPrice) || 0)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-gray-900">
                    {currency.format(Number(totalRefunded) || 0)}
                  </div>
                  <div className="text-xs text-gray-500">Refunded total</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const handleDecision = async (id: number, status: "approved" | "rejected") => {
    setActionId(id);
    setError(null);
    try {
      await updateReturnRequestStatus(id, status);
      const [ordersData, requestsData] = await Promise.all([
        fetchReturnOrders(),
        fetchReturnRequests(),
      ]);
      setOrders(Array.isArray(ordersData) ? ordersData : []);
      setRequests(Array.isArray(requestsData) ? requestsData : []);
    } catch (err) {
      console.error("Failed to update return request", err);
      setError("Unable to update return request. Please try again.");
    } finally {
      setActionId(null);
    }
  };

  const renderRequest = (request: ReturnRequest) => {
    const created = new Date(request.createdAt).toLocaleString("tr-TR");
    const customer = request.user?.name || request.user?.email || `User #${request.userId}`;
    return (
      <div
        key={request.id}
        className="bg-white border border-gray-200 rounded-xl p-4 space-y-3"
      >
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-sm text-gray-500">Return request #{request.id}</div>
            <div className="text-lg font-semibold text-gray-900">
              Order #{request.orderId} • {customer}
            </div>
            <div className="text-xs text-gray-500">{created}</div>
            {request.returnReason && (
              <div className="text-xs text-gray-600">Reason: {request.returnReason}</div>
            )}
          </div>
          {request.status === "pending" ? (
            <div className="flex gap-2">
              <button
                className="px-3 py-1.5 rounded-lg bg-green-600 text-white text-sm disabled:opacity-50 hover:bg-green-700"
                disabled={actionId === request.id}
                onClick={() => handleDecision(request.id, "approved")}
              >
                {actionId === request.id ? "..." : "Approve"}
              </button>
              <button
                className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-sm disabled:opacity-50 hover:bg-red-700"
                disabled={actionId === request.id}
                onClick={() => handleDecision(request.id, "rejected")}
              >
                {actionId === request.id ? "..." : "Reject"}
              </button>
            </div>
          ) : (
            <span className="text-xs px-2 py-1 rounded-full border bg-gray-50 text-gray-700">
              {request.status}
            </span>
          )}
        </div>

        <div className="border-t border-gray-100 pt-3 space-y-2">
          {(request.items || []).map((item) => {
            const detail = item.orderDetail;
            const productName = detail?.product?.name || "Product";
            
            // Calculate unit price with discounted price if available
            let unitPrice = Number(detail?.price ?? 0);
            const product = detail?.product as any; // Cast to any to access discount properties
            
            if (product) {
              // Check if product has discountedPrice
              if (product.discountedPrice !== null && product.discountedPrice !== undefined) {
                unitPrice = Number(product.discountedPrice);
              }
              // Or calculate from discountRate
              else if (product.discountRate && Number(product.discountRate) > 0 && product.price) {
                const originalPrice = Number(product.price);
                const discountRate = Number(product.discountRate);
                unitPrice = originalPrice * (1 - discountRate / 100);
              }
            }
            
            const originalPrice = product?.price ? Number(product.price) : unitPrice;
            const discount =
              originalPrice > unitPrice
                ? `${Math.round(((originalPrice - unitPrice) / originalPrice) * 100)}%`
                : "—";
            const lineTotal = unitPrice * item.quantity;
            return (
              <div
                key={item.id}
                className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 flex items-center justify-between"
              >
                <div>
                  <div className="font-medium text-gray-900">{productName}</div>
                  <div className="text-xs text-gray-500">
                    Qty: {item.quantity} • Unit: {currency.format(Number(unitPrice) || 0)} •
                    Discount: {discount}
                  </div>
                </div>
                <div className="text-sm font-semibold text-gray-900">
                  {currency.format(Number(lineTotal) || 0)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="py-8">
      <div className="max-w-7xl mx-auto px-4 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Returns</h1>
            <p className="text-gray-600 mt-1">
              Review cancelled and refunded orders with accurate quantities and prices.
            </p>
          </div>
          <button
            type="button"
            onClick={() => router.push("/sales-manager")}
            className="inline-flex items-center rounded-full border border-[var(--line)] px-5 py-2 text-sm font-medium hover:border-black"
          >
            Back to dashboard
          </button>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Pending refund requests</h2>
            <p className="text-xs text-gray-500">
              Approve only after the product is received.
            </p>
          </div>
          {loading ? (
            <div className="text-center py-6 text-gray-500">Loading requests…</div>
          ) : requests.filter((r) => r.status === "pending").length === 0 ? (
            <div className="text-center py-6 bg-white border border-gray-200 rounded-lg text-gray-600">
              No pending requests.
            </div>
          ) : (
            <div className="space-y-3">
              {requests
                .filter((r) => r.status === "pending")
                .map((request) => renderRequest(request))}
            </div>
          )}
        </div>

        <div className="flex gap-2 border-b border-gray-200">
          {TAB_CONFIG.map((tab) => {
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
                  active
                    ? "border-red-600 text-red-600"
                    : "border-transparent text-gray-600 hover:text-gray-900"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading returns…</div>
        ) : error ? (
          <div className="text-center py-12 text-red-500">{error}</div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
            <div className="text-5xl mb-4">↩️</div>
            <p className="text-gray-600">No orders found for this category.</p>
          </div>
        ) : (
          <div className="space-y-4">{filteredOrders.map(renderOrder)}</div>
        )}
      </div>
    </div>
  );
}
