export const MOCK_FILE_CONTENTS: Record<string, string> = {
  "file-header": `import { Logo } from "./Logo";

export function Header() {
  return (
    <header className="flex items-center justify-between px-lg h-16">
      <Logo />
      <nav className="flex items-center gap-md">
        <a href="/dashboard">Dashboard</a>
        <a href="/workspace">Workspace</a>
      </nav>
    </header>
  );
}
`,
  "file-app": `import { Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Workspace from "./pages/Workspace";

export default function App() {
  return (
    <Routes>
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/workspace" element={<Workspace />} />
    </Routes>
  );
}
`,
  "file-sidebar": `import { NavLink } from "react-router-dom";

export function Sidebar({ items }: { items: { label: string; path: string }[] }) {
  return (
    <aside className="w-64 border-r border-outline-variant">
      {items.map((item) => (
        <NavLink key={item.path} to={item.path}>
          {item.label}
        </NavLink>
      ))}
    </aside>
  );
}
`,
  "file-logo-svg": `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /></svg>\n`,
};
