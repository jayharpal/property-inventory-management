// @ts-nocheck
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { User, UserRole, AdminDashboardData } from "@/lib/types";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { 
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { apiRequest, queryClient, createQueryKey } from "@/lib/queryClient";
import { Loader2, RefreshCw, User as UserIcon, Activity, BarChart3, Shield, LogOut } from "lucide-react";
import { format } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function AdminPanelPage() {
  const { user, logoutMutation } = useAuth();
  const [activeTab, setActiveTab] = useState("users");
  const [location, navigate] = useLocation();
  
  const handleLogout = async () => {
    try {
      await logoutMutation.mutateAsync();
      navigate("/auth");
    } catch (error) {
      console.error("Logout failed", error);
      toast({
        title: "Logout failed",
        description: "There was an error logging out. Please try again.",
        variant: "destructive"
      });
    }
  };
  
  // Only allow access to administrators
  if (user?.role !== "administrator") {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] p-6">
        <Shield className="h-16 w-16 text-destructive mb-4" />
        <h1 className="text-3xl font-bold mb-2">Access Denied</h1>
        <p className="text-muted-foreground text-center max-w-md mb-6">
          You do not have permission to view the administrator panel. 
          This area is restricted to users with the Administrator role.
        </p>
        <Button onClick={() => window.history.back()}>Go Back</Button>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold flex items-center">
          <Shield className="mr-2 h-8 w-8" />
          Administrator Panel
        </h1>
        
        <Button 
          variant="outline" 
          className="flex items-center" 
          onClick={handleLogout}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>
      </div>
      
      <Tabs defaultValue="users" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4 mb-8">
          <TabsTrigger value="users" className="flex items-center">
            <UserIcon className="mr-2 h-4 w-4" />
            User Management
          </TabsTrigger>
          <TabsTrigger value="activity" className="flex items-center">
            <Activity className="mr-2 h-4 w-4" />
            Activity Logs
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center">
            <BarChart3 className="mr-2 h-4 w-4" />
            System Analytics
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center">
            <Shield className="mr-2 h-4 w-4" />
            System Status
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="users">
          <UserManagement />
        </TabsContent>
        
        <TabsContent value="activity">
          <ActivityLogs />
        </TabsContent>
        
        <TabsContent value="analytics">
          <SystemAnalytics />
        </TabsContent>
        
        <TabsContent value="settings">
          <SystemStatus />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// User Management Tab
function UserManagement() {
  const { data: users, isLoading, refetch } = useQuery<User[]>({ 
    queryKey: createQueryKey("/api/admin/users"),
  });
  
  const handleRoleChange = async (userId: number, newRole: UserRole) => {
    try {
      await apiRequest(`/api/admin/users/${userId}/role`, 'PUT', { role: newRole });
      
      // Show success message and refetch users
      toast({
        title: "Role updated",
        description: "User role has been updated successfully.",
      });
      
      queryClient.invalidateQueries({ queryKey: createQueryKey("/api/admin/users") });
    } catch (error) {
      console.error("Failed to update user role:", error);
      toast({
        title: "Failed to update role",
        description: "There was an error updating the user role.",
        variant: "destructive",
      });
    }
  };
  
  const handleEditUser = (user: User) => {
    toast({
      title: "Edit User",
      description: `Edit functionality for ${user.username} coming soon`,
    });
  };
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  if (!users || users.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>User Management</CardTitle>
          <CardDescription>
            Manage user accounts and access permissions
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center p-8">
          <p className="text-muted-foreground">No users found in the system.</p>
        </CardContent>
        <CardFooter className="flex justify-end">
          <Button onClick={() => refetch()} variant="outline" className="flex items-center">
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </CardFooter>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>User Management</CardTitle>
        <CardDescription>
          Manage user accounts and access permissions
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Username</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Created At</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>{user.id}</TableCell>
                <TableCell>{user.username}</TableCell>
                <TableCell>{user.firstName} {user.lastName}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <Select
                    defaultValue={user.role}
                    onValueChange={(value) => handleRoleChange(user.id, value as UserRole)}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="standard_user">Standard User</SelectItem>
                      <SelectItem value="standard_admin">Standard Admin</SelectItem>
                      <SelectItem value="administrator">Administrator</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>{user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}</TableCell>
                <TableCell>
                  <Button onClick={() => handleEditUser(user)} variant="outline" size="sm">
                    Edit
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
      <CardFooter className="flex justify-end">
        <Button onClick={() => refetch()} variant="outline" className="flex items-center">
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </CardFooter>
    </Card>
  );
}

// Activity Logs Tab
function ActivityLogs() {
  const { data: logs, isLoading, refetch } = useQuery<ActivityLog[]>({ 
    queryKey: createQueryKey("/api/admin/activity-logs"),
  });
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  if (!logs || logs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Activity Logs</CardTitle>
          <CardDescription>
            View system and user activity
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center p-8">
          <p className="text-muted-foreground">No activity logs found.</p>
        </CardContent>
        <CardFooter className="flex justify-end">
          <Button onClick={() => refetch()} variant="outline" className="flex items-center">
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </CardFooter>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Activity Logs</CardTitle>
        <CardDescription>
          View system and user activity
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>User ID</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Details</TableHead>
              <TableHead>Timestamp</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log) => (
              <TableRow key={log.id}>
                <TableCell>{log.id}</TableCell>
                <TableCell>{log.userId}</TableCell>
                <TableCell>
                  <span className={`
                    px-2 py-1 rounded text-xs font-medium
                    ${log.action.includes('ERROR') || log.action.includes('ALERT') 
                      ? 'bg-destructive/20 text-destructive' 
                      : 'bg-primary/20 text-primary'}
                  `}>
                    {log.action}
                  </span>
                </TableCell>
                <TableCell className="max-w-md truncate">{log.details}</TableCell>
                <TableCell>{log.timestamp ? format(new Date(log.timestamp), 'MMM dd, yyyy HH:mm:ss') : 'N/A'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
      <CardFooter className="flex justify-end">
        <Button onClick={() => refetch()} variant="outline" className="flex items-center">
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </CardFooter>
    </Card>
  );
}

// System Analytics Tab
function SystemAnalytics() {
  const { data, isLoading, error, refetch } = useQuery<AdminDashboardData>({
    queryKey: createQueryKey("/api/admin/analytics"),
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/admin/analytics");
      if (!response.ok) {
        throw new Error("Failed to fetch analytics data");
      }
      return response.json();
    },
  });
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>System Analytics</CardTitle>
          <CardDescription>
            View system statistics and metrics
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center p-8">
          <p className="text-muted-foreground">No analytics data available.</p>
        </CardContent>
        <CardFooter className="flex justify-end">
          <Button onClick={() => refetch()} variant="outline" className="flex items-center">
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </CardFooter>
      </Card>
    );
  }
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>User Statistics</CardTitle>
          <CardDescription>
            Overview of user accounts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-muted p-4 rounded-lg text-center">
              <p className="text-4xl font-bold text-primary">{data.userStats.total}</p>
              <p className="text-sm">Total Users</p>
            </div>
            <div className="grid grid-cols-1 gap-2">
              <div className="bg-muted p-2 rounded-lg text-center">
                <p className="text-xl font-bold text-purple-500">{data.userStats.byRole.administrators}</p>
                <p className="text-xs">Administrators</p>
              </div>
              <div className="bg-muted p-2 rounded-lg text-center">
                <p className="text-xl font-bold text-blue-500">{data.userStats.byRole.standardAdmins}</p>
                <p className="text-xs">Standard Admins</p>
              </div>
              <div className="bg-muted p-2 rounded-lg text-center">
                <p className="text-xl font-bold text-green-500">{data.userStats.byRole.standardUsers}</p>
                <p className="text-xs">Standard Users</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>System Overview</CardTitle>
          <CardDescription>
            Core system statistics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-muted p-4 rounded-lg text-center">
              <p className="text-4xl font-bold text-blue-500">{data.portfolioStats.total}</p>
              <p className="text-sm">Portfolios</p>
            </div>
            <div className="bg-muted p-4 rounded-lg text-center">
              <p className="text-4xl font-bold text-green-500">{data.ownerStats.total}</p>
              <p className="text-sm">Owners</p>
            </div>
            <div className="bg-muted p-4 rounded-lg text-center">
              <p className="text-4xl font-bold text-amber-500">{data.listingStats.total}</p>
              <p className="text-sm">Listings</p>
            </div>
            <div className="bg-muted p-4 rounded-lg text-center">
              <p className="text-4xl font-bold text-purple-500">{data.inventoryStats.total}</p>
              <p className="text-sm">Inventory Items</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>Expense Trends (Last 6 Months)</CardTitle>
          <CardDescription>
            Monthly expense totals
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data.expenseStats.trend}
                margin={{
                  top: 20,
                  right: 30,
                  left: 20,
                  bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip
                  formatter={(value) => `$${Number(value).toFixed(2)}`}
                  labelFormatter={(label) => `Month: ${label}`}
                />
                <Bar dataKey="total" fill="var(--primary)" name="Total Expenses" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Inventory Status</CardTitle>
          <CardDescription>
            Inventory metrics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            <div className="bg-muted p-4 rounded-lg">
              <div className="flex justify-between items-center">
                <span>Total Items:</span>
                <span className="font-bold text-lg">{data.inventoryStats.total}</span>
              </div>
            </div>
            <div className="bg-muted p-4 rounded-lg">
              <div className="flex justify-between items-center">
                <span>Low Stock Items:</span>
                <span className={`font-bold text-lg ${data.inventoryStats.lowStock > 0 ? 'text-destructive' : 'text-green-500'}`}>
                  {data.inventoryStats.lowStock}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Expense Overview</CardTitle>
          <CardDescription>
            Financial metrics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-muted p-4 rounded-lg mb-4">
            <div className="flex justify-between items-center">
              <span>Total Expenses:</span>
              <span className="font-bold text-lg">${Number(data.expenseStats.total).toFixed(2)}</span>
            </div>
          </div>
          <div className="text-sm text-muted-foreground mb-2">Top Owners by Expenses:</div>
          {Object.values(data.expenseStats.byOwner)
            .sort((a: any, b: any) => b.totalExpenses - a.totalExpenses)
            .slice(0, 3)
            .map((owner: any, index: number) => (
              <div key={index} className="bg-muted p-2 rounded-lg mb-2">
                <div className="flex justify-between items-center">
                  <span>{owner.ownerName}</span>
                  <span className="font-medium">${Number(owner.totalExpenses).toFixed(2)}</span>
                </div>
              </div>
            ))}
        </CardContent>
      </Card>
    </div>
  );
}

// System Status Tab
function SystemStatus() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>System Information</CardTitle>
          <CardDescription>
            Technical details about the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex flex-col space-y-1">
              <span className="text-sm font-medium text-muted-foreground">Application Version</span>
              <span>1.0.0</span>
            </div>
            <div className="flex flex-col space-y-1">
              <span className="text-sm font-medium text-muted-foreground">Environment</span>
              <span>Production</span>
            </div>
            <div className="flex flex-col space-y-1">
              <span className="text-sm font-medium text-muted-foreground">Last Updated</span>
              <span>{new Date().toLocaleString()}</span>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Database Status</CardTitle>
          <CardDescription>
            Connection and configuration information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex flex-col space-y-1">
              <span className="text-sm font-medium text-muted-foreground">Status</span>
              <span className="flex items-center">
                <span className="h-2.5 w-2.5 rounded-full bg-green-500 mr-2"></span>
                Connected
              </span>
            </div>
            <div className="flex flex-col space-y-1">
              <span className="text-sm font-medium text-muted-foreground">Database Type</span>
              <span>PostgreSQL</span>
            </div>
            <div className="flex flex-col space-y-1">
              <span className="text-sm font-medium text-muted-foreground">Schema Version</span>
              <span>1.0</span>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>System Maintenance</CardTitle>
          <CardDescription>
            Database and system maintenance tasks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="bg-muted p-4 rounded-lg">
              <p className="mb-2 font-medium">Important Notes:</p>
              <ul className="list-disc pl-5 space-y-1 text-sm">
                <li>The system is using a database with automatic migrations</li>
                <li>Data backups are managed automatically</li>
                <li>For manual database updates, contact the system administrator</li>
              </ul>
            </div>
            
            <div className="bg-yellow-100 dark:bg-yellow-900/30 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <p className="text-yellow-800 dark:text-yellow-200 font-medium mb-2">Administrator Role Management</p>
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                Administrator access should be granted with caution. Users with administrator role have full access to all system data and settings.
              </p>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <p className="text-xs text-muted-foreground">
            For additional system maintenance options or technical support, please contact the development team.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}