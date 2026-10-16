"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowRight,
  Check,
  Clock3,
  LogOut,
  PackageCheck,
} from "lucide-react";
import AppFooter from "@/components/AppFooter";
import AppHeader from "@/components/AppHeader";

function formatPurchaseAmount(purchase) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: purchase.currency,
    }).format(Number(purchase.amount));
  } catch {
    return `${purchase.amount} ${purchase.currency}`;
  }
}

function CustomerAccountContent() {
  const searchParams = useSearchParams();
  const [customer, setCustomer] = useState(null);
  const [purchases, setPurchases] = useState([]);
  const [mode, setMode] = useState(() =>
    searchParams.get("mode") === "login" ? "login" : "register",
  );
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadPurchases = async () => {
    const response = await fetch("/api/customer/purchases", {
      cache: "no-store",
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Could not load purchases.");
    setPurchases(data.purchases || []);
  };

  useEffect(() => {
    let active = true;
    async function loadAccount() {
      try {
        const response = await fetch("/api/customer/session", {
          cache: "no-store",
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "Account service is unavailable.");
        }
        if (!active) return;
        if (data.authenticated) {
          setCustomer(data.customer);
          const purchaseResponse = await fetch("/api/customer/purchases", {
            cache: "no-store",
          });
          const purchaseData = await purchaseResponse.json();
          if (!purchaseResponse.ok) {
            throw new Error(purchaseData.error || "Could not load purchases.");
          }
          if (active) setPurchases(purchaseData.purchases || []);
        }
      } catch (loadError) {
        if (active) setError(loadError.message);
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadAccount();
    return () => {
      active = false;
    };
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/customer/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, fullName, email, password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Account request failed.");
      setCustomer(data.customer);
      setPassword("");
      await loadPurchases();
      setMessage(
        mode === "register"
          ? "Your account is ready. Purchases made while signed in will appear here."
          : "You are signed in. Purchases made while signed in appear here.",
      );
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = async () => {
    setError("");
    try {
      const response = await fetch("/api/customer/session", {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Could not sign out. Please try again.");
      setCustomer(null);
      setPurchases([]);
      setMode("login");
      setMessage("You have been signed out.");
    } catch (logoutError) {
      setError(logoutError.message);
    }
  };

  const isRegistering = mode === "register";

  return (
    <div className="min-h-screen bg-[#c3d0d1] px-2 py-2 text-[#111416] antialiased sm:px-4 sm:py-4">
      <AppHeader />
      <main className="mx-auto flex min-h-[calc(100vh-250px)] w-full max-w-[1320px] flex-1 items-center rounded-b-[24px] bg-[#eef3f3] px-2 py-2">
        <div className="mx-auto grid w-full max-w-[1120px] gap-4 md:grid-cols-2">
          <section className="flex min-h-[480px] flex-col overflow-hidden rounded-[24px] bg-[#101315] p-7 text-white sm:p-8 lg:p-9">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-lime-300">
              Join SwiftCart
            </p>
            <h1 className="mt-4 max-w-[520px] text-[44px] font-black uppercase leading-[0.88] tracking-[-0.055em] text-white sm:text-[48px]">
              Shop by
              <br />
              just asking.
            </h1>
            <p className="mt-5 max-w-sm text-sm leading-6 text-[#c1cbcc]">
              Create a free account and let the agent do the comparing.
            </p>

            <ul className="mt-5 space-y-3 text-xs leading-5 text-[#e0e6e6]">
              {[
                "Ask the agent for anything in the catalog",
                "Approve every purchase before you pay",
                "Pay safely with PayPal checkout",
              ].map((benefit) => (
                <li key={benefit} className="flex items-start gap-2.5">
                  <Check
                    aria-hidden="true"
                    className="mt-0.5 h-3.5 w-3.5 shrink-0 text-lime-300"
                  />
                  <span>{benefit}</span>
                </li>
              ))}
            </ul>

            <div className="relative mt-auto flex min-h-[120px] items-end overflow-hidden rounded-[20px] bg-gradient-to-br from-[#2663ed] via-[#4497ef] to-[#77cff3] p-5 sm:min-h-[140px]">
              <div className="absolute -right-6 -top-16 h-44 w-44 rounded-full border-[24px] border-white/10" />
              <div className="absolute -bottom-24 right-20 h-40 w-40 rounded-full bg-[#b2eaff]/30 blur-2xl" />
              <div className="relative">
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/80">
                  Your agent, your call
                </p>
                <p className="mt-1 text-lg font-black uppercase leading-tight text-white">
                  Better picks.
                  <br />
                  You stay in control.
                </p>
              </div>
            </div>
          </section>

          <section className="flex min-h-[480px] flex-col rounded-[24px] bg-white p-6 sm:p-6 lg:p-8">
            {error && (
              <p
                className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
                role="alert"
              >
                {error}
              </p>
            )}
            {message && (
              <p
                className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
                role="status"
              >
                {message}
              </p>
            )}

            {loading ? (
              <div className="flex flex-1 items-center justify-center text-sm text-[#596669]">
                Checking your account…
              </div>
            ) : customer ? (
              <div className="flex flex-1 flex-col">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#657174]">
                      Your SwiftCart account
                    </p>
                    <h2 className="mt-2 text-2xl font-extrabold text-[#111416]">
                      Welcome{customer.fullName ? `, ${customer.fullName}` : ""}
                    </h2>
                    <p className="mt-1 break-all text-sm text-[#526064]">
                      {customer.email}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="inline-flex shrink-0 items-center gap-2 rounded-full border border-[#d6dfe0] px-3 py-2 text-[10px] font-bold uppercase text-[#273133] transition hover:bg-[#f3f6f6]"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    Sign out
                  </button>
                </div>

                <div className="mt-7 flex items-center gap-2 border-b border-[#e6ebec] pb-3">
                  <PackageCheck className="h-5 w-5 text-emerald-800" />
                  <h3 className="text-base font-extrabold text-[#111416]">
                    Purchase history
                  </h3>
                  <span className="ml-auto rounded-full bg-[#edf3f3] px-2.5 py-1 text-xs font-bold text-[#536164]">
                    {purchases.length}
                  </span>
                </div>

                {purchases.length === 0 ? (
                  <div className="flex flex-1 flex-col items-center justify-center py-10 text-center">
                    <PackageCheck className="h-9 w-9 text-[#819093]" />
                    <p className="mt-3 text-sm font-bold text-[#263133]">
                      No saved purchases yet
                    </p>
                    <p className="mt-1 max-w-sm text-xs leading-5 text-[#667477]">
                      Stay signed in when you approve checkout and completed
                      purchases will appear here.
                    </p>
                    <Link
                      href="/"
                      className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#073e32] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#0b5746]"
                    >
                      Browse the shop <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                ) : (
                  <ul className="divide-y divide-[#e7ecec]">
                    {purchases.map((purchase) => (
                      <li
                        key={purchase.captureId}
                        className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-[#182022]">
                            {purchase.itemName}
                          </p>
                          <p className="mt-1 text-xs text-[#687679]">
                            {purchase.sku} · Capture {purchase.captureId}
                          </p>
                          <p className="mt-1 inline-flex items-center gap-1 text-xs text-[#687679]">
                            <Clock3 className="h-3 w-3" />
                            {new Date(purchase.purchasedAt).toLocaleString()}
                          </p>
                        </div>
                        <p className="shrink-0 text-sm font-extrabold text-[#075b47]">
                          {formatPurchaseAmount(purchase)}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : (
              <>
                <h2 className="text-2xl font-extrabold text-[#111416] sm:text-[26px]">
                  {isRegistering ? "Create your account" : "Welcome back"}
                </h2>
                <p className="mt-1 text-sm text-[#687477]">
                  {isRegistering
                    ? "Set up your account to keep track of your purchases."
                    : "Sign in to see your SwiftCart purchase history."}
                </p>

                <div className="my-4 flex items-center gap-3">
                  <span className="h-px flex-1 bg-[#e6ebec]" />
                  <span className="text-[9px] font-semibold uppercase tracking-wide text-[#718084]">
                    {isRegistering ? "Create with email" : "Sign in with email"}
                  </span>
                  <span className="h-px flex-1 bg-[#e6ebec]" />
                </div>

                <form onSubmit={handleSubmit} className="flex flex-1 flex-col">
                  {isRegistering && (
                    <label className="mb-2 block space-y-1.5 text-[9px] font-bold uppercase tracking-wide text-[#475457]">
                      Full name
                      <input
                        type="text"
                        autoComplete="name"
                        required
                        minLength={2}
                        maxLength={120}
                        value={fullName}
                        onChange={(event) => setFullName(event.target.value)}
                        className="w-full rounded-[11px] border border-[#d7e0e1] bg-white px-3 py-2.5 text-[13px] font-normal normal-case tracking-normal text-[#151a1b] outline-none transition placeholder:text-[#98a3a5] focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
                      />
                    </label>
                  )}
                  <label className="mb-2 block space-y-1.5 text-[9px] font-bold uppercase tracking-wide text-[#475457]">
                    Email
                    <input
                      type="email"
                      autoComplete="email"
                      required
                      maxLength={254}
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      className="w-full rounded-[11px] border border-[#d7e0e1] bg-white px-3 py-2.5 text-[13px] font-normal normal-case tracking-normal text-[#151a1b] outline-none transition placeholder:text-[#98a3a5] focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
                    />
                  </label>
                  <label className="block space-y-1.5 text-[9px] font-bold uppercase tracking-wide text-[#475457]">
                    Password
                    <input
                      type="password"
                      autoComplete={
                        isRegistering ? "new-password" : "current-password"
                      }
                      required
                      minLength={isRegistering ? 12 : undefined}
                      maxLength={128}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      className="w-full rounded-[11px] border border-[#d7e0e1] bg-white px-3 py-2.5 text-[13px] font-normal normal-case tracking-normal text-[#151a1b] outline-none transition placeholder:text-[#98a3a5] focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
                    />
                  </label>

                  <p className="mt-2 text-[10px] leading-4 text-[#687477]">
                    {isRegistering
                      ? "Use at least 12 characters. Email verification and password recovery are not enabled in this demo."
                      : "Your account uses a secure, HttpOnly sign-in session."}
                  </p>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-full bg-[#073e32] px-4 py-3 text-xs font-bold text-white transition hover:bg-[#0b5746] disabled:cursor-wait disabled:opacity-60"
                  >
                    {submitting
                      ? "Please wait…"
                      : isRegistering
                        ? "Create account"
                        : "Log in"}
                  </button>
                </form>

                <p className="mt-4 text-center text-[11px] text-[#586669]">
                  {isRegistering ? "Already have an account?" : "New to SwiftCart?"}{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setMode(isRegistering ? "login" : "register");
                      setError("");
                      setMessage("");
                    }}
                    className="font-bold text-[#111416] underline underline-offset-2"
                  >
                    {isRegistering ? "Log in" : "Create an account"}
                  </button>
                </p>
              </>
            )}
          </section>
        </div>
      </main>
      <AppFooter />
    </div>
  );
}

export default function CustomerAccountPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#eef3f3] text-sm text-[#596669]">
          Loading account…
        </main>
      }
    >
      <CustomerAccountContent />
    </Suspense>
  );
}
