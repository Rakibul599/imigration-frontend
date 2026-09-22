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
  nid_no: string;
  worker_phone?: string;
  guardian_phone?: string;
  leaving_address?: string;
  email: string;
  username?: string;
  password?: string;
  bank_account_name?: string;
  bank_account_number?: string;
  role: string; // 'Sales' | 'Worker' | 'Customer' | 'Agent'
  passport_no?: string;
  total_payment?: string;
  company_id?: string;
  profile_pic?: string;
  documents?: CustomerDocument[];
  status: 'active' | 'pending' | 'inactive';
  created_at?: string;
  updated_at?: string;
}

const LOCAL_STORAGE_KEY = 'agency_customers_cache';
const API_BASE = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://127.0.0.1:8000/api';

/**
 * Fetch all customers from backend API, optionally filtered by company
 */
export async function fetchCustomers(companyId?: string, search?: string): Promise<CustomerRecord[]> {
  try {
    const params = new URLSearchParams();
    if (companyId) params.append('company_id', companyId);
    if (search) params.append('search', search);

    const url = `${API_BASE}/customers${params.toString() ? `?${params.toString()}` : ''}`;
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        if (typeof window !== 'undefined') {
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
        }
        return data;
      }
    }
  } catch (err) {
    console.warn('Backend API unreachable for customers, using local cache:', err);
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
              c.email.toLowerCase().includes(s) ||
              c.role.toLowerCase().includes(s)
          );
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
  try {
    const res = await fetch(`${API_BASE}/customers/${id}`, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Error fetching customer by id:', err);
  }

  // Fallback
  if (typeof window !== 'undefined') {
    try {
      const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (cached) {
        const list: CustomerRecord[] = JSON.parse(cached);
        const found = list.find((c) => String(c.id) === String(id));
        if (found) return found;
      }
    } catch {}
  }

  return null;
}

/**
 * Create a new customer via POST /api/customers
 */
export async function createCustomer(data: Partial<CustomerRecord>): Promise<CustomerRecord> {
  const payload = {
    ...data,
    role: data.role || 'Sales',
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
    nid_no: payload.nid_no || '',
    worker_phone: payload.worker_phone || '',
    guardian_phone: payload.guardian_phone || '',
    leaving_address: payload.leaving_address || '',
    email: payload.email || '',
    username: payload.username || '',
    password: payload.password || '',
    bank_account_name: payload.bank_account_name || '',
    bank_account_number: payload.bank_account_number || '',
    role: payload.role || 'Sales',
    passport_no: payload.passport_no || '',
    total_payment: payload.total_payment || '',
    company_id: payload.company_id || '',
    profile_pic: payload.profile_pic || '',
    documents: payload.documents || [],
    status: payload.status || 'active',
    created_at: new Date().toISOString(),
  };

  updateLocalCache(mockCreated, 'create');
  return mockCreated;
}

/**
 * Update an existing customer via PUT /api/customers/{id}
 */
export async function updateCustomer(id: string | number, data: Partial<CustomerRecord>): Promise<CustomerRecord> {
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
    console.warn('Failed to update customer in backend, updating locally:', err);
  }

  const existing = await fetchCustomerById(id);
  const updated = { ...existing, ...data } as CustomerRecord;
  updateLocalCache(updated, 'update');
  return updated;
}

/**
 * Delete a customer via DELETE /api/customers/{id}
 */
export async function deleteCustomer(id: string | number): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/customers/${id}`, {
      method: 'DELETE',
      headers: { Accept: 'application/json' },
    });
    if (res.ok) {
      removeFromLocalCache(id);
      return true;
    }
  } catch (err) {
    console.warn('Backend delete failed, removing locally:', err);
  }

  removeFromLocalCache(id);
  return true;
}

function updateLocalCache(customer: CustomerRecord, action: 'create' | 'update') {
  if (typeof window === 'undefined') return;
  try {
    const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
    let list: CustomerRecord[] = cached ? JSON.parse(cached) : [];
    if (action === 'create') {
      list = [customer, ...list];
    } else {
      list = list.map((c) => (String(c.id) === String(customer.id) ? customer : c));
    }
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
  } catch {}
}

function removeFromLocalCache(id: string | number) {
  if (typeof window === 'undefined') return;
  try {
    const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!cached) return;
    let list: CustomerRecord[] = JSON.parse(cached);
    list = list.filter((c) => String(c.id) !== String(id));
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
  } catch {}
}
