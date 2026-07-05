import { Icon } from "./Icon";

export interface RadioCardOption {
  value: string;
  label: string;
  description: string;
  icon: string;
}

interface RadioCardGroupProps {
  name: string;
  legend: string;
  options: RadioCardOption[];
  value: string;
  onChange: (value: string) => void;
}

export function RadioCardGroup({ name, legend, options, value, onChange }: RadioCardGroupProps) {
  return (
    <div>
      <span className="block font-label-md text-label-md text-on-surface mb-sm">{legend}</span>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-md" role="radiogroup" aria-label={legend}>
        {options.map((option) => {
          const checked = option.value === value;
          return (
            <label
              key={option.value}
              className={`relative flex flex-col p-md rounded-xl border cursor-pointer transition-colors group ${
                checked
                  ? "border-primary bg-primary/5 hover:bg-primary/10"
                  : "border-outline-variant bg-surface hover:border-outline"
              }`}
            >
              <input
                type="radio"
                name={name}
                value={option.value}
                checked={checked}
                onChange={() => onChange(option.value)}
                className="sr-only"
              />
              <div className="flex justify-between items-start mb-sm">
                <Icon
                  name={option.icon}
                  filled={checked}
                  className={
                    checked
                      ? "text-primary"
                      : "text-on-surface-variant group-hover:text-on-surface transition-colors"
                  }
                />
                <div
                  className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${
                    checked ? "border-primary" : "border-outline-variant group-hover:border-outline"
                  }`}
                >
                  {checked && <div className="w-2 h-2 rounded-full bg-primary" />}
                </div>
              </div>
              <span className="font-label-md text-label-md text-on-surface block mb-xs">{option.label}</span>
              <span className="font-body-sm text-body-sm text-on-surface-variant">{option.description}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
