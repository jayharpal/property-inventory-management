import React from 'react';
import { render } from '@testing-library/react';

// Simplified test utils that don't rely on complex third-party libraries

// Mock fetch responses
export function setupMockFetch(mockResponses = {}) {
  const originalFetch = global.fetch;
  
  global.fetch = jest.fn((url, options) => {
    // Find a matching mock response based on the URL (exact match first)
    const exactMatch = mockResponses[url];
    if (exactMatch) {
      if (typeof exactMatch === 'function') {
        return exactMatch(url, options);
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => exactMatch,
      });
    }
    
    // Try partial match if no exact match found
    const matchingUrl = Object.keys(mockResponses).find(key => url.includes(key));
    
    if (matchingUrl) {
      if (typeof mockResponses[matchingUrl] === 'function') {
        return mockResponses[matchingUrl](url, options);
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => mockResponses[matchingUrl],
      });
    }
    
    // Default mock response for non-matched URLs
    console.warn(`No mock found for URL: ${url}`);
    return Promise.resolve({
      ok: false,
      status: 404,
      json: async () => ({ message: 'Not found', url }),
    });
  });
  
  return originalFetch;
}

export function cleanupMockFetch(originalFetch) {
  global.fetch = originalFetch;
}

// Mock AuthContext values
export const mockAuthContext = {
  user: {
    id: 1,
    username: 'testuser',
    role: 'admin',
    firstName: 'Test',
    lastName: 'User',
  },
  isLoggedIn: true,
  login: jest.fn(() => Promise.resolve(true)),
  logout: jest.fn(() => Promise.resolve(true)),
  fetchUser: jest.fn(() => Promise.resolve(true)),
  isLoading: false,
  error: null,
};

// Mock AuthContext that can be imported directly in tests
export const AuthContext = React.createContext(mockAuthContext);
AuthContext.displayName = 'AuthContext';

// Mock useAuth hook
export function useAuth() {
  return React.useContext(AuthContext);
}

// Simple render function with context providers
export function renderWithProviders(ui, options = {}) {
  function Wrapper({ children }) {
    const authValues = options.authValues || mockAuthContext;
    
    return (
      <AuthContext.Provider value={authValues}>
        <div data-testid="test-wrapper">{children}</div>
      </AuthContext.Provider>
    );
  }
  
  return render(ui, { wrapper: Wrapper, ...options });
}

// Helper to create mock data
export const createMockData = {
  owner: (overrides = {}) => ({
    id: 1,
    name: 'Test Owner',
    email: 'test@example.com',
    phone: '555-123-4567',
    notes: 'Test notes',
    ...overrides,
  }),
  
  listing: (overrides = {}) => ({
    id: 1,
    ownerId: 1,
    name: 'Test Property',
    address: '123 Test Street',
    type: 'apartment',
    bedrooms: 2,
    bathrooms: 1,
    notes: 'Test property notes',
    ...overrides,
  }),
  
  inventoryItem: (overrides = {}) => ({
    id: 1,
    name: 'Test Item',
    quantity: 10,
    minQuantity: 5,
    category: 'supplies',
    notes: 'Test inventory notes',
    status: 'inStock',
    ...overrides,
  }),
  
  expense: (overrides = {}) => ({
    id: 1,
    listingId: 1,
    amount: '100.00',
    date: new Date().toISOString(),
    category: 'repairs',
    description: 'Test expense',
    notes: 'Test expense notes',
    ...overrides,
  }),
  
  shoppingList: (overrides = {}) => ({
    id: 1,
    userId: 1,
    title: 'Test Shopping List',
    isDefault: false,
    isLowStockList: false,
    ...overrides,
  }),
  
  shoppingListItem: (overrides = {}) => ({
    id: 1,
    listId: 1,
    inventoryItemId: 1,
    quantity: 2,
    completed: false,
    inventoryItem: {
      id: 1,
      name: 'Test Item',
      quantity: 10,
      category: 'supplies',
    },
    ...overrides,
  }),
  
  user: (overrides = {}) => ({
    id: 1,
    username: 'testuser',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    role: 'admin',
    ...overrides,
  }),
};