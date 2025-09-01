import { setupMockFetch, cleanupMockFetch, createMockData } from './test-utils';

// Create mock expenses
const mockExpenses = [
  createMockData.expense({
    id: 1,
    listingId: 1,
    amount: '150.00',
    category: 'repairs',
    description: 'Plumbing repair',
  }),
  createMockData.expense({
    id: 2,
    listingId: 1,
    amount: '75.50',
    category: 'supplies',
    description: 'Cleaning supplies',
  }),
  createMockData.expense({
    id: 3,
    listingId: 2,
    amount: '200.00',
    category: 'maintenance',
    description: 'HVAC maintenance',
  }),
];

// Create mock listings for testing
const mockListings = [
  createMockData.listing({
    id: 1,
    ownerId: 1,
    name: 'Apartment 101',
  }),
  createMockData.listing({
    id: 2,
    ownerId: 2,
    name: 'House 202',
  }),
];

// Mock API responses for expense endpoints
const mockResponses = {
  '/api/expenses': mockExpenses,
  '/api/expenses/1': mockExpenses[0],
  '/api/expenses/listing/1': mockExpenses.filter(expense => expense.listingId === 1),
  '/api/expenses/listing/2': mockExpenses.filter(expense => expense.listingId === 2),
  '/api/listings': mockListings,
};

describe('Expenses API Calls', () => {
  let originalFetch;

  beforeEach(() => {
    originalFetch = setupMockFetch(mockResponses);
  });

  afterEach(() => {
    cleanupMockFetch(originalFetch);
  });

  it('fetches all expenses', async () => {
    const response = await fetch('/api/expenses');
    const data = await response.json();
    
    expect(response.ok).toBe(true);
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBe(3);
    expect(data[0].description).toBe('Plumbing repair');
  });

  it('fetches a specific expense by ID', async () => {
    const response = await fetch('/api/expenses/1');
    const data = await response.json();
    
    expect(response.ok).toBe(true);
    expect(data.id).toBe(1);
    expect(data.amount).toBe('150.00');
    expect(data.category).toBe('repairs');
  });

  it('fetches expenses for a specific listing', async () => {
    const response = await fetch('/api/expenses/listing/1');
    const data = await response.json();
    
    expect(response.ok).toBe(true);
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBe(2);
    expect(data[0].listingId).toBe(1);
    expect(data[1].listingId).toBe(1);
  });

  it('creates a new expense', async () => {
    // Mock POST request response
    const newExpenseMock = createMockData.expense({
      id: 4,
      listingId: 2,
      amount: '50.00',
      category: 'services',
      description: 'Landscaping',
    });
    
    // Override fetch for this test only
    global.fetch = jest.fn((url, options) => {
      if (url.includes('/api/expenses') && options.method === 'POST') {
        return Promise.resolve({
          ok: true,
          status: 201,
          json: async () => newExpenseMock,
        });
      }
      
      // Default mock response
      return Promise.resolve({
        ok: false,
        status: 404,
        json: async () => ({ message: 'Not found' }),
      });
    });
    
    const newExpense = {
      listingId: 2,
      amount: '50.00',
      category: 'services',
      description: 'Landscaping',
      date: new Date().toISOString(),
    };
    
    const response = await fetch('/api/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newExpense),
    });
    
    const data = await response.json();
    
    expect(response.ok).toBe(true);
    expect(data.id).toBe(4);
    expect(data.description).toBe('Landscaping');
    expect(data.category).toBe('services');
  });

  it('updates an expense', async () => {
    // Mock PATCH request response
    const updatedExpenseMock = { 
      ...mockExpenses[0], 
      amount: '175.00',
      notes: 'Updated notes' 
    };
    
    // Override fetch for this test only
    global.fetch = jest.fn((url, options) => {
      if (url.includes('/api/expenses/1') && options.method === 'PATCH') {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => updatedExpenseMock,
        });
      }
      
      // Default mock response
      return Promise.resolve({
        ok: false,
        status: 404,
        json: async () => ({ message: 'Not found' }),
      });
    });
    
    const update = { 
      amount: '175.00',
      notes: 'Updated notes' 
    };
    
    const response = await fetch('/api/expenses/1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(update),
    });
    
    const data = await response.json();
    
    expect(response.ok).toBe(true);
    expect(data.id).toBe(1);
    expect(data.amount).toBe('175.00');
    expect(data.notes).toBe('Updated notes');
    expect(data.description).toBe('Plumbing repair');
  });

  it('deletes an expense', async () => {
    // Mock DELETE request response
    global.fetch = jest.fn((url, options) => {
      if (url.includes('/api/expenses/1') && options.method === 'DELETE') {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ success: true }),
        });
      }
      
      // Default mock response
      return Promise.resolve({
        ok: false,
        status: 404,
        json: async () => ({ message: 'Not found' }),
      });
    });
    
    const response = await fetch('/api/expenses/1', {
      method: 'DELETE',
    });
    
    const data = await response.json();
    
    expect(response.ok).toBe(true);
    expect(data.success).toBe(true);
  });
});