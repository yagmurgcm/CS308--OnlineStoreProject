"use client";
import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function SignInSheet({ open, onClose }: Props) {
  const router = useRouter();
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { setAuthenticatedUser } = useAuth();

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
            noValidate
            onSubmit={async (event: FormEvent<HTMLFormElement>) => {
              event.preventDefault();
              event.stopPropagation();
              setLoading(true);
              setMessage(null);
              setError(null);
              try {
                const response = await fetch(`${backendUrl}/auth/signin`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ email, password }),
                });
                let payload: unknown = null;
                const rawBody = await response.text();
                if (rawBody) {
                  try {
                    payload = JSON.parse(rawBody);
                  } catch (err) {
                    console.warn("Non-JSON signin response:", rawBody, err);
                  }
                }
                console.log("Modal signin response:", payload ?? rawBody);
                const payloadName =
                  payload && typeof payload === "object" && payload !== null && "name" in payload
                    ? String((payload as { name: unknown }).name ?? "")
                    : null;
                const payloadEmail =
                  payload && typeof payload === "object" && payload !== null && "email" in payload
                    ? String((payload as { email: unknown }).email ?? "")
                    : null;
                const payloadToken =
                  payload && typeof payload === "object" && payload !== null && "access_token" in payload
                    ? String((payload as { access_token: unknown }).access_token ?? "")
                    : null;

                if (!response.ok) {
                  setError("❌ Email or password is wrong");
                  return;
                }
                const resolvedEmail = payloadEmail || email;
                if (resolvedEmail) {
                  setAuthenticatedUser({
                    name: payloadName || resolvedEmail,
                    email: resolvedEmail,
                    accessToken: payloadToken || undefined,
                  });
                }
                setMessage("✅ Sign in successful");
                setEmail("");
                setPassword("");
                setTimeout(() => {
                  onClose();
                  setMessage(null);
                }, 1200);
              } catch (err) {
                console.error("Modal signin error:", err);
                setError("❌ Email or password is wrong");
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
                className="input mt-1"
                placeholder="you@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>

            <label className="block">
              <span className="text-sm text-[var(--muted)]">
                Password <span className="ml-1">*</span>
              </span>
              <input
                type="password"
                className="input mt-1"
                placeholder="********"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
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

            {error && <p className="text-sm font-medium text-red-600 mt-2">{error}</p>}
            {message && <p className="text-sm font-medium text-green-600 mt-2">{message}</p>}
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
