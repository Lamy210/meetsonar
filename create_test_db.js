const Database = require('better-sqlite3');
const db = new Database('./test.db');

// テーブル作成
db.exec(`
  CREATE TABLE IF NOT EXISTS rooms (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    max_participants INTEGER DEFAULT 10,
    is_active BOOLEAN DEFAULT true,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS participants (
    id TEXT PRIMARY KEY,
    room_id TEXT NOT NULL,
    display_name TEXT NOT NULL,
    is_host BOOLEAN DEFAULT false,
    is_muted BOOLEAN DEFAULT false,
    is_video_enabled BOOLEAN DEFAULT false,
    connection_id TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (room_id) REFERENCES rooms (id)
  );

  CREATE TABLE IF NOT EXISTS chat_messages (
    id TEXT PRIMARY KEY,
    room_id TEXT NOT NULL,
    participant_id TEXT NOT NULL,
    display_name TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'text',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (room_id) REFERENCES rooms (id)
  );
`);

console.log('SQLite database and tables created successfully!');
db.close();
