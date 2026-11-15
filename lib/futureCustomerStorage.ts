'use client';

export interface FutureCustomerRecord {
  id: number;
  customer_name: string;
  phone_no: string;
  email_no: string;
  leaving_address: string;
  status: 'lead' | 'contacted' | 'ready' | 'converted';
  notes?: string;
  created_at: string;
}

const API_BASE = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://127.0.0.1:8000/api';

// In-memory cache for instant synchronous access (no localStorage data storage)
let memoryFutureCustomers: FutureCustomerRecord[] = [];

/**
 * Fetch all future customers directly from backend database API
 */
export async function fetchFutureCustomers(
  status?: string,
  search?: string
): Promise<FutureCustomerRecord[]> {
  try {
    const params = new URLSearchParams();
    if (status && status !== 'ALL') params.append('status', status);
    if (search && search.trim()) params.append('search', search.trim());

    const url = `${API_BASE}/future-customers${params.toString() ? `?${params.toString()}` : ''}`;
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        memoryFutureCustomers = data;
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('agency_future_customers_updated', { detail: data })
          );
        }
        return data;
      }
    }
  } catch (err) {
    console.error('Failed to fetch future customers from backend API:', err);
  }
  return memoryFutureCustomers;
}

/**
 * Synchronous getter returning latest in-memory cache
 */
export function getStoredFutureCustomers(): FutureCustomerRecord[] {
  return memoryFutureCustomers;
}

/**
 * Save a new future customer directly to Laravel backend database via POST /api/future-customers
 */
export async function saveFutureCustomer(data: {
  customer_name: string;
  phone_no: string;
  email_no: string;
  leaving_address: string;
  status?: 'lead' | 'contacted' | 'ready' | 'converted';
  notes?: string;
}): Promise<FutureCustomerRecord> {
  const payload = {
    customer_name: data.customer_name.trim(),
    phone_no: data.phone_no.trim(),
    email_no: data.email_no.trim(),
    leaving_address: data.leaving_address.trim(),
    status: data.status || 'lead',
    notes: data.notes?.trim() || '',
  };

  const res = await fetch(`${API_BASE}/future-customers`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => null);
    throw new Error(errData?.message || 'Failed to save future customer to database');
  }

  const created: FutureCustomerRecord = await res.json();
  memoryFutureCustomers = [created, ...memoryFutureCustomers.filter((c) => c.id !== created.id)];

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('agency_future_customers_updated', { detail: memoryFutureCustomers })
    );
  }

  return created;
}

/**
 * Update an existing future customer in database via PUT /api/future-customers/:id
 */
export async function updateFutureCustomer(
  id: number,
  patch: Partial<FutureCustomerRecord>
): Promise<FutureCustomerRecord> {
  const res = await fetch(`${API_BASE}/future-customers/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(patch),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => null);
    throw new Error(errData?.message || 'Failed to update future customer in database');
  }

  const updated: FutureCustomerRecord = await res.json();
  const idx = memoryFutureCustomers.findIndex((c) => c.id === id);
  if (idx >= 0) {
    memoryFutureCustomers[idx] = updated;
  } else {
    memoryFutureCustomers.unshift(updated);
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('agency_future_customers_updated', { detail: memoryFutureCustomers })
    );
  }

  return updated;
}

/**
 * Delete a future customer from database via DELETE /api/future-customers/:id
 */
export async function deleteFutureCustomer(id: number): Promise<boolean> {
  const res = await fetch(`${API_BASE}/future-customers/${id}`, {
    method: 'DELETE',
    headers: { Accept: 'application/json' },
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => null);
    throw new Error(errData?.message || 'Failed to delete future customer from database');
  }

  memoryFutureCustomers = memoryFutureCustomers.filter((c) => c.id !== id);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('agency_future_customers_updated', { detail: memoryFutureCustomers })
    );
  }

  return true;
}

/**
 * Event subscription for reactive updates
 */
export function subscribeToFutureCustomers(callback: (list: FutureCustomerRecord[]) => void) {
  if (typeof window === 'undefined') return () => {};
  const handler = (e: any) => {
    callback(e.detail || memoryFutureCustomers);
  };
  window.addEventListener('agency_future_customers_updated', handler);
  return () => window.removeEventListener('agency_future_customers_updated', handler);
}
