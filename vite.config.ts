import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

export default defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== "production" &&
      process.env.REPL_ID !== undefined
      ? [
        await import("@replit/vite-plugin-cartographer").then((m) =>
          m.cartographer(),
        ),
      ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    // ソースマップの設定を改善
    sourcemap: process.env.NODE_ENV === 'development' ? true : false,
    // ロールアップ設定でエラーハンドリング強化
    rollupOptions: {
      onwarn(warning, warn) {
        // ソースマップ関連の警告を抑制
        if (warning.code === 'SOURCEMAP_ERROR' || warning.code === 'CIRCULAR_DEPENDENCY') {
          return;
        }
        warn(warning);
      }
    }
  },
  // 開発サーバー設定
  server: {
    host: "0.0.0.0",
    port: 5173,
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
    proxy: {
      "/api": {
        target: "http://backend:5000",
        changeOrigin: true,
      },
      "/ws": {
        target: "ws://backend:5000",
        ws: true,
        changeOrigin: true,
      },
    },
    hmr: {
      overlay: false // エラーオーバーレイを無効化してソースマップエラーを軽減
    }
  },
});
