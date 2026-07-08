import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { LazyMotion, domAnimation } from "framer-motion";
import App from "./App";
import { ThemeProvider } from "./contexts/ThemeContext";
import { CurrentUserProvider } from "./contexts/CurrentUserContext";
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
          {}
          <LazyMotion features={domAnimation} strict>
            <App />
          </LazyMotion>
        </CurrentUserProvider>
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>,
);
