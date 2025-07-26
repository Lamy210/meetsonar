import { storage } from "./storage";
import { signalingMessageSchema } from "@shared/schema";

interface WebSocketData {
  participantId?: string;
  roomId?: string;
  sessionId?: string;
  keepAliveInterval?: NodeJS.Timeout;
}

const connections = new Map<string, any>();

export function createWebSocketHandler() {
  return {
    open(ws: any) {
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] 🔗 New WebSocket connection opened`);
      console.log(`[${timestamp}] Connection count: ${connections.size + 1}`);
      
      // セッションIDを生成
      const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      ws.data = { sessionId };
      console.log(`[${timestamp}] Assigned session ID: ${sessionId}`);
      
      // 接続をマップに追加
      connections.set(sessionId, ws);
      
      // KeepAlive ping送信を設定（30秒間隔）
      const keepAliveInterval = setInterval(() => {
        if (ws.readyState === 1) { // WebSocket.OPEN
          ws.ping();
          console.log(`[${new Date().toISOString()}] 📡 Ping sent to ${sessionId}`);
        } else {
          clearInterval(keepAliveInterval);
        }
      }, 30000);
      
      ws.data.keepAliveInterval = keepAliveInterval;
      
      console.log(`[${timestamp}] ✅ WebSocket connection ready - waiting for client messages`);
      console.log(`[${timestamp}] WebSocket object type:`, typeof ws);
      console.log(`[${timestamp}] WebSocket readyState:`, ws.readyState);
    },

    message(ws: any, message: string | Buffer) {
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] 🚨 MESSAGE HANDLER CALLED!`);
      console.log(`[${timestamp}] Message type: ${typeof message}`);
      console.log(`[${timestamp}] Message constructor: ${message.constructor.name}`);
      console.log(`[${timestamp}] Message length: ${message.length}`);
      
      try {
        const data = typeof message === 'string' ? message : message.toString();
        console.log(`[${timestamp}] 📨 Raw message received (length: ${data.length}): ${data.substring(0, 200)}${data.length > 200 ? '...' : ''}`);
        
        const parsed = JSON.parse(data);
        console.log(`[${timestamp}] 📋 Parsed message type: ${parsed.type}`);
        
        // Validate message format
        const validatedMessage = signalingMessageSchema.parse(parsed);
        console.log(`[${timestamp}] ✅ Message validated: type=${validatedMessage.type}, roomId=${validatedMessage.roomId}`);
        
        // Handle different message types
        switch (validatedMessage.type) {
          case 'ping':
            // Handle heartbeat ping
            ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
            console.log(`[${timestamp}] 💓 Heartbeat pong sent to ${ws.data?.sessionId}`);
            break;
          case 'join-room':
            console.log(`[${timestamp}] 🚪 Processing join-room request`);
            handleJoinRoom(ws, validatedMessage);
            break;
          case 'leave-room':
            handleLeaveRoom(ws, validatedMessage);
            break;
          case 'chat-message':
            handleChatMessage(ws, validatedMessage);
            break;
          case 'chat-history':
            handleChatHistory(ws, validatedMessage);
            break;
          case 'offer':
          case 'answer':
          case 'ice-candidate':
            handleSignalingMessage(ws, validatedMessage);
            break;
          default:
            console.log(`[${timestamp}] ❓ Unknown message type: ${validatedMessage.type}`);
        }
      } catch (error) {
        console.error(`[${timestamp}] ❌ Error processing WebSocket message:`, error);
        console.error(`[${timestamp}] Error stack:`, error instanceof Error ? error.stack : 'No stack');
        ws.send(JSON.stringify({ 
          type: 'error', 
          message: 'Invalid message format' 
        }));
      }
    },

    close(ws: any, code?: number, reason?: string) {
      const timestamp = new Date().toISOString();
      const data: WebSocketData = ws.data || {};
      console.log(`[${timestamp}] 🔌 WebSocket connection closed`);
      console.log(`[${timestamp}] Close code: ${code}, reason: ${reason || 'No reason provided'}`);
      console.log(`[${timestamp}] Session data:`, data);
      
      // KeepAliveタイマーをクリーンアップ
      if (data.keepAliveInterval) {
        clearInterval(data.keepAliveInterval);
        console.log(`[${timestamp}] 🧹 KeepAlive interval cleared for session ${data.sessionId}`);
      }
      
      // セッションを接続マップから削除
      if (data.sessionId) {
        connections.delete(data.sessionId);
      }
      
      if (data.participantId && data.roomId) {
        connections.delete(data.participantId);
        console.log(`[${timestamp}] 👋 Participant ${data.participantId} disconnected from room ${data.roomId}`);
        
        // Remove participant from database and notify others
        handleLeaveRoom(ws, {
          type: "leave-room",
          roomId: data.roomId,
          participantId: data.participantId,
          payload: {}
        }).catch(error => {
          console.error(`[${timestamp}] Error during automatic cleanup:`, error);
        });
      }
      
      console.log(`[${timestamp}] Active connections remaining: ${connections.size}`);
    },

    error(ws: any, error: Error) {
      const timestamp = new Date().toISOString();
      console.error(`[${timestamp}] ❌ WebSocket error:`, error.message);
      console.error(`[${timestamp}] Error stack:`, error.stack);
      const data: WebSocketData = ws.data || {};
      console.error(`[${timestamp}] Session data at error:`, data);
    }
  };
}

async function handleJoinRoom(ws: any, message: any) {
  const { roomId, participantId, displayName, payload } = message;
  
  try {
    console.log(`[${new Date().toISOString()}] 🚪 Processing join-room for ${participantId} in room ${roomId}`);
    console.log(`[${new Date().toISOString()}] DisplayName: ${displayName}`);
    
    // ルームが存在するか確認、存在しない場合は作成
    let room = await storage.getRoom(roomId);
    if (!room) {
      console.log(`Creating room ${roomId} automatically`);
      room = await storage.createRoom({
        id: roomId,
        name: `Room ${roomId}`,
        isActive: true,
        maxParticipants: 10
      });
      console.log(`Room ${roomId} created successfully:`, room);
    }
    
    // Store connection
    ws.data = { 
      participantId, 
      roomId,
      sessionId: ws.data.sessionId,
      keepAliveInterval: ws.data.keepAliveInterval
    };
    connections.set(participantId, ws);
    
    // Create or update participant（displayNameを直接使用）
    await storage.addParticipant({
      roomId,
      displayName: displayName || `User ${participantId}`, // displayNameがない場合のフォールバック
      connectionId: participantId,
      isHost: (payload && payload.isHost) || false,
    });
    
    // Get all participants
    const participants = await storage.getParticipants(roomId);
    
    // 新しい参加者に現在の参加者リストを送信
    ws.send(JSON.stringify({
      type: 'participants-list',
      roomId,
      payload: participants
    }));
    
    // Notify all participants about the new participant
    broadcastToRoom(roomId, {
      type: 'participant-joined',
      roomId,
      participantId,
      payload: {
        participant: participants.find(p => p.connectionId === participantId),
        participants
      }
    });
    
    console.log(`Participant ${participantId} joined room ${roomId}. Total participants: ${participants.length}`);
  } catch (error) {
    console.error('Error handling join room:', error);
    ws.send(JSON.stringify({ 
      type: 'error', 
      message: 'Failed to join room' 
    }));
  }
}

async function handleLeaveRoom(ws: any, message: any) {
  const { roomId, participantId } = message;
  
  try {
    // Remove participant
    await storage.removeParticipant(roomId, participantId);
    connections.delete(participantId);
    
    // Notify other participants
    broadcastToRoom(roomId, {
      type: 'participant-left',
      roomId,
      participantId,
      payload: { participantId }
    }, [participantId]);
    
    console.log(`Participant ${participantId} left room ${roomId}`);
  } catch (error) {
    console.error('Error handling leave room:', error);
  }
}

async function handleChatMessage(ws: any, message: any) {
  const { roomId, participantId, payload } = message;
  
  console.log("=== CHAT MESSAGE SERVER ===");
  console.log("Room ID:", roomId);
  console.log("Participant ID:", participantId);
  console.log("Payload:", payload);
  
  try {
    // Save message to database
    const chatMessage = await storage.addChatMessage({
      roomId,
      participantId,
      displayName: payload.displayName,
      message: payload.message,
      type: payload.type || 'text'
    });
    
    console.log("Saved chat message:", chatMessage);
    
    // Broadcast to all participants in the room
    const broadcastMessage = {
      type: 'chat-message',
      roomId,
      participantId,
      payload: chatMessage
    };
    
    console.log("Broadcasting message:", broadcastMessage);
    broadcastToRoom(roomId, broadcastMessage);
    
    console.log(`Chat message from ${participantId} in room ${roomId} - broadcast complete`);
  } catch (error) {
    console.error('Error handling chat message:', error);
    ws.send(JSON.stringify({ 
      type: 'error', 
      message: 'Failed to send message' 
    }));
  }
}

async function handleChatHistory(ws: any, message: any) {
  const { roomId } = message;
  
  console.log("=== CHAT HISTORY REQUEST ===");
  console.log("Room ID:", roomId);
  
  try {
    const messages = await storage.getChatHistory(roomId);
    console.log("Retrieved chat history:", messages);
    console.log("Message count:", messages.length);
    
    const response = {
      type: 'chat-history',
      roomId,
      payload: { messages }
    };
    
    console.log("Sending chat history response:", response);
    ws.send(JSON.stringify(response));
  } catch (error) {
    console.error('Error handling chat history:', error);
    ws.send(JSON.stringify({ 
      type: 'error', 
      message: 'Failed to get chat history' 
    }));
  }
}

function handleSignalingMessage(ws: any, message: any) {
  const { roomId, participantId, payload } = message;
  
  // Forward signaling message to other participants
  broadcastToRoom(roomId, message, [participantId]);
}

function broadcastToRoom(roomId: string, message: any, excludeParticipants: string[] = []) {
  let sentCount = 0;
  console.log(`Broadcasting to room ${roomId}. Connected participants: ${connections.size}, excluding: [${excludeParticipants.join(', ')}]`);
  
  for (const [participantId, ws] of connections) {
    if (ws.data?.roomId === roomId && !excludeParticipants.includes(participantId)) {
      try {
        ws.send(JSON.stringify(message));
        sentCount++;
        console.log(`Message sent to participant ${participantId}`);
      } catch (error) {
        console.error(`Error sending message to participant ${participantId}:`, error);
        connections.delete(participantId);
      }
    }
  }
  console.log(`Broadcast complete. Messages sent to ${sentCount} participants`);
}
