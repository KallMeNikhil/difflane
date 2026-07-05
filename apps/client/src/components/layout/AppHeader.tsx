import { Icon, IconButton } from "../common";

interface AppHeaderProps {
  onOpenMobileNav: () => void;
}

export function AppHeader({ onOpenMobileNav }: AppHeaderProps) {
  return (
    <>
      <header className="flex justify-between items-center px-lg h-16 w-full z-50 bg-surface border-b border-outline-variant flex-shrink-0 md:hidden">
        <div className="flex items-center gap-sm">
          <div className="w-8 h-8 rounded-lg bg-primary-container flex items-center justify-center flex-shrink-0">
            <Icon name="view_in_ar" filled size={18} className="text-on-primary-container" />
          </div>
          <span className="font-headline-md text-headline-md font-bold text-on-surface">Difflane</span>
        </div>
        <IconButton icon="menu" aria-label="Open navigation menu" onClick={onOpenMobileNav} />
      </header>

      <header className="hidden md:flex justify-end items-center px-lg h-16 w-full z-30 bg-surface border-b border-outline-variant flex-shrink-0">
        <div className="flex items-center gap-md">
          <div className="relative w-64 mr-md">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">
              <Icon name="search" size={20} />
            </span>
            <input
              type="text"
              placeholder="Search rooms, repos..."
              className="w-full bg-surface-container-low border border-outline-variant text-on-surface font-body-sm rounded-full pl-10 pr-4 py-1.5 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-on-surface-variant"
            />
          </div>
          <IconButton icon="notifications" aria-label="Notifications" />
          <IconButton icon="settings" aria-label="Settings" />
          <button
            type="button"
            aria-label="Account"
            className="w-8 h-8 rounded-full bg-surface-variant border border-outline-variant ml-sm overflow-hidden cursor-pointer hover:border-primary transition-colors flex items-center justify-center"
          >
            <Icon name="person" size={20} />
          </button>
        </div>
      </header>
    </>
  );
}
