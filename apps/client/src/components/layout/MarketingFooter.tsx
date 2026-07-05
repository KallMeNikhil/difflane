import { Logo } from "../common";

const FOOTER_LINKS = ["Documentation", "GitHub", "Privacy", "Terms", "Status"];

export function MarketingFooter() {
  return (
    <footer className="border-t border-outline-variant/20 bg-surface-container-lowest/80 backdrop-blur-sm py-xl relative z-10 shadow-[0_-1px_10px_rgba(37,99,235,0.1)]">
      <div className="max-w-7xl mx-auto px-xl flex flex-col md:flex-row justify-between items-center gap-xl">
        <Logo variant="marketing" />

        <div className="flex gap-xl font-label-md text-label-md text-on-surface-variant">
          {FOOTER_LINKS.map((label) => (
            <a
              key={label}
              href="#"
              className="hover:text-primary hover:drop-shadow-[0_0_8px_rgba(37,99,235,0.5)] transition-all duration-300 ease-out"
            >
              {label}
            </a>
          ))}
        </div>

        <div className="font-label-sm text-label-sm text-outline tracking-wider">© DIFFLANE</div>
      </div>
    </footer>
  );
}
