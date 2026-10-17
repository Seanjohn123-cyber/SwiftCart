"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Bot, PackageCheck, ShoppingBag, UserRound } from "lucide-react";

const TABS = [
  { href: "/", label: "Shop", icon: ShoppingBag },
  { href: "/copilot", label: "Agent", icon: Bot },
  {
    href: "/account?mode=login#purchases",
    label: "Orders",
    icon: PackageCheck,
  },
  { href: "/account", label: "Account", icon: UserRound },
];

export default function MobileBottomNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isOrdersView =
    pathname === "/account" && searchParams.get("mode") === "login";

  return (
    <nav
      aria-label="Primary mobile navigation"
      className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-[#dce4e5] bg-white px-2 pt-2.5 sm:hidden"
      style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
    >
      {TABS.map(({ href, label, icon: Icon }) => {
        const active =
          label === "Shop"
            ? pathname === "/"
            : label === "Agent"
              ? pathname === "/copilot"
              : label === "Orders"
                ? isOrdersView
                : pathname === "/account" && !isOrdersView;

        return (
          <Link
            key={label}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`flex min-h-12 flex-col items-center justify-center gap-1 text-[10px] font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#087650] ${
              active ? "text-[#073e32]" : "text-[#536164]"
            }`}
          >
            <span
              className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                active ? "bg-[#073e32] text-white" : "bg-[#dce5f2] text-[#526174]"
              }`}
            >
              <Icon aria-hidden="true" className="h-4 w-4" />
            </span>
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
