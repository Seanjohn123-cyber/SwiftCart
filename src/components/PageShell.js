import AppHeader from "./AppHeader";
import AppFooter from "./AppFooter";

export default function PageShell({ children, extra }) {
  return (
    <div className="app-page-shell min-h-screen bg-[#c3d0d1] px-2 py-2 text-[#111416] antialiased sm:px-4 sm:py-4">
      <AppHeader extra={extra} />
      <main className="app-page-main mx-auto w-full max-w-[1320px] flex-1 rounded-b-[24px] bg-[#eef3f3] px-4 pb-28 pt-6 sm:px-7 sm:py-8 md:px-10 md:py-10">
        <div id="app-page-content">{children}</div>
      </main>
      <AppFooter />
    </div>
  );
}
