import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
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
