/**
 * Helper to get local date parts formatted as YYYY-MM-DD
 */
export function getLocalDateString(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get ISO week key and date range (Monday to Sunday) for a date.
 */
export function getWeekDetails(date) {
  const d = new Date(date);
  // Get day of week (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
  const day = d.getDay();
  // Calculate distance to current week's Monday
  const diffToMonday = d.getDate() - day + (day === 0 ? -6 : 1);
  
  const monday = new Date(d.setDate(diffToMonday));
  monday.setHours(0, 0, 0, 0);
  
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  // ISO week number calculation
  const target = new Date(monday.valueOf());
  const dayNr = (monday.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay() + 7) % 7));
  }
  const weekNum = 1 + Math.ceil((firstThursday - target) / 604800000);
  const year = monday.getFullYear();

  return {
    key: `${year}-W${String(weekNum).padStart(2, '0')}`,
    start: monday,
    end: sunday,
    label: `W${weekNum} (${monday.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} - ${sunday.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })})`
  };
}

/**
 * Get local month key (YYYY-MM) and label (e.g. "June 2026")
 */
export function getMonthDetails(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const label = d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  return {
    key: `${year}-${month}`,
    label
  };
}

/**
 * Groups time entries by Day, including all dates in the range (even with 0 duration)
 */
export function groupTimeEntriesByDay(entries, startDate, endDate) {
  const groups = {};
  
  // Initialize date range with 0 duration
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  const current = new Date(start);
  current.setHours(0, 0, 0, 0);
  
  while (current <= end) {
    const key = getLocalDateString(current);
    groups[key] = {
      key,
      duration: 0,
      label: new Date(current).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      entries: []
    };
    current.setDate(current.getDate() + 1);
  }

  // Populate entries
  entries.forEach(entry => {
    if (!entry.started_at) return;
    const dateKey = getLocalDateString(entry.started_at);
    
    // Fallback if date falls slightly outside filter bounds but is returned
    if (!groups[dateKey]) {
      groups[dateKey] = {
        key: dateKey,
        duration: 0,
        label: new Date(entry.started_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        entries: []
      };
    }
    
    groups[dateKey].duration += entry.duration || 0;
    groups[dateKey].entries.push(entry);
  });

  return Object.values(groups).sort((a, b) => a.key.localeCompare(b.key));
}

/**
 * Groups time entries by Week, including all weeks in the range
 */
export function groupTimeEntriesByWeek(entries, startDate, endDate) {
  const groups = {};
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  const current = new Date(start);
  current.setHours(0, 0, 0, 0);
  
  while (current <= end) {
    const details = getWeekDetails(current);
    if (!groups[details.key]) {
      groups[details.key] = {
        key: details.key,
        duration: 0,
        label: details.label,
        entries: []
      };
    }
    // Advance by 1 day at a time to catch all week boundaries
    current.setDate(current.getDate() + 1);
  }

  // Populate entries
  entries.forEach(entry => {
    if (!entry.started_at) return;
    const details = getWeekDetails(entry.started_at);
    
    if (!groups[details.key]) {
      groups[details.key] = {
        key: details.key,
        duration: 0,
        label: details.label,
        entries: []
      };
    }
    
    groups[details.key].duration += entry.duration || 0;
    groups[details.key].entries.push(entry);
  });

  return Object.values(groups).sort((a, b) => a.key.localeCompare(b.key));
}

/**
 * Groups time entries by Month, including all months in the range
 */
export function groupTimeEntriesByMonth(entries, startDate, endDate) {
  const groups = {};
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  const current = new Date(start);
  current.setHours(0, 0, 0, 0);
  
  while (current <= end) {
    const details = getMonthDetails(current);
    if (!groups[details.key]) {
      groups[details.key] = {
        key: details.key,
        duration: 0,
        label: details.label,
        entries: []
      };
    }
    // Advance by 1 month to construct the keys
    current.setMonth(current.getMonth() + 1);
  }

  // Populate entries
  entries.forEach(entry => {
    if (!entry.started_at) return;
    const details = getMonthDetails(entry.started_at);
    
    if (!groups[details.key]) {
      groups[details.key] = {
        key: details.key,
        duration: 0,
        label: details.label,
        entries: []
      };
    }
    
    groups[details.key].duration += entry.duration || 0;
    groups[details.key].entries.push(entry);
  });

  return Object.values(groups).sort((a, b) => a.key.localeCompare(b.key));
}
