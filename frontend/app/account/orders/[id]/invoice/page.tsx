"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Toast from "@/app/components/Toast";
import InvoiceView from "@/app/components/InvoiceView";
import { fetchOrderById, type OrderSummary } from "@/lib/orders";

export default function InvoicePage() {
  const params = useParams<{ id?: string }>();
  const [order, setOrder] = useState<OrderSummary | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const orderId = params?.id;
    if (!orderId) return;

    const load = async () => {
      setStatus("loading");
      try {
        const data = await fetchOrderById(orderId);
        setOrder(data);
        setStatus("ready");
      } catch (error) {
        setStatus("error");
        setToast(error instanceof Error ? error.message : "Failed to load invoice");
      }
    };

    load();
  }, [params?.id]);

  if (status === "loading") {
    return (
      <div className="text-sm text-neutral-600">Loading invoice...</div>
    );
  }

  if (status === "error" || !order) {
    return (
      <div className="space-y-3">
        <p className="text-lg font-semibold text-neutral-900">Unable to load invoice</p>
        <p className="text-sm text-neutral-600">
          We couldn&apos;t fetch the invoice details right now. Please try again shortly.
        </p>
        {toast && (
          <Toast
            message={toast}
            type="error"
            onDismiss={() => setToast(null)}
          />
        )}
      </div>
    );
  }

  return (
    <>
      <InvoiceView order={order} />
      {toast && (
        <Toast
          message={toast}
          type="error"
          onDismiss={() => setToast(null)}
        />
      )}
    </>
  );
}
