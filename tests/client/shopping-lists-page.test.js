import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, setupMockFetch, cleanupMockFetch, createMockData } from './test-utils';
import ShoppingListsPage from '../../client/src/pages/shopping-lists-page';
import ShoppingListPage from '../../client/src/pages/shopping-list-page';

describe('Shopping Lists Pages', () => {
  let originalFetch;
  
  // Mock data for tests
  const mockShoppingLists = [
    createMockData.shoppingList({ id: 1, title: 'Default Low Stock List', isDefault: true, isLowStockList: true }),
    createMockData.shoppingList({ id: 2, title: 'Weekly Supplies', isDefault: false, isLowStockList: false }),
    createMockData.shoppingList({ id: 3, title: 'Monthly Maintenance', isDefault: false, isLowStockList: false }),
  ];
  
  const mockShoppingListItems = [
    createMockData.shoppingListItem({ 
      id: 1, 
      listId: 1, 
      inventoryItemId: 2, 
      quantity: 2, 
      completed: false,
      inventoryItem: createMockData.inventoryItem({ id: 2, name: 'Dish Soap', category: 'cleaning', quantity: 3, minQuantity: 5 })
    }),
    createMockData.shoppingListItem({ 
      id: 2, 
      listId: 1, 
      inventoryItemId: 3, 
      quantity: 5, 
      completed: false,
      inventoryItem: createMockData.inventoryItem({ id: 3, name: 'Light Bulbs', category: 'maintenance', quantity: 0, minQuantity: 5 })
    }),
  ];
  
  beforeEach(() => {
    originalFetch = setupMockFetch({
      '/api/shopping-lists': mockShoppingLists,
      '/api/shopping-lists/1': mockShoppingLists[0],
      '/api/shopping-lists/2': mockShoppingLists[1],
      '/api/shopping-lists/3': mockShoppingLists[2],
      '/api/shopping-lists/1/items': mockShoppingListItems,
      '/api/inventory': [
        createMockData.inventoryItem({ id: 1, name: 'Paper Towels', category: 'supplies', quantity: 12, minQuantity: 5 }),
        createMockData.inventoryItem({ id: 2, name: 'Dish Soap', category: 'cleaning', quantity: 3, minQuantity: 5 }),
        createMockData.inventoryItem({ id: 3, name: 'Light Bulbs', category: 'maintenance', quantity: 0, minQuantity: 5 }),
      ],
    });
  });
  
  afterEach(() => {
    cleanupMockFetch(originalFetch);
  });
  
  describe('Shopping Lists Overview Page', () => {
    test('renders shopping lists page with list of shopping lists', async () => {
      renderWithProviders(<ShoppingListsPage />);
      
      // Check for header
      expect(screen.getByText(/shopping lists/i)).toBeInTheDocument();
      
      // Wait for shopping lists to load
      await waitFor(() => {
        expect(screen.getByText('Default Low Stock List')).toBeInTheDocument();
        expect(screen.getByText('Weekly Supplies')).toBeInTheDocument();
        expect(screen.getByText('Monthly Maintenance')).toBeInTheDocument();
      });
      
      // Check for "New Shopping List" button
      expect(screen.getByText(/new shopping list/i)).toBeInTheDocument();
    });
    
    test('opens create new shopping list dialog when New Shopping List button is clicked', async () => {
      renderWithProviders(<ShoppingListsPage />);
      
      // Wait for shopping lists to load
      await waitFor(() => {
        expect(screen.getByText('Default Low Stock List')).toBeInTheDocument();
      });
      
      // Find the New Shopping List button and click it
      const newListButton = screen.getByText(/new shopping list/i);
      userEvent.click(newListButton);
      
      // Check that the dialog is displayed
      await waitFor(() => {
        expect(screen.getByText(/create shopping list/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/list title/i)).toBeInTheDocument();
      });
    });
    
    test('navigates to inventory page when Back to Inventory button is clicked', async () => {
      // Mock the window.location.href setter
      const mockAssign = jest.fn();
      Object.defineProperty(window, 'location', {
        value: { assign: mockAssign },
        writable: true
      });
      
      renderWithProviders(<ShoppingListsPage />);
      
      // Wait for shopping lists to load
      await waitFor(() => {
        expect(screen.getByText('Default Low Stock List')).toBeInTheDocument();
      });
      
      // Find the Back to Inventory button and click it
      const backButton = screen.getByText(/back to inventory/i);
      userEvent.click(backButton);
      
      // Check that we're navigating to the inventory page
      await waitFor(() => {
        expect(mockAssign).toHaveBeenCalledWith('/inventory');
      });
    });
  });
  
  describe('Individual Shopping List Page', () => {
    test('renders shopping list page with list items', async () => {
      // Mock useParams to provide listId
      jest.mock('wouter', () => ({
        ...jest.requireActual('wouter'),
        useParams: () => ({ listId: '1' }),
        useLocation: () => ['/shopping-lists/1']
      }));
      
      renderWithProviders(<ShoppingListPage />);
      
      // Wait for shopping list items to load
      await waitFor(() => {
        expect(screen.getByText('Default Low Stock List')).toBeInTheDocument();
        expect(screen.getByText('Dish Soap')).toBeInTheDocument();
        expect(screen.getByText('Light Bulbs')).toBeInTheDocument();
      });
      
      // Check for "Add Items" button
      expect(screen.getByText(/add items/i)).toBeInTheDocument();
      
      // Check for "Back to Shopping Lists" button
      expect(screen.getByText(/back to shopping lists/i)).toBeInTheDocument();
    });
    
    test('marks item as completed when item checkbox is clicked', async () => {
      // Setup mock for the PUT endpoint
      global.fetch = jest.fn((url, options) => {
        if (url.includes('/api/shopping-lists/1/items/1') && options.method === 'PUT') {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve({
              ...mockShoppingListItems[0],
              completed: true
            })
          });
        }
        
        // Use the default mock setup for other endpoints
        const mockResponse = setupMockFetch({
          '/api/shopping-lists/1': mockShoppingLists[0],
          '/api/shopping-lists/1/items': mockShoppingListItems,
        });
        
        return mockResponse(url, options);
      });
      
      // Mock useParams to provide listId
      jest.mock('wouter', () => ({
        ...jest.requireActual('wouter'),
        useParams: () => ({ listId: '1' }),
        useLocation: () => ['/shopping-lists/1']
      }));
      
      renderWithProviders(<ShoppingListPage />);
      
      // Wait for shopping list items to load
      await waitFor(() => {
        expect(screen.getByText('Dish Soap')).toBeInTheDocument();
      });
      
      // Find the checkbox for the first item and click it
      const checkbox = screen.getAllByRole('checkbox')[0];
      userEvent.click(checkbox);
      
      // Check that the API was called to update the item
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/shopping-lists/1/items/1',
          expect.objectContaining({
            method: 'PUT',
            body: expect.stringContaining('"completed":true')
          })
        );
      });
    });
  });
});