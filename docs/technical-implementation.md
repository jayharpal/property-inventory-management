# PropSku Technical Implementation Guide

This document provides technical details about the implementation of the user management and invitation system in PropSku.

## Database Schema

### User Model

```typescript
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  role: text("role").$type<UserRole>().notNull().default("standard_user"),
  createdAt: timestamp("created_at").defaultNow(),
});
```

User roles are defined as:
```typescript
export const userRoleEnum = z.enum(["standard_user", "standard_admin", "administrator"]);
export type UserRole = z.infer<typeof userRoleEnum>;
```

### Portfolio Model

```typescript
export const portfolios = pgTable("portfolios", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  ownerId: integer("owner_id").notNull(), // References users.id of the admin who created it
  createdAt: timestamp("created_at").defaultNow(),
});
```

### Invitation Model

```typescript
export const invitations = pgTable("invitations", {
  id: serial("id").primaryKey(),
  email: text("email").notNull(),
  portfolioId: integer("portfolio_id").notNull(),
  role: text("role").$type<UserRole>().notNull().default("standard_user"),
  token: text("token").notNull().unique(),
  accepted: boolean("accepted").notNull().default(false),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});
```

## API Endpoints

### User Authentication

- `POST /api/login`: Authenticate a user and create a session
- `POST /api/logout`: End the user's session
- `POST /api/register`: Register a new user (public access)
- `GET /api/user`: Get the current authenticated user's details

### Invitation Management

- `GET /api/invitations`: Get all invitations for portfolios owned by the current user
- `GET /api/invitations/:id`: Get details for a specific invitation
- `POST /api/invitations`: Create a new invitation
- `DELETE /api/invitations/:id`: Delete an invitation
- `POST /api/invitations/:id/resend`: Resend an invitation email

### Invitation Acceptance

- `GET /api/invitations/validate/:token`: Validate an invitation token (public access)
- `POST /api/invitations/accept/:token`: Accept an invitation (requires authentication)

## Authentication Flow

1. **Login**: User submits credentials, server verifies and creates a session
2. **Session Management**: Express-session with PostgreSQL store is used for session management
3. **Authorization Middleware**: `requireAuth` and `requireRole` middleware functions check user access

## Invitation Flow

1. **Create Invitation**:
   - Admin creates invitation specifying email address, role, and portfolio
   - System generates a unique token and expiration date (7 days from creation)
   - Email is sent to the invited user

2. **Accept Invitation**:
   - User clicks the link in the email, which contains the invitation token
   - Frontend validates the token and shows registration form
   - User creates an account with the email from the invitation
   - System associates the new user with the portfolio and assigns the role

3. **Resend Invitation**:
   - Admin can resend invitations from the Settings page
   - System regenerates the token and expiration date
   - New email is sent to the invited user

## Portfolio-Based Data Filtering

The system implements portfolio-based data filtering using these strategies:

1. **Database Queries**: All database queries filter by portfolioId when retrieving data
2. **API Endpoints**: All endpoints that return data check for portfolio association
3. **User Association**: Users are associated with portfolios through the invitation system

## Email Service

The application uses a modular email service that supports:

1. **SendGrid Integration**: For production environments
2. **Fallback Mode**: When SendGrid is not configured, emails are logged to console
3. **Template Functions**: The service includes functions for:
   - `sendInvitationEmail`: For sending user invitations
   - `sendMonthlyReportEmail`: For sending monthly expense reports

## Access Control Implementation

Access control is implemented through middleware functions:

```typescript
// Basic authentication middleware
function requireAuth(req: Request, res: Response, next: Function) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Unauthorized" });
}

// Role-based middleware
function requireRole(roles: string[]) {
  return (req: Request, res: Response, next: Function) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    if (roles.includes(req.user.role)) {
      return next();
    }
    
    res.status(403).json({ message: "Forbidden - Insufficient permissions" });
  };
}

// Portfolio access middleware
function requirePortfolioAccess() {
  return async (req: Request, res: Response, next: Function) => {
    // Implementation checks if user has access to the requested portfolio
  };
}
```

## Frontend Implementation

The front end implements access control through a `ProtectedRoute` component:

```tsx
<ProtectedRoute 
  path="/path" 
  component={Component} 
  allowedRoles={["standard_user", "standard_admin"]} 
/>
```

Administrators are redirected to the admin panel by default:

```tsx
<ProtectedRoute
  path="/"
  component={() => {
    window.location.href = "/admin";
    return null;
  }}
  allowedRoles={["administrator"]}
/>
```

## Security Considerations

1. **Password Security**: Passwords are hashed using bcrypt before storage
2. **Token Generation**: Invitation tokens are randomly generated using cryptographically secure methods
3. **Cross-Site Request Forgery**: CSRF protection is implemented using secure cookies
4. **Input Validation**: All input is validated using Zod schemas
5. **Portfolio Isolation**: Strict checks ensure users cannot access data from portfolios they don't belong to

## Future Enhancements

1. **Two-Factor Authentication**: Add 2FA for additional security
2. **Password Reset Flow**: Implement forgot password functionality
3. **User Activity Logs**: Expand the activity logging system
4. **Custom Permission Sets**: Allow more granular permission control beyond role-based access
5. **Portfolio Sharing**: Enhance the portfolio sharing functionality