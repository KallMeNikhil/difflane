import { forwardRef, type SelectHTMLAttributes } from "react";
import { Icon } from "./Icon";

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: SelectOption[];
}

export const SelectField = forwardRef<HTMLSelectElement, SelectFieldProps>(
  ({ label, options, id, className = "", ...rest }, ref) => {
    const selectId = id ?? label.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="flex flex-col gap-sm">
        <label htmlFor={selectId} className="font-label-md text-label-md text-on-surface">
          {label}
        </label>
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            className={`w-full appearance-none bg-surface border border-outline-variant rounded-lg px-md py-sm font-body-md text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors cursor-pointer ${className}`.trim()}
            {...rest}
          >
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <Icon
            name="expand_more"
            size={20}
            className="absolute right-md top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none"
          />
        </div>
      </div>
    );
  },
);

SelectField.displayName = "SelectField";
