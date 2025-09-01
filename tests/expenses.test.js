const request = require('supertest');
const { app } = require('../server/index');

describe('Expenses API', () => {
  // GET /api/expenses
  test('should fetch all expenses', async () => {
    const response = await request(app).get('/api/expenses');
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });

  // GET /api/expenses/listing/:listingId
  test('should fetch expenses for a specific listing', async () => {
    // This assumes there's at least one listing with ID 1 that has expenses
    const response = await request(app).get('/api/expenses/listing/1');
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });

  // GET /api/expenses/owner/:ownerId
  test('should fetch expenses for a specific owner', async () => {
    // This assumes there's at least one owner with ID 1 that has expenses
    const response = await request(app).get('/api/expenses/owner/1');
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });

  // Mock test for creating an expense
  test('should create a new expense', async () => {
    const newExpense = {
      description: 'Test Expense',
      amount: '99.99',
      date: new Date().toISOString(),
      category: 'maintenance',
      listingId: 1,
      inventoryItemId: null,
      notes: 'Test notes'
    };

    const response = await request(app)
      .post('/api/expenses')
      .send(newExpense);
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('id');
    expect(response.body.description).toBe(newExpense.description);
  });

  // Mock test for updating an expense
  test('should update an existing expense', async () => {
    // This assumes there's at least one expense with ID 1
    const updatedExpense = {
      description: 'Updated Test Expense',
      amount: '149.99'
    };

    const response = await request(app)
      .patch('/api/expenses/1')
      .send(updatedExpense);
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('id');
    expect(response.body.description).toBe(updatedExpense.description);
  });
});