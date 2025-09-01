import cors from 'cors';
import { Request, Response, NextFunction } from 'express';

// List of allowed origins for production
const allowedOrigins = [
  'http://localhost:3000',                              // Local development
  'https://www.propsku.com',   // Vercel production
  'https://propsku.vercel.app',                         // Alternative Vercel domain
  'https://propsku.com',                                // Production domain
  'https://api.propsku.com' // Railway backend URL
];

// Configurable CORS middleware
export const corsMiddleware = cors({
  origin: function(origin, callback) {
    // In development, allow all origins
    if (process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    
    // Allow requests with no origin (like mobile apps, curl requests)
    if (!origin) {
      return callback(null, true);
    }
    
    // Allow specific origins
    if (allowedOrigins.includes(origin)) {
      return callback(null, origin);
    }

    return callback(null, origin);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  maxAge: 86400 // 24 hours
});

// CORS middleware for manually handling CORS headers
export function manualCorsMiddleware(req: Request, res: Response, next: NextFunction) {
  const origin = req.headers.origin;
  
  // Set CORS headers for all responses - allow any origin temporarily
  res.header('Access-Control-Allow-Origin', origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  // Handle OPTIONS requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  next();
}

// Special auth-specific CORS middleware with more logging
export function authCorsMiddleware(req: Request, res: Response, next: NextFunction) {
  const origin = req.headers.origin;
  console.log(`Auth request from origin: ${origin || 'unknown'}, path: ${req.path}, method: ${req.method}`);
  console.log(`Auth request cookies: ${req.headers.cookie || 'none'}`);
  
  // For auth endpoints, we need to be careful with CORS
  // We must set the actual origin (not *) when credentials are used
  if (origin) {
    res.header('Access-Control-Allow-Origin', origin);
    console.log(`Set Access-Control-Allow-Origin to: ${origin}`);
  } else {
    // If no origin, set to the main frontend URL as a fallback
    const frontendUrl = process.env.FRONTEND_URL || 'https://www.propsku.com';
    res.header('Access-Control-Allow-Origin', frontendUrl);
    console.log(`No origin in request, set Access-Control-Allow-Origin to: ${frontendUrl}`);
  }
  
  // These headers are critical for auth to work
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.header('Vary', 'Origin'); // Important for caching
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    console.log('Responding to preflight OPTIONS request for auth endpoint');
    return res.status(200).end();
  }
  
  // For debugging session issues
  if (req.session) {
    console.log(`Auth request session ID: ${req.session.id}, user: ${req.user ? JSON.stringify(req.user) : 'none'}`);
  } else {
    console.log('Auth request has no session');
  }
  
  next();
} 