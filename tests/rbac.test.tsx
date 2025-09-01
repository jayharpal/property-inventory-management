import { render, screen, waitFor } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { expect, it, describe, vi, beforeEach, afterEach } from 'vitest';
import { MemoryRouter } from 'wouter/use-browser-location';
import { queryClient } from '../client/src/lib/queryClient';
import { AuthContext } from '../client/src/hooks/use-auth';
import { ProtectedRoute } from '../client/src/lib/protected-route';

// Mock components
const MockDashboard = () => <div data-testid="dashboard">Dashboard Content</div>;
const MockListings = () => <div data-testid="listings">Listings Content</div>;
const MockAnalytics = () => <div data-testid="analytics">Analytics Content</div>;
const MockAdminPanel = () => <div data-testid="admin-panel">Admin Panel Content</div>;

// Mock fetch
const originalFetch = global.fetch;
const mockFetch = vi.fn();

beforeEach(() => {
  global.fetch = mockFetch;
  // Reset mocks between tests
  vi.clearAllMocks();
});

afterEach(() => {
  global.fetch = originalFetch;
});

// Mock Auth Provider with different user roles
const createMockAuthContext = (role: 'standard_user' | 'standard_admin' | 'administrator' | null) => {
  const user = role
    ? {
        id: 1,
        username: 'testuser',
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        role: role,
        portfolioId: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    : null;

  const hasPermission = (requiredRoles: string[]): boolean => {
    if (!user) return false;
    
    // Administrator role has access to everything
    if (user.role === 'administrator') return true;
    
    // Standard admin has access to most features except app-wide analytics
    if (user.role === 'standard_admin' && !requiredRoles.includes('administrator')) return true;
    
    // Standard user can only access what they are explicitly authorized for
    return requiredRoles.includes(user.role);
  };

  return {
    user,
    isLoading: false,
    error: null,
    loginMutation: {
      mutate: vi.fn(),
      isPending: false,
      isSuccess: false,
      isError: false,
      reset: vi.fn(),
      context: undefined,
      failureCount: 0,
      failureReason: null,
      mutateAsync: vi.fn(),
      status: 'idle',
      variables: undefined,
      data: undefined,
      error: undefined,
    },
    logoutMutation: {
      mutate: vi.fn(),
      isPending: false,
      isSuccess: false,
      isError: false,
      reset: vi.fn(),
      context: undefined,
      failureCount: 0,
      failureReason: null,
      mutateAsync: vi.fn(),
      status: 'idle',
      variables: undefined,
      data: undefined,
      error: undefined,
    },
    registerMutation: {
      mutate: vi.fn(),
      isPending: false,
      isSuccess: false,
      isError: false,
      reset: vi.fn(),
      context: undefined,
      failureCount: 0,
      failureReason: null,
      mutateAsync: vi.fn(),
      status: 'idle',
      variables: undefined,
      data: undefined,
      error: undefined,
    },
    hasPermission,
  };
};

// Test wrapper with auth context and routing
const renderWithProviders = (ui: React.ReactNode, { role }: { role: 'standard_user' | 'standard_admin' | 'administrator' | null }) => {
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={createMockAuthContext(role)}>
        <MemoryRouter>{ui}</MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>
  );
};

describe('Role-Based Access Control', () => {
  // Test access to dashboard based on user role
  describe('Dashboard Access', () => {
    it('allows standard_admin to access dashboard', async () => {
      renderWithProviders(
        <ProtectedRoute 
          path="/" 
          component={MockDashboard} 
          allowedRoles={["standard_admin", "administrator"]} 
        />,
        { role: 'standard_admin' }
      );
      
      await waitFor(() => {
        expect(screen.getByTestId('dashboard')).toBeInTheDocument();
      });
    });

    it('allows administrator to access dashboard', async () => {
      renderWithProviders(
        <ProtectedRoute 
          path="/" 
          component={MockDashboard} 
          allowedRoles={["standard_admin", "administrator"]} 
        />,
        { role: 'administrator' }
      );
      
      await waitFor(() => {
        expect(screen.getByTestId('dashboard')).toBeInTheDocument();
      });
    });

    it('redirects standard_user from dashboard', async () => {
      // Mock redirect functionality since we can't fully test it in jsdom
      const mockRedirect = vi.fn();
      
      vi.mock('wouter', async () => {
        const actual = await vi.importActual('wouter');
        return {
          ...actual as any,
          Redirect: (props: { to: string }) => {
            mockRedirect(props.to);
            return null;
          },
        };
      });
      
      renderWithProviders(
        <ProtectedRoute 
          path="/" 
          component={MockDashboard} 
          allowedRoles={["standard_admin", "administrator"]} 
        />,
        { role: 'standard_user' }
      );
      
      await waitFor(() => {
        expect(screen.queryByTestId('dashboard')).not.toBeInTheDocument();
      });
    });
  });

  // Test access to listings based on user role (all users should have access)
  describe('Listings Access', () => {
    it('allows standard_user to access listings', async () => {
      renderWithProviders(
        <ProtectedRoute 
          path="/listings" 
          component={MockListings} 
        />,
        { role: 'standard_user' }
      );
      
      await waitFor(() => {
        expect(screen.getByTestId('listings')).toBeInTheDocument();
      });
    });

    it('allows standard_admin to access listings', async () => {
      renderWithProviders(
        <ProtectedRoute 
          path="/listings" 
          component={MockListings} 
        />,
        { role: 'standard_admin' }
      );
      
      await waitFor(() => {
        expect(screen.getByTestId('listings')).toBeInTheDocument();
      });
    });

    it('allows administrator to access listings', async () => {
      renderWithProviders(
        <ProtectedRoute 
          path="/listings" 
          component={MockListings} 
        />,
        { role: 'administrator' }
      );
      
      await waitFor(() => {
        expect(screen.getByTestId('listings')).toBeInTheDocument();
      });
    });
  });

  // Test access to analytics based on user role
  describe('Analytics Access', () => {
    it('prevents standard_user from accessing analytics', async () => {
      renderWithProviders(
        <ProtectedRoute 
          path="/analytics" 
          component={MockAnalytics} 
          allowedRoles={["standard_admin", "administrator"]} 
        />,
        { role: 'standard_user' }
      );
      
      await waitFor(() => {
        expect(screen.queryByTestId('analytics')).not.toBeInTheDocument();
      });
    });

    it('allows standard_admin to access analytics', async () => {
      renderWithProviders(
        <ProtectedRoute 
          path="/analytics" 
          component={MockAnalytics} 
          allowedRoles={["standard_admin", "administrator"]} 
        />,
        { role: 'standard_admin' }
      );
      
      await waitFor(() => {
        expect(screen.getByTestId('analytics')).toBeInTheDocument();
      });
    });

    it('allows administrator to access analytics', async () => {
      renderWithProviders(
        <ProtectedRoute 
          path="/analytics" 
          component={MockAnalytics} 
          allowedRoles={["standard_admin", "administrator"]} 
        />,
        { role: 'administrator' }
      );
      
      await waitFor(() => {
        expect(screen.getByTestId('analytics')).toBeInTheDocument();
      });
    });
  });

  // Test access to admin panel based on user role
  describe('Admin Panel Access', () => {
    it('prevents standard_user from accessing admin panel', async () => {
      renderWithProviders(
        <ProtectedRoute 
          path="/admin" 
          component={MockAdminPanel} 
          allowedRoles={["administrator"]} 
        />,
        { role: 'standard_user' }
      );
      
      await waitFor(() => {
        expect(screen.queryByTestId('admin-panel')).not.toBeInTheDocument();
      });
    });

    it('prevents standard_admin from accessing admin panel', async () => {
      renderWithProviders(
        <ProtectedRoute 
          path="/admin" 
          component={MockAdminPanel} 
          allowedRoles={["administrator"]} 
        />,
        { role: 'standard_admin' }
      );
      
      await waitFor(() => {
        expect(screen.queryByTestId('admin-panel')).not.toBeInTheDocument();
      });
    });

    it('allows administrator to access admin panel', async () => {
      renderWithProviders(
        <ProtectedRoute 
          path="/admin" 
          component={MockAdminPanel} 
          allowedRoles={["administrator"]} 
        />,
        { role: 'administrator' }
      );
      
      await waitFor(() => {
        expect(screen.getByTestId('admin-panel')).toBeInTheDocument();
      });
    });
  });

  // Test the hasPermission function directly
  describe('hasPermission Function', () => {
    it('returns false when user is null', () => {
      const { hasPermission } = createMockAuthContext(null);
      expect(hasPermission(["standard_user"])).toBe(false);
    });

    it('returns true for administrator regardless of required roles', () => {
      const { hasPermission } = createMockAuthContext('administrator');
      expect(hasPermission(["standard_user"])).toBe(true);
      expect(hasPermission(["standard_admin"])).toBe(true);
      expect(hasPermission(["administrator"])).toBe(true);
    });

    it('returns true for standard_admin except when administrator role is required', () => {
      const { hasPermission } = createMockAuthContext('standard_admin');
      expect(hasPermission(["standard_user"])).toBe(true);
      expect(hasPermission(["standard_admin"])).toBe(true);
      expect(hasPermission(["administrator"])).toBe(false);
    });

    it('returns true for standard_user only when standard_user role is required', () => {
      const { hasPermission } = createMockAuthContext('standard_user');
      expect(hasPermission(["standard_user"])).toBe(true);
      expect(hasPermission(["standard_admin"])).toBe(false);
      expect(hasPermission(["administrator"])).toBe(false);
    });
  });
});