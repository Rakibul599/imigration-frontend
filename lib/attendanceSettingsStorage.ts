export interface AttendanceSchedule {
  id: number;
  general_working_hours: number;
  grace_period_minutes: number;
  rest_time_minutes: number;
  monthly_fixed_holidays: number;
  weekly_fixed_days: string[];
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface WorkingShift {
  id: number;
  name: string;
  start_time: string;
  end_time: string;
  total_working_time: string;
  total_minutes: number;
  is_active: boolean;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

export interface PublicHoliday {
  id: number;
  title: string;
  holiday_date: string;
  days_count: number;
  holiday_type: string;
  description?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface AttendanceSettingsPayload {
  schedule: AttendanceSchedule;
  shifts: WorkingShift[];
  holidays: PublicHoliday[];
}

const API_BASE = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://127.0.0.1:8000/api';

/** Default fallback schedule */
export const DEFAULT_SCHEDULE: AttendanceSchedule = {
  id: 1,
  general_working_hours: 8.0,
  grace_period_minutes: 15,
  rest_time_minutes: 60,
  monthly_fixed_holidays: 2,
  weekly_fixed_days: ['Friday', 'Saturday'],
  notes: 'Standard corporate attendance & leave policy',
};

/**
 * Helper to calculate time duration between start and end (HH:mm)
 */
export function calculateShiftDuration(startTime: string, endTime: string): {
  formatted: string;
  minutes: number;
  hoursDecimal: number;
} {
  if (!startTime || !endTime) {
    return { formatted: '0 hrs', minutes: 0, hoursDecimal: 0 };
  }

  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);

  if (isNaN(startH) || isNaN(startM) || isNaN(endH) || isNaN(endM)) {
    return { formatted: '0 hrs', minutes: 0, hoursDecimal: 0 };
  }

  const startMins = startH * 60 + startM;
  const endMins = endH * 60 + endM;

  let diffMins = endMins - startMins;
  if (diffMins < 0) {
    // Overnight shift (e.g. 18:00 to 02:00)
    diffMins = 24 * 60 - startMins + endMins;
  }

  const hrs = Math.floor(diffMins / 60);
  const mins = diffMins % 60;
  const formatted = mins > 0 ? `${hrs} hrs ${mins} mins` : `${hrs} hrs`;
  const hoursDecimal = Number((diffMins / 60).toFixed(2));

  return { formatted, minutes: diffMins, hoursDecimal };
}

/**
 * Fetch all attendance settings (general schedule, shifts, holidays)
 */
export async function fetchAttendanceSettings(): Promise<AttendanceSettingsPayload> {
  try {
    const res = await fetch(`${API_BASE}/attendance-settings`, {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    });

    if (res.ok) {
      const data = await res.json();
      return {
        schedule: data.schedule || DEFAULT_SCHEDULE,
        shifts: Array.isArray(data.shifts) ? data.shifts : [],
        holidays: Array.isArray(data.holidays) ? data.holidays : [],
      };
    }
  } catch (err) {
    console.warn('Backend attendance settings not reachable:', err);
  }

  return {
    schedule: DEFAULT_SCHEDULE,
    shifts: [],
    holidays: [],
  };
}

/**
 * Update general working hours, grace period, rest time, and monthly/weekly holidays
 */
export async function updateGeneralSchedule(
  data: Partial<AttendanceSchedule>
): Promise<AttendanceSchedule> {
  const res = await fetch(`${API_BASE}/attendance-settings/general`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to update attendance schedule.');
  }

  const json = await res.json();
  return json.schedule;
}

/**
 * Create a new working shift (multiple working times)
 */
export async function createWorkingShift(
  data: Omit<WorkingShift, 'id' | 'created_at' | 'updated_at'>
): Promise<WorkingShift> {
  const res = await fetch(`${API_BASE}/attendance-settings/shifts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to create working shift.');
  }

  const json = await res.json();
  return json.shift;
}

/**
 * Update a working shift
 */
export async function updateWorkingShift(
  id: number | string,
  data: Partial<WorkingShift>
): Promise<WorkingShift> {
  const res = await fetch(`${API_BASE}/attendance-settings/shifts/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to update working shift.');
  }

  const json = await res.json();
  return json.shift;
}

/**
 * Delete a working shift
 */
export async function deleteWorkingShift(id: number | string): Promise<void> {
  const res = await fetch(`${API_BASE}/attendance-settings/shifts/${id}`, {
    method: 'DELETE',
    headers: {
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to delete working shift.');
  }
}

/**
 * Create a public holiday
 */
export async function createPublicHoliday(
  data: Omit<PublicHoliday, 'id' | 'created_at' | 'updated_at'>
): Promise<PublicHoliday> {
  const res = await fetch(`${API_BASE}/attendance-settings/holidays`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to create public holiday.');
  }

  const json = await res.json();
  return json.holiday;
}

/**
 * Update a public holiday
 */
export async function updatePublicHoliday(
  id: number | string,
  data: Partial<PublicHoliday>
): Promise<PublicHoliday> {
  const res = await fetch(`${API_BASE}/attendance-settings/holidays/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to update public holiday.');
  }

  const json = await res.json();
  return json.holiday;
}

/**
 * Delete a public holiday
 */
export async function deletePublicHoliday(id: number | string): Promise<void> {
  const res = await fetch(`${API_BASE}/attendance-settings/holidays/${id}`, {
    method: 'DELETE',
    headers: {
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to delete public holiday.');
  }
}
