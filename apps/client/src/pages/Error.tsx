import { Link } from "react-router-dom";
import { Icon, getButtonClasses } from "../components/common";
import { ROUTES } from "../constants/routes";

interface ErrorPageProps {
  title?: string;
  description?: string;
}

export default function ErrorPage({
  title = "Something went wrong",
  description = "An unexpected error occurred. Try going back to the dashboard, or refresh the page.",
}: ErrorPageProps) {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center gap-md bg-background text-on-surface px-lg text-center">
      <div className="w-16 h-16 rounded-xl bg-error-container/20 border border-error/40 flex items-center justify-center">
        <Icon name="error" size={28} className="text-error" />
      </div>
      <h1 className="font-headline-lg text-headline-lg text-on-surface">{title}</h1>
      <p className="font-body-md text-body-md text-on-surface-variant max-w-md">{description}</p>
      <Link to={ROUTES.dashboard} className={getButtonClasses("primary", "md")}>
        Back to Dashboard
      </Link>
    </div>
  );
}
