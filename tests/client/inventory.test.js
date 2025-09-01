import { setupMockFetch, cleanupMockFetch, createMockData } from './test-utils';

// Create mock inventory items
const mockInventoryItems = [
  createMockData.inventoryItem({
    id: 1,
    name: 'Paper Towels',
    quantity: 10,
    minQuantity: 5,
    category: 'supplies',
  }),
  createMockData.inventoryItem({
    id: 2,
    name: 'Light Bulbs',
    quantity: 3,
    minQuantity: 5,
    category: 'maintenance',
    status: 'lowStock',
  }),
  createMockData.inventoryItem({
    id: 3,
    name: 'Toilet Paper',
    quantity: 1,
    minQuantity: 10,
    category: 'supplies',
    status: 'critical',
  }),
];

// Mock API responses for inventory endpoints
const mockResponses = {
  '/api/inventory': mockInventoryItems,
  '/api/inventory/low-stock': [mockInventoryItems[1], mockInventoryItems[2]],
  '/api/inventory/1': mockInventoryItems[0],
};

describe('Inventory API Calls', () => {
  let originalFetch;

  beforeEach(() => {
    originalFetch = setupMockFetch(mockResponses);
  });

  afterEach(() => {
    cleanupMockFetch(originalFetch);
  });

  it('fetches all inventory items', async () => {
    const response = await fetch('/api/inventory');
    const data = await response.json();
    
    expect(response.ok).toBe(true);
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBe(3);
    expect(data[0].name).toBe('Paper Towels');
  });

  it('fetches low stock inventory items', async () => {
    const response = await fetch('/api/inventory/low-stock');
    const data = await response.json();
    
    expect(response.ok).toBe(true);
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBe(2);
    expect(data.some(item => item.name === 'Light Bulbs')).toBe(true);
    expect(data.some(item => item.name === 'Toilet Paper')).toBe(true);
  });

  it('fetches a specific inventory item by ID', async () => {
    const response = await fetch('/api/inventory/1');
    const data = await response.json();
    
    expect(response.ok).toBe(true);
    expect(data.id).toBe(1);
    expect(data.name).toBe('Paper Towels');
    expect(data.quantity).toBe(10);
  });

  it('creates a new inventory item', async () => {
    // Mock POST request response
    const newItemMock = createMockData.inventoryItem({
      id: 4,
      name: 'Dish Soap',
      quantity: 8,
      minQuantity: 3,
      category: 'supplies',
    });
    
    // Override fetch for this test only
    global.fetch = jest.fn((url, options) => {
      if (url.includes('/api/inventory') && options.method === 'POST') {
        return Promise.resolve({
          ok: true,
          status: 201,
          json: async () => newItemMock,
        });
      }
      
      // Default mock response
      return Promise.resolve({
        ok: false,
        status: 404,
        json: async () => ({ message: 'Not found' }),
      });
    });
    
    const newItem = {
      name: 'Dish Soap',
      quantity: 8,
      minQuantity: 3,
      category: 'supplies',
      notes: 'For kitchen use',
    };
    
    const response = await fetch('/api/inventory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newItem),
    });
    
    const data = await response.json();
    
    expect(response.ok).toBe(true);
    expect(data.id).toBe(4);
    expect(data.name).toBe('Dish Soap');
  });

  it('updates an inventory item', async () => {
    // Mock PATCH request response
    const updatedItemMock = { ...mockInventoryItems[0], quantity: 15 };
    
    // Override fetch for this test only
    global.fetch = jest.fn((url, options) => {
      if (url.includes('/api/inventory/1') && options.method === 'PATCH') {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => updatedItemMock,
        });
      }
      
      // Default mock response
      return Promise.resolve({
        ok: false,
        status: 404,
        json: async () => ({ message: 'Not found' }),
      });
    });
    
    const update = { quantity: 15 };
    
    const response = await fetch('/api/inventory/1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(update),
    });
    
    const data = await response.json();
    
    expect(response.ok).toBe(true);
    expect(data.id).toBe(1);
    expect(data.quantity).toBe(15);
    expect(data.name).toBe('Paper Towels');
  });
});