import { Link } from "react-router-dom";
import { Logo, Avatar } from "../common";
import { MARKETING_NAV_ITEMS } from "../../constants/navigation";
import { ROUTES } from "../../constants/routes";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { useAuthModal } from "../../hooks/useAuthModal";

export function MarketingHeader() {
  const { isAuthenticated, initials } = useCurrentUser();
  const { openSignIn, openSignUp } = useAuthModal();

  return (
    <div className="fixed top-0 left-0 right-0 z-40 px-lg pt-lg pointer-events-none">
      <header className="max-w-7xl mx-auto w-full bg-[#0E1117]/70 backdrop-blur-xl border border-white/5 rounded-xl flex justify-between items-center px-2xl h-[72px] transition-all duration-300 shadow-lg shadow-black/50 pointer-events-auto">
        <div className="flex-1 flex items-center pl-sm">
          <Link to={ROUTES.landing}>
            <Logo variant="marketing" />
          </Link>
        </div>

        <nav className="hidden md:flex gap-xl justify-center flex-1 whitespace-nowrap">
          {MARKETING_NAV_ITEMS.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="font-label-md text-label-md font-medium text-gray-400 hover:text-white transition-colors duration-300 ease-out"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center justify-end gap-md flex-1">
          {isAuthenticated ? (
            <Link
              to={ROUTES.dashboard}
              className="flex items-center gap-sm font-label-md text-label-md px-md py-sm rounded-lg border border-white/10 text-gray-300 hover:bg-white/5 hover:text-white transition-all duration-300 ease-out"
            >
              <Avatar initials={initials} tone="primary" size="sm" />
              Dashboard
            </Link>
          ) : (
            <>
              <button
                type="button"
                onClick={openSignUp}
                className="font-label-md text-label-md px-md py-sm rounded-lg border border-white/10 text-gray-300 hover:bg-white/5 hover:text-white transition-all duration-300 ease-out"
              >
                Sign Up
              </button>
              <button
                type="button"
                onClick={openSignIn}
                className="font-label-md text-label-md px-md py-sm rounded-lg bg-primary-container text-white hover:brightness-110 shadow-md shadow-primary-container/20 hover:-translate-y-0.5 transition-all duration-300 ease-out"
              >
                Sign In
              </button>
            </>
          )}
        </div>
      </header>
    </div>
  );
}
