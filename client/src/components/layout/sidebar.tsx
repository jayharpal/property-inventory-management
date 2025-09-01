import { useLocation, Link } from "wouter";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { UserRole } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { toast } from "@/hooks/use-toast";

type SidebarLinkProps = {
  href: string;
  icon: string;
  children: React.ReactNode;
  allowedRoles?: UserRole[];
};

const SidebarLink = ({ href, icon, children, allowedRoles }: SidebarLinkProps) => {
  const [location] = useLocation();
  const { hasPermission } = useAuth();
  const isActive = location === href;
  
  // If allowedRoles is specified, check if the user has the necessary permission
  if (allowedRoles && !hasPermission(allowedRoles)) {
    return null; // Don't render this link if user doesn't have permission
  }
  
  return (
    <Link href={href}>
      <div
        className={cn(
          "flex items-center px-3 py-2 text-sm font-medium rounded-md group",
          isActive
            ? "text-primary-foreground bg-primary"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        )}
      >
        <i
          className={cn(
            `fas ${icon} mr-3`,
            isActive ? "text-primary-foreground" : "text-muted-foreground"
          )}
        ></i>
        {children}
      </div>
    </Link>
  );
};

export default function Sidebar() {
  const { user, logoutMutation } = useAuth();
  const [_, navigate] = useLocation();
  const isAdministrator = user?.role === "administrator";
  
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
  
  return (
    <aside className="hidden md:flex md:flex-col w-64 bg-card border-r border-border">
      <div className="flex items-center h-16 px-4 border-b border-border">
        <h1 className="text-xl font-semibold text-foreground">
          <i className="fas fa-home text-primary mr-2"></i>PropSKU
        </h1>
      </div>
      
      <div className="flex flex-col flex-grow px-4 py-6 overflow-y-auto">
        <div className="space-y-1">
          {/* Administrator only sees Admin Panel */}
          {isAdministrator ? (
            <SidebarLink 
              href="/admin" 
              icon="fa-shield-alt"
              allowedRoles={["administrator"]}
            >
              Admin Panel
            </SidebarLink>
          ) : (
            <>
              <SidebarLink 
                href="/" 
                icon="fa-tachometer-alt"
                allowedRoles={["standard_admin"]}
              >
                Dashboard
              </SidebarLink>
              
              {/* All non-administrator users can see listings */}
              <SidebarLink 
                href="/listings" 
                icon="fa-building"
                allowedRoles={["standard_user", "standard_admin"]}
              >
                Listings
              </SidebarLink>
              
              {/* Only standard_admin can manage owners */}
              <SidebarLink 
                href="/owners" 
                icon="fa-users"
                allowedRoles={["standard_admin","standard_user"]}
              >
                Owners
              </SidebarLink>
              
              {/* All non-administrator users can access inventory */}
              <SidebarLink 
                href="/inventory" 
                icon="fa-boxes"
                allowedRoles={["standard_user", "standard_admin"]}
              >
                Inventory
              </SidebarLink>
              
              {/* All non-administrator users can log expenses */}
              <SidebarLink 
                href="/expenses" 
                icon="fa-receipt"
                allowedRoles={["standard_user", "standard_admin"]}
              >
                Expenses
              </SidebarLink>
              
              {/* Only standard_admin can access analytics */}
              <SidebarLink 
                href="/analytics" 
                icon="fa-chart-bar"
                allowedRoles={["standard_admin"]}
              >
                Analytics
              </SidebarLink>
              
              {/* Only standard_admin can access reports */}
              <SidebarLink 
                href="/reports" 
                icon="fa-file-alt"
                allowedRoles={["standard_admin"]}
              >
                Reports
              </SidebarLink>
            </>
          )}
        </div>
        
        <div className="mt-auto">
          <hr className="my-4 border-border" />
          {!isAdministrator && (
            <>
              <SidebarLink 
                href="/settings" 
                icon="fa-cog"
                allowedRoles={["standard_user", "standard_admin"]}
              >
                Settings
              </SidebarLink>
            </>
          )}
          <div className="px-3 py-2">
            <Button 
              variant="outline" 
              className="w-full flex items-center justify-center text-sm"
              onClick={handleLogout}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
          <div className="flex items-center px-3 py-4">
            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
              {user?.firstName ? user.firstName.charAt(0).toUpperCase() : "U"}
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-foreground">
                {user ? `${user.firstName} ${user.lastName}` : "User"}
              </p>
              <p className="text-xs font-medium text-muted-foreground">
                {user?.email || "user@example.com"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
