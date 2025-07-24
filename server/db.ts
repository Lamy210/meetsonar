import * as schema from "@shared/schema";
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

const databaseUrl = process.env.DATABASE_URL;

let db: any;
let pool: any = null;

// PostgreSQL用の設定
console.log('Connecting to PostgreSQL database:', databaseUrl.replace(/:\/\/.*@/, '://***@'));

const client = postgres(databaseUrl, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

db = drizzle(client, { schema });
pool = client;

export { db, pool };