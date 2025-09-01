#!/usr/bin/env node
import { initializeDatabase } from '../db-init.js';

// Run the initialization and exit with appropriate code
async function run() {
  console.log('🚀 Starting database initialization...');
  
  try {
    const success = await initializeDatabase();
    
    if (success) {
      console.log('✅ Database initialization completed successfully');
      process.exit(0);
    } else {
      console.error('❌ Database initialization failed');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Database initialization error:', error);
    process.exit(1);
  }
}

run(); 