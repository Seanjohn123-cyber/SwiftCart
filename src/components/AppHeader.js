"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, Menu, X } from "lucide-react";
import { useState } from "react";
import BrandMark from "./BrandMark";

const NAV = [
  { href: "/", label: "Shop" },
  { href: "/signup-store", label: "Sell" },
  { href: "/merchant", label: "Inventory" },
  { href: "/webhooks", label: "Webhooks" },
  { href: "/connections", label: "Status" },
  { href: "/copilot", label: "Agent" },
];

export default function AppHeader() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (pathname === "/account" || pathname === "/signup-store") {
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
        <nav
          id="mobile-navigation"
          aria-label="Mobile navigation"
          className="absolute left-0 right-0 top-full grid grid-cols-2 gap-2 rounded-b-[20px] bg-[#e2ebec] p-4 shadow-lg sm:hidden"
        >
          {NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`rounded-full px-4 py-3 text-center text-[10px] font-bold uppercase transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#087650] ${
                  active
                    ? "bg-[#111416] text-white"
                    : "bg-white text-[#4a5659] hover:text-[#111719]"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
          <Link
            href="/account?mode=login"
            onClick={() => setMobileMenuOpen(false)}
            className="col-span-2 rounded-full px-4 py-3 text-center text-[10px] font-bold uppercase text-[#263133] transition hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#087650]"
          >
            Log in
          </Link>
        </nav>
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
                className={`shrink-0 rounded-full px-2.5 py-1.5 text-[9px] font-bold uppercase transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#087650] ${
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
            className="rounded-full px-1.5 py-2 text-[9px] font-bold uppercase text-[#263133] transition hover:text-[#075b47] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#087650]"
          >
            Log in
          </Link>
          <Link
            href="/account?mode=register"
            className="rounded-full bg-[#073e32] px-3.5 py-2 text-[9px] font-bold uppercase text-white transition hover:bg-[#0b5746] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#087650]"
          >
            Sign up
          </Link>
        </div>
      </div>
    </header>
  );
}
