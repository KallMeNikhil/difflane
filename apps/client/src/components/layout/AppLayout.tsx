import { useState } from "react";
import { Outlet } from "react-router-dom";
import { SideNav } from "./SideNav";
import { AppHeader } from "./AppHeader";

export function AppLayout() {
  const [isMobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="bg-background text-on-surface font-body-md h-screen w-full flex overflow-hidden">
      <SideNav />

      {isMobileNavOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="w-64 h-full shadow-2xl">
            <SideNav variant="drawer" onNavigate={() => setMobileNavOpen(false)} />
          </div>
          <button
            type="button"
            aria-label="Close navigation menu"
            className="flex-1 bg-black/50 backdrop-blur-sm"
            onClick={() => setMobileNavOpen(false)}
          />
        </div>
      )}

      <div className="flex-grow flex flex-col h-full overflow-hidden">
        <AppHeader onOpenMobileNav={() => setMobileNavOpen(true)} />
        <main className="flex-grow overflow-y-auto p-md md:p-lg lg:p-xl">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
