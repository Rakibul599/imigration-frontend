'use client';

import { companies as defaultCompanies, Company } from './companies';

const STORAGE_KEY = 'agency_companies_data';
const STORAGE_EVENT = 'agency_companies_updated';
const API_BASE = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://127.0.0.1:8000/api';

/**
 * Fetch companies directly from the Laravel backend database,
 * merging with localStorage so local custom directors, files, and contact info are preserved.
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
          const current = getStoredCompanies();
          const merged = data.map((bComp: Company) => {
            const local = current.find((c) => c.id === bComp.id);
            if (local) {
              return {
                ...local,
                ...bComp,
                directors: bComp.directors && bComp.directors.length > 0 ? bComp.directors : (local.directors || []),
                address: bComp.address || local.address,
                phone: bComp.phone || local.phone,
                email: bComp.email || local.email,
                currency: bComp.currency || local.currency,
                language: bComp.language || local.language,
                bankName: bComp.bankName || local.bankName,
                bankAccountNo: bComp.bankAccountNo || local.bankAccountNo,
              };
            }
            return bComp;
          });
          const localOnly = current.filter((c) => !data.some((b: Company) => b.id === c.id));
          const finalList = [...merged, ...localOnly];
          localStorage.setItem(STORAGE_KEY, JSON.stringify(finalList));
          window.dispatchEvent(new Event(STORAGE_EVENT));
          return finalList;
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
 * Find a single company by ID or ROC from localStorage.
 */
export function getCompanyById(id: string): Company | null {
  if (!id) return null;
  const list = getStoredCompanies();
  const normalized = decodeURIComponent(id).trim().toLowerCase();
  return (
    list.find(
      (c) =>
        c.id.toLowerCase() === normalized ||
        c.roc.toLowerCase() === normalized ||
        c.id === id ||
        c.roc === id
    ) || null
  );
}

/**
 * Convert any File (Image, PDF, Document) to Base64 with metadata for local storage.
 */
export function fileToBase64(file: File): Promise<{
  fileName: string;
  fileSize: string;
  fileType: string;
  fileData: string;
}> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const sizeInKb = Math.round(file.size / 1024);
      const sizeStr = sizeInKb > 1024 ? `${(sizeInKb / 1024).toFixed(1)} MB` : `${sizeInKb} KB`;
      resolve({
        fileName: file.name,
        fileSize: sizeStr,
        fileType: file.type || 'application/octet-stream',
        fileData: reader.result as string,
      });
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}

/**
 * Save a new company to local storage and optionally backend API.
 */
export async function saveStoredCompany(newCompany: Company): Promise<Company[]> {
  const current = getStoredCompanies();
  const sanitizedId = newCompany.id || newCompany.name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
  const companyToSave: Company = {
    ...newCompany,
    id: sanitizedId,
    createdAt: newCompany.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
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
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new Event(STORAGE_EVENT));
    } catch (storageErr) {
      console.error('LocalStorage quota exceeded or error saving company:', storageErr);
    }
  }

  // Persist to Laravel backend MySQL and Disk Storage
  try {
    const res = await fetch(`${API_BASE}/companies`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        id: companyToSave.id,
        name: companyToSave.name,
        roc: companyToSave.roc,
        sector: companyToSave.sector,
        description: companyToSave.description,
        logo: companyToSave.logo,
        tag: companyToSave.tag,
        totalWorkers: companyToSave.totalWorkers,
        address: companyToSave.address,
        phone: companyToSave.phone,
        email: companyToSave.email,
        currency: companyToSave.currency,
        language: companyToSave.language,
        bankName: companyToSave.bankName,
        bankAccountNo: companyToSave.bankAccountNo,
        directors: companyToSave.directors,
      }),
    });
    if (res.ok) {
      const saved = await res.json();
      // Update with server disk paths returned by backend
      const finalUpdated = updated.map((c) =>
        c.id === companyToSave.id ? { ...companyToSave, ...saved, db_id: saved.db_id } : c
      );
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
 * Update an existing company in local storage and backend API.
 */
export async function updateStoredCompany(company: Company): Promise<Company[]> {
  const current = getStoredCompanies();
  const companyToSave = {
    ...company,
    updatedAt: new Date().toISOString(),
  };
  const updated = current.map((c) => (c.id === companyToSave.id ? companyToSave : c));

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new Event(STORAGE_EVENT));
    } catch (storageErr) {
      console.error('LocalStorage error updating company:', storageErr);
    }
  }

  try {
    const res = await fetch(`${API_BASE}/companies/${encodeURIComponent(companyToSave.id)}`, {
      method: 'PUT',
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
        address: companyToSave.address,
        phone: companyToSave.phone,
        email: companyToSave.email,
        currency: companyToSave.currency,
        language: companyToSave.language,
        bankName: companyToSave.bankName,
        bankAccountNo: companyToSave.bankAccountNo,
        directors: companyToSave.directors,
      }),
    });
    if (res.ok) {
      const saved = await res.json();
      const finalUpdated = updated.map((c) =>
        c.id === companyToSave.id ? { ...companyToSave, ...saved, db_id: saved.db_id } : c
      );
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(finalUpdated));
        window.dispatchEvent(new Event(STORAGE_EVENT));
      }
      return finalUpdated;
    }
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
