"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";

type DashboardData = {
  title: string;
  actions: { label: string; description: string; href?: string }[];
  lastUpdated?: string;
};

export default function SalesManagerDashboard() {
  const { user, initialized } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loadingDashboard, setLoadingDashboard] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!initialized) return;
    if (!user) {
      router.replace("/sign-in?redirect=/sales-manager");
      return;
    }
    if (user.role !== "SALES_MANAGER") {
      router.replace("/");
    }
  }, [initialized, user, router]);

  useEffect(() => {
    if (!initialized || !user || user.role !== "SALES_MANAGER") return;
    let cancelled = false;
    const load = async () => {
      setLoadingDashboard(true);
      setError(null);
      try {
        const payload = await api.get<DashboardData>("/sales-manager/dashboard");
        if (!cancelled) {
          setData(payload);
        }
      } catch (err) {
        console.error("Failed to load sales manager dashboard", err);
        if (!cancelled) {
          setError("Unable to load dashboard data right now.");
        }
      } finally {
        if (!cancelled) {
          setLoadingDashboard(false);
        }
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [initialized, user]);

  if (!initialized || !user || user.role !== "SALES_MANAGER") {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <p className="text-lg text-gray-600">Checking access…</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-10 px-4 space-y-8">
      <div>
        <p className="text-sm uppercase tracking-[0.3em] text-gray-500">Sales Manager</p>
        <h1 className="text-3xl font-semibold mt-2">Sales Manager Dashboard</h1>
        <p className="text-gray-600 mt-3">
          Welcome back, {user.name || "Sales Manager"}! Manage store-wide discounts and monitor
          invoices from this central dashboard.
        </p>
        {data?.lastUpdated && (
          <p className="text-xs text-gray-400 mt-1">Last synced: {new Date(data.lastUpdated).toLocaleString()}</p>
        )}
        <div className="mt-6">
          <Link
            href="/sales-manager/discounts"
            className="inline-flex items-center justify-center rounded-full border border-black px-5 py-2 text-sm font-semibold hover:bg-black hover:text-white transition"
          >
            Apply Discount
          </Link>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {(() => {
          const fallbackActions = [
            {
              label: "Apply Discount",
              description: "Configure limited-time promotions for key categories.",
              href: "/sales-manager/discounts",
            },
            {
              label: "View Invoices",
              description: "Track and export recent invoices for auditing.",
              href: "/sales-manager/invoices",
            },
            {
              label: "Finance Summary",
              description: "Review revenue and profit trends over time.",
              href: "/sales-manager/finance",
            },
          ];

          const baseActions = data?.actions?.length ? data.actions : fallbackActions;
          const actionItems = [...baseActions];
          const ensureAction = (label: string, description: string, href: string) => {
            if (actionItems.some((item) => item.label === label)) return;
            actionItems.push({ label, description, href });
          };

          ensureAction(
            "Apply Discount",
            "Configure discount campaigns for eligible products.",
            "/sales-manager/discounts",
          );
          ensureAction(
            "View Invoices",
            "Review and export the latest customer invoices.",
            "/sales-manager/invoices",
          );
          ensureAction(
            "Finance Summary",
            "Review revenue and profit trends over time.",
            "/sales-manager/finance",
          );

          const fallbackRoutes: Record<string, string> = {
            "Apply Discount": "/sales-manager/discounts",
            "View Invoices": "/sales-manager/invoices",
            "Finance Summary": "/sales-manager/finance",
          };

          return actionItems.map((action) => {
            const target = action.href ?? fallbackRoutes[action.label];
            return (
          <div
            key={action.label}
            className="rounded-2xl border border-[var(--line)] bg-white/80 backdrop-blur-sm shadow-sm p-6 flex flex-col justify-between"
          >
            <div>
              <h2 className="text-xl font-semibold">{action.label}</h2>
              <p className="text-gray-600 mt-2">{action.description}</p>
            </div>
            <button
              className="mt-6 inline-flex items-center justify-center rounded-xl border border-black px-4 py-2 font-medium hover:bg-black hover:text-white transition"
              type="button"
              onClick={() => {
                if (target) {
                  router.push(target);
                }
              }}
            >
              {action.label}
            </button>
          </div>
            );
          });
        })()}
      </div>

      <div className="rounded-2xl border border-dashed border-[var(--line)] p-6 bg-gray-50">
        {loadingDashboard ? (
          <p className="text-gray-600">Loading dashboard metrics…</p>
        ) : error ? (
          <p className="text-red-600">{error}</p>
        ) : (
          <p className="text-gray-600">
            Use the quick actions above to apply discounts or review invoices. Additional widgets can
            be added here later.
          </p>
        )}
      </div>
    </div>
  );
}
