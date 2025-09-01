const request = require('supertest');
const { app } = require('../server/index');

describe('Inventory API', () => {
  // GET /api/inventory
  test('should fetch all inventory items', async () => {
    const response = await request(app).get('/api/inventory');
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });

  // GET /api/inventory/low-stock
  test('should fetch low stock inventory items', async () => {
    const response = await request(app).get('/api/inventory/low-stock');
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });

  // Mock test for creating an inventory item
  test('should create a new inventory item', async () => {
    const newItem = {
      name: 'Test Item',
      description: 'Test description',
      category: 'supplies',
      quantity: 10,
      lowStockThreshold: 5,
      unitPrice: '9.99',
      listingId: 1
    };

    // This is a simple mock - in a real environment we would create and then delete the item
    const response = await request(app)
      .post('/api/inventory')
      .send(newItem);
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('id');
    expect(response.body.name).toBe(newItem.name);
  });
});