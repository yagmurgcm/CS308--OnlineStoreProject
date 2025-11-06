"use client";
import { FormEvent, useState } from "react";

export default function SignInPage() {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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

      const payloadMessage =
        payload && typeof payload === "object" && payload !== null && "message" in payload
          ? String((payload as { message: unknown }).message ?? "")
          : null;

      if (!response.ok) {
        setError(`❌ ${payloadMessage || "Email veya şifre hatalı"}`);
        return;
      }

      setMessage(`✅ ${payloadMessage || "Giriş başarılı"}`);
      setEmail("");
      setPassword("");
    } catch (err) {
      console.error("Signin error:", err);
      setError("❌ Email veya şifre hatalı");
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
      </form>
      {message && (
        <p className="mt-4 text-sm font-medium text-green-600" role="status">
          {message}
        </p>
      )}
      {error && (
        <p className="mt-4 text-sm font-medium text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
