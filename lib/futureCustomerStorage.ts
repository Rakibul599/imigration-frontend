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

const STORAGE_KEY = 'agency_future_customers_cache';

const INITIAL_FUTURE_CUSTOMERS: FutureCustomerRecord[] = [
  {
    id: 1,
    customer_name: 'Rafiqul Islam',
    phone_no: '+60 11-2345 6789',
    email_no: 'rafiqul.islam@example.com',
    leaving_address: 'No 45, Jalan Putra Permai, Seri Kembangan, Selangor',
    status: 'ready',
    notes: 'Biometrics document submitted, waiting for visa approval',
    created_at: '2026-11-10T08:30:00Z',
  },
  {
    id: 2,
    customer_name: 'Tanvir Hossain',
    phone_no: '+60 17-8901 2345',
    email_no: 'tanvir.hossain@example.com',
    leaving_address: 'Block B-3-12, Vista Komanwel, Bukit Jalil, KL',
    status: 'lead',
    notes: 'Inquired about Construction sector permit',
    created_at: '2026-11-12T11:15:00Z',
  },
  {
    id: 3,
    customer_name: 'Mehedi Hasan',
    phone_no: '+60 19-3456 7890',
    email_no: 'mehedi.hasan@example.com',
    leaving_address: 'Lot 102, Kawasan Perindustrian Senai, Johor Bahru',
    status: 'contacted',
    notes: 'Scheduled for biometric screening next week',
    created_at: '2026-11-14T09:45:00Z',
  },
];

export function getStoredFutureCustomers(): FutureCustomerRecord[] {
  if (typeof window === 'undefined') return INITIAL_FUTURE_CUSTOMERS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_FUTURE_CUSTOMERS));
      return INITIAL_FUTURE_CUSTOMERS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : INITIAL_FUTURE_CUSTOMERS;
  } catch {
    return INITIAL_FUTURE_CUSTOMERS;
  }
}

export function saveFutureCustomer(data: {
  customer_name: string;
  phone_no: string;
  email_no: string;
  leaving_address: string;
  status?: 'lead' | 'contacted' | 'ready' | 'converted';
  notes?: string;
}): FutureCustomerRecord {
  const current = getStoredFutureCustomers();
  const nextId = current.length > 0 ? Math.max(...current.map((c) => c.id)) + 1 : 1;
  const newRecord: FutureCustomerRecord = {
    id: nextId,
    customer_name: data.customer_name.trim(),
    phone_no: data.phone_no.trim(),
    email_no: data.email_no.trim(),
    leaving_address: data.leaving_address.trim(),
    status: data.status || 'lead',
    notes: data.notes?.trim() || '',
    created_at: new Date().toISOString(),
  };

  const updated = [newRecord, ...current];
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('agency_future_customers_updated', { detail: updated }));
  }
  return newRecord;
}

export function updateFutureCustomer(
  id: number,
  patch: Partial<FutureCustomerRecord>
): FutureCustomerRecord | null {
  const current = getStoredFutureCustomers();
  const index = current.findIndex((c) => c.id === id);
  if (index === -1) return null;

  const updatedRecord = { ...current[index], ...patch };
  current[index] = updatedRecord;

  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
    window.dispatchEvent(new CustomEvent('agency_future_customers_updated', { detail: current }));
  }
  return updatedRecord;
}

export function deleteFutureCustomer(id: number): boolean {
  const current = getStoredFutureCustomers();
  const filtered = current.filter((c) => c.id !== id);
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    window.dispatchEvent(new CustomEvent('agency_future_customers_updated', { detail: filtered }));
  }
  return true;
}

export function subscribeToFutureCustomers(callback: (list: FutureCustomerRecord[]) => void) {
  if (typeof window === 'undefined') return () => {};
  const handler = (e: any) => {
    callback(e.detail || getStoredFutureCustomers());
  };
  window.addEventListener('agency_future_customers_updated', handler);
  return () => window.removeEventListener('agency_future_customers_updated', handler);
}

