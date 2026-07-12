import { NavLink } from "react-router-dom";
import { Logo, Icon, getButtonClasses } from "../common";
import { SIDE_NAV_ITEMS } from "../../constants/navigation";
import { ROUTES } from "../../constants/routes";
import { useUserSettingsModal } from "../../hooks/useUserSettingsModal";

interface SideNavProps {
  variant?: "docked" | "drawer";
  onNavigate?: () => void;
}

export function SideNav({ variant = "docked", onNavigate }: SideNavProps) {
  const { openUserSettings } = useUserSettingsModal();
  const containerClass =
    variant === "docked"
      ? "hidden md:flex flex-col py-lg px-md gap-sm bg-surface-container border-r border-outline-variant h-full w-64 flex-shrink-0 z-40"
      : "flex flex-col py-lg px-md gap-sm bg-surface-container h-full w-64 flex-shrink-0";

  return (
    <nav className={containerClass}>
      <div className="flex items-center gap-md px-sm mb-lg">
        <Logo variant="app" />
      </div>

      <div className="flex flex-col gap-xs flex-grow">
        {SIDE_NAV_ITEMS.map((item) =>
          item.path === ROUTES.settings ? (
            <button
              key={item.label}
              type="button"
              onClick={() => {
                openUserSettings();
                onNavigate?.();
              }}
              className="flex items-center gap-md px-md py-sm rounded-xl cursor-pointer transition-all active:scale-95 group text-on-surface-variant hover:text-on-surface hover:bg-surface-variant"
            >
              <Icon name={item.icon} />
              <span className="font-label-md text-label-md font-medium">{item.label}</span>
            </button>
          ) : (
            <NavLink
              key={item.label}
              to={item.path}
              onClick={onNavigate}
              className={({ isActive }) =>
                `flex items-center gap-md px-md py-sm rounded-xl cursor-pointer transition-all active:scale-95 group ${
                  isActive
                    ? "bg-secondary-container text-on-secondary-container"
                    : "text-on-surface-variant hover:text-on-surface hover:bg-surface-variant"
                }`
              }
            >
              <Icon name={item.icon} />
              <span className="font-label-md text-label-md font-medium">{item.label}</span>
            </NavLink>
          ),
        )}
      </div>

      <div className="mt-auto pt-lg">
        <NavLink to={ROUTES.createRoom} onClick={onNavigate} className={getButtonClasses("primary", "md", "w-full")}>
          <Icon name="add" size={20} />
          New Session
        </NavLink>
      </div>
    </nav>
  );
}
