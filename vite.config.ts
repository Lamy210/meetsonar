import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// Environment detection for dynamic target setting
const getBackendTarget = () => {
  // Docker環境検知
  const isDocker = process.env.NODE_ENV === 'development' && 
                   process.env.DOCKER_ENV === 'true';
  
  if (isDocker) {
    return "http://meetsonar-backend:5000";
  }
  
  // ローカル環境では直接localhost
  return "http://localhost:5000";
};

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
        target: getBackendTarget(),
        changeOrigin: true,
      },
      "/ws": {
        target: getBackendTarget(),
        ws: true,
        changeOrigin: true,
        secure: false,
        // WebSocket特有の重要設定（レビュー推奨）
        timeout: 0,  // 無限タイムアウト
        followRedirects: false,
        ignorePath: false,
        xfwd: true,
        
        // 詳細なエラーハンドリング（レビュー推奨）
        configure: (proxy: any, options: any) => {
          proxy.on('error', (err: any, req: any, res: any) => {
            console.error('❌ WebSocket proxy error details:', {
              message: err.message,
              code: err?.code,
              stack: err.stack,
              url: req?.url,
              headers: req?.headers
            });
          });
          
          proxy.on('proxyReqWs', (proxyReq: any, req: any, socket: any, options: any, head: any) => {
            console.log('🔄 WebSocket handshake request:', {
              url: req.url,
              headers: req.headers,
              upgrade: req.headers.upgrade
            });
            
            // WebSocketハンドシェイクヘッダーの確実な転送（レビュー推奨）
            proxyReq.setHeader('Connection', 'Upgrade');
            proxyReq.setHeader('Upgrade', 'websocket');
            
            // Originヘッダーの適切な設定
            if (req.headers.origin) {
              proxyReq.setHeader('Origin', req.headers.origin);
            }
            
            // 必要なWebSocketヘッダーの保持
            if (req.headers['sec-websocket-key']) {
              proxyReq.setHeader('Sec-WebSocket-Key', req.headers['sec-websocket-key']);
            }
            if (req.headers['sec-websocket-version']) {
              proxyReq.setHeader('Sec-WebSocket-Version', req.headers['sec-websocket-version']);
            }
            if (req.headers['sec-websocket-protocol']) {
              proxyReq.setHeader('Sec-WebSocket-Protocol', req.headers['sec-websocket-protocol']);
            }
            if (req.headers['sec-websocket-extensions']) {
              proxyReq.setHeader('Sec-WebSocket-Extensions', req.headers['sec-websocket-extensions']);
            }
          });
          
          proxy.on('proxyResWs', (proxyRes: any, proxySocket: any, proxyHead: any) => {
            console.log('📨 WebSocket handshake response:', {
              statusCode: proxyRes.statusCode,
              headers: proxyRes.headers
            });
          });
          
          proxy.on('open', (proxySocket: any) => {
            console.log('✅ WebSocket connection opened successfully');
            proxySocket.on('error', (err: any) => {
              console.error('❌ WebSocket connection error:', err);
            });
          });
          
          proxy.on('close', (proxyRes: any, proxySocket: any, proxyHead: any) => {
            console.log('🔒 WebSocket connection closed');
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
