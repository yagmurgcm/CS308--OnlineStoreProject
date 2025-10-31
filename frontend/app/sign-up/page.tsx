"use client";
import Link from "next/link";
import { useState } from "react";

export default function SignUpPage() {
  const [showPwd, setShowPwd] = useState(false);

  return (
    <div
      className="min-h-screen full-bleed flex items-center justify-center px-4"
      style={{
        backgroundImage:
          "url('/images/signupback.png'), radial-gradient(1200px 800px at 10% 20%, #ffffffaa, #ffffff88, #ffffff66, transparent 80%)",
        backgroundSize: "cover, cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
      }}
    >
      <div className="container-base">
        <div className="mx-auto max-w-md rounded-2xl border border-[var(--line)]/80 bg-white/70 backdrop-blur-md shadow-[0_20px_40px_rgba(0,0,0,0.08)]">
          <div className="p-6 md:p-8">
            <div className="text-center mb-6">
              <Link href="/" className="inline-block text-xl font-semibold tracking-[0.2em]">
                FATIH
              </Link>
              <h1 className="mt-2 text-2xl font-semibold">Create your account</h1>
              <p className="text-[var(--muted)] text-sm">
                Shop faster, track orders, and save your favourites.
              </p>
            </div>

            <form className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm mb-1">
                  Full name
                </label>
                <input id="name" name="name" type="text" className="input" placeholder="Jane Doe" />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm mb-1">
                  Email address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  className="input"
                  placeholder="you@example.com"
                  autoComplete="email"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm mb-1">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPwd ? "text" : "password"}
                    className="input pr-10"
                    placeholder="********"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd((s) => !s)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-[13px] text-[var(--muted)] hover:text-black"
                    aria-label={showPwd ? "Hide password" : "Show password"}
                  >
                    {showPwd ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="password2" className="block text-sm mb-1">
                  Confirm password
                </label>
                <input
                  id="password2"
                  name="password2"
                  type="password"
                  className="input"
                  placeholder="********"
                  autoComplete="new-password"
                />
              </div>

              <div className="flex items-start gap-3 text-sm">
                <input id="tos" type="checkbox" className="mt-1 accent-black" />
                <label htmlFor="tos" className="text-[13px] leading-5">
                  I agree to the{" "}
                  <a href="#" className="underline underline-offset-4">
                    Terms &amp; Conditions
                  </a>{" "}
                  and{" "}
                  <a href="#" className="underline underline-offset-4">
                    Privacy Policy
                  </a>
                  .
                </label>
              </div>

              <button type="submit" className="btn btn-primary w-full mt-2">
                Create account
              </button>
            </form>

            <p className="mt-4 text-center text-sm text-[var(--muted)]">
              Already have an account?{" "}
              <Link href="/sign-in" className="underline underline-offset-4">
                Sign in
              </Link>
            </p>
          </div>
        </div>

        <div
          className="mx-auto max-w-md text-center text-[12px] mt-4 px-4 py-2 rounded-lg border border-[var(--line)]"
          style={{ backgroundColor: "#f2e4d6", color: "#7b4a2e" }}
        >
          Tip: Use a strong password (12+ characters, mixed case, numbers & symbols).
        </div>
      </div>
    </div>
  );
}
