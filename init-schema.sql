-- PostgreSQL schema for MeetSonar
-- Drop existing tables if they exist (cascading to handle foreign keys)
DROP TABLE IF EXISTS chat_messages CASCADE;
DROP TABLE IF EXISTS participants CASCADE;
DROP TABLE IF EXISTS rooms CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Create users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    email TEXT,
    avatar TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Create rooms table
CREATE TABLE rooms (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    host_id INTEGER REFERENCES users(id),
    is_active BOOLEAN DEFAULT true NOT NULL,
    max_participants INTEGER DEFAULT 10 NOT NULL,
    settings JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Create participants table
CREATE TABLE participants (
    id SERIAL PRIMARY KEY,
    room_id TEXT REFERENCES rooms(id) NOT NULL,
    user_id INTEGER REFERENCES users(id),
    display_name TEXT NOT NULL,
    is_host BOOLEAN DEFAULT false NOT NULL,
    is_muted BOOLEAN DEFAULT false NOT NULL,
    is_video_enabled BOOLEAN DEFAULT true NOT NULL,
    connection_id TEXT,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Create chat_messages table
CREATE TABLE chat_messages (
    id SERIAL PRIMARY KEY,
    room_id TEXT REFERENCES rooms(id) NOT NULL,
    participant_id TEXT NOT NULL,
    display_name TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'text' NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Create indexes for better performance
CREATE INDEX idx_participants_room_id ON participants(room_id);
CREATE INDEX idx_participants_connection_id ON participants(connection_id);
CREATE INDEX idx_chat_messages_room_id ON chat_messages(room_id);
CREATE INDEX idx_chat_messages_created_at ON chat_messages(created_at);
