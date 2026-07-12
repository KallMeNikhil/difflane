import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { LazyMotion, domAnimation } from "framer-motion";
import App from "./App";
import { ThemeProvider } from "./contexts/ThemeContext";
import { CurrentUserProvider } from "./contexts/CurrentUserContext";
import { EditorPreferencesProvider } from "./contexts/EditorPreferencesContext";
import { UserSettingsModalProvider } from "./contexts/UserSettingsModalContext";
import { NotificationsProvider } from "./contexts/NotificationsContext";
import "./styles/index.css";

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element #root not found in index.html");
}

createRoot(rootElement).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <CurrentUserProvider>
          <EditorPreferencesProvider>
            <UserSettingsModalProvider>
              <NotificationsProvider>
                <LazyMotion features={domAnimation} strict>
                  <App />
                </LazyMotion>
              </NotificationsProvider>
            </UserSettingsModalProvider>
          </EditorPreferencesProvider>
        </CurrentUserProvider>
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>,
);
