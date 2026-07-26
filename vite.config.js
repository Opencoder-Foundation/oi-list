import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const __dirname = dirname(fileURLToPath(import.meta.url));

// https://vite.dev/config/
export default defineConfig({
  base: "/oi-list/",
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        embed: resolve(__dirname, "src/embed.jsx"),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === "embed") {
            return "embed.js";
          }
          return "assets/[name]-[hash].js";
        },
      },
    },
  },
});