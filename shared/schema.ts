import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  displayName: text("display_name").notNull(),
  email: text("email"),
  avatar: text("avatar"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const rooms = pgTable("rooms", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  hostId: integer("host_id").references(() => users.id),
  isActive: boolean("is_active").default(true).notNull(),
  maxParticipants: integer("max_participants").default(10).notNull(),
  settings: jsonb("settings"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const participants = pgTable("participants", {
  id: serial("id").primaryKey(),
  roomId: text("room_id").references(() => rooms.id).notNull(),
  userId: integer("user_id").references(() => users.id),
  displayName: text("display_name").notNull(),
  isHost: boolean("is_host").default(false).notNull(),
  isMuted: boolean("is_muted").default(false).notNull(),
  isVideoEnabled: boolean("is_video_enabled").default(true).notNull(),
  connectionId: text("connection_id"),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertRoomSchema = createInsertSchema(rooms).omit({
  createdAt: true,
});

export const insertParticipantSchema = createInsertSchema(participants).omit({
  id: true,
  joinedAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertRoom = z.infer<typeof insertRoomSchema>;
export type Room = typeof rooms.$inferSelect;

export type InsertParticipant = z.infer<typeof insertParticipantSchema>;
export type Participant = typeof participants.$inferSelect;

// WebRTC signaling message types
export const signalingMessageSchema = z.object({
  type: z.enum([
    'offer', 
    'answer', 
    'ice-candidate', 
    'join-room', 
    'leave-room', 
    'participant-update',
    'participants-list',
    'participant-joined',
    'participant-left',
    'participant-updated'
  ]),
  roomId: z.string(),
  participantId: z.string().optional(),
  payload: z.any(),
});

export type SignalingMessage = z.infer<typeof signalingMessageSchema>;
