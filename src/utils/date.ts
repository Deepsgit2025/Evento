/**
 * Formats an ISO "YYYY-MM-DD" date as a friendly local string
 * (e.g. "24 October 2026"). Non-ISO input (legacy free-text dates) is
 * returned unchanged.
 */
export function formatIsoDateFriendly(value: string | null | undefined): string {
  if (!value) return '';
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return value;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  if (isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
}

/**
 * Calculates the number of days until the given date string.
 * @param dateString The target date string (e.g., "October 15, 2026")
 * @returns The number of days remaining, or null if the date is invalid.
 */
export function getDaysUntil(dateString: string | null | undefined): number | null {
  if (!dateString) return null;
  
  const targetDate = Date.parse(dateString);
  if (isNaN(targetDate)) {
    return null;
  }

  // Calculate based on start of local day for accuracy
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  
  const target = new Date(targetDate);
  const targetStart = new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime();

  const diffTime = targetStart - todayStart;
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
}

/**
 * Returns a human-readable countdown string.
 */
export function getCountdownString(dateString: string | null | undefined): string | null {
  const diffDays = getDaysUntil(dateString);
  
  if (diffDays === null) return null;

  if (diffDays < 0) {
    return "The wedding date has passed";
  } else if (diffDays === 0) {
    return "Today is the big day";
  } else if (diffDays === 1) {
    return "1 day to go";
  } else {
    return `${diffDays} days to go`;
  }
}

export function parseEventDateTime(dateString: string | null | undefined, timeString: string | null | undefined): Date | null {
  if (!dateString) return null;
  // Format: YYYY-MM-DD
  const [year, month, day] = dateString.split('-').map(Number);
  if (!year || !month || !day) return null;

  let h = 0;
  let m = 0;
  if (timeString) {
    const [hours, minutes] = timeString.split(':').map(Number);
    if (hours !== undefined && minutes !== undefined) {
      h = hours;
      m = minutes;
    }
  }

  // Local time construction
  return new Date(year, month - 1, day, h, m, 0);
}

export function getEventCountdown(
  dateString: string | null | undefined,
  startTime: string | null | undefined,
  endTime: string | null | undefined
): { label: string; isPast: boolean; isToday: boolean; isNow: boolean } | null {
  const startEventDate = parseEventDateTime(dateString, startTime);
  if (!startEventDate) return null;

  const now = new Date();
  
  // To determine if it's "today" regardless of exact time
  const isToday = now.getFullYear() === startEventDate.getFullYear() &&
                  now.getMonth() === startEventDate.getMonth() &&
                  now.getDate() === startEventDate.getDate();

  const diffMs = startEventDate.getTime() - now.getTime();
  
  if (diffMs <= 0) {
    // Event has started or passed
    let endEventDate = parseEventDateTime(dateString, endTime);
    if (!endEventDate) {
      // If no end time, assume a default 2-hour duration
      endEventDate = new Date(startEventDate.getTime() + 2 * 60 * 60 * 1000);
    }

    if (now.getTime() <= endEventDate.getTime()) {
      return { label: "Starting now", isPast: false, isToday: true, isNow: true };
    } else {
      return { label: "Event completed", isPast: true, isToday, isNow: false };
    }
  }

  // Event is in the future
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) {
    return { 
      label: diffDays === 1 ? "1 day to go" : `${diffDays} days to go`, 
      isPast: false, isToday, isNow: false 
    };
  } else if (diffHours > 0) {
    return { 
      label: diffHours === 1 ? "1 hour to go" : `${diffHours} hours to go`, 
      isPast: false, isToday, isNow: false 
    };
  } else {
    return { 
      label: diffMinutes <= 1 ? "Starting in a minute" : `${diffMinutes} minutes to go`, 
      isPast: false, isToday, isNow: false 
    };
  }
}

export function groupEventsByDate(events: any[]) {
  const groups: { title: string; data: any[]; dateString: string }[] = [];
  const map: Record<string, any[]> = {};

  for (const event of events) {
    const key = event.date || 'TBD';
    if (!map[key]) {
      map[key] = [];
    }
    map[key].push(event);
  }

  // Sort dates
  const sortedDates = Object.keys(map).sort((a, b) => {
    if (a === 'TBD') return 1;
    if (b === 'TBD') return -1;
    return a.localeCompare(b);
  });

  for (const date of sortedDates) {
    let title = date;
    if (date !== 'TBD') {
      try {
        const d = new Date(date);
        title = d.toLocaleDateString('en-US', { day: 'numeric', month: 'long' }).toUpperCase();
      } catch (e) {}
    }
    groups.push({
      title,
      dateString: date,
      data: map[date]
    });
  }

  return groups;
}
