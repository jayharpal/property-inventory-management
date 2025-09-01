// @ts-nocheck
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useQuery, useMutation } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/hooks/use-theme";
import { Loader2, CircleCheck, Mail, Clock, UserPlus, Trash } from "lucide-react";
import { cn } from "@/lib/utils";
import { queryClient, createQueryKey } from "@/lib/queryClient";
import { type User } from "@/lib/types";
import { apiRequest } from "@/lib/queryClient";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useLocation } from "wouter";

// Invitations manager component
type InvitationFormValues = {
  email: string;
  role: string;
};

const registerSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  email: z.string().email("Please enter a valid email"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  companyName: z.string().min(3, "Company Name must be at least 3 characters"),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

function InvitationsManager({ user }: { user: any }) {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isSending, setIsSending] = useState(false);
  const [defaultPortfolioId, setDefaultPortfolioId] = useState<number | null>(null);
  
  // Form for new invitations
  // const invitationForm = useForm<InvitationFormValues>({
  //   defaultValues: {
  //     email: "",
  //     role: "standard_user",
  //   },
  //   resolver: zodResolver(
  //     z.object({
  //       email: z.string().email("Please enter a valid email address"),
  //       role: z.string(),
  //     })
  //   ),
  // });
  
    const form = useForm<RegisterFormValues>({
      resolver: zodResolver(registerSchema),
      defaultValues: {
        username: "",
        password: "",
        email: "",
        firstName: "",
        lastName: "",
        companyName:user?.companyName || "",
      },
    });
  
  // Fetch invitations data
  const { data: invitations = [], isLoading, refetch } = useQuery({
    queryKey: createQueryKey('/api/invitations'),
    queryFn: async () => {
      if (user?.role === "standard_admin" || user?.role === "administrator") {
        return await apiRequest("GET", `/api/invitations`);
      }
      return [];
    },
    enabled: !!user && (user.role === "standard_admin" || user.role === "administrator"),
  });
  
  // Fetch user's portfolios
  const { data: portfolios = [] } = useQuery({
    queryKey: createQueryKey('/api/portfolios'),
    queryFn: async () => {
      return await apiRequest("GET", '/api/portfolios');
    },
    enabled: !!user && (user.role === "standard_admin" || user.role === "administrator"),
  });
  
  // Create a default portfolio if none exists
  const createPortfolioMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", '/api/portfolios', {
        name: `${user?.firstName}'s Portfolio`,
        createdBy: user?.id,
      });
    },
    onSuccess: (data) => {
      toast({
        title: "Portfolio created",
        description: "A default portfolio has been created for you."
      });
      setDefaultPortfolioId(data.id);
      queryClient.invalidateQueries({queryKey: createQueryKey('/api/portfolios')});
    },
    onError: (error: any) => {
      toast({
        title: "Error creating portfolio",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive"
      });
    }
  });
  
  // Track whether we've attempted to create a portfolio
  const [attemptedPortfolioCreation, setAttemptedPortfolioCreation] = useState(false);
  
  // Check if user has a portfolio and create one if not
  useEffect(() => {
    // Only try to create a portfolio once to prevent loops
    if (portfolios && portfolios.length === 0 && !createPortfolioMutation.isPending && 
        (user?.role === "standard_admin" || user?.role === "administrator") && !attemptedPortfolioCreation) {
      // Create a default portfolio
      setAttemptedPortfolioCreation(true);
      createPortfolioMutation.mutate();
    } else if (portfolios && portfolios.length > 0 && !defaultPortfolioId) {
      // Set the default portfolio ID from the query result
      setDefaultPortfolioId(portfolios[0].id);
    }
  }, [portfolios, createPortfolioMutation.isPending, user, attemptedPortfolioCreation]);
  
  // Create invitation mutation
  const createInvitationMutation = useMutation({
    mutationFn: async (data: InvitationFormValues) => {
      const portfolioId = defaultPortfolioId || (portfolios && portfolios.length > 0 ? portfolios[0].id : null);
      
      if (!portfolioId) {
        throw new Error("You must have at least one portfolio to send invitations");
      }
      
      return await apiRequest("POST", '/api/invitations', {
        ...data,
        portfolioId,
      });
    },
    onSuccess: () => {
      toast({
        title: "User Created",
        description: "Successfully user created.",
      });
      form.reset();
      refetch();
    },
    onError: (error: any) => {
      toast({
        title: "Error sending invitation",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });
  
  // Delete invitation mutation
  const deleteInvitationMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("DELETE", `/api/invitations/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Invitation deleted",
        description: "The invitation has been removed.",
      });
      refetch();
    },
    onError: (error: any) => {
      toast({
        title: "Error deleting invitation",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });
  
  // Resend invitation mutation
  const resendInvitationMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("POST", `/api/invitations/${id}/resend`);
    },
    onSuccess: () => {
      toast({
        title: "Invitation resent",
        description: "The invitation has been sent again.",
      });
      refetch();
    },
    onError: (error: any) => {
      toast({
        title: "Error resending invitation",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });
  
  // const onSubmit = (data: InvitationFormValues) => {
  //   setIsSending(true);
  //   createInvitationMutation.mutate(data, {
  //     onSettled: () => setIsSending(false),
  //   });
  // };
    const onSubmit = async (data: RegisterFormValues) => {
    try {
      
      const userData = {
        username: data.username,
        password: data.password,
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        role: "standard_user",
        companyName: data.companyName,
      };

      // Create the user
     await apiRequest("POST", "/api/register", userData);      

      
      setIsSending(true);
      let newData = {
        email : data?.email,
        role : 'standard_user',
      }

      createInvitationMutation.mutate(newData, {
        onSettled: () => setIsSending(false),
      });
      // Log in with the new credentials
      // const loginResponse = await fetch("/api/login", {
      //   method: "POST",
      //   headers: {
      //     "Content-Type": "application/json",
      //   },
      //   body: JSON.stringify({
      //     username: data.username,
      //     password: data.password,
      //   }),
      // });

      // if (!loginResponse.ok) {
      //   throw new Error("Account created but failed to log in automatically");
      // }

      // Accept the invitation with the newly created user
      // const acceptInvitationResponse = await fetch(`/api/invitations/accept/${token}`, {
      //   method: "POST",
      //   headers: {
      //     "Content-Type": "application/json",
      //   },
      // });

      // if (!acceptInvitationResponse.ok) {
      //   throw new Error("Failed to accept invitation");
      // }

      // Show success message
      // toast({
      //   title: "Success!",
      //   description: "Your account has been created and linked to the portfolio.",
      // });

      // Redirect to dashboard
      navigate("/settings");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    }
  };
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return "Today";
    } else if (diffDays === 1) {
      return "Yesterday";
    } else {
      return `${diffDays} days ago`;
    }
  };
  
  return (
    <div>
      <div className="flex flex-col space-y-4 ">
        {/* <h3 className="text-lg font-medium">Send New Invitation</h3>
        <Form {...invitationForm}>
          <form onSubmit={invitationForm.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="col-span-2">
                <FormField
                  control={invitationForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input placeholder="Enter email address" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div>
                <FormField
                  control={invitationForm.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="standard_user">Standard User</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
            <Button 
              type="submit" 
              className="w-full md:w-auto"
              disabled={isSending || createInvitationMutation.isPending}
            >
              {isSending || createInvitationMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Send Invitation
                </>
              )}
            </Button>
          </form>
        </Form> */}

          <Card className="w-full border-0 shadow-none">
        <CardHeader>
          <CardTitle>Join Property Manager</CardTitle>
          <CardDescription>
            You've been invited to join as a {user?.role === "standard_user" ? "Standard User" : "Standard Admin"}.
            Create your account to get started.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <Alert>
                <AlertTitle>About your role</AlertTitle>
                <AlertDescription>
                  {user?.role === "standard_user" 
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
                name="companyName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company Name</FormLabel>
                    <FormControl>
                      <Input {...field} readOnly />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

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
                        // disabled={!!invitation?.email}
                      />
                    </FormControl>
                    {/* {invitation?.email && (
                      <p className="text-xs text-muted-foreground">
                        Email is set from your invitation and cannot be changed.
                      </p>
                    )} */}
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
        {/* <CardFooter className="flex justify-center">
          <Button variant="link" onClick={() => navigate("/auth")}>
            Already have an account? Log in
          </Button>
        </CardFooter> */}
      </Card>
      </div>
      
      <div className="pt-6 mt-6 border-t border-border p-4">
        <h3 className="text-lg font-medium mb-4">Active Users</h3>
        
        {isLoading ? (
          <div className="flex justify-center p-6">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : invitations.length === 0 ? (
          <div className="text-center p-6 bg-muted/50 rounded-lg">
            <Mail className="h-12 w-12 mx-auto text-muted-foreground opacity-50 mb-2" />
            <p className="text-muted-foreground">No pending invitations. Invite team members to get started.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {invitations.map((invitation: any) => (
              <div 
                key={invitation.id}
                className="bg-background p-4 rounded-lg border flex flex-col md:flex-row md:items-center md:justify-between gap-4"
              >
                <div className="flex items-center space-x-4">
                  <Mail className="h-8 w-8 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{invitation.email}</p>
                    <div className="flex flex-wrap gap-2 items-center text-xs text-muted-foreground mt-1">
                      <div className="flex items-center">
                        <Clock className="mr-1 h-3 w-3" />
                        <span>Sent {formatDate(invitation.createdAt)}</span>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {invitation.role === 'standard_user' ? 'Standard User' : invitation.role}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {/* <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => resendInvitationMutation.mutate(invitation.id)}
                    disabled={resendInvitationMutation.isPending}
                  >
                    {resendInvitationMutation.isPending && resendInvitationMutation.variables === invitation.id ? (
                      <Loader2 className="h-3 w-3 animate-spin mr-1" />
                    ) : null}
                    Resend
                  </Button> */}
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={() => deleteInvitationMutation.mutate(invitation.id)}
                    disabled={deleteInvitationMutation.isPending}
                  >
                    {deleteInvitationMutation.isPending && deleteInvitationMutation.variables === invitation.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Trash className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const profileFormSchema = z.object({
  id:z.number(),
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  username: z.string().min(3, "Username must be at least 3 characters"),
  password:z.string(),
  companyName: z.string().min(3, "companyName must be at least 3 characters"),
});

const passwordFormSchema = z.object({
  id:z.number(),
  username: z.string(),
  email: z.string(),
  firstName:z.string(),
  lastName: z.string(),
  oldpassword:z.string(),
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Password must be at least 6 characters"),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

const notificationFormSchema = z.object({
  emailNotifications: z.boolean().default(true),
  lowInventoryAlerts: z.boolean().default(true),
  ownerReportEmails: z.boolean().default(true),
  platformSyncAlerts: z.boolean().default(true),
});

const appearanceFormSchema = z.object({
  theme: z.enum(["light", "dark", "system"]),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;
type PasswordFormValues = z.infer<typeof passwordFormSchema>;
type NotificationFormValues = z.infer<typeof notificationFormSchema>;
type AppearanceFormValues = z.infer<typeof appearanceFormSchema>;

export default function SettingsPage() {
  const { toast } = useToast();
  const { user, logoutMutation } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const handleLogout = () => {
    logoutMutation.mutate();
  };

  // Profile form
  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      id:0,
      name: "",
      email: "",
      username: "",
      password:"",
      companyName:user.companyName||""
    },
  });

  // Password form
  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: {
      id:0,
      username: "",
      email: "",
      firstName:"",
      lastName: "",
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
      oldpassword:""
    },
  });

  // Notifications form
  const notificationForm = useForm<NotificationFormValues>({
    resolver: zodResolver(notificationFormSchema),
    defaultValues: {
      emailNotifications: true,
      lowInventoryAlerts: true,
      ownerReportEmails: true,
      platformSyncAlerts: true,
    },
  });

  // Appearance form
  const appearanceForm = useForm<AppearanceFormValues>({
    resolver: zodResolver(appearanceFormSchema),
    defaultValues: {
      theme: "light",
    },
  });

  // Update form values when user data is available
  useEffect(() => {
    if (user) {
      profileForm.reset({
        id:user.id,
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        username: user.username,
        password:user.password,
        companyName:user.companyName,
      });
      passwordForm.reset({
        id:user.id,
        email: user.email,
        username: user.username,
        oldpassword:user.password,
        firstName:user.firstName,
        lastName:user.lastName
      });
    }
  }, [user, profileForm]);

  const onProfileSubmit = (data: ProfileFormValues) => {
    setIsSaving(true);
    UpdateUserProfile.mutate(data, {
      onSettled: () => setIsSaving(false),
    });
  };
  const UpdateUserProfile = useMutation({
    mutationFn: async (data :ProfileFormValues) => {      
          const [firstName, ...rest] = data.name.trim().split(" ");
          const lastName = rest.join(" ");
          const payload = {
              username: data.username,
              email: data.email,
              firstName:firstName,
              lastName: lastName,
              password: data.password,
              companyName:data.companyName
          };
          return await apiRequest("PUT", `/api/userprofile/${data.id}`, payload);
    },  
    onSuccess: () => {
       toast({
        title: "Profile updated",
        description: "Your profile information has been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to ${editingUser ? 'update' : 'create'} User: ${(error as Error).message}`,
        variant: "destructive",
      });
    },
  });

  const onPasswordSubmit = (data: PasswordFormValues) => {
    setIsSaving(true);
    UpdateUserPassword.mutate(data, {
      onSettled: () => setIsSaving(false),
    });
  };
    const UpdateUserPassword = useMutation({
      mutationFn: async (data :PasswordFormValues) => {  
            const payload = {
                username: data.username,
                email: data.email,
                firstName:data.firstName,
                lastName: data.lastName,
                password: data.oldpassword,
                newPassword: data.newPassword,
                currentPassword: data.currentPassword
            };
            return await apiRequest("PUT", `/api/userpassword/${data.id}`, payload);
      },  
      onSuccess: () => {
        setIsSaving(false);
        passwordForm.reset({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
        setIsSaving(false);
        toast({
          title: "Profile updated",
          description: "Your profile information has been updated successfully.",
        });
      },
      onError: (error) => {
        setIsSaving(false);
        const err = error as any;
        const message = err?.response?.data?.message || err.message;

        if (message === "400: Old password does not match") {
          toast({
            title: "Password Error",
            description: "Your old password incorrect.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Error",
            description: `Failed to ${editingUser ? 'update' : 'create'} User: ${message}`,
            variant: "destructive",
          });
        }
      }
   });

  const onNotificationSubmit = (data: NotificationFormValues) => {
    setIsSaving(true);
    setTimeout(() => {
      toast({
        title: "Notification settings saved",
        description: "Your notification preferences have been updated.",
      });
      setIsSaving(false);
    }, 1000);
  };

  const { theme, setTheme } = useTheme();
  
  // Update form on initial load based on current theme
  useEffect(() => {
    appearanceForm.reset({
      theme: theme,
    });
  }, [theme, appearanceForm]);
  
  const onAppearanceSubmit = (data: AppearanceFormValues) => {
    setIsSaving(true);
    // Update the theme in the theme context
    setTheme(data.theme);
    
    setTimeout(() => {
      toast({
        title: "Theme updated",
        description: "Your appearance preferences have been applied.",
      });
      setIsSaving(false);
    }, 1000);
  };

  const handleUpdateProfile = async (data: any) => {
    setIsLoading(true);
    try {
      await apiRequest("PUT", "/api/user/profile", data);
      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DashboardLayout title="Settings">
      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className={cn(
          "grid w-full lg:w-[500px]",
          user?.role === "standard_admin" || user?.role === "administrator" 
            ? "grid-cols-4" 
            : "grid-cols-3"
        )}>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="password">Password</TabsTrigger>
          {/* <TabsTrigger value="notifications">Notifications</TabsTrigger> */}
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
          {(user?.role === "standard_admin" || user?.role === "administrator") && (
            <TabsTrigger value="invitations">Users</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Profile Settings</CardTitle>
              <CardDescription>
                Manage your account profile information.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Form {...profileForm}>
                <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
                   <FormField
                    control={profileForm.control}
                    name="companyName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter your Company Name " {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={profileForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter your full name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={profileForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Address</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter your email address" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={profileForm.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter your username" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type="submit" disabled={isSaving}>
                    {isSaving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save Changes"
                    )}
                  </Button>
                </form>
              </Form>
              
              <div className="pt-6 mt-6 border-t border-border">
                <h3 className="text-lg font-medium text-destructive mb-4">Account Actions</h3>
                <Button 
                  variant="destructive" 
                  onClick={handleLogout}
                  className="w-full md:w-auto"
                >
                  {logoutMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing out...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-sign-out-alt mr-2"></i>
                      Sign out
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="password">
          <Card>
            <CardHeader>
              <CardTitle>Change Password</CardTitle>
              <CardDescription>
                Update your password to keep your account secure.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Form {...passwordForm}>
                <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
                  <FormField
                    control={passwordForm.control}
                    name="currentPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Current Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="Enter your current password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={passwordForm.control}
                    name="newPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>New Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="Enter your new password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={passwordForm.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirm New Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="Confirm your new password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type="submit" disabled={isSaving}>
                    {isSaving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Change Password"
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification Settings</CardTitle>
              <CardDescription>
                Configure how you'd like to receive notifications.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Form {...notificationForm}>
                <form onSubmit={notificationForm.handleSubmit(onNotificationSubmit)} className="space-y-6">
                  <FormField
                    control={notificationForm.control}
                    name="emailNotifications"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Email Notifications</FormLabel>
                          <FormDescription>
                            Receive email notifications when important events occur.
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={notificationForm.control}
                    name="lowInventoryAlerts"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Low Inventory Alerts</FormLabel>
                          <FormDescription>
                            Get notified when inventory items are running low.
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={notificationForm.control}
                    name="ownerReportEmails"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Owner Report Emails</FormLabel>
                          <FormDescription>
                            Automatically send report emails to property owners.
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={notificationForm.control}
                    name="platformSyncAlerts"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Platform Sync Alerts</FormLabel>
                          <FormDescription>
                            Get notifications about platform synchronization.
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <Button type="submit" disabled={isSaving}>
                    {isSaving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save Preferences"
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance">
          <Card>
            <CardHeader>
              <CardTitle>Appearance Settings</CardTitle>
              <CardDescription>
                Customize the appearance of the application.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Form {...appearanceForm}>
                <form onSubmit={appearanceForm.handleSubmit(onAppearanceSubmit)} className="space-y-6">
                  <FormField
                    control={appearanceForm.control}
                    name="theme"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Theme Preference</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select theme" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="light">Light</SelectItem>
                            <SelectItem value="dark">Dark</SelectItem>
                            <SelectItem value="system">System</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Choose your preferred color theme for the application.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type="submit" disabled={isSaving}>
                    {isSaving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save Preferences"
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        {(user?.role === "standard_admin" || user?.role === "administrator") && (
          <TabsContent value="invitations">
            <Card>
              {/* <CardHeader>
                <CardTitle>User Invitations</CardTitle>
                <CardDescription>
                  Invite users to join your portfolio and manage existing invitations.
                </CardDescription>
              </CardHeader> */}
                <InvitationsManager user={user} />
              {/* <CardContent className="space-y-6">
              </CardContent> */}
            </Card>
          </TabsContent>
        )}
      </Tabs>

      <Card className="mt-6 bg-primary/5 border-primary/20">
        <CardHeader>
          <CardTitle className="text-primary">Account Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-500">Account Type</p>
              <p className="text-base">Property Manager</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Member Since</p>
              <p className="text-base">{new Date().toLocaleDateString()}</p>
            </div>
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center space-x-2 text-green-600">
                <CircleCheck className="h-5 w-5" />
                <span className="text-sm font-medium">Your account is in good standing</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}