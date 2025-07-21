// Simple Bun server for MeetSonar
import { storage } from "./storage";
import { createWebSocketHandler } from "./websocket-handler";

const port = parseInt(process.env.PORT || "5000", 10);

// データベース接続確認
console.log("Connecting to PostgreSQL database:", process.env.DATABASE_URL?.replace(/\/\/.*@/, "//***@"));

function log(message: string) {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`${timestamp} [bun] ${message}`);
}

const server = Bun.serve({
  port,
  hostname: "0.0.0.0",
  async fetch(req: Request, server: any) {
    const url = new URL(req.url, `http://${req.headers.get('host') || 'localhost'}`);
    const start = Date.now();
    
    // WebSocketアップグレード処理
    if (url.pathname === "/ws") {
      console.log("WebSocket upgrade request received");
      console.log("Headers:", Object.fromEntries(req.headers.entries()));
      
      const success = server.upgrade(req, {
        data: {
          participantId: undefined,
          roomId: undefined,
        },
      });
      
      if (!success) {
        console.error("WebSocket upgrade failed");
        return new Response("WebSocket upgrade failed", { status: 400 });
      }
      
      console.log("WebSocket upgrade successful");
      return undefined;
    }
    
    // API routes handling
    if (url.pathname.startsWith('/api/')) {
      let response: Response;
      try {
        if (url.pathname.match(/^\/api\/rooms\/([^\/]+)\/participants$/)) {
          const roomId = url.pathname.split('/')[3];
          const participants = await storage.getParticipants(roomId);
          response = new Response(JSON.stringify(participants), {
            headers: { 'Content-Type': 'application/json' }
          });
        } else if (url.pathname.match(/^\/api\/rooms\/([^\/]+)$/) && req.method === 'GET') {
          const roomId = url.pathname.split('/')[3];
          const room = await storage.getRoom(roomId);
          if (!room) {
            response = new Response(JSON.stringify({ error: "Room not found" }), {
              status: 404,
              headers: { 'Content-Type': 'application/json' }
            });
          } else {
            response = new Response(JSON.stringify(room), {
              headers: { 'Content-Type': 'application/json' }
            });
          }
        } else if (url.pathname === '/api/rooms' && req.method === 'POST') {
          const body = await req.json();
          const room = await storage.createRoom(body);
          response = new Response(JSON.stringify(room), {
            status: 201,
            headers: { 'Content-Type': 'application/json' }
          });
        } else if (url.pathname.match(/^\/api\/rooms\/([^\/]+)\/messages$/) && req.method === 'GET') {
          const roomId = url.pathname.split('/')[3];
          const messages = await storage.getChatHistory(roomId);
          response = new Response(JSON.stringify(messages), {
            headers: { 'Content-Type': 'application/json' }
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
            headers: { 'Content-Type': 'application/json' }
          });
        } else if (url.pathname === '/api/rooms' && req.method === 'GET') {
          // Room list endpoint if needed
          response = new Response(JSON.stringify([]), {
            headers: { 'Content-Type': 'application/json' }
          });
        } else {
          response = new Response(JSON.stringify({ error: "Not found" }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' }
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
          headers: { 'Content-Type': 'application/json' }
        });
        
        const duration = Date.now() - start;
        log(`${req.method} ${url.pathname} 500 in ${duration}ms :: {"error":"Internal server error"}`);
        
        return errorResponse;
      }
    }
    
    // 静的ファイルまたはフロントエンド
    return new Response("Not Found", { status: 404 });
  },
  websocket: createWebSocketHandler(),
});

log(`serving on port ${port}`);
