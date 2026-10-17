import { Suspense } from "react";
import BrandMark from "./BrandMark";
import MobileBottomNav from "./MobileBottomNav";

export default function AppFooter() {
  return (
    <>
      <Suspense fallback={null}>
        <MobileBottomNav />
      </Suspense>
      <footer className="mx-auto mt-8 hidden w-full max-w-[1320px] shrink-0 border-t border-[#d5dfdf] bg-[#eef3f3] sm:block">
        <div className="mx-auto flex max-w-[1320px] flex-col gap-4 rounded-b-[24px] px-4 py-6 sm:px-7 md:flex-row md:items-center md:justify-between md:px-10">
          <BrandMark />
          <p className="max-w-md text-[11px] leading-relaxed text-[#59666a]">
            Demo catalog: sample prices, ratings, and reviews; shoe photography
            via Unsplash. Matches are reviewed before PayPal Sandbox checkout.
          </p>
          <div className="flex flex-wrap gap-x-5 gap-y-1 text-[11px] font-semibold text-[#4e5b5e]">
            <span>Sandbox mode</span>
            <span>PayPal checkout</span>
          </div>
        </div>
      </footer>
    </>
  );
}
