// @ts-nocheck
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2 } from "lucide-react";
import { createQueryKey } from "@/lib/queryClient";

type InvitationData = {
  id: number;
  email: string;
  portfolioId: number;
  role: string;
  token: string;
  accepted: boolean;
  expiresAt: string;
  createdAt: string;
};

type PortfolioData = {
  id: number;
  name: string;
  ownerId: number;
};

const registerSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  email: z.string().email("Please enter a valid email"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function InvitationPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [token, setToken] = useState<string | null>(null);

  // Get the token from the URL path
  useEffect(() => {
    // Extract token from path
    const pathSegments = window.location.pathname.split('/');
    const tokenFromPath = pathSegments[pathSegments.length - 1];
    
    if (tokenFromPath) {
      setToken(tokenFromPath);
    }
  }, []);

  // Form setup
  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      password: "",
      email: "",
      firstName: "",
      lastName: "",
    },
  });

  // Fetch invitation data
  const { data: invitation, isLoading: isLoadingInvitation, error: invitationError } = useQuery({
    queryKey: createQueryKey(`/api/invitations/validate/${token}`),
    queryFn: async () => {
      if (!token) return null;
      const response = await fetch(`/api/invitations/validate/${token}`);
      if (!response.ok) {
        throw new Error("Invalid or expired invitation");
      }
      return await response.json() as InvitationData;
    },
    enabled: !!token,
  });

  // Fetch portfolio data
  const { data: portfolio, isLoading: isLoadingPortfolio } = useQuery({
    queryKey: createQueryKey(`/api/portfolios/${invitation?.portfolioId}`),
    queryFn: async () => {
      if (!invitation?.portfolioId) return null;
      const response = await fetch(`/api/portfolios/${invitation.portfolioId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch portfolio data");
      }
      return await response.json() as PortfolioData;
    },
    enabled: !!invitation?.portfolioId,
  });

  // Update form with email from invitation
  useEffect(() => {
    if (invitation?.email) {
      form.setValue("email", invitation.email);
    }
  }, [invitation, form]);

  // Handle form submission
  const onSubmit = async (data: RegisterFormValues) => {
    try {
      if (!invitation) {
        throw new Error("Invalid invitation");
      }

      // Create a user with the provided details and role from invitation
      const userData = {
        username: data.username,
        password: data.password,
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        role: invitation.role, // Use the role from the invitation
        portfolioId: invitation.portfolioId, // Link to the portfolio
      };

      // Create the user
      const createUserResponse = await fetch("/api/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(userData),
      });

      if (!createUserResponse.ok) {
        const errorData = await createUserResponse.json();
        throw new Error(errorData.message || "Failed to create account");
      }

      const newUser = await createUserResponse.json();

      // Log in with the new credentials
      const loginResponse = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: data.username,
          password: data.password,
        }),
      });

      if (!loginResponse.ok) {
        throw new Error("Account created but failed to log in automatically");
      }

      // Accept the invitation with the newly created user
      const acceptInvitationResponse = await fetch(`/api/invitations/accept/${token}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!acceptInvitationResponse.ok) {
        throw new Error("Failed to accept invitation");
      }

      // Show success message
      toast({
        title: "Success!",
        description: "Your account has been created and linked to the portfolio.",
      });

      // Redirect to dashboard
      navigate("/");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Display error if invitation is invalid
  if (invitationError) {
    return (
      <div className="container flex items-center justify-center min-h-screen py-12">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Invalid Invitation</CardTitle>
            <CardDescription>
              This invitation link is invalid or has expired.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button onClick={() => navigate("/auth")} className="w-full">
              Return to Login
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Display loading state
  if (isLoadingInvitation || isLoadingPortfolio) {
    return (
      <div className="container flex items-center justify-center min-h-screen py-12">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">Loading</CardTitle>
            <CardDescription className="text-center">
              <Loader2 className="mx-auto h-8 w-8 animate-spin mt-4" />
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Check if invitation is already accepted
  if (invitation?.accepted) {
    return (
      <div className="container flex items-center justify-center min-h-screen py-12">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Invitation Already Accepted</CardTitle>
            <CardDescription>
              This invitation has already been accepted. Please log in with your credentials.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button onClick={() => navigate("/auth")} className="w-full">
              Go to Login
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Check if invitation is expired
  if (invitation && new Date(invitation.expiresAt) < new Date()) {
    return (
      <div className="container flex items-center justify-center min-h-screen py-12">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Invitation Expired</CardTitle>
            <CardDescription>
              This invitation has expired. Please contact the administrator for a new invitation.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button onClick={() => navigate("/auth")} className="w-full">
              Return to Login
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="container flex items-center justify-center min-h-screen py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Join {portfolio?.name || "Property Manager"}</CardTitle>
          <CardDescription>
            You've been invited to join as a {invitation?.role === "standard_user" ? "Standard User" : "Standard Admin"}.
            Create your account to get started.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <Alert>
                <AlertTitle>About your role</AlertTitle>
                <AlertDescription>
                  {invitation?.role === "standard_user" 
                    ? "As a Standard User, you'll have access to view properties, expenses, and inventory, but some financial details like margins may be restricted."
                    : "As a Standard Admin, you'll have full access to manage properties, expenses, and inventory data."}
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input placeholder="johndoe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input 
                        type="email" 
                        placeholder="john.doe@example.com" 
                        {...field} 
                        disabled={!!invitation?.email}
                      />
                    </FormControl>
                    {invitation?.email && (
                      <p className="text-xs text-muted-foreground">
                        Email is set from your invitation and cannot be changed.
                      </p>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  "Create Account & Join"
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button variant="link" onClick={() => navigate("/auth")}>
            Already have an account? Log in
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}