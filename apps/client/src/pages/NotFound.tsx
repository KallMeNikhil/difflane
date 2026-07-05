import { Link } from "react-router-dom";
import { Icon, getButtonClasses } from "../components/common";
import { ROUTES } from "../constants/routes";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center gap-md bg-background text-on-surface px-lg text-center">
      <div className="w-16 h-16 rounded-xl bg-surface-container-highest border border-outline-variant flex items-center justify-center">
        <Icon name="explore_off" size={28} className="text-primary/80" />
      </div>
      <h1 className="font-headline-lg text-headline-lg text-on-surface">Page not found</h1>
      <p className="font-body-md text-body-md text-on-surface-variant max-w-md">
        The page you're looking for doesn't exist or may have moved.
      </p>
      <Link to={ROUTES.dashboard} className={getButtonClasses("primary", "md")}>
        Back to Dashboard
      </Link>
    </div>
  );
}
