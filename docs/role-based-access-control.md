# Role-Based Access Control System Documentation

## Overview

PropSku implements a comprehensive role-based access control (RBAC) system to manage user permissions across the application. The RBAC system ensures that users can only access features and data appropriate to their assigned role. This document details the implementation, roles, permissions, and technical architecture of the RBAC system.

## User Roles

PropSku defines three primary user roles, each with distinct permission levels:

### 1. Standard User

- **Role identifier**: `standard_user`
- **Description**: Basic users with limited access to essential property management features.
- **Primary use case**: Property management staff who need to manage listings, inventory, and expenses but don't require access to analytical data or administrative functions.
- **Permission scope**: Portfolio-specific access only. Can only view and manage data within their assigned portfolio.

### 2. Standard Admin

- **Role identifier**: `standard_admin`
- **Description**: Administrative users with access to most features except system-wide administration.
- **Primary use case**: Property managers or team leads who need comprehensive access to manage properties, owners, reports, and view analytics.
- **Permission scope**: Portfolio-specific access, but with additional administrative capabilities within their portfolio.
- **Default role**: This is the default role assigned during new user registration.

### 3. Administrator

- **Role identifier**: `administrator`
- **Description**: Super users with complete system access including the Admin Panel.
- **Primary use case**: Organization owners or IT administrators who need full control over the application, including user management, system monitoring, and cross-portfolio analytics.
- **Permission scope**: Application-wide access to all features and data across all portfolios.

## Permission Matrix

| Feature/Access | Standard User | Standard Admin | Administrator |
|----------------|---------------|----------------|---------------|
| Dashboard | ❌ | ✅ | ✅ |
| Listings | ✅ | ✅ | ✅ |
| Owners | ❌ | ✅ | ✅ |
| Inventory | ✅ | ✅ | ✅ |
| Expenses | ✅ | ✅ | ✅ |
| Analytics | ❌ | ✅ | ✅ |
| Reports | ❌ | ✅ | ✅ |
| Settings | ✅ | ✅ | ✅ |
| Admin Panel | ❌ | ❌ | ✅ |
| User Management | ❌ | ❌ | ✅ |
| System Monitoring | ❌ | ❌ | ✅ |
| Activity Logs | ❌ | ❌ | ✅ |

## Implementation Details

### Database Schema

The user role is defined in the users table with a `role` column that accepts one of the three role identifiers:

```typescript
// User model
export const users = pgTable("users", {
  // ...other fields
  role: text("role").$type<UserRole>().notNull().default("standard_admin"),
  // ...other fields
});

// Role types
export const userRoleEnum = z.enum(["standard_user", "standard_admin", "administrator"]);
export type UserRole = z.infer<typeof userRoleEnum>;
```

### Authentication System

The authentication system is implemented using the `useAuth` hook with session-based authentication. The hook provides the following functionality:

- User authentication state
- Login/logout operations
- Permission checking through the `hasPermission` function

#### Key Components:

1. **AuthContext**: React context that provides authentication-related functionality to the entire application.
2. **AuthProvider**: Component that wraps the application and provides the authentication context.
3. **useAuth**: Hook that allows components to access the authentication context.

### Permission Checking

The core of the RBAC system is the `hasPermission` function, which determines if a user has access to a specific feature based on their role:

```typescript
// Check if user has permission based on role
const hasPermission = (requiredRoles: UserRole[]): boolean => {
  if (!user) return false;
  
  // Administrator role has access to everything
  if (user.role === 'administrator') return true;
  
  // Standard admin has access to most features except app-wide analytics
  if (user.role === 'standard_admin' && !requiredRoles.includes('administrator')) return true;
  
  // Standard user can only access what they are explicitly authorized for
  return requiredRoles.includes(user.role as UserRole);
};
```

This function implements a hierarchical permission system:
- Administrators automatically have access to all features
- Standard admins have access to all features except those specifically requiring administrator privileges
- Standard users only have access to features that explicitly allow their role

### Route Protection

Protected routes are implemented using the `ProtectedRoute` component, which checks the user's permissions before rendering a route:

```typescript
export function ProtectedRoute({
  path,
  component: Component,
  allowedRoles,
}: ProtectedRouteProps) {
  const { user, isLoading, hasPermission } = useAuth();

  // ...authentication checks...

  // Check role-based access if allowedRoles is specified
  if (allowedRoles && !hasPermission(allowedRoles)) {
    // Special handling for dashboard and standard users
    if (path === "/" && user.role === "standard_user") {
      return <Redirect to="/listings" />;
    }
    
    // Access denied page for unauthorized access
    return (
      <Route path={path}>
        <AccessDeniedPage />
      </Route>
    );
  }

  return <Route path={path} component={Component} />;
}
```

Special behavior is implemented for standard users attempting to access the dashboard - they are automatically redirected to the listings page.

### UI Components

Navigation components (Sidebar and MobileNav) use the `hasPermission` function to conditionally render menu items based on the user's permissions:

```typescript
// Example from Sidebar component
<SidebarLink 
  href="/analytics" 
  icon="fa-chart-bar"
  allowedRoles={["standard_admin", "administrator"]}
>
  Analytics
</SidebarLink>
```

## Portfolio-Based Access Control

In addition to role-based permissions, PropSku implements portfolio-based access control to isolate data between different user groups:

### Portfolio Association

Users are associated with a specific portfolio through the `portfolioId` field in the users table:

```typescript
export const users = pgTable("users", {
  // ...other fields
  portfolioId: integer("portfolio_id"),
  // ...other fields
});
```

### Data Filtering

All data-related queries in the application's storage layer filter results based on the user's portfolio, ensuring users can only see data from their assigned portfolio.

### Invitation System

The system includes an invitation mechanism to add users to portfolios with specific roles:

```typescript
export const invitations = pgTable("invitations", {
  // ...other fields
  email: text("email").notNull(),
  portfolioId: integer("portfolio_id").notNull(),
  role: text("role").$type<UserRole>().notNull().default("standard_user"),
  // ...other fields
});
```

Standard admins can invite standard users to their portfolio, while administrators can invite any type of user to any portfolio.

## Technical Implementation Guidelines

### Adding Role-Protected Features

To add a new feature with role-based protection:

1. Define the allowed roles for the feature
2. Add proper route protection in the application router
3. Use the `hasPermission` function to conditionally render UI elements
4. Apply portfolio filtering in the backend API endpoints

### Testing Role Access

To verify role-based access:

1. Log in as different user types
2. Verify that UI elements are properly shown/hidden
3. Test direct URL access to restricted pages
4. Verify API endpoints enforce the correct permissions

## Security Considerations

### Authentication Flow

1. User credentials are validated on the server-side
2. Sessions are used to maintain authentication state
3. All protected routes and API endpoints verify session validity

### Role Escalation Prevention

The role-based system is designed to prevent unauthorized role escalation:

1. Role assignments can only be modified by administrators
2. Role validations occur on both frontend and backend
3. API endpoints validate permissions independently of UI controls

### Audit Trail

System changes and access attempts are logged for security purposes:

```typescript
export const activityLogs = pgTable("activity_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  action: text("action").notNull(),
  details: text("details"),
  timestamp: timestamp("timestamp").defaultNow(),
});
```

## Best Practices for Development

When extending the system, developers should follow these guidelines:

1. **Always use the hasPermission function**: Never hardcode role checks
2. **Apply both frontend and backend checks**: Don't rely solely on UI restrictions
3. **Test with all user roles**: Verify behavior with each role type
4. **Document new permissions**: Update permission documentation when adding features
5. **Consider portfolio isolation**: Ensure data queries respect portfolio boundaries
6. **Use ProtectedRoute consistently**: All protected pages should use the ProtectedRoute component

## Common Patterns

### Conditional Rendering

```tsx
{hasPermission(["standard_admin", "administrator"]) && (
  <AnalyticsComponent />
)}
```

### Route Protection

```tsx
<ProtectedRoute 
  path="/analytics" 
  component={AnalyticsPage} 
  allowedRoles={["standard_admin", "administrator"]} 
/>
```

### API Endpoints

```typescript
// Example route handler with permission check
app.get("/api/analytics", requireAuth, requireRole(["standard_admin", "administrator"]), (req, res) => {
  // Handler logic
});
```

## Roadmap for Future Enhancements

1. **Custom Role Creation**: Allowing administrators to define custom roles with specific permission sets
2. **Permission Granularity**: Breaking down permissions to more specific actions rather than feature-level access
3. **Cross-Portfolio Access**: Selective sharing of properties across portfolios for specific purposes
4. **Temporary Access Grants**: Time-limited elevated permissions for specific tasks

## Troubleshooting

### Common Issues

1. **User can't access a feature**: Verify role assignment in user profile
2. **Incorrectly shown UI elements**: Check conditional rendering logic
3. **User redirected from dashboard**: Confirm user is not a standard_user
4. **API endpoints returning 403**: Verify role-permission mapping

### Debugging Steps

1. Check user role in database
2. Verify permission checks in route components
3. Inspect API endpoint permission middleware
4. Review portfolio associations

## Conclusion

The role-based access control system in PropSku provides a robust framework for managing user permissions. By clearly defining roles, implementing proper permission checks, and enforcing portfolio isolation, the system ensures that users can only access features and data appropriate to their assigned responsibilities.
