"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, ArrowRight, Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import BrandMark from "./BrandMark";

const NAV = [
  { href: "/", label: "Shop" },
  { href: "/copilot", label: "Agent" },
  { href: "/signup-store", label: "Sell" },
  { href: "/merchant", label: "Inventory" },
  { href: "/webhooks", label: "Webhooks" },
  { href: "/connections", label: "Status" },
];

const MOBILE_NAV_DESCRIPTIONS = {
  "/": "Browse and ask the agent",
  "/copilot": "Chat to find and buy",
  "/signup-store": "List a product",
  "/merchant": "Stock for every listing",
  "/webhooks": "PayPal event log",
  "/connections": "Service health",
};

const MOBILE_NAV_LABELS = {
  "/copilot": "Agent Copilot",
};

export default function AppHeader() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!mobileMenuOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") setMobileMenuOpen(false);
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [mobileMenuOpen]);

  if (pathname === "/account") {
    return (
      <header className="relative z-40 mx-auto w-full max-w-[1320px] rounded-t-[24px] bg-[#e2ebec]">
        <div className="mx-auto grid max-w-[1320px] grid-cols-[1fr_auto_1fr] items-center gap-2 px-4 py-4 sm:px-7 md:px-10">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-[9px] font-bold uppercase text-[#273133] sm:text-[10px]"
          >
            <ArrowLeft className="h-3 w-3" /> Back to Shop
          </Link>
          <Link
            href="/"
            className="justify-self-center"
            aria-label="SwiftCart home"
          >
            <BrandMark />
          </Link>
        </div>
      </header>
    );
  }

  return (
    <header className="relative z-40 mx-auto w-full max-w-[1320px] rounded-t-[24px] bg-[#e2ebec]">
      <div className="mx-auto grid max-w-[1320px] grid-cols-[1fr_auto_1fr] items-center px-4 py-3 sm:hidden">
        <button
          type="button"
          onClick={() => setMobileMenuOpen((open) => !open)}
          aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={mobileMenuOpen}
          aria-controls="mobile-navigation"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#111719] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#087650]"
        >
          {mobileMenuOpen ? (
            <X aria-hidden="true" className="h-4 w-4" />
          ) : (
            <Menu aria-hidden="true" className="h-4 w-4" />
          )}
        </button>
        <Link
          href="/"
          className="justify-self-center"
          aria-label="SwiftCart home"
        >
          <BrandMark />
        </Link>
        <Link
          href="/account?mode=register"
          className="justify-self-end rounded-full bg-[#073e32] px-4 py-3 text-[10px] font-bold uppercase leading-none text-white transition hover:bg-[#0b5746] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#087650]"
        >
          Sign up
        </Link>
      </div>

      {mobileMenuOpen && (
        <div
          id="mobile-navigation"
          role="dialog"
          aria-modal="true"
          aria-label="Mobile navigation"
          className="fixed inset-0 z-[100] flex min-h-[100dvh] flex-col overflow-y-auto bg-[#f1f6f6] p-5 sm:hidden"
        >
          <div className="flex items-center justify-between">
            <Link
              href="/"
              onClick={() => setMobileMenuOpen(false)}
              aria-label="SwiftCart home"
              className="text-[19px] font-black uppercase tracking-[0.16em] text-[#111719]"
            >
              SwiftCart
            </Link>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              aria-label="Close navigation menu"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#111719] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#087650]"
            >
              <X aria-hidden="true" className="h-4 w-4" />
            </button>
          </div>

          <span className="mt-5 self-start rounded-full border border-emerald-700/50 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-800">
            Sandbox
          </span>

          <nav aria-label="Mobile navigation links" className="mt-4 grid gap-2.5">
            {NAV.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  aria-current={active ? "page" : undefined}
                  className={`flex min-h-[69px] items-center justify-between gap-3 rounded-[18px] px-4 py-3 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#087650] ${
                    active
                      ? "bg-[#073e32] text-white"
                      : "bg-white text-[#171d1e] hover:bg-[#e9f0f0]"
                  }`}
                >
                  <span>
                    <span className="block text-[18px] font-bold leading-tight">
                      {MOBILE_NAV_LABELS[item.href] || item.label}
                    </span>
                    <span
                      className={`mt-0.5 block text-[11px] leading-tight ${
                        active ? "text-white/75" : "text-[#58666a]"
                      }`}
                    >
                      {MOBILE_NAV_DESCRIPTIONS[item.href]}
                    </span>
                  </span>
                  <ArrowRight aria-hidden="true" className="h-4 w-4 shrink-0" />
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto grid gap-2 pt-8">
            <Link
              href="/account?mode=register"
              onClick={() => setMobileMenuOpen(false)}
              className="flex min-h-[54px] items-center justify-center rounded-full bg-[#073e32] px-5 text-[12px] font-bold uppercase text-white transition hover:bg-[#0b5746] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#087650]"
            >
              Sign up
            </Link>
            <Link
              href="/account?mode=login"
              onClick={() => setMobileMenuOpen(false)}
              className="flex min-h-[54px] items-center justify-center rounded-full border border-[#687477] px-5 text-[12px] font-bold uppercase text-[#202627] transition hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#087650]"
            >
              Log in
            </Link>
          </div>
        </div>
      )}

      <div className="mx-auto hidden max-w-[1320px] flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:flex sm:flex-nowrap sm:px-7 md:px-10">
        <Link
          href="/"
          className="order-1 shrink-0 sm:order-2"
          aria-label="SwiftCart home"
        >
          <BrandMark />
        </Link>

        <nav className="order-3 flex min-w-0 basis-full items-center gap-1 overflow-x-auto scrollbar-none sm:order-1 sm:basis-auto">
          {NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#087650] md:text-xs ${
                  active
                    ? "bg-[#111416] text-white"
                    : "text-[#4a5659] hover:bg-white/70 hover:text-[#111719]"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="order-2 ml-auto flex items-center justify-end gap-2 sm:order-3">
          <Link
            href="/account?mode=login"
            className="rounded-full px-3 py-1.5 text-[11px] font-bold uppercase text-[#263133] transition hover:text-[#075b47] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#087650] md:text-xs"
          >
            Log in
          </Link>
          <Link
            href="/account?mode=register"
            className="rounded-full bg-[#073e32] px-4 py-2 text-[11px] font-bold uppercase text-white transition hover:bg-[#0b5746] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#087650] md:text-xs"
          >
            Sign up
          </Link>
        </div>
      </div>
    </header>
  );
}
