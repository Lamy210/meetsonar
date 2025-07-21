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
    // ソースマップを完全に無効化
    sourcemap: false,
    // ロールアップ設定でエラーハンドリング強化
    rollupOptions: {
      onwarn(warning, warn) {
        // ソースマップ関連の警告を完全に抑制
        if (warning.code === 'SOURCEMAP_ERROR' || 
            warning.code === 'CIRCULAR_DEPENDENCY' ||
            warning.message?.includes('sourcemap') ||
            warning.message?.includes('source map')) {
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
      overlay: false, // エラーオーバーレイを無効化
      clientPort: 5173
    }
  },
  // esbuild設定でソースマップエラーを解決
  esbuild: {
    logOverride: {
      'this-is-undefined-in-esm': 'silent'
    }
  },
  optimizeDeps: {
    esbuildOptions: {
      sourcemap: false,
      logLevel: 'silent'
    },
    exclude: ['@tanstack/query-core'],
    // 依存関係の事前バンドルを強制的に実行
    force: true
  },
  // ログレベルを調整してソースマップエラーを抑制
  logLevel: 'warn',
  clearScreen: false
});
