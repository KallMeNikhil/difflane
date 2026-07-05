import { Icon } from "../common";
import { WORKSPACE_RAIL_BOTTOM_ITEMS, WORKSPACE_RAIL_ITEMS } from "../../constants/workspaceNav";

export function WorkspaceIconRail() {
  return (
    <nav className="hidden md:flex flex-col h-full w-16 flex-shrink-0 bg-surface-container-lowest border-r border-outline-variant py-md items-center justify-between z-40">
      <div className="flex flex-col gap-sm w-full px-xs">
        {WORKSPACE_RAIL_ITEMS.map((item, index) => (
          <button
            key={item.id}
            type="button"
            title={item.label}
            aria-label={item.label}
            className={`w-full aspect-square rounded flex items-center justify-center transition-all duration-150 ease-in-out relative group ${
              index === 0
                ? "text-primary bg-secondary-container/10"
                : "text-on-surface-variant hover:bg-surface-container-highest hover:text-on-surface"
            }`}
          >
            <Icon name={item.icon} size={24} filled={index === 0} />
            {index === 0 && <div className="absolute left-0 w-1 h-1/2 bg-primary rounded-r-full" />}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-sm w-full px-xs mt-auto pb-sm border-t border-outline-variant/50 pt-sm">
        {WORKSPACE_RAIL_BOTTOM_ITEMS.map((item) => (
          <button
            key={item.id}
            type="button"
            title={item.label}
            aria-label={item.label}
            className="w-full aspect-square rounded flex items-center justify-center text-on-surface-variant hover:bg-surface-container-highest hover:text-on-surface transition-all duration-150 ease-in-out group"
          >
            <Icon name={item.icon} size={24} />
          </button>
        ))}
      </div>
    </nav>
  );
}
