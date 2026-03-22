import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader, PageContent } from '@/components/layout/PageLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Clock, Users, Search, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { format, addDays, startOfWeek, isSameDay, parseISO } from 'date-fns';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

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

const Bookings = () => {
  const [weekOffset, setWeekOffset] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

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
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-5 w-5 text-indigo-600" />
              Bookings This Week
              <Badge variant="outline" className="ml-1">{filteredBookings.length}</Badge>
            </CardTitle>
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
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </PageContent>
    </DashboardLayout>
  );
};

export default Bookings;
