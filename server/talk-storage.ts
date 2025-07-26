import { db } from "./db";
import { 
  meetings, 
  talkMessages, 
  meetingParticipants,
  type Meeting,
  type NewMeeting,
  type TalkMessage,
  type NewTalkMessage,
  type MeetingParticipant,
  type NewMeetingParticipant
} from "@shared/talk-schema";
import { eq, desc, and, isNull } from "drizzle-orm";

export class TalkStorage {
  // ミーティング管理
  async createMeeting(data: Omit<NewMeeting, 'id'>): Promise<Meeting> {
    const [meeting] = await db.insert(meetings).values(data).returning();
    return meeting;
  }

  async getMeeting(meetingId: string): Promise<Meeting | null> {
    const [meeting] = await db
      .select()
      .from(meetings)
      .where(eq(meetings.meetingId, meetingId))
      .limit(1);
    return meeting || null;
  }

  async updateMeeting(meetingId: string, updates: Partial<Meeting>): Promise<Meeting | null> {
    const [updated] = await db
      .update(meetings)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(meetings.meetingId, meetingId))
      .returning();
    return updated || null;
  }

  async deleteMeeting(meetingId: string): Promise<boolean> {
    const result = await db
      .update(meetings)
      .set({ isActive: false })
      .where(eq(meetings.meetingId, meetingId));
    return result.changes > 0;
  }

  // 参加者管理
  async addMeetingParticipant(data: Omit<NewMeetingParticipant, 'id'>): Promise<MeetingParticipant> {
    // 既存の参加者をチェック
    const existing = await db
      .select()
      .from(meetingParticipants)
      .where(
        and(
          eq(meetingParticipants.meetingId, data.meetingId),
          eq(meetingParticipants.participantId, data.participantId),
          isNull(meetingParticipants.leftAt)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      // 既存の参加者をオンラインに更新
      const [updated] = await db
        .update(meetingParticipants)
        .set({ isOnline: true, leftAt: null })
        .where(eq(meetingParticipants.id, existing[0].id))
        .returning();
      return updated;
    }

    // 新しい参加者を追加
    const [participant] = await db.insert(meetingParticipants).values(data).returning();
    return participant;
  }

  async getMeetingParticipants(meetingId: string): Promise<MeetingParticipant[]> {
    return await db
      .select()
      .from(meetingParticipants)
      .where(
        and(
          eq(meetingParticipants.meetingId, meetingId),
          eq(meetingParticipants.isOnline, true),
          isNull(meetingParticipants.leftAt)
        )
      );
  }

  async removeMeetingParticipant(meetingId: string, participantId: string): Promise<boolean> {
    const result = await db
      .update(meetingParticipants)
      .set({ 
        isOnline: false, 
        leftAt: new Date() 
      })
      .where(
        and(
          eq(meetingParticipants.meetingId, meetingId),
          eq(meetingParticipants.participantId, participantId)
        )
      );
    return result.changes > 0;
  }

  // チャットメッセージ管理
  async addTalkMessage(data: Omit<NewTalkMessage, 'id'>): Promise<TalkMessage> {
    const [message] = await db.insert(talkMessages).values(data).returning();
    return message;
  }

  async getTalkHistory(meetingId: string, limit: number = 100): Promise<TalkMessage[]> {
    const messages = await db
      .select()
      .from(talkMessages)
      .where(
        and(
          eq(talkMessages.meetingId, meetingId),
          eq(talkMessages.isDeleted, false)
        )
      )
      .orderBy(desc(talkMessages.createdAt))
      .limit(limit);
    
    // 古い順に返す（フロントエンドで表示順序を正しくするため）
    return messages.reverse();
  }

  async updateTalkMessage(messageId: string, updates: Partial<TalkMessage>): Promise<TalkMessage | null> {
    const [updated] = await db
      .update(talkMessages)
      .set({ 
        ...updates, 
        isEdited: updates.message ? true : updates.isEdited,
        updatedAt: new Date() 
      })
      .where(eq(talkMessages.id, messageId))
      .returning();
    return updated || null;
  }

  async deleteTalkMessage(messageId: string): Promise<boolean> {
    const result = await db
      .update(talkMessages)
      .set({ 
        isDeleted: true, 
        updatedAt: new Date() 
      })
      .where(eq(talkMessages.id, messageId));
    return result.changes > 0;
  }

  // ユーティリティ関数
  async generateMeetingId(): Promise<string> {
    // ユーザーフレンドリーなミーティングID生成（例：MTG-2024-ABCD）
    const now = new Date();
    const year = now.getFullYear();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `MTG-${year}-${random}`;
  }

  async clearMeetingChat(meetingId: string): Promise<boolean> {
    const result = await db
      .update(talkMessages)
      .set({ 
        isDeleted: true, 
        updatedAt: new Date() 
      })
      .where(eq(talkMessages.meetingId, meetingId));
    return result.changes > 0;
  }

  // 統計・分析用
  async getMeetingStats(meetingId: string) {
    const [meeting] = await db
      .select()
      .from(meetings)
      .where(eq(meetings.meetingId, meetingId));

    if (!meeting) return null;

    const participants = await this.getMeetingParticipants(meetingId);
    const messages = await db
      .select()
      .from(talkMessages)
      .where(
        and(
          eq(talkMessages.meetingId, meetingId),
          eq(talkMessages.isDeleted, false)
        )
      );

    return {
      meeting,
      participantCount: participants.length,
      messageCount: messages.length,
      lastActivity: messages.length > 0 ? 
        Math.max(...messages.map((m: any) => new Date(m.createdAt).getTime())) : 
        meeting.createdAt ? new Date(meeting.createdAt).getTime() : Date.now()
    };
  }
}

export const talkStorage = new TalkStorage();
