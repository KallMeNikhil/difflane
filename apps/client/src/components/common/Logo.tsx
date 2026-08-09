interface LogoProps {
  variant?: "marketing" | "app";
  size?: "headline-md" | "body-md";
}

export function Logo({ variant = "marketing", size = "headline-md" }: LogoProps) {
  if (variant === "app") {
    return (
      <div className="flex items-center gap-md">
        <div className="w-10 h-10 rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0">
          <img src="/logo.png" alt="Difflane" className="w-full h-full object-cover" />
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

  const sizeClass = size === "body-md" ? "text-body-md" : "text-headline-md";

  return (
    <span className={`font-display ${sizeClass} font-extrabold tracking-[0.1em] uppercase text-white`}>
      DIFFLANE
    </span>
  );
}
