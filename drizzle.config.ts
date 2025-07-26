import { defineConfig } from "drizzle-kit";

// SQLite用の設定（DATABASE_PATHまたはDATABASE_URLをサポート）
const databasePath = process.env.DATABASE_PATH;
const databaseUrl = process.env.DATABASE_URL;

if (!databasePath && !databaseUrl) {
  throw new Error("DATABASE_PATH or DATABASE_URL must be provided");
}

// DATABASE_PATHが設定されている場合はSQLiteとして扱う
const finalUrl = databasePath 
  ? `sqlite:${databasePath}`
  : databaseUrl!;

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema-sqlite.ts", // SQLite専用スキーマを使用
  dialect: "sqlite", // SQLiteに統一
  dbCredentials: {
    url: finalUrl,
  },
});
