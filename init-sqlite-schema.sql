-- SQLite版のスキーマ（PostgreSQLからの移行）
-- MeetSonar Database Schema

-- Users テーブル
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  email TEXT,
  avatar TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Rooms テーブル
CREATE TABLE IF NOT EXISTS rooms (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  host_id INTEGER REFERENCES users(id),
  is_active BOOLEAN DEFAULT 1 NOT NULL,
  max_participants INTEGER DEFAULT 10 NOT NULL,
  settings TEXT,  -- JSON as TEXT in SQLite
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Participants テーブル
CREATE TABLE IF NOT EXISTS participants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  room_id TEXT NOT NULL REFERENCES rooms(id),
  user_id INTEGER REFERENCES users(id),
  display_name TEXT NOT NULL,
  is_host BOOLEAN DEFAULT 0 NOT NULL,
  is_muted BOOLEAN DEFAULT 0 NOT NULL,
  is_video_enabled BOOLEAN DEFAULT 1 NOT NULL,
  connection_id TEXT,
  joined_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Chat Messages テーブル
CREATE TABLE IF NOT EXISTS chat_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  room_id TEXT NOT NULL REFERENCES rooms(id),
  participant_id TEXT NOT NULL,
  display_name TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'text' NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Invitations テーブル
CREATE TABLE IF NOT EXISTS invitations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  room_id TEXT NOT NULL REFERENCES rooms(id),
  inviter_user_id INTEGER REFERENCES users(id),
  inviter_display_name TEXT NOT NULL,
  invitee_email TEXT NOT NULL,
  invitee_display_name TEXT,
  status TEXT DEFAULT 'pending' NOT NULL,
  invite_token TEXT NOT NULL UNIQUE,
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
  responded_at DATETIME
);

-- インデックス（パフォーマンス最適化）
CREATE INDEX IF NOT EXISTS idx_participants_room_id ON participants(room_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_room_id ON chat_messages(room_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_invitations_room_id ON invitations(room_id);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(invite_token);
CREATE INDEX IF NOT EXISTS idx_rooms_host_id ON rooms(host_id);

-- WALモード有効化（並行性とパフォーマンスの向上）
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA cache_size = -2000;  -- 2MBキャッシュ
PRAGMA temp_store = FILE;
PRAGMA mmap_size = 67108864;  -- 64MB mmap
