import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

function injectSiteUrl(): Plugin {
  const siteUrl = (process.env.VITE_SITE_URL || "https://difflane.whynikhil.xyz").replace(/\/$/, "");
  return {
    name: "inject-site-url",
    transformIndexHtml(html) {
      return html.split("https://difflane.whynikhil.xyz").join(siteUrl);
    },
  };
}

export default defineConfig({
  plugins: [react(), injectSiteUrl()],
  server: {
    port: 7777,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          "editor-engine": ["@monaco-editor/react", "monaco-editor", "yjs", "y-monaco"],
          socket: ["socket.io-client"],
          zip: ["jszip"],
        },
      },
    },
  },
});
