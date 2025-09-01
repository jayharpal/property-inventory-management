import type { Express, Request, Response } from "express";
import { storage } from "./storage.js";
import { UserRole, userRoleEnum } from "./schema/schema.js";

// Middleware to protect admin routes
function requireAdmin(req: Request, res: Response, next: Function) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  
  const user = req.user as any;
  if (!user || user.role !== "administrator") {
    return res.status(403).json({ message: "Forbidden: Administrator access required" });
  }
  
  next();
}

export function registerAdminRoutes(app: Express) {
  // Get all users (admin only)
  app.get("/api/admin/users", requireAdmin, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Update user role (admin only)
  app.put("/api/admin/users/:id/role", requireAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const { role } = req.body;
      
      if (!userRoleEnum.safeParse(role).success) {
        return res.status(400).json({ message: "Invalid role" });
      }
      
      const user = await storage.updateUser(userId, { role });
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Log activity
      await storage.createActivityLog({
        userId: req.user!.id,
        action: "USER_ROLE_UPDATED",
        details: `User ${user.username} role updated to ${role}`
      });
      
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: "Failed to update user role" });
    }
  });

  // Get all activity logs (admin only)
  app.get("/api/admin/activity-logs", requireAdmin, async (req, res) => {
    try {
      const logs = await storage.getAllActivityLogs();
      res.json(logs);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch activity logs" });
    }
  });

  // Get system dashboard data (admin only)
  app.get("/api/admin/dashboard", requireAdmin, async (req, res) => {
    try {
      // Get all required data
      const users = await storage.getAllUsers();
      const portfolios = await storage.getAllPortfolios();
      const owners = await storage.getOwners();
      const listings = await storage.getListings();
      const inventory = await storage.getInventory();
      const expenses = await storage.getExpenses();
      
      // Calculate totals and stats
      const totalUsers = users.length;
      const usersByRole = {
        administrators: users.filter(u => u.role === "administrator").length,
        standardAdmins: users.filter(u => u.role === "standard_admin").length,
        standardUsers: users.filter(u => u.role === "standard_user").length
      };
      
      const totalPortfolios = portfolios.length;
      const totalOwners = owners.length;
      const totalListings = listings.length;
      const totalInventoryItems = inventory.length;
      
      // Calculate total expenses and group by month
      const totalExpenses = expenses.reduce((sum, exp) => sum + parseFloat(exp.totalCost), 0);
      
      // Get low inventory items
      const lowInventoryCount = inventory.filter(item => 
        item.quantity <= (item.minQuantity || 10) && !item.deleted
      ).length;
      
      // Calculate expenses by owner
      const expensesByOwner: Record<number, { ownerName: string, totalExpenses: number, expenseCount: number }> = {};
      owners.forEach(owner => {
        const ownerExpenses = expenses.filter(exp => exp.ownerId === owner.id);
        const total = ownerExpenses.reduce((sum, exp) => sum + parseFloat(exp.totalCost), 0);
        expensesByOwner[owner.id] = {
          ownerName: owner.name,
          totalExpenses: total,
          expenseCount: ownerExpenses.length
        };
      });
      
      // Calculate expenses by listing
      const expensesByListing: Record<number, { listingName: string, totalExpenses: number, expenseCount: number }> = {};
      listings.forEach(listing => {
        const listingExpenses = expenses.filter(exp => exp.listingId === listing.id);
        const total = listingExpenses.reduce((sum, exp) => sum + parseFloat(exp.totalCost), 0);
        expensesByListing[listing.id] = {
          listingName: listing.name,
          totalExpenses: total,
          expenseCount: listingExpenses.length
        };
      });
      
      // Get expenses trend (last 6 months)
      const today = new Date();
      const last6Months = Array.from({ length: 6 }, (_, i) => {
        const date = new Date();
        date.setMonth(today.getMonth() - i);
        date.setDate(1);
        date.setHours(0, 0, 0, 0);
        return date;
      }).reverse();
      
      const expensesTrend = last6Months.map((date) => {
        const month = date.toLocaleString('default', { month: 'short' });
        const year = date.getFullYear();
        const monthLabel = `${month} ${year}`;
        
        const nextMonth = new Date(date);
        nextMonth.setMonth(date.getMonth() + 1);
        
        const monthExpenses = expenses.filter(exp => {
          if (!exp.date) return false;
          const expDate = new Date(exp.date);
          return expDate >= date && expDate < nextMonth;
        });
        
        const total = monthExpenses.reduce((sum, exp) => sum + parseFloat(exp.totalCost), 0);
        
        return {
          month: monthLabel,
          total: total
        };
      });
      
      res.json({
        userStats: {
          total: totalUsers,
          byRole: usersByRole
        },
        portfolioStats: {
          total: totalPortfolios
        },
        ownerStats: {
          total: totalOwners
        },
        listingStats: {
          total: totalListings
        },
        inventoryStats: {
          total: totalInventoryItems,
          lowStock: lowInventoryCount
        },
        expenseStats: {
          total: totalExpenses,
          byOwner: expensesByOwner,
          byListing: expensesByListing,
          trend: expensesTrend
        }
      });
    } catch (error) {
      console.error("Admin dashboard error:", error);
      res.status(500).json({ message: "Failed to fetch admin dashboard data" });
    }
  });
}