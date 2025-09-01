// @ts-nocheck
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient, createQueryKey } from "@/lib/queryClient";
import { Report, Owner } from "@/lib/types";
import { FileText, Plus, Calendar, ChevronRight, Users } from "lucide-react";
import { format } from "date-fns";
import { type Report as ReportType } from "@/lib/types";

export default function ReportsPage() {
  const [, setLocation] = useLocation();
  const [isGenerateOpen, setIsGenerateOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedOwners, setSelectedOwners] = useState<number[]>([]);
  const [batchTitle, setBatchTitle] = useState<string>("");
  const { toast } = useToast();
  
  // Helper to get month name
  const getMonthName = (month: number | null) => {
    if (month === null) return 'Unknown';
    return new Date(0, month - 1).toLocaleString('default', { month: 'long' });
  };

  // Query for reports - staleTime: 0 forces a refresh when navigating to this page
  const {
    data: reports = [],
    isLoading: isLoadingReports,
  } = useQuery<(ReportType & { ownerCount?: number, ownerNames?: string[], ownerName?: string })[]>({
    queryKey: createQueryKey("/api/reports"),
    queryFn: async () => {
      // Using apiRequest which already handles the JSON conversion
      return await apiRequest("GET", "/api/reports");
    },
    staleTime: 0, // Force fresh data every time the component mounts
    refetchOnMount: true // Always refetch when component mounts
  });

  // Query for owners
  const {
    data: owners = [],
    isLoading: isLoadingOwners,
  } = useQuery<Owner[]>({
    queryKey: createQueryKey("/api/owners"),
    queryFn: async () => {
      // Using apiRequest which already handles the JSON conversion
      return await apiRequest("GET", "/api/owners");
    },
  });

  // Group reports by month/year
  const groupedReports = reports.reduce((groups: Record<string, ReportType[]>, report: ReportType) => {
    // Only group by batch or by month/year if no batch
    if (report.batchId) {
      // If it's a batch report, use the batchId as key
      if (!groups[report.batchId]) {
        groups[report.batchId] = [];
      }
      groups[report.batchId].push(report);
    } else {
      // If no batch, use month-year as key
      const key = `${report.month}-${report.year}`;
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(report);
    }
    return groups;
  }, {});

  // Sort reports by date (most recent first)
  const sortedReports = Object.entries(groupedReports).sort((a: [string, ReportType[]], b: [string, ReportType[]]) => {
    const [, aReports] = a;
    const [, bReports] = b;
    
    // Find the batch report or first report in each group
    const aReport = aReports.find(r => r.type === 'batch') || aReports[0];
    const bReport = bReports.find(r => r.type === 'batch') || bReports[0];
    
    // Compare by year and month, or if those are equal, by generatedAt
    if (aReport.year !== bReport.year) {
      return bReport.year! - aReport.year!;
    }
    
    if (aReport.month !== bReport.month) {
      return bReport.month! - aReport.month!;
    }
    
    // If year and month are the same, sort by generatedAt
    const aDate = aReport.generatedAt ? new Date(aReport.generatedAt) : new Date(0);
    const bDate = bReport.generatedAt ? new Date(bReport.generatedAt) : new Date(0);
    return bDate.getTime() - aDate.getTime();
  });

  // Generate reports mutation
  const generateReportsMutation = useMutation({
    mutationFn: async (data: { month: number; year: number; ownerIds: number[]; batchTitle: string }) => {
      // Using apiRequest which already handles the JSON conversion
      return await apiRequest("POST", "/api/reports/generate", data);
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: `Generated ${data?.reports?.length || 0} reports`,
      });
      queryClient.invalidateQueries({ queryKey: createQueryKey("/api/reports") });
      setIsGenerateOpen(false);
      setBatchTitle("");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to generate reports: ${(error as Error).message}`,
        variant: "destructive",
      });
    },
  });

  // Handle form submission
  const handleGenerateReports = () => {
    // Validate batch title is provided
    if (!batchTitle.trim()) {
      toast({
        title: "Error",
        description: "Batch title is required",
        variant: "destructive",
      });
      return;
    }
    
    const ownersToInclude = selectedOwners.length > 0 
      ? selectedOwners 
      : owners.map(owner => owner.id);
      
    // Make sure we have at least one owner
    if (ownersToInclude.length === 0) {
      toast({
        title: "Error",
        description: "No owners available to generate reports for",
        variant: "destructive",
      });
      return;
    }
    
    generateReportsMutation.mutate({
      month: selectedMonth,
      year: selectedYear,
      ownerIds: ownersToInclude,
      batchTitle: batchTitle.trim(),
    });
  };

  // Handle owner selection toggle
  const toggleOwnerSelection = (ownerId: number) => {
    setSelectedOwners(prev => {
      if (prev.includes(ownerId)) {
        return prev.filter(id => id !== ownerId);
      } else {
        return [...prev, ownerId];
      }
    });
  };

  return (
    <DashboardLayout 
      title="Reports"
      description="Generate and view expense reports for owners"
      actions={
        <Dialog open={isGenerateOpen} onOpenChange={setIsGenerateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Generate Reports
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Generate New Reports</DialogTitle>
              <DialogDescription>
                Create expense reports for one or more owners. Reports will be generated as a batch.
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Batch Title <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={batchTitle}
                  onChange={(e) => setBatchTitle(e.target.value)}
                  placeholder={`${getMonthName(selectedMonth)} ${selectedYear} Reports`}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Enter a descriptive title for this batch of reports
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Month</label>
                  <Select
                    value={selectedMonth.toString()}
                    onValueChange={(value) => setSelectedMonth(parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select month" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 12 }, (_, i) => (
                        <SelectItem key={i + 1} value={(i + 1).toString()}>
                          {getMonthName(i + 1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Year</label>
                  <Select
                    value={selectedYear.toString()}
                    onValueChange={(value) => setSelectedYear(parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select year" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 5 }, (_, i) => {
                        const year = new Date().getFullYear() - 2 + i;
                        return (
                          <SelectItem key={year} value={year.toString()}>
                            {year}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium">Owners</label>
                  <Button 
                    variant="link" 
                    size="sm" 
                    className="px-0 text-xs"
                    onClick={() => {
                      // Only compare against non-empty owners array
                      if (owners.length === 0) return;
                      const allSelected = selectedOwners.length > 0 && 
                                         owners.every(owner => selectedOwners.includes(owner.id));
                      setSelectedOwners(allSelected ? [] : owners.map(o => o.id));
                    }}
                  >
                    {selectedOwners.length > 0 && owners.every(owner => selectedOwners.includes(owner.id)) 
                      ? "Deselect All" 
                      : "Select All"}
                  </Button>
                </div>
                
                <div className="border rounded-md p-2 max-h-[200px] overflow-y-auto">
                  {isLoadingOwners ? (
                    <div className="space-y-2">
                      <Skeleton className="h-6 w-full" />
                      <Skeleton className="h-6 w-full" />
                      <Skeleton className="h-6 w-full" />
                    </div>
                  ) : owners.length > 0 ? (
                    <div className="space-y-2">
                      {owners.map((owner) => (
                        <div key={owner.id} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id={`owner-${owner.id}`}
                            checked={selectedOwners.includes(owner.id)}
                            onChange={() => toggleOwnerSelection(owner.id)}
                            className="rounded border-gray-300"
                          />
                          <label htmlFor={`owner-${owner.id}`} className="text-sm">
                            {owner.name}
                          </label>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm text-center py-2">
                      No owners found
                    </p>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {selectedOwners.length === 0 
                    ? "All owners will be included" 
                    : `${selectedOwners.length} owner${selectedOwners.length !== 1 ? 's' : ''} selected`}
                </p>
              </div>
            </div>
            
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setIsGenerateOpen(false)}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleGenerateReports} 
                disabled={isLoadingOwners || generateReportsMutation.isPending}
              >
                {generateReportsMutation.isPending ? "Generating..." : "Generate Reports"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      }
    >
      <div className="container mx-auto py-6 space-y-8">
        {/* Recent Reports Section */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Recent Reports</h2>
          
          {isLoadingReports ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <Skeleton className="h-5 w-40" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-4 w-24 mb-2" />
                    <Skeleton className="h-4 w-32" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : sortedReports.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {sortedReports.map(([key, reports]) => (
                <Card 
                  key={key}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => {
                    // Always navigate to batch view if it has a batchId, even for single-owner batches
                    if (reports.length > 1) {
                      setLocation(`/reports/batch/${reports[0].batchId}`);
                    } else {
                      setLocation(`/reports/${reports[0].id}`);
                    }
                  }}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="flex justify-between items-center">
                      <span className="truncate">
                        {/* For batch reports, use the batch report name */}
                        {reports.find(r => r.type === 'batch')?.name || 
                         /* For grouped reports by month/year, use a standard format */
                         `${getMonthName(parseInt(key.split('-')[0] || reports[0].month))} ${key.split('-')[1] || reports[0].year} Reports`}
                      </span>
                      <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0 ml-2" />
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center text-muted-foreground mb-1">
                      <Calendar className="h-4 w-4 mr-2 flex-shrink-0" />
                      <span className="text-sm truncate">
                        {/* Display the month and year from either the batch report or the first report */}
                        {reports.find(r => r.type === 'batch')
                          ? `${getMonthName(reports.find(r => r.type === 'batch')!.month)} ${reports.find(r => r.type === 'batch')!.year}`
                          : key.includes('-') 
                            ? `${getMonthName(parseInt(key.split('-')[0]))} ${key.split('-')[1]}`
                            : `${getMonthName(reports[0].month)} ${reports[0].year}`
                        }
                      </span>
                    </div>
                    <div className="flex items-center text-muted-foreground">
                      <Users className="h-4 w-4 mr-2 flex-shrink-0" />
                      <span className="text-sm">
                        {/* Count unique owners, excluding batch reports */}
                        {new Set(reports.filter(r => r.type !== 'batch' && r.ownerId).map(r => r.ownerId)).size} owner{new Set(reports.filter(r => r.type !== 'batch' && r.ownerId).map(r => r.ownerId)).size !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center p-8 border rounded-lg bg-muted/10">
              <FileText className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-muted-foreground mb-4">No reports found</p>
              <Button onClick={() => setIsGenerateOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Generate your first report
              </Button>
            </div>
          )}
        </div>

        {/* Reports Table Section */}
        {sortedReports.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold mb-4">All Reports</h2>
            <Card>
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead>Date Generated</TableHead>
                      <TableHead>Owners</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedReports.map(([key, reports]) => (
                      <TableRow key={key}>
                        <TableCell className="font-medium">
                          {reports.find(r => r.type === 'batch')?.name || 
                           `${getMonthName(parseInt(key.split('-')?.[0] || reports[0].month))} ${key.split('-')?.[1] || reports[0].year} Reports`}
                        </TableCell>
                        <TableCell>
                          {reports.find(r => r.type === 'batch')
                            ? `${getMonthName(reports.find(r => r.type === 'batch')!.month)} ${reports.find(r => r.type === 'batch')!.year}`
                            : key.includes('-') 
                              ? `${getMonthName(parseInt(key.split('-')[0]))} ${key.split('-')[1]}`
                              : `${getMonthName(reports[0].month)} ${reports[0].year}`
                          }
                        </TableCell>
                        <TableCell>
                          {reports[0].generatedAt
                            ? format(new Date(reports[0].generatedAt), 'MMM d, yyyy - h:mm a')
                            : 'Unknown'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <Users className="h-4 w-4 mr-2" />
                            {/* Count unique owners, excluding batch reports */}
                            {new Set(reports.filter(r => r.type !== 'batch' && r.ownerId).map(r => r.ownerId)).size}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            asChild
                          >
                            <Link
                              href={
                                // Navigate based on if it's a batch or not
                                reports.find(r => r.type === 'batch')
                                  ? `/reports/batch/${reports[0].batchId}`
                                  : reports.length > 1
                                    ? `/reports/batch/${reports[0].batchId}`
                                    : `/reports/${reports[0].id}`
                              }
                            >
                              View
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}