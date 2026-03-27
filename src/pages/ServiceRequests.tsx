import { useState, useEffect } from "react";
import { useBusinesses } from '@/hooks/useBusinesses';
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { formatToEasternCompact } from "@/lib/dateUtils";
import { AlertCircle, CheckCircle2, Clock, XCircle } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useBusinessContext } from "@/contexts/BusinessContext";

interface ContactInfo {
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
}

interface ServiceRequest {
  id: string;
  business_id: string | null;
  contact_id: string | null;
  title: string;
  description: string | null;
  request_type: string;
  status: string;
  priority: string;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  contacts: ContactInfo | null;
}

export default function ServiceRequests() {
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const { selectedBusiness, setSelectedBusiness } = useBusinessContext();
  const { data: businesses = [] } = useBusinesses();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Auto-select Fight Flow Academy if no business selected
  useEffect(() => {
    if (!selectedBusiness && businesses.length > 0) {
      const fightFlow = businesses.find(b => b.name?.toLowerCase().includes('fight flow'));
      if (fightFlow) setSelectedBusiness(fightFlow);
      else setSelectedBusiness(businesses[0]);
    }
  }, [businesses, selectedBusiness, setSelectedBusiness]);

  useEffect(() => {
    loadRequests();
  }, [selectedBusiness, statusFilter]);

  const loadRequests = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from("service_requests")
        .select("*, contacts(first_name, last_name, email, phone)")
        .order("created_at", { ascending: false });

      if (selectedBusiness?.id) {
        query = (query as any).eq("business_id", selectedBusiness.id);
      }

      if (statusFilter !== "all") {
        query = (query as any).eq("status", statusFilter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setRequests((data as unknown as ServiceRequest[]) || []);
    } catch (error) {
      console.error("Error loading service requests:", error);
      toast({
        title: "Error",
        description: "Failed to load service requests",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateRequestStatus = async (requestId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("service_requests")
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
          ...(newStatus === "completed" ? { resolved_at: new Date().toISOString() } : {}),
        })
        .eq("id", requestId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Request status updated",
      });
      loadRequests();
    } catch (error) {
      console.error("Error updating request:", error);
      toast({
        title: "Error",
        description: "Failed to update request status",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { className: string; icon: any; label: string }> = {
      pending_review: {
        className: "bg-orange-100 text-orange-800 border-orange-300",
        icon: Clock,
        label: "Pending Review",
      },
      in_progress: {
        className: "bg-blue-100 text-blue-800 border-blue-300",
        icon: AlertCircle,
        label: "In Progress",
      },
      completed: {
        className: "bg-green-100 text-green-800 border-green-300",
        icon: CheckCircle2,
        label: "Completed",
      },
      disqualified: {
        className: "bg-gray-100 text-gray-700 border-gray-300",
        icon: XCircle,
        label: "Disqualified",
      },
      cancelled: {
        className: "bg-red-100 text-red-800 border-red-300",
        icon: XCircle,
        label: "Cancelled",
      },
    };

    const config = variants[status] || {
      className: "bg-gray-100 text-gray-700 border-gray-300",
      icon: Clock,
      label: status.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
    };
    const Icon = config.icon;

    return (
      <span
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold border shadow-sm ${config.className}`}
      >
        <Icon className="h-3.5 w-3.5" />
        {config.label}
      </span>
    );
  };

  const getRequestTypeBadge = (type: string) => {
    return (
      <Badge variant={type === "freeze_request" ? "secondary" : "destructive"}>
        {type === "freeze_request" ? "Freeze" : type === "cancellation_request" ? "Cancellation" : type}
      </Badge>
    );
  };

  const stats = {
    total: requests.length,
    pending: requests.filter((r) => r.status === "pending_review").length,
    inProgress: requests.filter((r) => r.status === "in_progress").length,
    completed: requests.filter((r) => r.status === "completed").length,
  };

  return (
    <DashboardLayout
      selectedBusinessId={selectedBusiness?.id}
      onBusinessChange={(id) => {
        const business = businesses.find((b) => b.id === id);
        if (business) setSelectedBusiness(business);
      }}
      businessName={selectedBusiness?.name}
    >
      <main className="container mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Service Requests</h1>
          <p className="text-muted-foreground">Manage freeze and cancellation requests</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Requests</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending Review</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{stats.pending}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">In Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.inProgress}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Requests</CardTitle>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending_review">Pending Review</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="disqualified">Disqualified</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading requests...</div>
            ) : requests.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No service requests found</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Member</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.map((request) => (
                    <TableRow key={request.id} className="group">
                      <TableCell>{getRequestTypeBadge(request.request_type)}</TableCell>
                      <TableCell>
                        <div className="font-medium">
                          {request.contacts?.first_name} {request.contacts?.last_name}
                        </div>
                        {request.title && (
                          <div className="text-xs text-muted-foreground mt-0.5">{request.title}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {request.contacts?.email && <div>{request.contacts.email}</div>}
                          {request.contacts?.phone && (
                            <div className="text-muted-foreground">{request.contacts.phone}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(request.status)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatToEasternCompact(request.created_at)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                          {request.status === "pending_review" && (
                            <Button
                              size="sm"
                              onClick={() => updateRequestStatus(request.id, "in_progress")}
                            >
                              Start Processing
                            </Button>
                          )}
                          {request.status === "in_progress" && (
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => updateRequestStatus(request.id, "completed")}
                            >
                              Mark Complete
                            </Button>
                          )}
                        </div>
                        {request.status === "completed" && (
                          <span className="inline-flex items-center gap-1 text-sm text-green-700">
                            <CheckCircle2 className="h-4 w-4" />
                            Done
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </DashboardLayout>
  );
}
