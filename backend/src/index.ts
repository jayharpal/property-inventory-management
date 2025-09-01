import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes.js";
import { setupVite, log } from "./vite.js";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import cors from 'cors';
import dotenv from "dotenv";
import session from "express-session";
import passport from "passport";
import { corsMiddleware, manualCorsMiddleware } from "./middleware/cors.js";
import { pool } from "./db.js";
import { initializeDatabase } from "./db-init.js";
import { storage } from "./storage.js";

dotenv.config();
// Handle ESM compatibility for __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// app.use(session({
//   secret: process.env.SESSION_SECRET!,
//   resave: false,
//   saveUninitialized: false,
//   cookie: {
//     secure: false, // true if using HTTPS
//     httpOnly: true,
//     sameSite: 'lax',
//   }
// }));
// Add global OPTIONS handler for all preflight requests
app.options('*', (req, res) => {
  console.log('Preflight OPTIONS request received for:', req.originalUrl);
  console.log('Origin:', req.headers.origin);
  
  // Set permissive CORS headers
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  // Respond with 200 OK
  res.status(200).end();
});

// Use our custom CORS middleware
app.use(corsMiddleware);

// Add OPTIONS preflight handling
app.options('*', corsMiddleware);

// Add manual CORS headers as fallback
app.use(manualCorsMiddleware);

app.get('/api/cors-test', (req, res) => {
  console.log('CORS Test endpoint accessed');
  console.log('Request origin:', req.headers.origin);
  console.log('Request method:', req.method);
  
  // Set CORS headers explicitly
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  res.json({ 
    message: 'CORS test successful', 
    origin: req.headers.origin,
    environment: process.env.NODE_ENV,
    frontendUrl: process.env.FRONTEND_URL
  });
});

// Add a robust healthcheck endpoint that tests DB connection too
app.get('/api/healthcheck', async (req, res) => {
  try {
    // Check database connection is working
    const dbResult = await pool.query('SELECT 1 as check');
    const dbStatus = dbResult.rows[0].check === 1 ? 'connected' : 'error';
    
    // Check if session store is properly configured
    const sessionStoreType = storage.sessionStore.constructor.name;
    const usingPersistentStore = sessionStoreType !== 'MemoryStore';
    
    // Include useful diagnostic information
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      nodeVersion: process.version,
      memory: process.memoryUsage(),
      uptime: process.uptime(),
      database: dbStatus,
      session: {
        type: sessionStoreType,
        persistent: usingPersistentStore,
        cookieSettings: {
          secure: req.session?.cookie?.secure,
          sameSite: req.session?.cookie?.sameSite,
        }
      }
    });
  } catch (error: any) {
    console.error('Health check failed:', error);
    res.status(500).json({
      status: 'error',
      message: 'Health check failed',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// Add type declaration for the global gc function
declare global {
  namespace NodeJS {
    interface Global {
      gc?: () => void;
    }
  }
}

// Memory management with proper garbage collection
const MAX_MEMORY_RESTART_THRESHOLD = 400 * 1024 * 1024; // 400MB
const memoryMonitorInterval = setInterval(() => {
  const memUsage = process.memoryUsage();
  const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
  const rssMB = Math.round(memUsage.rss / 1024 / 1024);
  const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);
  
  console.log(`Memory usage: RSS=${rssMB}MB Heap=${heapUsedMB}/${heapTotalMB}MB`);
  
  // Check if memory usage is high
  if (memUsage.rss > MAX_MEMORY_RESTART_THRESHOLD) {
    console.log('High memory usage detected, attempting cleanup');
    
    // Close any unnecessary resources or caches
    clearUnusedCaches();
    
    // Run garbage collection if available
    if (global.gc) {
      try {
        console.log('Running manual garbage collection...');
        global.gc();
        console.log('Garbage collection completed');
      } catch (err) {
        console.error('Error during garbage collection:', err);
      }
    } else {
      console.log('Manual garbage collection not available - the --expose-gc flag is not set');
    }
  }
}, 30000); // Every 30 seconds

// Helper function to clear any caches if needed
function clearUnusedCaches() {
  console.log('Clearing unused caches');
  
  // Add custom cleanup logic here if needed
  // e.g., clear query caches, close idle connections, etc.
}

// Ensure memory monitor is cleaned up if server shuts down
process.on('SIGTERM', () => {
  console.log('SIGTERM received, cleaning up...');
  clearInterval(memoryMonitorInterval);
  process.exit(0);
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    // Handle static file serving in production
    const distPath = path.resolve(__dirname, "../public");
    
    // Create directory structure if it doesn't exist
    try {
      if (!fs.existsSync(distPath)) {
        fs.mkdirSync(distPath, { recursive: true });
      }
    } catch (error) {
      console.error("Error creating static files directory:", error);
    }
    
    app.use(express.static(distPath));
    
    // Serve minimal API response for frontend routes instead of creating HTML files
    app.use("*", (req, res) => {
      if (req.path.startsWith('/api')) {
        res.status(404).json({ message: 'API endpoint not found' });
      } else {
        // Just return a simple JSON response for non-API routes
        res.json({ message: 'Backend API server. Please use the frontend application.' });
      }
    });
  }

  // Add global error handlers
  process.on('uncaughtException', (error) => {
    console.error('UNCAUGHT EXCEPTION:', error);
    console.error(error.stack);
    // Don't exit the process to keep the server running
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('UNHANDLED REJECTION:', reason);
    console.error('Promise:', promise);
    // Don't exit the process to keep the server running
  });

  // Keep-alive ping to avoid idling
  setInterval(() => {
    console.log('Server health check: running');
  }, 60000); // Every minute

  // Verify database connection and initialize tables before starting server
  try {
    // Check if db is ready before fully starting
    const result = await pool.query('SELECT NOW()');
    console.log('Database connection verified at:', result.rows[0].now);
    console.log('Connected to Postgres successfully');
    
    // Initialize database tables if needed
    await initializeDatabase();
  } catch (error) {
    console.error('Failed to connect to database at startup. Starting server anyway.');
    console.error('Database error:', error);
  }

  // Now start the server
  server.listen({
    port: 5000,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${5000}`);
    console.log('Node version:', process.version);
    console.log('Environment:', process.env.NODE_ENV);
    console.log('Frontend URL:', process.env.FRONTEND_URL || 'Not set');
  });
})();
