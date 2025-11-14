"use client";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export default function SignInPage() {
  const router = useRouter();
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
        setError("Email or password is wrong");
        return;
      }

      setError(null);
      setMessage("Sign in successful");
      const resolvedEmail = payloadEmail || email;
      if (resolvedEmail) {
        setAuthenticatedUser({
          name: payloadName || resolvedEmail,
          email: resolvedEmail,
          accessToken: payloadToken || undefined,
        });
      }
      setEmail("");
      setPassword("");
      router.push("/");
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
