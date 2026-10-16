"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import BrandMark from "./BrandMark";

const NAV = [
  { href: "/", label: "Shop" },
  { href: "/account", label: "Account" },
  { href: "/signup-store", label: "Sell" },
  { href: "/merchant", label: "Inventory" },
  { href: "/webhooks", label: "Webhooks" },
  { href: "/connections", label: "Status" },
];

export default function AppHeader() {
  const pathname = usePathname();

  if (pathname === "/signup-store") {
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
          <span className="justify-self-end rounded-full border border-emerald-700/40 px-2.5 py-1 text-[9px] font-bold uppercase text-emerald-800 sm:text-[10px]">
            Sandbox
          </span>
        </div>
      </header>
    );
  }

  return (
    <header className="relative z-40 mx-auto w-full max-w-[1320px] rounded-t-[24px] bg-[#e2ebec]">
      <div className="mx-auto grid max-w-[1320px] grid-cols-[1fr_auto] items-center gap-x-3 gap-y-2 px-4 py-3 sm:grid-cols-[1fr_auto_1fr] sm:px-7 md:px-10">
        <Link
          href="/"
          className="order-1 shrink-0 sm:order-2 sm:justify-self-center"
          aria-label="SwiftCart home"
        >
          <BrandMark />
        </Link>

        <nav className="order-3 col-span-2 flex items-center gap-1 overflow-x-auto sm:order-1 sm:col-span-1">
          {NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`shrink-0 rounded-full px-3 py-1.5 text-[10px] font-bold uppercase transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#087650] ${
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

        <div className="order-2 flex items-center justify-end gap-2 sm:order-3">
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-700/40 px-2.5 py-1 text-[9px] font-bold uppercase text-emerald-800 sm:text-[10px]">
            Sandbox
          </span>
          <Link
            href="/copilot"
            className={`rounded-full px-3.5 py-2 text-[10px] font-bold uppercase text-white transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#087650] ${pathname === "/copilot" ? "bg-[#075b47]" : "bg-[#111416] hover:bg-[#273133]"}`}
          >
            Agent Copilot
          </Link>
        </div>
      </div>
    </header>
  );
}
