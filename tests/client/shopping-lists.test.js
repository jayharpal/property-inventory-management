import { setupMockFetch, cleanupMockFetch, createMockData } from './test-utils';

// Create mock shopping lists
const mockShoppingLists = [
  createMockData.shoppingList({
    id: 1,
    title: 'Regular Supplies',
  }),
  createMockData.shoppingList({
    id: 2,
    title: 'Low Stock Items',
    isLowStockList: true,
    isDefault: true,
  }),
];

// Create mock shopping list items
const mockShoppingListItems = [
  createMockData.shoppingListItem({
    id: 1,
    listId: 1,
    inventoryItemId: 1,
    quantity: 2,
  }),
  createMockData.shoppingListItem({
    id: 2,
    listId: 1,
    inventoryItemId: 2,
    quantity: 5,
  }),
  createMockData.shoppingListItem({
    id: 3,
    listId: 2,
    inventoryItemId: 3,
    quantity: 10,
  }),
];

// Mock API responses for shopping list endpoints
const mockResponses = {
  '/api/shopping-lists': mockShoppingLists,
  '/api/shopping-lists/1': mockShoppingLists[0],
  '/api/shopping-lists/2': mockShoppingLists[1],
  '/api/shopping-lists/1/items': mockShoppingListItems.filter(item => item.listId === 1),
  '/api/shopping-lists/2/items': mockShoppingListItems.filter(item => item.listId === 2),
  '/api/shopping-lists/default-low-stock': mockShoppingLists[1],
};

describe('Shopping Lists API Calls', () => {
  let originalFetch;

  beforeEach(() => {
    originalFetch = setupMockFetch(mockResponses);
  });

  afterEach(() => {
    cleanupMockFetch(originalFetch);
  });

  it('fetches all shopping lists', async () => {
    const response = await fetch('/api/shopping-lists');
    const data = await response.json();
    
    expect(response.ok).toBe(true);
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBe(2);
    expect(data[0].title).toBe('Regular Supplies');
    expect(data[1].isLowStockList).toBe(true);
  });

  it('fetches the default low stock list', async () => {
    const response = await fetch('/api/shopping-lists/default-low-stock');
    const data = await response.json();
    
    expect(response.ok).toBe(true);
    expect(data.id).toBe(2);
    expect(data.title).toBe('Low Stock Items');
    expect(data.isDefault).toBe(true);
    expect(data.isLowStockList).toBe(true);
  });

  it('fetches a specific shopping list by ID', async () => {
    const response = await fetch('/api/shopping-lists/1');
    const data = await response.json();
    
    expect(response.ok).toBe(true);
    expect(data.id).toBe(1);
    expect(data.title).toBe('Regular Supplies');
  });

  it('fetches items for a specific shopping list', async () => {
    const response = await fetch('/api/shopping-lists/1/items');
    const data = await response.json();
    
    expect(response.ok).toBe(true);
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBe(2);
    expect(data[0].listId).toBe(1);
    expect(data[1].listId).toBe(1);
  });

  it('creates a new shopping list', async () => {
    // Mock POST request response
    const newListMock = createMockData.shoppingList({
      id: 3,
      title: 'New List',
    });
    
    // Override fetch for this test only
    global.fetch = jest.fn((url, options) => {
      if (url.includes('/api/shopping-lists') && options.method === 'POST') {
        return Promise.resolve({
          ok: true,
          status: 201,
          json: async () => newListMock,
        });
      }
      
      // Default mock response
      return Promise.resolve({
        ok: false,
        status: 404,
        json: async () => ({ message: 'Not found' }),
      });
    });
    
    const newList = { title: 'New List' };
    
    const response = await fetch('/api/shopping-lists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newList),
    });
    
    const data = await response.json();
    
    expect(response.ok).toBe(true);
    expect(data.id).toBe(3);
    expect(data.title).toBe('New List');
  });

  it('adds an item to a shopping list', async () => {
    // Mock POST request response
    const newItemMock = createMockData.shoppingListItem({
      id: 4,
      listId: 1,
      inventoryItemId: 3,
      quantity: 1,
    });
    
    // Override fetch for this test only
    global.fetch = jest.fn((url, options) => {
      if (url.includes('/api/shopping-lists/1/items') && options.method === 'POST') {
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
    
    const newItem = { inventoryItemId: 3, quantity: 1 };
    
    const response = await fetch('/api/shopping-lists/1/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newItem),
    });
    
    const data = await response.json();
    
    expect(response.ok).toBe(true);
    expect(data.id).toBe(4);
    expect(data.listId).toBe(1);
    expect(data.inventoryItemId).toBe(3);
  });

  it('marks a shopping list item as completed', async () => {
    // Mock PATCH request response
    const updatedItemMock = { ...mockShoppingListItems[0], completed: true };
    
    // Override fetch for this test only
    global.fetch = jest.fn((url, options) => {
      if (url.includes('/api/shopping-lists/items/1/complete') && options.method === 'PATCH') {
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
    
    const response = await fetch('/api/shopping-lists/items/1/complete', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed: true }),
    });
    
    const data = await response.json();
    
    expect(response.ok).toBe(true);
    expect(data.id).toBe(1);
    expect(data.completed).toBe(true);
  });

  it('refills completed items in a shopping list', async () => {
    // Mock POST request response for refill
    const refillResponseMock = [
      { id: 1, name: 'Paper Towels', quantity: 12 },
      { id: 2, name: 'Light Bulbs', quantity: 8 },
    ];
    
    // Override fetch for this test only
    global.fetch = jest.fn((url, options) => {
      if (url.includes('/api/shopping-lists/1/refill') && options.method === 'POST') {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => refillResponseMock,
        });
      }
      
      // Default mock response
      return Promise.resolve({
        ok: false,
        status: 404,
        json: async () => ({ message: 'Not found' }),
      });
    });
    
    const response = await fetch('/api/shopping-lists/1/refill', {
      method: 'POST',
    });
    
    const data = await response.json();
    
    expect(response.ok).toBe(true);
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBe(2);
    expect(data[0].quantity).toBe(12);
    expect(data[1].quantity).toBe(8);
  });
});