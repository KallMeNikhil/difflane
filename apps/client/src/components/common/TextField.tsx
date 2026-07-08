import { forwardRef, type InputHTMLAttributes } from "react";

export interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  optional?: boolean;
  variant?: "default" | "code";
  hideLabel?: boolean;
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(
  ({ label, hint, error, required, optional, variant = "default", hideLabel = false, id, className = "", ...rest }, ref) => {
    const inputId = id ?? label.toLowerCase().replace(/\s+/g, "-");
    const describedBy = error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined;

    return (
      <div className="flex flex-col gap-sm">
        <label htmlFor={inputId} className={hideLabel ? "sr-only" : "font-label-md text-label-md text-gray-300"}>
          {label}
          {required && <span className="text-error"> *</span>}
          {optional && <span className="text-gray-500 font-normal ml-xs">(Optional)</span>}
        </label>
        <input
          ref={ref}
          id={inputId}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          className={`w-full bg-[#161b22] border rounded-lg px-md py-sm font-body-md text-gray-100 placeholder:text-gray-600 outline-none transition-colors duration-300 ease-out focus:ring-1 ${
            error
              ? "border-error focus:border-error focus:ring-error"
              : "border-white/10 focus:border-primary focus:ring-primary/40"
          } ${variant === "code" ? "text-center font-code text-code uppercase tracking-[0.5em]" : ""} ${className}`.trim()}
          {...rest}
        />
        {error ? (
          <p id={`${inputId}-error`} className="font-body-sm text-body-sm text-error" role="alert">
            {error}
          </p>
        ) : hint ? (
          <p id={`${inputId}-hint`} className="font-body-sm text-body-sm text-gray-500">
            {hint}
          </p>
        ) : null}
      </div>
    );
  },
);

TextField.displayName = "TextField";
