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

interface ServiceRequest {
  id: string;
  source_table: "service_requests" | "sparkwave_booking_requests";
  source_id: string;
  source_status: string;
  title: string;
  description: string | null;
  request_type: string;
  status: string;
  priority: string;
  created_at: string;
  resolved_at: string | null;
  business_id: string | null;
  contact_id: string | null;
  contact?: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    phone: string | null;
  } | null;
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

  const normalizeBookingStatus = (status: string) => {
    const normalized = status.toLowerCase();
    if (["pending", "new", "submitted"].includes(normalized)) return "pending_review";
    if (["reviewing", "in_progress"].includes(normalized)) return "in_progress";
    if (["confirmed", "completed"].includes(normalized)) return "completed";
    if (["cancelled", "canceled", "disqualified"].includes(normalized)) return "disqualified";
    return normalized;
  };

  const loadRequests = async () => {
    setIsLoading(true);
    try {
      let serviceQuery = supabase
        .from("service_requests")
        .select("*, contact:contacts(first_name, last_name, email, phone)")
        .order("created_at", { ascending: false });

      if (selectedBusiness?.id) {
        serviceQuery = serviceQuery.eq("business_id", selectedBusiness.id);
      } else {
        setRequests([]);
        setIsLoading(false);
        return;
      }

      const bookingQuery = supabase
        .from("sparkwave_booking_requests")
        .select("id, name, email, phone, preferred_date, preferred_time, topic, message, status, created_at, updated_at")
        .order("created_at", { ascending: false })
        .limit(100);

      const [serviceResult, bookingResult] = await Promise.all([serviceQuery, bookingQuery]);

      if (serviceResult.error) throw serviceResult.error;
      if (bookingResult.error) throw bookingResult.error;

      const serviceRequests = (serviceResult.data || []).map((request) => ({
        ...request,
        source_table: "service_requests" as const,
        source_id: request.id,
        source_status: request.status,
      }));

      const bookingRequests: ServiceRequest[] = (bookingResult.data || []).map((booking) => {
        const normalizedStatus = normalizeBookingStatus(booking.status);
        const isSeo = booking.topic?.toLowerCase().includes("seo");
        return {
          id: `booking:${booking.id}`,
          source_table: "sparkwave_booking_requests",
          source_id: booking.id,
          source_status: booking.status,
          title: booking.topic || "Booking request",
          description: [
            booking.message,
            booking.preferred_date && booking.preferred_time
              ? `Requested: ${booking.preferred_date} at ${booking.preferred_time}`
              : null,
          ].filter(Boolean).join("\n"),
          request_type: isSeo ? "seo_audit_request" : "booking_request",
          status: normalizedStatus,
          priority: isSeo ? "high" : "medium",
          created_at: booking.created_at,
          resolved_at: normalizedStatus === "completed" ? booking.updated_at : null,
          business_id: selectedBusiness?.id ?? null,
          contact_id: null,
          contact: {
            first_name: booking.name?.split(" " )[0] ?? booking.name,
            last_name: booking.name?.split(" " ).slice(1).join(" " ) || null,
            email: booking.email,
            phone: booking.phone,
          },
        };
      });

      const combined = [...serviceRequests, ...bookingRequests]
        .filter((request) => statusFilter === "all" || request.status === statusFilter)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setRequests(combined);
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
      const request = requests.find((r) => r.id === requestId);
      if (!request) throw new Error("Request not found");

      if (request.source_table === "sparkwave_booking_requests") {
        const bookingStatus = newStatus === "pending_review"
          ? "pending"
          : newStatus === "in_progress"
            ? "reviewing"
            : newStatus === "completed"
              ? "confirmed"
              : "cancelled";
        const updateData: Record<string, string> = {
          status: bookingStatus,
          updated_at: new Date().toISOString(),
        };
        if (newStatus === "completed") {
          updateData.confirmed_at = new Date().toISOString();
        }
        const { error } = await supabase
          .from("sparkwave_booking_requests")
          .update(updateData)
          .eq("id", request.source_id);
        if (error) throw error;
      } else {
        const updateData: Record<string, string> = {
          status: newStatus,
          updated_at: new Date().toISOString(),
        };
        if (newStatus === "completed") {
          updateData.resolved_at = new Date().toISOString();
        }
        const { error } = await supabase
          .from("service_requests")
          .update(updateData)
          .eq("id", request.source_id);
        if (error) throw error;
      }

      toast({
        title: "Success",
        description: "Request status updated",
      });
      loadRequests();
    } catch (error) {
      console.error("Error updating service request:", error);
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
    const typeConfig: Record<string, { label: string; className: string }> = {
      booking_request: { label: "Booking", className: "bg-blue-100 text-blue-800 border-blue-300" },
      seo_audit_request: { label: "SEO/Growth", className: "bg-purple-100 text-purple-800 border-purple-300" },
      personaai_inquiry: { label: "PersonaAI", className: "bg-indigo-100 text-indigo-800 border-indigo-300" },
      fightflow_form: { label: "FightFlow", className: "bg-orange-100 text-orange-800 border-orange-300" },
      service_request: { label: "Service", className: "bg-slate-100 text-slate-700 border-slate-300" },
      freeze_request: { label: "Freeze", className: "bg-slate-100 text-slate-700 border-slate-300" },
      cancellation_request: { label: "Cancellation", className: "bg-red-100 text-red-800 border-red-300" },
    };

    const config = typeConfig[type] ?? {
      label: type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
      className: "bg-slate-100 text-slate-700 border-slate-300",
    };

    return (
      <Badge variant="outline" className={config.className}>
        {config.label}
      </Badge>
    );
  };

  const stats = {
    total: requests.length,
    pending: requests.filter((r) => r.status === "pending_review").length,
    inProgress: requests.filter((r) => r.status === "in_progress").length,
    completed: requests.filter((r) => r.status === "completed").length,
    disqualified: requests.filter((r) => r.status === "disqualified").length,
    needsAction: requests.filter((r) => ["pending_review", "in_progress"].includes(r.status)).length,
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
          <h1 className="text-3xl font-bold mb-2">Submission Review Queue</h1>
          <p className="text-muted-foreground">
            Review intake submissions before they are promoted into bookings, CRM, or service work
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Submissions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Pending Review
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {stats.pending}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                In Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {stats.inProgress}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Needs Action
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">
                {stats.needsAction}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Resolved / Disqualified
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-700">
                {stats.completed + stats.disqualified}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Review intake submissions</CardTitle>
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
              <div className="text-center py-8 text-muted-foreground">
                Loading requests...
              </div>
            ) : requests.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No submissions found
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Member</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead className="min-w-[220px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.map((request) => (
                    <TableRow key={request.id} className="group">
                      <TableCell>
                        {getRequestTypeBadge(request.request_type)}
                      </TableCell>
                      <TableCell className="font-medium max-w-[200px]">
                        <div className="truncate" title={request.title}>
                          {request.title}
                        </div>
                        {request.description && (
                          <div
                            className="text-xs text-muted-foreground truncate"
                            title={request.description}
                          >
                            {request.description}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">
                          {request.contact
                            ? `${request.contact.first_name ?? ""} ${request.contact.last_name ?? ""}`.trim() || "Linked contact"
                            : "No linked contact"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {request.contact?.email && (
                            <div>{request.contact.email}</div>
                          )}
                          {request.contact?.phone && (
                            <div className="text-muted-foreground">
                              {request.contact.phone}
                            </div>
                          )}
                          {!request.contact?.email && !request.contact?.phone && (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(request.status)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatToEasternCompact(request.created_at)}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                          {request.status === "pending_review" && (
                            <Button
                              size="sm"
                              onClick={() =>
                                updateRequestStatus(request.id, "in_progress")
                              }
                            >
                              Start Review
                            </Button>
                          )}
                          {request.status === "in_progress" && (
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() =>
                                updateRequestStatus(request.id, "completed")
                              }
                            >
                              Mark Reviewed
                            </Button>
                          )}
                          {["pending_review", "in_progress"].includes(request.status) && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                updateRequestStatus(request.id, "disqualified")
                              }
                            >
                              Disqualify
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

