import session from 'express-session';
import { pool } from './db.js';

// Create a configurable session store
// Will default to in-memory if PG store setup fails
let sessionStore = new session.MemoryStore();

// Attempt to set up persistent session store
try {
  const pgSessionStore = async () => {
    try {
      const connectPgSimple = (await import('connect-pg-simple')).default;
      const PgSession = connectPgSimple(session);
      
      // Create the sessions table if it doesn't exist
      await pool.query(`
        CREATE TABLE IF NOT EXISTS "session" (
          "sid" varchar NOT NULL COLLATE "default",
          "sess" json NOT NULL,
          "expire" timestamp(6) NOT NULL,
          CONSTRAINT "session_pkey" PRIMARY KEY ("sid")
        );
        CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");
      `);
      
      console.log('PostgreSQL session store initialized');
      
      return new PgSession({
        pool: pool,
        tableName: 'session',
        createTableIfMissing: false, // We create it manually above
      });
    } catch (error) {
      console.error('Failed to initialize PostgreSQL session store:', error);
      console.warn('Falling back to in-memory session store (sessions will be lost on restart)');
      return new session.MemoryStore();
    }
  };
  
  // Initialize the session store immediately and make it available
  pgSessionStore().then(store => {
    sessionStore = store;
    console.log('Session store configured successfully');
  });
} catch (error) {
  console.error('Error setting up session store:', error);
  console.warn('Using in-memory session store for reliability');
}

export const storage = {
  sessionStore,
  // ... rest of the storage exports
}; 