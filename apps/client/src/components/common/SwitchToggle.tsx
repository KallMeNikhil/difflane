import { Icon } from "./Icon";

interface SwitchToggleProps {
  icon: string;
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function SwitchToggle({ icon, label, description, checked, onChange }: SwitchToggleProps) {
  return (
    <div className="flex items-start justify-between gap-md">
      <div className="flex gap-md">
        <Icon name={icon} className="text-on-surface-variant mt-xs" />
        <div>
          <span className="font-label-md text-label-md text-on-surface block mb-xs">{label}</span>
          <span className="font-body-sm text-body-sm text-on-surface-variant block">{description}</span>
        </div>
      </div>
      <label className="relative inline-flex items-center cursor-pointer flex-shrink-0 mt-xs">
        <input
          type="checkbox"
          className="sr-only peer"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          aria-label={label}
        />
        <div className="w-10 h-5 bg-surface-variant rounded-full peer peer-checked:after:translate-x-[20px] after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-on-surface after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary-container peer-checked:after:bg-on-primary-container border border-outline-variant peer-checked:border-primary" />
      </label>
    </div>
  );
}
