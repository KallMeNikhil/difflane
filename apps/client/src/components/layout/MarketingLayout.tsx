import { Outlet } from "react-router-dom";
import { MarketingHeader } from "./MarketingHeader";
import { MarketingFooter } from "./MarketingFooter";

export function MarketingLayout() {
  return (
    <div className="bg-surface text-on-surface font-body-md antialiased selection:bg-primary-container selection:text-on-primary-container overflow-x-hidden min-h-screen">
      <div className="fixed inset-0 pointer-events-none shadow-[inset_0_0_100px_rgba(0,0,0,0.5)] z-50" />
      <MarketingHeader />
      <main className="pt-[140px] relative z-10">
        <Outlet />
      </main>
      <MarketingFooter />
    </div>
  );
}
