import BrandMark from "./BrandMark";

export default function AppFooter() {
  return (
    <footer className="mx-auto mt-8 w-full max-w-[1320px] shrink-0 border-t border-[#d5dfdf] bg-[#eef3f3]">
      <div className="mx-auto flex max-w-[1320px] flex-col gap-4 rounded-b-[24px] px-4 py-6 sm:px-7 md:flex-row md:items-center md:justify-between md:px-10">
        <BrandMark />
        <p className="max-w-md text-[11px] leading-relaxed text-[#59666a]">
          Catalog matches are reviewed by you before payment. Checkout runs
          through PayPal Sandbox Orders API v2.
        </p>
        <div className="flex flex-wrap gap-x-5 gap-y-1 text-[11px] font-semibold text-[#4e5b5e]">
          <span>Sandbox mode</span>
          <span>PayPal checkout</span>
        </div>
      </div>
    </footer>
  );
}
