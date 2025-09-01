import { sql } from "drizzle-orm";
import { pgTable, integer, foreignKey } from "drizzle-orm/pg-core";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";

export async function up(db: PostgresJsDatabase) {
  // 1. First make portfolioId NOT NULL where it's currently nullable
  await sql`
    -- Make portfolioId NOT NULL in users table
    UPDATE users SET portfolio_id = (
      SELECT id FROM portfolios LIMIT 1
    ) WHERE portfolio_id IS NULL;
    ALTER TABLE users ALTER COLUMN portfolio_id SET NOT NULL;
    
    -- Make portfolioId NOT NULL in owners table
    UPDATE owners SET portfolio_id = (
      SELECT id FROM portfolios LIMIT 1
    ) WHERE portfolio_id IS NULL;
    ALTER TABLE owners ALTER COLUMN portfolio_id SET NOT NULL;
    
    -- Make portfolioId NOT NULL in inventory table
    UPDATE inventory SET portfolio_id = (
      SELECT id FROM portfolios LIMIT 1
    ) WHERE portfolio_id IS NULL;
    ALTER TABLE inventory ALTER COLUMN portfolio_id SET NOT NULL;
    
    -- Make portfolioId NOT NULL in reports table
    UPDATE reports SET portfolio_id = (
      SELECT id FROM portfolios LIMIT 1
    ) WHERE portfolio_id IS NULL;
    ALTER TABLE reports ALTER COLUMN portfolio_id SET NOT NULL;
  `;

  // 2. Add foreign key constraints
  await sql`
    -- Add foreign key constraints to users
    ALTER TABLE users 
    ADD CONSTRAINT fk_users_portfolio 
    FOREIGN KEY (portfolio_id) 
    REFERENCES portfolios(id);

    -- Add foreign key constraints to owners
    ALTER TABLE owners 
    ADD CONSTRAINT fk_owners_portfolio 
    FOREIGN KEY (portfolio_id) 
    REFERENCES portfolios(id);

    -- Add foreign key constraints to listings
    ALTER TABLE listings 
    ADD CONSTRAINT fk_listings_portfolio 
    FOREIGN KEY (portfolio_id) 
    REFERENCES portfolios(id);

    -- Add foreign key constraints to inventory
    ALTER TABLE inventory 
    ADD CONSTRAINT fk_inventory_portfolio 
    FOREIGN KEY (portfolio_id) 
    REFERENCES portfolios(id);

    -- Add foreign key constraints to expenses
    ALTER TABLE expenses 
    ADD CONSTRAINT fk_expenses_portfolio 
    FOREIGN KEY (portfolio_id) 
    REFERENCES portfolios(id);

    -- Add foreign key constraints to reports
    ALTER TABLE reports 
    ADD CONSTRAINT fk_reports_portfolio 
    FOREIGN KEY (portfolio_id) 
    REFERENCES portfolios(id);
  `;
}

export async function down(db: PostgresJsDatabase) {
  // Remove foreign key constraints
  await sql`
    ALTER TABLE users DROP CONSTRAINT IF EXISTS fk_users_portfolio;
    ALTER TABLE owners DROP CONSTRAINT IF EXISTS fk_owners_portfolio;
    ALTER TABLE listings DROP CONSTRAINT IF EXISTS fk_listings_portfolio;
    ALTER TABLE inventory DROP CONSTRAINT IF EXISTS fk_inventory_portfolio;
    ALTER TABLE expenses DROP CONSTRAINT IF EXISTS fk_expenses_portfolio;
    ALTER TABLE reports DROP CONSTRAINT IF EXISTS fk_reports_portfolio;
  `;

  // Make portfolioId nullable again
  await sql`
    ALTER TABLE users ALTER COLUMN portfolio_id DROP NOT NULL;
    ALTER TABLE owners ALTER COLUMN portfolio_id DROP NOT NULL;
    ALTER TABLE inventory ALTER COLUMN portfolio_id DROP NOT NULL;
    ALTER TABLE reports ALTER COLUMN portfolio_id DROP NOT NULL;
  `;
} 