import { forwardRef, type TextareaHTMLAttributes } from "react";

export interface TextAreaFieldProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  optional?: boolean;
}

export const TextAreaField = forwardRef<HTMLTextAreaElement, TextAreaFieldProps>(
  ({ label, hint, error, required, optional, id, className = "", ...rest }, ref) => {
    const fieldId = id ?? label.toLowerCase().replace(/\s+/g, "-");
    const describedBy = error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined;

    return (
      <div className="flex flex-col gap-sm">
        <label htmlFor={fieldId} className="font-label-md text-label-md text-on-surface">
          {label}
          {required && <span className="text-error"> *</span>}
          {optional && <span className="text-on-surface-variant font-normal ml-xs">(Optional)</span>}
        </label>
        <textarea
          ref={ref}
          id={fieldId}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          className={`w-full bg-surface border rounded-lg px-md py-sm font-body-md text-on-surface placeholder:text-on-surface-variant/50 outline-none resize-none transition-colors focus:ring-1 ${
            error
              ? "border-error focus:border-error focus:ring-error"
              : "border-outline-variant focus:border-primary focus:ring-primary"
          } ${className}`.trim()}
          {...rest}
        />
        {error ? (
          <p id={`${fieldId}-error`} className="font-body-sm text-body-sm text-error" role="alert">
            {error}
          </p>
        ) : hint ? (
          <p id={`${fieldId}-hint`} className="font-body-sm text-body-sm text-on-surface-variant">
            {hint}
          </p>
        ) : null}
      </div>
    );
  },
);

TextAreaField.displayName = "TextAreaField";
