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

export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  roomId: text("room_id").references(() => rooms.id).notNull(),
  participantId: text("participant_id").notNull(),
  displayName: text("display_name").notNull(),
  message: text("message").notNull(),
  type: text("type").default("text").notNull(), // text, system
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const invitations = pgTable("invitations", {
  id: serial("id").primaryKey(),
  roomId: text("room_id").references(() => rooms.id).notNull(),
  inviterUserId: integer("inviter_user_id").references(() => users.id),
  inviterDisplayName: text("inviter_display_name").notNull(),
  inviteeEmail: text("invitee_email").notNull(),
  inviteeDisplayName: text("invitee_display_name"),
  status: text("status").default("pending").notNull(), // pending, accepted, declined, expired
  inviteToken: text("invite_token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  respondedAt: timestamp("responded_at"),
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

export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({
  id: true,
  createdAt: true,
});

export const insertInvitationSchema = createInsertSchema(invitations).omit({
  id: true,
  createdAt: true,
  respondedAt: true,
});

// Invitation request/response schemas
export const inviteUserSchema = z.object({
  roomId: z.string().min(1),
  inviteeEmail: z.string().email(),
  inviteeDisplayName: z.string().optional(),
  inviterDisplayName: z.string().min(1),
  expirationHours: z.number().min(1).max(168).default(24), // 1-168 hours (1 week max)
});

export const respondToInviteSchema = z.object({
  inviteToken: z.string().min(1),
  action: z.enum(["accept", "decline"]),
  displayName: z.string().min(1).optional(), // For accepting invitations
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertRoom = z.infer<typeof insertRoomSchema>;
export type Room = typeof rooms.$inferSelect;

export type InsertParticipant = z.infer<typeof insertParticipantSchema>;
export type Participant = typeof participants.$inferSelect;

export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type ChatMessage = typeof chatMessages.$inferSelect;

export type InsertInvitation = z.infer<typeof insertInvitationSchema>;
export type Invitation = typeof invitations.$inferSelect;

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
    'participant-updated',
    'chat-message',
    'chat-history'
  ]),
  roomId: z.string(),
  participantId: z.string().optional(),
  payload: z.any(),
});

export type SignalingMessage = z.infer<typeof signalingMessageSchema>;
export type InviteUserRequest = z.infer<typeof inviteUserSchema>;
export type RespondToInviteRequest = z.infer<typeof respondToInviteSchema>;
