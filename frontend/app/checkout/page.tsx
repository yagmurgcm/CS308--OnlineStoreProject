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
      (_, a, b, c, d) => [a, b, c, d].filter(Boolean).join(" "),
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

type Step = "delivery" | "billing" | "payment";

const StepBadge = ({ label, active }: { label: string; active: boolean }) => (
  <span
    className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${
      active ? "border-black bg-black text-white" : "border-[var(--line)] bg-neutral-50 text-neutral-700"
    }`}
  >
    {label}
  </span>
);

export default function CheckoutPage() {
  const router = useRouter();
  const { items, subtotal, reload, isLoading } = useCart();
  const { user, logout } = useAuth();

  const [loading, setLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<"success" | "error" | "info">("info");
  const [orderId, setOrderId] = useState<number | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [step, setStep] = useState<Step>("delivery");

  const [delivery, setDelivery] = useState({
    fullName: "",
    email: user?.email ?? "",
    phone: "",
    address: "",
    city: "",
    postalCode: "",
    country: "",
  });

  const [billing, setBilling] = useState({
    address: "",
    city: "",
    postalCode: "",
    country: "",
    useDelivery: true,
  });

  const [payment, setPayment] = useState({
    cardNumber: "",
    nameOnCard: user?.name ?? "",
    expiry: "",
    cvc: "",
  });

  const hasItems = items.length > 0;
  const total = useMemo(() => subtotal, [subtotal]);

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

  const validateDelivery = () => {
    const nextErrors: Record<string, string> = {};
    if (!delivery.fullName.trim()) nextErrors.fullName = "Required";
    if (!delivery.email.trim()) nextErrors.email = "Required";
    if (!/^[0-9]{10,15}$/.test(delivery.phone.trim())) {
      nextErrors.phone = "Enter a valid phone number";
    }
    if (!delivery.address.trim()) nextErrors.address = "Required";
    if (!delivery.city.trim()) nextErrors.city = "Required";
    if (!delivery.postalCode.trim()) nextErrors.postalCode = "Required";
    if (!delivery.country.trim()) nextErrors.country = "Required";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const validateBilling = () => {
    if (billing.useDelivery) {
      setErrors({});
      return true;
    }
    const nextErrors: Record<string, string> = {};
    if (!billing.address.trim()) nextErrors.billingAddress = "Required";
    if (!billing.city.trim()) nextErrors.billingCity = "Required";
    if (!billing.postalCode.trim()) nextErrors.billingPostalCode = "Required";
    if (!billing.country.trim()) nextErrors.billingCountry = "Required";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const validatePayment = () => {
    const nextErrors: Record<string, string> = {};
    const brand = detectCardBrand(payment.cardNumber);
    const cleanCard = payment.cardNumber.replace(/\s+/g, "");
    if (
      !(
        (brand === "AmEx" && /^[0-9]{15}$/.test(cleanCard)) ||
        (brand !== "AmEx" && /^[0-9]{16}$/.test(cleanCard))
      )
    ) {
      nextErrors.cardNumber = "Enter a valid card number";
    }
    const limit = brand === "AmEx" ? 4 : 3;
    if (!new RegExp(`^[0-9]{${limit}}$`).test(payment.cvc)) {
      nextErrors.cvc = `Enter the ${limit}-digit CVC`;
    }
    if (!/^(0[1-9]|1[0-2])\/(\d{2})$/.test(payment.expiry)) {
      nextErrors.expiry = "Use MM/YY";
    }
    if (!payment.nameOnCard.trim()) nextErrors.nameOnCard = "Required";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const goNext = () => {
    if (step === "delivery" && validateDelivery()) setStep("billing");
    else if (step === "billing" && validateBilling()) setStep("payment");
  };

  const handlePay = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!hasItems || loading) return;
    if (!user?.id) {
      setToastMessage("Please sign in to checkout.");
      setToastType("error");
      router.push("/sign-in?redirect=/checkout");
      return;
    }
    if (!validatePayment()) return;

    setToastMessage(null);
    setToastType("info");
    const brand = detectCardBrand(payment.cardNumber);

    setLoading(true);
    try {
      await mergeGuestCartIfNeeded();
      await reload();
      const payload = {
        fullName: delivery.fullName.trim(),
        email: delivery.email.trim(),
        phone: delivery.phone.trim(),
        address: delivery.address.trim(),
        city: delivery.city.trim(),
        postalCode: delivery.postalCode.trim(),
        country: delivery.country.trim(),
        cardBrand: brand,
        cardLast4: payment.cardNumber.replace(/\s+/g, "").slice(-4),
      };
      const order = await checkoutOrder(payload);
      await reload();
      setOrderId(order?.id ?? null);
      setToastMessage("Your order is confirmed. We are preparing your shipment.");
      setToastType("success");
      if (order?.id) {
        router.push(`/checkout/confirmed/${order.id}`);
      }
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

  if (!user?.id) {
    return (
      <main className="container-base py-16 space-y-6">
        <h1 className="text-2xl font-semibold">Checkout</h1>
        <div className="rounded-xl border border-dashed border-[var(--line)] bg-white p-10 text-center">
          <p className="text-lg font-medium text-neutral-900">Sign in required</p>
          <p className="mt-2 text-sm text-neutral-500">
            Please sign in to place your order. Your cart is saved and ready.
          </p>
          <div className="mt-4 flex justify-center gap-3">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => router.push("/sign-in?redirect=/checkout")}
            >
              Go to sign in
            </button>
            <Link href="/cart" className="btn btn-ghost">
              Back to cart
            </Link>
          </div>
        </div>
      </main>
    );
  }

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
      <header className="space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight">Checkout</h1>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <StepBadge label="Delivery" active={step === "delivery"} />
          <StepBadge label="Billing" active={step === "billing"} />
          <StepBadge label="Payment" active={step === "payment"} />
        </div>
      </header>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <form
          onSubmit={handlePay}
          className="space-y-6 rounded-xl border border-[var(--line)] bg-white p-6 shadow-sm"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              className="flex items-center justify-center gap-2 rounded-lg border border-[var(--line)] bg-[#ffc439] px-4 py-3 text-sm font-semibold text-[#1d1d1d] shadow-sm"
            >
              <span role="img" aria-label="paypal">💳</span> PayPal ile Satın Alın
            </button>
            <button
              type="button"
              className="flex items-center justify-center gap-2 rounded-lg border border-[var(--line)] bg-black px-4 py-3 text-sm font-semibold text-white shadow-sm"
            >
               Pay
            </button>
          </div>
          <div className="flex items-center gap-4 text-xs text-neutral-500">
            <span className="flex-1 border-t border-[var(--line)]" />
            <span>OR</span>
            <span className="flex-1 border-t border-[var(--line)]" />
          </div>

          {step === "delivery" && (
            <section className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold">Delivery details</h2>
                <p className="text-sm text-neutral-600">We&apos;ll send order updates to your email/phone.</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <input
                  className="input sm:col-span-2"
                  placeholder="Full name"
                  value={delivery.fullName}
                  onChange={(e) => setDelivery({ ...delivery, fullName: e.target.value })}
                />
                <input
                  className="input"
                  type="email"
                  placeholder="Email"
                  value={delivery.email}
                  onChange={(e) => setDelivery({ ...delivery, email: e.target.value })}
                />
                <input
                  className="input"
                  type="tel"
                  placeholder="Phone"
                  value={delivery.phone}
                  onChange={(e) => setDelivery({ ...delivery, phone: e.target.value })}
                />
                <input
                  className="input sm:col-span-2"
                  placeholder="Street address"
                  value={delivery.address}
                  onChange={(e) => setDelivery({ ...delivery, address: e.target.value })}
                />
                <input
                  className="input"
                  placeholder="City"
                  value={delivery.city}
                  onChange={(e) => setDelivery({ ...delivery, city: e.target.value })}
                />
                <input
                  className="input"
                  placeholder="Postal code"
                  value={delivery.postalCode}
                  onChange={(e) => setDelivery({ ...delivery, postalCode: e.target.value })}
                />
                <select
                  className="input"
                  value={delivery.country}
                  onChange={(e) => setDelivery({ ...delivery, country: e.target.value })}
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
              {Object.keys(errors).length > 0 && (
                <p className="text-sm text-red-600">Please fix highlighted fields before continuing.</p>
              )}
              <div className="flex justify-end">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={goNext}
                >
                  Continue to billing
                </button>
              </div>
            </section>
          )}

          {step === "billing" && (
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">Billing</h2>
                  <p className="text-sm text-neutral-600">Use delivery address or enter a billing address.</p>
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={billing.useDelivery}
                    onChange={(e) => setBilling({ ...billing, useDelivery: e.target.checked })}
                  />
                  Same as delivery
                </label>
              </div>

              {!billing.useDelivery && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <input
                    className="input sm:col-span-2"
                    placeholder="Billing address"
                    value={billing.address}
                    onChange={(e) => setBilling({ ...billing, address: e.target.value })}
                  />
                  <input
                    className="input"
                    placeholder="City"
                    value={billing.city}
                    onChange={(e) => setBilling({ ...billing, city: e.target.value })}
                  />
                  <input
                    className="input"
                    placeholder="Postal code"
                    value={billing.postalCode}
                    onChange={(e) => setBilling({ ...billing, postalCode: e.target.value })}
                  />
                  <select
                    className="input"
                    value={billing.country}
                    onChange={(e) => setBilling({ ...billing, country: e.target.value })}
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
              )}

              <div className="flex flex-wrap gap-3 justify-between">
                <button type="button" className="btn btn-ghost" onClick={() => setStep("delivery")}>
                  Back to delivery
                </button>
                <button type="button" className="btn btn-primary" onClick={goNext}>
                  Continue to payment
                </button>
              </div>
            </section>
          )}

          {step === "payment" && (
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">Payment</h2>
                  <p className="text-sm text-neutral-600">Enter your card details to complete your order.</p>
                </div>
                <button
                  type="button"
                  className="text-sm text-neutral-500 hover:underline"
                  onClick={() => setStep("billing")}
                >
                  Edit billing
                </button>
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
                </div>
                <div className="relative flex items-center justify-between text-xs uppercase tracking-[0.2em] opacity-90">
                  <span className="font-semibold">{detectCardBrand(payment.cardNumber)}</span>
                  <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-200">
                    Secure
                  </span>
                </div>

                <div className="relative mt-5 flex items-center gap-3">
                  <div className="relative h-14 w-14 shrink-0 rounded-full border border-white/20 bg-gradient-to-br from-[#222] via-[#111] to-[#000] p-[6px] shadow-lg">
                    <div className="relative h-full w-full rounded-full bg-gradient-to-br from-[#1f2430] via-[#0c1018] to-[#020305] flex items-center justify-center">
                      <span className="text-lg font-semibold">M</span>
                    </div>
                  </div>
                  <p className="text-2xl font-semibold tracking-[0.14em] drop-shadow">
                    <span className="font-mono text-lg tracking-[0.1em]">
                      {formatCardNumber(payment.cardNumber) || "•••• •••• •••• ••••"}
                    </span>
                  </p>
                </div>

                <div className="relative mt-6 grid grid-cols-[2fr_1fr] items-center gap-4 text-sm">
                  <div>
                    <p className="text-[11px] uppercase opacity-70">Cardholder</p>
                    <p className="font-semibold leading-tight">{payment.nameOnCard || "Your Name"}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] uppercase opacity-70">Expiry</p>
                    <p className="font-semibold">{payment.expiry || "MM/YY"}</p>
                  </div>
                </div>
                <div className="relative mt-4 flex items-center justify-between text-[11px] uppercase opacity-70">
                  <span>Member Since 21</span>
                  <span>CVC {payment.cvc || "•••"}</span>
                </div>
                <div className="pointer-events-none absolute inset-0 rounded-2xl border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]" aria-hidden />
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <input
                  className="input sm:col-span-2"
                  placeholder="Card number"
                  inputMode="numeric"
                  value={payment.cardNumber}
                  onChange={(e) => setPayment({ ...payment, cardNumber: formatCardNumber(e.target.value) })}
                  aria-invalid={!!errors.cardNumber}
                />
                <input
                  className="input"
                  placeholder="CVC"
                  inputMode="numeric"
                  value={payment.cvc}
                  onChange={(e) => {
                    const brand = detectCardBrand(payment.cardNumber);
                    const limit = brand === "AmEx" ? 4 : 3;
                    setPayment({ ...payment, cvc: e.target.value.replace(/\D/g, "").slice(0, limit) });
                  }}
                  aria-invalid={!!errors.cvc}
                />
                <input
                  className="input"
                  placeholder="MM/YY"
                  inputMode="numeric"
                  value={payment.expiry}
                  onChange={(e) => setPayment({ ...payment, expiry: formatExpiry(e.target.value) })}
                  aria-invalid={!!errors.expiry}
                />
                <input
                  className="input sm:col-span-3"
                  placeholder="Name on card"
                  value={payment.nameOnCard}
                  onChange={(e) => setPayment({ ...payment, nameOnCard: e.target.value })}
                  aria-invalid={!!errors.nameOnCard}
                />
              </div>

              {Object.keys(errors).length > 0 && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  <ul className="space-y-1">
                    {Object.entries(errors).map(([key, value]) => (
                      <li key={key}>• {value}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex flex-wrap gap-3 justify-between">
                <button type="button" className="btn btn-ghost" onClick={() => setStep("billing")}>
                  Back to billing
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={!hasItems || loading}
                >
                  {loading ? "Processing..." : `Pay ${formatter.format(total)}`}
                </button>
              </div>

              {orderId && (
                <div className="space-y-4 rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-900">
                  <div className="space-y-1">
                    <p className="text-lg font-semibold text-neutral-900">Your order is confirmed</p>
                    <p>
                      Payment verified. Your order number is <strong>#{orderId}</strong>. We&apos;re preparing your shipment.
                    </p>
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
            </section>
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
