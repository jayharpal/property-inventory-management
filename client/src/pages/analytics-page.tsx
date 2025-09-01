// @ts-nocheck
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useMemo, useEffect } from "react";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  LabelList,
} from "recharts";
import { Loader2, Search, RefreshCw } from "lucide-react";
import { apiRequest, createQueryKey } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

// Define TimeRangeOption type
type TimeRangeOption = "ALL" | "1W" | "1M" | "3M" | "6M" | "1Y";

type ActivityItem = {
  id: number;
  action: string;
  details: string;
  timestamp: string;
  userId: number;
  context?: any;
};

type AnalyticsData = {
  expensesByProperty: Array<{ name: string; expenses: number; markup: number; address: string; propertyType: string; totalExpenseCount: number }>;
  expensesByOwner: Array<{ name: string; expenses: number; markup: number; email: string; propertyCount: number; expenseCount: number }>;
  expensesByCategory: Array<{ name: string; value: number }>;
  expensesTrend: Array<{ month: string; year: number; expenses: number; markup: number; count: number }>;
  expensesByPlatform: Array<{ name: string; value: number }>;
  topInventoryItems: Array<{ id: number; name: string; category: string; usage: number; cost: number; remaining: number }>;
  inventoryByCategory: Array<{ name: string; usage: number; cost: number }>;
  activities: Array<ActivityItem>;
  summary: {
    totalExpenses: number;
    totalMarkup: number;
    totalInventoryItems: number;
    inventoryValue: number;
    expenseCount: number;
    propertyCount: number;
    ownerCount: number;
  };
};

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658'];

export default function AnalyticsPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRangeOption>("ALL"); // Default to "ALL"
  
  // Fetch analytics data from the server with more robust error handling
  const { data: analyticsData, isLoading: isLoadingAnalytics, refetch } = useQuery<AnalyticsData>({
    queryKey: createQueryKey("/api/stats/analytics", { timeRange: selectedTimeRange }), // Include timeRange in queryKey
    queryFn: async () => {
      try {
        // If backend supports time range, pass it as a query parameter
        const response = await apiRequest("GET", "/api/stats/analytics", { params: { range: selectedTimeRange !== "ALL" ? selectedTimeRange : undefined } });
        
        // If we got a proper response with expected fields, use it
        if (response && (response.expensesByProperty || response.summary)) {
          console.log("Received proper analytics data");
          return response;
        }
        
        // If we received auth-only info or the API isn't implemented, build our own analytics
        console.log("Building analytics data from individual endpoints...");
        return await buildAnalyticsData(selectedTimeRange); // Pass timeRange to buildAnalyticsData
      } catch (error) {
        console.error("Failed to fetch analytics data:", error);
        // Fallback to building data from other endpoints
        return await buildAnalyticsData(selectedTimeRange); // Pass timeRange to buildAnalyticsData
      }
    }
  });
  
  // Mutation to force regenerate analytics data
  const regenerateMutation = useMutation({
    mutationFn: async () => {
      setIsGenerating(true);
      return await apiRequest("POST", "/api/stats/regenerate");
    },
    onSuccess: () => {
      toast({
        title: "Analytics regenerated",
        description: "The analytics data has been refreshed successfully.",
      });
      refetch();
      setIsGenerating(false);
    },
    onError: (error) => {
      toast({
        title: "Failed to regenerate analytics",
        description: error.message,
        variant: "destructive"
      });
      setIsGenerating(false);
    }
  });
  
  // Helper function to build analytics data from individual API endpoints
  async function buildAnalyticsData(timeRange: TimeRangeOption = "ALL") { // Accept timeRange
    console.log(`Building analytics data from scratch for time range: ${timeRange}`);
    
    const getStartDate = (range: TimeRangeOption): Date | null => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      switch (range) {
        case "1W":
          today.setDate(today.getDate() - 7);
          return today;
        case "1M":
          today.setMonth(today.getMonth() - 1);
          return today;
        case "3M":
          today.setMonth(today.getMonth() - 3);
          return today;
        case "6M":
          today.setMonth(today.getMonth() - 6);
          return today;
        case "1Y":
          today.setFullYear(today.getFullYear() - 1);
          return today;
        case "ALL":
        default:
          return null;
      }
    };

    const startDate = getStartDate(timeRange);

    // Create default empty structure
    const emptyData: AnalyticsData = {
      expensesByProperty: [],
      expensesByOwner: [],
      expensesByCategory: [],
      expensesTrend: [], // Will be generated dynamically
      expensesByPlatform: [],
      topInventoryItems: [],
      inventoryByCategory: [],
      activities: [],
      summary: {
        totalExpenses: 0,
        totalMarkup: 0,
        totalInventoryItems: 0,
        inventoryValue: 0,
        expenseCount: 0,
        propertyCount: 0,
        ownerCount: 0
      }
    };
    
    try {
      // Fetch raw data from endpoints
      const [listingsData, ownersData, inventoryData, expensesData, activitiesData] = await Promise.all([
        apiRequest("GET", "/api/listings").catch(e => { console.error("Failed to fetch listings", e); return []; }),
        apiRequest("GET", "/api/owners").catch(e => { console.error("Failed to fetch owners", e); return []; }),
        apiRequest("GET", "/api/inventory").catch(e => { console.error("Failed to fetch inventory", e); return []; }),
        apiRequest("GET", "/api/expenses").catch(e => { console.error("Failed to fetch expenses", e); return []; }),
        apiRequest("GET", "/api/activity").catch(e => { console.error("Failed to fetch activities", e); return []; })
      ]);
      
      // Ensure all data is array
      const listingsArray = Array.isArray(listingsData) ? listingsData : [];
      const ownersArray = Array.isArray(ownersData) ? ownersData : [];
      const inventoryArray = Array.isArray(inventoryData) ? inventoryData : [];
      
      // Filter expenses and activities based on timeRange
      let expensesArray = Array.isArray(expensesData) ? expensesData : [];
      if (startDate) {
        expensesArray = expensesArray.filter(expense => expense.date && new Date(expense.date) >= startDate);
      }

      let activitiesArray = Array.isArray(activitiesData) ? activitiesData : [];
      if (startDate) {
        activitiesArray = activitiesArray.filter(activity => activity.timestamp && new Date(activity.timestamp) >= startDate);
      }
      
      // Derive sets of IDs based on the filtered expensesArray for accurate counting
      const propertyIdsWithExpensesInPeriod = new Set(expensesArray.map(e => e.listingId));
      const ownerIdsAssociatedWithExpensesInPeriod = new Set<number>();
      listingsArray.forEach(listing => {
        if (listing.ownerId && propertyIdsWithExpensesInPeriod.has(listing.id)) {
          ownerIdsAssociatedWithExpensesInPeriod.add(listing.ownerId);
        }
      });
      const inventoryItemIdsUsedInPeriod = new Set(expensesArray.filter(e => e.inventoryId).map(e => e.inventoryId));

      // Calculate summary data
      emptyData.summary = {
        totalExpenses: expensesArray.reduce((sum, expense) => sum + Number(expense.totalCost || 0), 0),
        totalMarkup: expensesArray.reduce((sum, expense) => 
          sum + (Number(expense.billedAmount || 0) - Number(expense.totalCost || 0)), 0),
        totalInventoryItems: inventoryItemIdsUsedInPeriod.size,
        inventoryValue: expensesArray
          .filter(e => e.inventoryId)
          .reduce((sum, expense) => sum + Number(expense.totalCost || 0), 0),
        expenseCount: expensesArray.length,
        propertyCount: propertyIdsWithExpensesInPeriod.size,
        ownerCount: ownerIdsAssociatedWithExpensesInPeriod.size
      };
      
      // Process expenses by property
      const propertyExpenses = {};
      expensesArray.forEach(expense => {
        const propertyId = expense.listingId;
        if (!propertyExpenses[propertyId]) {
          const property = listingsArray.find(p => p.id === propertyId) || {};
          propertyExpenses[propertyId] = {
            id: propertyId,
            name: property.name || `Property ${propertyId}`,
            address: property.address || '',
            propertyType: property.propertyType || 'unknown',
            expenses: 0,
            markup: 0,
            totalExpenseCount: 0
          };
        }
        
        propertyExpenses[propertyId].expenses += Number(expense.totalCost || 0);
        propertyExpenses[propertyId].markup += 
          (Number(expense.billedAmount || 0) - Number(expense.totalCost || 0));
        propertyExpenses[propertyId].totalExpenseCount += 1;
      });
      
      emptyData.expensesByProperty = Object.values(propertyExpenses);
      
      // Process expenses by owner
      const ownerExpenses = {};
      expensesArray.forEach(expense => {
        // Find the property to get the owner
        const property = listingsArray.find(p => p.id === expense.listingId);
        if (!property || !property.ownerId) return; // ensure ownerId exists
        
        const ownerId = property.ownerId;
        if (!ownerExpenses[ownerId]) {
          const owner = ownersArray.find(o => o.id === ownerId) || {};
          ownerExpenses[ownerId] = {
            id: ownerId,
            name: owner.name || `Owner ${ownerId}`,
            email: owner.email || '',
            expenses: 0,
            markup: 0,
            propertyCount: 0, // Will be updated below
            expenseCount: 0
          };
          
          // Count properties for this owner THAT HAD EXPENSES IN THE PERIOD
          ownerExpenses[ownerId].propertyCount = 
            listingsArray.filter(p => p.ownerId === ownerId && propertyIdsWithExpensesInPeriod.has(p.id)).length;
        }
        
        ownerExpenses[ownerId].expenses += Number(expense.totalCost || 0);
        ownerExpenses[ownerId].markup += 
          (Number(expense.billedAmount || 0) - Number(expense.totalCost || 0));
        ownerExpenses[ownerId].expenseCount += 1;
      });
      
      emptyData.expensesByOwner = Object.values(ownerExpenses);
      
      // Process expenses by property type (platform)
      const propertyTypeExpenses = {};
      expensesArray.forEach(expense => {
        const property = listingsArray.find(p => p.id === expense.listingId);
        if (!property) return;
        
        const propertyType = property.propertyType || 'unknown';
        if (!propertyTypeExpenses[propertyType]) {
          propertyTypeExpenses[propertyType] = {
            name: propertyType.charAt(0).toUpperCase() + propertyType.slice(1),
            value: 0
          };
        }
        
        propertyTypeExpenses[propertyType].value += Number(expense.totalCost || 0);
      });
      
      emptyData.expensesByPlatform = Object.values(propertyTypeExpenses);
      
      // Process expenses by category (service type, inventory type)
      const categoryExpenses = {
        'Inventory': { name: 'Inventory', value: 0 },
        'Service': { name: 'Services', value: 0 },
        'Repairs': { name: 'Repairs', value: 0 },
        'Utilities': { name: 'Utilities', value: 0 },
        'Other': { name: 'Other', value: 0 }
      };
      
      expensesArray.forEach(expense => {
        let category = 'Other';
        
        // Try to determine category from notes or inventory
        if (expense.inventoryId) {
          category = 'Inventory';
        } else if (expense.notes) {
          const notes = expense.notes.toLowerCase();
          if (notes.includes('service') || notes.includes('cleaning')) {
            category = 'Service';
          } else if (notes.includes('repair') || notes.includes('fix')) {
            category = 'Repairs';
          } else if (notes.includes('utility') || notes.includes('water') || 
                    notes.includes('electric') || notes.includes('gas')) {
            category = 'Utilities';
          }
        }
        
        categoryExpenses[category].value += Number(expense.totalCost || 0);
      });
      
      emptyData.expensesByCategory = Object.values(categoryExpenses).filter(cat => cat.value > 0);
      
      // Generate expense trends dynamically based on timeRange
      emptyData.expensesTrend = generateDynamicTrend(expensesArray, timeRange, startDate);
      
      // Process top inventory items
      emptyData.topInventoryItems = inventoryArray
        .map(item => {
          // Find all expenses that use this inventory item
          const itemExpenses = expensesArray.filter(e => e.inventoryId === item.id);
          const usage = itemExpenses.reduce((sum, e) => sum + Number(e.quantityUsed || 1), 0);
          const cost = itemExpenses.reduce((sum, e) => sum + Number(e.totalCost || 0), 0);
          
          return {
            id: item.id,
            name: item.name,
            category: item.category || 'Unknown',
            usage,
            cost,
            remaining: Number(item.quantity || 0)
          };
        })
        .sort((a, b) => b.usage - a.usage)
        .slice(0, 10);
      
      // Process inventory by category
      const inventoryCategories = {};
      inventoryArray.forEach(item => {
        const category = item.category || 'Unknown';
        if (!inventoryCategories[category]) {
          inventoryCategories[category] = {
            name: category,
            usage: 0,
            cost: 0
          };
        }
        
        // Find usage of this inventory item from expenses
        const itemExpenses = expensesArray.filter(e => e.inventoryId === item.id);
        const usage = itemExpenses.reduce((sum, e) => sum + Number(e.quantityUsed || 1), 0);
        const cost = itemExpenses.reduce((sum, e) => sum + Number(e.totalCost || 0), 0);
        
        inventoryCategories[category].usage += usage;
        inventoryCategories[category].cost += cost;
      });
      
      emptyData.inventoryByCategory = Object.values(inventoryCategories);
      
      // Add activities
      emptyData.activities = activitiesArray
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 100);
      
      return emptyData;
    } catch (error) {
      console.error("Error building analytics data:", error);
      return emptyData;
    }
  }
  
  // Generate empty trend data for last 6 months
  function generateEmptyTrend() { // This function is now effectively replaced by generateDynamicTrend
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      months.push({
        month: date.toLocaleString('default', { month: 'short' }) + ' ' + date.getFullYear(),
        year: date.getFullYear(),
        expenses: 0,
        markup: 0,
        count: 0
      });
    }
    return months;
  }

  // New function to generate dynamic trend data
  function generateDynamicTrend(expenses: any[], timeRange: TimeRangeOption, startDate: Date | null) {
    const trendData: Array<{ month: string; year?: number; expenses: number; markup: number; count: number; label: string }> = [];
    const endDate = new Date();

    if (timeRange === "ALL" || !startDate) {
      // Default to last 6 months if ALL or no startDate (should ideally have better logic for ALL)
      // For simplicity, reusing old logic for 6 months if ALL, or make it more sophisticated
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        trendData.push({
          label: date.toLocaleString('default', { month: 'short' }) + ' ' + date.getFullYear(),
          month: date.toLocaleString('default', { month: 'short' }), // for grouping
          year: date.getFullYear(),
          expenses: 0,
          markup: 0,
          count: 0
        });
      }
    } else if (timeRange === "1W") {
      for (let i = 6; i >= 0; i--) {
        const day = new Date(startDate);
        day.setDate(startDate.getDate() + (6 - i));
        trendData.push({ label: day.toLocaleDateString('default', { weekday: 'short' }), expenses: 0, markup: 0, count: 0, month: '' });
      }
    } else if (timeRange === "1M") {
      const numDays = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) +1;
      for (let i = 0; i < numDays; i++) {
        const day = new Date(startDate);
        day.setDate(startDate.getDate() + i);
        if (day > endDate) break;
        trendData.push({ label: day.toLocaleDateString('default', { month: 'short', day: 'numeric' }), expenses: 0, markup: 0, count: 0, month: '' });
      }
    } else { // 3M, 6M, 1Y (monthly aggregation)
        let currentMonth = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
        while(currentMonth <= endDate) {
            trendData.push({
                label: currentMonth.toLocaleString('default', { month: 'short' }) + ' ' + currentMonth.getFullYear().toString().slice(-2),
                month: currentMonth.toLocaleString('default', { month: 'short' }),
                year: currentMonth.getFullYear(),
                expenses: 0, markup: 0, count: 0
            });
            currentMonth.setMonth(currentMonth.getMonth() + 1);
        }
    }

    expenses.forEach(expense => {
      if (!expense.date) return;
      const expenseDate = new Date(expense.date);
      let pointLabel = "";

      if (timeRange === "1W") {
        pointLabel = expenseDate.toLocaleDateString('default', { weekday: 'short' });
      } else if (timeRange === "1M") {
        pointLabel = expenseDate.toLocaleDateString('default', { month: 'short', day: 'numeric' });
      } else { // ALL, 3M, 6M, 1Y (monthly)
        pointLabel = expenseDate.toLocaleString('default', { month: 'short' }) + ' ' + (timeRange === "ALL" || timeRange === "3M" || timeRange === "6M" || timeRange === "1Y" ? expenseDate.getFullYear() : expenseDate.getFullYear().toString().slice(-2));
        // For ALL, ensure full year matches label from generation
        if(timeRange === "ALL") pointLabel = expenseDate.toLocaleString('default', { month: 'short' }) + ' ' + expenseDate.getFullYear();
      }
      
      const matchingPoint = trendData.find(item => item.label === pointLabel);
      if (matchingPoint) {
        matchingPoint.expenses += Number(expense.totalCost || 0);
        matchingPoint.markup += (Number(expense.billedAmount || 0) - Number(expense.totalCost || 0));
        matchingPoint.count += 1;
      }
    });
    return trendData.map(td => ({...td, expenses: parseFloat(td.expenses.toFixed(2)), markup: parseFloat(td.markup.toFixed(2)) }));
  }
  
  // State for activity filters
  const [activitySearch, setActivitySearch] = useState("");
  const [activityTypeFilter, setActivityTypeFilter] = useState("all");
  
  // Filter activities based on search and filters
  const filteredActivities = useMemo(() => {
    if (!analyticsData?.activities) return [];
    
    return analyticsData.activities.filter(activity => {
      // Text search filter
      const matchesSearch = 
        activitySearch === "" || 
        activity.details.toLowerCase().includes(activitySearch.toLowerCase()) ||
        activity.action.toLowerCase().includes(activitySearch.toLowerCase()) ||
        getActivityTitle(activity.action).toLowerCase().includes(activitySearch.toLowerCase());
      
      // Activity type filter
      let matchesType = true;
      if (activityTypeFilter !== "all") {
        if (activityTypeFilter === "login") {
          matchesType = activity.action === "LOGIN" || activity.action === "LOGOUT" || activity.action === "REGISTRATION";
        } else if (activityTypeFilter === "report") {
          matchesType = activity.action.includes("REPORT");
        } else if (activityTypeFilter === "expense") {
          matchesType = activity.action.includes("EXPENSE");
        } else if (activityTypeFilter === "inventory") {
          matchesType = activity.action.includes("INVENTORY");
        } else if (activityTypeFilter === "owner") {
          matchesType = activity.action.includes("OWNER");
        } else if (activityTypeFilter === "listing") {
          matchesType = activity.action.includes("LISTING");
        }
      }
      
      return matchesSearch && matchesType;
    });
  }, [analyticsData?.activities, activitySearch, activityTypeFilter]);

  return (
    <DashboardLayout 
      title="Analytics Dashboard"
      actions={
        <div className="flex items-center space-x-2">
          <Select value={selectedTimeRange} onValueChange={(value) => setSelectedTimeRange(value as TimeRangeOption)}>
            <SelectTrigger className="w-[100px]">
              <SelectValue placeholder="Time Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Time</SelectItem>
              <SelectItem value="1W">Last 7 Days</SelectItem>
              <SelectItem value="1M">Last Month</SelectItem>
              <SelectItem value="3M">Last 3 Months</SelectItem>
              <SelectItem value="6M">Last 6 Months</SelectItem>
              <SelectItem value="1Y">Last Year</SelectItem>
            </SelectContent>
          </Select>
          <Button
            onClick={() => regenerateMutation.mutate()}
            disabled={isGenerating}
            className="inline-flex items-center"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isGenerating ? 'animate-spin' : ''}`} />
            {isGenerating ? 'Refreshing...' : 'Refresh Analytics'}
          </Button>
        </div>
      }
    >
      {isLoadingAnalytics ? (
        <div className="flex items-center justify-center min-h-[500px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2">Loading analytics data...</span>
        </div>
      ) : (
        <Tabs defaultValue="inventory" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="expenses">Expenses</TabsTrigger>
            <TabsTrigger value="inventory">Inventory</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="expenses">
            {/* New layout: Expenses by Property on left (50% width), other charts on right */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Left column - Expenses by Property (Vertical) - 50% width */}
              <div className="col-span-1 space-y-6">
                <Card className="shadow">
                  <CardHeader>
                    <CardTitle>Expenses by Property</CardTitle>
                  </CardHeader>
                  <CardContent>
                   <div className="max-h-[400px] overflow-y-auto pr-2">
                    <div className="min-w-[100%] h-fit">
                      <ResponsiveContainer width="100%" height={analyticsData?.expensesByProperty?.length * 50}>
                        <BarChart
                          data={analyticsData?.expensesByProperty
                            ?.slice()
                            .sort((a, b) => b.expenses - a.expenses)
                            .map(item => ({
                              ...item,
                              displayName: item.name.length > 15 ? item.name.substring(0, 15) + '...' : item.name
                            }))}
                          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                          layout="vertical"
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" tickFormatter={(value) => `$${value}`} />
                          <YAxis 
                            type="category" 
                            dataKey="displayName" 
                            width={100} 
                          />
                          <Tooltip 
                            formatter={(value) => [`$${value}`, undefined]} 
                            labelFormatter={(label, payload) => {
                              // Show full name in tooltip
                              return payload && payload[0] ? payload[0].payload.name : label;
                            }}
                          />
                          <Legend />
                          <Bar dataKey="expenses" name="Expenses" fill="#3B82F6" >
                             {analyticsData?.expensesByProperty?.map((entry) => (
                               <>
                                 <LabelList
                                   dataKey="expenses"
                                   position="right"
                                   formatter={(value: number) => `$${value}`}
                                   fontSize={14}
                                 />
                               </>
                             ))}
                            </Bar>
                          <Bar dataKey="markup" name="Markup" fill="#10B981" >
                             {analyticsData?.expensesByProperty?.map((entry) => (
                               <>
                                 <LabelList
                                   dataKey="markup"
                                   position="right"
                                   formatter={(value: number) => `$${value}`}
                                   fontSize={14}
                                 />
                               </>
                             ))}
                            </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                {/* Expenses by Owner chart below Property chart */}
                <Card className="shadow">
                  <CardHeader>
                    <CardTitle>Expenses by Owner</CardTitle>
                  </CardHeader>
                  <CardContent>
                     <div className="max-h-[400px] overflow-y-auto pr-2">
                      <div className="min-w-[100%] h-fit">
                      <ResponsiveContainer width="100%" height={analyticsData?.expensesByOwner?.length * 60}>
                        <BarChart
                           data={analyticsData?.expensesByOwner
                            ?.slice()
                            .sort((a, b) => b.expenses - a.expenses).map(item => ({
                            ...item,
                            // Create a shortened display name for the Y-axis
                            displayName: item.name.length > 15 ? item.name.substring(0, 15) + '...' : item.name
                          }))}
                          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                          layout="vertical"
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" tickFormatter={(value) => `$${value}`} />
                          <YAxis 
                            type="category" 
                            dataKey="displayName" 
                            width={100} 
                          />
                          <Tooltip 
                            formatter={(value) => [`$${value}`, undefined]} 
                            labelFormatter={(label, payload) => {
                              // Show full name in tooltip
                              return payload && payload[0] ? payload[0].payload.name : label;
                            }}
                          />
                          <Legend />
                          <Bar dataKey="expenses" name="Expenses" fill="#3B82F6" >
                            {analyticsData?.expensesByOwner?.map((entry) => (
                               <>
                                 <LabelList
                                   dataKey="expenses"
                                   position="right"
                                   formatter={(value: number) => `$${value}`}
                                   fontSize={14}
                                 />
                               </>
                             ))}
                            </Bar>
                          <Bar dataKey="markup" name="Markup" fill="#10B981" >
                             {analyticsData?.expensesByOwner?.map((entry) => (
                               <>
                                 <LabelList
                                   dataKey="markup"
                                   position="right"
                                   formatter={(value: number) => `$${value}`}
                                   fontSize={14}
                                 />
                               </>
                             ))}
                            </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              {/* Right column - Other charts */}
              <div className="col-span-1 space-y-6">
                {/* Expense Trends */}
                <Card className="shadow">
                  <CardHeader>
                    <CardTitle>Expense Trends (Last 6 Months)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={analyticsData?.expensesTrend}
                          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="label" />
                          <YAxis tickFormatter={(value) => `$${value}`} />
                          <Tooltip formatter={(value) => [`$${value}`, undefined]} />
                          <Legend />
                          <Line type="monotone" dataKey="expenses" name="Expenses" stroke="#3B82F6" activeDot={{ r: 8 }} />
                          <Line type="monotone" dataKey="markup" name="Markup" stroke="#10B981" activeDot={{ r: 8 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
                
                {/* Property Type Pie Chart */}
                   <Card className="shadow">
                  <CardHeader>
                    <CardTitle>Expenses by Property Type</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="max-h-[400px] overflow-y-auto pr-2">
                      {(() => {
                        const total = analyticsData?.expensesByPlatform?.reduce(
                          (sum, item) => sum + item.value,
                          0
                        );
                      
                        const chartData = analyticsData?.expensesByPlatform?.slice().sort((a,b)=>(b.value-a.value)).map((item) => ({
                          ...item,
                          value: total ? Number(((item.value / total) * 100).toFixed(2)) : 0,
                          displayName:
                            item.name.length > 15
                              ? item.name.substring(0, 15) + "..."
                              : item.name,
                        }));
                      
                        return (
                          <ResponsiveContainer
                            width="100%"
                            height={chartData?.length * 60 || 600}
                          >
                            <BarChart
                              data={chartData}
                              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                              layout="vertical"
                            >
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis
                                type="number"
                                tickFormatter={(value) => `${value}%`}
                                tick={{ fontSize: 12 }}
                              />
                              <YAxis
                                type="category"
                                dataKey="displayName"
                                width={140}
                                tick={{ fontSize: 12 }}
                                interval={0}
                              />
                              <Tooltip
                                formatter={(value, name, props) => {
                                  const originalItem = analyticsData?.expensesByPlatform?.find(
                                    (item) =>
                                      item.name === props?.payload?.name ||
                                      item.name.startsWith(props?.payload?.displayName?.slice(0, 10))
                                  );
                                  return [`$${originalItem?.value ?? "N/A"}`, "Expenses"];
                                }}
                                labelFormatter={(label, payload) =>
                                  payload && payload[0] ? payload[0].payload.name : label
                                }
                              />
                              <Legend />
                              <Bar dataKey="value" name="Expenses (%)" fill="#38BDF8" >
                                {analyticsData?.expensesByPlatform?.map((entry) => (
                               <>
                                 <LabelList
                                   dataKey="value"
                                   position="right"
                                   formatter={(value: number) => `${value}%`}
                                   fontSize={14}
                                 />
                               </>
                             ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        );
                      })()}
                    </div>
                  </CardContent>
                </Card>
                
                {/* Expenses by Category Pie Chart */}
                <Card className="shadow">
                  <CardHeader>
                    <CardTitle>Expenses by Category</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="max-h-[400px] overflow-y-auto pr-2">
                      {(() => {
                        const total = analyticsData?.expensesByCategory?.reduce(
                          (sum, item) => sum + item.value, 0
                        );
                      
                        const chartData = analyticsData?.expensesByCategory?.slice().sort((a,b)=>b.expenses-a.expenses).map((item) => ({
                          ...item,
                          // Convert to percentage and limit decimal points
                          value: total ? Number(((item.value / total) * 100).toFixed(2)) : 0,
                          // Shorten display name if too long
                          displayName:
                            item.name.length > 15
                              ? item.name.substring(0, 15) + "..."
                              : item.name,
                        }));
                      
                        return (
                          <ResponsiveContainer
                            width="100%"
                            height={chartData?.length * 50 || 600}
                          >
                            <BarChart
                              data={chartData}
                              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                              layout="vertical"
                            >
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis
                                type="number"
                                tickFormatter={(value) => `${value}%`}
                                tick={{ fontSize: 12 }}
                              />
                              <YAxis
                                type="category"
                                dataKey="displayName"
                                width={140}
                                tick={{ fontSize: 12 }}
                                interval={0}
                              />
                              <Tooltip
                                formatter={(value, name, props) => {
                                  const originalItem = analyticsData?.expensesByCategory?.find(
                                    (item) =>
                                      item.name === props?.payload?.name ||
                                      item.name.startsWith(props?.payload?.displayName?.slice(0, 10))
                                  );
                                  return [`$${originalItem?.value ?? "N/A"}`, "Expenses"];
                                }}
                                labelFormatter={(label, payload) =>
                                  payload && payload[0] ? payload[0].payload.name : label
                                }
                              />
                              <Legend />
                              <Bar dataKey="value" name="Expenses (%)" fill="#F97316" >
                                 {analyticsData?.expensesByCategory?.map((entry) => (
                               <>
                                 <LabelList
                                   dataKey="value"
                                   position="right"
                                   formatter={(value: number) => `${value}%`}
                                   fontSize={14}
                                 />
                               </>
                             ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        );
                      })()}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

         <TabsContent value="inventory">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
             <Card className="shadow">
                <CardHeader>
                  <CardTitle>Top Inventory Items by Usage</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="max-h-[300px] overflow-y-auto pr-2">
                    <div className="min-w-[100%] h-fit">
                      <ResponsiveContainer
                        width="100%"
                        height={analyticsData?.topInventoryItems?.length * 40 || 600}
                      >
                        <BarChart
                          data={
                            analyticsData?.topInventoryItems?.map((item) => ({
                            ...item,
                            displayName:
                              item.name.length > 15
                                ? item.name.substring(0, 15) + "..."
                                : item.name,
                          }))
  
                        }
                          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                          layout="vertical"
                        >
                          {/* <CartesianGrid strokeDasharray="3 3" /> */}
                          <XAxis type="number" />
                          <YAxis
                            type="category"
                            dataKey="displayName"
                            width={140}
                            tick={{ fontSize: 12 }}
                            interval={0}
                          />
                          <Tooltip
                            formatter={(value) => [`${value}`, "Usage Count"]}
                            labelFormatter={(label, payload) => {
                              return payload && payload[0]
                                ? payload[0].payload.name
                                : label;
                            }}
                          />
                          <Legend />
                          <Bar dataKey="usage" name="Usage Count" fill="#3B82F6">
                             {analyticsData?.topInventoryItems?.map((entry) => (
                               <>
                                 <LabelList
                                   dataKey="usage"
                                   position="right"
                                   formatter={(value: number) => `${value}`}
                                   fontSize={14}
                                 />
                               </>
                             ))}
                            </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow">
                <CardHeader>
                  <CardTitle>Inventory Usage by Category</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="max-h-[600px] overflow-y-auto pr-2">
                    <div className="min-w-[100%] h-fit">
                      <ResponsiveContainer
                        width="100%"
                        height={analyticsData?.inventoryByCategory?.length * 40 || 600}
                      >
                        <BarChart
                          data={analyticsData?.inventoryByCategory
                            ?.slice() 
                            .sort((a, b) => b.usage - a.usage)
                            .map((item) => ({
                              ...item,
                              displayName:
                                item.name.length > 15
                                  ? item.name.substring(0, 15) + "..."
                                  : item.name,
                            }))}
                          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                          layout="vertical"
                        >
                          {/* <CartesianGrid strokeDasharray="3 3" /> */}
                          <XAxis type="number" />
                          <YAxis
                            type="category"
                            dataKey="displayName"
                            width={140}
                            tick={{ fontSize: 12 }}
                            interval={0}
                          />
                          <Tooltip
                            formatter={(value) => [`${value} units`, "Usage"]}
                            labelFormatter={(label, payload) => {
                              return payload && payload[0]
                                ? payload[0].payload.name
                                : label;
                            }}
                          />
                          <Legend />
                          <Bar dataKey="usage" name="Usage" fill="#6366F1" >
                            {analyticsData?.inventoryByCategory?.map((entry) => (
                               <>
                                 <LabelList
                                   dataKey="usage"
                                   position="right"
                                   formatter={(value: number) => `${value}`}
                                   fontSize={14}
                                 />
                               </>
                             ))}
                            </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </CardContent>
              </Card>

            </div>
            
            <Card className="shadow">
              <CardHeader>
                <CardTitle>Inventory Cost by Category</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="max-h-[600px] overflow-y-auto pr-2 overflow-x-auto">
                  <div className="min-w-[100%] h-fit">
                    <ResponsiveContainer
                      width="100%"
                      height={analyticsData?.inventoryByCategory?.length * 40 || 600}
                    >
                      <BarChart
                        data={
                          analyticsData?.inventoryByCategory
                            ?.slice()
                            .sort((a, b) => b.cost - a.cost) 
                            .map((item) => ({
                              ...item,
                              displayName:
                                item.name.length > 15
                                  ? item.name.substring(0, 15) + "..."
                                  : item.name,
                            }))
                        }
                        margin={{ top: 20, right: 60, left: 20, bottom: 5 }}
                        layout="vertical"
                      >
                        {/* <CartesianGrid strokeDasharray="3 3" /> */}
                        <XAxis type="number" tickFormatter={(value) => `$${value}`} />
                        <YAxis
                          type="category"
                          dataKey="displayName"
                          width={140}
                          tick={{ fontSize: 12 }}
                          interval={0}
                        />
                        <Tooltip
                          formatter={(value) => [`$${value}`, "Costs"]}
                          labelFormatter={(label, payload) => {
                            return payload && payload[0]
                              ? payload[0].payload.name
                              : label;
                          }}
                        />
                        <Legend />
                        <Bar dataKey="cost" name="Total Cost" fill="#10B981" >
                          {analyticsData?.inventoryByCategory?.map((entry) => (
                               <>
                                 <LabelList
                                   dataKey="cost"
                                   position="right"
                                   formatter={(value: number) => `$${value.toFixed(2)}`}
                                   fontSize={14}
                                 />
                               </>
                             ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </CardContent>
            </Card>

          </TabsContent>

          <TabsContent value="activity">
            <Card className="shadow">
              <CardHeader className="pb-0">
                <CardTitle>Activity Log</CardTitle>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
                  {/* Search Input */}
                  <div className="relative">
                    <Input 
                      placeholder="Search activities..." 
                      id="activity-search"
                      className="pl-8"
                      onChange={(e) => setActivitySearch(e.target.value)}
                      value={activitySearch}
                    />
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  </div>
                  
                  {/* Activity Type Filter */}
                  <div>
                    <Select
                      value={activityTypeFilter}
                      onValueChange={setActivityTypeFilter}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Filter by activity type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Activities</SelectItem>
                        <SelectItem value="login">Login/Logout</SelectItem>
                        <SelectItem value="report">Reports</SelectItem>
                        <SelectItem value="expense">Expenses</SelectItem>
                        <SelectItem value="inventory">Inventory</SelectItem>
                        <SelectItem value="owner">Owners</SelectItem>
                        <SelectItem value="listing">Listings</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flow-root mt-4">
                  <ul className="-my-4 divide-y divide-gray-200">
                    {isLoadingAnalytics ? (
                      <div className="flex items-center justify-center py-10">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        <span className="ml-2">Loading activity data...</span>
                      </div>
                    ) : filteredActivities.length === 0 ? (
                      <div className="text-center py-10">
                        <p className="text-gray-500">No matching activity data found</p>
                      </div>
                    ) : (
                      filteredActivities.map((activity) => {
                        const { icon, bgColor, textColor } = getActivityIcon(activity.action);
                        return (
                          <li key={activity.id} className="py-4">
                            <div className="flex items-start space-x-3">
                              <div className="flex-shrink-0">
                                <span className={`inline-flex items-center justify-center h-8 w-8 rounded-full ${bgColor}`}>
                                  <span className={`${textColor}`}>•</span>
                                </span>
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm text-gray-800">
                                  <span className="font-medium">{getActivityTitle(activity.action)}</span>
                                </p>
                                <p className="text-sm text-gray-500">{activity.details}</p>
                                <p className="text-xs text-gray-500">{formatTime(activity.timestamp)}</p>
                              </div>
                            </div>
                          </li>
                        );
                      })
                    )}
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </DashboardLayout>
  );
}

// Helper functions for activity feed
const getActivityIcon = (action: string) => {
  switch (action) {
    case "PLATFORM_CONNECTED":
    case "PLATFORM_DISCONNECTED":
      return { icon: "fa-sync-alt", bgColor: "bg-blue-100", textColor: "text-blue-600" };
    case "REPORT_GENERATED":
    case "REPORT_SENT":
      return { icon: "fa-receipt", bgColor: "bg-green-100", textColor: "text-green-600" };
    case "LOW_INVENTORY_ALERT":
      return { icon: "fa-exclamation-triangle", bgColor: "bg-red-100", textColor: "text-red-600" };
    case "OWNER_CREATED":
      return { icon: "fa-user-plus", bgColor: "bg-purple-100", textColor: "text-purple-600" };
    case "LISTING_CREATED":
      return { icon: "fa-building", bgColor: "bg-indigo-100", textColor: "text-indigo-600" };
    case "EXPENSE_CREATED":
      return { icon: "fa-dollar-sign", bgColor: "bg-yellow-100", textColor: "text-yellow-600" };
    case "INVENTORY_CREATED":
      return { icon: "fa-boxes", bgColor: "bg-teal-100", textColor: "text-teal-600" };
    case "LOGIN":
    case "LOGOUT":
    case "REGISTRATION":
      return { icon: "fa-user-circle", bgColor: "bg-gray-100", textColor: "text-gray-600" };
    default:
      return { icon: "fa-bell", bgColor: "bg-gray-100", textColor: "text-gray-600" };
  }
};

const getActivityTitle = (action: string) => {
  switch (action) {
    case "PLATFORM_CONNECTED":
      return "Platform connected";
    case "PLATFORM_DISCONNECTED":
      return "Platform disconnected";
    case "REPORT_GENERATED":
      return "Monthly reports generated";
    case "REPORT_SENT":
      return "Monthly reports sent";
    case "LOW_INVENTORY_ALERT":
      return "Low inventory alert";
    case "OWNER_CREATED":
      return "New owner added";
    case "LISTING_CREATED":
      return "New listing added";
    case "EXPENSE_CREATED":
      return "Expense created";
    case "INVENTORY_CREATED":
      return "Inventory item added";
    case "LOGIN":
      return "User login";
    case "LOGOUT":
      return "User logout";
    case "REGISTRATION":
      return "New user registered";
    default:
      return action.toLowerCase().replace(/_/g, ' ');
  }
};

const formatTime = (timestamp: string) => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffInDays === 0) {
    return `Today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  } else if (diffInDays === 1) {
    return `Yesterday at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  } else if (diffInDays < 7) {
    return `${diffInDays} days ago`;
  } else {
    return date.toLocaleDateString();
  }
};