import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Icon, ModalShell, getButtonClasses } from "../components/common";
import { useCurrentUser } from "../hooks/useCurrentUser";
import { ROUTES } from "../constants/routes";

const PRIMARY_BUTTON = getButtonClasses("primary", "md");

export default function OAuthCallback() {
  const navigate = useNavigate();
  const params = useParams<{ provider: string }>();
  const [searchParams] = useSearchParams();
  const { completeOAuthLogin } = useCurrentUser();
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const provider = params.provider === "github" ? "github" : "google";
    const code = searchParams.get("code");
    const state = searchParams.get("state");

    if (!code || !state) {
      setError("Missing authorization details from the provider.");
      return;
    }

    completeOAuthLogin(provider, code, state)
      .then(() => navigate(ROUTES.dashboard, { replace: true }))
      .catch((completionError: unknown) => {
        setError(completionError instanceof Error ? completionError.message : "Unable to complete sign-in.");
      });
  }, [params.provider, searchParams, completeOAuthLogin, navigate]);

  return (
    <ModalShell
      icon={error ? "error" : "sync"}
      title={error ? "Sign-In Failed" : "Signing You In"}
      description={error ?? "Completing authentication with your provider…"}
      onClose={() => navigate(ROUTES.signIn)}
      maxWidthClassName="max-w-[420px]"
      footer={
        error ? (
          <button type="button" className={`${PRIMARY_BUTTON} w-full`} onClick={() => navigate(ROUTES.signIn)}>
            Back to Sign In
          </button>
        ) : (
          <div />
        )
      }
    >
      <div className="p-lg flex items-center justify-center">
        <Icon name={error ? "gpp_bad" : "sync"} size={32} className={error ? "text-error" : "text-primary animate-spin"} />
      </div>
    </ModalShell>
  );
}
