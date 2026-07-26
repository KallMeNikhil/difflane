import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  Icon,
  IconButton,
  ModalShell,
  TextField,
  getButtonClasses,
} from "../common";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { ROUTES } from "../../constants/routes";

const PRIMARY_BUTTON = getButtonClasses("primary", "md");
const SECONDARY_BUTTON = getButtonClasses("secondary", "md");

export function SignInModal({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const { login, beginOAuthFlow, authError, clearAuthError } = useCurrentUser();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<"idle" | "submitting">("idle");

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    clearAuthError();
    setStatus("submitting");
    try {
      await login(email, password);
      onClose();
      navigate(ROUTES.dashboard);
    } catch {
      setStatus("idle");
    }
  }

  function handleContinueAsGuest() {
    onClose();
    navigate(ROUTES.dashboard);
  }

  async function handleOAuth(provider: "google" | "github") {
    clearAuthError();
    try {
      await beginOAuthFlow(provider);
    } catch {
      // authError is surfaced via context state
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <form onSubmit={handleSubmit} noValidate>
        <ModalShell
          icon="login"
          title="Sign In"
          description="Welcome back. Sign in to continue to your workspaces."
          onClose={onClose}
          maxWidthClassName="max-w-[440px]"
          footer={
            <div className="flex flex-col gap-sm items-center">
              <button
                type="submit"
                className={`${PRIMARY_BUTTON} w-full`}
                disabled={status === "submitting"}
              >
                {status === "submitting" ? "Signing in…" : "Sign In"}
              </button>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Don&apos;t have an account?{" "}
                <button
                  type="button"
                  className="text-primary hover:underline"
                  onClick={() => navigate(ROUTES.createAccount)}
                >
                  Create Account
                </button>
              </p>
            </div>
          }
        >
          <div className="p-lg space-y-md">
            {authError && (
              <div className="flex items-start gap-sm bg-error/10 border border-error/30 rounded-lg px-md py-sm">
                <Icon name="error" size={18} className="text-error mt-[2px]" />
                <p className="font-body-sm text-body-sm text-error">
                  {authError}
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 gap-sm">
              <button
                type="button"
                className={`${SECONDARY_BUTTON} w-full justify-center`}
                onClick={() => handleOAuth("google")}
              >
                <Icon name="account_circle" size={18} />
                Continue with Google
              </button>
              <button
                type="button"
                className={`${SECONDARY_BUTTON} w-full justify-center`}
                onClick={() => handleOAuth("github")}
              >
                <Icon name="code" size={18} />
                Continue with GitHub
              </button>
            </div>

            <div className="flex items-center gap-sm">
              <hr className="flex-1 border-outline-variant" />
              <span className="font-body-sm text-body-sm text-on-surface-variant">
                or continue with email
              </span>
              <hr className="flex-1 border-outline-variant" />
            </div>

            <TextField
              label="Email Address"
              type="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />

            <div className="space-y-sm">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="sign-in-password"
                  className="font-label-md text-label-md text-on-surface-variant"
                >
                  Password<span className="text-error"> *</span>
                </label>
                <button
                  type="button"
                  className="font-body-sm text-body-sm text-primary hover:underline"
                  onClick={() => {
                    onClose();
                    navigate(ROUTES.forgotPassword);
                  }}
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <TextField
                  id="sign-in-password"
                  label="Password"
                  hideLabel
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="pr-10"
                />
                <IconButton
                  icon={showPassword ? "visibility" : "visibility_off"}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  shape="square"
                  className="absolute right-1 top-1/2 -translate-y-1/2"
                  onClick={() => setShowPassword((prev) => !prev)}
                />
              </div>
            </div>

            <button
              type="button"
              className="w-full text-center font-body-sm text-body-sm text-on-surface-variant hover:text-on-surface"
              onClick={handleContinueAsGuest}
            >
              Continue as Guest
            </button>
          </div>
        </ModalShell>
      </form>
    </div>
  );
}
