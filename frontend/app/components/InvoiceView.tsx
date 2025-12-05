"use client";

import { OrderSummary } from "@/lib/orders";

type InvoiceViewProps = {
  order: OrderSummary;
};

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

export function InvoiceView({ order }: InvoiceViewProps) {
  const created = order.createdAt ? new Date(order.createdAt) : null;
  const totalPrice = coercePrice(order.totalPrice);
  const recipientEmail = order.contactEmail ?? order.user?.email;

  const handleDownload = () => {
    if (typeof window !== "undefined" && typeof window.print === "function") {
      window.print();
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 rounded-xl border border-[var(--line)] bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">
            Invoice
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">
            Invoice #{order.id}
          </h1>
          {created && (
            <p className="text-sm text-neutral-600">
              Issued on{" "}
              {created.toLocaleDateString(undefined, {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}{" "}
              at{" "}
              {created.toLocaleTimeString(undefined, {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          )}
          <p className="text-sm text-emerald-700">
            Invoice emailed to {recipientEmail || "your inbox"}.
          </p>
        </div>

        <div className="flex flex-col items-start gap-2 sm:items-end">
          <span className="inline-flex items-center rounded-full border border-[var(--line)] px-3 py-1 text-xs font-semibold uppercase tracking-wide">
            {order.status}
          </span>
          <button
            type="button"
            onClick={handleDownload}
            className="btn btn-primary"
          >
            Download PDF
          </button>
        </div>
      </header>

      <section className="rounded-xl border border-[var(--line)] bg-white p-6 shadow-sm space-y-4">
        <div className="grid grid-cols-[2fr_1fr_1fr] text-xs font-semibold uppercase tracking-wide text-neutral-500">
          <span>Item</span>
          <span className="text-right">Qty</span>
          <span className="text-right">Line total</span>
        </div>

        <div className="divide-y divide-[var(--line)]">
          {order.details?.map((detail) => {
            const unitPrice = coercePrice(detail.price);
            const lineTotal = unitPrice * detail.quantity;
            return (
              <div
                key={detail.id}
                className="grid grid-cols-[2fr_1fr_1fr] items-center gap-2 py-3 text-sm"
              >
                <div className="space-y-1">
                  <p className="font-medium text-neutral-900">
                    {detail.product?.name || "Product"}
                  </p>
                  {detail.product?.id && (
                    <p className="text-xs text-neutral-500">Product #{detail.product.id}</p>
                  )}
                </div>
                <div className="text-right text-neutral-700">{detail.quantity}</div>
                <div className="text-right font-semibold text-neutral-900">
                  {priceFmt.format(lineTotal)}
                </div>
              </div>
            );
          })}
        </div>

        <div className="border-t border-[var(--line)] pt-4">
          <div className="flex items-center justify-between text-base font-semibold">
            <span>Total</span>
            <span>{priceFmt.format(totalPrice)}</span>
          </div>
          <p className="mt-1 text-xs text-neutral-500">
            Status: {order.status}. Need help? Contact support and include your invoice number.
          </p>
        </div>
      </section>
    </div>
  );
}

export default InvoiceView;
