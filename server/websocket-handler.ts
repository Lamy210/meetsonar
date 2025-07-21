import { storage } from "./storage";
import { signalingMessageSchema } from "@shared/schema";

interface WebSocketData {
  participantId?: string;
  roomId?: string;
}

const connections = new Map<string, any>();

export function createWebSocketHandler() {
  return {
    open(ws: any) {
      console.log("New WebSocket connection");
    },

    message(ws: any, message: string | Buffer) {
      try {
        const data = typeof message === 'string' ? message : message.toString();
        const parsed = JSON.parse(data);
        
        // Validate message format
        const validatedMessage = signalingMessageSchema.parse(parsed);
        
        // Handle different message types
        switch (validatedMessage.type) {
          case 'join-room':
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
            console.log('Unknown message type:', validatedMessage.type);
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
        ws.send(JSON.stringify({ 
          type: 'error', 
          message: 'Invalid message format' 
        }));
      }
    },

    close(ws: any) {
      const data: WebSocketData = ws.data || {};
      if (data.participantId && data.roomId) {
        connections.delete(data.participantId);
        console.log(`WebSocket connection closed for participant ${data.participantId}`);
        
        // Remove participant from database and notify others
        handleLeaveRoom(ws, {
          type: "leave-room",
          roomId: data.roomId,
          participantId: data.participantId,
          payload: {}
        }).catch(error => {
          console.error('Error during automatic cleanup on WebSocket close:', error);
        });
      }
    },

    error(ws: any, error: Error) {
      console.error('WebSocket error:', error);
    }
  };
}

async function handleJoinRoom(ws: any, message: any) {
  const { roomId, participantId, payload } = message;
  
  try {
    // まずルームが存在するか確認
    const room = await storage.getRoom(roomId);
    if (!room) {
      ws.send(JSON.stringify({ 
        type: 'error', 
        message: `Room ${roomId} not found` 
      }));
      return;
    }
    
    // Store connection
    ws.data = { participantId, roomId };
    connections.set(participantId, ws);
    
    // Create or update participant
    await storage.addParticipant({
      roomId,
      displayName: payload.displayName,
      connectionId: participantId,
      isHost: payload.isHost || false,
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
