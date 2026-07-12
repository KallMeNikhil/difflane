import { createContext } from "react";

export type Theme = "dark";

export interface ThemeContextValue {
  theme: Theme;
}

export const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);
