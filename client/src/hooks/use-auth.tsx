// @ts-nocheck
import { createContext, ReactNode, useContext } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest, queryClient, clearQueryCache, refreshAllData } from "@/lib/queryClient";
import { UserRole } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import React from "react";

// Define User interface
export interface User {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  portfolioId?: number;
  companyName:string;
}

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<User, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<User, Error, RegisterData>;
  hasPermission: (roles: UserRole[]) => boolean;
  checkSession: () => Promise<boolean>;
};

type LoginData = {
  username: string;
  password: string;
};

type RegisterData = {
  username: string;
  password: string;
  email: string;
  firstName: string;
  lastName: string;
  companyName:string;
};

const loginSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const registerSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  email: z.string().email("Please enter a valid email address"),
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  companyName:z.string().min(3, "Company Name must be at least 3 characters"),
});

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  
  const {
    data: user,
    error,
    isLoading,
    refetch: refetchUser
  } = useQuery<User | null, Error>({
    queryKey: ["/api/user"],
    queryFn: async () => {
      try {
        const userData = await apiRequest("GET", "/api/user"); // ✅ fixed here
        if (userData) {
          sessionStorage.setItem('user', JSON.stringify(userData));
        }
        return userData;
      } catch (err: any) {
        if (err.message?.includes('401')) {
          sessionStorage.removeItem('user');
          return null;
        }
        throw err;
      }
    },
    retry: (failureCount, error) => {
      if (error.message?.includes('401')) {
        return false;
      }
      return failureCount < 3;
    },
    staleTime: 1000 * 60 * 5,
    refetchInterval: 1000 * 60 * 10,
    refetchOnWindowFocus: true,
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      // Validate credentials
      loginSchema.parse(credentials);
      return await apiRequest("POST", "/api/login", credentials);
    },
    onSuccess: (user: User) => {
      // First clear any existing cache to ensure no stale data
      clearQueryCache();
      
      // Update user data in queryClient and sessionStorage
      queryClient.setQueryData(["/api/user"], user);
      sessionStorage.setItem('user', JSON.stringify(user));
      
      // Refresh all data for the new user
      refreshAllData();
      
      // Also refetch the user data to ensure we have the latest
      refetchUser();
      
      toast({
        title: "Login successful",
        description: `Welcome back, ${user.firstName || user.username}!`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (userData: RegisterData) => {
      try {
        // Validate user data
        registerSchema.parse(userData);
        return await apiRequest("POST", "/api/register", userData);
      } catch (error) {
        // Capture and re-throw the error
        console.error("Registration API error:", error);
        throw error;
      }
    },
    onSuccess: (user: User) => {
      // Clear any existing cache first
      clearQueryCache();
      
      // Update user data in queryClient
      queryClient.setQueryData(["/api/user"], user);
      sessionStorage.setItem('user', JSON.stringify(user));
      
      // Refresh all data 
      refreshAllData();
      
      // Also refetch the user data to ensure we have the latest
      refetchUser();
      
      toast({
        title: "Registration successful",
        description: `Welcome to PropSku, ${user.firstName || user.username}!`,
      });
    },
    onError: (error: any) => {
      // Improved error handling
      let errorMessage = "Registration failed";
      
      if (error.message) {
        // Extract error message from response if available
        try {
          const msgMatch = error.message.match(/\d+:\s*(.*)/);
          if (msgMatch && msgMatch[1]) {
            errorMessage = msgMatch[1];
          } else {
            errorMessage = error.message;
          }
        } catch (e) {
          errorMessage = error.message;
        }
      }
      
      toast({
        title: "Registration failed",
        description: errorMessage,
        variant: "destructive",
      });
      
      console.error("Registration error details:", error);
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/logout");
    },
    onSuccess: () => {
      // Clear user data from session storage
      sessionStorage.removeItem('user');
      
      // Clear entire query cache to prevent data leakage between users
      clearQueryCache();
      
      // Set user to null in the query cache
      queryClient.setQueryData(["/api/user"], null);
      
      toast({
        title: "Logged out",
        description: "You have been successfully logged out.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Logout failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

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

  // Add a session check function to test the auth state
  const checkSession = async () => {
    try {
      // Make a request to the dashboard endpoint which returns auth status
      const dashboardData = await apiRequest("GET", "/api/dashboard");
      console.log("Session check result:", dashboardData);
      
      // If we're authenticated in the backend but not in the frontend, refresh user data
      if (dashboardData.authenticated && !user) {
        console.log("Backend session exists but frontend has no user - refreshing");
        refetchUser();
      }
      
      return dashboardData.authenticated;
    } catch (error) {
      console.error("Session check failed:", error);
      return false;
    }
  };

  // Add an effect to check the session when the component mounts
  React.useEffect(() => {
    // Check the session state when the component mounts
    checkSession();
    
    // Set up a periodic check
    const interval = setInterval(() => {
      checkSession();
    }, 60000); // Check every minute
    
    return () => clearInterval(interval);
  }, []); // Only run once on mount

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        error,
        loginMutation,
        logoutMutation,
        registerMutation,
        hasPermission,
        checkSession
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

