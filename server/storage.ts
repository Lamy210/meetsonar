import { rooms, participants, chatMessages, invitations, type Room, type Participant, type ChatMessage, type Invitation, type NewRoom, type NewParticipant, type NewChatMessage, type NewInvitation } from "@shared/schema-sqlite";
import { db } from "./db";
import { eq, and, desc } from "drizzle-orm";

export interface IStorage {
  // Room operations
  getRoom(id: string): Promise<Room | undefined>;
  createRoom(room: NewRoom): Promise<Room>;
  updateRoom(id: string, updates: Partial<Room>): Promise<Room | undefined>;
  deleteRoom(id: string): Promise<boolean>;

  // Participant operations
  getParticipants(roomId: string): Promise<Participant[]>;
  getParticipant(roomId: string, participantId: string): Promise<Participant | undefined>;
  addParticipant(participant: NewParticipant): Promise<Participant>;
  updateParticipant(roomId: string, participantId: string, updates: Partial<Participant>): Promise<Participant | undefined>;
  removeParticipant(roomId: string, participantId: string): Promise<boolean>;

  // Chat operations
  getChatHistory(roomId: string, limit?: number): Promise<ChatMessage[]>;
  addChatMessage(message: NewChatMessage): Promise<ChatMessage>;

  // Invitation operations
  createInvitation(invitation: NewInvitation): Promise<Invitation>;
  getInvitationByToken(token: string): Promise<Invitation | undefined>;
  getInvitationsByRoom(roomId: string): Promise<Invitation[]>;
  updateInvitationStatus(id: number, status: string): Promise<Invitation | undefined>;
}

export class MemStorage implements IStorage {
  private rooms: Map<string, Room>;
  private participants: Map<string, Participant[]>;
  private chatMessages: Map<string, ChatMessage[]>;
  private invitations: Map<string, Invitation[]>;
  private participantIdCounter: number;
  private chatMessageIdCounter: number;

  constructor() {
    this.rooms = new Map();
    this.participants = new Map();
    this.chatMessages = new Map();
    this.invitations = new Map();
    this.participantIdCounter = 1;
    this.chatMessageIdCounter = 1;
  }

  async getRoom(id: string): Promise<Room | undefined> {
    return this.rooms.get(id);
  }

  async createRoom(room: NewRoom): Promise<Room> {
    const newRoom: Room = {
      ...room,
      hostId: room.hostId || null,
      isActive: room.isActive ?? true,
      maxParticipants: room.maxParticipants ?? 10,
      settings: room.settings || null,
      createdAt: new Date().toISOString(),
    };
    this.rooms.set(room.id, newRoom);
    this.participants.set(room.id, []);
    this.chatMessages.set(room.id, []);
    return newRoom;
  }

  async updateRoom(id: string, updates: Partial<Room>): Promise<Room | undefined> {
    const room = this.rooms.get(id);
    if (!room) return undefined;

    const updatedRoom = { ...room, ...updates };
    this.rooms.set(id, updatedRoom);
    return updatedRoom;
  }

  async deleteRoom(id: string): Promise<boolean> {
    const deleted = this.rooms.delete(id);
    this.participants.delete(id);
    this.chatMessages.delete(id);
    return deleted;
  }

  async getParticipants(roomId: string): Promise<Participant[]> {
    return this.participants.get(roomId) || [];
  }

  async getParticipant(roomId: string, participantId: string): Promise<Participant | undefined> {
    const roomParticipants = this.participants.get(roomId) || [];
    return roomParticipants.find(p => p.connectionId === participantId);
  }

  async addParticipant(participant: NewParticipant): Promise<Participant> {
    const roomParticipants = this.participants.get(participant.roomId) || [];
    
    // Check if participant already exists
    const existingParticipant = roomParticipants.find(p => 
      p.connectionId === participant.connectionId || 
      (p.displayName === participant.displayName && p.connectionId === participant.connectionId)
    );
    
    if (existingParticipant) {
      console.log(`Participant ${participant.connectionId} already exists in room ${participant.roomId}, returning existing`);
      return existingParticipant;
    }

    const newParticipant: Participant = {
      ...participant,
      id: this.participantIdCounter++,
      userId: participant.userId || null,
      isHost: participant.isHost ?? false,
      isMuted: participant.isMuted ?? false,
      isVideoEnabled: participant.isVideoEnabled ?? false,
      connectionId: participant.connectionId || null,
      joinedAt: new Date().toISOString(),
    };

    // Set as host if first participant
    if (roomParticipants.length === 0) {
      newParticipant.isHost = true;
    }

    roomParticipants.push(newParticipant);
    this.participants.set(participant.roomId, roomParticipants);

    console.log(`Added new participant ${participant.connectionId} to room ${participant.roomId}`);
    return newParticipant;
  }

  async updateParticipant(roomId: string, participantId: string, updates: Partial<Participant>): Promise<Participant | undefined> {
    const roomParticipants = this.participants.get(roomId) || [];
    const participantIndex = roomParticipants.findIndex(p => p.connectionId === participantId);

    if (participantIndex === -1) return undefined;

    const updatedParticipant = { ...roomParticipants[participantIndex], ...updates };
    roomParticipants[participantIndex] = updatedParticipant;
    this.participants.set(roomId, roomParticipants);

    return updatedParticipant;
  }

  async removeParticipant(roomId: string, participantId: string): Promise<boolean> {
    const roomParticipants = this.participants.get(roomId) || [];
    const initialLength = roomParticipants.length;

    const updatedParticipants = roomParticipants.filter(p => p.connectionId !== participantId);
    this.participants.set(roomId, updatedParticipants);

    return updatedParticipants.length < initialLength;
  }

  async getChatHistory(roomId: string, limit: number = 100): Promise<ChatMessage[]> {
    const messages = this.chatMessages.get(roomId) || [];
    return messages.slice(-limit).reverse();
  }

  async addChatMessage(message: NewChatMessage): Promise<ChatMessage> {
    const newMessage: ChatMessage = {
      id: this.chatMessageIdCounter++,
      ...message,
      type: message.type || 'text',
      createdAt: new Date().toISOString(),
    };

    const roomMessages = this.chatMessages.get(message.roomId) || [];
    roomMessages.push(newMessage);
    this.chatMessages.set(message.roomId, roomMessages);

    return newMessage;
  }

  async createInvitation(invitation: NewInvitation): Promise<Invitation> {
    const roomInvitations = this.invitations.get(invitation.roomId) || [];
    const newInvitation: Invitation = {
      ...invitation,
      id: roomInvitations.length > 0 ? Math.max(...roomInvitations.map(i => i.id)) + 1 : 1,
      inviterUserId: invitation.inviterUserId || null,
      inviteeDisplayName: invitation.inviteeDisplayName || null,
      status: invitation.status || 'pending',
      createdAt: new Date().toISOString(),
      respondedAt: null,
    };

    roomInvitations.push(newInvitation);
    this.invitations.set(invitation.roomId, roomInvitations);

    return newInvitation;
  }

  async getInvitationByToken(token: string): Promise<Invitation | undefined> {
    for (const roomInvitations of this.invitations.values()) {
      const invitation = roomInvitations.find(i => i.inviteToken === token);
      if (invitation) return invitation;
    }
    return undefined;
  }

  async getInvitationsByRoom(roomId: string): Promise<Invitation[]> {
    return this.invitations.get(roomId) || [];
  }

  async updateInvitationStatus(id: number, status: string): Promise<Invitation | undefined> {
    for (const roomInvitations of this.invitations.values()) {
      const invitationIndex = roomInvitations.findIndex(i => i.id === id);
      if (invitationIndex !== -1) {
        roomInvitations[invitationIndex] = {
          ...roomInvitations[invitationIndex],
          status,
          respondedAt: new Date().toISOString(),
        };
        return roomInvitations[invitationIndex];
      }
    }
    return undefined;
  }
}

// Database implementation
export class DatabaseStorage implements IStorage {
  async getRoom(id: string): Promise<Room | undefined> {
    const [room] = await db.select().from(rooms).where(eq(rooms.id, id));
    return room || undefined;
  }

  async createRoom(room: NewRoom): Promise<Room> {
    const [newRoom] = await db
      .insert(rooms)
      .values({
        ...room,
        hostId: room.hostId || null,
        isActive: room.isActive ?? true,
        maxParticipants: room.maxParticipants ?? 10,
        settings: room.settings || null,
      })
      .returning();
    return newRoom;
  }

  async updateRoom(id: string, updates: Partial<Room>): Promise<Room | undefined> {
    const [updatedRoom] = await db
      .update(rooms)
      .set(updates)
      .where(eq(rooms.id, id))
      .returning();
    return updatedRoom || undefined;
  }

  async deleteRoom(id: string): Promise<boolean> {
    // Delete participants and messages first (foreign key constraint)
    await db.delete(participants).where(eq(participants.roomId, id));
    await db.delete(chatMessages).where(eq(chatMessages.roomId, id));

    const result = await db.delete(rooms).where(eq(rooms.id, id));
    return result.changes > 0;
  }

  async getParticipants(roomId: string): Promise<Participant[]> {
    return await db.select().from(participants).where(eq(participants.roomId, roomId));
  }

  async getParticipant(roomId: string, participantId: string): Promise<Participant | undefined> {
    const [participant] = await db
      .select()
      .from(participants)
      .where(and(eq(participants.roomId, roomId), eq(participants.connectionId, participantId)));
    return participant || undefined;
  }

  async addParticipant(participant: NewParticipant): Promise<Participant> {
    // Check if participant already exists
    const existingParticipant = await this.getParticipant(participant.roomId, participant.connectionId || '');
    if (existingParticipant) {
      console.log(`Participant ${participant.connectionId} already exists in room ${participant.roomId}, returning existing`);
      return existingParticipant;
    }

    // Check if this is the first participant (should be host)
    const existingParticipants = await this.getParticipants(participant.roomId);
    const isHost = existingParticipants.length === 0;

    const [newParticipant] = await db
      .insert(participants)
      .values({
        ...participant,
        userId: participant.userId || null,
        isHost: isHost,
        isMuted: participant.isMuted ?? false,
        isVideoEnabled: participant.isVideoEnabled ?? false,
        connectionId: participant.connectionId || null,
      })
      .returning();
    
    console.log(`Added new participant ${participant.connectionId} to room ${participant.roomId}`);
    return newParticipant;
  }

  async updateParticipant(roomId: string, participantId: string, updates: Partial<Participant>): Promise<Participant | undefined> {
    const [updatedParticipant] = await db
      .update(participants)
      .set(updates)
      .where(and(eq(participants.roomId, roomId), eq(participants.connectionId, participantId)))
      .returning();
    return updatedParticipant || undefined;
  }

  async removeParticipant(roomId: string, participantId: string): Promise<boolean> {
    const result = await db
      .delete(participants)
      .where(and(eq(participants.roomId, roomId), eq(participants.connectionId, participantId)));
    return result.changes > 0;
  }

  async getChatHistory(roomId: string, limit: number = 100): Promise<ChatMessage[]> {
    const messages = await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.roomId, roomId))
      .orderBy(desc(chatMessages.createdAt))
      .limit(limit);

    // 古い順に返す（フロントエンドで表示順序を正しくするため）
    return messages.reverse();
  }

  async addChatMessage(message: NewChatMessage): Promise<ChatMessage> {
    const [newMessage] = await db
      .insert(chatMessages)
      .values(message)
      .returning();
    return newMessage;
  }

  async createInvitation(invitation: NewInvitation): Promise<Invitation> {
    const [newInvitation] = await db
      .insert(invitations)
      .values({
        ...invitation,
        createdAt: new Date().toISOString(),
      })
      .returning();
    return newInvitation;
  }

  async getInvitationByToken(token: string): Promise<Invitation | undefined> {
    const [invitation] = await db
      .select()
      .from(invitations)
      .where(eq(invitations.inviteToken, token));
    return invitation || undefined;
  }

  async getInvitationsByRoom(roomId: string): Promise<Invitation[]> {
    return await db.select().from(invitations).where(eq(invitations.roomId, roomId));
  }

  async updateInvitationStatus(id: number, status: string): Promise<Invitation | undefined> {
    const [updatedInvitation] = await db
      .update(invitations)
      .set({ 
        status,
        respondedAt: new Date().toISOString()
      })
      .where(eq(invitations.id, id))
      .returning();
    return updatedInvitation || undefined;
  }
}

export const storage = new DatabaseStorage();
