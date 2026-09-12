import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

const DEFAULT_SUPABASE_URL = "https://wpkxbrdgktmwnowvmwue.supabase.co";
const DEFAULT_SUPABASE_PUBLISHABLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indwa3hicmRna3Rtd25vd3Ztd3VlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxMTkyNTQsImV4cCI6MjA4MDY5NTI1NH0.TR7cBNS0w6REoI2cKgcc3pubgIrY94IWoiXAWiy3X3M";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const supabaseUrl = (env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL).trim();
  const supabasePublishableKey = (env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || DEFAULT_SUPABASE_PUBLISHABLE_KEY).trim();

  return {
    define: {
      "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(supabaseUrl),
      "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify(supabasePublishableKey),
    },
    server: {
      host: "::",
      port: 8080,
    },
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "./src"),
      },
    },
    build: {
      minify: "esbuild",
      sourcemap: false,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes("node_modules")) return;
            if (/[\\/]node_modules[\\/](react|react-dom|react-router|react-router-dom)[\\/]/.test(id)) {
              return "vendor-react";
            }
            if (id.includes("/node_modules/@radix-ui/")) {
              return "vendor-ui";
            }
            if (id.includes("/node_modules/@tanstack/react-query/")) {
              return "vendor-query";
            }
            if (id.includes("/node_modules/@supabase/")) {
              return "vendor-supabase";
            }
            if (id.includes("/node_modules/recharts/")) {
              return "vendor-recharts";
            }
          },
          chunkFileNames: "assets/[name]-[hash].js",
          entryFileNames: "assets/[name]-[hash].js",
          assetFileNames: "assets/[name]-[hash].[ext]",
        },
      },
      chunkSizeWarningLimit: 500,
      target: "es2020",
    },
    optimizeDeps: {
      include: ["react", "react-dom", "react-router-dom"],
    },
  };
});
