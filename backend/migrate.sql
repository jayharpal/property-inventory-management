-- First ensure the portfolios table exists (in case this is the initial setup)
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

-- Make sure at least one portfolio exists
INSERT INTO portfolios (name, owner_id, created_by)
SELECT 'Default Portfolio', 
       (SELECT id FROM users WHERE role = 'administrator' ORDER BY id LIMIT 1), 
       (SELECT id FROM users WHERE role = 'administrator' ORDER BY id LIMIT 1)
WHERE NOT EXISTS (SELECT 1 FROM portfolios LIMIT 1);

-- Update users table
UPDATE users SET portfolio_id = (SELECT id FROM portfolios ORDER BY id LIMIT 1) 
WHERE portfolio_id IS NULL;
ALTER TABLE users ALTER COLUMN portfolio_id SET NOT NULL;

-- Update owners table
UPDATE owners SET portfolio_id = (SELECT id FROM portfolios ORDER BY id LIMIT 1) 
WHERE portfolio_id IS NULL;
ALTER TABLE owners ALTER COLUMN portfolio_id SET NOT NULL;

-- Update inventory table
UPDATE inventory SET portfolio_id = (SELECT id FROM portfolios ORDER BY id LIMIT 1) 
WHERE portfolio_id IS NULL;
ALTER TABLE inventory ALTER COLUMN portfolio_id SET NOT NULL;

-- Update reports table (if it exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'reports') THEN
        UPDATE reports SET portfolio_id = (SELECT id FROM portfolios ORDER BY id LIMIT 1) 
        WHERE portfolio_id IS NULL;
        ALTER TABLE reports ALTER COLUMN portfolio_id SET NOT NULL;
    END IF;
END $$;

-- Add foreign key constraints
ALTER TABLE users 
DROP CONSTRAINT IF EXISTS fk_users_portfolio;
ALTER TABLE users 
ADD CONSTRAINT fk_users_portfolio 
FOREIGN KEY (portfolio_id) 
REFERENCES portfolios(id);

ALTER TABLE owners 
DROP CONSTRAINT IF EXISTS fk_owners_portfolio;
ALTER TABLE owners 
ADD CONSTRAINT fk_owners_portfolio 
FOREIGN KEY (portfolio_id) 
REFERENCES portfolios(id);

ALTER TABLE listings 
DROP CONSTRAINT IF EXISTS fk_listings_portfolio;
ALTER TABLE listings 
ADD CONSTRAINT fk_listings_portfolio 
FOREIGN KEY (portfolio_id) 
REFERENCES portfolios(id);

ALTER TABLE inventory 
DROP CONSTRAINT IF EXISTS fk_inventory_portfolio;
ALTER TABLE inventory 
ADD CONSTRAINT fk_inventory_portfolio 
FOREIGN KEY (portfolio_id) 
REFERENCES portfolios(id);

ALTER TABLE expenses 
DROP CONSTRAINT IF EXISTS fk_expenses_portfolio;
ALTER TABLE expenses 
ADD CONSTRAINT fk_expenses_portfolio 
FOREIGN KEY (portfolio_id) 
REFERENCES portfolios(id);

-- Check if reports table exists
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