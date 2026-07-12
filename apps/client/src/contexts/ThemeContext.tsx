import { useMemo, type ReactNode } from "react";
import { ThemeContext, type ThemeContextValue } from "../hooks/useTheme";

export function ThemeProvider({ children }: { children: ReactNode }) {
  const value = useMemo<ThemeContextValue>(() => ({ theme: "dark" }), []);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
