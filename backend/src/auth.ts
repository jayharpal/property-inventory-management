import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage.js";
import { User as SelectUser, insertUserSchema } from "./schema/schema.js";
import bcrypt from "bcrypt";
import { z } from "zod";
import { manualCorsMiddleware, authCorsMiddleware } from "./middleware/cors.js";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  // Log the first few characters of the stored password to help debug (without revealing the full hash)
  console.log(`Password format check: ${stored.substring(0, 8)}...`);
  
  // Check if the stored password is bcrypt format (starts with $2a$, $2b$, or $2y$)
  if (stored.startsWith('$2')) {
    try {
      console.log('Using bcrypt comparison for password');
      const result = await bcrypt.compare(supplied, stored);
      console.log('Bcrypt comparison result:', result);
      return result;
    } catch (error) {
      console.error("Error comparing bcrypt passwords:", error);
      return false;
    }
  }
  // Check if the stored password is hashed with scrypt (contains a period separator for hash.salt)
  else if (stored.includes(".")) {
    try {
      console.log('Using scrypt comparison for password');
      const [hashed, salt] = stored.split(".");
      const hashedBuf = Buffer.from(hashed, "hex");
      const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
      const result = timingSafeEqual(hashedBuf, suppliedBuf);
      console.log('Scrypt comparison result:', result);
      return result;
    } catch (error) {
      console.error("Error comparing hashed passwords:", error);
      return false;
    }
  } else {
    // For plaintext passwords (temporary fallback for existing test users)
    console.log('Using plaintext comparison for password (insecure)');
    return supplied === stored;
  }
}

export default function setupAuth(app: Express) {
  const sessionSecret = process.env.SESSION_SECRET || "property-management-secret-key";
  
  let sessionStoreToUse = storage.sessionStore;
  
  // If we're using memory store as fallback, log a warning
  if (sessionStoreToUse instanceof session.MemoryStore) {
    console.warn('WARNING: Using in-memory session store. Sessions will be lost on restart.');
  }
  
  // Log the value being read from the environment
  const backendDomainFromEnv = process.env.BACKEND_DOMAIN;
  console.log(`[Auth Setup] BACKEND_DOMAIN environment variable: ${backendDomainFromEnv || 'NOT SET'}`);

  const sessionSettings: session.SessionOptions = {
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    store: sessionStoreToUse,
    name: "propsku.sid",
    cookie: {
      secure: process.env.NODE_ENV === "production", // Must be true for SameSite=None in production
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      sameSite: "none", // Critical for cross-domain auth between Vercel and Railway
      httpOnly: true,
      path: '/',
      domain: backendDomainFromEnv 
    }
  };
  
  // Log the final cookie settings being used
  console.log('[Auth Setup] Session cookie settings:', JSON.stringify(sessionSettings.cookie));

  // Configure session middleware FIRST
  app.set("trust proxy", 1); 
  app.use(session(sessionSettings));

  // Initialize Passport AFTER session middleware is fully configured and running
  app.use(passport.initialize());
  app.use(passport.session()); // This relies on the session middleware above

  // Define passport strategies AFTER initialization
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user || !(await comparePasswords(password, user.password))) {
          return done(null, false, { message: "Invalid username or password" });
        } else {
          return done(null, user);
        }
      } catch (error) {
        return done(error);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  // Define routes AFTER passport setup
  // Login endpoint
  app.options('/api/login', authCorsMiddleware);
  app.post('/api/login', authCorsMiddleware, (req, res, next) => {
    passport.authenticate('local', (err: any, user: any, info: any) => {
      if (err) {
        return res.status(500).json({ message: "Authentication error occurred" });
      }
      if (!user) {
        return res.status(401).json({ message: info?.message || "Invalid username or password" });
      }
      
      req.logIn(user, async (loginErr) => {
        if (loginErr) {
          console.error('[Login Endpoint] req.logIn error:', loginErr);
          return res.status(500).json({ message: "Login error occurred" });
        }
        
        // Save session explicitly
        req.session.save(async (saveErr) => {
          if (saveErr) {
            console.error('[Login Endpoint] Session save error:', saveErr);
          }
          
          // Log activity
          try {
            await storage.createActivityLog({
              userId: user.id,
              action: "USER_LOGIN",
              details: `User ${user.username} logged in`
            });
          } catch (logErr) {
            console.error('[Login Endpoint] Activity log error:', logErr);
          }

          const userWithoutPassword = { ...user };
          delete userWithoutPassword.password;
          console.log('[Login Endpoint] Login successful, sending user data and Set-Cookie header.');
          return res.json(userWithoutPassword);
        });
      });
    })(req, res, next);
  });
  
  // Registration endpoint
  app.options('/api/register', authCorsMiddleware);
  app.post('/api/register', authCorsMiddleware, async (req, res) => {
    console.log('Registration request received:', req.body);
    try {
      // Validate the input data
      const registerSchema = insertUserSchema.omit({ 
        portfolioId: true, 
        role: true 
      });
      
      const validatedData = registerSchema.parse(req.body);
      
      // Check if username exists
      const existingUsername = await storage.getUserByUsername(validatedData.username);
      if (existingUsername) {
        return res.status(400).json({ message: "Username already exists" });
      }
      
      // Check if email exists
      const existingEmail = await storage.getUserByEmail(validatedData.email);
      if (existingEmail) {
        return res.status(400).json({ message: "Email already exists" });
      }
      
      // Hash the password
      const hashedPassword = await bcrypt.hash(validatedData.password, 10);
      
      // Create the user with standard_admin role
      const newUser = await storage.createUser({
        ...validatedData,
        password: hashedPassword,
        role: req.body.role,
        // We'll update this after portfolio creation, but initialize with 0 to satisfy TS
        portfolioId: req.user? req.user.portfolioId: 0
      });
      
      if(!req.user){
      // Create a portfolio for the user
        const portfolio = await storage.createPortfolio({
          name: `${newUser.firstName}'s Portfolio`,
          ownerId: newUser.id,
          createdBy: newUser.id
        });
        
        // Update the user with the portfolio ID
        var updatedUser = await storage.updateUser(newUser.id, {
          portfolioId: portfolio.id
        });
      }
      
      // Log activity
      await storage.createActivityLog({
        userId: newUser.id,
        action: "USER_REGISTERED",
        details: `User ${newUser.username} registered`
      });
      
      // // Log the user in
      // req.logIn(updatedUser || newUser, (err) => {
      //   if (err) {
      //     return res.status(500).json({ message: "Login error occurred after registration" });
      //   }
        
      // });
      // Create a new object without the password field
      const { password, ...userWithoutPassword } = updatedUser || newUser;
      return res.status(201).json(userWithoutPassword);
    } catch (error) {
      console.error('Registration error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid registration data", 
          errors: error.errors 
        });
      }
      return res.status(500).json({ message: "Registration failed" });
    }
  });
  
  // Logout endpoint
  app.options('/api/logout', authCorsMiddleware);
  app.post('/api/logout', authCorsMiddleware, (req, res) => {
    if (req.user) {
      const userId = (req.user as any).id;
      
      // Log activity before destroying the session
      storage.createActivityLog({
        userId: userId,
        action: "USER_LOGOUT",
        details: `User logged out`
      }).then(() => {
        req.logout((err) => {
          if (err) { 
            return res.status(500).json({ message: "Logout error occurred" });
          }
          req.session.destroy((err) => {
            if (err) {
              return res.status(500).json({ message: "Session destruction error" });
            }
            res.json({ message: "Logged out successfully" });
          });
        });
      });
    } else {
      res.json({ message: "Already logged out" });
    }
  });
  
  // Get current user
  app.options('/api/user', authCorsMiddleware);
  app.get('/api/user', authCorsMiddleware, (req, res) => {
    if (!req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    const userWithoutPassword = { ...(req.user as any) };
    // delete userWithoutPassword.password;
    
    res.json(userWithoutPassword);
  });
}
