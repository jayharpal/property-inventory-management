# PropSku Deployment Guide

This document provides comprehensive instructions for deploying the PropSku property management application using Vercel (frontend), Railway (backend), and PostgreSQL (database). Following these steps will enable you to set up a fully functional production environment with your custom domain.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Project Structure Considerations](#project-structure-considerations)
3. [Database Setup on Railway](#database-setup-on-railway)
4. [Backend Deployment on Railway](#backend-deployment-on-railway)
5. [Frontend Deployment on Vercel](#frontend-deployment-on-vercel)
6. [Connecting Your Custom Domain](#connecting-your-custom-domain)
7. [Setting Up Environment Variables](#setting-up-environment-variables)
8. [Post-Deployment Configuration](#post-deployment-configuration)
9. [Maintenance and Updates](#maintenance-and-updates)
10. [Troubleshooting](#troubleshooting)

## Prerequisites

Before starting the deployment process, ensure you have:

1. **Accounts set up** for:
   - [Vercel](https://vercel.com) (for frontend hosting)
   - [Railway](https://railway.app) (for backend and database hosting)
   - Your domain registrar where you purchased your custom domain

2. **Local tools:**
   - Git
   - Node.js (version 18+ recommended)
   - npm or yarn
   - Railway CLI (optional but helpful): `npm install -g @railway/cli`

3. **Repository access:**
   - Ensure your PropSku codebase is in a Git repository (GitHub, GitLab, or Bitbucket)
   - Have admin access to the repository

## Project Structure Overview

PropSku has been restructured for deployment with a clear separation between frontend and backend components:

```
propsku/
├── client/          # Frontend React application 
├── backend/         # Separated backend application
│   ├── src/         # Backend source code
│   │   ├── index.ts      # Main application entry point
│   │   ├── routes.ts     # API endpoint definitions
│   │   ├── storage.ts    # Database interactions
│   │   ├── db.ts         # Database connection setup
│   │   ├── auth.ts       # Authentication handlers
│   │   ├── admin-routes.ts # Admin panel endpoints
│   │   └── services/     # Utility services
│   │       ├── email.ts  # Email functionality
│   │       └── pdf.ts    # PDF generation
│   ├── package.json # Backend dependencies
│   └── tsconfig.json # Backend TypeScript configuration
├── shared/          # Shared code between frontend and backend
│   └── schema.ts    # Database schema definitions
├── package.json     # Project dependencies
└── ...
```

### Backend Restructuring

The backend has been successfully separated from the main application for independent deployment. Key changes implemented:

1. **ECMAScript Modules Configuration:**
   - Set `"type": "module"` in backend package.json
   - Updated all imports to use `.js` extensions for ESM compatibility
   - Fixed dynamic imports in routes.ts for email and PDF services

2. **Build Process Optimization:**
   - Added build script to handle TypeScript compilation
   - Configured special handling for services directory
   - Set up proper ESM output format

3. **Environment Variable Management:**
   - Installed and configured dotenv package
   - Created environment variable loading system
   - Made connection strings configurable for different environments

4. **Deployment Preparation:**
   - Updated CORS settings for cross-domain communication
   - Ensured cookie and session handling works with separate domains
   - Fixed authentication flow for deployed environment

## Database Setup on Railway

First, let's set up the PostgreSQL database on Railway:

1. **Create a new project:**
   - Log in to [Railway](https://railway.app)
   - Click "New Project" > "Deploy from GitHub Repo"
   - Choose "Provision PostgreSQL"

2. **Configure database:**
   - Once the PostgreSQL instance is created, click on it to access settings
   - Go to "Connect" tab to find your database connection string
   - Keep this connection string secure - we'll need it later

3. **Set up initial schema:**
   - From the Railway dashboard, open the PostgreSQL service
   - Go to "Data" tab
   - Keep the database structure ready to be initialized by our application's migration scripts

## Backend Deployment on Railway

Now that we have our database, let's deploy the backend:

1. **Create a new backend service on Railway:**
   - In your Railway project dashboard, click "New Service" > "GitHub Repo"
   - Select your PropSku repository
   - Configure the service:
     - Set root directory to `/backend` (where our separated backend now lives)
     - Set build command: `npm install && npm run build`
     - Set start command: `npm run start`

2. **Backend package.json configuration:**
   - We've already created a separate backend package.json in the backend directory. It uses the following structure:

```json
{
  "name": "propsku-backend",
  "version": "1.0.0",
  "type": "module",
  "license": "MIT",
  "scripts": {
    "dev": "tsx src/index.ts",
    "build": "tsc -p tsconfig.json && mkdir -p ./dist/services",
    "start": "NODE_ENV=production node dist/index.js",
    "db:push": "drizzle-kit push"
  },
  "dependencies": {
    "@neondatabase/serverless": "^0.10.4",
    "@sendgrid/mail": "^8.1.4",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.1",
    "connect-pg-simple": "^10.0.0",
    "dotenv": "^16.4.7",
    "drizzle-orm": "^0.39.1",
    "drizzle-zod": "^0.7.0",
    "express": "^4.21.2",
    "express-session": "^1.18.1",
    "memorystore": "^1.6.7",
    "nodemailer": "^6.10.0",
    "passport": "^0.7.0",
    "passport-local": "^1.0.0",
    "pdfkit": "^0.16.0",
    "ws": "^8.18.0",
    "zod": "^3.23.8",
    "zod-validation-error": "^3.4.0"
  }
}
```

3. **Set up environment variables on Railway:**
   - In your Railway project, go to the backend service settings
   - Click on "Variables" tab and add the following:
     - `DATABASE_URL` = [Your PostgreSQL connection string from earlier]
     - `NODE_ENV` = production
     - `PORT` = 3001 (or your preferred port)
     - `SESSION_SECRET` = [Generate a random secure string]
     - `FRONTEND_URL` = [Your Vercel frontend URL once deployed]
     - Add any other environment variables your application needs (email service, etc.)

4. **Create a `.railway.toml` configuration file:**
   - In your local repository root, create a file called `.railway.toml`:

```toml
[build]
builder = "nixpacks"
buildCommand = "npm install && npm run build"

[deploy]
startCommand = "npm run start"
restartPolicyType = "on-failure"
restartPolicyMaxRetries = 10

[variables]
NODE_ENV = "production"
```

5. **Modify backend code to handle CORS:**
   - In your `backend/src/index.ts` file, ensure CORS is configured to allow requests from your frontend domain:

```typescript
import cors from 'cors';

// Inside your app setup
app.use(cors({
  origin: process.env.FRONTEND_URL || 'https://yourdomain.com',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

6. **Deploy the backend:**
   - From the Railway dashboard, click "Deploy" on your backend service
   - Monitor the deployment logs to ensure success
   - Once deployed, note the service URL (e.g., `https://propsku-backend-production.up.railway.app`)

## Frontend Deployment on Vercel

Now let's deploy the frontend to Vercel:

1. **Create a new project on Vercel:**
   - Log in to [Vercel](https://vercel.com)
   - Click "Add New" > "Project"
   - Import your GitHub/GitLab/Bitbucket repository
   - If importing from a monorepo, make sure to select the PropSku repository

2. **Configure the frontend build settings:**
   - Set the root directory to `/client`
   - Set the build command: `npm run build`
   - Set the output directory: `dist`
   - Set the install command: `npm install`

3. **Create an optimized `vite.config.ts` for production:**
   - Modify your `client/vite.config.ts` file to handle production builds:

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@assets': path.resolve(__dirname, '../attached_assets'),
      '@shared': path.resolve(__dirname, '../shared')
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: process.env.NODE_ENV !== 'production'
  },
  define: {
    'process.env': {}
  },
  server: {
    port: 3000
  }
});
```

4. **Create a frontend-specific `.env.production` file:**
   - In the `client` directory, create a `.env.production` file:

```
VITE_API_URL=https://your-railway-backend-url.up.railway.app
VITE_APP_ENV=production
```

5. **Set up environment variables on Vercel:**
   - In your Vercel project settings, go to "Environment Variables"
   - Add the following:
     - `VITE_API_URL` = [Your Railway backend URL]
     - Add any other frontend-specific environment variables needed

6. **Update API client configuration:**
   - Modify `client/src/lib/queryClient.ts` to use the environment variable:

```typescript
import { QueryClient } from '@tanstack/react-query';

// Default fetcher that uses the environment variable
const defaultFetcher = async ({ queryKey }: { queryKey: string[] }) => {
  const baseUrl = import.meta.env.VITE_API_URL || '';
  const endpoint = queryKey[0];
  const response = await fetch(`${baseUrl}${endpoint}`);
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }
  return response.json();
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: defaultFetcher,
    },
  },
});

// Function for making POST/PUT/DELETE requests
export async function apiRequest(url: string, method: string, data?: any) {
  const baseUrl = import.meta.env.VITE_API_URL || '';
  const response = await fetch(`${baseUrl}${url}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    body: data ? JSON.stringify(data) : undefined,
    credentials: 'include',
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `API error: ${response.status}`);
  }

  try {
    return await response.json();
  } catch (e) {
    return { success: true };
  }
}
```

7. **Deploy the frontend:**
   - From the Vercel dashboard, click "Deploy"
   - Monitor the deployment logs
   - Once deployed, Vercel will provide a URL for your frontend (e.g., `https://propsku.vercel.app`)

## Connecting Your Custom Domain

Now let's connect your custom domain:

1. **For the frontend (Vercel):**
   - In your Vercel project dashboard, go to "Domains"
   - Click "Add Domain"
   - Enter your domain (e.g., `propsku.com` or `app.propsku.com`)
   - Follow Vercel's instructions to configure DNS settings at your domain registrar
   - Typically requires adding a CNAME record pointing to `cname.vercel-dns.com`

2. **For the backend (Railway) - Optional:**
   - If you want a custom domain for your API (e.g., `api.propsku.com`):
     - In Railway, select your backend service
     - Go to "Settings" > "Domains"
     - Add your custom domain
     - Configure DNS settings according to Railway's instructions
     - Update your frontend environment variable `VITE_API_URL` to use this domain

3. **Update CORS settings:**
   - Once your domains are set up, update the backend CORS configuration with your custom domain
   - In your Railway environment variables, update `FRONTEND_URL` to your custom domain

## Setting Up Environment Variables

The application requires specific environment variables to function correctly in production. These must be configured in their respective deployment platforms:

### Backend Environment Variables (Railway)

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://username:password@hostname:port/database` |
| `NODE_ENV` | Environment setting | `production` |
| `PORT` | Server port | `3001` (or Railway-assigned) |
| `SESSION_SECRET` | Cookie encryption key | Generate a random secure string |
| `FRONTEND_URL` | Deployed frontend URL | `https://propsku.com` |
| `SENDGRID_API_KEY` | Email service API key | Your SendGrid API key |
| `COOKIE_DOMAIN` | Domain for cookies | `.propsku.com` (include the dot) |
| `COOKIE_SECURE` | Cookie security setting | `true` |

### Frontend Environment Variables (Vercel)

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API URL | `https://api.propsku.com` |
| `VITE_APP_ENV` | Environment indicator | `production` |

> **Security Note:** Never commit sensitive environment variables to your repository. Use the platform's environment variable management system instead.

## Post-Deployment Configuration

Once both frontend and backend are deployed, complete these critical configuration steps:

### Database Schema and Initial Data

1. **Apply Database Schema:**
   - From the Railway CLI or dashboard, execute:
   ```
   railway run npm run db:push
   ```
   - Verify all tables are created correctly
   - Check for any migration errors in the logs

2. **Seed Initial Users:**
   - Create at least one Administrator account for system administration
   - Set up test accounts for each role (Administrator, Standard Admin, Standard User)
   - Default credentials can be:
     - Administrator: user1/password1
     - Standard Admin: user5/password5
     - Standard User: user4/password4

### Feature Testing Checklist

Systematically verify these core features work correctly in the deployed environment:

| Category | Features to Test |
|----------|-----------------|
| Authentication | • Login/logout<br>• Password reset<br>• Role-based access control |
| Portfolio Management | • Portfolio creation<br>• Portfolio sharing<br>• User invitations |
| Inventory | • Item creation<br>• Stock updates<br>• Low stock alerts |
| Expense Tracking | • Expense entry<br>• Categorization<br>• Report generation |
| Document Generation | • PDF reports<br>• Email sending<br>• Data exports |
| Admin Functions | • User management<br>• System statistics<br>• Activity logs |

### Security Verification

Before going live, verify these security measures:

- All pages require proper authentication
- User roles properly restrict access to appropriate areas
- API endpoints validate permission before serving data
- Session cookies are secure and HTTP-only
- Password reset functionality works correctly

## Maintenance and Updates

To maintain your deployed application:

1. **Continuous Deployment:**
   - Both Vercel and Railway support automatic deployments from your repository
   - Configure branch rules to deploy from your main/production branch

2. **Database backups:**
   - Railway provides automated backups for PostgreSQL
   - Consider setting up additional backup procedures for critical data

3. **Monitoring:**
   - Set up monitoring tools like Sentry for error tracking
   - Configure uptime monitoring for both frontend and backend

4. **Making updates:**
   - Push changes to your repository
   - Vercel and Railway will automatically deploy updates
   - For database schema changes, use the Drizzle migrations system

## Troubleshooting

Here are solutions to common issues you might encounter during or after deployment:

### CORS and Authentication Issues

| Issue | Solution |
|-------|----------|
| CORS errors in browser console | • Verify `FRONTEND_URL` in Railway environment variables exactly matches your frontend domain<br>• Check that CORS configuration in `backend/src/index.ts` includes required headers<br>• Ensure `credentials: true` is set in CORS options |
| Authentication fails after login | • Verify `COOKIE_DOMAIN` is correctly set to your domain with leading dot<br>• Set `COOKIE_SECURE: true` for HTTPS sites<br>• Check browser console for cookie-related errors |
| Sessions not persisting | • Ensure `SESSION_SECRET` is properly set<br>• Verify PostgreSQL session store is correctly configured |

### ESM and Import Problems

| Issue | Solution |
|-------|----------|
| "Cannot find module" errors | • Check that file extensions (`.js`) are included in imports<br>• Verify build correctly outputs services directory |
| Dynamic import failures | • Ensure dynamic imports include `.js` extension<br>• Check that services/*.js files exist in the build output |
| TypeScript build errors | • Confirm tsconfig.json has `"module": "NodeNext"` and `"moduleResolution": "NodeNext"`<br>• Ensure proper type declarations for all modules |

### Database and API Issues

| Issue | Solution |
|-------|----------|
| Database connection errors | • Verify DATABASE_URL is correctly set in Railway<br>• Ensure PostgreSQL service is running<br>• Check IP allowlist configuration |
| API endpoints returning 500 errors | • Check server logs for specific error messages<br>• Verify DB migrations have been applied<br>• Test endpoints directly with curl or Postman |
| Missing data in API responses | • Ensure database is properly seeded<br>• Check table permissions<br>• Verify SQL query execution |

### Deployment Problems

| Issue | Solution |
|-------|----------|
| Build failures on Railway | • Review build logs for specific errors<br>• Ensure build script is correctly set<br>• Check that all dependencies are available |
| Vercel build issues | • Verify proper root directory is set<br>• Check node version compatibility<br>• Ensure client has all required dependencies |
| Service starts but crashes | • Check for uncaught exceptions in logs<br>• Verify memory limits aren't exceeded<br>• Enable NODE_OPTIONS for debugging |

## Conclusion

This deployment guide has provided a comprehensive walkthrough for setting up PropSku in a production environment using a modern cloud architecture:

- **Frontend**: React application hosted on Vercel
- **Backend**: Node.js/Express API hosted on Railway
- **Database**: PostgreSQL instance managed by Railway

The application has been successfully restructured with separate frontend and backend components, making it more maintainable and scalable. The modular architecture allows for independent deployment and scaling of components as needed.

### Key Benefits of This Architecture

- **Performance**: Each component can be optimized and scaled independently
- **Cost-efficiency**: Resources allocated only where needed
- **Maintainability**: Clearer separation of concerns
- **Reliability**: Independent service deployment means less downtime
- **Security**: Better isolation of database and business logic

### Next Steps

Beyond the initial deployment, consider these enhancements:

1. **Implement CI/CD pipelines** for automated testing and deployment
2. **Set up monitoring and alerting** for proactive issue detection
3. **Create regular database backup routines** beyond Railway's defaults
4. **Establish a staging environment** for testing before production changes

For specific questions or issues during deployment, consult the Vercel and Railway documentation or reach out to their support teams. The PropSku application is now ready for production use and future expansion.