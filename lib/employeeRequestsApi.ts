// API helpers for Employee Leaves, Holidays, Resignations & Documents

export interface EmployeeLeaveItem {
  id: number;
  employee_code: string;
  employee_name?: string;
  leave_type: 'holiday' | 'annual_leave';
  title: string;
  start_date: string;
  end_date: string;
  days_count: number;
  reason?: string;
  emergency_contact?: string;
  attachment_url?: string;
  attachment_name?: string;
  status: 'pending' | 'approved' | 'rejected';
  approved_by?: string;
  admin_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface EmployeeLeaveStats {
  total_holidays_applied: number;
  approved_holidays: number;
  annual_leave_quota: number;
  annual_leave_taken: number;
  annual_leave_pending: number;
  annual_leave_remaining: number;
}

export interface EmployeeResignationItem {
  id: number;
  employee_code: string;
  employee_name?: string;
  apply_date: string;
  requested_last_day: string;
  notice_period_days: number;
  reason: string;
  resignation_letter?: string;
  attachment_url?: string;
  attachment_name?: string;
  status: 'pending' | 'approved' | 'rejected' | 'withdrawn';
  admin_name?: string;
  admin_action_date?: string;
  admin_notes?: string;
  official_acceptance_letter?: string;
  created_at: string;
  updated_at: string;
}

export interface EmployeeDocumentItem {
  name: string;
  issue_date?: string | null;
  expire_date?: string | null;
  url?: string;
  type?: string;
  size?: string;
  number?: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api';

/**
 * Fetch employee leaves and holiday applications
 */
export async function getEmployeeLeaves(params: {
  employee_code?: string;
  leave_type?: 'holiday' | 'annual_leave' | 'all';
  start_date?: string;
  end_date?: string;
  status?: string;
}): Promise<{ leaves: EmployeeLeaveItem[]; stats: EmployeeLeaveStats }> {
  try {
    const q = new URLSearchParams();
    if (params.employee_code) q.set('employee_code', params.employee_code);
    if (params.leave_type && params.leave_type !== 'all') q.set('leave_type', params.leave_type);
    if (params.start_date) q.set('start_date', params.start_date);
    if (params.end_date) q.set('end_date', params.end_date);
    if (params.status && params.status !== 'all') q.set('status', params.status);

    const res = await fetch(`${API_BASE}/employee-leaves?${q.toString()}`, { cache: 'no-store' });
    if (!res.ok) {
      throw new Error(`Failed to load leaves: ${res.status}`);
    }
    return await res.json();
  } catch (err) {
    console.error('getEmployeeLeaves error:', err);
    return {
      leaves: [],
      stats: {
        total_holidays_applied: 0,
        approved_holidays: 0,
        annual_leave_quota: 14,
        annual_leave_taken: 0,
        annual_leave_pending: 0,
        annual_leave_remaining: 14,
      },
    };
  }
}

/**
 * Submit holiday or annual leave application
 */
export async function createEmployeeLeave(payload: {
  employee_code: string;
  employee_name?: string;
  leave_type: 'holiday' | 'annual_leave';
  title: string;
  start_date: string;
  end_date: string;
  days_count?: number;
  reason?: string;
  emergency_contact?: string;
  attachment_url?: string;
  attachment_name?: string;
  status?: 'pending' | 'approved' | 'rejected';
  approved_by?: string;
  admin_notes?: string;
}): Promise<EmployeeLeaveItem> {
  const res = await fetch(`${API_BASE}/employee-leaves`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to submit leave request');
  }

  return await res.json();
}

/**
 * Admin updates leave request status (Approve / Reject)
 */
export async function updateLeaveStatus(
  id: number,
  status: 'approved' | 'rejected',
  notes?: string,
  approvedBy?: string
): Promise<EmployeeLeaveItem> {
  const res = await fetch(`${API_BASE}/employee-leaves/${id}/status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ status, admin_notes: notes, approved_by: approvedBy }),
  });

  if (!res.ok) {
    throw new Error('Failed to update leave status');
  }

  return await res.json();
}

/**
 * Fetch a single employee leave / holiday application by ID
 */
export async function getEmployeeLeaveById(id: number | string): Promise<EmployeeLeaveItem> {
  const res = await fetch(`${API_BASE}/employee-leaves/${id}`, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`Failed to load application #${id}`);
  }
  return await res.json();
}

/**
 * Update an existing leave / holiday application
 */
export async function updateEmployeeLeave(
  id: number | string,
  payload: {
    leave_type?: 'holiday' | 'annual_leave';
    title?: string;
    start_date?: string;
    end_date?: string;
    days_count?: number;
    reason?: string;
    emergency_contact?: string;
    status?: 'pending' | 'approved' | 'rejected';
    approved_by?: string;
    admin_notes?: string;
    attachment_url?: string;
    attachment_name?: string;
  }
): Promise<EmployeeLeaveItem> {
  const res = await fetch(`${API_BASE}/employee-leaves/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to update leave application');
  }

  return await res.json();
}

/**
 * Delete a leave / holiday application
 */
export async function deleteEmployeeLeave(id: number | string): Promise<boolean> {
  const res = await fetch(`${API_BASE}/employee-leaves/${id}`, {
    method: 'DELETE',
    headers: { Accept: 'application/json' },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to delete leave application');
  }

  return true;
}

/**
 * Fetch employee resignations
 */
export async function getEmployeeResignations(params?: {
  employee_code?: string;
  status?: string;
}): Promise<EmployeeResignationItem[]> {
  try {
    const q = new URLSearchParams();
    if (params?.employee_code) q.set('employee_code', params.employee_code);
    if (params?.status && params.status !== 'all') q.set('status', params.status);

    const res = await fetch(`${API_BASE}/employee-resignations?${q.toString()}`, { cache: 'no-store' });
    if (!res.ok) {
      throw new Error(`Failed to load resignations: ${res.status}`);
    }
    return await res.json();
  } catch (err) {
    console.error('getEmployeeResignations error:', err);
    return [];
  }
}

/**
 * Submit employee resignation
 */
export async function createEmployeeResignation(payload: {
  employee_code: string;
  employee_name?: string;
  apply_date: string;
  requested_last_day: string;
  notice_period_days?: number;
  reason: string;
  resignation_letter?: string;
  attachment_url?: string;
  attachment_name?: string;
}): Promise<EmployeeResignationItem> {
  const res = await fetch(`${API_BASE}/employee-resignations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to submit resignation request');
  }

  return await res.json();
}

/**
 * Fetch a single employee resignation by ID
 */
export async function getEmployeeResignationById(
  id: number | string
): Promise<EmployeeResignationItem | null> {
  try {
    const res = await fetch(`${API_BASE}/employee-resignations/${id}`, { cache: 'no-store' });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.error('getEmployeeResignationById error:', err);
    return null;
  }
}

/**
 * Delete a resignation request
 */
export async function deleteEmployeeResignation(id: number | string): Promise<boolean> {
  const res = await fetch(`${API_BASE}/employee-resignations/${id}`, {
    method: 'DELETE',
    headers: { Accept: 'application/json' },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to delete resignation record');
  }

  return true;
}

/**
 * Admin updates resignation status
 */
export async function updateResignationStatus(
  id: number,
  status: 'approved' | 'rejected' | 'withdrawn',
  notes?: string,
  adminName?: string,
  officialLetter?: string,
  attachmentUrl?: string,
  attachmentName?: string
): Promise<EmployeeResignationItem> {
  const res = await fetch(`${API_BASE}/employee-resignations/${id}/status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      status,
      admin_notes: notes,
      admin_name: adminName,
      official_acceptance_letter: officialLetter,
      attachment_url: attachmentUrl,
      attachment_name: attachmentName,
    }),
  });

  if (!res.ok) {
    throw new Error('Failed to update resignation status');
  }

  return await res.json();
}

/**
 * Admin issues official resignation acceptance letter directly to employee
 */
export async function issueOfficialResignationLetter(payload: {
  employee_code: string;
  employee_name?: string;
  last_working_day: string;
  notice_period_days?: number;
  reason?: string;
  official_acceptance_letter: string;
  admin_name?: string;
  admin_notes?: string;
  attachment_url?: string;
  attachment_name?: string;
}): Promise<EmployeeResignationItem> {
  const res = await fetch(`${API_BASE}/employee-resignations/issue-letter`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to issue resignation letter');
  }

  return await res.json();
}

/**
 * Fetch full employee profile to get documents (EPF, SOCSO, Joining Letter)
 */
export async function getEmployeeProfile(codeOrId: string) {
  try {
    const res = await fetch(`${API_BASE}/employees/${codeOrId}`, { cache: 'no-store' });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.error('getEmployeeProfile error:', err);
    return null;
  }
}

/**
 * Extract statutory documents from employee profile
 */
export function extractStatutoryDocuments(documents?: EmployeeDocumentItem[]) {
  const docs = Array.isArray(documents) ? documents : [];

  const epfDoc = docs.find((d) =>
    (d.name || '').toLowerCase().includes('epf') || (d.name || '').toLowerCase().includes('kwsp')
  );

  const socsoDoc = docs.find((d) =>
    (d.name || '').toLowerCase().includes('socso') || (d.name || '').toLowerCase().includes('perkeso')
  );

  const joiningDoc = docs.find((d) =>
    (d.name || '').toLowerCase().includes('joining') ||
    (d.name || '').toLowerCase().includes('appointment') ||
    (d.name || '').toLowerCase().includes('contract') ||
    (d.name || '').toLowerCase().includes('offer')
  );

  return {
    epfDoc: epfDoc || null,
    socsoDoc: socsoDoc || null,
    joiningDoc: joiningDoc || null,
    allDocs: docs,
  };
}
