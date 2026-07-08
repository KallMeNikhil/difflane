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
        <Icon name={icon} className="text-gray-400 mt-xs" />
        <div>
          <span className="font-label-md text-label-md text-gray-100 block mb-xs">{label}</span>
          <span className="font-body-sm text-body-sm text-gray-400 block">{description}</span>
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
        <div className="w-10 h-5 bg-[#161b22] rounded-full peer peer-checked:after:translate-x-[20px] after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-gray-300 after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary-container peer-checked:after:bg-white border border-white/10 peer-checked:border-primary" />
      </label>
    </div>
  );
}
