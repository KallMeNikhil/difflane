import { forwardRef, type ButtonHTMLAttributes } from "react";
import { Icon } from "./Icon";

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: string;
  "aria-label": string;
  size?: number;
  shape?: "circle" | "square";
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ icon, size = 20, shape = "circle", className = "", ...rest }, ref) => {
    const shapeClass = shape === "circle" ? "rounded-full" : "rounded-lg";

    return (
      <button
        ref={ref}
        className={`w-10 h-10 flex items-center justify-center ${shapeClass} text-on-surface-variant hover:bg-surface-variant hover:text-on-surface transition-colors ${className}`.trim()}
        {...rest}
      >
        <Icon name={icon} size={size} />
      </button>
    );
  },
);

IconButton.displayName = "IconButton";
