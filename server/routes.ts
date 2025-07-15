import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { signalingMessageSchema } from "@shared/schema";

interface WebSocketWithId extends WebSocket {
  participantId?: string;
  roomId?: string;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // REST API routes
  app.get("/api/rooms/:roomId", async (req, res) => {
    try {
      const room = await storage.getRoom(req.params.roomId);
      if (!room) {
        return res.status(404).json({ error: "Room not found" });
      }
      res.json(room);
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/rooms", async (req, res) => {
    try {
      const room = await storage.createRoom(req.body);
      res.status(201).json(room);
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/rooms/:roomId/participants", async (req, res) => {
    try {
      const participants = await storage.getParticipants(req.params.roomId);
      res.json(participants);
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  const httpServer = createServer(app);

  // WebSocket server for signaling
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws: WebSocketWithId) => {
    console.log('New WebSocket connection');

    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());
        const validatedMessage = signalingMessageSchema.parse(message);
        
        switch (validatedMessage.type) {
          case 'join-room':
            await handleJoinRoom(ws, validatedMessage, wss);
            break;
          
          case 'leave-room':
            await handleLeaveRoom(ws, validatedMessage, wss);
            break;
          
          case 'offer':
          case 'answer':
          case 'ice-candidate':
            await handleSignalingMessage(ws, validatedMessage, wss);
            break;
          
          case 'participant-update':
            await handleParticipantUpdate(ws, validatedMessage, wss);
            break;
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
        ws.send(JSON.stringify({ 
          type: 'error', 
          message: 'Invalid message format' 
        }));
      }
    });

    ws.on('close', async () => {
      if (ws.participantId && ws.roomId) {
        await handleLeaveRoom(ws, {
          type: 'leave-room',
          roomId: ws.roomId,
          participantId: ws.participantId,
          payload: {}
        }, wss);
      }
    });
  });

  async function handleJoinRoom(ws: WebSocketWithId, message: any, wss: WebSocketServer) {
    const { roomId, participantId, payload } = message;
    
    ws.participantId = participantId;
    ws.roomId = roomId;

    // Ensure room exists
    let room = await storage.getRoom(roomId);
    if (!room) {
      room = await storage.createRoom({
        id: roomId,
        name: `Room ${roomId}`,
        maxParticipants: 10,
        isActive: true
      });
    }

    // Add participant to room
    const participant = await storage.addParticipant({
      roomId,
      displayName: payload.displayName,
      isHost: false,
      isMuted: false,
      isVideoEnabled: false,
      connectionId: participantId
    });

    // Get all participants in room
    const participants = await storage.getParticipants(roomId);

    // Send current participants list to new participant
    ws.send(JSON.stringify({
      type: 'participants-list',
      payload: participants
    }));

    // Notify other participants about new participant
    broadcastToRoom(wss, roomId, {
      type: 'participant-joined',
      payload: participant
    }, participantId);
    
    console.log(`Participant ${participantId} joined room ${roomId}`);
  }

  async function handleLeaveRoom(ws: WebSocketWithId, message: any, wss: WebSocketServer) {
    const { roomId, participantId } = message;

    // Remove participant from storage
    await storage.removeParticipant(roomId, participantId);

    // Notify other participants
    broadcastToRoom(wss, roomId, {
      type: 'participant-left',
      payload: { connectionId: participantId }
    }, participantId);
    
    console.log(`Participant ${participantId} left room ${roomId}`);

    ws.participantId = undefined;
    ws.roomId = undefined;
  }

  async function handleSignalingMessage(ws: WebSocketWithId, message: any, wss: WebSocketServer) {
    const { roomId, participantId, targetParticipant, payload } = message;

    console.log(`Forwarding ${message.type} from ${participantId} to ${targetParticipant || 'all'}`);

    // Forward signaling message to target participant or all participants
    wss.clients.forEach((client: WebSocketWithId) => {
      if (client.readyState === WebSocket.OPEN && 
          client.roomId === roomId && 
          client.participantId !== participantId) {
        
        // If targetParticipant is specified, only send to that participant
        if (targetParticipant && client.participantId !== targetParticipant) {
          return;
        }
        
        client.send(JSON.stringify({
          type: message.type,
          participantId: participantId,
          payload: payload
        }));
      }
    });
  }

  async function handleParticipantUpdate(ws: WebSocketWithId, message: any, wss: WebSocketServer) {
    const { roomId, participantId, payload } = message;

    // Update participant in storage
    await storage.updateParticipant(roomId, participantId, payload);

    // Broadcast update to other participants
    broadcastToRoom(wss, roomId, {
      type: 'participant-updated',
      participantId: participantId,
      payload: payload
    }, participantId);
  }

  function broadcastToRoom(wss: WebSocketServer, roomId: string, message: any, excludeParticipant?: string) {
    wss.clients.forEach((client: WebSocketWithId) => {
      if (client.readyState === WebSocket.OPEN && 
          client.roomId === roomId && 
          client.participantId !== excludeParticipant) {
        client.send(JSON.stringify(message));
      }
    });
  }

  return httpServer;
}
