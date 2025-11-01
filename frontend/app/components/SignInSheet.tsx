"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, AuthResponse } from "@/lib/api";

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function SignInSheet({ open, onClose }: Props) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  return (
    <div
      aria-hidden={!open}
      className={`fixed inset-0 z-50 transition ${open ? "pointer-events-auto" : "pointer-events-none"}`}
    >
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-black/40 transition-opacity ${open ? "opacity-100" : "opacity-0"}`}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="signin-title"
        className={`absolute right-0 top-0 h-full w-[90vw] max-w-[420px] bg-white border-l border-[var(--line)] shadow-xl transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between h-14 px-4 border-b border-[var(--line)]">
          <h2 id="signin-title" className="text-xl font-medium">
            Sign In
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="h-8 w-8 grid place-items-center rounded-full border border-[var(--line)] hover:bg-[var(--background)]"
          >
            &times;
          </button>
        </div>

        <div className="p-5 space-y-6 overflow-y-auto h-[calc(100%-56px)]">
          <form
            className="space-y-4"
            onSubmit={async (event) => {
              event.preventDefault();
              setMessage("");
              setLoading(true);
              try {
                const res = await api.post<AuthResponse>("/auth/signin", { email, password });
                if (typeof window !== "undefined") {
                  localStorage.setItem("token", res.access_token);
                }
                setMessage("Signed in successfully.");
                onClose();
                router.push("/");
              } catch (err: unknown) {
                const msg = err instanceof Error ? err.message : "Failed to sign in";
                setMessage(msg);
              } finally {
                setLoading(false);
              }
            }}
          >
            <label className="block">
              <span className="text-sm text-[var(--muted)]">
                Email Address <span className="ml-1">*</span>
              </span>
              <input
                type="email"
                required
                className="input mt-1"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>

            <label className="block">
              <span className="text-sm text-[var(--muted)]">
                Password <span className="ml-1">*</span>
              </span>
              <input
                type="password"
                required
                className="input mt-1"
                placeholder="********"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" className="accent-black" /> Remember me
              </label>
              <Link href="#" className="underline underline-offset-4 text-sm">
                Forgot your password?
              </Link>
            </div>

            <button type="submit" className="btn-primary w-full py-2.5 rounded-lg" disabled={loading}>
              {loading ? "Signing in..." : "SIGN IN"}
            </button>
            {message && (
              <p className="text-sm text-[var(--muted)]">{message}</p>
            )}
          </form>

          <hr className="border-[var(--line)]" />

          <div className="space-y-3">
            <h3 className="text-[17px] font-medium">New to FATIH Online?</h3>
            <p className="text-[var(--muted)] text-sm">
              Create an account and you will be able to manage orders, save addresses, and more.
            </p>
            <button
              onClick={() => {
                onClose();
                router.push("/sign-up");
              }}
              className="btn w-full py-2.5 rounded-lg"
            >
              CREATE AN ACCOUNT
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}
