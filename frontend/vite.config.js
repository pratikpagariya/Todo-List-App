import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// During `npm run dev`, the frontend runs on :5173 and proxies any /api/*
// request to the backend on :3000 — so there are no CORS issues and the
// frontend code can just call "/api/...".
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:3000",
    },
  },
});
