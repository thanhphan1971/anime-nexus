import { visualizer } from "rollup-plugin-visualizer";
import { defineConfig } from "vite";

import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { metaImagesPlugin } from "./vite-plugin-meta-images";


const __dirname = process.cwd();



// Optional: bundle visualizer (safe + no TS error if not installed)
function tryVisualizer(command: string) {
  if (command !== "build") return [];

  
  return [
    visualizer({
      filename: path.resolve(__dirname, "dist/public/bundle-report.html"),
      template: "treemap",
      gzipSize: true,
      brotliSize: true,
      open: false,
    }),
  ];
}


export default defineConfig(({ command }) => {

  return {
     plugins: [
      react(),
      runtimeErrorOverlay(),
      tailwindcss(),
      metaImagesPlugin(),
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
         if (!id.includes("node_modules")) return undefined;         
        // ✅ force cropper into its own chunk (so it can load async with  ProfilePage)
         if (id.includes("react-easy-crop")) return "cropper";

         if (id.includes("@supabase")) return "supabase";
         if (id.includes("lucide-react")) return "ui";

         if (id.includes("@tanstack/react-query")) return "react-query";
         if (id.includes("react-hook-form")) return "forms";
         if (id.includes("zod")) return "zod";         

         if (id.includes("@radix-ui")) return "radix";
         if (id.includes("@floating-ui")) return "floating-ui";
         if (id.includes("framer-motion") || id.includes("motion-dom")) return "motion";


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
   };
 });
