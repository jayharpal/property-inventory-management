import { QueryClient, QueryFunction } from "@tanstack/react-query";

// API base URL - use environment variable if available, otherwise fallback to the Railway URL
const API_BASE_URL = import.meta.env.VITE_API_URL || "https://api.propsku.com";

// Function to get the current user ID from session storage
export function getUserIdFromSession() {
  try {
    const userString = sessionStorage.getItem('user');
    if (userString) {
      const user = JSON.parse(userString);
      return user.id || 'unauthenticated';
    }
  } catch (error) {
    console.error("Error getting user ID from session:", error);
  }
  
  // Try getting from localStorage as fallback
  try {
    const userString = localStorage.getItem('user');
    if (userString) {
      const user = JSON.parse(userString);
      return user.id || 'unauthenticated';
    }
  } catch (error) {
    console.error("Error getting user ID from localStorage:", error);
  }
  
  return 'unauthenticated';
}

// Create a function to generate user-specific query keys
export function createQueryKey(baseKey: any) {
  const userId = getUserIdFromSession();
  return [baseKey, `user-${userId}`];
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const contentType = res.headers.get('content-type');
    let errorText = res.statusText;

    try {
      // Try to get a more detailed error message from the response
      if (contentType && contentType.includes('application/json')) {
        const errorData = await res.json();
        if (errorData.message) {
          errorText = errorData.message;
        } else {
          errorText = JSON.stringify(errorData);
        }
      } else {
        errorText = await res.text();
      }
    } catch (e) {
      console.error("Error parsing error response:", e);
      // Fall back to status text if response can't be parsed
      errorText = res.statusText;
    }

    throw new Error(`${res.status}: ${errorText}`);
  }
}

// Function for making POST/PUT/DELETE requests
export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<any> {
  // Create full API URL with base
  const fullUrl = url.startsWith('/api') 
    ? `${API_BASE_URL}${url}` 
    : `${API_BASE_URL}/api/${url.replace(/^\//, '')}`;
  
  console.log('Making API request to:', fullUrl);
  
  try {
    const res = await fetch(fullUrl, {
      method,
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
      mode: 'cors'
    });
    
    const contentType = res.headers.get('content-type');
    
    // Try to parse the response
    let responseData;
    if (contentType && contentType.includes('application/json')) {
      responseData = await res.json();
      if (method === 'GET') {
        console.log(`Response from ${url}:`, responseData);
      }
    } else {
      responseData = { success: res.ok };
    }
    
    // Check for errors in the response
    if (!res.ok) {
      const errorMessage = responseData.message || res.statusText;
      console.error(`API request to ${url} failed: ${res.status} ${errorMessage}`);
      throw new Error(`${res.status}: ${errorMessage}`);
    }
    
    return responseData;
  } catch (error) {
    console.error(`API request to ${fullUrl} failed:`, error);
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";

export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Extract the real endpoint (first item in the queryKey array)
    const endpoint = queryKey[0] as string;
    const fullUrl = endpoint.startsWith('/api') 
      ? `${API_BASE_URL}${endpoint}` 
      : `${API_BASE_URL}/api/${endpoint.replace(/^\//, '')}`;
    
    console.log('Making query request to:', fullUrl);
    
    try {
      const res = await fetch(fullUrl, {
        method: 'GET',
        headers: {
          "Accept": "application/json"
        },
        credentials: "include",
        mode: 'cors'
      });
      
      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        return null;
      }
      
      const contentType = res.headers.get('content-type');
      
      // Try to parse the response
      let responseData;
      if (contentType && contentType.includes('application/json')) {
        responseData = await res.json();
        console.log(`Response from ${endpoint}:`, responseData);
      } else {
        responseData = await res.text();
        console.log(`Response from ${endpoint} (text):`, responseData);
      }
      
      // Check for errors
      if (!res.ok) {
        const errorMessage = typeof responseData === 'object' && responseData.message 
          ? responseData.message 
          : res.statusText;
        console.error(`Query request to ${endpoint} failed: ${res.status} ${errorMessage}`);
        throw new Error(`${res.status}: ${errorMessage}`);
      }
      
      return responseData;
    } catch (error) {
      console.error(`Query request to ${fullUrl} failed:`, error);
      throw error;
    }
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: true, // Changed to true to refresh when focus returns
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: false,
    },
    mutations: {
      retry: false,
      // After mutation, invalidate all queries to refresh data
      onSuccess: () => {
        queryClient.invalidateQueries();
      },
    },
  },
});

// Helper function to clear all cache data (used during logout)
export function clearQueryCache() {
  queryClient.clear();
}

// Helper function to refresh all data (used during login)
export function refreshAllData() {
  queryClient.invalidateQueries();
}