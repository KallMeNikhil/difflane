import { Logo } from "../common";

const FOOTER_LINKS: { label: string; href: string }[] = [
  { label: "Documentation", href: "#" },
  { label: "GitHub", href: "https://github.com/KallMeNikhil/difflane" },
  { label: "Privacy", href: "#" },
  { label: "Terms", href: "#" },
  { label: "Status", href: "#" },
];

export function MarketingFooter() {
  return (
    <footer className="border-t border-white/10 bg-[#0B0D12]/50 backdrop-blur-2xl shadow-[0_-8px_32px_rgba(0,0,0,0.35)] py-lg relative z-10">
      <div className="max-w-7xl mx-auto px-xl flex flex-col md:flex-row justify-between items-center gap-xl">
        <Logo variant="marketing" size="body-md" />

        <div className="flex gap-xl font-label-md text-label-md text-gray-500">
          {FOOTER_LINKS.map(({ label, href }) => (
            <a
              key={label}
              href={href}
              target={href.startsWith("http") ? "_blank" : undefined}
              rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
              className="hover:text-white transition-all duration-300 ease-out"
            >
              {label}
            </a>
          ))}
        </div>

        <div className="font-label-sm text-label-sm text-gray-600 tracking-wider">© DIFFLANE</div>
      </div>
    </footer>
  );
}
