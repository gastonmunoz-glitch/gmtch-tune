import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import process from "node:process";

const railwayFrontendHost = "abundant-emotion-production-830a.up.railway.app";

export default defineConfig({
  plugins: [react()],

  preview: {
    host: "0.0.0.0",
    port: Number(process.env.PORT || 8080),
    allowedHosts: [
      railwayFrontendHost,
      ".up.railway.app",
    ],
  },

  server: {
    host: "0.0.0.0",
    port: 5173,
    allowedHosts: [
      "localhost",
      "127.0.0.1",
      railwayFrontendHost,
      ".up.railway.app",
    ],
  },
});