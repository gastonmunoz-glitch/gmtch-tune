import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],

  preview: {
    host: "0.0.0.0",
    port: 8080,
    strictPort: false,
    allowedHosts: [
      "gmtchtune.com",
      "www.gmtchtune.com",
      "abundant-emotion-production-830a.up.railway.app",
      ".up.railway.app",
    ],
  },

  server: {
    host: "0.0.0.0",
    port: 5173,
    allowedHosts: [
      "localhost",
      "127.0.0.1",
      "gmtchtune.com",
      "www.gmtchtune.com",
      "abundant-emotion-production-830a.up.railway.app",
      ".up.railway.app",
    ],
  },
});
