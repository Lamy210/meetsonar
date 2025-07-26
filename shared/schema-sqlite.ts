import { sqliteTable, text as sqliteText, integer as sqliteInteger, blob } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// SQLite版のスキーマ定義（8GB環境最適化）
export const users = sqliteTable("users", {
    id: sqliteInteger("id").primaryKey({ autoIncrement: true }),
    username: sqliteText("username").notNull().unique(),
    displayName: sqliteText("display_name").notNull(),
    email: sqliteText("email"),
    avatar: sqliteText("avatar"),
    createdAt: sqliteText("created_at").default("CURRENT_TIMESTAMP").notNull(),
});

export const rooms = sqliteTable("rooms", {
    id: sqliteText("id").primaryKey(),
    name: sqliteText("name").notNull(),
    hostId: sqliteInteger("host_id").references(() => users.id),
    isActive: sqliteInteger("is_active", { mode: 'boolean' }).default(true).notNull(),
    maxParticipants: sqliteInteger("max_participants").default(10).notNull(),
    settings: sqliteText("settings"), // JSON as TEXT in SQLite
    createdAt: sqliteText("created_at").default("CURRENT_TIMESTAMP").notNull(),
});

export const participants = sqliteTable("participants", {
    id: sqliteInteger("id").primaryKey({ autoIncrement: true }),
    roomId: sqliteText("room_id").references(() => rooms.id).notNull(),
    userId: sqliteInteger("user_id").references(() => users.id),
    displayName: sqliteText("display_name").notNull(),
    isHost: sqliteInteger("is_host", { mode: 'boolean' }).default(false).notNull(),
    isMuted: sqliteInteger("is_muted", { mode: 'boolean' }).default(false).notNull(),
    isVideoEnabled: sqliteInteger("is_video_enabled", { mode: 'boolean' }).default(true).notNull(),
    connectionId: sqliteText("connection_id"),
    joinedAt: sqliteText("joined_at").default("CURRENT_TIMESTAMP").notNull(),
});

export const chatMessages = sqliteTable("chat_messages", {
    id: sqliteInteger("id").primaryKey({ autoIncrement: true }),
    roomId: sqliteText("room_id").references(() => rooms.id).notNull(),
    participantId: sqliteText("participant_id").notNull(),
    displayName: sqliteText("display_name").notNull(),
    message: sqliteText("message").notNull(),
    type: sqliteText("type").default("text").notNull(),
    createdAt: sqliteText("created_at").default("CURRENT_TIMESTAMP").notNull(),
});

export const invitations = sqliteTable("invitations", {
    id: sqliteInteger("id").primaryKey({ autoIncrement: true }),
    roomId: sqliteText("room_id").references(() => rooms.id).notNull(),
    inviterUserId: sqliteInteger("inviter_user_id").references(() => users.id),
    inviterDisplayName: sqliteText("inviter_display_name").notNull(),
    inviteeEmail: sqliteText("invitee_email").notNull(),
    inviteeDisplayName: sqliteText("invitee_display_name"),
    status: sqliteText("status").default("pending").notNull(),
    inviteToken: sqliteText("invite_token").notNull().unique(),
    expiresAt: sqliteText("expires_at").notNull(),
    createdAt: sqliteText("created_at").default("CURRENT_TIMESTAMP").notNull(),
    respondedAt: sqliteText("responded_at"),
});

// 既存のZodスキーマは継続使用
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

// WebSocket signaling schemas (継続使用)
export const signalingMessageSchema = z.object({
    type: z.string(),
    roomId: z.string(),
    participantId: z.string(),
    targetParticipantId: z.string().optional(),
    payload: z.any(),
});

export type SignalingMessage = z.infer<typeof signalingMessageSchema>;

export const webrtcSignalSchema = z.object({
    type: z.enum(['offer', 'answer', 'ice-candidate']),
    roomId: z.string(),
    participantId: z.string(),
    targetParticipantId: z.string(),
    data: z.any(),
});

export type WebRTCSignal = z.infer<typeof webrtcSignalSchema>;

// 招待機能用のZodスキーマ（API用）
export const inviteUserSchema = z.object({
  inviterDisplayName: z.string(),
  inviteeEmail: z.string().email(),
  inviteeDisplayName: z.string().optional(),
  expirationHours: z.number().default(24),
});

export const respondToInviteSchema = z.object({
  token: z.string(),
  accept: z.boolean(),
  displayName: z.string().optional(),
});

// SQLite専用型定義（8GB環境最適化）
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Room = typeof rooms.$inferSelect;
export type NewRoom = typeof rooms.$inferInsert;
export type Participant = typeof participants.$inferSelect;
export type NewParticipant = typeof participants.$inferInsert;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type NewChatMessage = typeof chatMessages.$inferInsert;
export type Invitation = typeof invitations.$inferSelect;
export type NewInvitation = typeof invitations.$inferInsert;
