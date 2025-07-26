import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import jwt from 'jsonwebtoken';
import { RateLimiterMemory } from 'rate-limiter-flexible';
import { storage } from './storage';
import { signalingMessageSchema } from '@shared/schema-sqlite';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-change-in-production';

// In-memory rate limiters (8GB environment optimization)
const socketRateLimiter = new RateLimiterMemory({
  points: 100, // Number of requests
  duration: 60, // Per 60 seconds
  blockDuration: 60, // Block for 60 seconds if exceeded
});

const chatRateLimiter = new RateLimiterMemory({
  points: 50, // Number of chat messages
  duration: 60, // Per 60 seconds
  blockDuration: 30, // Block for 30 seconds if exceeded
});

const webrtcRateLimiter = new RateLimiterMemory({
  points: 200, // Number of WebRTC signals
  duration: 60, // Per 60 seconds
  blockDuration: 10, // Block for 10 seconds if exceeded
});

// Socket.IO server instance
let io: SocketIOServer | null = null;

// Connection tracking (8GB environment optimization)
const connections = new Map<string, any>();
const roomParticipants = new Map<string, Set<string>>();

// Rate limiting function
async function checkRateLimit(socketId: string, limiter: any): Promise<boolean> {
  try {
    await limiter.consume(socketId);
    return true;
  } catch (rejRes: any) {
    console.warn(`Rate limit exceeded for socket ${socketId}: ${rejRes.msBeforeNext}ms`);
    return false;
  }
}

// Session management (in-memory for 8GB environment)
const sessions = new Map<string, any>();

async function storeSession(sessionId: string, data: any): Promise<void> {
  sessions.set(sessionId, data);
}

async function getSession(sessionId: string): Promise<any | null> {
  return sessions.get(sessionId) || null;
}

interface AuthenticatedSocket {
  id: string;
  participantId?: string;
  roomId?: string;
  displayName?: string;
  authenticated: boolean;
  lastActivity: number;
}

// JWT authentication middleware
function authenticateSocket(token: string): { valid: boolean; participantId?: string } {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    return { valid: true, participantId: decoded.participantId };
  } catch (error) {
    console.warn('Socket authentication failed:', error);
    return { valid: false };
  }
}

// Create Socket.IO server instance
export function createSocketIOServer(httpServer: HTTPServer): SocketIOServer {
  if (io) {
    return io;
  }

  io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.NODE_ENV === 'production'
        ? process.env.FRONTEND_URL || false
        : ["http://localhost:5173", "http://localhost:3000"],
      methods: ["GET", "POST"],
      credentials: true,
    },
    // Connection options for reliability
    pingTimeout: 60000,
    pingInterval: 25000,
    upgradeTimeout: 10000,
    allowUpgrades: true,
    transports: ['websocket', 'polling'],
  });

  // Authentication middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    const roomId = socket.handshake.query.roomId as string;
    const displayName = socket.handshake.query.displayName as string;

    // For development, allow connections without JWT token
    if (process.env.NODE_ENV === 'development' && !token) {
      (socket as any).authenticated = false;
      (socket as any).roomId = roomId;
      (socket as any).displayName = displayName;
      (socket as any).participantId = `guest-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      (socket as any).lastActivity = Date.now();
      return next();
    }

    // Production authentication
    if (!token) {
      return next(new Error('Authentication token required'));
    }

    const auth = authenticateSocket(token);
    if (!auth.valid) {
      return next(new Error('Invalid authentication token'));
    }

    (socket as any).authenticated = true;
    (socket as any).participantId = auth.participantId;
    (socket as any).roomId = roomId;
    (socket as any).displayName = displayName;
    (socket as any).lastActivity = Date.now();

    next();
  });

  // Connection handling
  io.on('connection', (socket) => {
    const timestamp = new Date().toISOString();
    const socketData = socket as any as AuthenticatedSocket;

    console.log(`[${timestamp}] 🔗 Socket.IO connection: ${socket.id}`);
    console.log(`[${timestamp}] Participant: ${socketData.participantId}, Room: ${socketData.roomId}`);

    // Track connection
    connections.set(socket.id, socket);

    // Message rate limiting with Redis
    socket.use(async (packet, next) => {
      const canProceed = await checkRateLimit(socket.id, socketRateLimiter);
      if (!canProceed) {
        socket.emit('error', { type: 'rate_limit_exceeded', message: 'Too many messages' });
        return;
      }
      next();
    });

    // Handle room joining
    socket.on('join-room', async (data) => {
      try {
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] 📥 join-room request:`, data);

        const validatedData = signalingMessageSchema.parse(data);
        const { roomId, participantId, payload } = validatedData;

        // Ensure required fields are present
        if (!roomId || !participantId) {
          socket.emit('error', { type: 'invalid_request', message: 'Room ID and Participant ID are required' });
          return;
        }

        // Update socket data
        socketData.roomId = roomId;
        socketData.participantId = participantId;
        socketData.displayName = payload?.displayName || 'Unknown';
        socketData.lastActivity = Date.now();

        // Join the Socket.IO room
        await socket.join(roomId);

        // Track room participants
        if (!roomParticipants.has(roomId)) {
          roomParticipants.set(roomId, new Set());
        }
        roomParticipants.get(roomId)!.add(participantId);

        // Store participant in storage
        await storage.addParticipant({
          roomId,
          userId: null,
          displayName: payload?.displayName || 'Unknown',
          isHost: false,
          isMuted: false,
          isVideoEnabled: true,
          connectionId: socket.id,
        });

        // Get current participants
        const participants = await storage.getParticipants(roomId);

        // Notify all participants in the room about the new participant
        socket.to(roomId).emit('participant-joined', {
          type: 'participant-joined',
          roomId,
          participantId,
          payload: {
            displayName: payload?.displayName || 'Unknown',
            participants: participants,
          },
        });

        // Send current participants list to the new participant
        socket.emit('room-joined', {
          type: 'room-joined',
          roomId,
          participantId,
          payload: {
            participants: participants,
            participantId: participantId,
          },
        });

        console.log(`[${timestamp}] ✅ Participant ${participantId} joined room ${roomId}`);

      } catch (error) {
        console.error('Error handling join-room:', error);
        socket.emit('error', { type: 'join_room_failed', message: 'Failed to join room' });
      }
    });

    // Handle WebRTC signaling
    socket.on('webrtc-signal', (data) => {
      try {
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] 📡 WebRTC signaling:`, data.type, 'to', data.targetParticipantId);

        socketData.lastActivity = Date.now();

        // Forward the signaling message to the target participant
        socket.to(socketData.roomId!).emit('webrtc-signal', {
          ...data,
          fromParticipantId: socketData.participantId,
        });

      } catch (error) {
        console.error('Error handling WebRTC signaling:', error);
        socket.emit('error', { type: 'signaling_failed', message: 'Failed to process signaling' });
      }
    });

    // Handle chat messages with additional rate limiting
    socket.on('chat-message', async (data) => {
      try {
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] 💬 Chat message:`, data);

        // Additional rate limiting for chat messages
        const canSendChat = await checkRateLimit(socket.id, chatRateLimiter);
        if (!canSendChat) {
          socket.emit('error', { type: 'chat_rate_limit_exceeded', message: 'Too many chat messages' });
          return;
        }

        socketData.lastActivity = Date.now();

        const { roomId, message } = data;
        const chatMessage = {
          roomId,
          participantId: socketData.participantId!,
          displayName: socketData.displayName!,
          message,
          type: 'text',
          createdAt: new Date().toISOString(),
        };

        // Store in database
        await storage.addChatMessage(chatMessage);

        // Broadcast to all participants in the room
        io!.to(roomId).emit('chat-message', {
          type: 'chat-message',
          roomId,
          participantId: socketData.participantId!,
          payload: chatMessage,
        });

        console.log(`[${timestamp}] ✅ Chat message sent in room ${roomId}`);

      } catch (error) {
        console.error('Error handling chat message:', error);
        socket.emit('error', { type: 'chat_failed', message: 'Failed to send chat message' });
      }
    });

    // Handle chat history request with Redis cache
    socket.on('request-chat-history', async (data) => {
      try {
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] 📚 Chat history request:`, data);

        socketData.lastActivity = Date.now();

        const { roomId } = data;

        // Get chat history from database
        const messages = await storage.getChatHistory(roomId);
        console.log(`[${timestamp}] 🗄️ Chat history from database (${messages.length} messages)`);

        socket.emit('chat-history', {
          type: 'chat-history',
          roomId,
          participantId: socketData.participantId!,
          payload: { messages },
        });

        console.log(`[${timestamp}] ✅ Chat history sent (${messages.length} messages)`);

      } catch (error) {
        console.error('Error handling chat history request:', error);
        socket.emit('error', { type: 'chat_history_failed', message: 'Failed to get chat history' });
      }
    });

    // Handle ping for heartbeat
    socket.on('ping', () => {
      socketData.lastActivity = Date.now();
      socket.emit('pong');
    });

    // Handle leave room
    socket.on('leave-room', async () => {
      await handleDisconnection(socket, 'leave-room');
    });

    // Handle disconnection
    socket.on('disconnect', async (reason) => {
      console.log(`[${new Date().toISOString()}] 🔌 Socket disconnected: ${socket.id}, reason: ${reason}`);
      await handleDisconnection(socket, reason);
    });

    // Error handling
    socket.on('error', (error) => {
      console.error(`[${new Date().toISOString()}] ❌ Socket error:`, error);
    });
  });

  // Cleanup inactive connections every 5 minutes
  setInterval(() => {
    const now = Date.now();
    const TIMEOUT = 5 * 60 * 1000; // 5 minutes

    connections.forEach((socket, socketId) => {
      const socketData = socket as any as AuthenticatedSocket;
      if (now - socketData.lastActivity > TIMEOUT) {
        console.log(`[${new Date().toISOString()}] 🧹 Cleaning up inactive socket: ${socketId}`);
        socket.disconnect(true);
      }
    });
  }, 5 * 60 * 1000);

  return io;
}

// Handle disconnection cleanup
async function handleDisconnection(socket: any, reason: string) {
  const timestamp = new Date().toISOString();
  const socketData = socket as AuthenticatedSocket;

  try {
    if (socketData.roomId && socketData.participantId) {
      // Remove from room participants
      const participants = roomParticipants.get(socketData.roomId);
      if (participants) {
        participants.delete(socketData.participantId);
        if (participants.size === 0) {
          roomParticipants.delete(socketData.roomId);
        }
      }

      // Remove from storage
      await storage.removeParticipant(socketData.roomId, socketData.participantId);

      // Notify other participants
      socket.to(socketData.roomId).emit('participant-left', {
        type: 'participant-left',
        roomId: socketData.roomId,
        participantId: socketData.participantId,
        payload: { reason },
      });

      console.log(`[${timestamp}] 👋 Participant ${socketData.participantId} left room ${socketData.roomId}`);
    }

    // Remove from connections
    connections.delete(socket.id);

    // Note: Rate limiting cleanup is handled by Redis TTL

  } catch (error) {
    console.error('Error handling disconnection:', error);
  }
}

// Get Socket.IO server instance
export function getSocketIOServer(): SocketIOServer | null {
  return io;
}

// Clean shutdown
export function closeSocketIOServer() {
  if (io) {
    io.close();
    io = null;
    connections.clear();
    roomParticipants.clear();
    sessions.clear();
  }
}

export function shutdownSocketIOServer(): void {
  if (io) {
    io.close();
    io = null;
    connections.clear();
    roomParticipants.clear();
    sessions.clear();
  }
}
