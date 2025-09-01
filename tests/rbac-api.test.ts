import { describe, it, expect, beforeAll, afterAll, vi, beforeEach, afterEach } from 'vitest';
import express, { Express } from 'express';
import supertest from 'supertest';
import session from 'express-session';
import passport from 'passport';
import { setupAuth } from '../server/auth';
import { IStorage } from '../server/storage';
import { User } from '../shared/schema';

// Mock the database and storage
vi.mock('../server/db', () => ({
  db: {},
  pool: {}
}));

// Create mock users for testing
const testUsers: Record<string, User> = {
  standardUser: {
    id: 1,
    username: 'standard_user_test',
    password: 'hashed_password',
    email: 'standard_user@example.com',
    firstName: 'Standard',
    lastName: 'User',
    role: 'standard_user',
    portfolioId: 1,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  standardAdmin: {
    id: 2,
    username: 'standard_admin_test',
    password: 'hashed_password',
    email: 'standard_admin@example.com',
    firstName: 'Standard',
    lastName: 'Admin',
    role: 'standard_admin',
    portfolioId: 1,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  administrator: {
    id: 3,
    username: 'administrator_test',
    password: 'hashed_password',
    email: 'administrator@example.com',
    firstName: 'Admin',
    lastName: 'User',
    role: 'administrator',
    portfolioId: null,
    createdAt: new Date(),
    updatedAt: new Date()
  }
};

// Mock storage functions
const mockStorage: Partial<IStorage> = {
  getUserByUsername: vi.fn((username: string) => {
    if (username === 'standard_user_test') return Promise.resolve(testUsers.standardUser);
    if (username === 'standard_admin_test') return Promise.resolve(testUsers.standardAdmin);
    if (username === 'administrator_test') return Promise.resolve(testUsers.administrator);
    return Promise.resolve(null);
  }),
  getUserById: vi.fn((id: number) => {
    if (id === 1) return Promise.resolve(testUsers.standardUser);
    if (id === 2) return Promise.resolve(testUsers.standardAdmin);
    if (id === 3) return Promise.resolve(testUsers.administrator);
    return Promise.resolve(null);
  }),
  // Add other storage methods as needed for testing
};

// Mock the storage module
vi.mock('../server/storage', () => ({
  storage: mockStorage
}));

// Mock comparePasswords in auth.ts
vi.mock('../server/auth', async (importOriginal) => {
  const module = await importOriginal();
  return {
    ...module,
    setupAuth: vi.fn((app) => {
      // Set up passport with a custom verify function for testing
      passport.use(
        new (module as any).LocalStrategy(
          { usernameField: 'username' },
          async (username: string, _password: string, done: any) => {
            try {
              const user = await mockStorage.getUserByUsername(username);
              if (!user) {
                return done(null, false, { message: 'Invalid username or password' });
              }
              return done(null, user);
            } catch (error) {
              return done(error);
            }
          }
        )
      );

      // Set up session serialization
      passport.serializeUser((user: any, done) => {
        done(null, user.id);
      });

      passport.deserializeUser(async (id: number, done) => {
        try {
          const user = await mockStorage.getUserById(id);
          done(null, user);
        } catch (error) {
          done(error);
        }
      });

      // Initialize passport and sessions
      app.use(passport.initialize());
      app.use(passport.session());
    }),
    comparePasswords: vi.fn().mockResolvedValue(true)
  };
});

describe('Role-Based API Access Tests', () => {
  let app: Express;
  
  // Set up test app before all tests
  beforeAll(() => {
    app = express();
    
    // Configure middleware
    app.use(express.json());
    app.use(
      session({
        secret: 'test-secret',
        resave: false,
        saveUninitialized: false
      })
    );
    
    // Set up authentication
    setupAuth(app);
    
    // Define route requiring standard_admin or administrator role
    app.get('/api/protected-admin', (req, res, next) => {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      const user = req.user as User;
      if (user.role !== 'standard_admin' && user.role !== 'administrator') {
        return res.status(403).json({ message: 'Forbidden' });
      }
      
      return res.json({ message: 'Access granted' });
    });
    
    // Define route requiring only administrator role
    app.get('/api/protected-administrator', (req, res, next) => {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      const user = req.user as User;
      if (user.role !== 'administrator') {
        return res.status(403).json({ message: 'Forbidden' });
      }
      
      return res.json({ message: 'Access granted' });
    });
    
    // Define route accessible to all authenticated users
    app.get('/api/protected-all', (req, res, next) => {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      return res.json({ message: 'Access granted' });
    });
    
    // Login route for testing
    app.post('/api/login', (req, res, next) => {
      passport.authenticate('local', (err, user, info) => {
        if (err) return next(err);
        if (!user) return res.status(401).json({ message: info.message });
        
        req.login(user, (err) => {
          if (err) return next(err);
          return res.json(user);
        });
      })(req, res, next);
    });
  });
  
  // Helper function to login users for testing
  const loginUser = async (username: string) => {
    const res = await supertest(app)
      .post('/api/login')
      .send({ username, password: 'password' });
    
    return res;
  };
  
  describe('Standard User Access', () => {
    let agent: supertest.SuperAgentTest;
    
    beforeEach(async () => {
      agent = supertest.agent(app);
      const res = await agent
        .post('/api/login')
        .send({ username: 'standard_user_test', password: 'password' });
        
      expect(res.status).toBe(200);
    });
    
    it('should allow access to routes for all authenticated users', async () => {
      const res = await agent.get('/api/protected-all');
      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Access granted');
    });
    
    it('should deny access to routes requiring standard_admin role', async () => {
      const res = await agent.get('/api/protected-admin');
      expect(res.status).toBe(403);
    });
    
    it('should deny access to routes requiring administrator role', async () => {
      const res = await agent.get('/api/protected-administrator');
      expect(res.status).toBe(403);
    });
  });
  
  describe('Standard Admin Access', () => {
    let agent: supertest.SuperAgentTest;
    
    beforeEach(async () => {
      agent = supertest.agent(app);
      const res = await agent
        .post('/api/login')
        .send({ username: 'standard_admin_test', password: 'password' });
        
      expect(res.status).toBe(200);
    });
    
    it('should allow access to routes for all authenticated users', async () => {
      const res = await agent.get('/api/protected-all');
      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Access granted');
    });
    
    it('should allow access to routes requiring standard_admin role', async () => {
      const res = await agent.get('/api/protected-admin');
      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Access granted');
    });
    
    it('should deny access to routes requiring administrator role', async () => {
      const res = await agent.get('/api/protected-administrator');
      expect(res.status).toBe(403);
    });
  });
  
  describe('Administrator Access', () => {
    let agent: supertest.SuperAgentTest;
    
    beforeEach(async () => {
      agent = supertest.agent(app);
      const res = await agent
        .post('/api/login')
        .send({ username: 'administrator_test', password: 'password' });
        
      expect(res.status).toBe(200);
    });
    
    it('should allow access to routes for all authenticated users', async () => {
      const res = await agent.get('/api/protected-all');
      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Access granted');
    });
    
    it('should allow access to routes requiring standard_admin role', async () => {
      const res = await agent.get('/api/protected-admin');
      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Access granted');
    });
    
    it('should allow access to routes requiring administrator role', async () => {
      const res = await agent.get('/api/protected-administrator');
      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Access granted');
    });
  });
  
  describe('Unauthenticated Access', () => {
    it('should deny access to all protected routes', async () => {
      const res1 = await supertest(app).get('/api/protected-all');
      expect(res1.status).toBe(401);
      
      const res2 = await supertest(app).get('/api/protected-admin');
      expect(res2.status).toBe(401);
      
      const res3 = await supertest(app).get('/api/protected-administrator');
      expect(res3.status).toBe(401);
    });
  });
});