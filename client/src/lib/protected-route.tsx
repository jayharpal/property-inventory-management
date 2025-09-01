// @ts-nocheck
import React from "react";
import { Route, Redirect, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { LoadingSpinner } from "@/components/loading-spinner";
import { ReactNode } from "react";
import { UserRole } from "@/lib/types";

interface ProtectedRouteProps {
  path: string;
  component: React.ComponentType<any>;
  allowedRoles?: UserRole[];
  redirectTo?: string;
}

/**
 * ProtectedRoute - A wrapper component that handles authentication and role-based access control
 * 
 * @param path - The URL path this route should match
 * @param component - The component to render if access is granted
 * @param allowedRoles - Optional list of roles that can access this route
 * @param redirectTo - Where to redirect if not authenticated
 */
export function ProtectedRoute({ 
  path, 
  component: Component, 
  allowedRoles = [], 
  redirectTo = "/auth" 
}: ProtectedRouteProps) {
  // Get authentication state and current location
  const { user, isLoading } = useAuth();
  const [location] = useLocation();
  return (
    <Route path={path}>
      {(params) => {        
        // While checking authentication status, show loading spinner
        if (isLoading) {
          return <LoadingSpinner />;
        }
        
        // If not authenticated, redirect to login
        if (!user) {
          return <Redirect to={redirectTo} />;
        }
        
        // Special case for administrators - they should only access the admin panel
        if (user.role === "administrator") {
          // If this is the admin panel route, allow access
          if (path === "/admin") {
            return <Component {...params} key={location}/>;
          }
          
          // If this is the root route, redirect to admin panel
          if (path === "/") {
            return <Redirect to="/admin" />;
          }
          
          // For any other route, deny access
          console.log(`Access denied to ${location} for user ${user.username}`);
          return <Redirect to="/access-denied" />;
        }
        
        // For non-administrator users, continue with normal role checking
        
        // If no specific roles are required, grant access to any authenticated user
        if (allowedRoles.length === 0) {
          return <Component {...params} />;
        }
        
        // Check if the user has any of the required roles
        const hasRequiredRole = allowedRoles.includes(user.role as UserRole);
        
        // If the user doesn't have the required role, redirect to access denied page
        if (!hasRequiredRole) {
          console.log(`Access denied: User ${user.username} with role ${user.role} attempted to access ${location}`);
          return <Redirect to="/access-denied" />;
        }
        
        // User is authenticated and has the required role
        return <Component {...params} key={location} />;
      }}
    </Route>
  );
}