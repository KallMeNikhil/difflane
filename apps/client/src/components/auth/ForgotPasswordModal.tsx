import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Icon, ModalShell, TextField, getButtonClasses } from "../common";
import { requestPasswordReset, validateEmail } from "../../services/AuthService";
import { ROUTES } from "../../constants/routes";

const PRIMARY_BUTTON = getButtonClasses("primary", "md");

export function ForgotPasswordModal({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "submitting" | "sent">("idle");

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const emailError = validateEmail(email);
    if (emailError) {
      setError(emailError);
      return;
    }
    setError(null);
    setStatus("submitting");
    try {
      await requestPasswordReset(email);
      setStatus("sent");
    } catch {
      setStatus("idle");
      setError("Something went wrong. Please try again.");
    }
  }

  return (
    <ModalShell
      icon="lock_reset"
      title="Forgot Password"
      description="Enter your email and we'll send you a link to reset your password."
      onClose={onClose}
      maxWidthClassName="max-w-[420px]"
      footer={
        <button
          type="button"
          className="w-full flex items-center justify-center gap-xs font-body-sm text-body-sm text-on-surface-variant hover:text-on-surface"
          onClick={() => navigate(ROUTES.signIn)}
        >
          <Icon name="arrow_back" size={16} />
          Back to Sign In
        </button>
      }
    >
      <div className="p-lg space-y-md">
        {status === "sent" ? (
          <div className="flex flex-col items-center text-center gap-md py-md">
            <div className="w-14 h-14 rounded-xl bg-success/10 border border-success/30 flex items-center justify-center">
              <Icon name="mark_email_read" size={28} className="text-success" filled />
            </div>
            <p className="font-body-md text-body-md text-on-surface-variant">
              If an account exists for <span className="text-on-surface font-medium">{email}</span>, a reset link is on its way.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="space-y-md">
            <TextField
              label="Email Address"
              type="email"
              required
              placeholder="name@example.com"
              value={email}
              error={error ?? undefined}
              onChange={(event) => setEmail(event.target.value)}
            />
            <button type="submit" className={`${PRIMARY_BUTTON} w-full`} disabled={status === "submitting"}>
              {status === "submitting" ? "Sending…" : "Send Reset Link"}
            </button>
          </form>
        )}
      </div>
    </ModalShell>
  );
}
