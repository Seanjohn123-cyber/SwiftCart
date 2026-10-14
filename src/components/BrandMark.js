export default function BrandMark({ compact = false }) {
  return (
    <div className="flex min-w-0 items-center">
      {!compact && (
        <span className="text-[15px] font-black uppercase tracking-[0.08em] text-[#111719]">
          SwiftCart
        </span>
      )}
    </div>
  );
}
