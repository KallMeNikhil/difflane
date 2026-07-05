import { Link } from "react-router-dom";
import { Logo, getButtonClasses } from "../common";
import { MARKETING_NAV_ITEMS } from "../../constants/navigation";
import { ROUTES } from "../../constants/routes";

export function MarketingHeader() {
  return (
    <div className="fixed top-0 left-0 right-0 z-40 px-lg pt-lg pointer-events-none">
      <header className="max-w-7xl mx-auto w-full bg-surface/40 backdrop-blur-xl border border-outline-variant/30 rounded-xl flex justify-between items-center px-xl h-[72px] transition-all duration-300 shadow-[0_4px_30px_rgba(0,0,0,0.1),0_0_15px_rgba(37,99,235,0.05)] pointer-events-auto">
        <div className="flex-1 flex items-center pl-sm">
          <Link to={ROUTES.landing} className="drop-shadow-[0_0_8px_rgba(37,99,235,0.3)]">
            <Logo variant="marketing" />
          </Link>
        </div>

        <nav className="hidden md:flex gap-xl justify-center flex-1 whitespace-nowrap">
          {MARKETING_NAV_ITEMS.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="font-label-md text-label-md font-medium text-on-surface-variant hover:text-primary transition-colors duration-300 ease-out"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center justify-end gap-md flex-1">
          <Link to={ROUTES.joinRoom} className={getButtonClasses("secondary", "md")}>
            Join Room
          </Link>
          <Link to={ROUTES.createRoom} className={getButtonClasses("primary", "md")}>
            Create Room
          </Link>
        </div>
      </header>
    </div>
  );
}
