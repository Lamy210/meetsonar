import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [
    react(),
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
  // 開発サーバー設定 - パフォーマンス最適化
  server: {
    host: "0.0.0.0",
    port: 5173,
    // より高速なファイルシステム設定
    fs: {
      strict: false, // パフォーマンス向上のため制限を緩和
      allow: [".."], // 親ディレクトリへのアクセスを許可
    },
    proxy: {
      "/api": {
        target: "http://meetsonar-backend:5000",
        changeOrigin: true,
      },
      "/ws": {
        target: "http://meetsonar-backend:5000",
        ws: true,
        changeOrigin: true,
        secure: false,
        // 最小限の設定でエラーを回避
        configure: (proxy, options) => {
          proxy.on('error', (err, req, res) => {
            console.log('❌ WebSocket proxy error:', err?.message || 'Unknown error');
          });
          
          proxy.on('proxyReqWs', (proxyReq, req, socket, options, head) => {
            console.log('🔄 Proxying WebSocket request to backend:', req.url);
          });
        },
      },
    },
    hmr: {
      overlay: false,
      port: 24678  // HMRを別ポートに移動してWebSocket衝突を回避
    },
    // 監視対象を制限してパフォーマンス向上
    watch: {
      ignored: ['**/node_modules/**', '**/dist/**', '**/coverage/**']
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
      logLevel: 'error'
    },
    // よく使用される依存関係を事前にバンドル
    include: [
      'react', 
      'react-dom', 
      'react-dom/client',
      'wouter',
      'lucide-react'
    ],
    // 通常モードで実行（forceを削除）
  },
  // ログレベルを調整
  logLevel: 'info',
  clearScreen: false,
  // デバッグ情報を追加
  define: {
    __DEV__: true,
  },
});
