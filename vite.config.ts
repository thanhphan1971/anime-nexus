import { defineConfig, type PluginOption } from "vite";

import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { metaImagesPlugin } from "./vite-plugin-meta-images";

const __dirname = process.cwd();

function tryVisualizer(command: string): PluginOption[] {
  if (command !== "build") return [];
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { visualizer } = require("rollup-plugin-visualizer");
    return [
      visualizer({
        filename: "dist/bundle-report.html",
        template: "treemap",
        gzipSize: true,
        brotliSize: true,
        open: false,
      }),
    ];
  } catch {
    // If the package isn't resolvable in this environment, don't break the build
    return [];
  }
}

function tryReplitDevPlugins(command: string): PluginOption[] {
  // Only in dev/serve, and only when running in Replit
  if (command === "build") return [];
  if (process.env.REPL_ID === undefined) return [];

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { cartographer } = require("@replit/vite-plugin-cartographer");
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { devBanner } = require("@replit/vite-plugin-dev-banner");

    return [cartographer(), devBanner()];
  } catch {
    return [];
  }
}

export default defineConfig(({ command }) => ({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    tailwindcss(),
    metaImagesPlugin(),
    ...tryReplitDevPlugins(command),
    ...tryVisualizer(command),
  ],

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client", "src"),
      "@shared": path.resolve(__dirname, "shared"),
      "@assets": path.resolve(__dirname, "attached_assets"),
    },
  },

  css: {
    postcss: {
      plugins: [],
    },
  },

  root: path.resolve(__dirname, "client"),

  build: {
    outDir: path.resolve(__dirname, "dist/public"),
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (!id.includes("node_modules")) return;

          if (id.includes("@supabase")) return "supabase";
          if (id.includes("lucide-react")) return "ui";

          if (id.includes("@tanstack/react-query")) return "react-query";
          if (id.includes("react-hook-form")) return "forms";
          if (id.includes("zod")) return "zod";

          return "vendor";
        },
      },
    },
  },

  server: {
    host: "0.0.0.0",
    allowedHosts: true,
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
}));
