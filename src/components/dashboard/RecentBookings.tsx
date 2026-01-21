import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CalendarCheck, User, Clock, ArrowRight, Calendar } from 'lucide-react';
import { format, isToday, isTomorrow, parseISO } from 'date-fns';

interface Booking {
  id: string;
  booking_date: string;
  status: string;
  created_at: string;
  contact: {
    id: string;
    first_name: string | null;
    last_name: string | null;
  } | null;
  class_schedule: {
    id: string;
    class_name: string;
    start_time: string;
  } | null;
}

interface RecentBookingsProps {
  businessId: string;
  onContactClick: (contactId: string) => void;
}

function formatBookingDate(dateStr: string, timeStr: string | undefined): string {
  const date = parseISO(dateStr);

  let dayLabel = format(date, 'EEE, MMM d');
  if (isToday(date)) {
    dayLabel = 'Today';
  } else if (isTomorrow(date)) {
    dayLabel = 'Tomorrow';
  }

  if (timeStr) {
    const [hours, minutes] = timeStr.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const formattedHour = hour % 12 || 12;
    return `${dayLabel} ${formattedHour}:${minutes} ${ampm}`;
  }

  return dayLabel;
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'confirmed':
      return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Confirmed</Badge>;
    case 'showed':
      return <Badge className="bg-green-100 text-green-800 border-green-200">Showed</Badge>;
    case 'no_show':
      return <Badge variant="destructive">No Show</Badge>;
    case 'cancelled':
      return <Badge variant="secondary">Cancelled</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

export function RecentBookings({ businessId, onContactClick }: RecentBookingsProps) {
  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ['recent-bookings', businessId],
    queryFn: async () => {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      const { data, error } = await supabase
        .from('class_bookings')
        .select(`
          id,
          booking_date,
          status,
          created_at,
          contact:contacts (
            id,
            first_name,
            last_name
          ),
          class_schedule (
            id,
            class_name,
            start_time
          )
        `)
        .eq('business_id', businessId)
        .gte('created_at', twentyFourHoursAgo)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Error fetching bookings:', error);
        return [];
      }

      return (data || []) as Booking[];
    },
    enabled: !!businessId,
    refetchInterval: 60000, // Refresh every minute
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <CalendarCheck className="h-5 w-5 text-green-600" />
            Recent Bookings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse flex items-center gap-4 p-3 rounded-lg bg-gray-50">
                <div className="h-10 w-10 rounded-full bg-gray-200" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-24 bg-gray-200 rounded" />
                  <div className="h-3 w-32 bg-gray-200 rounded" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-lg">
          <span className="flex items-center gap-2">
            <CalendarCheck className="h-5 w-5 text-green-600" />
            Recent Bookings
          </span>
          <Button variant="ghost" size="sm" asChild className="text-indigo-600 hover:text-indigo-700">
            <Link to="/bookings" className="flex items-center gap-1">
              View Calendar
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {bookings.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Calendar className="h-10 w-10 mx-auto mb-3 text-gray-300" />
            <p className="font-medium">No bookings in the last 24 hours</p>
            <p className="text-sm">New bookings will appear here automatically</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs text-gray-500 border-b">
                  <th className="pb-2 font-medium">Contact</th>
                  <th className="pb-2 font-medium">Class</th>
                  <th className="pb-2 font-medium">When</th>
                  <th className="pb-2 font-medium text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {bookings.map((booking) => (
                  <tr
                    key={booking.id}
                    onClick={() => booking.contact?.id && onContactClick(booking.contact.id)}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center">
                          <User className="h-4 w-4 text-gray-500" />
                        </div>
                        <span className="font-medium text-gray-900">
                          {booking.contact
                            ? `${booking.contact.first_name || ''} ${booking.contact.last_name || ''}`.trim() || 'Unknown'
                            : 'Unknown'}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 text-gray-600">
                      {booking.class_schedule?.class_name || 'Unknown Class'}
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-1 text-gray-600">
                        <Clock className="h-3 w-3" />
                        {formatBookingDate(booking.booking_date, booking.class_schedule?.start_time)}
                      </div>
                    </td>
                    <td className="py-3 text-right">
                      {getStatusBadge(booking.status)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
