import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import DashboardPage from "@/pages/dashboard-page";
import ListingsPage from "@/pages/listings-page";
import ListingDetailPage from "@/pages/listing-detail-page";
import OwnersPage from "@/pages/owners-page";
import OwnerDetailPage from "@/pages/owner-detail-page";
import InventoryPage from "@/pages/inventory-page";
import ShoppingListsPage from "@/pages/shopping-lists-page";
import ExpensesPage from "@/pages/expenses-page";
import ReportsPage from "@/pages/reports-page";
import ReportDetailPage from "@/pages/report-detail-page";
import BatchReportPage from "@/pages/batch-report-page";
import AnalyticsPage from "@/pages/analytics-page";
import AdminPanelPage from "@/pages/admin-panel-page";
import SettingsPage from "@/pages/settings-page";
import InvitationPage from "@/pages/invitation-page";
import AccessDeniedPage from "@/pages/access-denied-page";
import { ProtectedRoute } from "@/lib/protected-route";
import { AuthProvider } from "@/hooks/use-auth";
import { ThemeProvider } from "@/hooks/use-theme";

function Router() {
  return (
    <Switch>
      {/* Routes accessible to standard_user and standard_admin */}
      <ProtectedRoute 
        path="/" 
        component={DashboardPage} 
        allowedRoles={["standard_admin"]} 
      />
      <ProtectedRoute 
        path="/listings" 
        component={ListingsPage} 
        allowedRoles={["standard_user", "standard_admin"]} 
      />
      <ProtectedRoute 
        path="/listings/:id" 
        component={ListingDetailPage} 
        allowedRoles={["standard_user", "standard_admin"]} 
      />
      <ProtectedRoute 
        path="/inventory" 
        component={InventoryPage} 
        allowedRoles={["standard_user", "standard_admin"]} 
      />
      <ProtectedRoute 
        path="/shopping-lists" 
        component={ShoppingListsPage} 
        allowedRoles={["standard_user", "standard_admin"]} 
      />
      <ProtectedRoute 
        path="/expenses" 
        component={ExpensesPage} 
        allowedRoles={["standard_user", "standard_admin"]} 
      />
      <ProtectedRoute 
        path="/settings" 
        component={SettingsPage} 
        allowedRoles={["standard_user", "standard_admin"]} 
      />
      
      {/* Routes accessible only to standard_admin */}
      <ProtectedRoute 
        path="/owners" 
        component={OwnersPage} 
        allowedRoles={["standard_admin","standard_user"]} 
      />
      <ProtectedRoute 
        path="/owners/:id" 
        component={OwnerDetailPage} 
        allowedRoles={["standard_admin"]} 
      />
      <ProtectedRoute 
        path="/reports" 
        component={ReportsPage} 
        allowedRoles={["standard_admin"]} 
      />
      <ProtectedRoute 
        path="/reports/batch/:batchId" 
        component={BatchReportPage} 
        allowedRoles={["standard_admin"]} 
      />
      <ProtectedRoute 
        path="/reports/:reportId" 
        component={ReportDetailPage} 
        allowedRoles={["standard_admin"]} 
      />
      <ProtectedRoute 
        path="/analytics" 
        component={AnalyticsPage} 
        allowedRoles={["standard_admin"]} 
      />

      {/* Route accessible only to administrator, redirects to admin panel by default */}
      <ProtectedRoute 
        path="/admin" 
        component={AdminPanelPage} 
        allowedRoles={["administrator"]} 
      />
      
      {/* Redirect administrators to admin panel by default */}
      <ProtectedRoute
        path="/"
        component={() => {
          window.location.href = "/admin";
          return null;
        }}
        allowedRoles={["administrator"]}
      />
      
      {/* Public routes */}
      <Route path="/auth" component={AuthPage} />
      <Route path="/invitation/:token" component={InvitationPage} />
      <Route path="/access-denied" component={AccessDeniedPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <Router />
          <Toaster />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
