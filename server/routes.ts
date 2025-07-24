import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import type { IncomingMessage } from "http";
import { storage } from "./storage";
import { signalingMessageSchema, inviteUserSchema, respondToInviteSchema } from "@shared/schema";
import crypto from "crypto";

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

  // Invitation routes
  app.post("/api/rooms/:roomId/invite", async (req, res) => {
    try {
      const result = inviteUserSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: "Invalid request data", details: result.error.issues });
      }

      const inviteData = result.data;
      
      // Check if room exists
      const room = await storage.getRoom(req.params.roomId);
      if (!room) {
        return res.status(404).json({ error: "Room not found" });
      }

      // Generate invite token
      const inviteToken = crypto.randomBytes(32).toString('hex');
      
      // Calculate expiration time
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + inviteData.expirationHours);

      // Create invitation
      const invitation = await storage.createInvitation({
        roomId: req.params.roomId,
        inviterDisplayName: inviteData.inviterDisplayName,
        inviteeEmail: inviteData.inviteeEmail,
        inviteeDisplayName: inviteData.inviteeDisplayName,
        inviteToken,
        expiresAt,
      });

      // Generate invitation link
      const inviteLink = `${req.protocol}://${req.get('host')}/invite/${inviteToken}`;

      res.status(201).json({
        invitation,
        inviteLink,
        message: "Invitation created successfully"
      });
    } catch (error) {
      console.error("Error creating invitation:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/invitations/:token", async (req, res) => {
    try {
      const invitation = await storage.getInvitationByToken(req.params.token);
      if (!invitation) {
        return res.status(404).json({ error: "Invitation not found" });
      }

      // Check if invitation is expired
      if (new Date() > invitation.expiresAt) {
        return res.status(410).json({ error: "Invitation has expired" });
      }

      // Check if invitation is already responded to
      if (invitation.status !== 'pending') {
        return res.status(400).json({ error: `Invitation already ${invitation.status}` });
      }

      // Get room information
      const room = await storage.getRoom(invitation.roomId);
      if (!room) {
        return res.status(404).json({ error: "Associated room not found" });
      }

      res.json({
        invitation: {
          id: invitation.id,
          roomId: invitation.roomId,
          roomName: room.name,
          inviterDisplayName: invitation.inviterDisplayName,
          inviteeEmail: invitation.inviteeEmail,
          createdAt: invitation.createdAt,
          expiresAt: invitation.expiresAt,
        },
        room: {
          id: room.id,
          name: room.name,
          maxParticipants: room.maxParticipants,
        }
      });
    } catch (error) {
      console.error("Error getting invitation:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/invitations/:token/respond", async (req, res) => {
    try {
      const result = respondToInviteSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: "Invalid request data", details: result.error.issues });
      }

      const { action, displayName } = result.data;
      
      const invitation = await storage.getInvitationByToken(req.params.token);
      if (!invitation) {
        return res.status(404).json({ error: "Invitation not found" });
      }

      // Check if invitation is expired
      if (new Date() > invitation.expiresAt) {
        return res.status(410).json({ error: "Invitation has expired" });
      }

      // Check if invitation is already responded to
      if (invitation.status !== 'pending') {
        return res.status(400).json({ error: `Invitation already ${invitation.status}` });
      }

      // Update invitation status
      const updatedInvitation = await storage.updateInvitationStatus(invitation.id, action);

      if (action === 'accept') {
        // Get room information for redirect
        const room = await storage.getRoom(invitation.roomId);
        const joinLink = `${req.protocol}://${req.get('host')}/room/${invitation.roomId}${displayName ? `?displayName=${encodeURIComponent(displayName)}` : ''}`;
        
        res.json({
          message: "Invitation accepted successfully",
          invitation: updatedInvitation,
          joinLink,
          room
        });
      } else {
        res.json({
          message: "Invitation declined",
          invitation: updatedInvitation
        });
      }
    } catch (error) {
      console.error("Error responding to invitation:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/rooms/:roomId/invitations", async (req, res) => {
    try {
      const invitations = await storage.getInvitationsByRoom(req.params.roomId);
      res.json(invitations);
    } catch (error) {
      console.error("Error getting room invitations:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  const httpServer = createServer(app);

  // WebSocket server for signaling
  const wss = new WebSocketServer({ 
    server: httpServer, 
    path: '/ws',
    maxPayload: 1024 * 1024, // 1MBの制限
  });

  // 接続数を監視するためのカウンター
  let connectionCount = 0;
  const MAX_CONNECTIONS = 1000;

  wss.on('connection', (ws: WebSocketWithId, req: IncomingMessage) => {
    connectionCount++;
    console.log(`New WebSocket connection (${connectionCount}/${MAX_CONNECTIONS})`);

    // 接続数制限
    if (connectionCount > MAX_CONNECTIONS) {
      console.warn('Max connections reached, closing new connection');
      ws.close(1013, 'Server overloaded');
      connectionCount--;
      return;
    }

    ws.on('message', async (data: Buffer) => {
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

          case 'chat-message':
            await handleChatMessage(ws, validatedMessage, wss);
            break;

          case 'chat-history':
            await handleChatHistory(ws, validatedMessage);
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
      connectionCount--;
      console.log(`WebSocket connection closed (${connectionCount}/${MAX_CONNECTIONS})`);
      
      if (ws.participantId && ws.roomId) {
        await handleLeaveRoom(ws, {
          type: 'leave-room',
          roomId: ws.roomId,
          participantId: ws.participantId,
          payload: {}
        }, wss);
      }
    });

    ws.on('error', (error: Error) => {
      console.error('WebSocket error:', error);
      connectionCount--;
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

    // Validate signaling message has required fields
    if (!payload) {
      console.error("Signaling message missing payload:", message.type);
      return;
    }

    // For offers and answers, ensure SDP content exists
    if ((message.type === 'offer' || message.type === 'answer') &&
      (!payload.sdp || payload.sdp.trim().length === 0)) {
      console.error(`Invalid ${message.type} - missing or empty SDP from ${participantId}`);
      return;
    }

    // Forward signaling message to target participant or all participants
    wss.clients.forEach((client: WebSocketWithId) => {
      if (client.readyState === WebSocket.OPEN &&
        client.roomId === roomId &&
        client.participantId !== participantId) {

        // If targetParticipant is specified, only send to that participant
        if (targetParticipant && client.participantId !== targetParticipant) {
          return;
        }

        console.log(`Sending ${message.type} to ${client.participantId}`);
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

  async function handleChatMessage(ws: WebSocketWithId, message: any, wss: WebSocketServer) {
    console.log("=== handleChatMessage called ===");
    console.log("Full message:", JSON.stringify(message, null, 2));

    const { roomId, participantId, payload } = message;

    console.log("Extracted data:", { roomId, participantId, payload });

    try {
      // サニタイゼーション - XSS攻撃を防ぐ
      const sanitizedMessage = payload.message
        ?.toString()
        .trim()
        .slice(0, 1000) // 最大1000文字に制限
        .replace(/[<>]/g, ''); // HTMLタグを除去

      const sanitizedDisplayName = payload.displayName
        ?.toString()
        .trim()
        .slice(0, 50) // 最大50文字に制限
        .replace(/[<>]/g, ''); // HTMLタグを除去

      console.log("Sanitized data:", { sanitizedMessage, sanitizedDisplayName });

      if (!sanitizedMessage || !sanitizedDisplayName) {
        console.warn("❌ Invalid message content:", { sanitizedMessage, sanitizedDisplayName });
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Invalid message content'
        }));
        return;
      }

      // Save chat message to storage
      console.log("💾 Saving chat message to database...");
      const chatMessage = await storage.addChatMessage({
        roomId,
        participantId: participantId || 'unknown',
        displayName: sanitizedDisplayName,
        message: sanitizedMessage,
        type: payload.type || 'text'
      });

      // Broadcast chat message to all participants in room
      broadcastToRoom(wss, roomId, {
        type: 'chat-message',
        payload: chatMessage
      });

      console.log(`Chat message in room ${roomId} from ${sanitizedDisplayName}: ${sanitizedMessage}`);
    } catch (error) {
      console.error('Error handling chat message:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Failed to send chat message'
      }));
    }
  }

  async function handleChatHistory(ws: WebSocketWithId, message: any) {
    const { roomId } = message;

    try {
      // Get chat history for the room
      const chatHistory = await storage.getChatHistory(roomId);

      // Send chat history to requesting participant
      ws.send(JSON.stringify({
        type: 'chat-history',
        payload: chatHistory
      }));
    } catch (error) {
      console.error('Error fetching chat history:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Failed to fetch chat history'
      }));
    }
  }

  function broadcastToRoom(wss: WebSocketServer, roomId: string, message: any, excludeParticipant?: string) {
    const messageStr = JSON.stringify(message);
    let sentCount = 0;
    let errorCount = 0;

    wss.clients.forEach((client: WebSocketWithId) => {
      if (client.readyState === WebSocket.OPEN &&
        client.roomId === roomId &&
        client.participantId !== excludeParticipant) {
        try {
          client.send(messageStr);
          sentCount++;
        } catch (error) {
          console.error(`Failed to send message to participant ${client.participantId}:`, error);
          errorCount++;
        }
      }
    });

    console.log(`Broadcast to room ${roomId}: sent to ${sentCount} clients, ${errorCount} errors`);
  }

  return httpServer;
}
