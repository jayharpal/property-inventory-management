/**
 * This is a standalone script that can be used by Railway to handle CORS
 * Useful if you need to add CORS support outside of your main application
 */
const express = require('express');
const cors = require('cors');
const app = express();

// List of allowed origins
const allowedOrigins = [
  'http://localhost:3000',                            // Local development
  'https://www.propsku.com', // Vercel production
  'https://propsku.vercel.app',                       // Alternative Vercel domain
  'https://propsku.com',                              // Production domain
  'https://api.propsku.com', // Railway backend URL (for potential direct access)
  'https://api.propsku.com'  // Railway backend URL
];

// CORS middleware with specific options
app.use(cors({
  origin: function(origin, callback) {
    // Allow all origins during development
    if (process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    
    // Allow requests with no origin (like mobile apps, curl, etc)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('CORS blocked for origin:', origin);
      // Still allow for troubleshooting
      callback(null, true);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Handle all OPTIONS requests specifically
app.options('*', cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Forward all other requests to main app
app.all('*', (req, res) => {
  // Your main application handling here
  res.status(200).send("CORS proxy is working!");
});

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`CORS handler server running on port ${PORT}`);
}); 