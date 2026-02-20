import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageContent } from "@/components/layout/PageLayout";
import { useBusinessContext } from "@/contexts/BusinessContext";
import { useBusinesses } from "@/hooks/useBusinesses";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  Phone,
  Mail,
  MapPin,
  Users,
  RefreshCw,
  Calendar,
  LayoutGrid,
} from "lucide-react";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// ─── Types ───────────────────────────────────────────────────────────────────

interface Appointment {
  id: string;
  wix_booking_id: string;
  contact_name: string;
  contact_email: string | null;
  contact_phone: string | null;
  service_name: string;
  session_start: string;
  session_end: string;
  time_et: string;
  end_time_et: string;
  date_et: string;
  status: string;
  location: string | null;
  notes: string | null;
  synced_at: string;
}

interface CalendarDayResponse {
  mode: "day";
  date: string;
  range: { start: string; end: string };
  total: number;
  appointments: Appointment[];
}

interface CalendarWeekResponse {
  mode: "week";
  week_start: string;
  week_end: string;
  total: number;
  days: {
    date: string;
    day_name: string;
    total: number;
    appointments: Appointment[];
  }[];
}

type CalendarResponse = CalendarDayResponse | CalendarWeekResponse;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toDateString(date: Date): string {
  return date.toISOString().split("T")[0];
}

function todayET(): string {
  // Use Intl to get today's date in Eastern time
  const now = new Date();
  const etStr = now.toLocaleDateString("en-CA", { timeZone: "America/New_York" });
  return etStr; // returns YYYY-MM-DD
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return toDateString(d);
}

function formatDisplayDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const d = new Date(Date.UTC(year, month - 1, day));
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

function formatShortDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const d = new Date(Date.UTC(year, month - 1, day));
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

async function fetchCalendar(
  viewMode: "day" | "week",
  date: string
): Promise<CalendarResponse> {
  const param = viewMode === "week" ? `week=${date}` : `date=${date}`;
  const url = `${SUPABASE_URL}/functions/v1/fightflow-calendar?${param}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${ANON_KEY}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(err.error || `Failed to fetch calendar data`);
  }
  return res.json();
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const s = status.toLowerCase();
  const variants: Record<string, string> = {
    confirmed: "bg-green-100 text-green-800 border-green-200",
    pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
    cancelled: "bg-red-100 text-red-800 border-red-200",
    completed: "bg-blue-100 text-blue-800 border-blue-200",
    waitlisted: "bg-purple-100 text-purple-800 border-purple-200",
  };
  const cls = variants[s] || "bg-slate-100 text-slate-700 border-slate-200";
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${cls}`}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

// ─── Booking Card ─────────────────────────────────────────────────────────────

function BookingCard({ appt }: { appt: Appointment }) {
  return (
    <Card className="hover:shadow-md transition-shadow border-l-4 border-l-green-500">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          {/* Left: time + name */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <span className="text-sm font-semibold text-slate-700">
                {appt.time_et} – {appt.end_time_et}
              </span>
            </div>
            <p className="font-semibold text-slate-900 truncate">
              {appt.contact_name}
            </p>
            <p className="text-sm text-green-700 font-medium mt-0.5">
              {appt.service_name}
            </p>

            {/* Contact details */}
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
              {appt.contact_phone && (
                <a
                  href={`tel:${appt.contact_phone}`}
                  className="flex items-center gap-1 text-xs text-slate-500 hover:text-green-600 transition-colors"
                >
                  <Phone className="h-3 w-3" />
                  {appt.contact_phone}
                </a>
              )}
              {appt.contact_email && (
                <a
                  href={`mailto:${appt.contact_email}`}
                  className="flex items-center gap-1 text-xs text-slate-500 hover:text-green-600 transition-colors"
                >
                  <Mail className="h-3 w-3" />
                  <span className="truncate max-w-[200px]">
                    {appt.contact_email}
                  </span>
                </a>
              )}
            </div>

            {appt.notes && (
              <p className="mt-2 text-xs text-slate-500 italic">{appt.notes}</p>
            )}
          </div>

          {/* Right: status */}
          <div className="flex flex-col items-end gap-2 shrink-0">
            <StatusBadge status={appt.status} />
            {appt.location && (
              <span className="flex items-center gap-1 text-xs text-slate-400">
                <MapPin className="h-3 w-3" />
                <span className="max-w-[120px] truncate">{appt.location.split(",")[0]}</span>
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Day View ─────────────────────────────────────────────────────────────────

function DayView({ appointments, date }: { appointments: Appointment[]; date: string }) {
  if (appointments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="p-4 bg-slate-50 rounded-2xl mb-4">
          <CalendarDays className="h-12 w-12 text-slate-300" />
        </div>
        <p className="text-slate-500 font-medium">No classes scheduled for this day</p>
        <p className="text-slate-400 text-sm mt-1">{formatDisplayDate(date)}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {appointments.map((appt) => (
        <BookingCard key={appt.id} appt={appt} />
      ))}
    </div>
  );
}

// ─── Week View ────────────────────────────────────────────────────────────────

function WeekView({
  days,
}: {
  days: CalendarWeekResponse["days"];
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {days.map((day) => (
        <div key={day.date}>
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-slate-700 text-sm">
              {formatShortDate(day.date)}
            </h3>
            {day.total > 0 && (
              <Badge variant="secondary" className="text-xs">
                {day.total}
              </Badge>
            )}
          </div>
          {day.appointments.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-6 text-center text-xs text-slate-400">
                No classes
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {day.appointments.map((appt) => (
                <Card
                  key={appt.id}
                  className="border-l-4 border-l-green-500 hover:shadow-sm transition-shadow"
                >
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between gap-1">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-500">
                          {appt.time_et}
                        </p>
                        <p className="text-sm font-medium text-slate-900 truncate">
                          {appt.contact_name}
                        </p>
                        <p className="text-xs text-green-700 truncate">
                          {appt.service_name}
                        </p>
                      </div>
                      <StatusBadge status={appt.status} />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Bookings() {
  const { selectedBusiness, setSelectedBusiness } = useBusinessContext();
  const { data: businesses = [] } = useBusinesses();

  const [selectedDate, setSelectedDate] = useState<string>(todayET());
  const [viewMode, setViewMode] = useState<"day" | "week">("day");

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["fightflow-calendar", viewMode, selectedDate],
    queryFn: () => fetchCalendar(viewMode, selectedDate),
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 5 * 60 * 1000, // auto-refresh every 5 min
  });

  // Derived values for display
  const isToday = selectedDate === todayET();
  const appointments =
    data?.mode === "day" ? data.appointments : [];
  const total = data?.total ?? 0;

  const handlePrevDay = () => setSelectedDate((d) => addDays(d, -1));
  const handleNextDay = () => setSelectedDate((d) => addDays(d, 1));
  const handleToday = () => setSelectedDate(todayET());

  return (
    <DashboardLayout
      selectedBusinessId={selectedBusiness?.id}
      onBusinessChange={(id) => {
        const business = businesses.find((b) => b.id === id);
        if (business) setSelectedBusiness(business);
      }}
      businessName={selectedBusiness?.name}
    >
      <PageContent>
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <CalendarDays className="h-7 w-7 text-green-600" />
            Fight Flow Bookings
          </h1>
          <p className="text-slate-500 mt-1">
            Live class schedule synced from Wix · Fight Flow Academy
          </p>
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          {/* View toggle */}
          <div className="flex rounded-lg border border-slate-200 overflow-hidden">
            <Button
              variant={viewMode === "day" ? "default" : "ghost"}
              size="sm"
              className={`rounded-none gap-1.5 ${viewMode === "day" ? "bg-green-600 hover:bg-green-700 text-white" : ""}`}
              onClick={() => setViewMode("day")}
            >
              <Calendar className="h-4 w-4" />
              Day
            </Button>
            <Button
              variant={viewMode === "week" ? "default" : "ghost"}
              size="sm"
              className={`rounded-none gap-1.5 ${viewMode === "week" ? "bg-green-600 hover:bg-green-700 text-white" : ""}`}
              onClick={() => setViewMode("week")}
            >
              <LayoutGrid className="h-4 w-4" />
              Week
            </Button>
          </div>

          {/* Day navigation (only in day mode) */}
          {viewMode === "day" && (
            <>
              <Button variant="outline" size="sm" onClick={handlePrevDay}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleToday}
                disabled={isToday}
                className={isToday ? "font-semibold border-green-300 text-green-700" : ""}
              >
                Today
              </Button>
              <Button variant="outline" size="sm" onClick={handleNextDay}>
                <ChevronRight className="h-4 w-4" />
              </Button>

              {/* Date picker */}
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
                className="w-auto text-sm"
              />
            </>
          )}

          {/* Week date picker */}
          {viewMode === "week" && (
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
              className="w-auto text-sm"
            />
          )}

          {/* Refresh */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="ml-auto gap-1.5 text-slate-500"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
            {isFetching ? "Syncing…" : "Refresh"}
          </Button>
        </div>

        {/* Date heading (day mode) */}
        {viewMode === "day" && (
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-lg font-semibold text-slate-800">
              {formatDisplayDate(selectedDate)}
            </h2>
            {!isLoading && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {total} {total === 1 ? "class" : "classes"}
              </Badge>
            )}
          </div>
        )}

        {/* Week heading */}
        {viewMode === "week" && data?.mode === "week" && (
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-lg font-semibold text-slate-800">
              Week of {formatShortDate(data.week_start)} – {formatShortDate(data.week_end)}
            </h2>
            <Badge variant="secondary" className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {total} total
            </Badge>
          </div>
        )}

        {/* Loading state */}
        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-4 h-24 bg-slate-50" />
              </Card>
            ))}
          </div>
        )}

        {/* Error state */}
        {isError && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-4 text-center text-red-700">
              <p className="font-medium">Failed to load bookings</p>
              <p className="text-sm mt-1 text-red-600">
                {(error as Error)?.message || "Unknown error"}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                className="mt-3 border-red-300 text-red-700 hover:bg-red-100"
              >
                Try Again
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Content */}
        {!isLoading && !isError && data && (
          <>
            {viewMode === "day" && data.mode === "day" && (
              <DayView appointments={data.appointments} date={selectedDate} />
            )}
            {viewMode === "week" && data.mode === "week" && (
              <WeekView days={data.days} />
            )}
          </>
        )}
      </PageContent>
    </DashboardLayout>
  );
}
