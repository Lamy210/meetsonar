import * as schema from "@shared/schema-sqlite";
import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'bun:sqlite';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import path from 'path';

// SQLite database file path
const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), 'data.db');

console.log('Connecting to SQLite database:', dbPath);

// Create SQLite connection using Bun's built-in sqlite
const sqliteRaw = new Database(dbPath);
// Cast to any for Drizzle compatibility
const sqlite = sqliteRaw as any;

// Enable foreign keys
sqlite.run('PRAGMA foreign_keys = ON');

// Create drizzle instance (casting sqlite to any to satisfy type)
const db = drizzle(sqlite, { schema });

// Initialize database (create tables if they don't exist)
try {
  // Run basic initialization query to ensure tables exist - use sqlite.run() not db.run()
  sqlite.run(`CREATE TABLE IF NOT EXISTS rooms (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    max_participants INTEGER DEFAULT 4
  )`);

  sqlite.run(`CREATE TABLE IF NOT EXISTS participants (
    id TEXT PRIMARY KEY,
    room_id TEXT NOT NULL,
    name TEXT NOT NULL,
    joined_at INTEGER NOT NULL DEFAULT (unixepoch()),
    is_host INTEGER DEFAULT 0,
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
  )`);

  sqlite.run(`CREATE TABLE IF NOT EXISTS chat_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    room_id TEXT NOT NULL,
    participant_id TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
    FOREIGN KEY (participant_id) REFERENCES participants(id) ON DELETE CASCADE
  )`);

  sqlite.run(`CREATE TABLE IF NOT EXISTS invitations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    room_id TEXT NOT NULL,
    token TEXT UNIQUE NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    responded_at INTEGER,
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
  )`);

  console.log('SQLite database initialized successfully');
} catch (error) {
  console.error('Failed to initialize SQLite database:', error);
  throw error;
}

export { db, sqlite };