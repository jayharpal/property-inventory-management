import { useLocation, Link } from "wouter";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { useMobileMenu } from "@/hooks/use-mobile-menu";
import { UserRole } from "@/lib/types";

export default function MobileNav() {
  const { isOpen, toggleMenu, closeMenu } = useMobileMenu();
  const { user, logoutMutation } = useAuth();
  
  const handleLogout = () => {
    logoutMutation.mutate();
    closeMenu();
  };
  
  return (
    <>
      {/* Top Header Bar */}
      <header className="bg-card shadow-sm">
        <div className="sm:hidden block flex items-center justify-between h-16 px-4 md:px-6">
          <button
            className="md:hidden text-muted-foreground focus:outline-none"
            onClick={toggleMenu}
          >
            <i className="fas fa-bars text-xl"></i>
          </button>
          
          <div className="md:hidden flex items-center">
            <h1 className="text-lg font-semibold text-foreground">
              <i className="fas fa-home text-primary mr-2"></i>PropSKU
            </h1>
          </div>
          
          {/* <div className="hidden md:flex md:flex-1 md:mx-4">
            <div className="relative w-full max-w-md">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <i className="fas fa-search text-muted-foreground"></i>
              </div>
              <input
                type="search"
                className="block w-full pl-10 pr-3 py-2 border border-border rounded-md leading-5 bg-background placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary sm:text-sm"
                placeholder="Search..."
              />
            </div>
          </div> */}
          
          <div className="flex items-center">
            <button className="p-2 text-muted-foreground rounded-full hover:bg-muted focus:outline-none">
              <i className="fas fa-bell"></i>
            </button>
            <div className="relative ml-3 md:hidden">
              <div className="flex items-center max-w-xs text-sm bg-card rounded-full focus:outline-none">
                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                  {user?.firstName ? user.firstName.charAt(0).toUpperCase() : "U"}
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      <div className={cn("fixed inset-0 z-40", isOpen ? "block" : "hidden")}>
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm" onClick={closeMenu}></div>
        <div className="relative flex flex-col w-full max-w-xs h-full bg-card">
          <div className="flex items-center justify-between h-16 px-4 border-b border-border">
            <h1 className="text-xl font-semibold text-foreground">
              <i className="fas fa-home text-primary mr-2"></i>PropSKU
            </h1>
            <button className="text-muted-foreground" onClick={closeMenu}>
              <i className="fas fa-times text-xl"></i>
            </button>
          </div>
          <div className="flex-1 h-0 px-2 py-4 overflow-y-auto">
            <nav className="space-y-1">
              <MobileNavLink href="/" icon="fa-tachometer-alt" onClick={closeMenu}>
                Dashboard
              </MobileNavLink>
              <MobileNavLink href="/listings" icon="fa-building" onClick={closeMenu}>
                Listings
              </MobileNavLink>
              <MobileNavLink 
                href="/owners" 
                icon="fa-users" 
                onClick={closeMenu}
                allowedRoles={["standard_admin", "administrator"]}
              >
                Owners
              </MobileNavLink>
              <MobileNavLink href="/inventory" icon="fa-boxes" onClick={closeMenu}>
                Inventory
              </MobileNavLink>
              <MobileNavLink href="/expenses" icon="fa-receipt" onClick={closeMenu}>
                Expenses
              </MobileNavLink>
              <MobileNavLink 
                href="/analytics" 
                icon="fa-chart-bar" 
                onClick={closeMenu}
                allowedRoles={["standard_admin", "administrator"]}
              >
                Analytics
              </MobileNavLink>
              <MobileNavLink 
                href="/reports" 
                icon="fa-file-alt" 
                onClick={closeMenu}
                allowedRoles={["standard_admin", "administrator"]}
              >
                Reports
              </MobileNavLink>
              <MobileNavLink 
                href="/admin" 
                icon="fa-shield-alt" 
                onClick={closeMenu}
                allowedRoles={["administrator"]}
              >
                Admin Panel
              </MobileNavLink>
              <MobileNavLink href="/settings" icon="fa-cog" onClick={closeMenu}>
                Settings
              </MobileNavLink>
            </nav>
          </div>
          <div className="p-4 border-t border-border">
            <div className="flex items-center">
              <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                {user?.firstName ? user.firstName.charAt(0).toUpperCase() : "U"}
              </div>
              <div className="ml-3">
                <p className="text-base font-medium text-foreground">
                  {user ? `${user.firstName} ${user.lastName}` : "User"}
                </p>
                <p className="text-sm font-medium text-muted-foreground">
                  {user?.email || "user@example.com"}
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="mt-4 w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-primary-foreground bg-destructive hover:bg-destructive/90"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="fixed bottom-0 inset-x-0 bg-card border-t border-border shadow-up md:hidden z-30">
        <div className="flex justify-between">
          <MobileBottomNavLink 
            href="/" 
            icon="fa-tachometer-alt" 
            label="Dashboard" 
            allowedRoles={["standard_admin", "administrator"]}
          />
          <MobileBottomNavLink href="/listings" icon="fa-building" label="Listings" />
          <MobileBottomNavLink href="/inventory" icon="fa-boxes" label="Inventory" />
          <MobileBottomNavLink href="/expenses" icon="fa-receipt" label="Expenses" />
          <MobileBottomNavLink href="/settings" icon="fa-bars" label="More" />
        </div>
      </div>
    </>
  );
}

type MobileNavLinkProps = {
  href: string;
  icon: string;
  children: React.ReactNode;
  onClick?: () => void;
  allowedRoles?: UserRole[];
};

function MobileNavLink({ href, icon, children, onClick, allowedRoles }: MobileNavLinkProps) {
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
          "block px-3 py-2 rounded-md text-base font-medium cursor-pointer",
          isActive
            ? "text-primary-foreground bg-primary"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        )}
        onClick={onClick}
      >
        <i className={`fas ${icon} mr-3 ${isActive ? 'text-primary-foreground' : 'text-muted-foreground'}`}></i>
        {children}
      </div>
    </Link>
  );
}

type MobileBottomNavLinkProps = {
  href: string;
  icon: string;
  label: string;
  allowedRoles?: UserRole[];
};

function MobileBottomNavLink({ href, icon, label, allowedRoles }: MobileBottomNavLinkProps) {
  const [location] = useLocation();
  const { hasPermission } = useAuth();
  const isActive = location === href;
  
  // If allowedRoles is specified, check if the user has the necessary permission
  if (allowedRoles && !hasPermission(allowedRoles)) {
    return null; // Don't render this link if user doesn't have permission
  }
  
  return (
    <Link href={href}>
      <div className={cn(
        "flex flex-col items-center py-2 flex-1 cursor-pointer",
        isActive ? "text-primary" : "text-muted-foreground"
      )}>
        <i className={`fas ${icon} mb-1`}></i>
        <span className="text-xs">{label}</span>
      </div>
    </Link>
  );
}
