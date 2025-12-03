"use client";

import { useEffect } from "react";
import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";

type ToastProps = {
  message: string;
  type?: "success" | "error" | "info";
  onDismiss?: () => void;
  durationMs?: number;
};

const ICONS = {
  success: CheckCircle2,
  error: AlertTriangle,
  info: Info,
} as const;

export default function Toast({
  message,
  type = "info",
  onDismiss,
  durationMs = 4000,
}: ToastProps) {
  useEffect(() => {
    if (!onDismiss) return;
    const timer = window.setTimeout(onDismiss, durationMs);
    return () => window.clearTimeout(timer);
  }, [durationMs, onDismiss]);

  const Icon = ICONS[type] ?? ICONS.info;
  const baseStyles =
    type === "error"
      ? "border-red-200 bg-red-50 text-red-800"
      : type === "success"
        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
        : "border-neutral-200 bg-white text-neutral-800";

  return (
    <div className="fixed inset-x-0 top-4 z-[100] flex justify-center px-4 sm:justify-end sm:px-6">
      <div
        className={`flex w-full max-w-sm items-start gap-3 rounded-xl border px-4 py-3 shadow-lg ${baseStyles}`}
        role="alert"
        aria-live="assertive"
      >
        <Icon className="mt-[2px] h-5 w-5 shrink-0" />
        <p className="text-sm leading-relaxed">{message}</p>
        <button
          type="button"
          aria-label="Dismiss notification"
          className="ml-auto rounded-full p-1 text-inherit transition hover:bg-black/5"
          onClick={onDismiss}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
