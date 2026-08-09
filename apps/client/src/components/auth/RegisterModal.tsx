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
import {
  validateEmail,
  validatePassword,
  validateUsername,
} from "../../services/AuthService";
import { ROUTES } from "../../constants/routes";

const PRIMARY_BUTTON = getButtonClasses("primary", "md");
const SECONDARY_BUTTON = getButtonClasses("secondary", "md");

const BENEFITS = [
  "Save Workspaces",
  "Restore previous sessions",
  "Own and manage Workspaces",
  "Synchronize repositories",
  "Collaborate across devices",
];

export function RegisterModal({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const { registerAccount, beginOAuthFlow, authError, clearAuthError } =
    useCurrentUser();
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"idle" | "submitting">("idle");

  function validate(): boolean {
    const errors: Record<string, string> = {};
    const emailError = validateEmail(email);
    if (emailError) errors.email = emailError;
    const usernameError = validateUsername(username);
    if (usernameError) errors.username = usernameError;
    if (!displayName.trim()) errors.displayName = "Display name is required.";
    const passwordIssues = validatePassword(password);
    if (passwordIssues.length > 0)
      errors.password = `Password needs: ${passwordIssues.join(", ")}.`;
    if (password !== confirmPassword)
      errors.confirmPassword = "Passwords do not match.";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    clearAuthError();
    if (!validate()) return;
    setStatus("submitting");
    try {
      await registerAccount(email, username, displayName, password);
      onClose();
      navigate(ROUTES.dashboard);
    } catch {
      setStatus("idle");
    }
  }

  async function handleOAuth(provider: "google" | "github") {
    clearAuthError();
    try {
      await beginOAuthFlow(provider);
    } catch {
      // no-op
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <ModalShell
        icon="person_add"
        title="Create Account"
        description="Own and manage workspaces across every device."
        onClose={onClose}
        maxWidthClassName="max-w-[480px]"
        footer={
          <div className="flex flex-col gap-sm items-center">
            <button
              type="submit"
              className={`${PRIMARY_BUTTON} w-full`}
              disabled={status === "submitting"}
            >
              {status === "submitting" ? "Creating account…" : "Create Account"}
            </button>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Already have an account?{" "}
              <button
                type="button"
                className="text-primary hover:underline"
                onClick={() => navigate(ROUTES.signIn)}
              >
                Sign In
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
              or create an account with email
            </span>
            <hr className="flex-1 border-outline-variant" />
          </div>

          <TextField
            label="Display Name"
            required
            placeholder="Jane Doe"
            value={displayName}
            error={fieldErrors.displayName}
            onChange={(event) => setDisplayName(event.target.value)}
          />
          <TextField
            label="Username"
            required
            placeholder="janedoe123"
            value={username}
            error={fieldErrors.username}
            onChange={(event) => setUsername(event.target.value)}
          />
          <TextField
            label="Email Address"
            type="email"
            required
            placeholder="jane@example.com"
            value={email}
            error={fieldErrors.email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <div className="relative">
            <TextField
              label="Password"
              type={showPassword ? "text" : "password"}
              required
              placeholder="••••••••"
              value={password}
              error={fieldErrors.password}
              onChange={(event) => setPassword(event.target.value)}
              className="pr-10"
            />
            <IconButton
              icon={showPassword ? "visibility" : "visibility_off"}
              aria-label={showPassword ? "Hide password" : "Show password"}
              shape="square"
              className="absolute right-1 top-[34px]"
              onClick={() => setShowPassword((prev) => !prev)}
            />
          </div>
          <TextField
            label="Confirm Password"
            type={showPassword ? "text" : "password"}
            required
            placeholder="••••••••"
            value={confirmPassword}
            error={fieldErrors.confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
          />

          <div className="bg-surface-container-high border border-outline-variant rounded-lg p-md space-y-xs">
            <p className="font-label-md text-label-md text-on-surface">
              With a Difflane account you can:
            </p>
            <ul className="space-y-xs">
              {BENEFITS.map((benefit) => (
                <li
                  key={benefit}
                  className="flex items-center gap-sm font-body-sm text-body-sm text-on-surface-variant"
                >
                  <Icon
                    name="check_circle"
                    size={16}
                    className="text-success"
                    filled
                  />
                  {benefit}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </ModalShell>
    </form>
  );
}
