import { Outlet } from "react-router-dom";
import { MarketingHeader } from "./MarketingHeader";
import { MarketingFooter } from "./MarketingFooter";

export function MarketingLayout() {
  return (
    <div className="bg-[#0B0D12] text-[#E2E8F0] font-body-md antialiased selection:bg-primary-container selection:text-on-primary-container overflow-x-hidden min-h-screen bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.03)_0%,transparent_80%)]">
      <div className="fixed inset-0 pointer-events-none shadow-[inset_0_0_150px_rgba(0,0,0,0.8)] z-50" />
      <MarketingHeader />
      <main className="pt-[140px] relative z-10">
        <Outlet />
      </main>
      <MarketingFooter />
    </div>
  );
}
