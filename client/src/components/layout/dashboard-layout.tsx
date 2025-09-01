import { ReactNode } from "react";
import Sidebar from "@/components/layout/sidebar";
import MobileNav from "@/components/layout/mobile-nav";

type DashboardLayoutProps = {
  children: ReactNode;
  title: string;
  subtitle?: ReactNode;
  description?: string;
  actions?: ReactNode;
};

export default function DashboardLayout({ children, title, subtitle, description, actions }: DashboardLayoutProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <Sidebar />
      
      {/* Main Content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Mobile Navigation */}
        <MobileNav />
        
        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto bg-background p-4 md:p-6 pb-20 md:pb-6">
          {/* Page Header */}
          <div className="pb-5 mb-6 border-b border-border">
            <div className="flex flex-wrap items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold leading-7 text-foreground sm:text-3xl">
                  {title}
                </h2>
                {subtitle && (
                  <div className="mt-1 text-muted-foreground">
                    {subtitle}
                  </div>
                )}
                {description && (
                  <div className="mt-1 text-sm text-muted-foreground">
                    {description}
                  </div>
                )}
              </div>
              {actions && (
                <div className="flex mt-3 sm:mt-0 space-x-3">
                  {actions}
                </div>
              )}
            </div>
          </div>
          
          {/* Page Content */}
          {children}
        </main>
      </div>
    </div>
  );
}
