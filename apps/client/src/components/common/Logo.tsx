import { Icon } from "./Icon";

interface LogoProps {
  variant?: "marketing" | "app";
}

export function Logo({ variant = "marketing" }: LogoProps) {
  if (variant === "app") {
    return (
      <div className="flex items-center gap-md">
        <div className="w-10 h-10 rounded-lg bg-primary-container flex items-center justify-center flex-shrink-0">
          <Icon name="view_in_ar" filled className="text-on-primary-container" />
        </div>
        <div className="flex flex-col">
          <span className="font-headline-md text-headline-md text-primary font-bold leading-tight">
            DIFFLANE
          </span>
          <span className="font-label-sm text-label-sm text-on-surface-variant">
            Collaborative Coding
          </span>
        </div>
      </div>
    );
  }

  return (
    <span className="font-display text-headline-md font-extrabold tracking-[0.1em] uppercase text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-blue-600">
      DIFFLANE
    </span>
  );
}
