"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Toast from "@/app/components/Toast";
import { CART_AUTH_ERROR, useCart } from "@/lib/cart-context";
import { checkoutOrder } from "@/lib/orders";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";

const formatter = new Intl.NumberFormat("tr-TR", {
  style: "currency",
  currency: "TRY",
});

const trackingSteps = [
  "Order received",
  "Preparing",
  "Packed",
  "Shipped",
  "Out for delivery",
  "Delivered",
];

const COUNTRIES = [
  "Turkey",
  "United States",
  "United Kingdom",
  "Germany",
  "France",
  "Italy",
  "Spain",
  "Canada",
  "Australia",
  "Netherlands",
  "Belgium",
  "Sweden",
  "Norway",
  "Denmark",
  "Finland",
  "Switzerland",
  "Austria",
  "Ireland",
  "Portugal",
  "Greece",
  "Poland",
  "Czech Republic",
  "Hungary",
  "Romania",
  "Bulgaria",
  "Croatia",
  "Slovakia",
  "Slovenia",
  "Serbia",
  "Bosnia and Herzegovina",
  "North Macedonia",
  "Albania",
  "Russia",
  "Ukraine",
  "Georgia",
  "Armenia",
  "Azerbaijan",
  "Israel",
  "Saudi Arabia",
  "United Arab Emirates",
  "Qatar",
  "Kuwait",
  "Bahrain",
  "Oman",
  "Egypt",
  "Morocco",
  "South Africa",
  "India",
  "Pakistan",
  "Bangladesh",
  "Sri Lanka",
  "China",
  "Japan",
  "South Korea",
  "Singapore",
  "Malaysia",
  "Thailand",
  "Vietnam",
  "Philippines",
  "Indonesia",
  "New Zealand",
  "Mexico",
  "Brazil",
  "Argentina",
  "Chile",
  "Colombia",
  "Peru",
  "Venezuela",
  "Uruguay",
  "Paraguay",
  "Bolivia",
  "Costa Rica",
  "Panama",
  "Guatemala",
  "Honduras",
  "El Salvador",
  "Nicaragua",
  "Dominican Republic",
  "Jamaica",
  "Other",
];

const formatCardNumber = (value: string) =>
  value
    .replace(/\D/g, "")
    .slice(0, /^3[47]/.test(value) ? 15 : 16)
    .replace(
      /^3[47]/.test(value) ? /(\d{1,4})(\d{1,6})?(\d{1,5})?/ : /(\d{1,4})(\d{1,4})?(\d{1,4})?(\d{1,4})?/,
      (_, a, b, c, d) => [a, b, c, d].filter(Boolean).join(" ")
    )
    .trim();

const formatExpiry = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
};

const detectCardBrand = (num: string) => {
  const clean = num.replace(/\s+/g, "");
  if (/^4/.test(clean)) return "Visa";
  if (/^(5[1-5]|2[2-7])/.test(clean)) return "Mastercard";
  if (/^3[47]/.test(clean)) return "AmEx";
  if (/^9792/.test(clean)) return "Troy";
  return "Card";
};

export default function CheckoutPage() {
  const router = useRouter();
  const { items, subtotal, reload, isLoading } = useCart();
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<"success" | "error" | "info">("info");
  const [orderId, setOrderId] = useState<number | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [cardNumberInput, setCardNumberInput] = useState("");
  const [cardNameInput, setCardNameInput] = useState("");
  const [expiryInput, setExpiryInput] = useState("");
  const [cvcInput, setCvcInput] = useState("");
  const [phoneInput, setPhoneInput] = useState("");
  const [country, setCountry] = useState("");

  const hasItems = items.length > 0;
  const total = useMemo(() => subtotal, [subtotal]);

  const validateForm = (form: FormData) => {
    const errors: Record<string, string> = {};
    const phone = (form.get("phone") as string)?.trim();
    const cardNumberRaw = (form.get("cardNumber") as string) || "";
    const cardNumber = cardNumberRaw.replace(/\s+/g, "");
    const brand = detectCardBrand(cardNumberRaw);
    const cvc = (form.get("cvc") as string)?.trim();
    const expiry = (form.get("expiry") as string)?.trim();

    if (!/^[0-9]{10,15}$/.test(phone || "")) {
      errors.phone = "Please enter a valid phone number";
    }
    if (
      !(
        (brand === "AmEx" && /^[0-9]{15}$/.test(cardNumber || "")) ||
        (brand !== "AmEx" && /^[0-9]{16}$/.test(cardNumber || ""))
      )
    ) {
      errors.cardNumber = brand === "AmEx" ? "Enter a 15-digit AmEx number" : "Enter a 16-digit card number";
    }
    if (
      !(
        (brand === "AmEx" && /^[0-9]{4}$/.test(cvc || "")) ||
        (brand !== "AmEx" && /^[0-9]{3}$/.test(cvc || ""))
      )
    ) {
      errors.cvc = brand === "AmEx" ? "Enter the 4-digit CVC" : "Enter the 3-digit CVC";
    }
    if (!/^(0[1-9]|1[0-2])\/(\d{2})$/.test(expiry || "")) {
      errors.expiry = "Enter expiry as MM/YY";
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const mergeGuestCartIfNeeded = async () => {
    if (typeof window === "undefined") return;
    if (!user?.id) return;
    const guestToken = window.localStorage.getItem("guestCartToken");
    if (!guestToken) return;
    try {
      await api.post(`/cart/${user.id}/merge-guest`, { guestToken });
      window.localStorage.removeItem("guestCartToken");
    } catch (error) {
      console.error("Failed to merge guest cart before checkout", error);
    }
  };

  const handlePay = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!hasItems || loading) return;

    setToastMessage(null);
    setToastType("info");
    const formData = new FormData(event.currentTarget);
    if (!validateForm(formData)) {
      return;
    }

    setLoading(true);
    try {
      await mergeGuestCartIfNeeded();
      await reload();
      const order = await checkoutOrder();
      await reload();
      setOrderId(order?.id ?? null);
      setToastMessage("Your order is confirmed. We are preparing your shipment.");
      setToastType("success");
    } catch (error) {
      const raw = error instanceof Error ? error.message : "Payment failed";
      let friendly = raw;
      let shouldRedirectToSignIn = false;
      try {
        const parsed = JSON.parse(raw);
        friendly = typeof parsed?.message === "string" ? parsed.message : friendly;
      } catch {
        // ignore JSON parse errors
      }
      if (raw === CART_AUTH_ERROR || /unauthorized|401/i.test(friendly)) {
        friendly = "Please sign in to checkout.";
        shouldRedirectToSignIn = true;
      }
      if (/cart is empty/i.test(friendly)) {
        friendly = "Your cart is empty. Please add items before checkout.";
      }
      setToastMessage(friendly || "Payment failed");
      setToastType("error");
      if (shouldRedirectToSignIn) {
        await logout().catch(() => logout());
        router.push("/sign-in");
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isLoading && !hasItems) {
    return (
      <main className="container-base py-16 space-y-6">
        <h1 className="text-2xl font-semibold">Checkout</h1>
        <div className="rounded-xl border border-dashed border-[var(--line)] bg-white p-10 text-center">
          <p className="text-lg font-medium text-neutral-900">Your cart is empty</p>
          <p className="mt-2 text-sm text-neutral-500">
            Add items to your cart before continuing to checkout.
          </p>
          <div className="mt-4 flex justify-center gap-3">
            <Link href="/" className="btn btn-primary">
              Continue shopping
            </Link>
            <Link href="/cart" className="btn btn-ghost">
              View cart
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="container-base py-10 space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Checkout</h1>
        <p className="text-sm text-neutral-600">
          Review your details and confirm your payment to place the order.
        </p>
      </header>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <form
          onSubmit={handlePay}
          className="space-y-6 rounded-xl border border-[var(--line)] bg-white p-6 shadow-sm"
        >
          <div>
            <h2 className="text-lg font-semibold">Contact & delivery</h2>
            <p className="text-sm text-neutral-600">
              We&apos;ll use this information to send order updates.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <input
              className="input"
              name="fullName"
              placeholder="Full name"
              required
            />
            <input
              className="input"
              type="email"
              name="email"
              placeholder="Email address"
              required
            />
            <input
              className="input"
              type="tel"
              name="phone"
              placeholder="Phone number"
              value={phoneInput}
              onChange={(e) => setPhoneInput(e.target.value)}
              required
            />
            <input
              className="input sm:col-span-2"
              name="address"
              placeholder="Street address"
              required
            />
            <input
              className="input"
              name="city"
              placeholder="City"
            />
            <input
              className="input"
              name="postalCode"
              placeholder="Postal code"
            />
            <select
              className="input"
              name="country"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              required
            >
              <option value="" disabled>
                Country
              </option>
              {COUNTRIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-3">
            <div>
              <h3 className="text-base font-semibold">Payment</h3>
              <p className="text-sm text-neutral-600">
                Card details are mocked for now. Enter any valid-looking numbers to proceed.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {["Visa", "Mastercard", "AmEx", "Troy", "Maestro"].map((brand) => (
                <span
                  key={brand}
                  className="inline-flex items-center gap-1 rounded-full border border-[var(--line)] bg-gradient-to-br from-white to-neutral-50 px-3 py-1 text-xs font-semibold uppercase text-neutral-700 shadow-sm"
                >
                  <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden />
                  {brand}
                </span>
              ))}
            </div>

            <div className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-[#8f8f8f] bg-gradient-to-br from-[#0b0b0f] via-[#15151c] to-[#030306] p-6 text-white shadow-2xl ring-1 ring-black/40">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.05),transparent_30%),radial-gradient(circle_at_80%_0%,rgba(255,255,255,0.04),transparent_25%),radial-gradient(circle_at_50%_80%,rgba(255,255,255,0.03),transparent_30%)]" aria-hidden />
              <div className="pointer-events-none absolute -left-8 top-1 h-40 w-40 opacity-80 mix-blend-screen" aria-hidden>
                <div className="absolute inset-2 rounded-full bg-gradient-to-br from-emerald-300/15 via-white/10 to-transparent blur-xl" />
                <svg viewBox="0 0 160 160" className="relative h-full w-full text-white drop-shadow-[0_10px_25px_rgba(0,0,0,0.35)]">
                  <defs>
                    <linearGradient id="amexRingGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="rgba(52,211,153,0.8)" />
                      <stop offset="60%" stopColor="rgba(255,255,255,0.65)" />
                      <stop offset="100%" stopColor="rgba(52,211,153,0.4)" />
                    </linearGradient>
                    <linearGradient id="amexFaceLines" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="rgba(255,255,255,0.85)" />
                      <stop offset="100%" stopColor="rgba(255,255,255,0.55)" />
                    </linearGradient>
                  </defs>
                  <circle
                    cx="80"
                    cy="80"
                    r="68"
                    fill="none"
                    stroke="url(#amexRingGradient)"
                    strokeWidth="8"
                    strokeDasharray="6 10"
                    opacity="0.8"
                  />
                  <circle
                    cx="80"
                    cy="80"
                    r="54"
                    fill="none"
                    stroke="url(#amexRingGradient)"
                    strokeWidth="4"
                    opacity="0.35"
                  />
                  <path
                    d="M96 42c-15 5-27 19-28 36l-7 5c-2 1-2 4-1 6l8 10c1 2 4 2 6 0l6-6c8 4 18 4 26 1 8-3 13-11 13-19 0-7-3-13-8-17l2-6c1-4-1-7-5-8l-10-3c-3-1-6 1-7 4l-1 3"
                    fill="none"
                    stroke="url(#amexFaceLines)"
                    strokeWidth="5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity="0.9"
                  />
                  <path
                    d="M88 78c4 3 10 3 14 0"
                    stroke="url(#amexFaceLines)"
                    strokeWidth="4"
                    strokeLinecap="round"
                    opacity="0.85"
                  />
                  <path
                    d="M84 66c3 2 7 3 10 2"
                    stroke="url(#amexFaceLines)"
                    strokeWidth="3"
                    strokeLinecap="round"
                    opacity="0.85"
                  />
                  <path
                    d="M74 88c5 4 12 6 19 5"
                    stroke="url(#amexFaceLines)"
                    strokeWidth="3"
                    strokeLinecap="round"
                    opacity="0.75"
                  />
                  <path
                    d="M102 40c2-5 0-11-5-14-6-4-14-2-19 3"
                    stroke="url(#amexFaceLines)"
                    strokeWidth="3"
                    strokeLinecap="round"
                    opacity="0.7"
                  />
                </svg>
              </div>
              <div className="relative flex items-center justify-between text-xs uppercase tracking-[0.2em] opacity-90">
                <span className="font-semibold">American Express</span>
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-200">
                  {detectCardBrand(cardNumberInput)}
                </span>
              </div>

              <div className="relative mt-5 flex items-center gap-3">
                <div className="relative h-14 w-14 shrink-0 rounded-full border border-white/20 bg-gradient-to-br from-[#222] via-[#111] to-[#000] p-[6px] shadow-lg">
                  <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.16),transparent_45%)]" aria-hidden />
                  <div className="relative h-full w-full rounded-full bg-gradient-to-br from-[#1f2430] via-[#0c1018] to-[#020305] flex items-center justify-center">
                    <svg viewBox="0 0 120 120" className="h-12 w-12 text-white/90">
                      <defs>
                        <linearGradient id="faceShade" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="rgba(255,255,255,0.8)" />
                          <stop offset="100%" stopColor="rgba(255,255,255,0.35)" />
                        </linearGradient>
                      </defs>
                      <circle cx="60" cy="60" r="58" fill="url(#faceShade)" opacity="0.08" />
                      <path
                        d="M72 28c-9 2-18 7-24 16-5 7-6 16-5 26l-6 3c-2 1-3 3-2 5l5 7c1 2 4 3 6 1l4-3c7 3 15 4 22 2 5-2 9-6 10-10 2-5 2-11 0-16-1-3-3-5-5-6l2-5c1-3-1-6-4-7l-7-2c-3-1-6 1-7 4l-1 3"
                        fill="none"
                        stroke="white"
                        strokeWidth="4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        opacity="0.75"
                      />
                      <path
                        d="M55 54c3 3 7 5 11 5"
                        stroke="white"
                        strokeWidth="4"
                        strokeLinecap="round"
                        opacity="0.75"
                      />
                      <path
                        d="M70 47c2 1 4 1 6 0"
                        stroke="white"
                        strokeWidth="3"
                        strokeLinecap="round"
                        opacity="0.65"
                      />
                      <path
                        d="M63 63c2 1 5 1 7-1"
                        stroke="white"
                        strokeWidth="3"
                        strokeLinecap="round"
                        opacity="0.65"
                      />
                    </svg>
                  </div>
                </div>
                <p className="text-2xl font-semibold tracking-[0.14em] drop-shadow">
                  <span className="font-mono text-lg tracking-[0.1em]">
                    {formatCardNumber(cardNumberInput) || "•••• •••• •••• ••••"}
                  </span>
                </p>
              </div>

              <div className="relative mt-6 grid grid-cols-[2fr_1fr] items-center gap-4 text-sm">
                <div>
                  <p className="text-[11px] uppercase opacity-70">Cardholder</p>
                  <p className="font-semibold leading-tight">{cardNameInput || "Your Name"}</p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] uppercase opacity-70">Expiry</p>
                  <p className="font-semibold">{expiryInput || "MM/YY"}</p>
                </div>
              </div>
              <div className="relative mt-4 flex items-center justify-between text-[11px] uppercase opacity-70">
                <span>Member Since 21</span>
                <span>CVC {cvcInput || "•••"}</span>
              </div>
              <div className="pointer-events-none absolute inset-0 rounded-2xl border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]" aria-hidden />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <input
                className="input sm:col-span-2"
                name="cardNumber"
                placeholder="Card number"
                inputMode="numeric"
                required
                aria-invalid={!!formErrors.cardNumber}
                value={cardNumberInput}
                onChange={(e) => setCardNumberInput(formatCardNumber(e.target.value))}
              />
              <input
              className="input"
              name="cvc"
              placeholder="CVC"
              inputMode="numeric"
              required
              aria-invalid={!!formErrors.cvc}
              value={cvcInput}
              onChange={(e) => {
                const limit = detectCardBrand(cardNumberInput) === "AmEx" ? 4 : 3;
                setCvcInput(e.target.value.replace(/\D/g, "").slice(0, limit));
              }}
            />
              <input
                className="input"
              name="expiry"
              placeholder="MM/YY"
              inputMode="numeric"
              required
              aria-invalid={!!formErrors.expiry}
              value={expiryInput}
              onChange={(e) => setExpiryInput(formatExpiry(e.target.value))}
            />
              <input
                className="input sm:col-span-3"
                name="nameOnCard"
                placeholder="Name on card"
                required
                value={cardNameInput}
                onChange={(e) => setCardNameInput(e.target.value)}
              />
            </div>

            {Object.keys(formErrors).length > 0 && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                <ul className="space-y-1">
                  {Object.entries(formErrors).map(([key, value]) => (
                    <li key={key}>• {value}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <button
            type="submit"
            className="btn btn-primary w-full"
            disabled={!hasItems || loading}
          >
            {loading ? "Processing payment..." : "Pay and place order"}
          </button>

          {orderId && (
            <div className="space-y-4 rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-900">
              <div className="space-y-1">
                <p className="text-lg font-semibold text-neutral-900">Your order is confirmed</p>
                <p>
                  Payment verified. Your order number is <strong>#{orderId}</strong>. Track the journey below.
                </p>
              </div>

              <div className="space-y-3 rounded-lg border border-emerald-100 bg-white/70 p-4 text-neutral-900">
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Order tracking</p>
                <ol className="space-y-3">
                  {trackingSteps.map((step, index) => {
                    const isCurrent = index === 1; // "Preparing" is the immediate state after checkout
                    const isDone = index === 0;
                    return (
                      <li key={step} className="flex items-start gap-3">
                        <span
                          className={`mt-0.5 flex h-6 w-6 items-center justify-center rounded-full border text-xs font-bold ${
                            isDone
                              ? "border-emerald-500 bg-emerald-500 text-white"
                              : isCurrent
                                ? "border-emerald-400 bg-emerald-50 text-emerald-700"
                                : "border-neutral-200 bg-white text-neutral-400"
                          }`}
                          aria-hidden
                        >
                          {isDone ? "✓" : index + 1}
                        </span>
                        <div className="space-y-0.5">
                          <p className="text-sm font-semibold text-neutral-900">{step}</p>
                          {isCurrent && (
                            <p className="text-xs text-neutral-600">We are getting your items ready for packaging.</p>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </div>

              <div className="flex flex-wrap gap-3 pt-1">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => router.push(`/account/orders/${orderId}/invoice`)}
                >
                  View invoice
                </button>
                <Link href="/account/orders" className="btn btn-ghost">
                  Track my orders
                </Link>
              </div>
            </div>
          )}
        </form>

        <aside className="space-y-5 rounded-xl border border-[var(--line)] bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Order summary</h2>

          <div className="space-y-3 text-sm text-neutral-700">
            {items.map((item) => (
              <div key={item.id} className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <p className="font-medium text-neutral-900">
                    {item.name}
                  </p>
                  <p className="text-xs text-neutral-500">
                    {formatter.format(item.price)} × {item.quantity}
                  </p>
                  {(item.color || item.size) && (
                    <p className="text-xs text-neutral-500">
                      {item.color ? `Color: ${item.color}` : ""} {item.size ? `Size: ${item.size}` : ""}
                    </p>
                  )}
                </div>
                <span className="text-sm font-semibold text-neutral-900">
                  {formatter.format(item.price * item.quantity)}
                </span>
              </div>
            ))}
          </div>

          <div className="border-t border-[var(--line)] pt-4 space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span>Subtotal</span>
              <span className="font-medium text-neutral-900">
                {formatter.format(subtotal)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Shipping</span>
              <span className="text-neutral-500">Calculated at delivery</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Taxes</span>
              <span className="text-neutral-500">Included</span>
            </div>
          </div>

          <div className="border-t border-[var(--line)] pt-4">
            <div className="flex items-center justify-between text-base font-semibold">
              <span>Total</span>
              <span>{formatter.format(total)}</span>
            </div>
          </div>

          <div className="text-center text-xs text-neutral-500">
            Secure checkout — your information is encrypted.
          </div>
        </aside>
      </div>

      {toastMessage && (
        <Toast
          message={toastMessage}
          type={toastType}
          onDismiss={() => setToastMessage(null)}
        />
      )}
    </main>
  );
}
