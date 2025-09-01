/**
 * Simple CORS middleware that allows all origins
 * This is a fallback for environments where the TypeScript version might not work
 */
module.exports = function simpleCorsMiddleware(req, res, next) {
  // Allow all origins
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
}; 