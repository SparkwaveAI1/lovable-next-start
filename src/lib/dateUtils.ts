import { format } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';

const EASTERN_TIMEZONE = 'America/New_York';

/**
 * Formats a date string or Date object to Eastern timezone
 * Shows full date and time with timezone indicator (EST/EDT)
 */
export const formatToEasternDateTime = (dateString: string | Date): string => {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  return formatInTimeZone(date, EASTERN_TIMEZONE, 'MMM dd, yyyy h:mm a zzz');
};

/**
 * Formats a date string or Date object to Eastern timezone
 * Shows only date with timezone indicator
 */
export const formatToEasternDate = (dateString: string | Date): string => {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  return formatInTimeZone(date, EASTERN_TIMEZONE, 'MMM dd, yyyy zzz');
};

/**
 * Formats a date string or Date object to Eastern timezone
 * Shows compact format for table display
 */
export const formatToEasternCompact = (dateString: string | Date): string => {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  return formatInTimeZone(date, EASTERN_TIMEZONE, 'MMM dd, yyyy h:mm a');
};