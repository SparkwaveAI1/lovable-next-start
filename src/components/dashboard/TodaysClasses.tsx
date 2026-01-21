import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dumbbell, Clock, Users, ArrowRight, Calendar } from 'lucide-react';

interface ClassScheduleWithBookings {
  id: string;
  class_name: string;
  start_time: string;
  end_time: string;
  instructor: string | null;
  booking_count: number;
}

interface TodaysClassesProps {
  businessId: string;
}

function formatTime(time: string): string {
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const formattedHour = hour % 12 || 12;
  return `${formattedHour}:${minutes} ${ampm}`;
}

export function TodaysClasses({ businessId }: TodaysClassesProps) {
  const { data: classes = [], isLoading } = useQuery({
    queryKey: ['todays-classes', businessId],
    queryFn: async () => {
      // Get today's day of week (0 = Sunday, 6 = Saturday)
      const today = new Date();
      const dayOfWeek = today.getDay();
      const todayDateStr = today.toISOString().split('T')[0];

      // Get classes for today
      const { data: scheduleData, error: scheduleError } = await supabase
        .from('class_schedule')
        .select('id, class_name, start_time, end_time, instructor')
        .eq('business_id', businessId)
        .eq('day_of_week', dayOfWeek)
        .eq('is_active', true)
        .order('start_time', { ascending: true });

      if (scheduleError) {
        console.error('Error fetching classes:', scheduleError);
        return [];
      }

      if (!scheduleData || scheduleData.length === 0) {
        return [];
      }

      // Get booking counts for each class
      const classIds = scheduleData.map(c => c.id);

      const { data: bookingCounts, error: bookingError } = await supabase
        .from('class_bookings')
        .select('class_schedule_id')
        .eq('business_id', businessId)
        .eq('booking_date', todayDateStr)
        .in('class_schedule_id', classIds)
        .in('status', ['confirmed', 'showed']);

      if (bookingError) {
        console.error('Error fetching booking counts:', bookingError);
      }

      // Count bookings per class
      const countMap: Record<string, number> = {};
      for (const booking of bookingCounts || []) {
        const classId = booking.class_schedule_id;
        countMap[classId] = (countMap[classId] || 0) + 1;
      }

      // Combine data
      const classesWithCounts: ClassScheduleWithBookings[] = scheduleData.map(cls => ({
        id: cls.id,
        class_name: cls.class_name,
        start_time: cls.start_time,
        end_time: cls.end_time,
        instructor: cls.instructor,
        booking_count: countMap[cls.id] || 0,
      }));

      return classesWithCounts;
    },
    enabled: !!businessId,
    refetchInterval: 60000, // Refresh every minute
  });

  // Get day name for display
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const todayName = dayNames[new Date().getDay()];

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Dumbbell className="h-5 w-5 text-orange-600" />
            Today's Classes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse flex items-center gap-4 p-3 rounded-lg bg-gray-50">
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-24 bg-gray-200 rounded" />
                  <div className="h-3 w-16 bg-gray-200 rounded" />
                </div>
                <div className="h-6 w-12 bg-gray-200 rounded" />
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
            <Dumbbell className="h-5 w-5 text-orange-600" />
            Today's Classes
          </span>
          <Badge variant="outline" className="font-normal">
            {todayName}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {classes.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Calendar className="h-10 w-10 mx-auto mb-3 text-gray-300" />
            <p className="font-medium">No classes scheduled for today</p>
            <p className="text-sm">Classes will appear here based on the schedule</p>
          </div>
        ) : (
          <div className="space-y-2">
            {classes.map((cls) => (
              <div
                key={cls.id}
                className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-gray-900 truncate">
                    {cls.class_name}
                  </h4>
                  <div className="flex items-center gap-3 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatTime(cls.start_time)}
                    </span>
                    {cls.instructor && (
                      <span className="truncate">
                        {cls.instructor}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={cls.booking_count > 0 ? "default" : "secondary"}
                    className={cls.booking_count > 0 ? "bg-indigo-100 text-indigo-800 border-indigo-200" : ""}
                  >
                    <Users className="h-3 w-3 mr-1" />
                    {cls.booking_count}
                  </Badge>
                </div>
              </div>
            ))}

            <div className="pt-2">
              <Button variant="outline" size="sm" asChild className="w-full">
                <Link to="/bookings" className="flex items-center justify-center gap-1">
                  View Full Calendar
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
