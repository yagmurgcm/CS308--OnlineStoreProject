"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";

type InvoiceCustomer = {
  id: number | null;
  name: string | null;
  email: string | null;
};

type InvoiceRecord = {
  id: number;
  date: string;
  status: string;
  total: number | string;
  customer: InvoiceCustomer;
};

const priceFormatter = new Intl.NumberFormat("tr-TR", {
  style: "currency",
  currency: "TRY",
});

const coerceNumber = (value: number | string | null | undefined): number => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

const formatDateInput = (date: Date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatInvoiceDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export default function SalesManagerInvoicesPage() {
  const { user, initialized } = useAuth();
  const router = useRouter();
  const [startDate, setStartDate] = useState(() => {
    const start = new Date();
    start.setDate(start.getDate() - 30);
    return formatDateInput(start);
  });
  const [endDate, setEndDate] = useState(() => formatDateInput(new Date()));
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<number | null>(null);
  const [actionType, setActionType] = useState<"download" | "print" | null>(null);

  useEffect(() => {
    if (!initialized) return;
    if (!user) {
      router.replace("/sign-in?redirect=/sales-manager/invoices");
      return;
    }
    if (user.role !== "SALES_MANAGER") {
      router.replace("/");
    }
  }, [initialized, user, router]);

  const loadInvoices = async () => {
    setError(null);
    if (!startDate || !endDate) {
      setError("Please select both start and end dates.");
      return;
    }
    if (startDate > endDate) {
      setError("Start date must be before or equal to end date.");
      return;
    }
    setLoading(true);
    try {
      const params = new URLSearchParams({ start: startDate, end: endDate });
      const data = await api.get<InvoiceRecord[]>(`/sales-manager/invoices?${params}`);
      setInvoices(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load invoices", err);
      setError(err instanceof Error ? err.message : "Unable to load invoices.");
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!initialized || !user || user.role !== "SALES_MANAGER") return;
    loadInvoices();
  }, [initialized, user]);

  const fetchInvoicePdf = (invoiceId: number) =>
    api.getBinary(`/sales-manager/invoices/${invoiceId}/pdf`);

  const handleDownload = async (invoiceId: number) => {
    setError(null);
    setActionId(invoiceId);
    setActionType("download");
    try {
      const pdfBlob = await fetchInvoicePdf(invoiceId);
      const url = URL.createObjectURL(pdfBlob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `invoice-${invoiceId}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Invoice download failed", err);
      setError("Unable to download invoice. Please try again.");
    } finally {
      setActionId(null);
      setActionType(null);
    }
  };

  const handlePrint = async (invoiceId: number) => {
    setError(null);
    setActionId(invoiceId);
    setActionType("print");
    try {
      const pdfBlob = await fetchInvoicePdf(invoiceId);
      const url = URL.createObjectURL(pdfBlob);
      
      // Iframe oluştur ve PDF'i yükle (görünmez)
      const iframe = document.createElement("iframe");
      iframe.style.position = "fixed";
      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "0";
      iframe.style.opacity = "0";
      iframe.src = url;
      document.body.appendChild(iframe);
      
      // PDF yüklendikten sonra print dialog'u aç
      iframe.onload = () => {
        setTimeout(() => {
          try {
            iframe.contentWindow?.print();
          } catch (printErr) {
            console.error("Print failed", printErr);
            setError("Print dialog could not open. Please try downloading the PDF and printing manually.");
          }
        }, 500);
      };
      
      // Fallback: Eğer onload çalışmazsa, timeout ile dene
      setTimeout(() => {
        try {
          if (iframe.contentWindow) {
            iframe.contentWindow.print();
          }
        } catch (printErr) {
          console.error("Print failed", printErr);
          setError("Print dialog could not open. Please try downloading the PDF and printing manually.");
        }
      }, 1000);
      
      // 10 saniye sonra iframe'i temizle
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
        URL.revokeObjectURL(url);
      }, 10000);
    } catch (err) {
      console.error("Invoice print failed", err);
      setError("Unable to open invoice for printing. Please try downloading the PDF instead.");
    } finally {
      setActionId(null);
      setActionType(null);
    }
  };

  if (!initialized || !user || user.role !== "SALES_MANAGER") {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <p className="text-lg text-gray-600">Checking access...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-10 px-4 space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-gray-500">Sales Manager</p>
          <h1 className="text-3xl font-semibold mt-2">Invoice Review</h1>
          <p className="text-gray-600 mt-3">
            Filter invoices by date range and download customer PDFs for auditing.
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

      <div className="rounded-2xl border border-[var(--line)] bg-white/80 backdrop-blur p-6 space-y-4">
        <div className="grid gap-4 md:grid-cols-3">
          <label className="text-sm font-medium text-gray-700">
            Start date
            <input
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              className="mt-1 w-full rounded-lg border border-[var(--line)] px-3 py-2 text-sm focus:border-black focus:outline-none"
            />
          </label>
          <label className="text-sm font-medium text-gray-700">
            End date
            <input
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              className="mt-1 w-full rounded-lg border border-[var(--line)] px-3 py-2 text-sm focus:border-black focus:outline-none"
            />
          </label>
          <div className="flex items-end">
            <button
              type="button"
              onClick={loadInvoices}
              className="inline-flex w-full items-center justify-center rounded-full border border-black px-4 py-2 text-sm font-semibold hover:bg-black hover:text-white transition disabled:cursor-not-allowed disabled:border-gray-300 disabled:text-gray-400"
              disabled={loading}
            >
              {loading ? "Fetching..." : "Fetch invoices"}
            </button>
          </div>
        </div>
        {error && (
          <div className="rounded-lg border-2 border-red-300 bg-red-50 p-4">
            <p className="text-sm font-semibold text-red-800">{error}</p>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-[var(--line)] bg-white/90 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] px-6 py-4">
          <div>
            <p className="text-sm font-semibold text-gray-800">Invoices</p>
            <p className="text-xs text-gray-500">
              {invoices.length} result(s)
            </p>
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-sm text-gray-500">Loading invoices...</div>
        ) : invoices.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-500">
            No invoices in this range.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[var(--line)] text-sm">
              <thead className="bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3">ID</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--line)] bg-white">
                {invoices.map((invoice) => {
                  const total = coerceNumber(invoice.total);
                  const isWorking = actionId === invoice.id;
                  return (
                    <tr key={invoice.id}>
                      <td className="px-4 py-4 font-medium text-gray-900">#{invoice.id}</td>
                      <td className="px-4 py-4 text-gray-700">
                        {formatInvoiceDate(invoice.date)}
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-gray-900">
                          {invoice.customer?.name || "Guest"}
                        </div>
                        <div className="text-xs text-gray-500">
                          {invoice.customer?.email || "No email"}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-gray-700">{invoice.status}</td>
                      <td className="px-4 py-4 font-semibold">
                        {priceFormatter.format(total)}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleDownload(invoice.id)}
                            className="rounded-full border border-black px-3 py-1.5 text-xs font-semibold hover:bg-black hover:text-white transition disabled:cursor-not-allowed disabled:border-gray-300 disabled:text-gray-400"
                            disabled={isWorking}
                          >
                            {isWorking && actionType === "download" ? "Downloading..." : "Download PDF"}
                          </button>
                          <button
                            type="button"
                            onClick={() => handlePrint(invoice.id)}
                            className="rounded-full border border-[var(--line)] px-3 py-1.5 text-xs font-semibold hover:border-black"
                            disabled={isWorking}
                          >
                            {isWorking && actionType === "print" ? "Opening..." : "Print"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
