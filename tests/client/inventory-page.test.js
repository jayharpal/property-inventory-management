import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, setupMockFetch, cleanupMockFetch, createMockData } from './test-utils';
import InventoryPage from '../../client/src/pages/inventory-page';

describe('Inventory Page', () => {
  let originalFetch;
  
  // Mock data for tests
  const mockInventoryItems = [
    createMockData.inventoryItem({ id: 1, name: 'Paper Towels', category: 'supplies', quantity: 12, minQuantity: 5, status: 'inStock' }),
    createMockData.inventoryItem({ id: 2, name: 'Dish Soap', category: 'cleaning', quantity: 3, minQuantity: 5, status: 'low' }),
    createMockData.inventoryItem({ id: 3, name: 'Light Bulbs', category: 'maintenance', quantity: 0, minQuantity: 5, status: 'critical' }),
  ];
  
  beforeEach(() => {
    originalFetch = setupMockFetch({
      '/api/inventory': mockInventoryItems,
      '/api/inventory/low-stock': mockInventoryItems.filter(item => item.status !== 'inStock'),
      '/api/shopping-lists': [
        createMockData.shoppingList({ id: 1, title: 'Default Low Stock List', isDefault: true, isLowStockList: true })
      ],
    });
  });
  
  afterEach(() => {
    cleanupMockFetch(originalFetch);
  });
  
  test('renders inventory page with inventory items', async () => {
    renderWithProviders(<InventoryPage />);
    
    // Check for header
    expect(screen.getByText(/inventory management/i)).toBeInTheDocument();
    
    // Wait for inventory items to load
    await waitFor(() => {
      expect(screen.getByText('Paper Towels')).toBeInTheDocument();
      expect(screen.getByText('Dish Soap')).toBeInTheDocument();
      expect(screen.getByText('Light Bulbs')).toBeInTheDocument();
    });
    
    // Check for status badges
    expect(screen.getByText('In Stock')).toBeInTheDocument();
    expect(screen.getByText('Low Stock')).toBeInTheDocument();
    expect(screen.getByText('Critical')).toBeInTheDocument();
  });
  
  test('filters inventory items by search query', async () => {
    renderWithProviders(<InventoryPage />);
    
    // Wait for inventory items to load
    await waitFor(() => {
      expect(screen.getByText('Paper Towels')).toBeInTheDocument();
    });
    
    // Find the search input and type in it
    const searchInput = screen.getByPlaceholderText(/search/i);
    userEvent.type(searchInput, 'soap');
    
    // Check that only matching items are displayed
    await waitFor(() => {
      expect(screen.queryByText('Paper Towels')).not.toBeInTheDocument();
      expect(screen.getByText('Dish Soap')).toBeInTheDocument();
      expect(screen.queryByText('Light Bulbs')).not.toBeInTheDocument();
    });
  });
  
  test('filters inventory items by low stock status', async () => {
    renderWithProviders(<InventoryPage />);
    
    // Wait for inventory items to load
    await waitFor(() => {
      expect(screen.getByText('Paper Towels')).toBeInTheDocument();
    });
    
    // Find the low stock filter toggle and click it
    const lowStockToggle = screen.getByText(/show low stock only/i);
    userEvent.click(lowStockToggle);
    
    // Check that only low stock items are displayed
    await waitFor(() => {
      expect(screen.queryByText('Paper Towels')).not.toBeInTheDocument();
      expect(screen.getByText('Dish Soap')).toBeInTheDocument();
      expect(screen.getByText('Light Bulbs')).toBeInTheDocument();
    });
  });
  
  test('opens add inventory item dialog when Add Item button is clicked', async () => {
    renderWithProviders(<InventoryPage />);
    
    // Wait for inventory items to load
    await waitFor(() => {
      expect(screen.getByText('Paper Towels')).toBeInTheDocument();
    });
    
    // Find the Add Item button and click it
    const addButton = screen.getByText(/add item/i);
    userEvent.click(addButton);
    
    // Check that the dialog is displayed
    await waitFor(() => {
      expect(screen.getByText(/add inventory item/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/item name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/category/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/quantity/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/minimum quantity/i)).toBeInTheDocument();
    });
  });
  
  test('navigates to shopping list when Shopping Lists button is clicked', async () => {
    // Mock the window.location.href setter
    const mockAssign = jest.fn();
    Object.defineProperty(window, 'location', {
      value: { assign: mockAssign },
      writable: true
    });
    
    renderWithProviders(<InventoryPage />);
    
    // Wait for inventory items to load
    await waitFor(() => {
      expect(screen.getByText('Paper Towels')).toBeInTheDocument();
    });
    
    // Find the Shopping Lists button and click it
    const shoppingListsButton = screen.getByText(/shopping lists/i);
    userEvent.click(shoppingListsButton);
    
    // Check that we're navigating to the shopping lists page
    await waitFor(() => {
      expect(mockAssign).toHaveBeenCalledWith('/shopping-lists');
    });
  });
});