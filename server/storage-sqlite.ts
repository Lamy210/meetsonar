import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import * as schema from '@shared/schema-sqlite';
import path from 'path';
import fs from 'fs';

// 8GB環境特化のSQLite設定
const dbPath = path.join(process.cwd(), 'data', 'meetsonar.db');

// データディレクトリ作成
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// SQLite接続（8GB環境最適化）
const sqlite = new Database(dbPath, {
  fileMustExist: false,
  timeout: 5000,
  verbose: process.env.NODE_ENV === 'development' ? console.log : undefined,
});

// WALモード + パフォーマンス最適化
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('synchronous = NORMAL');
sqlite.pragma('cache_size = -2000');   // 2MBキャッシュ
sqlite.pragma('temp_store = FILE');    // 一時データをファイルに
sqlite.pragma('mmap_size = 67108864'); // 64MB mmap
sqlite.pragma('foreign_keys = ON');    // 外部キー制約有効化

// Drizzle ORM
const db = drizzle(sqlite, { schema });

// スキーマ初期化
const initializeSchema = () => {
  try {
    const schemaPath = path.join(process.cwd(), 'init-sqlite-schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf-8');
    
    // SQLを分割して実行
    const statements = schemaSql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);
    
    statements.forEach(statement => {
      try {
        sqlite.exec(statement);
      } catch (error) {
        // テーブルが既に存在する場合は無視
        if (error instanceof Error && !error.message.includes('already exists')) {
          console.error('Schema error:', statement, error);
        }
      }
    });
    
    console.log('✅ SQLite schema initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize SQLite schema:', error);
    throw error;
  }
};

// 初回起動時にスキーマ初期化
initializeSchema();

// Storage implementation with prepared statements (performance optimization)
class SQLiteStorage {
  // 準備済みステートメント（パフォーマンス最適化）
  private preparedStatements = {
    addParticipant: sqlite.prepare(`
      INSERT INTO participants (room_id, user_id, display_name, is_host, is_muted, is_video_enabled, connection_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `),
    
    removeParticipant: sqlite.prepare(`
      DELETE FROM participants 
      WHERE room_id = ? AND connection_id = ?
    `),
    
    getParticipants: sqlite.prepare(`
      SELECT * FROM participants 
      WHERE room_id = ? 
      ORDER BY joined_at ASC
    `),
    
    addChatMessage: sqlite.prepare(`
      INSERT INTO chat_messages (room_id, participant_id, display_name, message, type)
      VALUES (?, ?, ?, ?, ?)
    `),
    
    getChatHistory: sqlite.prepare(`
      SELECT id, room_id, participant_id, display_name, message, type, created_at
      FROM chat_messages 
      WHERE room_id = ? 
      ORDER BY created_at DESC 
      LIMIT ?
    `),
    
    createRoom: sqlite.prepare(`
      INSERT INTO rooms (id, name, host_id, max_participants, settings)
      VALUES (?, ?, ?, ?, ?)
    `),
    
    getRoomInfo: sqlite.prepare(`
      SELECT * FROM rooms WHERE id = ?
    `),
  };

  async addParticipant(participant: {
    roomId: string;
    userId?: number | null;
    displayName: string;
    isHost: boolean;
    isMuted: boolean;
    isVideoEnabled: boolean;
    connectionId?: string;
  }) {
    try {
      const result = this.preparedStatements.addParticipant.run(
        participant.roomId,
        participant.userId || null,
        participant.displayName,
        participant.isHost ? 1 : 0,
        participant.isMuted ? 1 : 0,
        participant.isVideoEnabled ? 1 : 0,
        participant.connectionId || null
      );
      return { id: result.lastInsertRowid, ...participant };
    } catch (error) {
      console.error('Failed to add participant:', error);
      throw error;
    }
  }

  async removeParticipant(roomId: string, participantId: string) {
    try {
      const result = this.preparedStatements.removeParticipant.run(
        roomId, 
        participantId // connectionId
      );
      return result.changes > 0;
    } catch (error) {
      console.error('Failed to remove participant:', error);
      throw error;
    }
  }

  async getParticipants(roomId: string) {
    try {
      return this.preparedStatements.getParticipants.all(roomId);
    } catch (error) {
      console.error('Failed to get participants:', error);
      throw error;
    }
  }

  async addChatMessage(message: {
    id?: string;
    roomId: string;
    participantId: string;
    displayName: string;
    message: string;
    timestamp?: string;
  }) {
    try {
      const result = this.preparedStatements.addChatMessage.run(
        message.roomId,
        message.participantId,
        message.displayName,
        message.message,
        'text'
      );
      
      // 作成されたメッセージを返す
      return {
        id: result.lastInsertRowid.toString(),
        roomId: message.roomId,
        participantId: message.participantId,
        displayName: message.displayName,
        message: message.message,
        type: 'text',
        createdAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Failed to add chat message:', error);
      throw error;
    }
  }

  async getChatHistory(roomId: string, limit = 50) {
    try {
      const messages = this.preparedStatements.getChatHistory.all(roomId, limit);
      return messages.reverse(); // 古い順に並び替え
    } catch (error) {
      console.error('Failed to get chat history:', error);
      throw error;
    }
  }

  async createRoom(room: {
    id: string;
    name: string;
    hostId?: number;
    maxParticipants?: number;
  }) {
    try {
      const result = this.preparedStatements.createRoom.run(
        room.id,
        room.name,
        room.hostId || null,
        room.maxParticipants || 10,
        null // settings
      );
      return { ...room, createdAt: new Date().toISOString() };
    } catch (error) {
      console.error('Failed to create room:', error);
      throw error;
    }
  }

  async getRoomInfo(roomId: string) {
    try {
      return this.preparedStatements.getRoomInfo.get(roomId);
    } catch (error) {
      console.error('Failed to get room info:', error);
      throw error;
    }
  }

  // クリーンアップ（メモリ効率）
  close() {
    // better-sqlite3では自動的にクリーンアップされる
    sqlite.close();
  }
}

export const sqliteStorage = new SQLiteStorage();
export { db, sqlite };

// グレースフル シャットダウン
process.on('SIGINT', () => {
  console.log('Closing SQLite database...');
  sqliteStorage.close();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('Closing SQLite database...');
  sqliteStorage.close();
  process.exit(0);
});
