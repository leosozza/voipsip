import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

const LOCAL_SERVER = `http://127.0.0.1:${process.env.VOIPSIP_PORT || 5180}`;

// In dev, Vite serves the UI and proxies everything server-side to the local connector.
// In production the connector itself serves the built UI from dist/.
export default defineConfig(() => ({
  server: {
    host: "127.0.0.1",
    port: 8080,
    hmr: { overlay: false },
    proxy: {
      "/api": { target: LOCAL_SERVER, changeOrigin: true },
      "/hook": { target: LOCAL_SERVER, changeOrigin: true },
      "/bitrix/app": { target: LOCAL_SERVER, changeOrigin: true },
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
