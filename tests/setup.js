// tests/setup.js
// This file is used by Jest to set up the test environment
// For both server and client tests

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/testdb';

// Increase Jest timeout for all tests
jest.setTimeout(10000);

// Global teardown
afterAll(async () => {
  // Any global cleanup needed
});