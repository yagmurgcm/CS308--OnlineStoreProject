"use client";
import { useAuth } from "@/lib/auth-context";

export default function UserStatus() {
  const { user } = useAuth();

  if (!user) {
    return null;
  }

  const displayName = user.name || user.email || "User";

  return (
    <div
      className="flex items-center gap-3 rounded-full border border-neutral-200 bg-white px-4 py-1.5 text-sm text-neutral-900 shadow-sm"
      aria-live="polite"
    >
      <span role="img" aria-label="profile" className="text-xl leading-none">
        🧑‍💻
      </span>
      <div className="leading-tight">
        <span className="block text-[11px] uppercase tracking-wide text-neutral-400">Signed in</span>
        <span className="font-semibold">{displayName}</span>
      </div>
    </div>
  );
}
