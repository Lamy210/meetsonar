import { rooms, participants, type Room, type Participant, type InsertRoom, type InsertParticipant } from "@shared/schema";

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

export const storage = new MemStorage();
