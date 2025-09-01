const request = require('supertest');
const { app } = require('../server/index');

describe('Shopping Lists API', () => {
  // GET /api/shopping-lists
  test('should fetch all shopping lists', async () => {
    const response = await request(app).get('/api/shopping-lists');
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });

  // GET /api/shopping-lists/:id
  test('should fetch a specific shopping list', async () => {
    // This assumes there's at least one shopping list with ID 1
    const response = await request(app).get('/api/shopping-lists/1');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('id');
    expect(response.body).toHaveProperty('title');
  });

  // Mock test for creating a shopping list
  test('should create a new shopping list', async () => {
    const newList = {
      title: 'Test Shopping List',
      description: 'Test description',
      userId: 1
    };

    const response = await request(app)
      .post('/api/shopping-lists')
      .send(newList);
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('id');
    expect(response.body.title).toBe(newList.title);
  });

  // Mock test for adding an item to a shopping list
  test('should add an item to a shopping list', async () => {
    const newItem = {
      shoppingListId: 1,
      inventoryItemId: 1,
      quantity: 5,
      notes: 'Test notes'
    };

    const response = await request(app)
      .post('/api/shopping-list-items')
      .send(newItem);
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('id');
    expect(response.body.shoppingListId).toBe(newItem.shoppingListId);
  });

  // Mock test for marking an item as completed
  test('should mark an item as completed', async () => {
    // This assumes there's at least one shopping list item with ID 1
    const response = await request(app)
      .patch('/api/shopping-list-items/1')
      .send({ completed: true });
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('completed');
    expect(response.body.completed).toBe(true);
  });
});