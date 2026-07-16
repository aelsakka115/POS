import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

// Architecture only — no dev-server proxy to a backend yet (RFC-004 §6.5
// API layer doesn't exist beyond interfaces during Bootstrap).
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
