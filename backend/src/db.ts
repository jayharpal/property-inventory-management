import pkg from 'pg';
const { Pool } = pkg;
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "./schema/schema.js";
import dotenv from "dotenv";
dotenv.config();

// Log database URL in a redacted format for debugging
const dbUrlForLogs = process.env.DATABASE_URL 
  ? process.env.DATABASE_URL.replace(/:\/\/[^:]+:[^@]+@/, '://****:****@') 
  : 'Not set';

console.log('Database URL format:', dbUrlForLogs);

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

console.log('Connecting to database...');

// Define connection options with timeouts and retries
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  connectionTimeoutMillis: 10000, // 10 seconds
  idleTimeoutMillis: 30000,      // 30 seconds
  max: 20                       // Maximum number of clients in the pool
});

// Add connection validation and error handling
pool.on('error', (err) => {
  console.error('Unexpected database pool error', err);
});

// Test the connection
pool.query('SELECT 1').then(() => {
  console.log('Database connection successful');
}).catch(err => {
  console.error('Database connection failed:', err);
  // Log more detailed error info without exposing credentials
  if (err.message) {
    console.error('Error message:', err.message);
  }
  if (err.code) {
    console.error('Error code:', err.code);
  }
});

export const db = drizzle(pool, { schema });
