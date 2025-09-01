import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/dashboard-layout";
import StatsCard from "@/components/dashboard/stats-card";
import ExpenseChart from "@/components/dashboard/expense-chart";
import ProfitChart from "@/components/dashboard/profit-chart";
import ProfitInventoryChart from "@/components/dashboard/profit-inventory-chart";
import ActivityFeed from "@/components/dashboard/activity-feed";
// import RecentListings from "@/components/dashboard/recent-listings";
import LowInventory from "@/components/dashboard/low-inventory";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { DashboardData } from "@/lib/types";
import { apiRequest, createQueryKey } from "@/lib/queryClient";

// Type for individual expense items
type ExpenseItem = {
  id: string;
  date: string; // Assuming ISO date string
  totalCost: number;
  billedAmount: number;
  listingId: number;
  ownerId: number;
  inventoryId:number;
  inventoryName:string;
  totalProfit: number;
  listingName: string;
  // any other relevant fields like 'name', 'category' if needed for chart details
};

// Type for the chart data points that ExpenseChart now expects
type ChartDataPoint = {
  listingId: number;
  totalProfit: number;
  listingName: string;
  inventoryId:number;
  inventoryName:string;
  label:string;
  expenses: number;
  profit: number;
};

// --- Helper Functions for Chart Data Processing ---

    const formatDateLabelNew = (date: Date): string => { 
        return date.toLocaleDateString('en-US', {
          month: 'numeric',
          day: 'numeric',
          year: 'numeric',
        }); // ➝ "6/27/2025"
    };
    const formatDateLabelYear = (date: Date): string => { 
      return date.toLocaleDateString('en-US', {
          month: 'short',
          year: 'numeric',
        }); // ➝ "6/27/2025"
    };
    // const formatDateLabel = (date: Date, format: "day" | "month" | "yearDay"): string => {
    //   if (format === "day") return date.toLocaleDateString('default', { weekday: 'short' });
    //   if (format === "month") return date.toLocaleDateString('default', { month: 'short' });
    //   if (format === "yearDay") return date.toLocaleDateString('default', { month: 'short', day: 'numeric' });
    //   return date.toISOString().split('T')[0]; // Fallback, should not be hit with defined types
    // };
    const parseAsLocalDate = (isoString:any) => {
      const localString = isoString.replace('Z', '');
      return new Date(localString);
    };
    const processWeeklyExpenseListingName = (expenses: ExpenseItem[]): ChartDataPoint[] => {
        const today = new Date();
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(today.getDate() - 6);

        //Filter last 7 days' expenses
        const last7DaysExpenses = expenses.filter(expense => {
          const expenseDate = parseAsLocalDate(expense.date);
          return expenseDate >= sevenDaysAgo && expenseDate <= today;
        });

        // Group by listingId and collect profit + listingName
        const groupedData: Record<number, { totalProfit: number; listingName: string }> = {};

        last7DaysExpenses.forEach(expense => {
          const { listingId, listingName = "Unknown" } = expense;
          const totalCost = Number(expense.totalCost);
          const billedAmount = Number(expense.billedAmount);
          const profit = billedAmount - totalCost;

          if (!groupedData[listingId]) {
            groupedData[listingId] = {
              totalProfit: 0,
              listingName
            };
          }

          groupedData[listingId].totalProfit += profit;
        });

        // Convert grouped result into ChartDataPoint[]
        return Object.entries(groupedData).map(([listingId, data]) => ({
          listingId: Number(listingId),
          listingName: data.listingName,
          totalProfit: parseFloat(data.totalProfit.toFixed(2)),
          label:'',
          expenses: 0,
          profit: 0,
          inventoryId:0,
          inventoryName:''
        }));
    };


    const processMonthlyExpensesListingName = (expenses: ExpenseItem[]): ChartDataPoint[] => {
      const today = new Date();
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(today.getMonth() - 1);

      //  Filter last month expenses
      const last7DaysExpenses = expenses.filter(expense => {
        const expenseDate = parseAsLocalDate(expense.date);
        return expenseDate >= oneMonthAgo && expenseDate <= today;
      });

      //  Group by listingId and collect profit + listingName
        const groupedData: Record<number, { totalProfit: number; listingName: string }> = {};

        last7DaysExpenses.forEach(expense => {
          const { listingId, listingName = "Unknown" } = expense;
          const totalCost = Number(expense.totalCost);
          const billedAmount = Number(expense.billedAmount);
          const profit = billedAmount - totalCost;

          if (!groupedData[listingId]) {
            groupedData[listingId] = {
              totalProfit: 0,
              listingName
            };
          }

          groupedData[listingId].totalProfit += profit;
        });

        // Convert grouped result into ChartDataPoint[]
        return Object.entries(groupedData).map(([listingId, data]) => ({
          listingId: Number(listingId),
          listingName: data.listingName,
          totalProfit: parseFloat(data.totalProfit.toFixed(2)),
          label:'',
          expenses: 0,
          profit: 0,
          inventoryId:0,
          inventoryName:''
        }));
    };

    const processYearlyExpensesListingName = (expenses: ExpenseItem[]): ChartDataPoint[] => {
      const today = new Date();
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(today.getFullYear() - 1);

      //  Filter last year expenses
      const last7DaysExpenses = expenses.filter(expense => {
        const expenseDate = parseAsLocalDate(expense.date);
        return expenseDate >= oneYearAgo && expenseDate <= today;
      });

      // Group by listingId and collect profit + listingName
        const groupedData: Record<number, { totalProfit: number; listingName: string }> = {};

        last7DaysExpenses.forEach(expense => {
          const { listingId, listingName = "Unknown" } = expense;
          const totalCost = Number(expense.totalCost);
          const billedAmount = Number(expense.billedAmount);
          const profit = billedAmount - totalCost;

          if (!groupedData[listingId]) {
            groupedData[listingId] = {
              totalProfit: 0,
              listingName
            };
          }

          groupedData[listingId].totalProfit += profit;
        });

        // Convert grouped result into ChartDataPoint[]
        return Object.entries(groupedData).map(([listingId, data]) => ({
          listingId: Number(listingId),
          listingName: data.listingName,
          totalProfit: parseFloat(data.totalProfit.toFixed(2)),
          label:'',
          expenses: 0,
          profit: 0,
          inventoryId:0,
          inventoryName:''
        }));
    };

    const processWeeklyExpenseInventoryName = (expenses: ExpenseItem[]): ChartDataPoint[] => {
        const today = new Date();
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(today.getDate() - 6);

        // Filter last 7 days' expenses
        const last7DaysExpenses = expenses.filter(expense => {
          const expenseDate = parseAsLocalDate(expense.date);
          return expenseDate >= sevenDaysAgo && expenseDate <= today;
        });

        // Group by InventoryId and collect profit + InventoryName
        const groupedData: Record<number, { totalProfit: number; inventoryName: string }> = {};

        last7DaysExpenses.forEach(expense => {
          const { inventoryId, inventoryName = "Unknown" } = expense;
          const totalCost = Number(expense.totalCost);
          const billedAmount = Number(expense.billedAmount);
          const profit = billedAmount - totalCost;

          if (!groupedData[inventoryId]) {
            groupedData[inventoryId] = {
              totalProfit: 0,
              inventoryName
            };
          }

          groupedData[inventoryId].totalProfit += profit;
        });

        //Convert grouped result into ChartDataPoint[]
        return Object.entries(groupedData).map(([inventoryId, data]) => ({
          listingId: 0,
          listingName: '',
          totalProfit: parseFloat(data.totalProfit.toFixed(2)),
          label:'',
          expenses: 0,
          profit: 0,
          inventoryId:Number(inventoryId),
          inventoryName:data.inventoryName
        }));
    };


    const processMonthlyExpensesInventoryName = (expenses: ExpenseItem[]): ChartDataPoint[] => {
      const today = new Date();
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(today.getMonth() - 1);

      // Filter last month expenses
      const last7DaysExpenses = expenses.filter(expense => {
        const expenseDate = parseAsLocalDate(expense.date);
        return expenseDate >= oneMonthAgo && expenseDate <= today;
      });

      //Group by InventoryId and collect profit + InventoryName
        const groupedData: Record<number, { totalProfit: number; inventoryName: string }> = {};

        last7DaysExpenses.forEach(expense => {
          const { inventoryId, inventoryName = "Unknown" } = expense;
          const totalCost = Number(expense.totalCost);
          const billedAmount = Number(expense.billedAmount);
          const profit = billedAmount - totalCost;

          if (!groupedData[inventoryId]) {
            groupedData[inventoryId] = {
              totalProfit: 0,
              inventoryName
            };
          }

          groupedData[inventoryId].totalProfit += profit;
        });

        //Convert grouped result into ChartDataPoint[]
        return Object.entries(groupedData).map(([inventoryId, data]) => ({
          listingId: 0,
          listingName: '',
          totalProfit: parseFloat(data.totalProfit.toFixed(2)),
          label:'',
          expenses: 0,
          profit: 0,
          inventoryId:Number(inventoryId),
          inventoryName:data.inventoryName
        }));
    };

    const processYearlyExpensesInventoryName = (expenses: ExpenseItem[]): ChartDataPoint[] => {
      const today = new Date();
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(today.getFullYear() - 1);

      //Filter last year expenses
      const last7DaysExpenses = expenses.filter(expense => {
        const expenseDate = parseAsLocalDate(expense.date);
        return expenseDate >= oneYearAgo && expenseDate <= today;
      });

      // Group by InventoryId and collect profit + InventoryName
        const groupedData: Record<number, { totalProfit: number; inventoryName: string }> = {};

        last7DaysExpenses.forEach(expense => {
          const { inventoryId, inventoryName = "Unknown" } = expense;
          const totalCost = Number(expense.totalCost);
          const billedAmount = Number(expense.billedAmount);
          const profit = billedAmount - totalCost;

          if (!groupedData[inventoryId]) {
            groupedData[inventoryId] = {
              totalProfit: 0,
              inventoryName
            };
          }

          groupedData[inventoryId].totalProfit += profit;
        });

        //Convert grouped result into ChartDataPoint[]
        return Object.entries(groupedData).map(([inventoryId, data]) => ({
          listingId: 0,
          listingName: '',
          totalProfit: parseFloat(data.totalProfit.toFixed(2)),
          label:'',
          expenses: 0,
          profit: 0,
          inventoryId:Number(inventoryId),
          inventoryName:data.inventoryName
        }));
    };  
    const processWeeklyExpenses = (expenses: ExpenseItem[]): ChartDataPoint[] => {
        const today = new Date();
        const weekData: ChartDataPoint[] = [];
        let cumulativeExpenses = 0;
        let cumulativeProfit = 0;

        for (let i = 6; i >= 0; i--) {
          const day = new Date(today);
          day.setDate(today.getDate() - i);
          day.setHours(0, 0, 0, 0);

          const dailyExpensesForPoint = expenses.filter(expense => {
            const expenseDate = parseAsLocalDate(expense.date);
            return expenseDate.toDateString() === day.toDateString();
        });

          let pointTotalExpenses = 0;
          let pointTotalProfit = 0;
          dailyExpensesForPoint.forEach(e => {
            pointTotalExpenses += Number(e.totalCost || 0);
            pointTotalProfit += (Number(e.billedAmount || 0) - Number(e.totalCost || 0));
          });
          
          cumulativeExpenses = pointTotalExpenses;
          cumulativeProfit = pointTotalProfit;

          weekData.push({
            label: formatDateLabelNew(day),
            expenses: parseFloat(cumulativeExpenses.toFixed(2)),
            profit: parseFloat(cumulativeProfit.toFixed(2)),
            listingId: Number(0),
            listingName: '',
            totalProfit: 0,
            inventoryId:0,
            inventoryName:''
          });
        }
        return weekData;
    };

    const processMonthlyExpenses = (expenses: ExpenseItem[], daysInView = 30): ChartDataPoint[] => {
        const today = new Date();
        const monthData: ChartDataPoint[] = [];
        let cumulativeExpenses = 0;
        let cumulativeProfit = 0;

        for (let i = daysInView - 1; i >= 0; i--) {
          const day = new Date(today);
          day.setDate(today.getDate() - i);
          day.setHours(0, 0, 0, 0);

          const dailyExpensesForPoint = expenses.filter(expense => {
            const expenseDate = parseAsLocalDate(expense.date);
            return expenseDate.toDateString() === day.toDateString();
        });

          let pointTotalExpenses = 0;
          let pointTotalProfit = 0;
          dailyExpensesForPoint.forEach(e => {
            pointTotalExpenses += Number(e.totalCost || 0);
            pointTotalProfit += (Number(e.billedAmount || 0) - Number(e.totalCost || 0));
          });

          cumulativeExpenses = pointTotalExpenses;
          cumulativeProfit = pointTotalProfit;

          monthData.push({
            label: formatDateLabelNew(day),
            expenses: parseFloat(cumulativeExpenses.toFixed(2)),
            profit: parseFloat(cumulativeProfit.toFixed(2)),
            listingId: Number(0),
            listingName: '',
            totalProfit: 0,
            inventoryId:0,
            inventoryName:''
          });
        }
        return monthData;
    };

    const processYearlyExpenses = (expenses: ExpenseItem[]): ChartDataPoint[] => {
        const today = new Date();
        const yearData: ChartDataPoint[] = [];
        let cumulativeExpenses = 0;
        let cumulativeProfit = 0;

        for (let i = 11; i >= 0; i--) {
          const monthReferenceDate = new Date(today.getFullYear(), today.getMonth() - i, 1);
          
          const monthlyExpensesForPoint = expenses.filter(expense => {
            const expenseDate = parseAsLocalDate(expense.date);
            return expenseDate.getFullYear() === monthReferenceDate.getFullYear() &&
                  expenseDate.getMonth() === monthReferenceDate.getMonth();
        });

          let pointTotalExpenses = 0;
          let pointTotalProfit = 0;
          monthlyExpensesForPoint.forEach(e => {
            pointTotalExpenses += Number(e.totalCost || 0);
            pointTotalProfit += (Number(e.billedAmount || 0) - Number(e.totalCost || 0));
          });

          cumulativeExpenses = pointTotalExpenses;
          cumulativeProfit = pointTotalProfit;

          yearData.push({
            label: formatDateLabelYear(monthReferenceDate) ,
            expenses: parseFloat(cumulativeExpenses.toFixed(2)),
            profit: parseFloat(cumulativeProfit.toFixed(2)),
            listingId: Number(0),
            listingName: '',
            totalProfit: 0,
            inventoryId:0,
            inventoryName:''
          });
        }
        return yearData;
    };

// Helper function to generate a description for activity logs (Restored)
function getActivityDescription(activity: any): string {
  const { action, context } = activity;
  
  switch (action) {
    case "LOGIN":
      return "User logged in to the system";
    case "LOGOUT":
      return "User logged out of the system";
    case "LISTING_CREATED":
      return `Created new property: ${context?.name || 'New property'}`;
    case "LISTING_UPDATED":
      return `Updated property: ${context?.name || 'Property updated'}`;
    case "OWNER_CREATED":
      return `Added new owner: ${context?.name || 'New owner'}`;
    case "OWNER_UPDATED":
      return `Updated owner information: ${context?.name || 'Owner updated'}`;
    case "EXPENSE_CREATED":
      return `Recorded new expense: $${context?.amount || '0.00'}`;
    case "INVENTORY_CREATED":
      return `Added new inventory item: ${context?.name || 'New item'}`;
    case "INVENTORY_UPDATED":
      return `Updated inventory item: ${context?.name || 'Item updated'}`;
    case "INVENTORY_REFILLED":
      return `Refilled inventory item: ${context?.name || 'Item refilled'}`;
    default:
      return `${action.toLowerCase().replace(/_/g, ' ')}`;
  }
}

export default function DashboardPage() {
  const { toast } = useToast();
  const { user, checkSession } = useAuth();
  
  const { data, isLoading, error, refetch } = useQuery<DashboardData>({ // DashboardData will be updated
    queryKey: createQueryKey("/api/dashboard"),
    queryFn: async () => {
      await checkSession();
      const response = await apiRequest("GET", "/api/dashboard");
      
      console.log("Dashboard data received:", response);
      
      // Default empty structure for the new chart data
      const emptyChartData: {
        weekData: ChartDataPoint[];
        monthData: ChartDataPoint[];
        yearData: ChartDataPoint[];
      } = {
        weekData: [],
        monthData: [],
        yearData: [],
      };

      if (response && response.authenticated && response.message === "User is authenticated") {
        console.log("Received auth-only response, fetching actual dashboard data components");
        
        const emptyDashboardDataPartial: Omit<DashboardData, 'expenseChartData'> & {
          expenseChartData: typeof emptyChartData;
          ProfitChartData: typeof emptyChartData;
          ProfitInventoryChartData: typeof emptyChartData;
        } = {
          totalListings: 0,
          totalOwners: 0,
          totalInventoryItems: 0,
          monthlyProfit: 0,
          monthlyRevenue:0,
          expenseChartData: { ...emptyChartData },
          ProfitChartData: { ...emptyChartData },
          ProfitInventoryChartData: { ...emptyChartData },
          recentActivity: [],
          recentListings: [],
          lowInventoryItems: []
        };
        
        try {
          const listings = await apiRequest("GET", "/api/listings");
          if (Array.isArray(listings)) {
            emptyDashboardDataPartial.totalListings = listings.length;
            emptyDashboardDataPartial.recentListings = listings.slice(0, 5);
          }
          
          const owners = await apiRequest("GET", "/api/owners");
          if (Array.isArray(owners)) {
            emptyDashboardDataPartial.totalOwners = owners.length;
          }
          
          const inventory = await apiRequest("GET", "/api/inventory");
          if (Array.isArray(inventory)) {
            emptyDashboardDataPartial.totalInventoryItems = inventory.length;
            emptyDashboardDataPartial.lowInventoryItems = inventory
              .filter(item => item.quantity <= (item.minQuantity || 10))
              .slice(0, 5)
              .map(item => ({
                id: item.id,
                name: item.name,
                category: item.category,
                quantity: item.quantity,
                minQuantity: item.minQuantity || 10
              }));
          }
          
          const expensesData: ExpenseItem[] = await apiRequest("GET", "/api/expenses") || [];
          const expensesRaw = expensesData
            .filter((expense) => {
                const listing = listings.find((val: any) => val.id === expense.listingId);
                const owner = owners.find((val: any) => val.id === expense.ownerId);
                const item = expense.inventoryId ? inventory.find((val: any) => val.id === expense.inventoryId) : null;
                return listing && owner && (!expense.inventoryId || item);
            })
            .map((expense) => {
                const listing = listings.find((val: any) => val.id === expense.listingId);
                const item = expense.inventoryId ? inventory.find((val: any) => val.id === expense.inventoryId) : null;
                return {
                  ...expense,
                  listingName: listing?.name || "Unknown",
                  inventoryName: item?.name || "Unknown",
                };
            });
          if (Array.isArray(expensesRaw)) {
            const currentMonth = new Date().getMonth();
            const currentYear = new Date().getFullYear();
            
            const thisMonthExpenses = expensesRaw.filter(expense => {
              const expenseDate = parseAsLocalDate(expense.date);
              return expenseDate.getMonth() === currentMonth && 
                     expenseDate.getFullYear() === currentYear;
            });
            const profit = thisMonthExpenses.reduce((sum, expense) => {
              return sum + (Number(expense.billedAmount) - Number(expense.totalCost));
            }, 0);

            const revenue = thisMonthExpenses.reduce((sum, expense) => {
              return sum + (Number(expense.billedAmount));
            }, 0);

            emptyDashboardDataPartial.monthlyProfit = parseFloat(profit.toFixed(2));
            emptyDashboardDataPartial.monthlyRevenue = (parseFloat(profit.toFixed(2))/parseFloat(revenue.toFixed(2))) * 100;
            // const expensesWithListingName = expensesRaw.map(expense => {
            //   const listing = listings.find((val:any) => val.id === expense.listingId);
            //   return {
            //     ...expense,
            //     listingName: listing?.name || "Unknown"
            //   };
            // });

            // const expensesWithInventoryName = expensesRaw.map(expense => {
            //   const inventorys = inventory.find((val:any) => val.id === expense.inventoryId);
            //   return {
            //     ...expense,
            //     inventoryName: inventorys?.name || "Unknown"
            //   };
            // });
            emptyDashboardDataPartial.expenseChartData = {
              weekData: processWeeklyExpenseListingName(expensesRaw),
              monthData: processMonthlyExpensesListingName(expensesRaw),
              yearData: processYearlyExpensesListingName(expensesRaw),
            };
            emptyDashboardDataPartial.ProfitChartData = {
              weekData: processWeeklyExpenses(expensesRaw),
              monthData: processMonthlyExpenses(expensesRaw),
              yearData: processYearlyExpenses(expensesRaw),
            };
            emptyDashboardDataPartial.ProfitInventoryChartData = {
              weekData: processWeeklyExpenseInventoryName(expensesRaw),
              monthData: processMonthlyExpensesInventoryName(expensesRaw),
              yearData: processYearlyExpensesInventoryName(expensesRaw),
            };
          }
          
          try {
            const activities = await apiRequest("GET", "/api/activity");
            if (Array.isArray(activities)) {
              emptyDashboardDataPartial.recentActivity = activities
                .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                .slice(0, 5)
                .map(activity => ({
                  id: activity.id,
                  action: activity.action,
                  details: activity.details || getActivityDescription(activity),
                  timestamp: activity.timestamp,
                  userId: activity.userId,
                  userName: activity.userName || user?.firstName || 'User'
                }));
            }
          } catch (actError) {
            console.warn("Could not fetch activity logs:", actError);
          }
          
          return emptyDashboardDataPartial as DashboardData; // Cast to DashboardData
        } catch (err) {
          console.error("Error fetching dashboard data components:", err);
          return { ...emptyDashboardDataPartial, expenseChartData: { ...emptyChartData }, ProfitInventoryChartData: { ...emptyChartData },  ProfitChartData :{ ...emptyChartData }} as DashboardData; // Cast
        }
      }
      
      // Process main response if it contains all data
      const allExpenses: ExpenseItem[] = response?.expenses || []; // Assuming expenses might be directly in response
      return {
        totalListings: response?.totalListings || 0,
        totalOwners: response?.totalOwners || 0,
        totalInventoryItems: response?.totalInventoryItems || 0,
        monthlyProfit: response?.monthlyProfit || 0,
        monthlyRevenue: 0,
        expenseChartData: {
          weekData: processWeeklyExpenseListingName(allExpenses),
          monthData: processMonthlyExpensesListingName(allExpenses),
          yearData: processYearlyExpensesListingName(allExpenses),
        },
        ProfitInventoryChartData: {
          weekData: processWeeklyExpenseInventoryName(allExpenses),
          monthData: processMonthlyExpensesInventoryName(allExpenses),
          yearData: processYearlyExpensesInventoryName(allExpenses),
        },
        ProfitChartData: {
          weekData: processWeeklyExpenses(allExpenses),
          monthData: processMonthlyExpenses(allExpenses),
          yearData: processYearlyExpenses(allExpenses),
        },
        recentActivity: response?.recentActivity?.map((act: any) => ({ ...act, details: act.details || getActivityDescription(act) })) || [],
        recentListings: response?.recentListings || [],
        lowInventoryItems: response?.lowInventoryItems || []
      };
    },
    retry: 1,
    retryDelay: 1000
  });
  
  // useEffect(() => {
  //   checkSession().then((authenticated) => {
  //     if (!authenticated) {
  //       toast({
  //         title: "Session expired",
  //         description: "Please login again to continue",
  //         variant: "destructive",
  //       });
  //     }
  //   });
  // }, [checkSession, toast]);
  
  useEffect(() => {
    if (error) {
      toast({
        title: "Failed to load dashboard data",
        description: (error as Error).message,
        variant: "destructive",
      });
    }
  }, [error, toast]);
  
  const handleRefreshData = () => {
    toast({
      title: "Refreshing data",
      description: "Getting latest property data...",
    });
    refetch().then(() => {
      toast({
        title: "Data refreshed",
        description: "Dashboard data has been updated",
      });
    }).catch((err) => {
      toast({
        title: "Refresh failed",
        description: (err as Error).message,
        variant: "destructive",
      });
    });
  };
  
  return (
    <DashboardLayout
      title={`Welcome, ${user?.firstName || 'User'}`}
      actions={
        <>
          <Button
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-blue-600"
            onClick={handleRefreshData}
          >
            Refresh Data
          </Button>
        </>
      }
    >
      {/* Stats Cards */}
      <div className="mb-8">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5">
          {isLoading ? (
            Array(4).fill(0).map((_, i) => (
              <div key={i} className="bg-white overflow-hidden shadow rounded-lg h-32 animate-pulse">
                <div className="p-5 h-full flex flex-col justify-between">
                  <div className="bg-gray-200 h-6 w-2/3 rounded"></div>
                  <div className="bg-gray-200 h-8 w-1/3 rounded"></div>
                  <div className="bg-gray-200 h-4 w-1/2 rounded"></div>
                </div>
              </div>
            ))
          ) : (
            <>
              <StatsCard
                title="Total Properties"
                value={data?.totalListings || 0}
                icon="fa-home"
                iconColor="text-primary"
                link="/listings"
                linkText="View all"
              />
              <StatsCard
                title="Active Owners"
                value={data?.totalOwners || 0}
                icon="fa-users"
                iconColor="text-secondary"
                link="/owners"
                linkText="Manage owners"
              />
              <StatsCard
                title="Inventory Items"
                value={data?.totalInventoryItems || 0}
                icon="fa-boxes"
                iconColor="text-yellow-500"
                link="/inventory"
                linkText="View inventory"
              />
              <StatsCard
                title="Monthly Profit (Markup)"
                value={`$${(data?.monthlyProfit || 0).toFixed(2)}`}
                icon="fa-dollar-sign"
                iconColor="text-green-500"
                link="/analytics"
                linkText="View analytics"
              />
              <StatsCard
                title="Profit Margin (Monthly)"
                value={`${(data?.monthlyRevenue || 0).toFixed(2)}%`}
                icon="fa-dollar-sign"
                iconColor="text-green-500"
                link="/analytics"
                linkText="View analytics"
              />
            </>
          )}
        </div>
      </div>

      {/* Expense Trends Chart & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-8">
        <div className="lg:col-span-2">
          {isLoading ? (
            <div className="bg-white shadow rounded-lg h-80 animate-pulse">
              <div className="px-5 py-4 border-b border-gray-200">
                <div className="bg-gray-200 h-6 w-1/3 rounded"></div>
              </div>
              <div className="p-5 flex items-center justify-center h-64">
                <div className="bg-gray-200 h-full w-full rounded"></div>
              </div>
            </div>
          ) : (
            <ProfitChart 
              weekData={data?.ProfitChartData?.weekData || []}
              monthData={data?.ProfitChartData?.monthData || []}
              yearData={data?.ProfitChartData?.yearData || []}
            />
          )}
        </div>

        {/* <div>
          {isLoading ? (
            <div className="bg-white shadow rounded-lg h-80 animate-pulse">
              <div className="px-5 py-4 border-b border-gray-200">
                <div className="bg-gray-200 h-6 w-1/3 rounded"></div>
              </div>
              <div className="p-5">
                {Array(4).fill(0).map((_, i) => (
                  <div key={i} className="flex items-start space-x-3 mb-4">
                    <div className="flex-shrink-0 bg-gray-200 h-8 w-8 rounded-full"></div>
                    <div className="flex-1">
                      <div className="bg-gray-200 h-4 w-2/3 rounded mb-2"></div>
                      <div className="bg-gray-200 h-3 w-1/2 rounded"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <ActivityFeed activities={data?.recentActivity || []} />
          )}
        </div> */}
      </div>
{/* Recent Listings & Low Inventory Items */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div>
              {/* {isLoading ? (
            <div className="bg-white shadow rounded-lg h-96 animate-pulse">
              <div className="px-5 py-4 border-b border-gray-200">
                <div className="bg-gray-200 h-6 w-1/3 rounded"></div>
              </div>
              <div className="p-5">
                {Array(3).fill(0).map((_, i) => (
                  <div key={i} className="flex items-center space-x-4 mb-4">
                    <div className="flex-shrink-0 bg-gray-200 h-12 w-12 rounded-md"></div>
                    <div className="flex-1">
                      <div className="bg-gray-200 h-4 w-2/3 rounded mb-2"></div>
                      <div className="bg-gray-200 h-3 w-1/2 rounded mb-2"></div>
                      <div className="bg-gray-200 h-3 w-1/3 rounded"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <RecentListings listings={data?.recentListings || []} />
          )} */}
          {isLoading ? (
            <div className="bg-white shadow rounded-lg h-80 animate-pulse">
              <div className="px-5 py-4 border-b border-gray-200">
                <div className="bg-gray-200 h-6 w-1/3 rounded"></div>
              </div>
              <div className="p-5 flex items-center justify-center h-64">
                <div className="bg-gray-200 h-full w-full rounded"></div>
              </div>
            </div>
          ) : (
            <ExpenseChart 
              weekData={data?.expenseChartData?.weekData || []}
              monthData={data?.expenseChartData?.monthData || []}
              yearData={data?.expenseChartData?.yearData || []}
            />
          )}
        </div>

        <div>
          {/* {isLoading ? (
            <div className="bg-white shadow rounded-lg h-96 animate-pulse">
              <div className="px-5 py-4 border-b border-gray-200">
                <div className="bg-gray-200 h-6 w-1/3 rounded"></div>
              </div>
              <div className="p-5">
                <table className="min-w-full">
                  <thead>
                    <tr>
                      {Array(4).fill(0).map((_, i) => (
                        <th key={i} className="pb-2">
                          <div className="bg-gray-200 h-4 w-full rounded"></div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Array(3).fill(0).map((_, i) => (
                      <tr key={i}>
                        {Array(4).fill(0).map((_, j) => (
                          <td key={j} className="py-2">
                            <div className="bg-gray-200 h-6 w-full rounded"></div>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <LowInventory items={data?.lowInventoryItems || []} />
          )} */}
          {isLoading ? (
            <div className="bg-white shadow rounded-lg h-80 animate-pulse">
              <div className="px-5 py-4 border-b border-gray-200">
                <div className="bg-gray-200 h-6 w-1/3 rounded"></div>
              </div>
              <div className="p-5 flex items-center justify-center h-64">
                <div className="bg-gray-200 h-full w-full rounded"></div>
              </div>
            </div>
          ) : (
            <ProfitInventoryChart 
              weekData={data?.ProfitInventoryChartData?.weekData || []}
              monthData={data?.ProfitInventoryChartData?.monthData || []}
              yearData={data?.ProfitInventoryChartData?.yearData || []}
            />
          )}
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 my-8">
        <div className="">
          {isLoading ? (
            <div className="bg-white shadow rounded-lg h-80 animate-pulse">
              <div className="px-5 py-4 border-b border-gray-200">
                <div className="bg-gray-200 h-6 w-1/3 rounded"></div>
              </div>
              <div className="p-5">
                {Array(4).fill(0).map((_, i) => (
                  <div key={i} className="flex items-start space-x-3 mb-4">
                    <div className="flex-shrink-0 bg-gray-200 h-8 w-8 rounded-full"></div>
                    <div className="flex-1">
                      <div className="bg-gray-200 h-4 w-2/3 rounded mb-2"></div>
                      <div className="bg-gray-200 h-3 w-1/2 rounded"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <ActivityFeed activities={data?.recentActivity || []} />
          )}
        </div>
          <div>
          {isLoading ? (
            <div className="bg-white shadow rounded-lg h-96 animate-pulse">
              <div className="px-5 py-4 border-b border-gray-200">
                <div className="bg-gray-200 h-6 w-1/3 rounded"></div>
              </div>
              <div className="p-5">
                <table className="min-w-full">
                  <thead>
                    <tr>
                      {Array(4).fill(0).map((_, i) => (
                        <th key={i} className="pb-2">
                          <div className="bg-gray-200 h-4 w-full rounded"></div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Array(3).fill(0).map((_, i) => (
                      <tr key={i}>
                        {Array(4).fill(0).map((_, j) => (
                          <td key={j} className="py-2">
                            <div className="bg-gray-200 h-6 w-full rounded"></div>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <LowInventory items={data?.lowInventoryItems || []} />
          )}
        </div>
      </div>

      
    </DashboardLayout>
  );
}
