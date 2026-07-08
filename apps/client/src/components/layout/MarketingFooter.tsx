import { Logo } from "../common";

const FOOTER_LINKS = ["Documentation", "GitHub", "Privacy", "Terms", "Status"];

export function MarketingFooter() {
  return (
    <footer className="border-t border-white/5 bg-[#0B0D12] py-lg relative z-10">
      <div className="max-w-7xl mx-auto px-xl flex flex-col md:flex-row justify-between items-center gap-xl">
        <Logo variant="marketing" size="body-md" />

        <div className="flex gap-xl font-label-md text-label-md text-gray-500">
          {FOOTER_LINKS.map((label) => (
            <a key={label} href="#" className="hover:text-white transition-all duration-300 ease-out">
              {label}
            </a>
          ))}
        </div>

        <div className="font-label-sm text-label-sm text-gray-600 tracking-wider">© DIFFLANE</div>
      </div>
    </footer>
  );
}
