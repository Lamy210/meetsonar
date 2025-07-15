import { rooms, participants, type Room, type Participant, type InsertRoom, type InsertParticipant } from "@shared/schema";
import { db } from "./db";
import { eq, and } from "drizzle-orm";

export interface IStorage {
  // Room operations
  getRoom(id: string): Promise<Room | undefined>;
  createRoom(room: InsertRoom): Promise<Room>;
  updateRoom(id: string, updates: Partial<Room>): Promise<Room | undefined>;
  deleteRoom(id: string): Promise<boolean>;

  // Participant operations
  getParticipants(roomId: string): Promise<Participant[]>;
  getParticipant(roomId: string, participantId: string): Promise<Participant | undefined>;
  addParticipant(participant: InsertParticipant): Promise<Participant>;
  updateParticipant(roomId: string, participantId: string, updates: Partial<Participant>): Promise<Participant | undefined>;
  removeParticipant(roomId: string, participantId: string): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private rooms: Map<string, Room>;
  private participants: Map<string, Participant[]>;
  private participantIdCounter: number;

  constructor() {
    this.rooms = new Map();
    this.participants = new Map();
    this.participantIdCounter = 1;
  }

  async getRoom(id: string): Promise<Room | undefined> {
    return this.rooms.get(id);
  }

  async createRoom(room: InsertRoom): Promise<Room> {
    const newRoom: Room = {
      ...room,
      hostId: room.hostId || null,
      isActive: room.isActive ?? true,
      maxParticipants: room.maxParticipants ?? 10,
      settings: room.settings || null,
      createdAt: new Date(),
    };
    this.rooms.set(room.id, newRoom);
    this.participants.set(room.id, []);
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
    return deleted;
  }

  async getParticipants(roomId: string): Promise<Participant[]> {
    return this.participants.get(roomId) || [];
  }

  async getParticipant(roomId: string, participantId: string): Promise<Participant | undefined> {
    const roomParticipants = this.participants.get(roomId) || [];
    return roomParticipants.find(p => p.connectionId === participantId);
  }

  async addParticipant(participant: InsertParticipant): Promise<Participant> {
    const newParticipant: Participant = {
      ...participant,
      id: this.participantIdCounter++,
      userId: participant.userId || null,
      isHost: participant.isHost ?? false,
      isMuted: participant.isMuted ?? false,
      isVideoEnabled: participant.isVideoEnabled ?? false,
      connectionId: participant.connectionId || null,
      joinedAt: new Date(),
    };

    const roomParticipants = this.participants.get(participant.roomId) || [];
    
    // Set as host if first participant
    if (roomParticipants.length === 0) {
      newParticipant.isHost = true;
    }

    roomParticipants.push(newParticipant);
    this.participants.set(participant.roomId, roomParticipants);
    
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
}

// Database implementation
export class DatabaseStorage implements IStorage {
  async getRoom(id: string): Promise<Room | undefined> {
    const [room] = await db.select().from(rooms).where(eq(rooms.id, id));
    return room || undefined;
  }

  async createRoom(room: InsertRoom): Promise<Room> {
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
    // Delete participants first (foreign key constraint)
    await db.delete(participants).where(eq(participants.roomId, id));
    
    const result = await db.delete(rooms).where(eq(rooms.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
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

  async addParticipant(participant: InsertParticipant): Promise<Participant> {
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
    return result.rowCount ? result.rowCount > 0 : false;
  }
}

export const storage = new DatabaseStorage();
