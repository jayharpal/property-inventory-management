// Database initialization script
import { pool, db } from './db.js';
import * as schema from './schema/schema.js';
import { migrate } from 'drizzle-orm/node-postgres/migrator';

async function initializeDatabase() {
  console.log('Starting database initialization...');
  
  try {
    // First, check if the database is connected
    const result = await pool.query('SELECT NOW()');
    console.log('Database connection verified at:', result.rows[0].now);
    
    // Check if users table exists
    const tablesResult = await pool.query(`
      SELECT EXISTS (
        SELECT FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = 'users'
      )
    `);
    
    const tableExists = tablesResult.rows[0].exists;
    if (!tableExists) {
      console.log('Users table does not exist. Running schema creation...');
      
      // Use Drizzle to create the tables based on the schema
      await db.execute(`
        CREATE TABLE IF NOT EXISTS "users" (
          "id" SERIAL PRIMARY KEY,
          "username" TEXT NOT NULL UNIQUE,
          "password" TEXT NOT NULL,
          "email" TEXT NOT NULL UNIQUE,
          "first_name" TEXT NOT NULL,
          "last_name" TEXT NOT NULL,
          "role" TEXT NOT NULL DEFAULT 'standard_admin',
          "portfolio_id" INTEGER,
          "created_at" TIMESTAMP DEFAULT NOW(),
          "updated_at" TIMESTAMP DEFAULT NOW()
        );
        
        CREATE TABLE IF NOT EXISTS "portfolios" (
          "id" SERIAL PRIMARY KEY,
          "name" TEXT NOT NULL,
          "owner_id" INTEGER NOT NULL,
          "created_by" INTEGER NOT NULL,
          "created_at" TIMESTAMP DEFAULT NOW(),
          "updated_at" TIMESTAMP DEFAULT NOW()
        );
        
        CREATE TABLE IF NOT EXISTS "invitations" (
          "id" SERIAL PRIMARY KEY,
          "email" TEXT NOT NULL,
          "portfolio_id" INTEGER NOT NULL,
          "role" TEXT NOT NULL DEFAULT 'standard_user',
          "token" TEXT NOT NULL UNIQUE,
          "accepted" BOOLEAN NOT NULL DEFAULT FALSE,
          "expires_at" TIMESTAMP NOT NULL,
          "created_at" TIMESTAMP DEFAULT NOW()
        );
        
        CREATE TABLE IF NOT EXISTS "owners" (
          "id" SERIAL PRIMARY KEY,
          "name" TEXT NOT NULL,
          "email" TEXT NOT NULL,
          "phone" TEXT,
          "markup_percentage" DECIMAL NOT NULL DEFAULT '15',
          "portfolio_id" INTEGER,
          "created_at" TIMESTAMP DEFAULT NOW()
        );
        
        CREATE TABLE IF NOT EXISTS "listings" (
          "id" SERIAL PRIMARY KEY,
          "name" TEXT NOT NULL,
          "address" TEXT NOT NULL,
          "property_type" TEXT NOT NULL DEFAULT 'apartment',
          "owner_id" INTEGER NOT NULL,
          "beds" INTEGER,
          "baths" DECIMAL,
          "image" TEXT,
          "active" BOOLEAN DEFAULT TRUE,
          "created_at" TIMESTAMP DEFAULT NOW()
        );
        
        CREATE TABLE IF NOT EXISTS "inventory" (
          "id" SERIAL PRIMARY KEY,
          "name" TEXT NOT NULL,
          "category" TEXT NOT NULL,
          "cost_price" DECIMAL NOT NULL,
          "default_markup" DECIMAL NOT NULL DEFAULT '15',
          "quantity" INTEGER NOT NULL DEFAULT 0,
          "vendor" TEXT,
          "min_quantity" INTEGER DEFAULT 10,
          "deleted" BOOLEAN DEFAULT FALSE NOT NULL,
          "portfolio_id" INTEGER,
          "created_at" TIMESTAMP DEFAULT NOW()
        );
        
        CREATE TABLE IF NOT EXISTS "expenses" (
          "id" SERIAL PRIMARY KEY,
          "listing_id" INTEGER NOT NULL,
          "owner_id" INTEGER NOT NULL,
          "inventory_id" INTEGER,
          "quantity_used" INTEGER DEFAULT 1,
          "markup_percent" DECIMAL NOT NULL DEFAULT '15',
          "date" TIMESTAMP DEFAULT NOW(),
          "total_cost" DECIMAL NOT NULL,
          "billed_amount" DECIMAL NOT NULL,
          "notes" TEXT
        );
        
        CREATE TABLE IF NOT EXISTS "user_settings" (
          "id" SERIAL PRIMARY KEY,
          "user_id" INTEGER NOT NULL UNIQUE,
          "theme" TEXT DEFAULT 'light',
          "email_notifications" BOOLEAN DEFAULT TRUE,
          "default_markup" DECIMAL DEFAULT '15',
          "updated_at" TIMESTAMP DEFAULT NOW()
        );
        
        CREATE TABLE IF NOT EXISTS "activity_logs" (
          "id" SERIAL PRIMARY KEY,
          "user_id" INTEGER NOT NULL,
          "action" TEXT NOT NULL,
          "details" TEXT,
          "timestamp" TIMESTAMP DEFAULT NOW()
        );
        
        CREATE TABLE IF NOT EXISTS "reports" (
          "id" SERIAL PRIMARY KEY,
          "name" TEXT NOT NULL,
          "type" TEXT NOT NULL,
          "owner_id" INTEGER,
          "month" INTEGER,
          "year" INTEGER,
          "file_path" TEXT,
          "generated_at" TIMESTAMP DEFAULT NOW(),
          "sent" BOOLEAN DEFAULT FALSE,
          "batch_id" TEXT,
          "notes" TEXT,
          "portfolio_id" INTEGER
        );
        
        CREATE TABLE IF NOT EXISTS "shopping_lists" (
          "id" SERIAL PRIMARY KEY,
          "name" TEXT NOT NULL,
          "user_id" INTEGER REFERENCES "users"("id"),
          "is_default" BOOLEAN DEFAULT FALSE,
          "created_at" TIMESTAMP DEFAULT NOW(),
          "updated_at" TIMESTAMP DEFAULT NOW()
        );
        
        CREATE TABLE IF NOT EXISTS "shopping_list_items" (
          "id" SERIAL PRIMARY KEY,
          "shopping_list_id" INTEGER REFERENCES "shopping_lists"("id") NOT NULL,
          "inventory_id" INTEGER REFERENCES "inventory"("id") NOT NULL,
          "quantity" INTEGER NOT NULL DEFAULT 1,
          "completed" BOOLEAN DEFAULT FALSE,
          "created_at" TIMESTAMP DEFAULT NOW(),
          "updated_at" TIMESTAMP DEFAULT NOW()
        );
        
        CREATE TABLE IF NOT EXISTS "inventory_refills" (
          "id" SERIAL PRIMARY KEY,
          "inventory_id" INTEGER REFERENCES "inventory"("id") NOT NULL,
          "quantity" INTEGER NOT NULL,
          "cost" DECIMAL DEFAULT '0',
          "refill_date" TIMESTAMP DEFAULT NOW(),
          "notes" TEXT,
          "user_id" INTEGER REFERENCES "users"("id"),
          "created_at" TIMESTAMP DEFAULT NOW()
        );
      `);
      
      console.log('Database tables created successfully');
    } else {
      console.log('Database tables already exist');
    }
    
    console.log('Database initialization completed successfully');
    return true;
  } catch (error) {
    console.error('Database initialization failed:', error);
    return false;
  }
}

export { initializeDatabase }; 