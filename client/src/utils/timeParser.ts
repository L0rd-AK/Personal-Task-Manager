import { addMinutes, addHours, addDays, setHours, setMinutes } from 'date-fns';

export interface ParsedTime {
  duration: number; // seconds
  endsAt: string;
  startsAt: string;
}

export function parseNaturalTime(input: string): ParsedTime | null {
  const now = new Date();
  const lowercaseInput = input.toLowerCase().trim();
  
  // Duration patterns (e.g., "in 2h", "2 hours", "30 minutes")
  const durationPatterns = [
    // "in X minutes/hours"
    /in\s+(\d+)\s*(m|min|mins|minute|minutes)/i,
    /in\s+(\d+)\s*(h|hr|hrs|hour|hours)/i,
    /in\s+(\d+)\s*(d|day|days)/i,
    
    // "X minutes/hours"
    /(\d+)\s*(m|min|mins|minute|minutes)/i,
    /(\d+)\s*(h|hr|hrs|hour|hours)/i,
    /(\d+)\s*(d|day|days)/i,
    
    // "X:XX format"
    /(\d{1,2}):(\d{2})/
  ];

  // Time patterns (e.g., "tomorrow 9am", "next friday 2pm")
  const timePatterns = [
    // Tomorrow/today with time
    /(tomorrow|today)\s+(\d{1,2})(am|pm)/i,
    /(tomorrow|today)\s+(\d{1,2}):(\d{2})(am|pm)?/i,
    
    // Specific days
    /(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\s+(\d{1,2})(am|pm)/i,
    /(next\s+)?(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\s+(\d{1,2}):(\d{2})(am|pm)?/i,
    
    // Just time (assumes today if future, tomorrow if past)
    /(\d{1,2})(am|pm)/i,
    /(\d{1,2}):(\d{2})(am|pm)?/i
  ];

  // Try duration patterns first
  for (const pattern of durationPatterns) {
    const match = lowercaseInput.match(pattern);
    if (match) {
      let duration = 0;
      let endsAt = new Date(now);

      if (pattern.source.includes('m|min')) {
        // Minutes
        duration = parseInt(match[1]) * 60;
        endsAt = addMinutes(now, parseInt(match[1]));
      } else if (pattern.source.includes('h|hr')) {
        // Hours
        duration = parseInt(match[1]) * 3600;
        endsAt = addHours(now, parseInt(match[1]));
      } else if (pattern.source.includes('d|day')) {
        // Days
        duration = parseInt(match[1]) * 24 * 3600;
        endsAt = addDays(now, parseInt(match[1]));
      } else if (match[2]) {
        // X:XX format (assume hours:minutes)
        const hours = parseInt(match[1]);
        const minutes = parseInt(match[2]);
        duration = (hours * 3600) + (minutes * 60);
        endsAt = addMinutes(addHours(now, hours), minutes);
      }

      return {
        duration,
        endsAt: endsAt.toISOString(),
        startsAt: now.toISOString()
      };
    }
  }

  // Try time patterns
  for (const pattern of timePatterns) {
    const match = lowercaseInput.match(pattern);
    if (match) {
      let targetDate = new Date(now);
      let hour = 0;
      let minute = 0;

      if (match[1] === 'tomorrow') {
        targetDate = addDays(now, 1);
        hour = parseInt(match[2]);
        if (match[3] === 'pm' && hour !== 12) hour += 12;
        if (match[3] === 'am' && hour === 12) hour = 0;
        minute = match[4] ? parseInt(match[4]) : 0;
      } else if (match[1] === 'today') {
        hour = parseInt(match[2]);
        if (match[3] === 'pm' && hour !== 12) hour += 12;
        if (match[3] === 'am' && hour === 12) hour = 0;
        minute = match[4] ? parseInt(match[4]) : 0;
      } else if (match[1] && ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].includes(match[1])) {
        // Specific day
        const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const targetDay = days.indexOf(match[1]);
        const currentDay = now.getDay();
        
        let daysToAdd = targetDay - currentDay;
        if (daysToAdd <= 0) daysToAdd += 7; // Next occurrence of this day
        
        targetDate = addDays(now, daysToAdd);
        hour = parseInt(match[2]);
        if (match[3] === 'pm' && hour !== 12) hour += 12;
        if (match[3] === 'am' && hour === 12) hour = 0;
        minute = match[4] ? parseInt(match[4]) : 0;
      } else {
        // Just time - assume today if future, tomorrow if past
        hour = parseInt(match[1]);
        if (match[2] === 'pm' && hour !== 12) hour += 12;
        if (match[2] === 'am' && hour === 12) hour = 0;
        minute = match[3] ? parseInt(match[3]) : 0;
        
        const todayTime = setMinutes(setHours(now, hour), minute);
        if (todayTime <= now) {
          targetDate = addDays(now, 1);
        }
      }

      const endsAt = setMinutes(setHours(targetDate, hour), minute);
      const duration = Math.floor((endsAt.getTime() - now.getTime()) / 1000);

      return {
        duration,
        endsAt: endsAt.toISOString(),
        startsAt: now.toISOString()
      };
    }
  }

  return null;
}

// Examples of what this parser can handle:
// "in 30 minutes" -> 30 minute duration from now
// "in 2 hours" -> 2 hour duration from now  
// "tomorrow 9am" -> until 9am tomorrow
// "friday 2pm" -> until 2pm next friday
// "2:30" -> 2 hours 30 minutes from now
// "10am" -> until 10am (today if future, tomorrow if past)
