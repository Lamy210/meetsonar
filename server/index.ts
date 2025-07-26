// Socket.IO enabled Bun server for MeetSonar - Unified Port
import { createServer } from 'http';
import { storage } from "./storage";
import { createSocketIOServer } from "./socketio-handler";
import path from 'path';
import fs from 'fs';

const port = parseInt(process.env.PORT || "5000", 10);

// データベース接続確認
console.log("Connecting to SQLite database:", process.env.DATABASE_PATH || "data.db");

function log(message: string) {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`${timestamp} [unified] ${message}`);
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

// HTTP API handler for unified server
async function handleHttpRequest(req: any, res: any) {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const start = Date.now();

  // OPTIONSリクエスト（プリフライト）の処理
  if (req.method === 'OPTIONS') {
    res.writeHead(204, addCorsHeaders());
    res.end();
    return;
  }

  try {
    // API routes handling
    if (url.pathname.startsWith('/api/')) {
      if (url.pathname.match(/^\/api\/rooms\/([^\/]+)\/participants$/)) {
        const roomId = url.pathname.split('/')[3];
        const participants = await storage.getParticipants(roomId);
        res.writeHead(200, addCorsHeaders({ 'Content-Type': 'application/json' }));
        res.end(JSON.stringify(participants));
      } else if (url.pathname.match(/^\/api\/rooms\/([^\/]+)$/) && req.method === 'GET') {
        const roomId = url.pathname.split('/')[3];
        const room = await storage.getRoom(roomId);
        if (!room) {
          res.writeHead(404, addCorsHeaders({ 'Content-Type': 'application/json' }));
          res.end(JSON.stringify({ error: "Room not found" }));
        } else {
          res.writeHead(200, addCorsHeaders({ 'Content-Type': 'application/json' }));
          res.end(JSON.stringify(room));
        }
      } else if (url.pathname === '/api/rooms' && req.method === 'POST') {
        let body = '';
        req.on('data', (chunk: any) => body += chunk);
        req.on('end', async () => {
          try {
            const roomData = JSON.parse(body);
            const room = await storage.createRoom(roomData);
            res.writeHead(201, addCorsHeaders({ 'Content-Type': 'application/json' }));
            res.end(JSON.stringify(room));
          } catch (error) {
            res.writeHead(400, addCorsHeaders({ 'Content-Type': 'application/json' }));
            res.end(JSON.stringify({ error: "Invalid JSON" }));
          }
        });
      } else if (url.pathname.match(/^\/api\/rooms\/([^\/]+)\/messages$/) && req.method === 'GET') {
        const roomId = url.pathname.split('/')[3];
        const messages = await storage.getChatHistory(roomId);
        res.writeHead(200, addCorsHeaders({ 'Content-Type': 'application/json' }));
        res.end(JSON.stringify(messages));
      } else if (url.pathname.match(/^\/api\/rooms\/([^\/]+)\/messages$/) && req.method === 'POST') {
        const roomId = url.pathname.split('/')[3];
        let body = '';
        req.on('data', (chunk: any) => body += chunk);
        req.on('end', async () => {
          try {
            const messageData = JSON.parse(body);
            const message = await storage.addChatMessage({ ...messageData, roomId });
            res.writeHead(201, addCorsHeaders({ 'Content-Type': 'application/json' }));
            res.end(JSON.stringify(message));
          } catch (error) {
            res.writeHead(400, addCorsHeaders({ 'Content-Type': 'application/json' }));
            res.end(JSON.stringify({ error: "Invalid message data" }));
          }
        });
      } else {
        res.writeHead(404, addCorsHeaders({ 'Content-Type': 'application/json' }));
        res.end(JSON.stringify({ error: "API endpoint not found" }));
      }
    } else if (url.pathname === '/health') {
      res.writeHead(200, addCorsHeaders({ 'Content-Type': 'application/json' }));
      res.end(JSON.stringify({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        services: {
          socketio: 'running',
          api: 'running',
          database: 'sqlite'
        }
      }));
    } else {
      // Socket.IO and other requests pass through
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found - WebSocket connections use /socket.io/');
    }

    // Log API requests
    const duration = Date.now() - start;
    log(`${req.method} ${url.pathname} - ${res.statusCode} (${duration}ms)`);
  } catch (error) {
    console.error('HTTP request error:', error);
    res.writeHead(500, addCorsHeaders({ 'Content-Type': 'application/json' }));
    res.end(JSON.stringify({ error: 'Internal server error' }));
  }
}

// Create unified HTTP server for both Socket.IO and API
const httpServer = createServer(handleHttpRequest);

// Create Socket.IO server
const io = createSocketIOServer(httpServer);

// Start unified server on single port
httpServer.listen(port, '0.0.0.0', () => {
  log(`🚀 Unified server (Socket.IO + HTTP API) listening on port ${port}`);
  log(`📡 WebSocket endpoint: ws://localhost:${port}/socket.io/`);
  log(`🔗 HTTP API endpoint: http://localhost:${port}/api/`);
  log(`💊 Health check: http://localhost:${port}/health`);
});

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

export { io };