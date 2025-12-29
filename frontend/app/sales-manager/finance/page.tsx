"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";

type FinanceSeriesPoint = {
  bucket: string;
  revenue?: number | string;
  cost?: number | string;
  profit: number | string;
};

type FinanceSummary = {
  revenueTotal: number | string;
  costTotal: number | string;
  profitTotal: number | string;
  series: FinanceSeriesPoint[];
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

const formatBucket = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
  });
};

export default function SalesManagerFinancePage() {
  const { user, initialized } = useAuth();
  const router = useRouter();
  const [startDate, setStartDate] = useState(() => {
    const start = new Date();
    start.setDate(start.getDate() - 30);
    return formatDateInput(start);
  });
  const [endDate, setEndDate] = useState(() => formatDateInput(new Date()));
  const [groupBy, setGroupBy] = useState<"day" | "week" | "month">("day");
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!initialized) return;
    if (!user) {
      router.replace("/sign-in?redirect=/sales-manager/finance");
      return;
    }
    if (user.role !== "SALES_MANAGER") {
      router.replace("/");
    }
  }, [initialized, user, router]);

  const loadSummary = async () => {
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
      const params = new URLSearchParams({
        start: startDate,
        end: endDate,
        groupBy,
      });
      const data = await api.get<FinanceSummary>(
        `/sales-manager/finance/summary?${params}`,
      );
      setSummary(data ?? null);
    } catch (err) {
      console.error("Failed to load finance summary", err);
      setError(err instanceof Error ? err.message : "Unable to load summary.");
      setSummary(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!initialized || !user || user.role !== "SALES_MANAGER") return;
    loadSummary();
  }, [initialized, user, groupBy]);

  if (!initialized || !user || user.role !== "SALES_MANAGER") {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <p className="text-lg text-gray-600">Checking access...</p>
      </div>
    );
  }

  const series = summary?.series ?? [];
  const chartWidth = 640;
  const chartHeight = 180;
  const padding = 16;
  const profits = series.map((point) => Number(point.profit) || 0);
  const minV = Math.min(...profits);
  const maxV = Math.max(...profits);
  const range = (maxV - minV) || 1;
  const y = (value: number) =>
    padding + (chartHeight - 2 * padding) * (1 - ((value - minV) / range));
  const x = (index: number) => {
    if (series.length === 1) {
      return chartWidth / 2;
    }
    return padding + index * ((chartWidth - 2 * padding) / (series.length - 1));
  };
  const pointPairs = series.length >= 2
    ? profits
        .map((value, index) => ({ x: x(index), y: y(value) }))
        .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y))
    : [];
  const points = pointPairs.map((point) => `${point.x},${point.y}`).join(" ");
  const baselineY = Number.isFinite(y(0)) ? y(0) : chartHeight / 2;

  return (
    <div className="max-w-6xl mx-auto py-10 px-4 space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-gray-500">Sales Manager</p>
          <h1 className="text-3xl font-semibold mt-2">Finance Summary</h1>
          <p className="text-gray-600 mt-3">
            Track profit trends across custom date ranges and adjust strategy fast.
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
        <div className="grid gap-4 md:grid-cols-4">
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
          <label className="text-sm font-medium text-gray-700">
            Group by
            <select
              value={groupBy}
              onChange={(event) => setGroupBy(event.target.value as "day" | "week" | "month")}
              className="mt-1 w-full rounded-lg border border-[var(--line)] px-3 py-2 text-sm focus:border-black focus:outline-none"
            >
              <option value="day">Day</option>
              <option value="week">Week</option>
              <option value="month">Month</option>
            </select>
          </label>
          <div className="flex items-end">
            <button
              type="button"
              onClick={loadSummary}
              className="inline-flex w-full items-center justify-center rounded-full border border-black px-4 py-2 text-sm font-semibold hover:bg-black hover:text-white transition disabled:cursor-not-allowed disabled:border-gray-300 disabled:text-gray-400"
              disabled={loading}
            >
              {loading ? "Fetching..." : "Fetch summary"}
            </button>
          </div>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-[var(--line)] bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Revenue</p>
          <p className="text-2xl font-semibold mt-2">
            {priceFormatter.format(coerceNumber(summary?.revenueTotal))}
          </p>
        </div>
        <div className="rounded-2xl border border-[var(--line)] bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Cost</p>
          <p className="text-2xl font-semibold mt-2">
            {priceFormatter.format(coerceNumber(summary?.costTotal))}
          </p>
        </div>
        <div className="rounded-2xl border border-[var(--line)] bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Profit</p>
          <p className="text-2xl font-semibold mt-2">
            {priceFormatter.format(coerceNumber(summary?.profitTotal))}
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--line)] bg-white/90 shadow-sm p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-gray-800">Profit trend</p>
            <p className="text-xs text-gray-500">
              {series.length} bucket(s) • {groupBy}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-sm text-gray-500">Loading chart...</div>
        ) : series.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-500">
            No finance data available for this range.
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            <div className="w-full overflow-x-auto">
              <svg
                viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                className="w-full min-w-[520px]"
                role="img"
                aria-label="Profit trend chart"
              >
                <line
                  x1={0}
                  y1={baselineY}
                  x2={chartWidth}
                  y2={baselineY}
                  stroke="#e5e7eb"
                  strokeWidth={1}
                />
                {series.length >= 2 ? (
                  <polyline
                    fill="none"
                    stroke="#111827"
                    strokeWidth={2}
                    points={points}
                  />
                ) : (
                  <circle
                    cx={chartWidth / 2}
                    cy={y(profits[0] ?? 0)}
                    r={4}
                    fill="#111827"
                  />
                )}
                {series.length >= 2 &&
                  profits.map((value, index) => {
                    const xPos = x(index);
                    const yPos = y(value);
                    if (!Number.isFinite(xPos) || !Number.isFinite(yPos)) {
                      return null;
                    }
                    return (
                      <circle
                        key={series[index]?.bucket ?? index}
                        cx={xPos}
                        cy={yPos}
                        r={3}
                        fill="#111827"
                      />
                    );
                  })}
              </svg>
            </div>
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>{series[0]?.bucket ?? ""}</span>
              <span>{series[series.length - 1]?.bucket ?? ""}</span>
            </div>
            <div className="grid gap-2 md:grid-cols-3 text-sm">
              {series.map((point) => (
                <div
                  key={point.bucket}
                  className="rounded-xl border border-[var(--line)] px-3 py-2"
                >
                  <p className="text-xs text-gray-500">{formatBucket(point.bucket)}</p>
                  <p className="font-semibold">
                    {priceFormatter.format(coerceNumber(point.profit))}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
