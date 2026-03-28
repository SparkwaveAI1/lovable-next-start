import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader, PageContent } from '@/components/layout/PageLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Calendar, Clock, Users, Search, Loader2, ChevronLeft, ChevronRight, Plus, X } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, addDays, startOfWeek, isSameDay, parseISO } from 'date-fns';
import { toast } from 'sonner';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const STATUS_COLORS: Record<string, string> = {
  confirmed:   'bg-green-100 text-green-800 border-green-200',
  pending:     'bg-yellow-100 text-yellow-800 border-yellow-200',
  cancelled:   'bg-red-100 text-red-800 border-red-200',
  completed:   'bg-blue-100 text-blue-800 border-blue-200',
  waitlisted:  'bg-purple-100 text-purple-800 border-purple-200',
};

interface ClassSchedule {
  id: string;
  class_name: string;
  instructor: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  max_capacity: number;
  is_active: boolean;
}

interface Booking {
  id: string;
  booking_date: string;
  status: string;
  notes: string | null;
  class_schedule: ClassSchedule;
  contacts: { first_name: string; last_name: string; email: string } | null;
}

interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

// ─── Create Booking Dialog ─────────────────────────────────────────────────

function CreateBookingDialog({
  open,
  onClose,
  schedule,
  weekDates,
}: {
  open: boolean;
  onClose: () => void;
  schedule: ClassSchedule[];
  weekDates: Date[];
}) {
  const queryClient = useQueryClient();
  const [selectedScheduleId, setSelectedScheduleId] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedContactId, setSelectedContactId] = useState('');
  const [notes, setNotes] = useState('');

  // Fetch contacts for dropdown
  const { data: contacts = [], isLoading: contactsLoading } = useQuery({
    queryKey: ['contacts_for_booking'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contacts')
        .select('id, first_name, last_name, email')
        .order('first_name');
      if (error) throw error;
      return data as Contact[];
    },
    enabled: open,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!selectedScheduleId || !selectedDate || !selectedContactId) {
        throw new Error('Please fill in all required fields');
      }
      const { data, error } = await supabase
        .from('class_bookings')
        .insert({
          class_schedule_id: selectedScheduleId,
          booking_date: selectedDate,
          contact_id: selectedContactId,
          status: 'confirmed',
          notes: notes || null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Booking created successfully');
      queryClient.invalidateQueries({ queryKey: ['class_bookings'] });
      handleClose();
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to create booking');
    },
  });

  const handleClose = () => {
    setSelectedScheduleId('');
    setSelectedDate('');
    setSelectedContactId('');
    setNotes('');
    onClose();
  };

  // When a class is selected, auto-select the matching weekday date
  const handleClassSelect = (scheduleId: string) => {
    setSelectedScheduleId(scheduleId);
    const cls = schedule.find(c => c.id === scheduleId);
    if (cls) {
      const matchingDate = weekDates[cls.day_of_week];
      if (matchingDate) {
        setSelectedDate(format(matchingDate, 'yyyy-MM-dd'));
      }
    }
  };

  const selectedClass = schedule.find(c => c.id === selectedScheduleId);

  return (
    <Dialog open={open} onOpenChange={open => !open && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-indigo-600" />
            Create Booking
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Class selection */}
          <div className="space-y-1.5">
            <Label>Class <span className="text-red-500">*</span></Label>
            <Select value={selectedScheduleId} onValueChange={handleClassSelect}>
              <SelectTrigger>
                <SelectValue placeholder="Select a class..." />
              </SelectTrigger>
              <SelectContent>
                {schedule.map(cls => (
                  <SelectItem key={cls.id} value={cls.id}>
                    {DAYS[cls.day_of_week]} · {cls.class_name} ({cls.start_time.slice(0, 5)}) — {cls.instructor}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date */}
          <div className="space-y-1.5">
            <Label>Booking Date <span className="text-red-500">*</span></Label>
            <Input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
            />
            {selectedClass && selectedDate && (
              <p className="text-xs text-gray-500">
                {selectedClass.class_name} on {format(parseISO(selectedDate), 'EEEE, MMM d')}
              </p>
            )}
          </div>

          {/* Contact */}
          <div className="space-y-1.5">
            <Label>Member <span className="text-red-500">*</span></Label>
            {contactsLoading ? (
              <div className="flex items-center gap-2 text-gray-400 text-sm py-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading contacts...
              </div>
            ) : (
              <Select value={selectedContactId} onValueChange={setSelectedContactId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a member..." />
                </SelectTrigger>
                <SelectContent>
                  {contacts.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.first_name} {c.last_name}
                      {c.email ? ` (${c.email})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label>Notes <span className="text-gray-400 text-xs">(optional)</span></Label>
            <Input
              placeholder="Add notes..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose} disabled={createMutation.isPending}>
            Cancel
          </Button>
          <Button
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending || !selectedScheduleId || !selectedDate || !selectedContactId}
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            {createMutation.isPending ? (
              <><Loader2 className="h-4 w-4 animate-spin mr-2" />Creating...</>
            ) : (
              'Create Booking'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────

const Bookings = () => {
  const queryClient = useQueryClient();
  const [weekOffset, setWeekOffset] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const weekStart = startOfWeek(addDays(new Date(), weekOffset * 7), { weekStartsOn: 0 });
  const weekDates = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Fetch class schedule (recurring)
  const { data: schedule = [], isLoading: schedLoading } = useQuery({
    queryKey: ['class_schedule'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('class_schedule')
        .select('*')
        .eq('is_active', true)
        .order('day_of_week')
        .order('start_time');
      if (error) throw error;
      return data as ClassSchedule[];
    },
  });

  // Fetch actual bookings for this week
  const weekStartStr = format(weekStart, 'yyyy-MM-dd');
  const weekEndStr = format(addDays(weekStart, 6), 'yyyy-MM-dd');

  const { data: bookings = [], isLoading: bookLoading } = useQuery({
    queryKey: ['class_bookings', weekStartStr],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('class_bookings')
        .select('id,booking_date,status,notes,class_schedule(*),contacts(first_name,last_name,email)')
        .gte('booking_date', weekStartStr)
        .lte('booking_date', weekEndStr)
        .order('booking_date');
      if (error) throw error;
      return data as Booking[];
    },
  });

  // Cancel booking mutation
  const cancelMutation = useMutation({
    mutationFn: async (bookingId: string) => {
      const { error } = await supabase
        .from('class_bookings')
        .update({ status: 'cancelled' })
        .eq('id', bookingId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Booking cancelled');
      queryClient.invalidateQueries({ queryKey: ['class_bookings'] });
      setCancellingId(null);
    },
    onError: () => {
      toast.error('Failed to cancel booking');
      setCancellingId(null);
    },
  });

  const handleCancelBooking = (bookingId: string) => {
    setCancellingId(bookingId);
    cancelMutation.mutate(bookingId);
  };

  const isLoading = schedLoading || bookLoading;

  // Summary counts
  const totalBookings = bookings.length;
  const confirmed = bookings.filter(b => b.status === 'confirmed').length;
  const cancelled = bookings.filter(b => b.status === 'cancelled').length;

  // Filter bookings for search/status
  const filteredBookings = bookings.filter(b => {
    const matchStatus = statusFilter === 'all' || b.status === statusFilter;
    const q = search.toLowerCase();
    const name = `${b.contacts?.first_name || ''} ${b.contacts?.last_name || ''}`.toLowerCase();
    const cls = (b.class_schedule?.class_name || '').toLowerCase();
    const instructor = (b.class_schedule?.instructor || '').toLowerCase();
    const matchSearch = !q || name.includes(q) || cls.includes(q) || instructor.includes(q);
    return matchStatus && matchSearch;
  });

  return (
    <DashboardLayout>
      <PageHeader
        title="Bookings & Schedule"
        description="Fight Flow Academy — class schedule and member bookings"
      />
      <PageContent>
        {/* Week navigator */}
        <div className="flex items-center justify-between mb-6">
          <Button variant="outline" size="sm" onClick={() => setWeekOffset(w => w - 1)}>
            <ChevronLeft className="h-4 w-4 mr-1" /> Prev Week
          </Button>
          <span className="font-semibold text-gray-700">
            {format(weekStart, 'MMM d')} – {format(addDays(weekStart, 6), 'MMM d, yyyy')}
            {weekOffset === 0 && <Badge variant="outline" className="ml-2 text-xs">This Week</Badge>}
          </span>
          <Button variant="outline" size="sm" onClick={() => setWeekOffset(w => w + 1)}>
            Next Week <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{schedule.length}</div><div className="text-sm text-gray-500">Weekly Classes</div></CardContent></Card>
          <Card><CardContent className="pt-4"><div className="text-2xl font-bold text-blue-600">{totalBookings}</div><div className="text-sm text-gray-500">Bookings This Week</div></CardContent></Card>
          <Card><CardContent className="pt-4"><div className="text-2xl font-bold text-green-600">{confirmed}</div><div className="text-sm text-gray-500">Confirmed</div></CardContent></Card>
          <Card><CardContent className="pt-4"><div className="text-2xl font-bold text-red-500">{cancelled}</div><div className="text-sm text-gray-500">Cancelled</div></CardContent></Card>
        </div>

        {/* Weekly class schedule grid */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="h-5 w-5 text-indigo-600" />
              Weekly Class Schedule
            </CardTitle>
          </CardHeader>
          <CardContent>
            {schedLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-indigo-400 mr-2" />
                <span className="text-gray-400">Loading schedule...</span>
              </div>
            ) : (
              <div className="grid grid-cols-7 gap-2">
                {weekDates.map((date, dayIdx) => {
                  const dayClasses = schedule.filter(c => c.day_of_week === dayIdx);
                  const isToday = isSameDay(date, new Date());
                  return (
                    <div key={dayIdx} className={`min-h-24 rounded-lg p-2 ${isToday ? 'bg-indigo-50 border border-indigo-200' : 'bg-gray-50 border border-gray-100'}`}>
                      <div className={`text-xs font-semibold mb-1 ${isToday ? 'text-indigo-700' : 'text-gray-500'}`}>
                        {DAYS[dayIdx]}<br />
                        <span className="font-normal">{format(date, 'M/d')}</span>
                      </div>
                      <div className="space-y-1">
                        {dayClasses.map(cls => (
                          <div key={cls.id} className="bg-white rounded p-1 border border-gray-200 shadow-sm">
                            <div className="text-xs font-medium text-gray-800 truncate">{cls.class_name}</div>
                            <div className="text-xs text-gray-400">{cls.start_time.slice(0,5)}</div>
                            <div className="text-xs text-gray-400 truncate">{cls.instructor}</div>
                          </div>
                        ))}
                        {dayClasses.length === 0 && (
                          <div className="text-xs text-gray-300 text-center pt-2">—</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bookings list */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-5 w-5 text-indigo-600" />
                Bookings This Week
                <Badge variant="outline" className="ml-1">{filteredBookings.length}</Badge>
              </CardTitle>
              <Button
                onClick={() => setCreateDialogOpen(true)}
                size="sm"
                className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5"
                disabled={schedLoading}
              >
                <Plus className="h-4 w-4" />
                Create Booking
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Filters */}
            <div className="flex gap-3 mb-4">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search member, class, instructor..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-9 h-9 text-sm"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-36 h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {bookLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-indigo-400 mr-2" />
                <span className="text-gray-400">Loading bookings...</span>
              </div>
            ) : filteredBookings.length === 0 ? (
              <div className="text-center py-10 text-gray-400">
                No bookings found for this week.
                <div className="mt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCreateDialogOpen(true)}
                    className="gap-1.5"
                  >
                    <Plus className="h-4 w-4" />
                    Create First Booking
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredBookings.map(b => (
                  <div key={b.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-semibold text-sm shrink-0">
                        {(b.contacts?.first_name?.[0] || '?')}{(b.contacts?.last_name?.[0] || '')}
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium text-gray-900 text-sm">
                          {b.contacts ? `${b.contacts.first_name} ${b.contacts.last_name}` : 'Unknown Member'}
                        </div>
                        <div className="text-xs text-gray-500 truncate">
                          {b.class_schedule?.class_name} · {b.class_schedule?.instructor} · {b.class_schedule?.start_time?.slice(0,5)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-gray-400">{format(parseISO(b.booking_date), 'EEE M/d')}</span>
                      <Badge variant="outline" className={`text-xs capitalize ${STATUS_COLORS[b.status] || ''}`}>
                        {b.status}
                      </Badge>
                      {b.status !== 'cancelled' && b.status !== 'completed' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-red-500 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleCancelBooking(b.id)}
                          disabled={cancellingId === b.id}
                          title="Cancel booking"
                        >
                          {cancellingId === b.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <X className="h-3.5 w-3.5" />
                          )}
                          <span className="ml-1 text-xs">Cancel</span>
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Create Booking Dialog */}
        <CreateBookingDialog
          open={createDialogOpen}
          onClose={() => setCreateDialogOpen(false)}
          schedule={schedule}
          weekDates={weekDates}
        />
      </PageContent>
    </DashboardLayout>
  );
};

export default Bookings;
