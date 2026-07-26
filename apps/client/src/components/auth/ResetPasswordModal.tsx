import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Icon, ModalShell, TextField, getButtonClasses } from "../common";
import { resetPassword, validatePassword } from "../../services/AuthService";
import { AuthRequestError } from "../../lib/auth/authClient";
import { ROUTES } from "../../constants/routes";

const PRIMARY_BUTTON = getButtonClasses("primary", "md");

export function ResetPasswordModal({ token }: { token: string | null }) {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "invalid">(token ? "idle" : "invalid");

  const goToSignIn = () => navigate(ROUTES.signIn);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!token) {
      setStatus("invalid");
      return;
    }
    const issues = validatePassword(password);
    if (issues.length > 0) {
      setError(`Password needs: ${issues.join(", ")}.`);
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setError(null);
    setStatus("submitting");
    try {
      await resetPassword(token, password);
      setStatus("success");
    } catch (submitError) {
      if (submitError instanceof AuthRequestError && submitError.code === "expired_token") {
        setStatus("invalid");
      } else {
        setStatus("idle");
        setError("Something went wrong. Please try again.");
      }
    }
  }

  if (status === "invalid") {
    return (
      <ModalShell
        icon="gpp_bad"
        title="Invalid Link"
        description="This password reset link is invalid or has already been used."
        onClose={goToSignIn}
        maxWidthClassName="max-w-[420px]"
        footer={
          <button type="button" className={`${PRIMARY_BUTTON} w-full`} onClick={goToSignIn}>
            Back to Sign In
          </button>
        }
      >
        <div className="p-lg" />
      </ModalShell>
    );
  }

  if (status === "success") {
    return (
      <ModalShell
        icon="check_circle"
        title="Password Updated"
        description="Your password has been changed successfully."
        onClose={goToSignIn}
        maxWidthClassName="max-w-[420px]"
        footer={
          <button type="button" className={`${PRIMARY_BUTTON} w-full`} onClick={goToSignIn}>
            Continue to Sign In
          </button>
        }
      >
        <div className="p-lg flex flex-col items-center text-center gap-md">
          <div className="w-14 h-14 rounded-xl bg-success/10 border border-success/30 flex items-center justify-center">
            <Icon name="check_circle" size={28} className="text-success" filled />
          </div>
        </div>
      </ModalShell>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <ModalShell
        icon="lock_reset"
        title="Reset Password"
        description="Create a new password for your account."
        onClose={goToSignIn}
        maxWidthClassName="max-w-[420px]"
        footer={
          <button type="submit" className={`${PRIMARY_BUTTON} w-full`} disabled={status === "submitting"}>
            {status === "submitting" ? "Updating…" : "Reset Password"}
          </button>
        }
      >
        <div className="p-lg space-y-md">
          {error && (
            <div className="flex items-start gap-sm bg-error/10 border border-error/30 rounded-lg px-md py-sm">
              <Icon name="error" size={18} className="text-error mt-[2px]" />
              <p className="font-body-sm text-body-sm text-error">{error}</p>
            </div>
          )}
          <TextField
            label="New Password"
            type="password"
            required
            placeholder="••••••••"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <TextField
            label="Confirm Password"
            type="password"
            required
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
          />
        </div>
      </ModalShell>
    </form>
  );
}
