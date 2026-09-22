'use client';

import { companies as defaultCompanies, Company } from './companies';

const STORAGE_KEY = 'agency_companies_data';
const STORAGE_EVENT = 'agency_companies_updated';
const API_BASE = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://127.0.0.1:8000/api';

/**
 * Fetch companies directly from the Laravel backend database.
 */
export async function fetchCompaniesFromBackend(): Promise<Company[]> {
  try {
    const res = await fetch(`${API_BASE}/companies`, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        if (typeof window !== 'undefined') {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
          window.dispatchEvent(new Event(STORAGE_EVENT));
        }
        return data;
      }
    }
  } catch (err) {
    console.warn('Backend API not reachable, using cached/default data:', err);
  }
  return getStoredCompanies();
}

/**
 * Retrieve the current company list synchronously from localStorage,
 * falling back to default seed companies.
 */
export function getStoredCompanies(): Company[] {
  if (typeof window === 'undefined') {
    return defaultCompanies;
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultCompanies));
      // Asynchronously sync from backend
      fetchCompaniesFromBackend().catch(() => {});
      return defaultCompanies;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return defaultCompanies;
  } catch (err) {
    console.error('Error reading stored companies:', err);
    return defaultCompanies;
  }
}

/**
 * Save a new company to backend API and local storage.
 */
export async function saveStoredCompany(newCompany: Company): Promise<Company[]> {
  const current = getStoredCompanies();
  const sanitizedId = newCompany.id || newCompany.name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
  const companyToSave: Company = {
    ...newCompany,
    id: sanitizedId,
  };

  const existingIdx = current.findIndex((c) => c.id === companyToSave.id);
  let updated: Company[];
  if (existingIdx >= 0) {
    updated = [...current];
    updated[existingIdx] = companyToSave;
  } else {
    updated = [companyToSave, ...current];
  }

  // Update localStorage immediately for fast UI response
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event(STORAGE_EVENT));
  }

  // Persist to Laravel backend MySQL
  try {
    const res = await fetch(`${API_BASE}/companies`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        name: companyToSave.name,
        roc: companyToSave.roc,
        sector: companyToSave.sector,
        description: companyToSave.description,
        logo: companyToSave.logo,
        tag: companyToSave.tag,
        totalWorkers: companyToSave.totalWorkers,
      }),
    });
    if (res.ok) {
      const saved = await res.json();
      const finalUpdated = updated.map((c) => (c.id === companyToSave.id ? saved : c));
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(finalUpdated));
        window.dispatchEvent(new Event(STORAGE_EVENT));
      }
      return finalUpdated;
    }
  } catch (err) {
    console.warn('Backend save failed, saved to local cache:', err);
  }

  return updated;
}

/**
 * Update an existing company in backend API and local storage.
 */
export async function updateStoredCompany(company: Company): Promise<Company[]> {
  const current = getStoredCompanies();
  const updated = current.map((c) => (c.id === company.id ? company : c));

  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event(STORAGE_EVENT));
  }

  try {
    await fetch(`${API_BASE}/companies/${encodeURIComponent(company.id)}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        name: company.name,
        roc: company.roc,
        sector: company.sector,
        description: company.description,
        logo: company.logo,
        tag: company.tag,
        totalWorkers: company.totalWorkers,
      }),
    });
  } catch (err) {
    console.warn('Backend update failed, updated in local cache:', err);
  }

  return updated;
}

/**
 * Delete a company by ID from backend API and local storage.
 */
export async function deleteStoredCompany(companyId: string): Promise<Company[]> {
  const current = getStoredCompanies();
  const updated = current.filter((c) => c.id !== companyId);

  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event(STORAGE_EVENT));
  }

  try {
    await fetch(`${API_BASE}/companies/${encodeURIComponent(companyId)}`, {
      method: 'DELETE',
      headers: { Accept: 'application/json' },
    });
  } catch (err) {
    console.warn('Backend delete failed, deleted from local cache:', err);
  }

  return updated;
}

/**
 * Reset stored companies back to defaults via backend API and local storage.
 */
export async function resetStoredCompanies(): Promise<Company[]> {
  try {
    const res = await fetch(`${API_BASE}/companies/reset`, {
      method: 'POST',
      headers: { Accept: 'application/json' },
    });
    if (res.ok) {
      const data = await res.json();
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        window.dispatchEvent(new Event(STORAGE_EVENT));
      }
      return data;
    }
  } catch (err) {
    console.warn('Backend reset failed, resetting local cache:', err);
  }

  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultCompanies));
    window.dispatchEvent(new Event(STORAGE_EVENT));
  }
  return defaultCompanies;
}

/**
 * Helper to subscribe to company list changes across tabs/windows.
 */
export function subscribeToCompanyChanges(callback: () => void): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }
  const handler = () => callback();
  window.addEventListener(STORAGE_EVENT, handler);
  window.addEventListener('storage', handler);
  return () => {
    window.removeEventListener(STORAGE_EVENT, handler);
    window.removeEventListener('storage', handler);
  };
}
