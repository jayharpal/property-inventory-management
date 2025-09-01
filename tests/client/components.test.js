import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from './test-utils';

// Import components to test
import Header from '../../client/src/components/header';
import Sidebar from '../../client/src/components/sidebar';
import DashboardCard from '../../client/src/components/dashboard-card';
import StatusBadge from '../../client/src/components/status-badge';

describe('Shared Components', () => {
  test('Header renders user information when logged in', async () => {
    // Mock the authentication state
    const loggedInUser = { id: 1, username: 'admin', role: 'admin' };
    
    renderWithProviders(<Header user={loggedInUser} />);
    
    // Check user info is displayed
    expect(screen.getByText('admin')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /profile/i })).toBeInTheDocument();
  });
  
  test('Header shows login button when not logged in', async () => {
    renderWithProviders(<Header user={null} />);
    
    // Check for login button
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });
  
  test('Sidebar shows navigation links', async () => {
    renderWithProviders(<Sidebar />);
    
    // Check for navigation links
    expect(screen.getByText(/dashboard/i)).toBeInTheDocument();
    expect(screen.getByText(/expenses/i)).toBeInTheDocument();
    expect(screen.getByText(/inventory/i)).toBeInTheDocument();
    expect(screen.getByText(/reports/i)).toBeInTheDocument();
    expect(screen.getByText(/shopping lists/i)).toBeInTheDocument();
  });
  
  test('Dashboard card renders with title and value', async () => {
    renderWithProviders(
      <DashboardCard
        title="Total Properties"
        value="25"
        icon="Building"
        description="Total properties managed"
      />
    );
    
    // Check card content
    expect(screen.getByText('Total Properties')).toBeInTheDocument();
    expect(screen.getByText('25')).toBeInTheDocument();
    expect(screen.getByText('Total properties managed')).toBeInTheDocument();
  });
  
  test('Status badge renders different states correctly', async () => {
    const { rerender } = renderWithProviders(
      <StatusBadge status="low" />
    );
    
    // Check low stock status
    expect(screen.getByText(/low stock/i)).toBeInTheDocument();
    expect(screen.getByText(/low stock/i)).toHaveClass(/text-yellow/i);
    
    // Rerender with critical status
    rerender(
      <StatusBadge status="critical" />
    );
    
    // Check critical status
    expect(screen.getByText(/critical/i)).toBeInTheDocument();
    expect(screen.getByText(/critical/i)).toHaveClass(/text-red/i);
    
    // Rerender with in stock status
    rerender(
      <StatusBadge status="inStock" />
    );
    
    // Check in stock status
    expect(screen.getByText(/in stock/i)).toBeInTheDocument();
    expect(screen.getByText(/in stock/i)).toHaveClass(/text-green/i);
  });
});