'use client';

import { getFileUrl } from './customerStorage';

export { getFileUrl };

export interface CustomerTargetAmountRecord {
  id: string | number;
  customer_id: number | string;
  customer_name: string;
  passport_no?: string;
  nid_no?: string;
  company_id?: string;
  company_name?: string;
  target_amount: number; // in RM
  target_year?: number | string; // e.g. 2026, 2027
  target_category?: string; // Visa, Levi, Permit, FOMEMA, Package
  target_date?: string; // Target Due/Completion Date
  quota_workers_count?: number; // Quota count
  payment_terms?: string; // Lump sum, Installments, Monthly
  status: 'In Progress' | 'Achieved' | 'On Hold' | 'Cancelled';
  remarks?: string;
  created_at: string;
  updated_at?: string;
}

export const TARGET_CATEGORIES = [
  'Complete Migration Package',
  'Foreign Worker Permit (Calling Visa)',
  'Annual Levi Quota Fee',
  'FOMEMA Medical Clearance',
  'Insurance & Security Bond',
  'Work Permit Renewal',
  'Visa Extension & Stamping',
  'Custom Employer Package',
];

export const PAYMENT_TERMS = [
  'Full Upfront Payment',
  '2 Installments (50% / 50%)',
  '3 Installments',
  'Monthly Salary Deduction',
  'Employer Sponsored',
];

export interface CustomerDepositAmountRecord {
  id: string | number;
  customer_id: number | string;
  customer_name: string;
  passport_no?: string;
  nid_no?: string;
  company_id?: string;
  company_name?: string;
  deposit_amount: number; // in RM
  target_amount?: number; // Snapshot of target amount
  remaining_pending?: number; // Remaining pending after this deposit (Target - Total Deposited)
  deposit_date: string;
  payment_method: 'Bank Transfer' | 'Cash' | 'CDM' | 'Cheque' | 'Online FPX' | 'Direct Debit';
  bank_name?: string;
  receipt_no?: string; // Reference / Slip No
  deposited_by?: string; // Person who deposited
  depositor_phone?: string;
  purpose: string; // Levi Deposit, Visa Fee, Medical, Advance
  receipt_url?: string; // Stored file URL or dataUrl
  receipt_filename?: string;
  verification_status: 'Payment Success' | 'Payment Pending' | 'Verified' | 'Pending Verification' | 'Reconciled';
  remarks?: string;
  created_at: string;
  updated_at?: string;
}

export interface CustomerPendingAmountRecord {
  id: string | number;
  customer_id: number | string;
  customer_name: string;
  passport_no?: string;
  nid_no?: string;
  company_id?: string;
  company_name?: string;
  target_amount?: number; // Total Target Amount set for this customer
  total_deposited?: number; // Total Deposited Amount by this customer
  pending_amount: number; // in RM: (Target Amount - Deposit Amount)
  due_date: string;
  invoice_no?: string;
  category: string; // Levi due, Permit Renewal, Medical FOMEMA, Penalty, Insurance
  priority: 'Normal' | 'Medium' | 'Urgent' | 'Critical Overdue';
  collection_status: 'Pending' | 'Partially Paid' | 'Overdue' | 'Settled';
  assigned_officer?: string;
  next_followup_date?: string;
  remarks?: string;
  created_at: string;
  updated_at?: string;
}

export interface CompanyCostDocument {
  id: string;
  name: string; // Document Name
  service_id?: string; // Service Card ID
  service_name?: string; // Service Card Title
  service_category?: string; // Service / Category tag
  value: number; // Amount (RM)
  issue_date?: string; // Date of Issue
  expire_date?: string; // Date of Expire
  fileName?: string;
  fileSize?: string;
  fileType?: string;
  fileUrl?: string; // /storage/... URL or dataUrl
  url?: string;
  size?: string;
  type?: string;
  dataUrl?: string;
}

export interface CustomerCompanyCostRecord {
  id: string | number;
  customer_id: number | string;
  customer_name: string;
  passport_no?: string;
  nid_no?: string;
  company_id?: string;
  company_name?: string;
  total_cost_amount: number; // Total calculated from sum of documents value
  expense_category: string; // Immigration Levi, FOMEMA, Insurance, Stamping, Agent Fee
  expense_date: string;
  payment_source?: string; // Company Treasury, Agency Account, Customer Advance
  payment_method?: string;
  reference_no?: string;
  documents: CompanyCostDocument[]; // Multiple documents with 'value' (amount) column
  status: 'Paid' | 'Incurred' | 'Reconciled';
  remarks?: string;
  created_at: string;
  updated_at?: string;
}

export interface CustomerFinanceBalance {
  customer_id: number | string;
  total_target: number;
  total_deposited: number;
  net_pending: number;
  deposit_percentage: number;
  status: 'Pending' | 'Partially Paid' | 'Settled';
  targets_count: number;
  deposits_count: number;
}

const STORAGE_KEYS = {
  TARGETS: 'agency_customer_targets',
  DEPOSITS: 'agency_customer_deposits',
  PENDINGS: 'agency_customer_pendings',
  COMPANY_COSTS: 'agency_customer_company_costs',
};

const API_BASE = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://127.0.0.1:8000/api';

// ==========================================
// 1. BACKEND API FETCHERS & AUTO-MIGRATION
// ==========================================

export async function fetchCustomerTargets(companyId?: string, search?: string): Promise<CustomerTargetAmountRecord[]> {
  try {
    const params = new URLSearchParams();
    if (companyId && companyId !== 'ALL') params.append('company_id', companyId);
    if (search) params.append('search', search);

    const res = await fetch(`${API_BASE}/customer-targets?${params.toString()}`, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });

    if (res.ok) {
      const dbList: CustomerTargetAmountRecord[] = await res.json();
      if (Array.isArray(dbList)) {
        // If DB has records, save to local cache
        if (dbList.length > 0) {
          localStorage.setItem(STORAGE_KEYS.TARGETS, JSON.stringify(dbList));
          window.dispatchEvent(new Event('customerTargetsUpdated'));
          return dbList;
        }

        // If DB is empty, check if we have unmigrated records in localStorage to upload
        const localList = getStoredCustomerTargets();
        if (localList.length > 0) {
          for (const item of localList) {
            try {
              await fetch(`${API_BASE}/customer-targets`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                body: JSON.stringify(item),
              });
            } catch {}
          }
          // Re-fetch after migration
          const reRes = await fetch(`${API_BASE}/customer-targets`, { cache: 'no-store' });
          if (reRes.ok) {
            const reList = await reRes.json();
            localStorage.setItem(STORAGE_KEYS.TARGETS, JSON.stringify(reList));
            window.dispatchEvent(new Event('customerTargetsUpdated'));
            return reList;
          }
        }
      }
    }
  } catch (err) {
    console.warn('API error fetching customer targets, using local cache:', err);
  }
  return getStoredCustomerTargets();
}

export async function fetchCustomerDeposits(companyId?: string, search?: string): Promise<CustomerDepositAmountRecord[]> {
  try {
    const params = new URLSearchParams();
    if (companyId && companyId !== 'ALL') params.append('company_id', companyId);
    if (search) params.append('search', search);

    const res = await fetch(`${API_BASE}/customer-deposits?${params.toString()}`, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });

    if (res.ok) {
      const dbList: CustomerDepositAmountRecord[] = await res.json();
      if (Array.isArray(dbList)) {
        if (dbList.length > 0) {
          localStorage.setItem(STORAGE_KEYS.DEPOSITS, JSON.stringify(dbList));
          window.dispatchEvent(new Event('customerDepositsUpdated'));
          return dbList;
        }

        // Check if unmigrated local deposits exist
        const localList = getStoredCustomerDeposits();
        if (localList.length > 0) {
          for (const item of localList) {
            try {
              await fetch(`${API_BASE}/customer-deposits`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                body: JSON.stringify(item),
              });
            } catch {}
          }
          const reRes = await fetch(`${API_BASE}/customer-deposits`, { cache: 'no-store' });
          if (reRes.ok) {
            const reList = await reRes.json();
            localStorage.setItem(STORAGE_KEYS.DEPOSITS, JSON.stringify(reList));
            window.dispatchEvent(new Event('customerDepositsUpdated'));
            return reList;
          }
        }
      }
    }
  } catch (err) {
    console.warn('API error fetching customer deposits, using local cache:', err);
  }
  return getStoredCustomerDeposits();
}

export async function fetchCustomerPendings(companyId?: string, search?: string): Promise<CustomerPendingAmountRecord[]> {
  try {
    const params = new URLSearchParams();
    if (companyId && companyId !== 'ALL') params.append('company_id', companyId);
    if (search) params.append('search', search);

    const res = await fetch(`${API_BASE}/customer-pendings?${params.toString()}`, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });

    if (res.ok) {
      const dbList: CustomerPendingAmountRecord[] = await res.json();
      if (Array.isArray(dbList)) {
        localStorage.setItem(STORAGE_KEYS.PENDINGS, JSON.stringify(dbList));
        window.dispatchEvent(new Event('customerPendingsUpdated'));
        return dbList;
      }
    }
  } catch (err) {
    console.warn('API error fetching customer pendings, using local cache:', err);
  }
  return getStoredCustomerPendings();
}

export async function fetchCustomerCompanyCosts(companyId?: string, search?: string): Promise<CustomerCompanyCostRecord[]> {
  try {
    const params = new URLSearchParams();
    if (companyId && companyId !== 'ALL') params.append('company_id', companyId);
    if (search) params.append('search', search);

    const res = await fetch(`${API_BASE}/customer-company-costs?${params.toString()}`, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });

    if (res.ok) {
      const dbList: CustomerCompanyCostRecord[] = await res.json();
      if (Array.isArray(dbList)) {
        if (dbList.length > 0) {
          localStorage.setItem(STORAGE_KEYS.COMPANY_COSTS, JSON.stringify(dbList));
          window.dispatchEvent(new Event('companyCostsUpdated'));
          return dbList;
        }

        // Check if unmigrated local company costs exist
        const localList = getStoredCompanyCosts();
        if (localList.length > 0) {
          for (const item of localList) {
            try {
              await fetch(`${API_BASE}/customer-company-costs`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                body: JSON.stringify(item),
              });
            } catch {}
          }
          const reRes = await fetch(`${API_BASE}/customer-company-costs`, { cache: 'no-store' });
          if (reRes.ok) {
            const reList = await reRes.json();
            localStorage.setItem(STORAGE_KEYS.COMPANY_COSTS, JSON.stringify(reList));
            window.dispatchEvent(new Event('companyCostsUpdated'));
            return reList;
          }
        }
      }
    }
  } catch (err) {
    console.warn('API error fetching company costs, using local cache:', err);
  }
  return getStoredCompanyCosts();
}

export async function fetchAllCustomerFinances(): Promise<void> {
  await Promise.allSettled([
    fetchCustomerTargets(),
    fetchCustomerDeposits(),
    fetchCustomerPendings(),
    fetchCustomerCompanyCosts(),
  ]);
}

// ==========================================
// 2. TARGET AMOUNT HELPERS
// ==========================================
export function getStoredCustomerTargets(): CustomerTargetAmountRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.TARGETS);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

export async function saveCustomerTarget(record: CustomerTargetAmountRecord): Promise<CustomerTargetAmountRecord[]> {
  const current = getStoredCustomerTargets();
  const index = current.findIndex((r) => String(r.id) === String(record.id));
  let updated: CustomerTargetAmountRecord[];

  if (index >= 0) {
    updated = [...current];
    updated[index] = { ...record, updated_at: new Date().toISOString() };
  } else {
    updated = [{ ...record, created_at: record.created_at || new Date().toISOString() }, ...current];
  }

  // Optimistic local update
  try {
    localStorage.setItem(STORAGE_KEYS.TARGETS, JSON.stringify(updated));
    window.dispatchEvent(new Event('customerTargetsUpdated'));
    syncCustomerPending(record.customer_id, {
      customer_name: record.customer_name,
      passport_no: record.passport_no,
      nid_no: record.nid_no,
      company_id: record.company_id,
      company_name: record.company_name,
    });
  } catch {}

  // Asynchronous Database Save via Laravel API
  try {
    const isNumericId = typeof record.id === 'number' || (!isNaN(Number(record.id)) && !String(record.id).includes('_'));
    const url = isNumericId && index >= 0
      ? `${API_BASE}/customer-targets/${record.id}`
      : `${API_BASE}/customer-targets`;
    const method = isNumericId && index >= 0 ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(record),
    });

    if (res.ok) {
      const savedRecord: CustomerTargetAmountRecord = await res.json();
      const currentList = getStoredCustomerTargets();
      const replaceIdx = currentList.findIndex(
        (r) => String(r.id) === String(record.id) || String(r.id) === String(savedRecord.id)
      );
      if (replaceIdx >= 0) {
        currentList[replaceIdx] = savedRecord;
      } else {
        currentList.unshift(savedRecord);
      }
      localStorage.setItem(STORAGE_KEYS.TARGETS, JSON.stringify(currentList));
      window.dispatchEvent(new Event('customerTargetsUpdated'));
      // Sync pendings from DB calculation
      fetchCustomerPendings().catch(() => {});
      return currentList;
    }
  } catch (err) {
    console.error('Failed to save customer target to database:', err);
  }

  return updated;
}

export async function deleteCustomerTarget(id: string | number): Promise<CustomerTargetAmountRecord[]> {
  const current = getStoredCustomerTargets();
  const targetRecord = current.find((r) => String(r.id) === String(id));
  const updated = current.filter((r) => String(r.id) !== String(id));

  try {
    localStorage.setItem(STORAGE_KEYS.TARGETS, JSON.stringify(updated));
    window.dispatchEvent(new Event('customerTargetsUpdated'));
    if (targetRecord) {
      syncCustomerPending(targetRecord.customer_id);
    }
  } catch {}

  // Backend API Call
  try {
    await fetch(`${API_BASE}/customer-targets/${id}`, {
      method: 'DELETE',
      headers: { Accept: 'application/json' },
    });
    fetchCustomerPendings().catch(() => {});
  } catch (err) {
    console.error('Failed to delete customer target from database:', err);
  }

  return updated;
}

// ==========================================
// 3. DEPOSIT AMOUNT HELPERS
// ==========================================
export function getStoredCustomerDeposits(): CustomerDepositAmountRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.DEPOSITS);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

export async function saveCustomerDeposit(record: CustomerDepositAmountRecord): Promise<CustomerDepositAmountRecord[]> {
  const current = getStoredCustomerDeposits();
  const index = current.findIndex((r) => String(r.id) === String(record.id));
  let updated: CustomerDepositAmountRecord[];

  const balanceBefore = getCustomerFinanceBalance(record.customer_id);
  const isEditing = index >= 0;
  const oldDepositAmount = isEditing ? Number(current[index].deposit_amount) || 0 : 0;
  const newTotalDeposit = balanceBefore.total_deposited - oldDepositAmount + (Number(record.deposit_amount) || 0);
  const calculatedRemainingPending = Math.max(0, balanceBefore.total_target - newTotalDeposit);

  const recordWithCalculations: CustomerDepositAmountRecord = {
    ...record,
    target_amount: record.target_amount !== undefined ? record.target_amount : balanceBefore.total_target,
    remaining_pending: calculatedRemainingPending,
  };

  if (index >= 0) {
    updated = [...current];
    updated[index] = { ...recordWithCalculations, updated_at: new Date().toISOString() };
  } else {
    updated = [{ ...recordWithCalculations, created_at: record.created_at || new Date().toISOString() }, ...current];
  }

  try {
    localStorage.setItem(STORAGE_KEYS.DEPOSITS, JSON.stringify(updated));
    window.dispatchEvent(new Event('customerDepositsUpdated'));
    syncCustomerPending(record.customer_id, {
      customer_name: record.customer_name,
      passport_no: record.passport_no,
      nid_no: record.nid_no,
      company_id: record.company_id,
      company_name: record.company_name,
    });
  } catch {}

  // Asynchronous Database Save & File Storage via Laravel API
  try {
    const isNumericId = typeof record.id === 'number' || (!isNaN(Number(record.id)) && !String(record.id).includes('_'));
    const url = isNumericId && index >= 0
      ? `${API_BASE}/customer-deposits/${record.id}`
      : `${API_BASE}/customer-deposits`;
    const method = isNumericId && index >= 0 ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(recordWithCalculations),
    });

    if (res.ok) {
      const savedRecord: CustomerDepositAmountRecord = await res.json();
      const currentList = getStoredCustomerDeposits();
      const replaceIdx = currentList.findIndex(
        (r) => String(r.id) === String(record.id) || String(r.id) === String(savedRecord.id)
      );
      if (replaceIdx >= 0) {
        currentList[replaceIdx] = savedRecord;
      } else {
        currentList.unshift(savedRecord);
      }
      localStorage.setItem(STORAGE_KEYS.DEPOSITS, JSON.stringify(currentList));
      window.dispatchEvent(new Event('customerDepositsUpdated'));
      fetchCustomerPendings().catch(() => {});
      return currentList;
    }
  } catch (err) {
    console.error('Failed to save deposit record to database:', err);
  }

  return updated;
}

export async function deleteCustomerDeposit(id: string | number): Promise<CustomerDepositAmountRecord[]> {
  const current = getStoredCustomerDeposits();
  const depositRecord = current.find((r) => String(r.id) === String(id));
  const updated = current.filter((r) => String(r.id) !== String(id));

  try {
    localStorage.setItem(STORAGE_KEYS.DEPOSITS, JSON.stringify(updated));
    window.dispatchEvent(new Event('customerDepositsUpdated'));
    if (depositRecord) {
      syncCustomerPending(depositRecord.customer_id);
    }
  } catch {}

  try {
    await fetch(`${API_BASE}/customer-deposits/${id}`, {
      method: 'DELETE',
      headers: { Accept: 'application/json' },
    });
    fetchCustomerPendings().catch(() => {});
  } catch (err) {
    console.error('Failed to delete deposit record from database:', err);
  }

  return updated;
}

// ==========================================
// 4. FINANCIAL CALCULATION & AUTO-SYNC ENGINE
// ==========================================
export function getCustomerFinanceBalance(customerId: number | string): CustomerFinanceBalance {
  const cIdStr = String(customerId);
  const targets = getStoredCustomerTargets().filter((t) => String(t.customer_id) === cIdStr);
  const deposits = getStoredCustomerDeposits().filter((d) => String(d.customer_id) === cIdStr);

  const total_target = targets.reduce((sum, t) => sum + (Number(t.target_amount) || 0), 0);
  const total_deposited = deposits.reduce((sum, d) => sum + (Number(d.deposit_amount) || 0), 0);
  const net_pending = Math.max(0, total_target - total_deposited);
  const deposit_percentage = total_target > 0 ? Math.min(100, Math.round((total_deposited / total_target) * 100)) : 0;

  let status: 'Pending' | 'Partially Paid' | 'Settled' = 'Pending';
  if (total_target > 0 && total_deposited >= total_target) {
    status = 'Settled';
  } else if (total_deposited > 0) {
    status = 'Partially Paid';
  }

  return {
    customer_id: customerId,
    total_target,
    total_deposited,
    net_pending,
    deposit_percentage,
    status,
    targets_count: targets.length,
    deposits_count: deposits.length,
  };
}

export function syncCustomerPending(
  customerId: number | string,
  customerMeta?: {
    customer_name?: string;
    passport_no?: string;
    nid_no?: string;
    company_id?: string;
    company_name?: string;
  }
): CustomerPendingAmountRecord | null {
  if (typeof window === 'undefined') return null;

  const cIdStr = String(customerId);
  const balance = getCustomerFinanceBalance(customerId);
  const currentPendings = getStoredCustomerPendings();
  const existingIndex = currentPendings.findIndex((p) => String(p.customer_id) === cIdStr);

  if (balance.total_target === 0 && balance.total_deposited === 0 && existingIndex < 0) {
    return null;
  }

  let meta = customerMeta || {};
  if (!meta.customer_name) {
    const fromTarget = getStoredCustomerTargets().find((t) => String(t.customer_id) === cIdStr);
    const fromDeposit = getStoredCustomerDeposits().find((d) => String(d.customer_id) === cIdStr);
    const fromExisting = existingIndex >= 0 ? currentPendings[existingIndex] : null;

    meta = {
      customer_name: fromTarget?.customer_name || fromDeposit?.customer_name || fromExisting?.customer_name || `Customer #${customerId}`,
      passport_no: fromTarget?.passport_no || fromDeposit?.passport_no || fromExisting?.passport_no,
      nid_no: fromTarget?.nid_no || fromDeposit?.nid_no || fromExisting?.nid_no,
      company_id: fromTarget?.company_id || fromDeposit?.company_id || fromExisting?.company_id,
      company_name: fromTarget?.company_name || fromDeposit?.company_name || fromExisting?.company_name,
    };
  }

  let updatedPendings = [...currentPendings];
  let resultRecord: CustomerPendingAmountRecord;

  if (existingIndex >= 0) {
    const existing = currentPendings[existingIndex];
    resultRecord = {
      ...existing,
      customer_name: meta.customer_name || existing.customer_name,
      passport_no: meta.passport_no || existing.passport_no,
      nid_no: meta.nid_no || existing.nid_no,
      company_id: meta.company_id || existing.company_id,
      company_name: meta.company_name || existing.company_name,
      target_amount: balance.total_target,
      total_deposited: balance.total_deposited,
      pending_amount: balance.net_pending,
      collection_status: balance.status === 'Settled' ? 'Settled' : (balance.status === 'Partially Paid' ? 'Partially Paid' : existing.collection_status),
      updated_at: new Date().toISOString(),
    };
    updatedPendings[existingIndex] = resultRecord;
  } else {
    resultRecord = {
      id: `pen_sync_${customerId}_${Date.now()}`,
      customer_id: customerId,
      customer_name: meta.customer_name || `Customer #${customerId}`,
      passport_no: meta.passport_no,
      nid_no: meta.nid_no,
      company_id: meta.company_id,
      company_name: meta.company_name,
      target_amount: balance.total_target,
      total_deposited: balance.total_deposited,
      pending_amount: balance.net_pending,
      due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      invoice_no: `INV-${Date.now().toString().slice(-6)}`,
      category: 'Work Permit Levi Due',
      priority: balance.net_pending > 5000 ? 'Urgent' : 'Medium',
      collection_status: balance.status,
      assigned_officer: 'Finance Desk',
      remarks: `Auto-calculated: Target RM ${balance.total_target.toLocaleString()} - Deposited RM ${balance.total_deposited.toLocaleString()} = Pending RM ${balance.net_pending.toLocaleString()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    updatedPendings = [resultRecord, ...updatedPendings];
  }

  try {
    localStorage.setItem(STORAGE_KEYS.PENDINGS, JSON.stringify(updatedPendings));
    window.dispatchEvent(new Event('customerPendingsUpdated'));
  } catch {}

  return resultRecord;
}

export function syncAllCustomerPendings(
  customers?: Array<{
    id: number | string;
    full_name?: string;
    passport_no?: string;
    nid_no?: string;
    company_id?: string;
  }>
) {
  if (typeof window === 'undefined') return;

  const targets = getStoredCustomerTargets();
  const deposits = getStoredCustomerDeposits();
  const customerIds = new Set<string>();

  targets.forEach((t) => customerIds.add(String(t.customer_id)));
  deposits.forEach((d) => customerIds.add(String(d.customer_id)));
  if (customers) {
    customers.forEach((c) => customerIds.add(String(c.id)));
  }

  customerIds.forEach((cId) => {
    const cust = customers?.find((c) => String(c.id) === String(cId));
    syncCustomerPending(cId, cust ? {
      customer_name: cust.full_name,
      passport_no: cust.passport_no,
      nid_no: cust.nid_no,
      company_id: cust.company_id,
      company_name: cust.company_id,
    } : undefined);
  });
}

// ==========================================
// 5. PENDING AMOUNT HELPERS
// ==========================================
export function getStoredCustomerPendings(): CustomerPendingAmountRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PENDINGS);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

export async function saveCustomerPending(record: CustomerPendingAmountRecord): Promise<CustomerPendingAmountRecord[]> {
  const current = getStoredCustomerPendings();
  const index = current.findIndex((r) => String(r.id) === String(record.id));
  let updated: CustomerPendingAmountRecord[];

  if (index >= 0) {
    updated = [...current];
    updated[index] = { ...record, updated_at: new Date().toISOString() };
  } else {
    updated = [{ ...record, created_at: record.created_at || new Date().toISOString() }, ...current];
  }

  try {
    localStorage.setItem(STORAGE_KEYS.PENDINGS, JSON.stringify(updated));
    window.dispatchEvent(new Event('customerPendingsUpdated'));
  } catch {}

  // Backend API Call
  try {
    const isNumericId = typeof record.id === 'number' || (!isNaN(Number(record.id)) && !String(record.id).includes('_'));
    const url = isNumericId && index >= 0
      ? `${API_BASE}/customer-pendings/${record.id}`
      : `${API_BASE}/customer-pendings`;
    const method = isNumericId && index >= 0 ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(record),
    });

    if (res.ok) {
      const saved: CustomerPendingAmountRecord = await res.json();
      const currentList = getStoredCustomerPendings();
      const replaceIdx = currentList.findIndex(
        (r) => String(r.id) === String(record.id) || String(r.id) === String(saved.id)
      );
      if (replaceIdx >= 0) {
        currentList[replaceIdx] = saved;
      } else {
        currentList.unshift(saved);
      }
      localStorage.setItem(STORAGE_KEYS.PENDINGS, JSON.stringify(currentList));
      window.dispatchEvent(new Event('customerPendingsUpdated'));
      return currentList;
    }
  } catch (err) {
    console.error('Failed to save pending record to database:', err);
  }

  return updated;
}

export async function deleteCustomerPending(id: string | number): Promise<CustomerPendingAmountRecord[]> {
  const current = getStoredCustomerPendings();
  const updated = current.filter((r) => String(r.id) !== String(id));

  try {
    localStorage.setItem(STORAGE_KEYS.PENDINGS, JSON.stringify(updated));
    window.dispatchEvent(new Event('customerPendingsUpdated'));
  } catch {}

  try {
    await fetch(`${API_BASE}/customer-pendings/${id}`, {
      method: 'DELETE',
      headers: { Accept: 'application/json' },
    });
  } catch (err) {
    console.error('Failed to delete pending record from database:', err);
  }

  return updated;
}

// ==========================================
// 6. COMPANY COST AMOUNT HELPERS & FILE STORAGE
// ==========================================
export function getStoredCompanyCosts(): CustomerCompanyCostRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.COMPANY_COSTS);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

export async function saveCompanyCost(record: CustomerCompanyCostRecord): Promise<CustomerCompanyCostRecord[]> {
  const current = getStoredCompanyCosts();
  const index = current.findIndex((r) => String(r.id) === String(record.id));
  let updated: CustomerCompanyCostRecord[];

  if (index >= 0) {
    updated = [...current];
    updated[index] = { ...record, updated_at: new Date().toISOString() };
  } else {
    updated = [{ ...record, created_at: record.created_at || new Date().toISOString() }, ...current];
  }

  try {
    localStorage.setItem(STORAGE_KEYS.COMPANY_COSTS, JSON.stringify(updated));
    window.dispatchEvent(new Event('companyCostsUpdated'));
  } catch {}

  // Asynchronous Database Save & File Storage via Laravel API
  try {
    const isNumericId = typeof record.id === 'number' || (!isNaN(Number(record.id)) && !String(record.id).includes('_'));
    const url = isNumericId && index >= 0
      ? `${API_BASE}/customer-company-costs/${record.id}`
      : `${API_BASE}/customer-company-costs`;
    const method = isNumericId && index >= 0 ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(record),
    });

    if (res.ok) {
      const savedRecord: CustomerCompanyCostRecord = await res.json();
      const currentList = getStoredCompanyCosts();
      const replaceIdx = currentList.findIndex(
        (r) => String(r.id) === String(record.id) || String(r.id) === String(savedRecord.id)
      );
      if (replaceIdx >= 0) {
        currentList[replaceIdx] = savedRecord;
      } else {
        currentList.unshift(savedRecord);
      }
      localStorage.setItem(STORAGE_KEYS.COMPANY_COSTS, JSON.stringify(currentList));
      window.dispatchEvent(new Event('companyCostsUpdated'));
      return currentList;
    }
  } catch (err) {
    console.error('Failed to save company cost record to database:', err);
  }

  return updated;
}

export async function deleteCompanyCost(id: string | number): Promise<CustomerCompanyCostRecord[]> {
  const current = getStoredCompanyCosts();
  const updated = current.filter((r) => String(r.id) !== String(id));

  try {
    localStorage.setItem(STORAGE_KEYS.COMPANY_COSTS, JSON.stringify(updated));
    window.dispatchEvent(new Event('companyCostsUpdated'));
  } catch {}

  try {
    await fetch(`${API_BASE}/customer-company-costs/${id}`, {
      method: 'DELETE',
      headers: { Accept: 'application/json' },
    });
  } catch (err) {
    console.error('Failed to delete company cost record from database:', err);
  }

  return updated;
}
