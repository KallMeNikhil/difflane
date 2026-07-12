import { forwardRef, type ButtonHTMLAttributes } from "react";
import { getButtonClasses, type ButtonSize, type ButtonVariant } from "./buttonStyles";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", className = "", children, ...rest }, ref) => {
    return (
      <button ref={ref} className={getButtonClasses(variant, size, className)} {...rest}>
        {children}
      </button>
    );
  },
);

Button.displayName = "Button";
