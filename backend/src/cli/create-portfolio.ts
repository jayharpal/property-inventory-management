import { config } from "dotenv";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { portfolios } from "../schema/schema.js";
import { sql } from "drizzle-orm";

config();

async function createPortfolio() {
  // Get command line arguments
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.error("Usage: tsx src/cli/create-portfolio.ts <name> <userId>");
    process.exit(1);
  }

  const name = args[0];
  const userId = parseInt(args[1]);
  
  if (isNaN(userId)) {
    console.error("User ID must be a number");
    process.exit(1);
  }

  try {
    console.log(`Creating portfolio "${name}" for user ID ${userId}...`);
    
    // Connect to the database
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
    
    const db = drizzle(pool);
    
    // Check if the user exists
    const userResult = await db.execute(sql`SELECT id FROM users WHERE id = ${userId}`);
    
    if (userResult.rows.length === 0) {
      console.error(`User with ID ${userId} not found`);
      process.exit(1);
    }
    
    // Create the portfolio
    const result = await db.insert(portfolios).values({
      name,
      ownerId: userId,
      createdBy: userId,
    }).returning();
    
    console.log(`Portfolio created successfully with ID ${result[0].id}`);
    
    // Close the connection
    await pool.end();
    
    process.exit(0);
  } catch (error) {
    console.error("Failed to create portfolio:", error);
    process.exit(1);
  }
}

createPortfolio(); 