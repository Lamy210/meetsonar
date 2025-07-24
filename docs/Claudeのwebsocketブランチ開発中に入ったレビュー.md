添付資料の内容を確認するため、プロジェクトの設定ファイルや技術構成について検索させていただきます。添付資料の詳細な技術構成を確認いたしました。Docker Compose環境でのWebSocket接続問題について、包括的な分析と改善提案をお示しします。

---

## 【現在の問題の原因仮説】

### 1. **WebSocketハンドシェイクの不完全なプロキシ転送**
`Malformed_HTTP_Response`エラーは、ViteプロキシがWebSocketハンドシェイク時のHTTP Upgradeレスポンスを正しく処理できていないことを示します。Docker環境での `meetsonar-backend:5000` への接続は成功しているが、プロトコル切り替え時に問題が発生しています。

### 2. **プロキシ設定の不足**
現在の設定では`timeout`、`followRedirects`、`ignorePath`などのWebSocket固有の重要なオプションが未設定で、デフォルト値によりハンドシェイクが中断されている可能性があります。

### 3. **HTTPヘッダーの不適切な転送**
WebSocketアップグレードに必要な `Connection: Upgrade` や `Sec-WebSocket-*` ヘッダーがプロキシ通過時に改変・削除されている可能性があります。

### 4. **Bun WebSocketサーバーとViteプロキシの互換性問題**
バックエンドでBunランタイムを使用していますが、ViteのWebSocketプロキシ（http-proxy-middlewareベース）との間で、プロトコル実装の微細な差異が問題を引き起こしている可能性があります。

### 5. **エラーハンドリング不備によるデバッグ情報不足**
現在の`configure`設定ではエラー詳細が十分に出力されておらず、根本原因の特定が困難になっています。

---

## 【改善提案（優先順位順）】

### **1. 最優先：vite.config.ts WebSocketプロキシ設定の強化**

```typescript
"/ws": {
  target: "http://meetsonar-backend:5000",
  ws: true,
  changeOrigin: true,
  secure: false,
  // WebSocket特有の重要設定
  timeout: 0,  // 無限タイムアウト
  followRedirects: false,
  ignorePath: false,
  xfwd: true,
  
  // 詳細なエラーハンドリング
  configure: (proxy, options) => {
    proxy.on('error', (err, req, res) => {
      console.error('❌ WebSocket proxy error details:', {
        message: err.message,
        code: err.code,
        stack: err.stack,
        url: req.url,
        headers: req.headers
      });
    });
    
    proxy.on('proxyReqWs', (proxyReq, req, socket, options, head) => {
      console.log('🔄 WebSocket handshake request:', {
        url: req.url,
        headers: req.headers,
        upgrade: req.headers.upgrade
      });
      
      // WebSocketハンドシェイクヘッダーの確実な転送
      proxyReq.setHeader('Connection', 'Upgrade');
      proxyReq.setHeader('Upgrade', 'websocket');
      
      // Originヘッダーの適切な設定
      if (req.headers.origin) {
        proxyReq.setHeader('Origin', req.headers.origin);
      }
    });
    
    proxy.on('proxyResWs', (proxyRes, proxySocket, proxyHead) => {
      console.log('📨 WebSocket handshake response:', {
        statusCode: proxyRes.statusCode,
        headers: proxyRes.headers
      });
    });
    
    proxy.on('open', (proxySocket) => {
      console.log('✅ WebSocket connection opened successfully');
      proxySocket.on('error', (err) => {
        console.error('❌ WebSocket connection error:', err);
      });
    });
    
    proxy.on('close', (proxyRes, proxySocket, proxyHead) => {
      console.log('🔒 WebSocket connection closed');
    });
  },
},
```

### **2. 環境検知による動的ターゲット設定**

```typescript
// vite.config.ts の改良版
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
  // ...
  server: {
    // ...
    proxy: {
      "/ws": {
        target: getBackendTarget(),
        // ... 上記の強化された設定
      }
    }
  }
});
```

### **3. バックエンドWebSocketサーバーの互換性確保**

バックエンド側でWebSocket実装を確認し、標準的なHTTPアップグレード処理を実装：

```javascript
// server/websocket.js での推奨実装
import { WebSocketServer } from 'ws';

const wss = new WebSocketServer({
  port: 5000,
  path: '/ws',
  // Viteプロキシとの互換性を高める設定
  perMessageDeflate: false,
  clientTracking: true,
  // HTTPサーバーとの統合
  server: httpServer,
  handleProtocols: (protocols, req) => {
    console.log('WebSocket protocols:', protocols);
    return protocols[0]; // 最初のプロトコルを受け入れ
  }
});
```

### **4. WebSocket接続テスト・監視機能の実装**

```typescript
// client/src/hooks/useWebSocketDiagnostics.ts
export const useWebSocketDiagnostics = () => {
  const diagnose = async () => {
    const results = [];
    
    // 1. 直接バックエンド接続テスト
    try {
      const directWs = new WebSocket('ws://localhost:5000/ws');
      await waitForConnection(directWs);
      results.push({ type: 'direct', status: 'success' });
      directWs.close();
    } catch (error) {
      results.push({ type: 'direct', status: 'error', error });
    }
    
    // 2. Viteプロキシ経由テスト
    try {
      const proxyWs = new WebSocket('ws://localhost:5173/ws');
      await waitForConnection(proxyWs);
      results.push({ type: 'proxy', status: 'success' });
      proxyWs.close();
    } catch (error) {
      results.push({ type: 'proxy', status: 'error', error });
    }
    
    return results;
  };
  
  return { diagnose };
};
```

### **5. 開発環境の改善**

```bash
# package.json にデバッグスクリプト追加
{
  "scripts": {
    "ws-test": "node websocket-test.js",
    "dev:verbose": "DEBUG=vite:proxy npm run dev",
    "dev:ws-debug": "VITE_WS_DEBUG=true npm run dev"
  }
}
```

---

## 【潜在的リスク（将来的な問題要因）】

### **インフラ・ネットワーク関連**
1. **Docker bridge ネットワーク制限**: 高負荷時のコンテナ間通信でのパケットロス
2. **ポート枯渇**: 大量のWebSocket接続で利用可能ポート範囲の不足
3. **メモリリーク**: 長時間接続でのWebSocketコネクション蓄積
4. **DNS解決遅延**: Docker内部DNS(`meetsonar-backend`)の解決タイムアウト

### **ブラウザ・クライアント制限**
5. **同時接続制限**: Chrome/Firefoxの同一オリジンWebSocket接続数上限（通常6-8接続）
6. **Mobile Safari制限**: iOS Safariでのバックグラウンド時WebSocket強制切断
7. **企業プロキシ**: WebSocketを許可しない企業ファイアウォール環境
8. **接続状態の不整合**: ページリロード時のWebSocket状態同期問題

### **セキュリティ・認証関連**
9. **CORS pre-flight問題**: Origin検証の本番環境での厳格化
10. **Session管理**: WebSocket認証とHTTPセッションの同期問題
11. **Rate limiting**: WebSocket経由のメッセージ量制限未実装
12. **XSS攻撃**: WebSocketを経由した悪意あるスクリプト実行の可能性

### **パフォーマンス・スケーラビリティ**
13. **単一点障害**: バックエンドコンテナ1台での可用性リスク
14. **垂直スケーリング限界**: 8GB RAMでの同時接続数上限
15. **WebSocket heartbeat未実装**: 非アクティブ接続の検出・切断機能不足
16. **メッセージキューイング**: 高負荷時のメッセージ処理遅延

---

## 【追加で必要な情報】

### **技術的詳細**
- バックエンドでのWebSocketサーバー実装コード（server/websocket.js等）
- 現在のBunランタイムでのWebSocket処理実装
- エラー発生時のバックエンドログ（`docker logs meetsonar-backend`）

### **環境情報**
- Docker ComposeおよびDockerのバージョン情報
- 開発機のOS情報（Windows/macOS/Linux）
- テスト時のブラウザ種類・バージョン

### **接続パターン**
- 同時接続ユーザー数の想定最大値
- 通話セッションの平均継続時間
- WebSocketメッセージの種類・頻度

### **運用要件**
- 本番環境でのスケーリング要件
- 可用性・ダウンタイム許容範囲
- モニタリング・アラート要件