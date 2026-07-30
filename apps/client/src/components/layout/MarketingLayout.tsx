import { Outlet } from "react-router-dom";
import { MarketingHeader } from "./MarketingHeader";
import { MarketingFooter } from "./MarketingFooter";
import Dither from "../../lib/dither/Dither";

export function MarketingLayout() {
  return (
    <div className="bg-[#0B0D12] text-[#E2E8F0] font-body-md antialiased selection:bg-primary-container selection:text-on-primary-container overflow-x-hidden min-h-screen bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.03)_0%,transparent_80%)]">
      <div className="fixed inset-0 z-0">
        <Dither
          waveColor={[0.30980392156862746, 0.43137254901960786, 0.9686274509803922]}
          disableAnimation={false}
          enableMouseInteraction={true}
          mouseRadius={0.3}
          colorNum={8}
          waveAmplitude={0.3}
          waveFrequency={2}
          waveSpeed={0.05}
        />
      </div>
      <div className="fixed inset-0 pointer-events-none shadow-[inset_0_0_150px_rgba(0,0,0,0.8)] z-50" />
      <MarketingHeader />
      <main className="pt-[140px] relative z-10">
        <Outlet />
      </main>
      <MarketingFooter />
    </div>
  );
}
