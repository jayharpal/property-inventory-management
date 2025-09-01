import dotenv from 'dotenv';
import pg from 'pg';
import { sql } from 'drizzle-orm';

const { Pool } = pg;
dotenv.config();

async function runMigration() {
  try {
    console.log('Starting database migration...');
    console.log('DATABASE_URL:', process.env.DATABASE_URL);
    
    // Connect to the database
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
    
    console.log('Connected to database, running migration SQL...');
    
    // First ensure the portfolios table exists (in case this is the initial setup)
    await pool.query(`
      DO $$ 
      BEGIN
          IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'portfolios') THEN
              CREATE TABLE portfolios (
                  id SERIAL PRIMARY KEY,
                  name TEXT NOT NULL,
                  owner_id INTEGER NOT NULL,
                  created_by INTEGER NOT NULL,
                  created_at TIMESTAMP DEFAULT NOW(),
                  updated_at TIMESTAMP DEFAULT NOW()
              );
          END IF;
      END $$;
    `);
    
    console.log('Portfolios table check complete');
    
    // Make sure at least one portfolio exists
    await pool.query(`
      INSERT INTO portfolios (name, owner_id, created_by)
      SELECT 'Default Portfolio', 
             (SELECT id FROM users WHERE role = 'administrator' ORDER BY id LIMIT 1), 
             (SELECT id FROM users WHERE role = 'administrator' ORDER BY id LIMIT 1)
      WHERE NOT EXISTS (SELECT 1 FROM portfolios LIMIT 1);
    `);
    
    console.log('Default portfolio check complete');
    
    // Update users table
    await pool.query(`
      UPDATE users SET portfolio_id = (SELECT id FROM portfolios ORDER BY id LIMIT 1) 
      WHERE portfolio_id IS NULL;
      ALTER TABLE users ALTER COLUMN portfolio_id SET NOT NULL;
    `);
    
    console.log('Users table updated');
    
    // Update owners table
    await pool.query(`
      UPDATE owners SET portfolio_id = (SELECT id FROM portfolios ORDER BY id LIMIT 1) 
      WHERE portfolio_id IS NULL;
      ALTER TABLE owners ALTER COLUMN portfolio_id SET NOT NULL;
    `);
    
    console.log('Owners table updated');
    
    // Update inventory table
    await pool.query(`
      UPDATE inventory SET portfolio_id = (SELECT id FROM portfolios ORDER BY id LIMIT 1) 
      WHERE portfolio_id IS NULL;
      ALTER TABLE inventory ALTER COLUMN portfolio_id SET NOT NULL;
    `);
    
    console.log('Inventory table updated');
    
    // Update reports table (if it exists)
    await pool.query(`
      DO $$ 
      BEGIN
          IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'reports') THEN
              UPDATE reports SET portfolio_id = (SELECT id FROM portfolios ORDER BY id LIMIT 1) 
              WHERE portfolio_id IS NULL;
              ALTER TABLE reports ALTER COLUMN portfolio_id SET NOT NULL;
          END IF;
      END $$;
    `);
    
    console.log('Reports table updated');
    
    // Add foreign key constraints - Users
    await pool.query(`
      ALTER TABLE users 
      DROP CONSTRAINT IF EXISTS fk_users_portfolio;
      ALTER TABLE users 
      ADD CONSTRAINT fk_users_portfolio 
      FOREIGN KEY (portfolio_id) 
      REFERENCES portfolios(id);
    `);
    
    // Add foreign key constraints - Owners
    await pool.query(`
      ALTER TABLE owners 
      DROP CONSTRAINT IF EXISTS fk_owners_portfolio;
      ALTER TABLE owners 
      ADD CONSTRAINT fk_owners_portfolio 
      FOREIGN KEY (portfolio_id) 
      REFERENCES portfolios(id);
    `);
    
    // Add foreign key constraints - Listings
    await pool.query(`
      ALTER TABLE listings 
      DROP CONSTRAINT IF EXISTS fk_listings_portfolio;
      ALTER TABLE listings 
      ADD CONSTRAINT fk_listings_portfolio 
      FOREIGN KEY (portfolio_id) 
      REFERENCES portfolios(id);
    `);
    
    // Add foreign key constraints - Inventory
    await pool.query(`
      ALTER TABLE inventory 
      DROP CONSTRAINT IF EXISTS fk_inventory_portfolio;
      ALTER TABLE inventory 
      ADD CONSTRAINT fk_inventory_portfolio 
      FOREIGN KEY (portfolio_id) 
      REFERENCES portfolios(id);
    `);
    
    // Add foreign key constraints - Expenses
    await pool.query(`
      ALTER TABLE expenses 
      DROP CONSTRAINT IF EXISTS fk_expenses_portfolio;
      ALTER TABLE expenses 
      ADD CONSTRAINT fk_expenses_portfolio 
      FOREIGN KEY (portfolio_id) 
      REFERENCES portfolios(id);
    `);
    
    // Add foreign key constraints - Reports
    await pool.query(`
      DO $$ 
      BEGIN
          IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'reports') THEN
              ALTER TABLE reports 
              DROP CONSTRAINT IF EXISTS fk_reports_portfolio;
              ALTER TABLE reports 
              ADD CONSTRAINT fk_reports_portfolio 
              FOREIGN KEY (portfolio_id) 
              REFERENCES portfolios(id);
          END IF;
      END $$;
    `);
    
    console.log('Foreign key constraints added');
    console.log('Migration completed successfully!');
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigration(); 