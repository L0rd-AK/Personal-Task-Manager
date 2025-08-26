import * as chrono from 'chrono-node';
import { addMinutes, addHours, addDays, isValid } from 'date-fns';

export interface ParsedTime {
  endsAt: Date;
  duration: number; // in seconds
  description?: string;
}

// Natural language patterns for task creation
const durationPatterns = [
  { pattern: /(\d+)\s*h(our)?s?/i, multiplier: 3600 },
  { pattern: /(\d+)\s*m(in)?s?/i, multiplier: 60 },
  { pattern: /(\d+)\s*s(ec)?s?/i, multiplier: 1 },
  { pattern: /(\d+\.?\d*)\s*h(our)?s?/i, multiplier: 3600 },
  { pattern: /(\d+\.?\d*)\s*m(in)?s?/i, multiplier: 60 }
];

const quickDurationMap = {
  '15min': 15 * 60,
  '30min': 30 * 60,
  '45min': 45 * 60,
  '1h': 60 * 60,
  '1hour': 60 * 60,
  '2h': 2 * 60 * 60,
  '2hours': 2 * 60 * 60,
  '3h': 3 * 60 * 60,
  '4h': 4 * 60 * 60,
  '1d': 24 * 60 * 60,
  '1day': 24 * 60 * 60
};

export const parseNaturalLanguage = (input: string): ParsedTime | null => {
  const normalizedInput = input.toLowerCase().trim();
  
  // Try quick duration map first
  for (const [key, duration] of Object.entries(quickDurationMap)) {
    if (normalizedInput.includes(key)) {
      const endsAt = new Date(Date.now() + duration * 1000);
      return { endsAt, duration };
    }
  }
  
  // Try duration patterns
  for (const { pattern, multiplier } of durationPatterns) {
    const match = normalizedInput.match(pattern);
    if (match) {
      const value = parseFloat(match[1]);
      const duration = value * multiplier;
      const endsAt = new Date(Date.now() + duration * 1000);
      return { endsAt, duration };
    }
  }
  
  // Try chrono for absolute time parsing
  const chronoParsed = chrono.parseDate(input, new Date(), { forwardDate: true });
  if (chronoParsed && isValid(chronoParsed) && chronoParsed > new Date()) {
    const duration = Math.floor((chronoParsed.getTime() - Date.now()) / 1000);
    return { endsAt: chronoParsed, duration };
  }
  
  // Try relative time parsing
  const relativePatterns = [
    { pattern: /in (\d+) ?(h|hour|hours)/i, fn: (n: number) => addHours(new Date(), n) },
    { pattern: /in (\d+) ?(m|min|minute|minutes)/i, fn: (n: number) => addMinutes(new Date(), n) },
    { pattern: /in (\d+) ?(d|day|days)/i, fn: (n: number) => addDays(new Date(), n) },
    { pattern: /(\d+) ?(h|hour|hours) from now/i, fn: (n: number) => addHours(new Date(), n) },
    { pattern: /(\d+) ?(m|min|minute|minutes) from now/i, fn: (n: number) => addMinutes(new Date(), n) }
  ];
  
  for (const { pattern, fn } of relativePatterns) {
    const match = normalizedInput.match(pattern);
    if (match) {
      const value = parseInt(match[1]);
      const endsAt = fn(value);
      const duration = Math.floor((endsAt.getTime() - Date.now()) / 1000);
      return { endsAt, duration };
    }
  }
  
  // Default fallback - if contains any numbers, assume minutes
  const numberMatch = normalizedInput.match(/(\d+)/);
  if (numberMatch) {
    const minutes = parseInt(numberMatch[1]);
    if (minutes > 0 && minutes <= 1440) { // Max 24 hours
      const duration = minutes * 60;
      const endsAt = new Date(Date.now() + duration * 1000);
      return { endsAt, duration };
    }
  }
  
  return null;
};

// Examples of supported formats:
// "in 2h", "in 30min", "2 hours", "30 minutes", "tomorrow 9am", 
// "next friday 2pm", "in 1 day", "45min", "1.5h", etc.

export const formatDuration = (seconds: number): string => {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  if (seconds < 86400) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.round((seconds % 3600) / 60);
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }
  
  const days = Math.floor(seconds / 86400);
  const hours = Math.round((seconds % 86400) / 3600);
  return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
};

export const formatTimeRemaining = (seconds: number): string => {
  if (seconds <= 0) return 'Time\'s up!';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  } else {
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }
};