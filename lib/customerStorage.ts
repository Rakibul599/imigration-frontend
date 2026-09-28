'use client';

export interface CustomerDocument {
  name: string;
  url?: string;
  size?: string;
  type?: string;
  dataUrl?: string;
}

export interface CustomerRecord {
  id: number;
  full_name: string;
  passport_no?: string;
  passport_file?: string;
  nid_no: string;
  nid_file?: string;
  date_of_birth?: string;
  country?: string;
  passport_issue_date?: string;
  passport_expire_date?: string;
  leaving_address?: string;
  phone?: string;
  email: string;
  working_sector?: string;
  working_address?: string;
  basic_salary?: string;
  overtime?: string; // "our time"
  company_id?: string;
  documents?: CustomerDocument[];
  status: 'active' | 'pending' | 'inactive';
  created_at?: string;
  updated_at?: string;
  // Legacy fields for backward compatibility
  worker_phone?: string;
  guardian_phone?: string;
  username?: string;
  password?: string;
  bank_account_name?: string;
  bank_account_number?: string;
  total_payment?: string;
  role: string;
  profile_pic?: string;
  profile_image?: string;
}

export interface WorkingSector {
  id: number;
  name: string;
  description?: string;
  status?: string;
}

const LOCAL_STORAGE_KEY = 'agency_customers_cache';
const SECTORS_CACHE_KEY = 'agency_working_sectors_cache';
const API_BASE = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://127.0.0.1:8000/api';

/**
 * Resolves a file path or URL to an absolute URL accessible by the browser.
 */
export function getFileUrl(path?: string): string {
  if (!path) return '';
  if (
    path.startsWith('data:') ||
    path.startsWith('blob:') ||
    path.startsWith('http://') ||
    path.startsWith('https://')
  ) {
    return path;
  }
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const backendBase = (process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://127.0.0.1:8000/api')
    .replace(/\/api\/?$/, '');
  return `${backendBase}${cleanPath}`;
}

function sanitizeForStorage(records: CustomerRecord[]): CustomerRecord[] {
  return records.map((c) => ({
    ...c,
    // Strip heavy base64 dataUrl from documents to prevent QuotaExceededError in localStorage
    documents: Array.isArray(c.documents)
      ? c.documents.map(({ dataUrl, ...rest }) => rest)
      : [],
    profile_pic: c.profile_pic && c.profile_pic.length > 200000 ? '' : c.profile_pic,
    passport_file: c.passport_file && c.passport_file.length > 200000 ? '' : c.passport_file,
    nid_file: c.nid_file && c.nid_file.length > 200000 ? '' : c.nid_file,
  }));
}

/**
 * Synchronously get a customer from localStorage cache
 */
export function getCustomerFromCache(id: string | number): CustomerRecord | null {
  if (typeof window === 'undefined') return null;
  try {
    const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (cached) {
      const list: CustomerRecord[] = JSON.parse(cached);
      return list.find((c) => String(c.id) === String(id)) || null;
    }
  } catch {}
  return null;
}

/**
 * Fetch all customers from backend API
 */
export async function fetchCustomers(companyId?: string, search?: string, sector?: string): Promise<CustomerRecord[]> {
  try {
    const params = new URLSearchParams();
    if (companyId) params.append('company_id', companyId);
    if (search) params.append('search', search);
    if (sector && sector !== 'ALL') params.append('sector', sector);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const url = `${API_BASE}/customers${params.toString() ? `?${params.toString()}` : ''}`;
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        if (typeof window !== 'undefined') {
          try {
            const sanitized = sanitizeForStorage(data);
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(sanitized));
          } catch {}
        }
        return data;
      }
    }
  } catch (err) {
    console.warn('Backend API unreachable or slow for customers, using local cache:', err);
  }

  // Fallback to local storage
  if (typeof window !== 'undefined') {
    try {
      const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (cached) {
        let list: CustomerRecord[] = JSON.parse(cached);
        if (companyId) {
          list = list.filter((c) => !c.company_id || c.company_id === companyId);
        }
        if (search) {
          const s = search.toLowerCase();
          list = list.filter(
            (c) =>
              c.full_name.toLowerCase().includes(s) ||
              c.nid_no.toLowerCase().includes(s) ||
              (c.passport_no && c.passport_no.toLowerCase().includes(s)) ||
              (c.email && c.email.toLowerCase().includes(s)) ||
              (c.phone && c.phone.toLowerCase().includes(s))
          );
        }
        if (sector && sector !== 'ALL') {
          list = list.filter((c) => c.working_sector === sector);
        }
        return list;
      }
    } catch {}
  }

  return [];
}

/**
 * Fetch single customer by ID
 */
export async function fetchCustomerById(id: string | number): Promise<CustomerRecord | null> {
  const cachedCustomer = getCustomerFromCache(id);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(`${API_BASE}/customers/${id}`, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      updateLocalCache(data, 'update');
      return data;
    }
  } catch (err) {
    console.warn('Error fetching customer by id from backend:', err);
  }

  return cachedCustomer || null;
}

/**
 * Create a new customer via POST /api/customers
 */
export async function createCustomer(data: Partial<CustomerRecord>): Promise<CustomerRecord> {
  const payload = {
    ...data,
    status: data.status || 'active',
  };

  try {
    const res = await fetch(`${API_BASE}/customers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const created: CustomerRecord = await res.json();
      updateLocalCache(created, 'create');
      return created;
    }
  } catch (err) {
    console.warn('Failed to save customer to backend API, saving locally:', err);
  }

  // Offline mock fallback
  const mockCreated: CustomerRecord = {
    id: Date.now(),
    full_name: payload.full_name || '',
    passport_no: payload.passport_no || '',
    passport_file: payload.passport_file || '',
    nid_no: payload.nid_no || '',
    nid_file: payload.nid_file || '',
    date_of_birth: payload.date_of_birth || '',
    country: payload.country || '',
    passport_issue_date: payload.passport_issue_date || '',
    passport_expire_date: payload.passport_expire_date || '',
    leaving_address: payload.leaving_address || '',
    phone: payload.phone || '',
    email: payload.email || '',
    working_sector: payload.working_sector || '',
    working_address: payload.working_address || '',
    basic_salary: payload.basic_salary || '',
    overtime: payload.overtime || '',
    company_id: payload.company_id || '',
    documents: payload.documents || [],
    role: 'Worker',
    status: payload.status || 'active',
    created_at: new Date().toISOString(),
  };

  updateLocalCache(mockCreated, 'create');
  return mockCreated;
}

/**
 * Update an existing customer
 */
export async function updateCustomer(id: number | string, data: Partial<CustomerRecord>): Promise<CustomerRecord> {
  try {
    const res = await fetch(`${API_BASE}/customers/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (res.ok) {
      const updated: CustomerRecord = await res.json();
      updateLocalCache(updated, 'update');
      return updated;
    }
  } catch (err) {
    console.warn('Failed to update customer on backend API:', err);
  }

  const existing = getCustomerFromCache(id);
  const updated: CustomerRecord = {
    ...(existing || { id: Number(id), full_name: '', nid_no: '', email: '', role: 'Worker', status: 'active' }),
    ...data,
    email: data.email ?? (existing?.email || ''),
    role: data.role ?? (existing?.role || 'Worker'),
    updated_at: new Date().toISOString(),
  };

  updateLocalCache(updated, 'update');
  return updated;
}

/**
 * Delete a customer
 */
export async function deleteCustomer(id: number | string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/customers/${id}`, {
      method: 'DELETE',
      headers: { Accept: 'application/json' },
    });
    if (res.ok) {
      updateLocalCache({ id: Number(id) } as CustomerRecord, 'delete');
      return true;
    }
  } catch (err) {
    console.warn('Failed to delete customer on backend API:', err);
  }

  updateLocalCache({ id: Number(id) } as CustomerRecord, 'delete');
  return true;
}

function updateLocalCache(record: CustomerRecord, action: 'create' | 'update' | 'delete') {
  if (typeof window === 'undefined') return;
  try {
    const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
    let list: CustomerRecord[] = cached ? JSON.parse(cached) : [];

    if (action === 'create') {
      list = [record, ...list.filter((c) => c.id !== record.id)];
    } else if (action === 'update') {
      list = list.map((c) => (c.id === record.id ? { ...c, ...record } : c));
    } else if (action === 'delete') {
      list = list.filter((c) => c.id !== record.id);
    }

    const sanitized = sanitizeForStorage(list);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(sanitized));
  } catch {}
}

/**
 * Working Sectors API & Cache
 */
export async function fetchWorkingSectors(): Promise<WorkingSector[]> {
  try {
    const res = await fetch(`${API_BASE}/working-sectors`, {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        if (typeof window !== 'undefined') {
          localStorage.setItem(SECTORS_CACHE_KEY, JSON.stringify(data));
        }
        return data;
      }
    }
  } catch (err) {
    console.warn('Failed to fetch working sectors from backend:', err);
  }

  if (typeof window !== 'undefined') {
    try {
      const cached = localStorage.getItem(SECTORS_CACHE_KEY);
      if (cached) return JSON.parse(cached);
    } catch {}
  }

  return [
    { id: 1, name: 'Construction & Infrastructure' },
    { id: 2, name: 'Manufacturing & Factory' },
    { id: 3, name: 'Plantation & Agriculture' },
    { id: 4, name: 'Services & Cleaning' },
    { id: 5, name: 'Engineering & Technical' },
    { id: 6, name: 'Hospitality & Tourism' },
    { id: 7, name: 'Logistics & Warehousing' },
  ];
}

export async function createWorkingSector(name: string, description?: string): Promise<WorkingSector> {
  const res = await fetch(`${API_BASE}/working-sectors`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ name, description }),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.message || 'Failed to create sector');
  }

  return await res.json();
}
