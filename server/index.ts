// Socket.IO enabled Bun server for MeetSonar
import { createServer } from 'http';
import { storage } from "./storage";
import { createSocketIOServer } from "./socketio-handler";

const port = parseInt(process.env.PORT || "5000", 10);

// データベース接続確認
console.log("Connecting to SQLite database:", process.env.DATABASE_PATH || "data.db");

function log(message: string) {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`${timestamp} [bun] ${message}`);
}

// CORS対応のヘルパー関数
function addCorsHeaders(headers: HeadersInit = {}): Headers {
  const corsHeaders = new Headers(headers);
  // 開発環境では広い許可、本番環境では制限
  const allowedOrigins = process.env.NODE_ENV === 'production' 
    ? (process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : ['https://yourdomain.com'])
    : ['http://localhost:5173', 'http://localhost:3000'];
    
  corsHeaders.set('Access-Control-Allow-Origin', process.env.NODE_ENV === 'production' ? (process.env.FRONTEND_URL || 'https://yourdomain.com') : '*');
  corsHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  corsHeaders.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, Origin');
  corsHeaders.set('Access-Control-Allow-Credentials', 'true');
  corsHeaders.set('Vary', 'Origin');
  return corsHeaders;
}

// Create HTTP server for Socket.IO
const httpServer = createServer();

// Create Socket.IO server
const io = createSocketIOServer(httpServer);

// Start Socket.IO server
httpServer.listen(port, '0.0.0.0', () => {
  log(`Socket.IO server listening on port ${port}`);
});

// Create Bun server for HTTP API endpoints (on port+1)
const apiPort = port + 1;
const server = Bun.serve({
  port: apiPort,
  hostname: "0.0.0.0",
  development: process.env.NODE_ENV === 'development',
  maxRequestBodySize: 1024 * 1024 * 10, // 10MB
  async fetch(req: Request) {
    const url = new URL(req.url, `http://${req.headers.get('host') || 'localhost'}`);
    const start = Date.now();
    
    // OPTIONSリクエスト（プリフライト）の処理
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: addCorsHeaders()
      });
    }
    
    // API routes handling
    if (url.pathname.startsWith('/api/')) {
      let response: Response;
      try {
        if (url.pathname.match(/^\/api\/rooms\/([^\/]+)\/participants$/)) {
          const roomId = url.pathname.split('/')[3];
          const participants = await storage.getParticipants(roomId);
          response = new Response(JSON.stringify(participants), {
            headers: addCorsHeaders({ 'Content-Type': 'application/json' })
          });
        } else if (url.pathname.match(/^\/api\/rooms\/([^\/]+)$/) && req.method === 'GET') {
          const roomId = url.pathname.split('/')[3];
          const room = await storage.getRoom(roomId);
          if (!room) {
            response = new Response(JSON.stringify({ error: "Room not found" }), {
              status: 404,
              headers: addCorsHeaders({ 'Content-Type': 'application/json' })
            });
          } else {
            response = new Response(JSON.stringify(room), {
              headers: addCorsHeaders({ 'Content-Type': 'application/json' })
            });
          }
        } else if (url.pathname === '/api/rooms' && req.method === 'POST') {
          const body = await req.json();
          const room = await storage.createRoom(body);
          response = new Response(JSON.stringify(room), {
            status: 201,
            headers: addCorsHeaders({ 'Content-Type': 'application/json' })
          });
        } else if (url.pathname.match(/^\/api\/rooms\/([^\/]+)\/messages$/) && req.method === 'GET') {
          const roomId = url.pathname.split('/')[3];
          const messages = await storage.getChatHistory(roomId);
          response = new Response(JSON.stringify(messages), {
            headers: addCorsHeaders({ 'Content-Type': 'application/json' })
          });
        } else if (url.pathname.match(/^\/api\/rooms\/([^\/]+)\/messages$/) && req.method === 'POST') {
          const roomId = url.pathname.split('/')[3];
          const body = await req.json();
          const message = await storage.addChatMessage({
            ...body,
            roomId
          });
          response = new Response(JSON.stringify(message), {
            status: 201,
            headers: addCorsHeaders({ 'Content-Type': 'application/json' })
          });
        } else if (url.pathname === '/api/rooms' && req.method === 'GET') {
          // Room list endpoint if needed
          response = new Response(JSON.stringify([]), {
            headers: addCorsHeaders({ 'Content-Type': 'application/json' })
          });
        } else {
          response = new Response(JSON.stringify({ error: "Not found" }), {
            status: 404,
            headers: addCorsHeaders({ 'Content-Type': 'application/json' })
          });
        }
        
        // ログ出力
        const duration = Date.now() - start;
        let logLine = `${req.method} ${url.pathname} ${response.status} in ${duration}ms`;
        if (response.status < 400) {
          try {
            const responseText = await response.clone().text();
            const responseData = JSON.parse(responseText);
            logLine += ` :: ${JSON.stringify(responseData)}`;
          } catch {
            // レスポンスデータの解析に失敗した場合は無視
          }
        }
        if (logLine.length > 80) {
          logLine = logLine.slice(0, 79) + "…";
        }
        log(logLine);
        
        return response;
      } catch (error) {
        console.error('API Error:', error);
        console.error('Error stack:', error instanceof Error ? error.stack : 'No stack available');
        console.error('Error message:', error instanceof Error ? error.message : String(error));
        const errorResponse = new Response(JSON.stringify({ 
          error: "Internal server error",
          details: error instanceof Error ? error.message : String(error)
        }), {
          status: 500,
          headers: addCorsHeaders({ 'Content-Type': 'application/json' })
        });
        
        const duration = Date.now() - start;
        log(`${req.method} ${url.pathname} 500 in ${duration}ms :: {"error":"Internal server error"}`);
        
        return errorResponse;
      }
    }
    
    // 静的ファイルまたはフロントエンド
    return new Response("Not Found", { 
      status: 404,
      headers: addCorsHeaders()
    });
  }
});

log(`API server serving on port ${apiPort}`);

// Graceful shutdown
process.on('SIGTERM', () => {
  log('SIGTERM received, shutting down gracefully');
  httpServer.close(() => {
    log('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  log('SIGINT received, shutting down gracefully');
  httpServer.close(() => {
    log('HTTP server closed');
    process.exit(0);
  });
});
