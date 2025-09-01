// CORS middleware for manually handling CORS headers
export function manualCorsMiddleware(req, res, next) {
  // Get frontend URL from environment variable
  const frontendUrl = process.env.FRONTEND_URL || 'https://www.propsku.com';
  
  // Set CORS headers for all responses
  // Use either the request origin or frontend URL for Allow-Origin
  const origin = req.headers.origin || frontendUrl;
  res.header('Access-Control-Allow-Origin', origin);
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  // Handle OPTIONS requests
  if (req.method === 'OPTIONS') {
    console.log(`Processing OPTIONS request from origin: ${origin}`);
    res.status(200).end();
    return;
  }
  
  next();
} 