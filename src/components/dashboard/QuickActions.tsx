import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { CalendarDays, Users, Mail, Sparkles, Image } from 'lucide-react';

export function QuickActions() {
  const actions = [
    {
      label: 'View Calendar',
      href: '/bookings',
      icon: CalendarDays,
      description: 'Manage bookings',
      color: 'text-green-600',
      bgColor: 'bg-green-50 hover:bg-green-100',
    },
    {
      label: 'All Contacts',
      href: '/contacts',
      icon: Users,
      description: 'CRM & leads',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 hover:bg-blue-100',
    },
    {
      label: 'Email Campaign',
      href: '/email-marketing',
      icon: Mail,
      description: 'Send emails',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50 hover:bg-purple-100',
    },
    {
      label: 'Create Content',
      href: '/content-center',
      icon: Sparkles,
      description: 'AI content',
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50 hover:bg-indigo-100',
    },
    {
      label: 'Media Library',
      href: '/media-library',
      icon: Image,
      description: 'Images & videos',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50 hover:bg-orange-100',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {actions.map((action) => {
        const Icon = action.icon;
        return (
          <Link
            key={action.href}
            to={action.href}
            className={`flex flex-col items-center gap-2 p-4 rounded-xl ${action.bgColor} transition-all duration-200 border border-transparent hover:border-gray-200 hover:shadow-sm`}
          >
            <div className={`p-2 rounded-lg bg-white shadow-sm`}>
              <Icon className={`h-5 w-5 ${action.color}`} />
            </div>
            <div className="text-center">
              <span className="font-medium text-gray-900 text-sm block">
                {action.label}
              </span>
              <span className="text-xs text-gray-500">
                {action.description}
              </span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
