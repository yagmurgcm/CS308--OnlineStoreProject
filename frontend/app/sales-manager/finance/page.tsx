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
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null);
  const [visibleLines, setVisibleLines] = useState({
    revenue: true,
    cost: true,
    profit: true,
  });

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
  const chartWidth = Math.max(640, series.length * 60); // Dinamik genişlik
  const chartHeight = 300;
  const padding = { top: 20, right: 20, bottom: 40, left: 60 };
  const innerWidth = chartWidth - padding.left - padding.right;
  const innerHeight = chartHeight - padding.top - padding.bottom;
  
  // Tüm değerleri topla (revenue, cost, profit)
  const allValues = series.flatMap((point) => [
    Number(point.revenue) || 0,
    Number(point.cost) || 0,
    Number(point.profit) || 0,
  ]);
  const minV = Math.min(...allValues, 0);
  const maxV = Math.max(...allValues, 0);
  const range = (maxV - minV) || 1;
  
  const y = (value: number) =>
    padding.top + innerHeight * (1 - ((value - minV) / range));
  const x = (index: number) => {
    if (series.length === 1) {
      return padding.left + innerWidth / 2;
    }
    return padding.left + index * (innerWidth / Math.max(series.length - 1, 1));
  };
  
  // Her metrik için çizgi oluştur
  const revenues = series.map((point) => Number(point.revenue) || 0);
  const costs = series.map((point) => Number(point.cost) || 0);
  const profits = series.map((point) => Number(point.profit) || 0);
  
  const createLinePath = (values: number[]) => {
    if (values.length < 2) return "";
    return values
      .map((value, index) => {
        const xPos = x(index);
        const yPos = y(value);
        return `${index === 0 ? "M" : "L"} ${xPos} ${yPos}`;
      })
      .join(" ");
  };
  
  const revenuePath = createLinePath(revenues);
  const costPath = createLinePath(costs);
  const profitPath = createLinePath(profits);
  
  const baselineY = Number.isFinite(y(0)) ? y(0) : padding.top + innerHeight / 2;

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
          <div className="mt-6 space-y-6">
            {/* Legend with toggles */}
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <button
                type="button"
                onClick={() => setVisibleLines((prev) => ({ ...prev, revenue: !prev.revenue }))}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition ${
                  visibleLines.revenue
                    ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                    : "border-gray-300 bg-gray-50 text-gray-400"
                }`}
              >
                <div className={`h-3 w-3 rounded-full ${visibleLines.revenue ? "bg-emerald-500" : "bg-gray-400"}`}></div>
                <span>Revenue</span>
              </button>
              <button
                type="button"
                onClick={() => setVisibleLines((prev) => ({ ...prev, cost: !prev.cost }))}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition ${
                  visibleLines.cost
                    ? "border-red-500 bg-red-50 text-red-700"
                    : "border-gray-300 bg-gray-50 text-gray-400"
                }`}
              >
                <div className={`h-3 w-3 rounded-full ${visibleLines.cost ? "bg-red-500" : "bg-gray-400"}`}></div>
                <span>Cost</span>
              </button>
              <button
                type="button"
                onClick={() => setVisibleLines((prev) => ({ ...prev, profit: !prev.profit }))}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition ${
                  visibleLines.profit
                    ? "border-blue-600 bg-blue-50 text-blue-700"
                    : "border-gray-300 bg-gray-50 text-gray-400"
                }`}
              >
                <div className={`h-3 w-3 rounded-full ${visibleLines.profit ? "bg-blue-600" : "bg-gray-400"}`}></div>
                <span>Profit</span>
              </button>
            </div>

            {/* Chart */}
            <div className="w-full relative">
              <svg
                viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                className="w-full h-auto"
                preserveAspectRatio="xMidYMid meet"
                role="img"
                aria-label="Finance trends chart"
              >
                {/* Grid lines */}
                {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                  const yPos = padding.top + innerHeight * (1 - ratio);
                  const value = minV + range * ratio;
                  return (
                    <g key={ratio}>
                      <line
                        x1={padding.left}
                        y1={yPos}
                        x2={chartWidth - padding.right}
                        y2={yPos}
                        stroke="#f3f4f6"
                        strokeWidth={1}
                      />
                      <text
                        x={padding.left - 10}
                        y={yPos + 4}
                        textAnchor="end"
                        fontSize="10"
                        fill="#6b7280"
                      >
                        {priceFormatter.format(value)}
                      </text>
                    </g>
                  );
                })}

                {/* Baseline (zero line) */}
                {minV < 0 && maxV > 0 && (
                  <line
                    x1={padding.left}
                    y1={baselineY}
                    x2={chartWidth - padding.right}
                    y2={baselineY}
                    stroke="#e5e7eb"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                  />
                )}

                {/* Revenue line */}
                {visibleLines.revenue && revenuePath && (
                  <path
                    d={revenuePath}
                    fill="none"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}

                {/* Profit line */}
                {visibleLines.profit && profitPath && (
                  <path
                    d={profitPath}
                    fill="none"
                    stroke="#2563eb"
                    strokeWidth={3}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}

                {/* Cost line - Render last so it's on top */}
                {visibleLines.cost && costPath && costPath.trim() !== "" && (
                  <path
                    d={costPath}
                    fill="none"
                    stroke="#ef4444"
                    strokeWidth={3}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity={1}
                  />
                )}

                {/* Invisible hover areas for tooltip */}
                {series.map((point, index) => {
                  const xPos = x(index);
                  const maxY = Math.max(
                    y(revenues[index]),
                    y(costs[index]),
                    y(profits[index])
                  );
                  const minY = Math.min(
                    y(revenues[index]),
                    y(costs[index]),
                    y(profits[index])
                  );
                  
                  return (
                    <g key={`hover-${point.bucket}`}>
                      {/* Invisible hover rectangle */}
                      <rect
                        x={xPos - 20}
                        y={padding.top}
                        width={40}
                        height={innerHeight}
                        fill="transparent"
                        onMouseEnter={(e) => {
                          setHoveredIndex(index);
                          const rect = e.currentTarget.getBoundingClientRect();
                          const chartContainer = e.currentTarget.closest('.relative') as HTMLElement;
                          const containerRect = chartContainer?.getBoundingClientRect();
                          const centerX = rect.left + rect.width / 2;
                          
                          if (containerRect) {
                            setTooltipPosition({ 
                              x: centerX - containerRect.left, 
                              y: rect.top - containerRect.top + 50, // Aşağıya kaydır
                            });
                          }
                        }}
                        onMouseMove={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          const chartContainer = e.currentTarget.closest('.relative') as HTMLElement;
                          const containerRect = chartContainer?.getBoundingClientRect();
                          const centerX = rect.left + rect.width / 2;
                          
                          if (containerRect) {
                            setTooltipPosition({ 
                              x: centerX - containerRect.left, 
                              y: rect.top - containerRect.top + 50, // Aşağıya kaydır
                            });
                          }
                        }}
                        onMouseLeave={() => {
                          setHoveredIndex(null);
                          setTooltipPosition(null);
                        }}
                        style={{ cursor: "pointer" }}
                      />
                      {/* Vertical line on hover */}
                      {hoveredIndex === index && (
                        <line
                          x1={xPos}
                          y1={padding.top}
                          x2={xPos}
                          y2={chartHeight - padding.bottom}
                          stroke="#9ca3af"
                          strokeWidth={1}
                          strokeDasharray="4 4"
                        />
                      )}
                    </g>
                  );
                })}

                {/* Data points */}
                {series.map((point, index) => {
                  const revX = x(index);
                  const revY = y(revenues[index]);
                  const costX = x(index);
                  const costY = y(costs[index]);
                  const profitX = x(index);
                  const profitY = y(profits[index]);
                  
                  return (
                    <g key={point.bucket}>
                      {/* Revenue point */}
                      {visibleLines.revenue && Number.isFinite(revX) && Number.isFinite(revY) && (
                        <circle
                          cx={revX}
                          cy={revY}
                          r={hoveredIndex === index ? 6 : 4}
                          fill="#10b981"
                          stroke="white"
                          strokeWidth={2}
                          style={{ transition: "r 0.2s" }}
                        />
                      )}
                      {/* Cost point */}
                      {visibleLines.cost && Number.isFinite(costX) && Number.isFinite(costY) && (
                        <circle
                          cx={costX}
                          cy={costY}
                          r={hoveredIndex === index ? 6 : 4}
                          fill="#ef4444"
                          stroke="white"
                          strokeWidth={2}
                          style={{ transition: "r 0.2s" }}
                        />
                      )}
                      {/* Profit point */}
                      {visibleLines.profit && Number.isFinite(profitX) && Number.isFinite(profitY) && (
                        <circle
                          cx={profitX}
                          cy={profitY}
                          r={hoveredIndex === index ? 7 : 5}
                          fill="#2563eb"
                          stroke="white"
                          strokeWidth={2}
                          style={{ transition: "r 0.2s" }}
                        />
                      )}
                      {/* X-axis labels */}
                      {index % Math.max(1, Math.floor(series.length / 8)) === 0 && (
                        <text
                          x={x(index)}
                          y={chartHeight - padding.bottom + 20}
                          textAnchor="middle"
                          fontSize="10"
                          fill="#6b7280"
                        >
                          {formatBucket(point.bucket)}
                        </text>
                      )}
                    </g>
                  );
                })}
              </svg>
              
              {/* Tooltip */}
              {hoveredIndex !== null && tooltipPosition && series[hoveredIndex] && (
                <div
                  className="absolute z-10 bg-gray-900 text-white text-xs rounded-lg shadow-xl p-3 pointer-events-none whitespace-nowrap"
                  style={{
                    left: `${tooltipPosition.x}px`,
                    top: `${tooltipPosition.y}px`,
                    transform: "translate(-50%, 0)",
                    maxWidth: "220px",
                  }}
                >
                  <div className="font-semibold mb-2 text-white border-b border-gray-700 pb-1">
                    {formatBucket(series[hoveredIndex].bucket)}
                  </div>
                  <div className="space-y-1">
                    {visibleLines.revenue && (
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-emerald-500"></div>
                        <span className="text-gray-300">Revenue:</span>
                        <span className="font-semibold text-emerald-400">
                          {priceFormatter.format(coerceNumber(series[hoveredIndex].revenue))}
                        </span>
                      </div>
                    )}
                    {visibleLines.cost && (
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-red-500"></div>
                        <span className="text-gray-300">Cost:</span>
                        <span className="font-semibold text-red-400">
                          {priceFormatter.format(coerceNumber(series[hoveredIndex].cost))}
                        </span>
                      </div>
                    )}
                    {visibleLines.profit && (
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                        <span className="text-gray-300">Profit:</span>
                        <span className="font-semibold text-blue-400">
                          {priceFormatter.format(coerceNumber(series[hoveredIndex].profit))}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Summary cards */}
            <div className="grid gap-3 md:grid-cols-3 text-sm">
              {series.map((point) => (
                <div
                  key={point.bucket}
                  className="rounded-xl border border-[var(--line)] bg-gray-50 p-4 space-y-2"
                >
                  <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                    {formatBucket(point.bucket)}
                  </p>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">Revenue:</span>
                      <span className="font-semibold text-emerald-600">
                        {priceFormatter.format(coerceNumber(point.revenue))}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">Cost:</span>
                      <span className="font-semibold text-red-600">
                        {priceFormatter.format(coerceNumber(point.cost))}
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t border-gray-200">
                      <span className="text-xs font-medium text-gray-700">Profit:</span>
                      <span className="font-bold text-blue-600">
                        {priceFormatter.format(coerceNumber(point.profit))}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
