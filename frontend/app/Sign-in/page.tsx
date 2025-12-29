"use client";

import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export default function SignInPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { setAuthenticatedUser } = useAuth();

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    event.stopPropagation();

    setLoading(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch(`${backendUrl}/auth/signin`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
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
      console.log("Signin response:", payload ?? rawBody);

      const getPayloadValue = (key: string): unknown => {
        if (!payload || typeof payload !== "object" || payload === null) {
          return null;
        }
        const container = payload as Record<string, unknown>;
        if (key in container) {
          return container[key];
        }
        if ("user" in container && container.user && typeof container.user === "object") {
          const nested = container.user as Record<string, unknown>;
          if (key in nested) {
            return nested[key];
          }
        }
        return null;
      };

      const toStringValue = (value: unknown): string | null =>
        typeof value === "string" && value ? value : null;
      const toNumberValue = (value: unknown): number | null => {
        if (typeof value === "number" && Number.isFinite(value)) return value;
        if (typeof value === "string") {
          const parsed = Number(value);
          return Number.isFinite(parsed) ? parsed : null;
        }
        return null;
      };

      const payloadName = toStringValue(getPayloadValue("name"));
      const payloadEmail = toStringValue(getPayloadValue("email"));
      const payloadToken = toStringValue(getPayloadValue("access_token"));
      const payloadRole = toStringValue(getPayloadValue("role"));
      const payloadId = toNumberValue(getPayloadValue("id"));

      if (!response.ok) {
        setError("Email or password is wrong");
        return;
      }

      const resolvedEmail = payloadEmail || email;
      if (!payloadToken || !resolvedEmail) {
        setError("Authentication failed. Please try again.");
        return;
      }

      setError(null);

      // Admin kontrolü - admin@gmail.com veya product@gmail.com ise admin paneline yönlendir
      const isAdmin =
        resolvedEmail.toLowerCase() === "admin@gmail.com" ||
        resolvedEmail.toLowerCase() === "product@gmail.com";
      const isSalesManager = payloadRole === "SALES_MANAGER";

      setMessage(
        isSalesManager
          ? "Welcome Sales Manager!"
          : isAdmin
            ? "Welcome Admin!"
            : "Sign in successful",
      );
      setAuthenticatedUser({
        id: payloadId ?? undefined,
        name: payloadName || resolvedEmail,
        email: resolvedEmail,
        role: payloadRole ?? undefined,
        accessToken: payloadToken,
      });
      setEmail("");
      setPassword("");
      const redirectTo = isSalesManager
        ? "/sales-manager"
        : isAdmin
          ? "/admin/products"
          : (searchParams.get("redirect") || "/");
      router.push(redirectTo);
    } catch (err) {
      console.error("Signin error:", err);
      setError("Email or password is wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-2xl font-semibold mb-6">Sign in</h1>
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <input
          className="input"
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          className="input"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button className="btn btn-primary w-full" disabled={loading}>
          {loading ? "Signing in..." : "Sign in"}
        </button>
        {error && (
          <p className="text-red-600 text-sm mt-2" role="alert">
            {error}
          </p>
        )}
      </form>
      {message && (
        <p className="mt-4 text-sm font-medium text-green-600" role="status">
          {message}
        </p>
      )}
    </div>
  );
}
