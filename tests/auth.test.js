const request = require('supertest');
const { app } = require('../server/index');

describe('Authentication API', () => {
  // Test user registration
  test('should register a new user', async () => {
    const newUser = {
      username: `testuser_${Date.now()}`,
      password: 'Password123!',
      email: `test_${Date.now()}@example.com`,
      firstName: 'Test',
      lastName: 'User',
      role: 'user'
    };

    const response = await request(app)
      .post('/api/auth/register')
      .send(newUser);
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('id');
    expect(response.body.username).toBe(newUser.username);
  });

  // Test user login
  test('should login an existing user', async () => {
    const credentials = {
      username: 'admin', // assuming this user exists in the test database
      password: 'admin'
    };

    const response = await request(app)
      .post('/api/auth/login')
      .send(credentials);
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('id');
    expect(response.body).toHaveProperty('username');
  });

  // Test invalid login
  test('should reject invalid credentials', async () => {
    const invalidCredentials = {
      username: 'nonexistent',
      password: 'wrongpassword'
    };

    const response = await request(app)
      .post('/api/auth/login')
      .send(invalidCredentials);
    
    expect(response.status).toBe(401);
  });

  // Test logout
  test('should log out a user', async () => {
    const agent = request.agent(app);
    
    // First login
    await agent
      .post('/api/auth/login')
      .send({
        username: 'admin',
        password: 'admin'
      });
    
    // Then logout
    const response = await agent.post('/api/auth/logout');
    expect(response.status).toBe(200);
  });

  // Test accessing protected route without authentication
  test('should reject unauthenticated requests to protected routes', async () => {
    const response = await request(app).get('/api/user/settings');
    expect(response.status).toBe(401);
  });

  // Test user settings
  test('should get user settings for authenticated user', async () => {
    const agent = request.agent(app);
    
    // First login
    await agent
      .post('/api/auth/login')
      .send({
        username: 'admin',
        password: 'admin'
      });
    
    // Then access protected route
    const response = await agent.get('/api/user/settings');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('userId');
  });
});