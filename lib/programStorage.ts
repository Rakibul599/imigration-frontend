'use client';

import { CustomerRecord } from './customerStorage';

export interface ProgramRecord {
  id: number;
  name: string;
  code?: string;
  category?: string;
  description?: string;
  duration?: string;
  fees?: number | string;
  status: 'active' | 'inactive' | 'upcoming' | 'closed';
  customers_count?: number;
  created_at?: string;
  updated_at?: string;
}

const LOCAL_STORAGE_KEY = 'agency_programs_cache';
const API_BASE = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://127.0.0.1:8000/api';

/**
 * Fetch all programs from backend API, with optional filters.
 */
export async function fetchPrograms(params?: { search?: string; status?: string; category?: string }): Promise<ProgramRecord[]> {
  try {
    const url = new URL(`${API_BASE}/programs`);
    if (params?.search) url.searchParams.set('search', params.search);
    if (params?.status && params.status !== 'all') url.searchParams.set('status', params.status);
    if (params?.category && params.category !== 'all') url.searchParams.set('category', params.category);

    const res = await fetch(url.toString(), {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    });

    if (res.ok) {
      const data: ProgramRecord[] = await res.json();
      if (typeof window !== 'undefined' && !params?.search && !params?.status && !params?.category) {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
      }
      return data;
    }
  } catch (err) {
    console.warn('Failed to fetch programs from backend, falling back to cache:', err);
  }

  // Fallback to local storage
  if (typeof window !== 'undefined') {
    const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (cached) {
      try {
        let list: ProgramRecord[] = JSON.parse(cached);
        if (params?.search) {
          const s = params.search.toLowerCase();
          list = list.filter(p => p.name.toLowerCase().includes(s) || (p.code && p.code.toLowerCase().includes(s)));
        }
        if (params?.status && params.status !== 'all') {
          list = list.filter(p => p.status === params.status);
        }
        return list;
      } catch {}
    }
  }

  return [];
}

/**
 * Get synchronously cached programs.
 */
export function getStoredPrograms(): ProgramRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch {}
  return [];
}

/**
 * Fetch single program by ID.
 */
export async function fetchProgramById(id: number | string): Promise<ProgramRecord | null> {
  try {
    const res = await fetch(`${API_BASE}/programs/${id}`, {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn(`Failed to fetch program ${id}:`, err);
  }
  const cached = getStoredPrograms();
  return cached.find(p => String(p.id) === String(id)) || null;
}

/**
 * Create a new program.
 */
export async function createProgram(payload: Partial<ProgramRecord>): Promise<ProgramRecord | null> {
  try {
    const res = await fetch(`${API_BASE}/programs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const created = await res.json();
      await fetchPrograms(); // Refresh cache
      return created;
    }
  } catch (err) {
    console.error('Failed to create program:', err);
  }
  return null;
}

/**
 * Update an existing program.
 */
export async function updateProgram(id: number | string, payload: Partial<ProgramRecord>): Promise<ProgramRecord | null> {
  try {
    const res = await fetch(`${API_BASE}/programs/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const updated = await res.json();
      await fetchPrograms(); // Refresh cache
      return updated;
    }
  } catch (err) {
    console.error(`Failed to update program ${id}:`, err);
  }
  return null;
}

/**
 * Delete a program.
 */
export async function deleteProgram(id: number | string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/programs/${id}`, {
      method: 'DELETE',
      headers: { Accept: 'application/json' },
    });

    if (res.ok) {
      await fetchPrograms(); // Refresh cache
      return true;
    }
  } catch (err) {
    console.error(`Failed to delete program ${id}:`, err);
  }
  return false;
}

/**
 * Fetch customers associated with a specific program.
 */
export async function fetchProgramCustomers(id: number | string): Promise<{ program: ProgramRecord; customers: CustomerRecord[] } | null> {
  try {
    const res = await fetch(`${API_BASE}/programs/${id}/customers`, {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    });

    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn(`Failed to fetch customers for program ${id}:`, err);
  }
  return null;
}
