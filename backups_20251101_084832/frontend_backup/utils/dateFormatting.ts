/**
 * Date Formatting Utilities
 * Handles timezone conversion and date/time formatting
 */

import { formatDistanceToNow, format as dateFnsFormat } from 'date-fns';
import { utcToZonedTime, zonedTimeToUtc } from 'date-fns-tz';

export type DateFormat = 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD';
export type TimeFormat = '12h' | '24h';

interface FormattingOptions {
  timezone?: string;
  dateFormat?: DateFormat;
  timeFormat?: TimeFormat;
}

/**
 * Get current user's timezone (from settings or browser)
 */
export function getUserTimezone(): string {
  try {
    const saved = localStorage.getItem('user-timezone');
    if (saved) return saved;

    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return 'UTC';
  }
}

/**
 * Set user's timezone preference
 */
export function setUserTimezone(timezone: string): void {
  localStorage.setItem('user-timezone', timezone);
}

/**
 * Get current user's date format
 */
export function getUserDateFormat(): DateFormat {
  const saved = localStorage.getItem('user-date-format') as DateFormat | null;
  return saved || 'MM/DD/YYYY';
}

/**
 * Set user's date format preference
 */
export function setUserDateFormat(format: DateFormat): void {
  localStorage.setItem('user-date-format', format);
}

/**
 * Get current user's time format
 */
export function getUserTimeFormat(): TimeFormat {
  const saved = localStorage.getItem('user-time-format') as TimeFormat | null;
  return saved || '12h';
}

/**
 * Set user's time format preference
 */
export function setUserTimeFormat(format: TimeFormat): void {
  localStorage.setItem('user-time-format', format);
}

/**
 * Convert UTC date to user's timezone
 */
export function convertToUserTimezone(
  date: Date | string,
  timezone?: string
): Date {
  try {
    const userTimezone = timezone || getUserTimezone();
    if (typeof date === 'string') {
      date = new Date(date);
    }
    return utcToZonedTime(date, userTimezone);
  } catch (error) {
    console.warn('Error converting timezone:', error);
    return new Date(date);
  }
}

/**
 * Convert user's timezone to UTC
 */
export function convertToUTC(
  date: Date | string,
  timezone?: string
): Date {
  try {
    const userTimezone = timezone || getUserTimezone();
    if (typeof date === 'string') {
      date = new Date(date);
    }
    return zonedTimeToUtc(date, userTimezone);
  } catch (error) {
    console.warn('Error converting to UTC:', error);
    return new Date(date);
  }
}

/**
 * Format date according to user preferences
 */
export function formatDate(
  date: Date | string,
  options: FormattingOptions = {}
): string {
  try {
    const {
      timezone = getUserTimezone(),
      dateFormat = getUserDateFormat()
    } = options;

    const zonedDate = typeof date === 'string' 
      ? convertToUserTimezone(new Date(date), timezone)
      : convertToUserTimezone(date, timezone);

    const formatMap: Record<DateFormat, string> = {
      'MM/DD/YYYY': 'MM/dd/yyyy',
      'DD/MM/YYYY': 'dd/MM/yyyy',
      'YYYY-MM-DD': 'yyyy-MM-dd'
    };

    return dateFnsFormat(zonedDate, formatMap[dateFormat]);
  } catch (error) {
    console.warn('Error formatting date:', error);
    return typeof date === 'string' ? date : date.toISOString();
  }
}

/**
 * Format time according to user preferences
 */
export function formatTime(
  date: Date | string,
  options: FormattingOptions = {}
): string {
  try {
    const {
      timezone = getUserTimezone(),
      timeFormat = getUserTimeFormat()
    } = options;

    const zonedDate = typeof date === 'string'
      ? convertToUserTimezone(new Date(date), timezone)
      : convertToUserTimezone(date, timezone);

    const formatString = timeFormat === '12h' ? 'hh:mm aa' : 'HH:mm';
    return dateFnsFormat(zonedDate, formatString);
  } catch (error) {
    console.warn('Error formatting time:', error);
    return typeof date === 'string' ? date : date.toISOString();
  }
}

/**
 * Format date and time together
 */
export function formatDateTime(
  date: Date | string,
  options: FormattingOptions = {}
): string {
  try {
    const {
      timezone = getUserTimezone(),
      dateFormat = getUserDateFormat(),
      timeFormat = getUserTimeFormat()
    } = options;

    const zonedDate = typeof date === 'string'
      ? convertToUserTimezone(new Date(date), timezone)
      : convertToUserTimezone(date, timezone);

    const formatMap: Record<DateFormat, string> = {
      'MM/DD/YYYY': 'MM/dd/yyyy',
      'DD/MM/YYYY': 'dd/MM/yyyy',
      'YYYY-MM-DD': 'yyyy-MM-dd'
    };

    const timeFormatString = timeFormat === '12h' ? 'hh:mm aa' : 'HH:mm';
    const formatString = `${formatMap[dateFormat]} ${timeFormatString}`;

    return dateFnsFormat(zonedDate, formatString);
  } catch (error) {
    console.warn('Error formatting date/time:', error);
    return typeof date === 'string' ? date : date.toISOString();
  }
}

/**
 * Format relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(
  date: Date | string,
  timezone?: string
): string {
  try {
    const zonedDate = typeof date === 'string'
      ? convertToUserTimezone(new Date(date), timezone)
      : convertToUserTimezone(date, timezone);

    return formatDistanceToNow(zonedDate, { addSuffix: true });
  } catch (error) {
    console.warn('Error formatting relative time:', error);
    return 'Recently';
  }
}

/**
 * Get list of supported timezones
 */
export function getSupportedTimezones(): string[] {
  return [
    'UTC',
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
    'Europe/London',
    'Europe/Paris',
    'Europe/Amsterdam',
    'Europe/Berlin',
    'Europe/Madrid',
    'Europe/Rome',
    'Europe/Moscow',
    'Asia/Dubai',
    'Asia/Kolkata',
    'Asia/Bangkok',
    'Asia/Hong_Kong',
    'Asia/Shanghai',
    'Asia/Tokyo',
    'Asia/Seoul',
    'Australia/Sydney',
    'Australia/Melbourne',
    'Pacific/Auckland',
    'Pacific/Fiji',
    'Pacific/Honolulu',
  ];
}

/**
 * Get offset for timezone from UTC
 */
export function getTimezoneOffset(
  date: Date | string = new Date(),
  timezone: string = getUserTimezone()
): string {
  try {
    const zonedDate = typeof date === 'string'
      ? convertToUserTimezone(new Date(date), timezone)
      : convertToUserTimezone(date, timezone);

    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'short'
    });

    const parts = formatter.formatToParts(zonedDate);
    const timeZoneName = parts.find(p => p.type === 'timeZoneName')?.value || '';

    return timeZoneName;
  } catch (error) {
    console.warn('Error getting timezone offset:', error);
    return timezone;
  }
}

/**
 * Format timestamp for API/storage (always UTC)
 */
export function formatForStorage(date: Date | string = new Date()): string {
  if (typeof date === 'string') {
    date = new Date(date);
  }
  return date.toISOString();
}

/**
 * Parse ISO string from storage
 */
export function parseFromStorage(dateString: string): Date {
  return new Date(dateString);
}

/**
 * Check if date is today
 */
export function isToday(date: Date | string, timezone?: string): boolean {
  try {
    const zonedDate = typeof date === 'string'
      ? convertToUserTimezone(new Date(date), timezone)
      : convertToUserTimezone(date, timezone);

    const today = convertToUserTimezone(new Date(), timezone);

    return (
      zonedDate.getDate() === today.getDate() &&
      zonedDate.getMonth() === today.getMonth() &&
      zonedDate.getFullYear() === today.getFullYear()
    );
  } catch {
    return false;
  }
}

/**
 * Check if date is tomorrow
 */
export function isTomorrow(date: Date | string, timezone?: string): boolean {
  try {
    const zonedDate = typeof date === 'string'
      ? convertToUserTimezone(new Date(date), timezone)
      : convertToUserTimezone(date, timezone);

    const tomorrow = new Date(convertToUserTimezone(new Date(), timezone));
    tomorrow.setDate(tomorrow.getDate() + 1);

    return (
      zonedDate.getDate() === tomorrow.getDate() &&
      zonedDate.getMonth() === tomorrow.getMonth() &&
      zonedDate.getFullYear() === tomorrow.getFullYear()
    );
  } catch {
    return false;
  }
}

/**
 * Smart date format (shows "Today", "Tomorrow", or formatted date)
 */
export function formatSmartDate(
  date: Date | string,
  options: FormattingOptions = {}
): string {
  const { timezone = getUserTimezone() } = options;

  if (isToday(date, timezone)) {
    return 'Today';
  }

  if (isTomorrow(date, timezone)) {
    return 'Tomorrow';
  }

  return formatDate(date, options);
}