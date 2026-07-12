export type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    "bg-primary-container text-on-primary-container border border-transparent hover:opacity-90 hover:-translate-y-0.5 shadow-[0_0_15px_rgba(37,99,235,0.3)] hover:shadow-[0_0_20px_rgba(37,99,235,0.4)]",
  secondary:
    "bg-transparent text-on-surface border border-outline hover:bg-surface-variant hover:border-primary/50",
  ghost:
    "bg-transparent text-on-surface-variant border border-transparent hover:text-on-surface hover:bg-surface-variant",
  danger:
    "bg-transparent text-error border border-error hover:bg-error hover:text-on-error",
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: "px-md py-1.5 text-label-sm",
  md: "px-md py-2 text-label-md",
  lg: "px-xl py-md text-label-md",
};

export function getButtonClasses(
  variant: ButtonVariant = "primary",
  size: ButtonSize = "md",
  className = "",
): string {
  return `inline-flex items-center justify-center gap-sm rounded-lg font-label-md font-medium transition-all duration-300 ease-out disabled:opacity-50 disabled:pointer-events-none ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${className}`.trim();
}
