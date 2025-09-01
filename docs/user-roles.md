# User Roles and Access Control

This document outlines the user role system implemented in the property management application.

## Available User Roles

The application implements three distinct user roles with different access permissions:

1. **Standard User**
   - Base level access to the application
   - Can view and manage listings, inventory, shopping lists, and expenses
   - Cannot access analytics, reports, or the dashboard
   - Cannot invite other users
   - Only sees data related to the portfolios they're associated with

2. **Standard Admin**
   - Default role assigned to new users during registration
   - Full access to all regular features including dashboard, analytics, reports
   - Can invite other users to the platform
   - Can manage owners and properties 
   - Only sees data related to the portfolios they manage

3. **Administrator**
   - Highest privilege level with complete system access
   - Has access to the Admin Panel with system-wide analytics and controls
   - Can view activity logs for all users
   - Can update user roles through the Admin Panel
   - Can see all data across all portfolios

## Role-Based Access Control Implementation

The application uses a protected route system that verifies users have the appropriate role before rendering protected content:

- Routes with no role restrictions are accessible to all authenticated users
- Some routes are limited to Standard Admin and Administrator roles
- The Admin Panel is exclusively available to users with the Administrator role

## Authentication and User Management

### Logging in as Different User Types

For testing purposes, you can use these accounts:

1. **Administrator**:
   - Username: `user1`
   - Password: `password1`

2. **Standard Admin**:
   - Username: `user5`
   - Password: `password5`

3. **Standard User**:
   - Username: `user4`
   - Password: `password4`

### Managing User Roles

Currently, administrator access must be granted through direct database updates. 

To update a user's role to administrator, an SQL query needs to be executed:

```sql
UPDATE "users" SET role = 'administrator' WHERE id = [USER_ID];
```

Similarly, to change a user to a standard user role:

```sql
UPDATE "users" SET role = 'standard_user' WHERE id = [USER_ID];
```

## Access Denied Handling

When a user attempts to access content they don't have permission for:

1. They are redirected to the Access Denied page
2. The access attempt is logged
3. The user is provided with navigation options to return to authorized content

## Registration Process

When a new user registers:

1. They are assigned the "standard_admin" role by default
2. A new portfolio is automatically created for them
3. They can then invite standard users to join their portfolio

## Best Practices

- Administrator access should be granted sparingly and only to trusted users
- Use the Standard User role for users who only need limited access to the system
- The Standard Admin role is appropriate for property managers who need full feature access for their properties
