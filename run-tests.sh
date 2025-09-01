#!/bin/bash
# Script to run tests

# Run all server tests
echo "Running server tests..."
npx jest tests/*.test.js

# Run all client tests
echo "Running client tests..."
npx jest tests/client/*.test.js

# Run specific test suites
# Run server tests only
# npx jest tests/*.test.js

# Run client tests only
# npx jest tests/client/*.test.js

# Run tests with watch mode
# npx jest --watch

# Run tests with coverage
# npx jest --coverage
