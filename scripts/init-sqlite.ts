#!/usr/bin/env bun
// SQLite データベース初期化スクリプト（8GB環境最適化）

import { sqliteStorage, sqlite } from '../server/storage-sqlite';
import fs from 'fs';
import path from 'path';

const initializeDatabase = async () => {
  console.log('🔄 Initializing SQLite database...');
  
  try {
    // データディレクトリ作成
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
      console.log('📁 Created data directory');
    }

    // スキーマファイルの実行
    const schemaPath = path.join(process.cwd(), 'init-sqlite-schema.sql');
    if (fs.existsSync(schemaPath)) {
      const schemaSql = fs.readFileSync(schemaPath, 'utf-8');
      
      // SQLを分割して実行
      const statements = schemaSql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));
      
      let successCount = 0;
      statements.forEach((statement, index) => {
        try {
          sqlite.exec(statement);
          successCount++;
        } catch (error) {
          // テーブルが既に存在する場合は無視
          if (!error.message.includes('already exists')) {
            console.error(`Statement ${index + 1} failed:`, statement);
            console.error('Error:', error.message);
          } else {
            successCount++;
          }
        }
      });
      
      console.log(`✅ Executed ${successCount}/${statements.length} SQL statements`);
    }

    // テーブル作成確認
    const tables = sqlite.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
      ORDER BY name
    `).all();
    
    console.log('📋 Created tables:', tables.map(t => t.name).join(', '));

    // WALモード確認
    const journalMode = sqlite.pragma('journal_mode', { simple: true });
    console.log('📝 Journal mode:', journalMode);

    // テストデータ挿入（開発環境のみ）
    if (process.env.NODE_ENV === 'development') {
      try {
        await sqliteStorage.createRoom({
          id: 'test-room-1',
          name: 'Test Room',
          maxParticipants: 10
        });
        console.log('🧪 Test room created');
      } catch (error) {
        // 既に存在する場合は無視
        if (!error.message.includes('UNIQUE constraint failed')) {
          console.error('Test data error:', error);
        }
      }
    }

    console.log('🎉 SQLite database initialized successfully!');
    console.log('💾 Database file:', path.join(process.cwd(), 'data', 'meetsonar.db'));
    
  } catch (error) {
    console.error('❌ Failed to initialize database:', error);
    process.exit(1);
  } finally {
    sqliteStorage.close();
  }
};

// スクリプト実行
if (import.meta.main) {
  initializeDatabase();
}
