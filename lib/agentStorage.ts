'use client';

export interface AgentRecord {
  id: number;
  name: string;
  phone: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

const LOCAL_STORAGE_KEY = 'agency_agents_cache';
const API_BASE = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://127.0.0.1:8000/api';

/**
 * Fetch all agents from backend API, fallback to localStorage.
 */
export async function fetchAgents(): Promise<AgentRecord[]> {
  try {
    const res = await fetch(`${API_BASE}/agents`, {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    });

    if (res.ok) {
      const data: AgentRecord[] = await res.json();
      if (typeof window !== 'undefined') {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
      }
      return data;
    }
  } catch (err) {
    console.warn('Failed to fetch agents from backend, falling back to cache:', err);
  }

  // Fallback to local storage
  if (typeof window !== 'undefined') {
    const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {}
    }
  }

  return [];
}

/**
 * Get synchronously cached agents.
 */
export function getStoredAgents(): AgentRecord[] {
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
 * Create a new agent.
 */
export async function createAgent(payload: Partial<AgentRecord>): Promise<AgentRecord> {
  const res = await fetch(`${API_BASE}/agents`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || 'Failed to create agent');
  }

  const created: AgentRecord = await res.json();

  if (typeof window !== 'undefined') {
    const current = getStoredAgents();
    const updated = [created, ...current.filter((a) => a.id !== created.id)];
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('superadmin_agents_updated', { detail: updated }));
  }

  return created;
}

/**
 * Update an existing agent.
 */
export async function updateAgent(id: number, payload: Partial<AgentRecord>): Promise<AgentRecord> {
  const res = await fetch(`${API_BASE}/agents/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || 'Failed to update agent');
  }

  const updated: AgentRecord = await res.json();

  if (typeof window !== 'undefined') {
    const current = getStoredAgents();
    const list = current.map((a) => (a.id === id ? { ...a, ...updated } : a));
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
    window.dispatchEvent(new CustomEvent('superadmin_agents_updated', { detail: list }));
  }

  return updated;
}

/**
 * Delete an agent.
 */
export async function deleteAgent(id: number): Promise<boolean> {
  const res = await fetch(`${API_BASE}/agents/${id}`, {
    method: 'DELETE',
    headers: { Accept: 'application/json' },
  });

  if (!res.ok) {
    throw new Error('Failed to delete agent');
  }

  if (typeof window !== 'undefined') {
    const current = getStoredAgents();
    const updated = current.filter((a) => a.id !== id);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('superadmin_agents_updated', { detail: updated }));
  }

  return true;
}
