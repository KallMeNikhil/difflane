import type { HTMLAttributes } from "react";

export interface IconProps extends HTMLAttributes<HTMLSpanElement> {
  name: string;
  size?: number;
  filled?: boolean;
}

export function Icon({ name, size = 20, filled = false, className = "", style, ...rest }: IconProps) {
  return (
    <span
      className={`material-symbols-outlined${filled ? " fill" : ""} ${className}`.trim()}
      style={{ fontSize: size, ...style }}
      aria-hidden="true"
      {...rest}
    >
      {name}
    </span>
  );
}
