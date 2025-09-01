import { useEffect } from "react";
import { useLocation, Link } from "wouter";
import { AlertTriangle } from "lucide-react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";

/**
 * Access Denied Page
 * Shows when a user tries to access a page they don't have permission for
 */
export default function AccessDeniedPage() {
  const [location] = useLocation();
  const { user } = useAuth();
  
  useEffect(() => {
    // Log access attempt for security monitoring
    console.log(`Access denied to ${location} for user ${user?.username || 'unknown'}`);
  }, [location, user]);
  
  return (
    <div className="container max-w-lg py-16">
      <Card className="border-destructive">
        <CardHeader className="bg-destructive/5">
          <CardTitle className="flex items-center text-destructive">
            <AlertTriangle className="mr-2 h-5 w-5" />
            Access Denied
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <Alert className="mb-6">
            <AlertTitle>Unauthorized Access Attempt</AlertTitle>
            <AlertDescription>
              You don't have permission to access this page. This action has been logged.
            </AlertDescription>
          </Alert>
          
          <div className="space-y-4">
            <p>
              Your current role ({user?.role || 'Unauthenticated'}) does not have the necessary 
              permissions to view this content.
            </p>
            
            <p className="text-sm text-muted-foreground">
              If you believe you should have access to this page, please contact your administrator
              to request the appropriate permissions.
            </p>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          {user?.role === 'administrator' ? (
            <Button variant="outline" asChild>
              <Link href="/admin">
                Return to Admin Panel
              </Link>
            </Button>
          ) : user?.role === 'standard_user' ? (
            <Button variant="outline" asChild>
              <Link href="/inventory">
                Go to Inventory
              </Link>
            </Button>
          ) : (
            <Button variant="outline" asChild>
              <Link href="/">
                Return to Dashboard
              </Link>
            </Button>
          )}
          
          {user?.role !== 'administrator' && (
            <Button variant="default" asChild>
              <Link href="/settings">
                Your Settings
              </Link>
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}