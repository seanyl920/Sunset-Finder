import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// During development the React app runs on Vite's dev server (5173) and the
// Claude proxy runs on Express (3001). Forward /api calls to the backend so the
// API key never reaches the browser.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:3001",
    },
  },
  build: {
    outDir: "dist",
  },
});
