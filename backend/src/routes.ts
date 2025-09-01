import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage.js";
import setupAuth from "./auth.js";
import bcrypt from "bcrypt";
import { z } from "zod";
import { 
  insertOwnerSchema, insertListingSchema, insertInventorySchema, 
  insertExpenseSchema, insertReportSchema, 
  insertShoppingListSchema, insertShoppingListItemSchema, insertInventoryRefillSchema,
  insertPortfolioSchema, insertInvitationSchema,
  inventory, Owner, Expense, Listing, Report, 
  ShoppingList, ShoppingListItem, InventoryRefill,
  Portfolio, Invitation,
  insertUserSchema
} from "./schema/schema.js";
import { generateMonthlyExpenseReport } from "./services/pdf.js";
import { sendMonthlyReportEmail } from "./services/email.js";
import fs from "fs";
import { registerAdminRoutes } from "./admin-routes.js";
import { manualCorsMiddleware } from "./middleware/cors.js";
import path from "path";
import archiver from 'archiver'; // Import archiver

// Auth middleware
function requireAuth(req: Request, res: Response, next: Function) {
  console.log('Authentication check - isAuthenticated:', req.isAuthenticated());
  console.log('Authentication check - session:', req.session?.id || 'No session');
  console.log('Authentication check - cookies:', req.headers.cookie || 'No cookies');
  
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  console.log('Authentication successful - user:', req.user?.username);
  next();
}

// Middleware to check if user has required role
function requireRole(roles: string[]) {
  return (req: Request, res: Response, next: Function) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    const user = req.user as any;
    if (!user || !roles.includes(user.role)) {
      return res.status(403).json({ message: "Forbidden: Insufficient permissions" });
    }
    
    next();
  };
}

// Middleware to check if user has access to the specified portfolio
function requirePortfolioAccess() {
  return async (req: Request, res: Response, next: Function) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    const user = req.user as any;
    
    // Administrator role has access to all portfolios
    if (user.role === 'administrator') {
      return next();
    }
    
    // Get portfolioId from request parameters, query, or body
    const portfolioId = 
      req.params.portfolioId ? parseInt(req.params.portfolioId) : 
      req.query.portfolioId ? parseInt(req.query.portfolioId as string) : 
      req.body.portfolioId ? parseInt(req.body.portfolioId) : 
      null;
    
    // If portfolioId is not provided but user has a portfolioId, use that
    const userPortfolioId = user.portfolioId;
    
    // If neither is provided, we can't check access
    if (!portfolioId && !userPortfolioId) {
      return res.status(400).json({ message: "Portfolio ID is required" });
    }
    
    // If the portfolioId in the request doesn't match the user's portfolioId
    if (portfolioId && userPortfolioId && portfolioId !== userPortfolioId) {
      return res.status(403).json({ message: "Forbidden: You don't have access to this portfolio" });
    }
    
    // Access is granted
    next();
  };
}

// Direct CORS handlers for critical API endpoints 
function setupCriticalEndpoints(app: Express) {
  // Registration endpoint specific CORS handling
  app.options('/api/register', (req, res) => {
    const origin = req.headers.origin;
    res.header('Access-Control-Allow-Origin', origin || '*');
    res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.status(200).end();
  });
  
  // Login endpoint specific CORS handling
  app.options('/api/login', (req, res) => {
    const origin = req.headers.origin;
    res.header('Access-Control-Allow-Origin', origin || '*');
    res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.status(200).end();
  });
}

export async function registerRoutes(app: Express): Promise<Server> {
  // First, set up critical endpoints with special CORS handling
  setupCriticalEndpoints(app);
  
  // Auth routes
  setupAuth(app);
  
  // Register admin routes
  registerAdminRoutes(app);

  // userprofile edit
  app.put("/api/userprofile/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const registerSchema = insertUserSchema.omit({ 
        portfolioId: true, 
        role: true 
      });
      const validatedData = registerSchema.parse(req.body);
      const userprofile = await storage.updateUserProfile(id, validatedData);
      
      if (!userprofile) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Log activity
      await storage.createActivityLog({
        userId: req.user!.id,
        action: "USERPROFILE_UPDATED",
        details: `User ${userprofile.firstName} updated`
      });
      
      res.json(userprofile);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid User data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update User" });
    }
  });

  // userpassword edit
  app.put("/api/userpassword/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const {
        currentPassword,
        newPassword,
        password,
        username,
        email,
        firstName,
        lastName
      } = req.body;

      // Validate required inputs first
      if (!currentPassword || !newPassword || !password) {
        return res.status(400).json({ message: "Missing required password fields" });
      }

      const isMatch = await bcrypt.compare(currentPassword, password);
      if (!isMatch) {
        return res.status(400).json({ message: "Old password does not match" });
      }
      const registerSchema = insertUserSchema.omit({
        portfolioId: true,
        role: true,
      });
      const validatedData = registerSchema.parse({
        username,
        email,
        firstName,
        lastName,
        password: newPassword,
      });

      // newPassword exists at this point — safe to hash
      const hashedPassword = await bcrypt.hash(validatedData.password, 10);
        
      // const userprofile = await storage.updateUserProfile(id,hashedPassword);
      const updateUserPassword = await storage.updateUserPassword(id, { password: hashedPassword }); 

      if (!updateUserPassword) {
        return res.status(404).json({ message: "User not found" });
      }

      await storage.createActivityLog({
        userId: req.user!.id,
        action: "USERPASSWORD_UPDATED",
        details: `User ${updateUserPassword.firstName} updated`,
      });

      res.json(updateUserPassword);

    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: "Invalid User data",
          errors: error.errors,
        });
      }
      res.status(500).json({ message: "Failed to update User" });
    }
  });

  // Owners routes
  app.get("/api/owners", requireAuth, requirePortfolioAccess(), async (req, res) => {
    try {
      const user = req.user as any;
      // Use the user's portfolio if available, administrators can see all
      const portfolioId = user.role === 'administrator' ? undefined : user.portfolioId;
      const owners = await storage.getOwners(portfolioId);
      res.json(owners);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch owners" });
    }
  });

  app.get("/api/owners/:id", requireAuth, async (req, res) => {
    try {
      const owner = await storage.getOwner(parseInt(req.params.id));
      if (!owner) {
        return res.status(404).json({ message: "Owner not found" });
      }
      res.json(owner);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch owner" });
    }
  });

  app.post("/api/owners", requireAuth, requirePortfolioAccess(), async (req, res) => {
    try {
      const user = req.user as any;
      // Add the user's portfolio ID to the data
      const validationData = {
        ...req.body,
        portfolioId: user.portfolioId
      };
      
      const validatedData = insertOwnerSchema.parse(validationData);
      const owner = await storage.createOwner(validatedData);
      
      // Log activity
      await storage.createActivityLog({
        userId: req.user!.id,
        action: "OWNER_CREATED",
        details: `Owner ${owner.name} created`
      });
      
      res.status(201).json(owner);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid owner data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create owner" });
    }
  });

  app.put("/api/owners/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertOwnerSchema.partial().parse(req.body);
      const owner = await storage.updateOwner(id, validatedData);
      
      if (!owner) {
        return res.status(404).json({ message: "Owner not found" });
      }
      
      // Log activity
      await storage.createActivityLog({
        userId: req.user!.id,
        action: "OWNER_UPDATED",
        details: `Owner ${owner.name} updated`
      });
      
      res.json(owner);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid owner data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update owner" });
    }
  });

  app.delete("/api/owners/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const owner = await storage.getOwner(id);
      
      if (!owner) {
        return res.status(404).json({ message: "Owner not found" });
      }
      
      const success = await storage.deleteOwner(id);
      
      if (success) {
        // Log activity
        await storage.createActivityLog({
          userId: req.user!.id,
          action: "OWNER_DELETED",
          details: `Owner ${owner.name} deleted`
        });
        
        return res.status(204).send();
      } else {
        return res.status(500).json({ message: "Failed to delete owner" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to delete owner" });
    }
  });

  // Listings routes
  app.get("/api/listings", requireAuth, requirePortfolioAccess(), async (req, res) => {
    try {
      const user = req.user as any;
      const ownerIdParam = req.query.ownerId as string | undefined;

      if (ownerIdParam) {
        const ownerId = parseInt(ownerIdParam);
        if (isNaN(ownerId)) {
          return res.status(400).json({ message: "Invalid ownerId format" });
        }
        // TODO: Add portfolio access check for this specific owner if necessary,
        // or ensure getListingsByOwner implicitly handles portfolio scoping for the logged-in user.
        const listings = await storage.getListingsByOwner(ownerId);
        return res.json(listings);
      }

      // Use the user's portfolio if available, administrators can see all
      const portfolioId = user.role === 'administrator' ? undefined : user.portfolioId;
      const listings = await storage.getListings(portfolioId);
      res.json(listings);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch listings" });
    }
  });

  app.get("/api/listings/owner/:ownerId", requireAuth, async (req, res) => {
    try {
      const ownerId = parseInt(req.params.ownerId);
      const listings = await storage.getListingsByOwner(ownerId);
      res.json(listings);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch listings" });
    }
  });

  app.get("/api/listings/:id", requireAuth, async (req, res) => {
    try {
      const listing = await storage.getListing(parseInt(req.params.id));
      if (!listing) {
        return res.status(404).json({ message: "Listing not found" });
      }
      res.json(listing);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch listing" });
    }
  });

  app.post("/api/listings", requireAuth, requirePortfolioAccess(), async (req, res) => {
    try {
      const user = req.user as any;
      const validationData = {
        ...req.body,
        portfolioId: user.portfolioId
      };
      
      const validatedData = insertListingSchema.parse(validationData);
      const listing = await storage.createListing(validatedData);
      
      await storage.createActivityLog({
        userId: req.user!.id,
        action: "LISTING_CREATED",
        details: `Listing ${listing.name} created`
      });
      
      res.status(201).json(listing);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        console.error("Zod validation error creating listing:", JSON.stringify(error.errors, null, 2)); // Log the full Zod error
        return res.status(400).json({ message: "Invalid listing data", errors: error.errors });
      }
      console.error("Failed to create listing:", error); // General error logging
      res.status(500).json({ message: "Failed to create listing" });
    }
  });

  app.put("/api/listings/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertListingSchema.partial().parse(req.body);
      const listing = await storage.updateListing(id, validatedData);
      
      if (!listing) {
        return res.status(404).json({ message: "Listing not found" });
      }
      
      // Log activity
      await storage.createActivityLog({
        userId: req.user!.id,
        action: "LISTING_UPDATED",
        details: `Listing ${listing.name} updated`
      });
      
      res.json(listing);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid listing data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update listing" });
    }
  });

  app.delete("/api/listings/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const listing = await storage.getListing(id);
      
      if (!listing) {
        return res.status(404).json({ message: "Listing not found" });
      }
      
      const success = await storage.deleteListing(id);
      
      if (success) {
        // Log activity
        await storage.createActivityLog({
          userId: req.user!.id,
          action: "LISTING_DELETED",
          details: `Listing ${listing.name} deleted`
        });
        
        return res.status(204).send();
      } else {
        return res.status(500).json({ message: "Failed to delete listing" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to delete listing" });
    }
  });

  // Inventory routes
  app.get("/api/inventory", requireAuth, requirePortfolioAccess(), async (req, res) => {
    try {
      const user = req.user as any;
      // Use the user's portfolio if available
      const portfolioId = user.portfolioId;
      const inventory = await storage.getInventory(portfolioId);
      // Filter out deleted inventory items
      const activeInventory = inventory.filter(item => !item.deleted);
      res.json(activeInventory);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch inventory" });
    }
  });
  
  // Get all inventory including deleted items (for analytics)
  app.get("/api/inventory/all", requireAuth, requirePortfolioAccess(), async (req, res) => {
    try {
      const user = req.user as any;
      // Administrator can see all inventory, others see only their portfolio's inventory
      const portfolioId = user.role === 'administrator' ? undefined : user.portfolioId;
      const inventory = await storage.getInventory(portfolioId);
      res.json(inventory);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch inventory" });
    }
  });

  app.get("/api/inventory/low", requireAuth, requirePortfolioAccess(), async (req, res) => {
    try {
      const user = req.user as any;
      // Use the user's portfolio if available
      const portfolioId = user.portfolioId;
      const lowInventory = await storage.getLowInventoryItems(portfolioId);
      res.json(lowInventory);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch low inventory items" });
    }
  });

  app.get("/api/inventory/:id", requireAuth, async (req, res) => {
    try {
      const item = await storage.getInventoryItem(parseInt(req.params.id));
      if (!item) {
        return res.status(404).json({ message: "Inventory item not found" });
      }
      res.json(item);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch inventory item" });
    }
  });

  app.post("/api/inventory", requireAuth, requirePortfolioAccess(), async (req, res) => {
    try {
      const user = req.user as any;
      // Get data to validate
      const validationData = {
        ...req.body,
        // Add the user's portfolio ID to the inventory item
        portfolioId: user.portfolioId
      };
      
      const validatedData = insertInventorySchema.parse(validationData);
      const item = await storage.createInventoryItem(validatedData);
      
      // Log activity
      await storage.createActivityLog({
        userId: req.user!.id,
        action: "INVENTORY_CREATED",
        details: `Inventory item ${item.name} created`
      });
      
      res.status(201).json(item);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid inventory data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create inventory item" });
    }
  });

  app.put("/api/inventory/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertInventorySchema.partial().parse(req.body);
      const item = await storage.updateInventoryItem(id, validatedData);
      
      if (!item) {
        return res.status(404).json({ message: "Inventory item not found" });
      }
      
      // Log activity
      await storage.createActivityLog({
        userId: req.user!.id,
        action: "INVENTORY_UPDATED",
        details: `Inventory item ${item.name} updated`
      });
      
      res.json(item);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid inventory data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update inventory item" });
    }
  });

  app.delete("/api/inventory/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const item = await storage.getInventoryItem(id);
      
      if (!item) {
        return res.status(404).json({ message: "Inventory item not found" });
      }
      
      // Perform soft delete by setting the deleted flag
      const updatedItem = await storage.updateInventoryItem(id, { deleted: true });
      
      if (updatedItem) {
        // Log activity
        await storage.createActivityLog({
          userId: req.user!.id,
          action: "INVENTORY_DELETED",
          details: `Inventory item ${item.name} soft deleted`
        });
        
        return res.status(200).json(updatedItem);
      } else {
        return res.status(500).json({ message: "Failed to delete inventory item" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to delete inventory item" });
    }
  });

  // Expenses routes
  app.get("/api/expenses", requireAuth, requirePortfolioAccess(), async (req, res) => {
    try {
      const user = req.user as any;
      const ownerIdParam = req.query.ownerId as string | undefined;

      if (ownerIdParam) {
        const ownerId = parseInt(ownerIdParam);
        if (isNaN(ownerId)) {
          return res.status(400).json({ message: "Invalid ownerId format" });
        }
        // TODO: Add portfolio access check for this specific owner if necessary,
        // or ensure getExpensesByOwner implicitly handles portfolio scoping for the logged-in user.
        const expenses = await storage.getExpensesByOwner(ownerId);
        return res.json(expenses);
      }

      // Use the user's portfolio if available
      const portfolioId = user.role === 'administrator' ? undefined : user.portfolioId;
      const expenses = await storage.getExpenses(portfolioId);
      res.json(expenses);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch expenses" });
    }
  });

  app.get("/api/expenses/listing/:listingId", requireAuth, async (req, res) => {
    try {
      const listingId = parseInt(req.params.listingId);
      const expenses = await storage.getExpensesByListing(listingId);
      res.json(expenses);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch expenses" });
    }
  });

  app.get("/api/expenses/owner/:ownerId", requireAuth, async (req, res) => {
    try {
      const ownerId = parseInt(req.params.ownerId);
      const expenses = await storage.getExpensesByOwner(ownerId);
      res.json(expenses);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch expenses" });
    }
  });

  app.get("/api/expenses/:id", requireAuth, async (req, res) => {
    try {
      const expense = await storage.getExpense(parseInt(req.params.id));
      if (!expense) {
        return res.status(404).json({ message: "Expense not found" });
      }
      res.json(expense);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch expense" });
    }
  });

  app.post("/api/expenses", requireAuth, requirePortfolioAccess(), async (req, res) => {
    try {
      const user = req.user as any;
      // Add the user's portfolio ID to the data
      const validationData = {
        ...req.body,
        portfolioId: user.portfolioId,
        date: req.body.date ? new Date(req.body.date) : new Date(),
      };
      
      const validatedData = insertExpenseSchema.parse(validationData);
      
      // Reduce inventory quantity if inventory item is used
      if (validatedData.inventoryId) {
        const inventoryItem = await storage.getInventoryItem(validatedData.inventoryId);
        if (inventoryItem) {
          const newQuantity = inventoryItem.quantity - (validatedData.quantityUsed || 0);
          await storage.updateInventoryItem(validatedData.inventoryId, {
            quantity: newQuantity
          });
          
          // Create low inventory alert if needed
          if (newQuantity <= (inventoryItem.minQuantity || 10)) {
            await storage.createActivityLog({
              userId: req.user!.id,
              action: "LOW_INVENTORY_ALERT",
              details: `Inventory item ${inventoryItem.name} is running low (${newQuantity} remaining)`
            });
          }
        }
      }

      const expense = await storage.createExpense(validatedData);
      
      // Log activity
      await storage.createActivityLog({
        userId: req.user!.id,
        action: "EXPENSE_CREATED",
        details: `Expense created for listing ${expense.listingId}`
      });
      
      res.status(201).json(expense);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid expense data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create expense" });
    }
  });

  app.put("/api/expenses/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const originalExpense = await storage.getExpense(id);
      
      if (!originalExpense) {
        return res.status(404).json({ message: "Expense not found" });
      }

      const validationData = {
        ...req.body,
        date: req.body.date ? new Date(req.body.date) : new Date(),
      };

      const validatedData = insertExpenseSchema.partial().parse(validationData);
      
      // Handle inventory adjustments if quantityUsed is changing or inventory item is changing
      if (
        (originalExpense.inventoryId && validatedData.quantityUsed && 
         originalExpense.quantityUsed !== validatedData.quantityUsed) ||
        (originalExpense.inventoryId && validatedData.inventoryId && 
         originalExpense.inventoryId !== validatedData.inventoryId)
      ) {
        // If inventoryId changed, restore old inventory and deduct from new inventory
        if (originalExpense.inventoryId && validatedData.inventoryId && 
            originalExpense.inventoryId !== validatedData.inventoryId) {
          
          // Restore old inventory
          const oldItem = await storage.getInventoryItem(originalExpense.inventoryId);
          if (oldItem && originalExpense.quantityUsed) {
            const newOldQuantity = oldItem.quantity + originalExpense.quantityUsed;
            await storage.updateInventoryItem(originalExpense.inventoryId, {
              quantity: newOldQuantity
            });
            
            // Log inventory restoration
            await storage.createActivityLog({
              userId: req.user!.id,
              action: "INVENTORY_RESTORED",
              details: `${originalExpense.quantityUsed} units of ${oldItem.name} restored due to expense update`
            });
          }
          
          // Deduct from new inventory
          const newItem = await storage.getInventoryItem(validatedData.inventoryId);
          if (newItem && validatedData.quantityUsed) {
            const newQuantity = newItem.quantity - validatedData.quantityUsed;
            await storage.updateInventoryItem(validatedData.inventoryId, {
              quantity: newQuantity
            });
            
            // Check for low inventory
            if (newQuantity <= (newItem.minQuantity || 10)) {
              await storage.createActivityLog({
                userId: req.user!.id,
                action: "LOW_INVENTORY_ALERT",
                details: `Inventory item ${newItem.name} is running low (${newQuantity} remaining)`
              });
            }
          }
        } 
        // If only quantity changed, adjust the difference
        else if (originalExpense.inventoryId && validatedData.quantityUsed && 
                originalExpense.quantityUsed !== validatedData.quantityUsed) {
          
          const item = await storage.getInventoryItem(originalExpense.inventoryId);
          if (item && originalExpense.quantityUsed !== null && validatedData.quantityUsed !== undefined) {
            const quantityDiff = (originalExpense.quantityUsed || 0) - (validatedData.quantityUsed || 0);
            const newQuantity = item.quantity + quantityDiff;
            
            await storage.updateInventoryItem(originalExpense.inventoryId, {
              quantity: newQuantity
            });
            
            if (quantityDiff > 0) {
              // Log inventory increase (quantity was reduced)
              await storage.createActivityLog({
                userId: req.user!.id,
                action: "INVENTORY_ADJUSTED",
                details: `${quantityDiff} units of ${item.name} returned to inventory due to expense update`
              });
            } else if (quantityDiff < 0) {
              // Log inventory decrease (quantity was increased)
              await storage.createActivityLog({
                userId: req.user!.id,
                action: "INVENTORY_ADJUSTED",
                details: `${-quantityDiff} additional units of ${item.name} used in expense update`
              });
              
              // Check for low inventory
              if (newQuantity <= (item.minQuantity || 10)) {
                await storage.createActivityLog({
                  userId: req.user!.id,
                  action: "LOW_INVENTORY_ALERT",
                  details: `Inventory item ${item.name} is running low (${newQuantity} remaining)`
                });
              }
            }
          }
        }
      }
      
      const expense = await storage.updateExpense(id, validatedData);
      
      if (!expense) {
        return res.status(404).json({ message: "Failed to update expense" });
      }
      
      // Log activity
      await storage.createActivityLog({
        userId: req.user!.id,
        action: "EXPENSE_UPDATED",
        details: `Expense updated for $${expense.totalCost}`
      });
      
      res.json(expense);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid expense data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update expense" });
    }
  });

  app.delete("/api/expenses/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const expense = await storage.getExpense(id);
      
      if (!expense) {
        return res.status(404).json({ message: "Expense not found" });
      }
      
      // Restore inventory quantity if this expense used inventory
      if (expense.inventoryId && expense.quantityUsed) {
        const inventoryItem = await storage.getInventoryItem(expense.inventoryId);
        if (inventoryItem) {
          // Add the quantity back to inventory
          const newQuantity = inventoryItem.quantity + expense.quantityUsed;
          await storage.updateInventoryItem(expense.inventoryId, {
            quantity: newQuantity
          });
          
          // Log inventory restoration
          await storage.createActivityLog({
            userId: req.user!.id,
            action: "INVENTORY_RESTORED",
            details: `${expense.quantityUsed} units of ${inventoryItem.name} restored to inventory after expense deletion`
          });
        }
      }
      
      const success = await storage.deleteExpense(id);
      
      if (success) {
        // Log activity
        await storage.createActivityLog({
          userId: req.user!.id,
          action: "EXPENSE_DELETED",
          details: `Expense deleted for $${expense.totalCost}`
        });
        
        return res.status(204).send();
      } else {
        return res.status(500).json({ message: "Failed to delete expense" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to delete expense" });
    }
  });

  // Activity Logs
  app.get("/api/activity", requireAuth, async (req, res) => {
    try {
      const logs = await storage.getActivityLogs(req.user!.id);
      res.json(logs);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch activity logs" });
    }
  });

  // Platform integrations have been removed

  // Reports
  app.get("/api/reports", requireAuth, requirePortfolioAccess(), async (req, res) => {
    try {
      const user = req.user as any;
      // Only filter by portfolio for standard_admin and standard_user, administrators see all data
      const portfolioId = user.role === 'administrator' ? undefined : user.portfolioId;
      
      const reports = await storage.getReports(portfolioId);
      const ownersMap = new Map<number, Owner>();
      
      // Create a map to track which owners we've fetched to avoid duplicates
      const fetchedOwnerIds: Record<number, boolean> = {};
      
      // Fetch owners as needed
      for (const report of reports) {
        if (report.ownerId !== null && !fetchedOwnerIds[report.ownerId]) {
          // Mark this owner ID as fetched
          fetchedOwnerIds[report.ownerId] = true;
          
          // Fetch the owner
          const owner = await storage.getOwner(report.ownerId);
          if (owner) {
            ownersMap.set(report.ownerId, owner);
          }
        }
      }
      
      // Enrich reports with owner information
      const enrichedReports = reports.map(report => {
        const enrichedReport: any = { ...report };
        if (report.ownerId && ownersMap.has(report.ownerId)) {
          const owner = ownersMap.get(report.ownerId)!;
          enrichedReport.ownerName = owner.name;
          enrichedReport.ownerEmail = owner.email;
        }
        return enrichedReport;
      });
      
      res.json(enrichedReports);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch reports" });
    }
  });

  app.get("/api/reports/owner/:ownerId", requireAuth, async (req, res) => {
    try {
      const ownerId = parseInt(req.params.ownerId);
      const reports = await storage.getReportsByOwner(ownerId);
      
      // Get the owner information once
      const owner = await storage.getOwner(ownerId);
      
      if (!owner) {
        return res.status(404).json({ message: "Owner not found" });
      }
      
      // Enrich reports with owner information
      const enrichedReports = reports.map(report => {
        return {
          ...report,
          ownerName: owner.name,
          ownerEmail: owner.email
        };
      });
      
      res.json(enrichedReports);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch reports" });
    }
  });
  
  // Get a specific report by ID
  app.get("/api/reports/:id", requireAuth, async (req, res) => {
    try {
      const reportId = parseInt(req.params.id);
      const report = await storage.getReport(reportId);
      
      if (!report) {
        return res.status(404).json({ message: "Report not found" });
      }
      
      // Enrich report with owner information
      let enrichedReport: any = { ...report };
      if (report.ownerId) {
        const owner = await storage.getOwner(report.ownerId);
        if (owner) {
          enrichedReport.ownerName = owner.name;
          enrichedReport.ownerEmail = owner.email;
        }
      }
      
      res.json(enrichedReport);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch report" });
    }
  });
  
  // Get detailed report information for individual report view
 app.get("/api/reports/:id/details", requireAuth, async (req, res) => {
  try {
    const reportId = parseInt(req.params.id);
    const report = await storage.getReport(reportId);
    if (!report) {
      return res.status(404).json({ message: "Report not found" });
    }
    // Get owner information
    const owner = report.ownerId ? await storage.getOwner(report.ownerId) : null;
      // Get all expenses for this owner in the specified month/year
    let expenses: Expense[] = [];
    if (report.ownerId && report.month != null && report.year != null) {
      const allExpenses = await storage.getExpensesByOwner(report.ownerId);
      const monthStart = new Date(report.year, report.month - 1, 1);
      const monthEnd = new Date(report.year, report.month, 0, 23, 59, 59, 999);
        expenses = allExpenses.filter(expense => {
          if (!expense.date) return false;
          const expenseDate = new Date(expense.date);
          return expenseDate >= monthStart && expenseDate <= monthEnd;
        });
      }
      
      // Get the listings for this owner
    const listings = report.ownerId ? await storage.getListingsByOwner(report.ownerId) : [];

    // Build inventoryItemsMap
    const inventoryIds = expenses
      .filter(e => e.inventoryId != null)
      .map(e => e.inventoryId!);
    const uniqueInventoryIds = [...new Set(inventoryIds)];

    const inventoryItemsData = await Promise.all(
      uniqueInventoryIds.map(id => storage.getInventoryItem(id))
    );

    const inventoryItemsMap: Record<number, typeof inventory.$inferSelect> = {};
    inventoryItemsData.forEach(item => {
      if (item) inventoryItemsMap[item.id] = item;
    });

      // Group expenses by property - with no markup information for owner reports
      const expensesByProperty = listings.map(listing => {
         const listingExpenses = expenses
          .filter(expense => expense.listingId === listing.id)
          .map(expense => {
            const inventoryItem = expense?.inventoryId ? inventoryItemsMap[expense?.inventoryId] : null;
            return {
              ...expense,
              name: inventoryItem ? inventoryItem?.name : 'N/A'
            };
          });
        const total = listingExpenses.reduce((sum, expense) => sum + parseFloat(expense.billedAmount), 0);
        return {
          listing,
          expenses: listingExpenses,
          total
        };
      });
      // Calculate simplified summary data - no markup information for owner reports
      const totalExpenses = expenses.reduce((sum, expense) => sum + parseFloat(expense.billedAmount), 0);
      const totalProperties = listings.length;
      
      // Prepare report with owner info
      const reportWithOwner = {
        ...report,
        ownerName: owner?.name || null,
        ownerEmail: owner?.email || null,
      };

      // Send the simplified report data
      res.json({
        report: reportWithOwner,
        expenses,
        listings,
        inventoryItemsMap,
        expensesByProperty,
        summary: {
          totalExpenses,
          totalProperties
        }
      });
    } catch (error) {
      console.error("Error fetching report details:", error);
      res.status(500).json({ message: "Failed to fetch report details" });
    }
  });
  
  // Get related reports (reports from same batch - same month/year)
  app.get("/api/reports/:id/related", requireAuth, async (req, res) => {
    try {
      const reportId = parseInt(req.params.id);
      const report = await storage.getReport(reportId);
      
      if (!report) {
        return res.status(404).json({ message: "Report not found" });
      }
      
      // If report doesn't have month or year, we can't find related reports
      if (report.month === null || report.year === null) {
        return res.json([]);
      }
      
      // Get all reports from the same month/year
      const allReports = await storage.getReports();
      const relatedReports = allReports.filter(r => 
        r.id !== report.id && 
        r.month === report.month && 
        r.year === report.year
      );
      
      // Create a map to efficiently lookup owners
      const ownersMap = new Map<number, Owner>();
      
      // Fetch owners for all related reports
      for (const relatedReport of relatedReports) {
        if (relatedReport.ownerId && !ownersMap.has(relatedReport.ownerId)) {
          const owner = await storage.getOwner(relatedReport.ownerId);
          if (owner) {
            ownersMap.set(relatedReport.ownerId, owner);
          }
        }
      }
      
      // Enrich reports with owner information
      const enrichedReports = relatedReports.map(r => {
        const enriched: any = { ...r };
        if (r.ownerId && ownersMap.has(r.ownerId)) {
          const owner = ownersMap.get(r.ownerId)!;
          enriched.ownerName = owner.name;
          enriched.ownerEmail = owner.email;
        }
        return enriched;
      });
      
      res.json(enrichedReports);
    } catch (error) {
      console.error("Failed to fetch related reports:", error);
      res.status(500).json({ message: "Failed to fetch related reports" });
    }
  });
  
  // Download a report by ID
  app.get("/api/reports/:id/download", requireAuth, async (req, res) => {
    const reportIdForLog = req.params.id;
    console.log(`[Report Download ${reportIdForLog}] Initiated.`);
    try {
      const reportId = parseInt(req.params.id);
      let report = await storage.getReport(reportId);

      if (!report) {
        console.error(`[Report Download ${reportId}] Report record not found in database.`);
        return res.status(404).json({ message: "Report record not found" });
      }
      console.log(`[Report Download ${reportId}] Found report record:`, JSON.stringify(report));

      let filePath = report.filePath;
      console.log(`[Report Download ${reportId}] Initial filePath from DB: '${filePath}'`);

      let fileExists = filePath ? fs.existsSync(filePath) : false;
      console.log(`[Report Download ${reportId}] Does initial filePath '${filePath}' exist? ${fileExists}`);

      // if (!filePath || !fileExists) {
        console.log(`[Report Download ${reportId}] FilePath '${filePath}' is invalid or file does not exist. Attempting to generate PDF.`);

        if (!report.ownerId || report.month == null || report.year == null) {
          console.error(`[Report Download ${reportId}] Insufficient data (ownerId, month, or year missing) to generate PDF.`);
          return res.status(400).json({ message: "Report data is insufficient to generate the PDF (missing owner, month, or year)." });
        }

        const owner = await storage.getOwner(report.ownerId);
        if (!owner) {
          console.error(`[Report Download ${reportId}] Owner not found for ownerId: ${report.ownerId}.`);
          return res.status(404).json({ message: `Owner not found for owner ID ${report.ownerId}.` });
        }
        console.log(`[Report Download ${reportId}] Fetched owner: ${owner.name}`);

        const allOwnerExpenses = await storage.getExpensesByOwner(report.ownerId);
        const monthStart = new Date(report.year, report.month - 1, 1);
        const monthEnd = new Date(report.year, report.month, 0, 23, 59, 59, 999);
        const expensesForReport = allOwnerExpenses.filter(expense => {
          if (!expense.date) return false;
          const expenseDate = new Date(expense.date);
          return expenseDate >= monthStart && expenseDate <= monthEnd;
        });
        console.log(`[Report Download ${reportId}] Found ${expensesForReport.length} expenses for the report period.`);

        const listings = await storage.getListingsByOwner(report.ownerId);
        const inventoryIds = expensesForReport
          .filter(e => e.inventoryId !== null && e.inventoryId !== undefined)
          .map(e => e.inventoryId!);
        const uniqueInventoryIds = [...new Set(inventoryIds)];
        const inventoryItemsData = await Promise.all(
          uniqueInventoryIds.map(id => storage.getInventoryItem(id))
        );
        const inventoryItemsMap: Record<number, typeof inventory.$inferSelect> = {};
        inventoryItemsData.forEach(item => {
          if (item) inventoryItemsMap[item.id] = item;
        });
        console.log(`[Report Download ${reportId}] Prepared ${Object.keys(inventoryItemsMap).length} unique inventory items for PDF generation.`);

        const generationParams = {
          owner,
          listings,
          expenses: expensesForReport,
          inventoryItems: inventoryItemsMap,
          month: report.month,
          year: report.year
        };
        console.log(`[Report Download ${reportId}] Calling generateMonthlyExpenseReport with params (inventoryItems might be large, showing keys):`, 
          JSON.stringify({...generationParams, inventoryItems: Object.keys(inventoryItemsMap)}, null, 2));

        try {
          const generatedPathFromFunction = await generateMonthlyExpenseReport(generationParams);
          console.log(`[Report Download ${reportId}] generateMonthlyExpenseReport returned: '${generatedPathFromFunction}' (type: ${typeof generatedPathFromFunction})`);
          
          if (!generatedPathFromFunction || typeof generatedPathFromFunction !== 'string' || generatedPathFromFunction.trim() === '') {
            console.error(`[Report Download ${reportId}] generateMonthlyExpenseReport returned an invalid or empty path: '${generatedPathFromFunction}'.`);
            throw new Error("PDF generation resulted in an invalid or empty file path.");
          }

          let finalUsablePath = generatedPathFromFunction;

          if (!generatedPathFromFunction.startsWith('/tmp/')) {
            console.warn(`[Report Download ${reportId}] WARNING: Path from generateMonthlyExpenseReport '${generatedPathFromFunction}' is not in /tmp/. Attempting to copy to /tmp/.`);
            const fileName = path.basename(generatedPathFromFunction);
            const tempFilePath = `/tmp/report_${reportId}_${Date.now()}_${fileName}`;
            
            try {
              if (fs.existsSync(generatedPathFromFunction)) {
                fs.copyFileSync(generatedPathFromFunction, tempFilePath);
                console.log(`[Report Download ${reportId}] Copied file from '${generatedPathFromFunction}' to '${tempFilePath}'.`);
                finalUsablePath = tempFilePath;
                // Optionally, try to remove the original if it was in a writable but non-persistent location.
                // However, be cautious with fs.unlinkSync if generatedPathFromFunction might be from a read-only part of the bundle.
              } else {
                console.error(`[Report Download ${reportId}] Source file '${generatedPathFromFunction}' for copy to /tmp/ does not exist.`);
                throw new Error(`Source file for PDF copy operation not found at ${generatedPathFromFunction}.`);
              }
            } catch (copyError: any) {
              console.error(`[Report Download ${reportId}] Failed to copy PDF from '${generatedPathFromFunction}' to '${tempFilePath}':`, copyError.message);
              throw new Error(`Failed to move PDF to temporary storage: ${copyError.message}`);
            }
          }
          
          filePath = finalUsablePath; // Use the path that's confirmed or copied to /tmp
          let newFileExists = fs.existsSync(filePath);
          console.log(`[Report Download ${reportId}] Does finalUsablePath '${filePath}' exist? ${newFileExists}`);

          if (!newFileExists) {
            console.error(`[Report Download ${reportId}] File at final path '${filePath}' does NOT exist. This is a critical issue.`);
            throw new Error(`Generated/Copied PDF file not found at path: ${filePath}`);
          }
          
          console.log(`[Report Download ${reportId}] Attempting to update report record with filePath: '${filePath}'`);
          await storage.updateReport(reportId, { filePath: filePath });
          console.log(`[Report Download ${reportId}] Successfully updated DB with filePath: '${filePath}'`);
        } catch (generationError: any) {
          console.error(`[Report Download ${reportId}] Error during PDF generation or DB update:`, generationError.message, generationError.stack);
          return res.status(500).json({ message: "Failed to generate report PDF on-the-fly.", error: generationError.message });
        }
      // }

      console.log(`[Report Download ${reportId}] Final check for filePath before download: '${filePath}'`);
      fileExists = filePath ? fs.existsSync(filePath) : false;
      console.log(`[Report Download ${reportId}] Does final filePath '${filePath}' exist? ${fileExists}`);

      if (!filePath || !fileExists) {
          console.error(`[Report Download ${reportId}] Report file still not found after potential generation. Final filePath tested: '${filePath}'.`);
          return res.status(404).json({ message: "Report file could not be prepared for download." });
      }

      console.log(`[Report Download ${reportId}] Attempting to send file via res.download: ${filePath}`);
      await storage.createActivityLog({
        userId: req.user!.id,
        action: "REPORT_DOWNLOADED",
        details: `Downloaded report: ${report.name} (ID: ${reportId})`
      });
      
      res.download(filePath, (err: any) => {
        if (err) {
          console.error(`[Report Download ${reportId}] Error during res.download for ${filePath}:`, err);
          if (!res.headersSent) {
            // Note: res.download might have already sent headers for an error.
            // This is a best-effort to send a JSON error if nothing was sent.
            res.status(500).json({ message: "Failed to send file.", error: err.message });
          }
        } else {
          console.log(`[Report Download ${reportId}] File ${filePath} sent successfully via res.download.`);
        }
      });
    } catch (error: any) {
      console.error(`[Report Download ${reportIdForLog}] Unhandled error in download route:`, error.message, error.stack);
      if (!res.headersSent) {
        res.status(500).json({ message: "Internal server error during report download.", error: error.message });
      }
    }
  });
  
  // Download all related reports as a ZIP archive
  app.get("/api/reports/:id/download-batch", requireAuth, async (req, res) => {
    try {
      const reportId = parseInt(req.params.id);
      const report = await storage.getReport(reportId);
      
      if (!report) {
        return res.status(404).json({ message: "Reference report not found" });
      }
      
      // If report doesn't have month or year, we can't find related reports
      if (report.month === null || report.year === null) {
        return res.status(400).json({ message: "Report doesn't have month/year information" });
      }
      
      // Get all reports from the same month/year
      const allReports = await storage.getReports();
      const batchReports = allReports.filter(r => 
        r.month === report.month && 
        r.year === report.year
      );
      
      if (batchReports.length === 0) {
        return res.status(404).json({ message: "No reports found for batch download" });
      }
      
      // Create a temporary directory for the ZIP file
      const tmpDir = './temp-reports';
      if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir, { recursive: true });
      }
      
      const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ];
      
      const month = report.month ? monthNames[report.month - 1] : 'Unknown';
      const year = report.year;
      
      // Create a ZIP file using OS commands
      const zipFilename = `${month}_${year}_reports_${Date.now()}.zip`;
      const zipPath = `${tmpDir}/${zipFilename}`;
      
      // Track successful reports
      const successReports = [];
      
      // Create a text report of included files
      const manifest = [`Reports for ${month} ${year}`, '----------------------------'];
      
      // Check each report and add to manifest
      for (const batchReport of batchReports) {
        if (batchReport.filePath && fs.existsSync(batchReport.filePath)) {
          let ownerName = "Unknown Owner";
          
          if (batchReport.ownerId) {
            const owner = await storage.getOwner(batchReport.ownerId);
            if (owner) {
              ownerName = owner.name;
            }
          }
          
          manifest.push(`- ${batchReport.name} (${ownerName})`);
          successReports.push(batchReport);
        }
      }
      
      // Create a manifest file
      const manifestPath = `${tmpDir}/report_manifest_${Date.now()}.txt`;
      fs.writeFileSync(manifestPath, manifest.join('\\n'));
      
      // Create the ZIP file with the report PDFs and manifest
      const { execSync } = require('child_process');
      
      try {
        // Start with just the manifest
        execSync(`zip -j "${zipPath}" "${manifestPath}"`);
        
        // Add each report
        for (const batchReport of successReports) {
          if (batchReport.filePath && fs.existsSync(batchReport.filePath)) {
            execSync(`zip -j "${zipPath}" "${batchReport.filePath}"`);
          }
        }
        
        // Log the download activity
        await storage.createActivityLog({
          userId: req.user!.id,
          action: "BATCH_REPORTS_DOWNLOADED",
          details: `Downloaded ${successReports.length} reports for ${month} ${year}`
        });
        
        // Send the ZIP file
        res.download(zipPath, zipFilename, () => {
          // Clean up after sending - async to not block response
          setTimeout(() => {
            try {
              if (fs.existsSync(zipPath)) {
                fs.unlinkSync(zipPath);
              }
              if (fs.existsSync(manifestPath)) {
                fs.unlinkSync(manifestPath);
              }
            } catch (err) {
              console.error("Error cleaning up temporary files:", err);
            }
          }, 60000); // Clean up after 1 minute
        });
      } catch (zipError) {
        console.error("Error creating ZIP file:", zipError);
        res.status(500).json({ message: "Failed to create ZIP file" });
        
        // Clean up temp files
        try {
          if (fs.existsSync(manifestPath)) {
            fs.unlinkSync(manifestPath);
          }
        } catch (err) {
          console.error("Error cleaning up temporary files:", err);
        }
      }
    } catch (error) {
      console.error("Failed to batch download reports:", error);
      res.status(500).json({ message: "Failed to batch download reports" });
    }
  });
  
  // Send a report by email
  app.post("/api/reports/:id/email", requireAuth, async (req, res) => {
    try {
      const reportId = parseInt(req.params.id);
      const report = await storage.getReport(reportId);
      
      if (!report || !report.filePath) {
        return res.status(404).json({ message: "Report not found" });
      }
      
      // Check if the file exists
      if (!fs.existsSync(report.filePath)) {
        return res.status(404).json({ message: "Report file not found" });
      }
      
      // Get the owner information to send the email
      if (!report.ownerId) {
        return res.status(400).json({ message: "Report has no owner associated" });
      }
      
      const owner = await storage.getOwner(report.ownerId);
      if (!owner) {
        return res.status(404).json({ message: "Owner not found" });
      }
      
      // Extract month and year for email subject
      const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ];
      
      const month = report.month ? monthNames[report.month - 1] : '';
      const year = report.year || new Date().getFullYear();
      
      // Send the email
      const emailSent = await sendMonthlyReportEmail(
        owner.email,
        owner.name,
        month,
        year.toString(),
        report.filePath
      );
      
      if (emailSent) {
        // Update the report to mark it as sent
        await storage.updateReport(report.id, { sent: true });
        
        // Log activity
        await storage.createActivityLog({
          userId: req.user!.id,
          action: "REPORT_SENT",
          details: `Report ${report.name} sent to ${owner.name}`
        });
        
        res.json({ 
          success: true, 
          message: `Report sent to ${owner.email}` 
        });
      } else {
        res.status(500).json({ message: "Failed to send email" });
      }
    } catch (error) {
      console.error("Failed to send report:", error);
      res.status(500).json({ message: "Failed to send report" });
    }
  });
  
  // Send a batch of reports by email (for related reports)
  app.post("/api/reports/:id/email-batch", requireAuth, async (req, res) => {
    try {
      const reportId = parseInt(req.params.id);
      const report = await storage.getReport(reportId);
      
      if (!report) {
        return res.status(404).json({ message: "Reference report not found" });
      }
      
      // If report doesn't have month or year, we can't find related reports
      if (report.month === null || report.year === null) {
        return res.status(400).json({ message: "Report doesn't have month/year information" });
      }
      
      // Get all reports from the same month/year, including the current one
      const allReports = await storage.getReports();
      const batchReports = allReports.filter(r => 
        r.month === report.month && 
        r.year === report.year
      );
      
      if (batchReports.length === 0) {
        return res.status(404).json({ message: "No reports found for batch sending" });
      }
      
      const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ];
      
      const month = report.month ? monthNames[report.month - 1] : '';
      const year = report.year;
      
      // Track success and failures
      const results = {
        success: 0,
        failed: 0,
        details: [] as { reportId: number, ownerName: string, success: boolean, message: string }[]
      };
      
      // Process each report
      for (const batchReport of batchReports) {
        try {
          if (!batchReport.filePath || !batchReport.ownerId) {
            results.failed++;
            results.details.push({
              reportId: batchReport.id,
              ownerName: "Unknown",
              success: false,
              message: "Report missing file path or owner ID"
            });
            continue;
          }
          
          // Check if file exists
          if (!fs.existsSync(batchReport.filePath)) {
            results.failed++;
            results.details.push({
              reportId: batchReport.id,
              ownerName: "Unknown",
              success: false,
              message: "Report file not found"
            });
            continue;
          }
          
          const owner = await storage.getOwner(batchReport.ownerId);
          if (!owner) {
            results.failed++;
            results.details.push({
              reportId: batchReport.id,
              ownerName: "Unknown",
              success: false,
              message: "Owner not found"
            });
            continue;
          }
          
          // Send the email
          const emailSent = await sendMonthlyReportEmail(
            owner.email,
            owner.name,
            month,
            year.toString(),
            batchReport.filePath
          );
          
          if (emailSent) {
            // Update the report to mark it as sent
            await storage.updateReport(batchReport.id, { sent: true });
            
            // Log activity
            await storage.createActivityLog({
              userId: req.user!.id,
              action: "REPORT_SENT",
              details: `Report ${batchReport.name} sent to ${owner.name}`
            });
            
            results.success++;
            results.details.push({
              reportId: batchReport.id,
              ownerName: owner.name,
              success: true,
              message: `Report sent to ${owner.email}`
            });
          } else {
            results.failed++;
            results.details.push({
              reportId: batchReport.id,
              ownerName: owner.name,
              success: false,
              message: "Failed to send email"
            });
          }
        } catch (err) {
          console.error("Error processing report in batch:", err);
          results.failed++;
          results.details.push({
            reportId: batchReport.id,
            ownerName: "Unknown",
            success: false,
            message: `Error: ${(err as Error).message}`
          });
        }
      }
      
      // Log batch email activity
      await storage.createActivityLog({
        userId: req.user!.id,
        action: "BATCH_REPORTS_SENT",
        details: `Sent ${results.success} out of ${batchReports.length} reports for ${month} ${year}`
      });
      
      res.json({ 
        success: results.success > 0,
        message: `Successfully sent ${results.success} out of ${batchReports.length} reports`,
        results
      });
    } catch (error) {
      console.error("Failed to send batch reports:", error);
      res.status(500).json({ message: "Failed to send batch reports" });
    }
  });
  
  // New Batch Report Endpoints
  app.get("/api/reports/batch/:batchId", requireAuth, async (req, res) => {
    try {
      const batchId = req.params.batchId;
      const user = req.user as any;
      
      // Get all reports, but filter in code to ensure we see all reports in a batch
      const allReports = await storage.getReports();
      
      // Filter reports by batchId
      const batchReports = allReports.filter(report => report.batchId === batchId);
      
      if (batchReports.length === 0) {
        return res.status(404).json({ message: "No reports found for this batch" });
      }
      
      // Check if this user has access to this batch
      const batchReport = batchReports.find(r => r.type === 'batch');
      if (batchReport && user.role !== 'administrator' && batchReport.portfolioId !== user.portfolioId) {
        console.warn(`User ${user.id} with portfolioId ${user.portfolioId} attempted to access batch ${batchId} from portfolio ${batchReport.portfolioId}`);
        return res.status(403).json({ message: "Access denied to this batch report" });
      }
      
      // Add owner info to each report
      const enrichedReports = await Promise.all(batchReports.map(async (report) => {
        if (report.ownerId) {
          const owner = await storage.getOwner(report.ownerId);
          if (owner) {
            return {
              ...report,
              ownerName: owner.name,
              ownerEmail: owner.email
            };
          }
        }
        return report;
      }));
      
      res.json(enrichedReports);
    } catch (error) {
      console.error("Error fetching batch reports:", error);
      res.status(500).json({ message: "Failed to fetch batch reports" });
    }
  });
  
  app.get("/api/reports/batch/:batchId/notes", requireAuth, async (req, res) => {
    try {
      const batchId = req.params.batchId;
      const allReports = await storage.getReports();
      
      // Find the batch report (type='batch') to get notes
      const batchReport = allReports.find(report => report.batchId === batchId && report.type === 'batch');
      
      if (!batchReport) {
        return res.status(404).json({ message: "Batch not found" });
      }
      
      res.json({ notes: batchReport.notes || "" });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch batch notes" });
    }
  });
  
  app.patch("/api/reports/batch/:batchId/notes", requireAuth, async (req, res) => {
    try {
      const batchId = req.params.batchId;
      const { notes } = req.body;
      
      const allReports = await storage.getReports();
      // Find only the batch report (type='batch') to update notes
      const batchReport = allReports.find(report => report.batchId === batchId && report.type === 'batch');
      
      if (!batchReport) {
        return res.status(404).json({ message: "Batch report not found" });
      }
      
      // Update notes only for the batch report
      await storage.updateReport(batchReport.id, { notes });
      
      // Log activity
      await storage.createActivityLog({
        userId: req.user!.id,
        action: "BATCH_NOTES_UPDATED",
        details: `Updated notes for batch ${batchId}`
      });
      
      res.json({ success: true, batchId });
    } catch (error) {
      res.status(500).json({ message: "Failed to update batch notes" });
    }
  });
  
  // Delete an entire batch of reports
  app.delete("/api/reports/batch/:batchId", requireAuth, async (req, res) => {
    try {
      const batchId = req.params.batchId;
      // Don't filter by portfolio here - get all reports for this batchId
      const allReports = await storage.getReports();
      
      // Find all reports in this batch
      const batchReports = allReports.filter(report => report.batchId === batchId);
      
      if (batchReports.length === 0) {
        return res.status(404).json({ message: "Batch not found" });
      }
      
      // Find the batch name from the 'batch' type report
      const batchName = batchReports.find(report => report.type === 'batch')?.name || 'Unnamed batch';
      
      console.log(`Deleting batch ${batchId} with ${batchReports.length} reports`);
      
      // Delete all reports in this batch
      for (const report of batchReports) {
        console.log(`Deleting report ID ${report.id} from batch ${batchId}`);
        const deleteResult = await storage.deleteReport(report.id);
        if (!deleteResult) {
          console.warn(`Failed to delete report ID ${report.id}`);
        }
      }
      
      // Log activity
      await storage.createActivityLog({
        userId: req.user!.id,
        action: "BATCH_REPORTS_DELETED",
        details: `Deleted batch report "${batchName}" with ${batchReports.length} reports`
      });
      
      res.json({ 
        success: true,
        count: batchReports.length,
        batchName
      });
    } catch (error) {
      console.error("Failed to delete batch reports:", error);
      res.status(500).json({ message: "Failed to delete batch reports" });
    }
  });
  
  app.get("/api/reports/batch/:batchId/download", requireAuth, async (req, res) => {
    try {
      const batchId = req.params.batchId;
      const allReports = await storage.getReports();

      const batchReports = allReports.filter(report => report.batchId === batchId && report.type !== 'batch'); // Exclude the 'batch' type meta-report

      if (batchReports.length === 0) {
        return res.status(404).json({ message: "No individual owner reports found for this batch to download." });
      }

      // Create a temp directory for the ZIP file inside /tmp
      const timestamp = Date.now();
      const tempDirName = `batch-${batchId}-${timestamp}`;
      const zipDirPath = `/tmp/${tempDirName}`;
      
      if (!fs.existsSync(zipDirPath)) {
        fs.mkdirSync(zipDirPath, { recursive: true });
      }

      const generatedFilePaths: string[] = [];

      for (const report of batchReports) {
        let reportFilePath = report.filePath;
        // Ensure each report has a PDF file, generate if missing or not found
        if (!reportFilePath || !fs.existsSync(reportFilePath)) {
          console.log(`File missing for report ${report.id}, regenerating...`);
          if (!report.ownerId || report.month == null || report.year == null) {
            console.warn(`Skipping report ${report.id} due to missing owner, month, or year.`);
            continue;
          }
          const owner = await storage.getOwner(report.ownerId);
          if (!owner) {
            console.warn(`Skipping report ${report.id} as owner ${report.ownerId} not found.`);
            continue;
          }

          const allOwnerExpenses = await storage.getExpensesByOwner(report.ownerId);
          const monthStart = new Date(report.year, report.month - 1, 1);
          const monthEnd = new Date(report.year, report.month, 0, 23, 59, 59, 999);
          const expensesForReport = allOwnerExpenses.filter(expense => {
            if (!expense.date) return false;
            const expenseDate = new Date(expense.date);
            return expenseDate >= monthStart && expenseDate <= monthEnd;
          });

          const listings = await storage.getListingsByOwner(report.ownerId);
          const inventoryIds = expensesForReport
            .filter(e => e.inventoryId !== null && e.inventoryId !== undefined)
            .map(e => e.inventoryId!);
          const uniqueInventoryIds = [...new Set(inventoryIds)];
          const inventoryItemsData = await Promise.all(
            uniqueInventoryIds.map(id => storage.getInventoryItem(id))
          );
          const inventoryItemsMap: Record<number, typeof inventory.$inferSelect> = {};
          inventoryItemsData.forEach(item => {
            if (item) inventoryItemsMap[item.id] = item;
          });

          try {
            // Ensure generateMonthlyExpenseReport saves to /tmp or returns a path within /tmp
            const newFilePath = await generateMonthlyExpenseReport({
              owner, listings, expenses: expensesForReport, inventoryItems: inventoryItemsMap,
              month: report.month, year: report.year,
              // Suggestion: Pass a target directory to generateMonthlyExpenseReport if possible
              // targetDir: zipDirPath 
            });
            await storage.updateReport(report.id, { filePath: newFilePath });
            reportFilePath = newFilePath;
            console.log(`Regenerated report ${report.id} at ${newFilePath}`);
          } catch (generationError) {
            console.error(`Failed to regenerate report ${report.id}:`, generationError);
            continue; // Skip this report
          }
        }

        if (reportFilePath && fs.existsSync(reportFilePath)) {
          const owner = await storage.getOwner(report.ownerId!);
          const ownerName = owner ? owner.name.replace(/[^a-z0-9]/gi, '_').toLowerCase() : 'unknown_owner';
          const reportMonth = report.month || 'M';
          const reportYear = report.year || 'Y';
          // Sanitize filename further
          const safeFileName = `${ownerName}_${reportMonth}_${reportYear}_report_${report.id}.pdf`.replace(/__+/g, '_');
          const destFile = `${zipDirPath}/${safeFileName}`;
          
          try {
            fs.copyFileSync(reportFilePath, destFile);
            generatedFilePaths.push(destFile);
          } catch (copyError) {
            console.error(`Failed to copy report ${reportFilePath} to ${destFile}:`, copyError);
          }
        } else {
          console.warn(`File path ${reportFilePath} for report ${report.id} is invalid or file does not exist after generation attempt.`);
        }
      }
      
      if (generatedFilePaths.length === 0) {
        // Clean up empty temp dir
        if (fs.existsSync(zipDirPath)) {
            fs.rmdirSync(zipDirPath, { recursive: true });
        }
        return res.status(404).json({ message: "No valid report files found to include in the batch ZIP." });
      }

      const outputZipFileName = `batch_reports_${batchId}_${timestamp}.zip`;
      const zipFilePath = `/tmp/${outputZipFileName}`; // ZIP will be temporarily stored here

      // Use archiver to create the zip file
      const output = fs.createWriteStream(zipFilePath);
      const archive = archiver('zip', {
        zlib: { level: 9 } // Sets the compression level.
      });

      // Listen for all archive data to be written
      // 'close' event is fired only when a file descriptor is involved
      output.on('close', function() {
        console.log(`[Batch Download ${batchId}] Archiver finalized. Total bytes: ${archive.pointer()}`);
        console.log(`[Batch Download ${batchId}] ZIP file created at ${zipFilePath}. Attempting to send.`);
        
        res.download(zipFilePath, outputZipFileName, (err) => {
          // Clean up temp files after download attempt
          try {
            if (fs.existsSync(zipFilePath)) {
              fs.unlinkSync(zipFilePath);
            }
            // No need to manually delete individual PDFs from zipDirPath if they were just for zipping
            // and zipDirPath itself will be cleaned if needed, but archiver streams directly
            // The generatedFilePaths were individual PDFs copied to zipDirPath for the 'exec' method, which is no longer used.
            // We are now adding files to archiver directly from their original (or regenerated) path.
            // The zipDirPath for individual PDF copies is not strictly needed with archiver if files are read from original paths.
            // However, our current logic *does* copy them to zipDirPath first, so we should clean that.
            if (fs.existsSync(zipDirPath)) {
              fs.readdirSync(zipDirPath).forEach(file => {
                  fs.unlinkSync(path.join(zipDirPath, file));
              });
              fs.rmdirSync(zipDirPath);
              console.log(`[Batch Download ${batchId}] Cleaned up temporary directory: ${zipDirPath}`);
            }
          } catch (cleanupError: any) {
              console.error(`[Batch Download ${batchId}] Error cleaning up batch download temp files:`, cleanupError.message);
          }
          
          if (err) {
            console.error(`[Batch Download ${batchId}] Error sending ZIP file to client:`, err);
            if (!res.headersSent) {
              res.status(500).json({ message: "Error occurred during file download.", errorDetails: err.message });
            }
          } else {
              console.log(`[Batch Download ${batchId}] Successfully sent ${outputZipFileName}`);
          }
        });
      });

      archive.on('warning', function(err: any) {
        if (err.code === 'ENOENT') {
          console.warn(`[Batch Download ${batchId}] Archiver warning (ENOENT):`, err);
        } else {
          console.error(`[Batch Download ${batchId}] Archiver warning:`, err);
          // Consider rejecting the promise or handling critical warnings
        }
      });

      archive.on('error', function(err: any) {
        console.error(`[Batch Download ${batchId}] Archiver critical error:`, err);
        // Clean up incomplete zip file and temp dir
        try {
            if (fs.existsSync(zipFilePath)) fs.unlinkSync(zipFilePath);
            if (fs.existsSync(zipDirPath)) {
                fs.readdirSync(zipDirPath).forEach(file => fs.unlinkSync(path.join(zipDirPath, file)));
                fs.rmdirSync(zipDirPath);
            }
        } catch (cleanupErr: any) { console.error("[Batch Download] Error during error cleanup:", cleanupErr.message); }

        if (!res.headersSent) {
            res.status(500).json({ message: "Failed to create ZIP archive due to archiver error.", errorDetails: err.message });
        }
      });

      // Pipe archive data to the file
      archive.pipe(output);

      // Add files to the archive
      // generatedFilePaths contains absolute paths to PDFs in zipDirPath
      for (const pdfPath of generatedFilePaths) {
        if (fs.existsSync(pdfPath)) {
          archive.file(pdfPath, { name: path.basename(pdfPath) });
          console.log(`[Batch Download ${batchId}] Added to archive: ${path.basename(pdfPath)} from ${pdfPath}`);
        } else {
          console.warn(`[Batch Download ${batchId}] File not found, skipping for archive: ${pdfPath}`);
        }
      }

      // Finalize the archive (async)
      // 'close' event on 'output' stream will be triggered when done.
      await archive.finalize();
      console.log(`[Batch Download ${batchId}] Archiver finalize() called. Waiting for 'close' event on writestream.`);

      // **Important**: res.download will be called in output.on('close') handler
      // Do not send response here as finalization and streaming are async.

    } catch (error: any) {
      console.error("Error creating batch download:", error);
      res.status(500).json({ message: "Failed to download batch reports" });
    }
  });
  
  app.post("/api/reports/batch/:batchId/email", requireAuth, async (req, res) => {
    try {
      const batchId = req.params.batchId;
      const allReports = await storage.getReports();
      
      // Filter reports by batchId
      const batchReports = allReports.filter(report => report.batchId === batchId);
      
      if (batchReports.length === 0) {
        return res.status(404).json({ message: "No reports found for this batch" });
      }
      
      // Create email result tracking
      const results = {
        success: 0,
        failed: 0,
        details: [] as { ownerId: number, success: boolean, message?: string }[]
      };
      
      // Send email for each report in the batch
      for (const report of batchReports) {
        try {
          if (!report.ownerId) {
            results.failed++;
            results.details.push({
              ownerId: -1,
              success: false,
              message: "Report has no owner"
            });
            continue;
          }
          
          // Get the owner
          const owner = await storage.getOwner(report.ownerId);
          
          if (!owner) {
            results.failed++;
            results.details.push({
              ownerId: report.ownerId,
              success: false,
              message: "Owner not found"
            });
            continue;
          }
          
          // Ensure the report has a PDF file
          if (!report.filePath || !fs.existsSync(report.filePath)) {
            // Get expenses for this period
            const allExpenses = await storage.getExpensesByOwner(owner.id);
            const monthStart = new Date(report.year!, report.month! - 1, 1);
            const monthEnd = new Date(report.year!, report.month!, 0);
            
            const expenses = allExpenses.filter(expense => {
              if (!expense.date) return false;
              const expenseDate = new Date(expense.date);
              return expenseDate >= monthStart && expenseDate <= monthEnd;
            });
            
            if (expenses.length === 0) {
              results.failed++;
              results.details.push({
                ownerId: owner.id,
                success: false,
                message: "No expenses found for this period"
              });
              continue;
            }
            
            // Get the listings for this owner
            const listings = await storage.getListingsByOwner(owner.id);
            
            // Get all inventory items used in expenses
            const inventoryIds = expenses
              .filter(e => e.inventoryId !== null)
              .map(e => e.inventoryId!);
            
            const inventoryItems: Record<number, any> = {};
            for (const id of inventoryIds) {
              const item = await storage.getInventoryItem(id);
              if (item) {
                inventoryItems[id] = item;
              }
            }
            
            // Generate the PDF report
            const filePath = await generateMonthlyExpenseReport({
              owner,
              listings,
              expenses,
              inventoryItems,
              month: report.month!,
              year: report.year!
            });
            
            // Update the report with the file path
            await storage.updateReport(report.id, { filePath });
            report.filePath = filePath;
          }
          
          // Send the email
          const emailSent = await sendMonthlyReportEmail({
            ownerName: owner.name,
            ownerEmail: owner.email,
            reportName: report.name,
            month: report.month!,
            year: report.year!,
            reportPath: report.filePath
          });
          
          if (emailSent) {
            // Mark the report as sent
            await storage.updateReport(report.id, { sent: true });
            
            results.success++;
            results.details.push({
              ownerId: owner.id,
              success: true
            });
            
            // Log activity
            await storage.createActivityLog({
              userId: req.user!.id,
              action: "REPORT_EMAILED",
              details: `Report for ${owner.name} (${report.name}) emailed to ${owner.email}`
            });
          } else {
            results.failed++;
            results.details.push({
              ownerId: owner.id,
              success: false,
              message: "Failed to send email"
            });
          }
        } catch (err) {
          console.error("Error sending individual report:", err);
          results.failed++;
          results.details.push({
            ownerId: report.ownerId || -1,
            success: false,
            message: "Error processing report"
          });
        }
      }
      
      res.json({ results });
    } catch (error) {
      console.error("Error sending batch emails:", error);
      res.status(500).json({ message: "Failed to send batch emails" });
    }
  });
  
  // Add a new route for generating batch reports
  app.post("/api/reports/generate", requireRole(["standard_admin", "administrator"]), requirePortfolioAccess(), async (req, res) => {
    try {
      const { month, year, ownerIds, batchTitle } = req.body;
      const user = req.user as any;
      
      if (!month || !year || !ownerIds || !Array.isArray(ownerIds)) {
        return res.status(400).json({ message: "Month, year, and owner IDs are required" });
      }
      
      if (!batchTitle || batchTitle.trim() === '') {
        return res.status(400).json({ message: "Batch title is required" });
      }
      
      // Create a unique batch ID
      const batchId = `batch_${month}_${year}_${Date.now()}`;
      
      // Use provided batch title
      const title = batchTitle.trim();
      
      console.log(`Generating reports batch "${title}" for ${ownerIds.length} owners, portfolioId: ${user.portfolioId}`);
      
      // Check for existing reports for this month/year with the same title
      const existingReports = await storage.getReports(user.portfolioId);
      const existingBatchReports = existingReports.filter(r => 
        r.type === 'batch' && 
        r.month === month && 
        r.year === year && 
        r.name === title
      );
      
      if (existingBatchReports.length > 0) {
        console.log(`Found existing batch with title "${title}" for ${month}/${year}, deleting first`);
        // Delete existing batch with same title before creating a new one
        for (const report of existingReports.filter(r => 
          r.batchId === existingBatchReports[0].batchId)) {
          await storage.deleteReport(report.id);
        }
      }
      
      // Store the batch title in the notes for the first report
      await storage.createReport({
        name: title,
        type: 'batch',
        month,
        year,
        batchId,
        notes: '', // Start with empty notes
        generatedAt: new Date(),
        portfolioId: user.portfolioId // Add the user's portfolio ID
      });
      const generatedReports = [];
      
      // Generate a report for each owner
      for (const ownerId of ownerIds) {
        try {
          const owner = await storage.getOwner(ownerId);
          
          if (!owner) {
            console.warn(`Owner not found for ID: ${ownerId}`);
            continue;
          }
          
          // Check if a report already exists for this month/year/owner that's NOT part of our new batch
          const existingOwnerReports = await storage.getReportsByOwner(ownerId);
          const existingReport = existingOwnerReports.find(r => 
            r.month === month && 
            r.year === year && 
            r.type === 'monthly' &&
            r.batchId !== batchId // not part of our new batch
          );
          
          if (existingReport) {
            console.log(`Found existing report for owner ${ownerId} for ${month}/${year}, updating to be part of batch ${batchId}`);
            // Update existing report to be part of this batch
            const updatedReport = await storage.updateReport(existingReport.id, { 
              batchId,
              generatedAt: new Date(),
              portfolioId: user.portfolioId
            });
            
            if (updatedReport) {
              generatedReports.push(updatedReport);
            }
          } else {
            // Create a new report
            const monthName = new Date(year, month - 1, 1).toLocaleString('default', { month: 'long' });
            console.log(`Creating new report for owner ${ownerId} for ${month}/${year}`);
            const report = await storage.createReport({
              name: `${owner.name} - ${monthName} ${year} Expense Report`,
              type: 'monthly',
              ownerId,
              month,
              year,
              batchId,
              generatedAt: new Date(),
              portfolioId: user.portfolioId // Add the user's portfolio ID
            });
            
            generatedReports.push(report);
          }
        } catch (err) {
          console.error(`Error generating report for owner ${ownerId}:`, err);
        }
      }
      
      console.log(`Successfully generated ${generatedReports.length} reports for ${month}/${year}`);
      
      // Log activity
      await storage.createActivityLog({
        userId: req.user!.id,
        action: "REPORTS_GENERATED",
        details: `Generated ${generatedReports.length} reports for ${month}/${year}`
      });
      
      res.status(201).json({ 
        batchId,
        reports: generatedReports
      });
    } catch (error) {
      console.error("Error generating reports:", error);
      res.status(500).json({ message: "Failed to generate reports" });
    }
  });

  app.post("/api/reports/generate/monthly", requireRole(["standard_admin", "administrator"]), requirePortfolioAccess(), async (req, res) => {
    try {
      const { ownerIds, month, year, sendEmail } = req.body;
      const user = req.user as any;
      
      if (!ownerIds || !Array.isArray(ownerIds) || ownerIds.length === 0 || !month || !year) {
        return res.status(400).json({ message: "Owner IDs, month, and year are required" });
      }
      
      const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ];
      
      // Create a batch report name
      const batchName = `${monthNames[month - 1]} ${year} - ${ownerIds.length} owners`;
      
      // Store generated reports
      const generatedReports = [];
      
      // Process each owner
      for (const ownerId of ownerIds) {
        const numericOwnerId = parseInt(ownerId);
        const owner = await storage.getOwner(numericOwnerId);
        if (!owner) {
          console.warn(`Owner with ID ${ownerId} not found, skipping`);
          continue;
        }
        
        const listings = await storage.getListingsByOwner(numericOwnerId);
        if (listings.length === 0) {
          console.warn(`No listings found for owner ${owner.name}, skipping`);
          continue;
        }
        
        // Get all expenses for this owner
        const allExpenses = await storage.getExpensesByOwner(numericOwnerId);
        
        // Filter expenses by month and year
        const targetDate = new Date(year, month - 1);
        const nextMonth = new Date(year, month);
        
        const expenses = allExpenses.filter(expense => {
          if (!expense.date) return false;
          const expenseDate = new Date(expense.date);
          return expenseDate >= targetDate && expenseDate < nextMonth;
        });
        
        // Get inventory items for the expenses
        const inventoryIds = expenses
          .filter(e => e.inventoryId !== null && e.inventoryId !== undefined)
          .map(e => e.inventoryId!);
        
        const inventoryMap: Record<number, typeof inventory.$inferSelect> = {};
        for (const id of inventoryIds) {
          const item = await storage.getInventoryItem(id);
          if (item) {
            inventoryMap[id] = item;
          }
        }
        
        // Generate individual report name
        const reportName = `${owner.name} - ${monthNames[month - 1]} ${year} Expense Report`;
        
        // Generate PDF report for this owner
        const pdfPath = await generateMonthlyExpenseReport({
          owner,
          listings,
          expenses,
          inventoryItems: inventoryMap,
          month,
          year
        });
        
        // Create individual report record
        const report = await storage.createReport({
          name: reportName,
          type: "monthly",
          ownerId: numericOwnerId,
          month,
          year,
          filePath: pdfPath,
          sent: false,
          portfolioId: user.portfolioId // Add the user's portfolio ID
        });
        
        // Add to generated reports
        generatedReports.push(report);
        
        // Send email if requested
        if (sendEmail) {
          const emailSent = await sendMonthlyReportEmail(
            owner.email,
            owner.name,
            monthNames[month - 1],
            year.toString(),
            pdfPath
          );
          
          if (emailSent) {
            await storage.updateReport(report.id, { sent: true });
            
            // Log activity
            await storage.createActivityLog({
              userId: req.user!.id,
              action: "REPORT_SENT",
              details: `Monthly report for ${monthNames[month - 1]} ${year} sent to ${owner.name}`
            });
          }
        }
        
        // Log activity for each owner
        await storage.createActivityLog({
          userId: req.user!.id,
          action: "REPORT_GENERATED",
          details: `Monthly report for ${monthNames[month - 1]} ${year} generated for ${owner.name}`
        });
      }
      
      // Create a batch log
      await storage.createActivityLog({
        userId: req.user!.id,
        action: "BATCH_REPORTS_GENERATED",
        details: `Generated ${generatedReports.length} reports for ${monthNames[month - 1]} ${year}`
      });
      
      // Return success with all generated reports
      res.json({
        success: true,
        batchName,
        reports: generatedReports,
        count: generatedReports.length
      });
    } catch (error) {
      console.error("Failed to generate reports:", error);
      res.status(500).json({ message: "Failed to generate reports" });
    }
  });

  // Stats and Analytics
  app.get("/api/stats/dashboard", requireRole(["standard_admin", "administrator"]), requirePortfolioAccess(), async (req, res) => {
    try {
      const user = req.user as any;
      // Only filter by portfolio for standard_admin, administrators see all data
      const portfolioId = user.role === 'administrator' ? undefined : user.portfolioId;
      
      // Get data filtered by portfolio
      const owners = await storage.getOwners(portfolioId);
      const listings = await storage.getListings(portfolioId);
      const inventory = await storage.getInventory(portfolioId);
      // Filter out deleted inventory items for the main count
      const activeInventory = inventory.filter(item => !item.deleted);
      const expenses = await storage.getExpenses(portfolioId);
      const lowInventory = await storage.getLowInventoryItems(portfolioId);
      const activities = await storage.getActivityLogs(req.user!.id);
      
      // Calculate monthly profit from markup
      const totalCost = expenses.reduce((sum, exp) => sum + Number(exp.totalCost), 0);
      const totalBilled = expenses.reduce((sum, exp) => sum + Number(exp.billedAmount), 0);
      const monthlyProfit = totalBilled - totalCost;
      
      // Monthly expense data for chart
      const last6Months = Array.from({ length: 6 }, (_, i) => {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        return date;
      }).reverse();
      
      const expenseChartData = last6Months.map(date => {
        const month = date.getMonth();
        const year = date.getFullYear();
        
        const startDate = new Date(year, month, 1);
        const endDate = new Date(year, month + 1, 0);
        
        const monthlyExpenses = expenses.filter(exp => {
          if (!exp.date) return false;
          const expDate = new Date(exp.date);
          return expDate >= startDate && expDate <= endDate;
        });
        
        const monthCost = monthlyExpenses.reduce((sum, exp) => sum + Number(exp.totalCost), 0);
        const monthProfit = monthlyExpenses.reduce((sum, exp) => sum + Number(exp.billedAmount), 0) - monthCost;
        
        return {
          month: date.toLocaleString('default', { month: 'short' }),
          expenses: monthCost,
          profit: monthProfit
        };
      });
      
      res.json({
        totalOwners: owners.length,
        totalListings: listings.length,
        totalInventoryItems: activeInventory.length,
        lowInventoryCount: lowInventory.length,
        lowInventoryItems: lowInventory,
        monthlyProfit,
        recentActivity: activities.slice(0, 10),
        recentListings: listings.slice(-3),
        expenseChartData
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });
  
  // Analytics endpoints
  app.get("/api/stats/analytics", requireRole(["standard_admin", "administrator"]), requirePortfolioAccess(), async (req, res) => {
    try {
      const user = req.user as any;
      // Only filter by portfolio for standard_admin, administrators see all data
      const portfolioId = user.role === 'administrator' ? undefined : user.portfolioId;
      
      // Get data filtered by portfolio
      const owners = await storage.getOwners(portfolioId);
      const listings = await storage.getListings(portfolioId);
      const inventory = await storage.getInventory(portfolioId);
      const expenses = await storage.getExpenses(portfolioId);
      const activities = await storage.getActivityLogs(req.user!.id);
      
      // Calculate monthly profit from markup for summary
      const totalCostSum = expenses.reduce((sum, exp) => sum + Number(exp.totalCost), 0);
      const totalBilledSum = expenses.reduce((sum, exp) => sum + Number(exp.billedAmount), 0);
      
      // === Calculate expenses by property ===
      const expensesByProperty = listings.map(listing => {
        const listingExpenses = expenses.filter(e => e.listingId === listing.id);
        const totalExpenses = listingExpenses.reduce((sum, e) => sum + Number(e.totalCost), 0);
        const totalMarkup = listingExpenses.reduce((sum, e) => 
          sum + (Number(e.billedAmount) - Number(e.totalCost)), 0);
        
        return {
          id: listing.id,
          name: listing.name,
          expenses: parseFloat(totalExpenses.toFixed(2)),
          markup: parseFloat(totalMarkup.toFixed(2)),
          address: listing.address,
          propertyType: listing.propertyType,
          totalExpenseCount: listingExpenses.length
        };
      }).sort((a, b) => b.expenses - a.expenses);
      
      // === Calculate expenses by owner ===
      const expensesByOwner = owners.map(owner => {
        const ownerListings = listings.filter(l => l.ownerId === owner.id);
        const ownerListingIds = ownerListings.map(l => l.id);
        const ownerExpenses = expenses.filter(e => ownerListingIds.includes(e.listingId));
        
        const totalExpenses = ownerExpenses.reduce((sum, e) => sum + Number(e.totalCost), 0);
        const totalMarkup = ownerExpenses.reduce((sum, e) => 
          sum + (Number(e.billedAmount) - Number(e.totalCost)), 0);
        
        return {
          id: owner.id,
          name: owner.name,
          email: owner.email,
          expenses: parseFloat(totalExpenses.toFixed(2)),
          markup: parseFloat(totalMarkup.toFixed(2)),
          propertyCount: ownerListings.length,
          expenseCount: ownerExpenses.length
        };
      }).sort((a, b) => b.expenses - a.expenses);
      
      // === Calculate expenses by category ===
      // Use notes to infer categories
      const categoryGroups: Record<string, number> = {
        "Kitchen": 0,
        "Bathroom": 0,
        "Bedroom": 0,
        "Cleaning Services": 0,
        "Yard/Landscaping": 0,
        "Plumbing Services": 0,
        "Electrical Services": 0,
        "Maintenance": 0,
        "Utilities": 0,
        "Locksmith Services": 0,
        "Pest Control": 0,
        "Spa/Hot Tub": 0,
        "Other Services": 0,
        "Other": 0
      };
      
      expenses.forEach(expense => {
        if (expense.notes) {
          const note = expense.notes.toLowerCase();
          
          // Service type expenses (from the prefixed service notes)
          if (note.startsWith("service:")) {
            if (note.includes("cleaning")) {
              categoryGroups["Cleaning Services"] += Number(expense.totalCost);
            } else if (note.includes("yardwork") || note.includes("landscaping")) {
              categoryGroups["Yard/Landscaping"] += Number(expense.totalCost);
            } else if (note.includes("plumbing")) {
              categoryGroups["Plumbing Services"] += Number(expense.totalCost);
            } else if (note.includes("electrical")) {
              categoryGroups["Electrical Services"] += Number(expense.totalCost);
            } else if (note.includes("locksmith")) {
              categoryGroups["Locksmith Services"] += Number(expense.totalCost);
            } else if (note.includes("pest")) {
              categoryGroups["Pest Control"] += Number(expense.totalCost);
            } else if (note.includes("spa") || note.includes("hot tub")) {
              categoryGroups["Spa/Hot Tub"] += Number(expense.totalCost);
            } else {
              categoryGroups["Other Services"] += Number(expense.totalCost);
            }
          }
          // Regular inventory or custom expenses
          else if (note.includes("kitchen") || note.includes("coffee") || note.includes("dish")) {
            categoryGroups["Kitchen"] += Number(expense.totalCost);
          } else if (note.includes("bath") || note.includes("toilet") || note.includes("shower")) {
            categoryGroups["Bathroom"] += Number(expense.totalCost);
          } else if (note.includes("bed") || note.includes("sheet") || note.includes("pillow")) {
            categoryGroups["Bedroom"] += Number(expense.totalCost);
          } else if (note.includes("clean") || note.includes("detergent") || note.includes("soap")) {
            categoryGroups["Cleaning Services"] += Number(expense.totalCost);
          } else if (note.includes("repair") || note.includes("fix") || note.includes("maintenance")) {
            categoryGroups["Maintenance"] += Number(expense.totalCost);
          } else if (note.includes("water") || note.includes("electric") || note.includes("utility")) {
            categoryGroups["Utilities"] += Number(expense.totalCost);
          } else {
            categoryGroups["Other"] += Number(expense.totalCost);
          }
        } else {
          categoryGroups["Other"] += Number(expense.totalCost);
        }
      });
      
      const expensesByCategory = Object.entries(categoryGroups)
        .filter(([_, value]) => value > 0)
        .map(([name, value]) => ({
          name,
          value: parseFloat(value.toFixed(2)),
        }))
        .sort((a, b) => b.value - a.value);
      
      // === Calculate expenses by property type ===
      const propertyTypeGroups: Record<string, number> = {};
      listings.forEach(listing => {
        const listingExpenses = expenses.filter(e => e.listingId === listing.id);
        const totalExpenses = listingExpenses.reduce((sum, e) => sum + Number(e.totalCost), 0);
        
        const propertyType = listing.propertyType || 'other';
        if (!propertyTypeGroups[propertyType]) {
          propertyTypeGroups[propertyType] = 0;
        }
        
        propertyTypeGroups[propertyType] += totalExpenses;
      });
      
      const expensesByPlatform = Object.entries(propertyTypeGroups)
        .map(([name, value]) => ({
          name: name.charAt(0).toUpperCase() + name.slice(1),
          value: parseFloat((value as number).toFixed(2)),
        }))
        .sort((a, b) => b.value - a.value);
      
      // === Calculate monthly expense trends ===
      const last6Months = Array.from({ length: 6 }, (_, i) => {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        return date;
      }).reverse();
      
      const expensesTrend = last6Months.map((date: Date) => {
        const month = date.getMonth();
        const year = date.getFullYear();
        
        const startDate = new Date(year, month, 1);
        const endDate = new Date(year, month + 1, 0);
        
        const monthlyExpenses = expenses.filter(exp => {
          if (!exp.date) return false;
          const expDate = new Date(exp.date);
          return expDate >= startDate && expDate <= endDate;
        });
        
        const monthCost = monthlyExpenses.reduce((sum, exp) => sum + Number(exp.totalCost), 0);
        const monthMarkup = monthlyExpenses.reduce((sum, exp) => 
          sum + (Number(exp.billedAmount) - Number(exp.totalCost)), 0);
        
        return {
          month: date.toLocaleString('default', { month: 'short' }),
          year: year,
          expenses: parseFloat(monthCost.toFixed(2)),
          markup: parseFloat(monthMarkup.toFixed(2)),
          count: monthlyExpenses.length
        };
      });
      
      // === Top inventory usage ===
      const inventoryUsage = new Map<number, { 
        id: number, 
        name: string,
        category: string, 
        usage: number, 
        cost: number, 
        remaining: number 
      }>();
      
      // Get actual inventory items first
      inventory.forEach(item => {
        if (!item.deleted) {
          inventoryUsage.set(item.id, {
            id: item.id,
            name: item.name,
            category: item.category,
            usage: 0,
            cost: 0,
            remaining: item.quantity
          });
        }
      });
      
      // Now track usage from expenses
      expenses.forEach(expense => {
        if (expense.inventoryId && expense.quantityUsed) {
          const item = inventoryUsage.get(expense.inventoryId);
          if (item) {
            item.usage += Number(expense.quantityUsed);
            item.cost += Number(expense.totalCost);
          }
        }
      });
      
      const topInventoryItems = Array.from(inventoryUsage.values())
        .sort((a, b) => b.usage - a.usage)
        .slice(0, 10)
        .map(item => ({
          id: item.id,
          name: item.name,
          category: item.category,
          usage: item.usage,
          cost: parseFloat(item.cost.toFixed(2)),
          remaining: item.remaining
        }));
        
      // Calculate inventory usage by category
      const categoryUsage: Record<string, { category: string, usage: number, cost: number }> = {};
      
      Array.from(inventoryUsage.values()).forEach(item => {
        if (!categoryUsage[item.category]) {
          categoryUsage[item.category] = {
            category: item.category,
            usage: 0,
            cost: 0
          };
        }
        
        categoryUsage[item.category].usage += item.usage;
        categoryUsage[item.category].cost += item.cost;
      });
      
      const inventoryByCategory = Object.values(categoryUsage)
        .sort((a, b) => b.usage - a.usage)
        .map(item => ({
          name: item.category,
          usage: item.usage,
          cost: parseFloat(item.cost.toFixed(2))
        }));
      
      // === Recent activities with context ===
      const enrichedActivities = await Promise.all(activities.slice(0, 20).map(async (activity) => {
        let context: any = {};
        
        if (activity.action.includes('LISTING') && activity.details) {
          const matches = activity.details.match(/\d+/);
          const listingId = matches ? parseInt(matches[0]) : 0;
          if (listingId) {
            const listing = await storage.getListing(listingId);
            if (listing) context.listing = listing;
          }
        } else if (activity.action.includes('OWNER') && activity.details) {
          const matches = activity.details.match(/\d+/);
          const ownerId = matches ? parseInt(matches[0]) : 0;
          if (ownerId) {
            const owner = await storage.getOwner(ownerId);
            if (owner) context.owner = owner;
          }
        } else if (activity.action.includes('EXPENSE') && activity.details) {
          const matches = activity.details.match(/\d+/);
          const expenseId = matches ? parseInt(matches[0]) : 0;
          if (expenseId) {
            const expense = await storage.getExpense(expenseId);
            if (expense) context.expense = expense;
          }
        }
        
        return {
          ...activity,
          context
        };
      }));
      
      // Calculate inventory value
      const inventoryValue = inventory
        .filter(item => !item.deleted)
        .reduce((sum, item) => sum + (Number(item.costPrice) * item.quantity), 0);
      
      res.json({
        expensesByProperty,
        expensesByOwner,
        expensesByCategory,
        expensesByPlatform,
        expensesTrend,
        topInventoryItems,
        inventoryByCategory,
        activities: enrichedActivities,
        summary: {
          totalExpenses: parseFloat(totalCostSum.toFixed(2)),
          totalMarkup: parseFloat((totalBilledSum - totalCostSum).toFixed(2)),
          totalInventoryItems: inventory.filter(item => !item.deleted).length,
          inventoryValue: parseFloat(inventoryValue.toFixed(2)),
          expenseCount: expenses.length,
          propertyCount: listings.length,
          ownerCount: owners.length
        }
      });
    } catch (error) {
      console.error("Analytics error:", error);
      res.status(500).json({ message: "Failed to fetch analytics data" });
    }
  });

  // Shopping Lists Routes
  app.get("/api/shopping-lists", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const lists = await storage.getShoppingLists(userId);
      
      // Filter out default lists as they will be fetched separately
      const filteredLists = lists.filter(list => !list.isDefault);
      
      res.json(filteredLists);
    } catch (error) {
      console.error("Error fetching shopping lists:", error);
      res.status(500).json({ message: "Failed to fetch shopping lists" });
    }
  });

  app.get("/api/shopping-lists/default", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      
      // Get or create the default low stock list
      const list = await storage.getDefaultLowStockList(userId);
      
      // Get all inventory items that are low in stock
      const lowStockItems = await storage.getLowInventoryItems();
      
      // Clear existing items from default list
      const existingItems = await storage.getShoppingListItems(list.id);
      
      // Only add items that aren't already in the list
      const existingItemIds = new Set(existingItems.map(item => 
        item.inventoryItem ? item.inventoryItem.id : null
      ));
      
      // Add each low stock item to the shopping list if not already in the list
      for (const item of lowStockItems) {
        if (!existingItemIds.has(item.id)) {
          // Calculate how many to add to reach minimum quantity
          const quantityToAdd = (item.minQuantity || 10) - item.quantity;
          
          // Add the item to the shopping list
          await storage.addItemToShoppingList({
            shoppingListId: list.id,
            inventoryId: item.id,
            quantity: quantityToAdd > 0 ? quantityToAdd : 1,
            completed: false
          });
        }
      }
      
      res.json(list);
    } catch (error) {
      console.error("Error in default shopping list:", error);
      res.status(500).json({ message: "Failed to fetch default shopping list" });
    }
  });

  app.get("/api/shopping-lists/:id", requireAuth, async (req, res) => {
    try {
      const listId = parseInt(req.params.id);
      const list = await storage.getShoppingList(listId);
      
      if (!list) {
        return res.status(404).json({ message: "Shopping list not found" });
      }
      
      res.json(list);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch shopping list" });
    }
  });

  app.post("/api/shopping-lists", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      
      console.log("Creating shopping list with data:", req.body);
      
      // Check if name is provided
      if (!req.body.name || typeof req.body.name !== 'string' || req.body.name.trim() === '') {
        return res.status(400).json({ message: "Shopping list name is required" });
      }
      
      const validatedData = {
        name: req.body.name.trim(),
        userId,
        isDefault: false // Only create custom lists here, not default lists
      };
      
      console.log("Validated shopping list data:", validatedData);
      
      const list = await storage.createShoppingList(validatedData);
      
      // Log activity
      await storage.createActivityLog({
        userId,
        action: "SHOPPING_LIST_CREATED",
        details: `Created shopping list "${list.name}"`
      });
      
      res.status(201).json(list);
    } catch (error) {
      console.error("Error creating shopping list:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid shopping list data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create shopping list", error: String(error) });
    }
  });

  app.put("/api/shopping-lists/:id", requireAuth, async (req, res) => {
    try {
      const listId = parseInt(req.params.id);
      const userId = req.user!.id;
      
      // Get the original list first
      const originalList = await storage.getShoppingList(listId);
      if (!originalList) {
        return res.status(404).json({ message: "Shopping list not found" });
      }
      
      // Only the list owner can update it
      if (originalList.userId !== userId) {
        return res.status(403).json({ message: "You don't have permission to update this list" });
      }
      
      // Don't allow changing isDefault on existing lists
      const validatedData = insertShoppingListSchema.partial().parse(req.body);
      const updatedData = { ...validatedData };
      delete updatedData.isDefault; // Remove isDefault to prevent changes
      
      const list = await storage.updateShoppingList(listId, updatedData);
      
      // Log activity
      await storage.createActivityLog({
        userId,
        action: "SHOPPING_LIST_UPDATED",
        details: `Updated shopping list "${list!.name}"`
      });
      
      res.json(list);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid shopping list data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update shopping list" });
    }
  });

  app.delete("/api/shopping-lists/:id", requireAuth, async (req, res) => {
    try {
      const listId = parseInt(req.params.id);
      const userId = req.user!.id;
      
      // Get the original list first
      const list = await storage.getShoppingList(listId);
      if (!list) {
        return res.status(404).json({ message: "Shopping list not found" });
      }
      
      // Only the list owner can delete it
      if (list.userId !== userId) {
        return res.status(403).json({ message: "You don't have permission to delete this list" });
      }
      
      // Don't allow deleting default lists
      if (list.isDefault) {
        return res.status(400).json({ message: "Cannot delete the default shopping list" });
      }
      
      const success = await storage.deleteShoppingList(listId);
      
      if (success) {
        // Log activity
        await storage.createActivityLog({
          userId,
          action: "SHOPPING_LIST_DELETED",
          details: `Deleted shopping list "${list.name}"`
        });
        
        return res.status(204).send();
      } else {
        return res.status(500).json({ message: "Failed to delete shopping list" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to delete shopping list" });
    }
  });

  // Shopping List Items Routes
  app.get("/api/shopping-lists/:id/items", requireAuth, async (req, res) => {
    try {
      const listId = parseInt(req.params.id);
      const userId = req.user!.id;
      
      // Get the list first to verify ownership
      const list = await storage.getShoppingList(listId);
      if (!list) {
        return res.status(404).json({ message: "Shopping list not found" });
      }
      
      // Check ownership (except for default lists which can have auto-generated items)
      if (!list.isDefault && list.userId !== userId) {
        return res.status(403).json({ message: "You don't have permission to view this list's items" });
      }
      
      const items = await storage.getShoppingListItems(listId);
      res.json(items);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch shopping list items" });
    }
  });

  app.post("/api/shopping-lists/:id/items", requireAuth, async (req, res) => {
    try {
      const listId = parseInt(req.params.id);
      const userId = req.user!.id;
      
      console.log("Creating shopping list item with data:", req.body);
      
      // Get the list first to verify ownership
      const list = await storage.getShoppingList(listId);
      if (!list) {
        return res.status(404).json({ message: "Shopping list not found" });
      }
      
      // Check ownership
      if (list.userId !== userId) {
        return res.status(403).json({ message: "You don't have permission to add items to this list" });
      }
      
      // Simpler direct validation
      if (!req.body.inventoryId || isNaN(parseInt(req.body.inventoryId.toString()))) {
        return res.status(400).json({ message: "Valid inventory ID is required" });
      }
      
      const inventoryId = parseInt(req.body.inventoryId.toString());
      const quantity = req.body.quantity ? parseInt(req.body.quantity.toString()) : 1;
      
      // Direct validation
      const validatedData = {
        shoppingListId: listId,
        inventoryId,
        quantity,
        completed: false // New items are never completed
      };
      
      console.log("Validated shopping list item data:", validatedData);
      
      // Check if the inventory item exists
      const inventoryItem = await storage.getInventoryItem(validatedData.inventoryId);
      if (!inventoryItem) {
        return res.status(404).json({ message: "Inventory item not found" });
      }
      
      const item = await storage.addItemToShoppingList(validatedData);
      
      // Return the item with the inventory details
      const itemWithInventory = {
        ...item,
        inventoryItem
      };
      
      // Log activity
      await storage.createActivityLog({
        userId,
        action: "SHOPPING_LIST_ITEM_ADDED",
        details: `Added ${inventoryItem.name} to shopping list "${list.name}"`
      });
      
      res.status(201).json(itemWithInventory);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid shopping list item data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to add item to shopping list" });
    }
  });

  app.put("/api/shopping-lists/items/:id", requireAuth, async (req, res) => {
    try {
      const itemId = parseInt(req.params.id);
      const userId = req.user!.id;
      
      // Get the original item first
      const originalItem = await storage.getShoppingListItem(itemId);
      if (!originalItem) {
        return res.status(404).json({ message: "Shopping list item not found" });
      }
      
      // Get the list to verify ownership
      const list = await storage.getShoppingList(originalItem.shoppingListId);
      if (!list) {
        return res.status(404).json({ message: "Shopping list not found" });
      }
      
      // Check ownership
      if (list.userId !== userId) {
        return res.status(403).json({ message: "You don't have permission to update this item" });
      }
      
      // Validate and update the item
      const validatedData = insertShoppingListItemSchema.partial().parse(req.body);
      const item = await storage.updateShoppingListItem(itemId, validatedData);
      
      if (!item) {
        return res.status(500).json({ message: "Failed to update item" });
      }
      
      // Get inventory item details
      const inventoryItem = await storage.getInventoryItem(item.inventoryId);
      
      // Log activity
      await storage.createActivityLog({
        userId,
        action: "SHOPPING_LIST_ITEM_UPDATED",
        details: `Updated ${inventoryItem?.name || "item"} in shopping list "${list.name}"`
      });
      
      res.json({
        ...item,
        inventoryItem
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid shopping list item data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update shopping list item" });
    }
  });

  app.delete("/api/shopping-lists/items/:id", requireAuth, async (req, res) => {
    try {
      const itemId = parseInt(req.params.id);
      const userId = req.user!.id;
      
      // Get the original item first
      const item = await storage.getShoppingListItem(itemId);
      if (!item) {
        return res.status(404).json({ message: "Shopping list item not found" });
      }
      
      // Get the list to verify ownership
      const list = await storage.getShoppingList(item.shoppingListId);
      if (!list) {
        return res.status(404).json({ message: "Shopping list not found" });
      }
      
      // Check ownership
      if (list.userId !== userId) {
        return res.status(403).json({ message: "You don't have permission to remove this item" });
      }
      
      // Get inventory item for logging
      const inventoryItem = await storage.getInventoryItem(item.inventoryId);
      
      const success = await storage.removeItemFromShoppingList(itemId);
      
      if (success) {
        // Log activity
        await storage.createActivityLog({
          userId,
          action: "SHOPPING_LIST_ITEM_REMOVED",
          details: `Removed ${inventoryItem?.name || "item"} from shopping list "${list.name}"`
        });
        
        return res.status(204).send();
      } else {
        return res.status(500).json({ message: "Failed to remove item from shopping list" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to remove item from shopping list" });
    }
  });

  // Add a direct route for shopping list items without ID in path
  app.post("/api/shopping-lists/items", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      
      console.log("Creating shopping list item with direct API:", req.body);
      
      if (!req.body.shoppingListId || isNaN(parseInt(req.body.shoppingListId.toString()))) {
        return res.status(400).json({ message: "Valid shopping list ID is required" });
      }
      
      const listId = parseInt(req.body.shoppingListId.toString());
      
      // Get the list first to verify ownership
      const list = await storage.getShoppingList(listId);
      if (!list) {
        return res.status(404).json({ message: "Shopping list not found" });
      }
      
      // Check ownership
      if (list.userId !== userId) {
        return res.status(403).json({ message: "You don't have permission to add items to this list" });
      }
      
      if (!req.body.inventoryId || isNaN(parseInt(req.body.inventoryId.toString()))) {
        return res.status(400).json({ message: "Valid inventory ID is required" });
      }
      
      const inventoryId = parseInt(req.body.inventoryId.toString());
      const quantity = req.body.quantity ? parseInt(req.body.quantity.toString()) : 1;
      
      // Direct validation
      const validatedData = {
        shoppingListId: listId,
        inventoryId,
        quantity,
        completed: false // New items are never completed
      };
      
      console.log("Validated shopping list item data:", validatedData);
      
      // Check if the inventory item exists
      const inventoryItem = await storage.getInventoryItem(validatedData.inventoryId);
      if (!inventoryItem) {
        return res.status(404).json({ message: "Inventory item not found" });
      }
      
      const item = await storage.addItemToShoppingList(validatedData);
      
      // Return the item with the inventory details
      const itemWithInventory = {
        ...item,
        inventoryItem
      };
      
      // Log activity
      await storage.createActivityLog({
        userId,
        action: "SHOPPING_LIST_ITEM_ADDED",
        details: `Added ${inventoryItem.name} to shopping list "${list.name}"`
      });
      
      res.status(201).json(itemWithInventory);
    } catch (error) {
      console.error("Error adding item to shopping list:", error);
      res.status(500).json({ message: "Failed to add item to shopping list", error: String(error) });
    }
  });

  app.put("/api/shopping-lists/items/:id/complete", requireAuth, async (req, res) => {
    try {
      const itemId = parseInt(req.params.id);
      const userId = req.user!.id;
      const { completed } = req.body;
      
      if (typeof completed !== 'boolean') {
        return res.status(400).json({ message: "Missing or invalid 'completed' parameter" });
      }
      
      // Get the original item first
      const item = await storage.getShoppingListItem(itemId);
      if (!item) {
        return res.status(404).json({ message: "Shopping list item not found" });
      }
      
      // Get the list to verify ownership
      const list = await storage.getShoppingList(item.shoppingListId);
      if (!list) {
        return res.status(404).json({ message: "Shopping list not found" });
      }
      
      // Check ownership
      if (list.userId !== userId) {
        return res.status(403).json({ message: "You don't have permission to update this item" });
      }
      
      // Update completed status
      const updatedItem = await storage.markItemAsCompleted(itemId, completed);
      
      if (!updatedItem) {
        return res.status(500).json({ message: "Failed to update item completed status" });
      }
      
      // Get inventory item details
      const inventoryItem = await storage.getInventoryItem(updatedItem.inventoryId);
      
      // Log activity
      await storage.createActivityLog({
        userId,
        action: completed ? "SHOPPING_LIST_ITEM_COMPLETED" : "SHOPPING_LIST_ITEM_UNCOMPLETED",
        details: `Marked ${inventoryItem?.name || "item"} as ${completed ? "completed" : "not completed"} in "${list.name}"`
      });
      
      res.json({
        ...updatedItem,
        inventoryItem
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to update item completed status" });
    }
  });

  app.post("/api/shopping-lists/:id/refill", requireAuth, async (req, res) => {
    try {
      const listId = parseInt(req.params.id);
      const userId = req.user!.id;
      
      // Get the list first to verify ownership
      const list = await storage.getShoppingList(listId);
      if (!list) {
        return res.status(404).json({ message: "Shopping list not found" });
      }
      
      // Check ownership
      if (list.userId !== userId) {
        return res.status(403).json({ message: "You don't have permission to refill items from this list" });
      }
      
      // Process the refill
      const updatedInventory = await storage.refillCompletedItems(listId, userId);
      
      if (updatedInventory.length === 0) {
        return res.status(400).json({ message: "No completed items to refill" });
      }
      
      // Log activity
      await storage.createActivityLog({
        userId,
        action: "INVENTORY_REFILLED",
        details: `Refilled ${updatedInventory.length} inventory items from shopping list "${list.name}"`
      });
      
      res.json({
        message: `Successfully refilled ${updatedInventory.length} inventory items`,
        updatedInventory
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to refill inventory from shopping list" });
    }
  });

  // Inventory Refill Routes
  app.get("/api/inventory/:id/refills", requireAuth, async (req, res) => {
    try {
      const inventoryId = parseInt(req.params.id);
      
      // Check if inventory item exists
      const inventoryItem = await storage.getInventoryItem(inventoryId);
      if (!inventoryItem) {
        return res.status(404).json({ message: "Inventory item not found" });
      }
      
      const refills = await storage.getInventoryRefills(inventoryId);
      res.json(refills);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch inventory refill history" });
    }
  });

  // Direct route for inventory refill without ID in the URL
  app.post("/api/inventory/refill", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const { inventoryId, quantity, cost, notes } = req.body;
      
      if (!inventoryId || isNaN(inventoryId)) {
        return res.status(400).json({ message: "Invalid inventory ID" });
      }
      
      if (!quantity || isNaN(quantity) || quantity <= 0) {
        return res.status(400).json({ message: "Invalid quantity for refill" });
      }
      
      // Check if inventory item exists
      const inventoryItem = await storage.getInventoryItem(inventoryId);
      if (!inventoryItem) {
        return res.status(404).json({ message: "Inventory item not found" });
      }
      
      // Process the refill
      const updatedItem = await storage.refillInventoryItem(
        inventoryId,
        Number(quantity),
        cost?.toString(),
        notes,
        userId
      );
      
      // Log activity
      await storage.createActivityLog({
        userId,
        action: "INVENTORY_REFILLED",
        details: `Refilled ${quantity} units of ${inventoryItem.name}`
      });
      
      res.json(updatedItem);
    } catch (error) {
      console.error("Refill error:", error);
      res.status(500).json({ message: "Failed to refill inventory item" });
    }
  });

  app.post("/api/inventory/batch-refill", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const { refills } = req.body;
      
      if (!Array.isArray(refills) || refills.length === 0) {
        return res.status(400).json({ message: "Invalid or empty refills data" });
      }
      
      // Validate and prepare refill data
      const validatedRefills: {
        inventoryId: number;
        quantity: number;
        cost?: string;
        notes?: string;
        userId?: number;
        refillDate: Date;
      }[] = [];
      for (const refill of refills) {
        if (!refill.inventoryId || !refill.quantity || refill.quantity <= 0) {
          return res.status(400).json({ 
            message: "Invalid refill data - each refill must have inventoryId and positive quantity",
            invalidRefill: refill
          });
        }
        
        // Check if inventory item exists
        const inventoryItem = await storage.getInventoryItem(refill.inventoryId);
        if (!inventoryItem) {
          return res.status(404).json({ 
            message: `Inventory item with ID ${refill.inventoryId} not found`,
            invalidRefill: refill
          });
        }
        
        validatedRefills.push({
          inventoryId: refill.inventoryId,
          quantity: refill.quantity,
          cost: refill.cost || "0",
          notes: refill.notes,
          userId,
          refillDate: new Date()
        });
      }
      
      // Process the batch refill
      const updatedItems = await storage.batchRefillInventory(validatedRefills);
      
      // Log activity
      await storage.createActivityLog({
        userId,
        action: "INVENTORY_BATCH_REFILLED",
        details: `Batch refilled ${updatedItems.length} inventory items`
      });
      
      res.json({
        message: `Successfully refilled ${updatedItems.length} inventory items`,
        updatedItems
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to process batch refill" });
    }
  });

  // Portfolio routes
  app.get("/api/portfolios", requireAuth, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      try {
        const portfolios = await storage.getPortfoliosByUser(req.user.id);
        res.json(portfolios);
      } catch (err) {
        console.error("Error fetching portfolios:", err);
        // Check if this user has any portfolio
        if (!req.user.portfolioId) {
          // Create a default portfolio for the user
          const portfolio = await storage.createPortfolio({
            name: `${req.user.firstName}'s Portfolio`,
            ownerId: req.user.id,
            createdBy: req.user.id
          });
          
          // Update the user with the portfolio id
          await storage.updateUser(req.user.id, { portfolioId: portfolio.id });
          
          // Return the newly created portfolio
          res.json([portfolio]);
        } else {
          throw err;
        }
      }
    } catch (error) {
      console.error("Portfolio fetch error:", error);
      res.status(500).json({ message: "Failed to fetch portfolios" });
    }
  });

  app.get("/api/portfolios/:id", requireAuth, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const portfolio = await storage.getPortfolio(parseInt(req.params.id));
      if (!portfolio) {
        return res.status(404).json({ message: "Portfolio not found" });
      }
      
      // Check if user has access to this portfolio
      if (portfolio.ownerId !== req.user.id && req.user.portfolioId !== portfolio.id) {
        return res.status(403).json({ message: "Access forbidden" });
      }
      
      res.json(portfolio);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch portfolio" });
    }
  });

  app.post("/api/portfolios", requireAuth, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      // Check if user already has portfolios to prevent duplicate creations
      try {
        const existingPortfolios = await storage.getPortfoliosByUser(req.user.id);
        if (existingPortfolios && existingPortfolios.length > 0) {
          // User already has portfolios, return the first one
          console.log(`User ${req.user.id} already has ${existingPortfolios.length} portfolios, returning first one`);
          return res.status(200).json(existingPortfolios[0]);
        }
      } catch (e) {
        console.log("Error checking existing portfolios, will continue with creation:", e);
        // Continue with portfolio creation even if check fails
      }
      
      try {
        const validatedData = insertPortfolioSchema.partial().parse(req.body);
        
        // Always set the owner and creator to the current user regardless of input
        const portfolioData = {
          name: validatedData.name || `${req.user.firstName}'s Portfolio`,
          ownerId: req.user.id,
          createdBy: req.user.id
        };
        
        const portfolio = await storage.createPortfolio(portfolioData);
        
        // Log activity
        await storage.createActivityLog({
          userId: req.user.id,
          action: "PORTFOLIO_CREATED",
          details: `Portfolio ${portfolio.name} created`
        });
        
        res.status(201).json(portfolio);
      } catch (error) {
        if (error instanceof z.ZodError) {
          console.error("Portfolio validation error:", error.errors);
          return res.status(400).json({ message: "Invalid portfolio data", errors: error.errors });
        }
        throw error; // Let the outer catch handle other errors
      }
    } catch (error) {
      console.error("Portfolio creation error:", error);
      res.status(500).json({ message: "Failed to create portfolio" });
    }
  });

  app.put("/api/portfolios/:id", requireAuth, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const id = parseInt(req.params.id);
      const existingPortfolio = await storage.getPortfolio(id);
      
      if (!existingPortfolio) {
        return res.status(404).json({ message: "Portfolio not found" });
      }
      
      // Only the owner can update the portfolio
      if (existingPortfolio.ownerId !== req.user.id) {
        return res.status(403).json({ message: "Only the owner can update the portfolio" });
      }
      
      const validatedData = insertPortfolioSchema.partial().parse(req.body);
      const portfolio = await storage.updatePortfolio(id, validatedData);
      
      // Log activity
      await storage.createActivityLog({
        userId: req.user.id,
        action: "PORTFOLIO_UPDATED",
        details: `Portfolio ${portfolio?.name} updated`
      });
      
      res.json(portfolio);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid portfolio data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update portfolio" });
    }
  });

  app.delete("/api/portfolios/:id", requireAuth, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const id = parseInt(req.params.id);
      const portfolio = await storage.getPortfolio(id);
      
      if (!portfolio) {
        return res.status(404).json({ message: "Portfolio not found" });
      }
      
      // Only the owner can delete the portfolio
      if (portfolio.ownerId !== req.user.id) {
        return res.status(403).json({ message: "Only the owner can delete the portfolio" });
      }
      
      const success = await storage.deletePortfolio(id);
      
      if (success) {
        // Log activity
        await storage.createActivityLog({
          userId: req.user.id,
          action: "PORTFOLIO_DELETED",
          details: `Portfolio ${portfolio.name} deleted`
        });
        
        return res.status(204).send();
      } else {
        return res.status(500).json({ message: "Failed to delete portfolio" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to delete portfolio" });
    }
  });

  // Invitation routes
  app.get("/api/invitations", requireRole(["standard_admin", "administrator"]), async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      // Get portfolios owned by the current user
      const portfolios = await storage.getPortfoliosByUser(req.user.id);
      
      // Get invitations for all portfolios owned by the user
      const invitationsPromises = portfolios.map(portfolio => 
        storage.getInvitationsByPortfolio(portfolio.id)
      );
      
      const invitationsArrays = await Promise.all(invitationsPromises);
      const allInvitations = invitationsArrays.flat();
      
      res.json(allInvitations);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch invitations" });
    }
  });

  app.get("/api/invitations/:id", requireRole(["standard_admin", "administrator"]), async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const invitation = await storage.getInvitation(parseInt(req.params.id));
      if (!invitation) {
        return res.status(404).json({ message: "Invitation not found" });
      }
      
      // Check if user owns the portfolio this invitation is for
      const portfolio = await storage.getPortfolio(invitation.portfolioId);
      if (!portfolio || portfolio.ownerId !== req.user.id) {
        return res.status(403).json({ message: "Access forbidden" });
      }
      
      res.json(invitation);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch invitation" });
    }
  });

  app.post("/api/invitations", requireRole(["standard_admin", "administrator"]), async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const validatedData = insertInvitationSchema.parse(req.body);
      
      // Verify that the user owns the portfolio they're inviting to
      const portfolio = await storage.getPortfolio(validatedData.portfolioId);
      if (!portfolio || portfolio.id !== validatedData.portfolioId) {
        return res.status(403).json({ message: "You can only invite users to portfolios you own" });
      }
      
      // Create invitation (token and expiresAt are generated in storage layer)
      const invitation = await storage.createInvitation(validatedData);
      
      // // Log activity
      // await storage.createActivityLog({
      //   userId: req.user.id,
      //   action: "INVITATION_SENT",
      //   details: `Invitation sent to ${invitation.email} for portfolio ${portfolio.name}`
      // });
      
      // // Send invitation email (will be logged to console if SENDGRID_API_KEY is not set)
      // try {
      //   const { sendInvitationEmail } = await import('./services/email.js');
      //   await sendInvitationEmail({
      //     email: invitation.email,
      //     portfolioName: portfolio.name,
      //     invitedByName: `${req.user.firstName} ${req.user.lastName}`,
      //     role: invitation.role,
      //     token: invitation.token
      //   });
      // } catch (emailError) {
      //   console.error('Failed to send invitation email:', emailError);
      //   // Continue even if email fails - just log the invitation link
      //   console.log(`Invitation link: /invitation/${invitation.token}`);
      // }
      
      res.status(201).json(invitation);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid invitation data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create invitation" });
    }
  });

  // Endpoint to validate an invitation token (no auth required)
  app.get("/api/invitations/validate/:token", async (req, res) => {
    try {
      const token = req.params.token;
      const invitation = await storage.getInvitationByToken(token);
      
      if (!invitation) {
        return res.status(404).json({ message: "Invitation not found" });
      }
      
      // Return the invitation data
      res.json(invitation);
    } catch (error) {
      res.status(500).json({ message: "Failed to validate invitation" });
    }
  });

  // Accept invitation - requires auth from the accepting user
  app.post("/api/invitations/accept/:token", requireAuth, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const token = req.params.token;
      
      // Get the invitation
      const invitation = await storage.getInvitationByToken(token);
      if (!invitation) {
        return res.status(404).json({ message: "Invitation not found" });
      }
      
      // Check if invitation is expired
      if (new Date(invitation.expiresAt) < new Date()) {
        return res.status(400).json({ message: "Invitation has expired" });
      }
      
      // Check if invitation is already accepted
      if (invitation.accepted) {
        return res.status(400).json({ message: "Invitation has already been accepted" });
      }
      
      // Accept the invitation
      const success = await storage.acceptInvitation(token, req.user.id);
      
      if (success) {
        // Log activity
        await storage.createActivityLog({
          userId: req.user.id,
          action: "INVITATION_ACCEPTED",
          details: `User accepted invitation to portfolio ${invitation.portfolioId}`
        });
        
        return res.status(200).json({ message: "Invitation accepted successfully" });
      } else {
        return res.status(500).json({ message: "Failed to accept invitation" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to accept invitation" });
    }
  });

  app.delete("/api/invitations/:id", requireRole(["standard_admin", "administrator"]), async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const id = parseInt(req.params.id);
      const invitation = await storage.getInvitation(id);
      
      if (!invitation) {
        return res.status(404).json({ message: "Invitation not found" });
      }
      
      // Verify that the user owns the portfolio the invitation is for
      const portfolio = await storage.getPortfolio(invitation.portfolioId);
      if (!portfolio || portfolio.ownerId !== req.user.id) {
        return res.status(403).json({ message: "You can only delete invitations for portfolios you own" });
      }
      
      const success = await storage.deleteInvitation(id);
      
      if (success) {
        // Log activity
        await storage.createActivityLog({
          userId: req.user.id,
          action: "INVITATION_DELETED",
          details: `Invitation to ${invitation.email} was deleted`
        });
        
        return res.status(204).send();
      } else {
        return res.status(500).json({ message: "Failed to delete invitation" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to delete invitation" });
    }
  });
  
  // Resend invitation
  app.post("/api/invitations/:id/resend", requireRole(["standard_admin", "administrator"]), async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const id = parseInt(req.params.id);
      const invitation = await storage.getInvitation(id);
      
      if (!invitation) {
        return res.status(404).json({ message: "Invitation not found" });
      }
      
      // Verify that the user owns the portfolio the invitation is for
      const portfolio = await storage.getPortfolio(invitation.portfolioId);
      if (!portfolio || portfolio.ownerId !== req.user.id) {
        return res.status(403).json({ message: "You can only resend invitations for portfolios you own" });
      }
      
      // Generate a new token instead of just updating the expiry date
      const token = Math.random().toString(36).substring(2, 15) + 
                    Math.random().toString(36).substring(2, 15);
      
      // Regenerate the invitation with a new token
      const updatedInvitation = await storage.updateInvitation(id, { 
        email: invitation.email, // Keep the existing email
        portfolioId: invitation.portfolioId // Keep the existing portfolioId
      });
      
      if (updatedInvitation) {
        // Log activity
        await storage.createActivityLog({
          userId: req.user.id,
          action: "INVITATION_RESENT",
          details: `Invitation to ${updatedInvitation.email} was resent`
        });
        
        // Send invitation email (will be logged to console if SENDGRID_API_KEY is not set)
        try {
          const { sendInvitationEmail } = await import('./services/email.js');
          await sendInvitationEmail({
            email: updatedInvitation.email,
            portfolioName: portfolio.name,
            invitedByName: `${req.user.firstName} ${req.user.lastName}`,
            role: updatedInvitation.role,
            token: updatedInvitation.token
          });
        } catch (emailError) {
          console.error('Failed to send invitation email:', emailError);
          // Continue even if email fails - just log the invitation link
          console.log(`Invitation link: /invitation/${updatedInvitation.token}`);
        }
        
        return res.status(200).json(updatedInvitation);
      } else {
        return res.status(500).json({ message: "Failed to resend invitation" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to resend invitation" });
    }
  });

  // Simple dashboard endpoint without authentication
  app.get("/api/dashboard", async (req, res) => {
    try {
      console.log('Dashboard request - auth status:', req.isAuthenticated());
      console.log('Dashboard request - session:', req.session?.id || 'No session');
      console.log('Dashboard request - user:', req.user ? 'Authenticated' : 'Not authenticated');
      
      // If user is authenticated, return user info
      if (req.isAuthenticated()) {
        const userWithoutPassword = { ...(req.user as any) };
        delete userWithoutPassword.password;
        
        return res.json({
          authenticated: true,
          user: userWithoutPassword,
          message: "User is authenticated"
        });
      }
      
      // Otherwise return a simple response
      return res.json({
        authenticated: false,
        message: "Dashboard accessible without authentication for debugging"
      });
    } catch (error) {
      console.error("Dashboard error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Special endpoint for auth debugging
  app.get("/api/auth-debug", (req, res) => {
    try {
      console.log('Auth debug endpoint accessed');
      console.log('Is authenticated:', req.isAuthenticated());
      console.log('Session:', req.session);
      console.log('User:', req.user);
      console.log('Cookies:', req.headers.cookie);
      
      res.json({
        authenticated: req.isAuthenticated(),
        sessionId: req.session?.id || null,
        sessionCookie: req.headers.cookie || null,
        user: req.user ? {
          id: req.user.id,
          username: req.user.username,
          email: req.user.email,
          role: req.user.role
        } : null,
        headers: {
          origin: req.headers.origin,
          referer: req.headers.referer,
          host: req.headers.host
        }
      });
    } catch (error) {
      console.error("Auth debug error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
