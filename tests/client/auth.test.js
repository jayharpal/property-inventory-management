import { setupMockFetch, cleanupMockFetch, createMockData } from './test-utils';

// Mock API responses for auth endpoints
const mockResponses = {
  '/api/auth/login': { user: createMockData.user() },
  '/api/auth/logout': { success: true },
  '/api/auth/user': { user: createMockData.user() },
};

describe('Authentication API Calls', () => {
  let originalFetch;

  beforeEach(() => {
    originalFetch = setupMockFetch(mockResponses);
  });

  afterEach(() => {
    cleanupMockFetch(originalFetch);
  });

  it('calls login API when credentials are provided', async () => {
    const credentials = { username: 'testuser', password: 'password' };
    
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });
    
    const data = await response.json();
    
    expect(response.ok).toBe(true);
    expect(data.user).toBeDefined();
    expect(data.user.username).toBe('testuser');
  });

  it('calls logout API', async () => {
    const response = await fetch('/api/auth/logout', {
      method: 'POST',
    });
    
    const data = await response.json();
    
    expect(response.ok).toBe(true);
    expect(data.success).toBe(true);
  });

  it('retrieves the current user', async () => {
    const response = await fetch('/api/auth/user');
    const data = await response.json();
    
    expect(response.ok).toBe(true);
    expect(data.user).toBeDefined();
    expect(data.user.id).toBe(1);
  });
});