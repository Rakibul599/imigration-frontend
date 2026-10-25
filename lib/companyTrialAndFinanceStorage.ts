/**
 * Company Trial Applications, Customer Quotations & Payment Invoices API Service
 */

const API_BASE = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://127.0.0.1:8000/api';

export type PlanPackageKey = '1_month' | '3_months' | '6_months' | '10_months' | (string & {});

export interface PlanPackageInfo {
  key: PlanPackageKey;
  label: string;
  durationMonths: number;
  durationDays: number;
  price: number;
  currency: string;
  badge?: string;
  popular?: boolean;
  savings?: string;
  description: string;
}

export const PLAN_PACKAGES: PlanPackageInfo[] = [
  {
    key: '1_month',
    label: '1 Month Plan',
    durationMonths: 1,
    durationDays: 30,
    price: 199,
    currency: 'RM',
    savings: 'Standard Rate',
    description: 'Perfect for small teams testing all enterprise features with 3-day free trial.',
  },
  {
    key: '3_months',
    label: '3 Months Plan',
    durationMonths: 3,
    durationDays: 90,
    price: 499,
    currency: 'RM',
    popular: true,
    badge: 'Popular',
    savings: 'Save 16%',
    description: 'Most popular choice for growing businesses. Includes full 3-day free trial.',
  },
  {
    key: '6_months',
    label: '6 Months Plan',
    durationMonths: 6,
    durationDays: 180,
    price: 899,
    currency: 'RM',
    badge: 'Best Value',
    savings: 'Save 25%',
    description: 'Extended coverage with priority assistance and 3-day full access free trial.',
  },
  {
    key: '10_months',
    label: '10 Months Plan',
    durationMonths: 10,
    durationDays: 300,
    price: 1399,
    currency: 'RM',
    badge: 'Enterprise',
    savings: 'Save 30%',
    description: 'Maximum cost savings for established companies with 3-day free trial included.',
  },
];

export interface CompanyTrialApplication {
  id: number;
  company_name: string;
  roc?: string;
  sector?: string;
  email: string;
  phone: string;
  address?: string;
  plan_package: PlanPackageKey;
  package_duration_days: number;
  package_price?: number;
  trial_days: number;
  applicant_name: string;
  master_admin_username: string;
  master_admin_password?: string;
  status: 'pending' | 'approved_trial' | 'paid_active' | 'expired' | 'rejected';
  trial_starts_at?: string;
  trial_ends_at?: string;
  package_starts_at?: string;
  package_ends_at?: string;
  created_company_id?: string;
  created_master_admin_id?: number;
  payment_amount?: number;
  payment_status: 'unpaid' | 'paid' | 'partial';
  payment_method?: string;
  payment_reference?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface QuotationItem {
  description: string;
  qty: number;
  unit_price: number;
  total: number;
}

export interface CompanyQuotation {
  id: number;
  quotation_no: string;
  company_id?: string;
  company_name?: string;
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  customer_address?: string;
  quotation_date: string;
  valid_until?: string;
  items: QuotationItem[];
  subtotal: number;
  discount: number;
  tax_percentage: number;
  tax_amount: number;
  total_amount: number;
  currency: string;
  status: 'Draft' | 'Sent' | 'Accepted' | 'Declined' | 'Converted';
  terms?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface InvoiceItem {
  description: string;
  qty: number;
  unit_price: number;
  total: number;
}

export interface CompanyInvoice {
  id: number;
  invoice_no: string;
  quotation_id?: number;
  company_id?: string;
  company_name?: string;
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  customer_address?: string;
  package_name?: string;
  invoice_date: string;
  due_date?: string;
  items: InvoiceItem[];
  subtotal: number;
  discount: number;
  tax_percentage: number;
  tax_amount: number;
  total_amount: number;
  amount_paid: number;
  balance_due: number;
  currency: string;
  payment_status: 'Pending' | 'Paid' | 'Partial' | 'Overdue';
  payment_method?: string;
  payment_reference?: string;
  payment_date?: string;
  bank_name?: string;
  bank_account_no?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

/* ============================================================== */
/* Trial Applications API                                         */
/* ============================================================== */

export async function fetchTrialApplications(params?: {
  status?: string;
  search?: string;
}): Promise<CompanyTrialApplication[]> {
  try {
    const query = new URLSearchParams();
    if (params?.status) query.append('status', params.status);
    if (params?.search) query.append('search', params.search);

    const res = await fetch(`${API_BASE}/company-trial-applications?${query.toString()}`, {
      cache: 'no-store',
    });
    if (!res.ok) throw new Error('Failed to fetch trial applications');
    return await res.json();
  } catch (err) {
    console.error('fetchTrialApplications error:', err);
    return [];
  }
}

export async function submitTrialApplication(data: {
  company_name: string;
  roc?: string;
  sector?: string;
  email: string;
  phone: string;
  address?: string;
  plan_package: PlanPackageKey;
  applicant_name: string;
  master_admin_username: string;
  master_admin_password: string;
  notes?: string;
}): Promise<{ success: boolean; message: string; application?: CompanyTrialApplication }> {
  const res = await fetch(`${API_BASE}/company-trial-applications`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(data),
  });
  const result = await res.json();
  if (!res.ok) {
    throw new Error(result.message || 'Failed to submit trial application');
  }
  return result;
}

export async function approveTrialApplication(id: number): Promise<{
  success: boolean;
  message: string;
  application: CompanyTrialApplication;
  company: any;
  master_admin: any;
}> {
  const res = await fetch(`${API_BASE}/company-trial-applications/${id}/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
  });
  const result = await res.json();
  if (!res.ok) {
    throw new Error(result.message || 'Failed to approve application');
  }
  return result;
}

export async function activateTrialPackage(
  id: number,
  paymentData: {
    payment_amount: number;
    payment_method: string;
    payment_reference?: string;
    bank_name?: string;
    notes?: string;
  }
): Promise<{
  success: boolean;
  message: string;
  application: CompanyTrialApplication;
  invoice: CompanyInvoice;
}> {
  const res = await fetch(`${API_BASE}/company-trial-applications/${id}/activate-package`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(paymentData),
  });
  const result = await res.json();
  if (!res.ok) {
    throw new Error(result.message || 'Failed to activate package');
  }
  return result;
}

export async function rejectTrialApplication(id: number, reason?: string): Promise<any> {
  const res = await fetch(`${API_BASE}/company-trial-applications/${id}/reject`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ reason }),
  });
  return await res.json();
}

export async function deleteTrialApplication(id: number): Promise<any> {
  const res = await fetch(`${API_BASE}/company-trial-applications/${id}`, {
    method: 'DELETE',
    headers: { Accept: 'application/json' },
  });
  return await res.json();
}

/* ============================================================== */
/* Company Quotations API                                         */
/* ============================================================== */

export async function fetchQuotations(params?: {
  status?: string;
  company_id?: string;
  search?: string;
}): Promise<CompanyQuotation[]> {
  try {
    const query = new URLSearchParams();
    if (params?.status) query.append('status', params.status);
    if (params?.company_id) query.append('company_id', params.company_id);
    if (params?.search) query.append('search', params.search);

    const res = await fetch(`${API_BASE}/company-quotations?${query.toString()}`, {
      cache: 'no-store',
    });
    if (!res.ok) throw new Error('Failed to fetch quotations');
    return await res.json();
  } catch (err) {
    console.error('fetchQuotations error:', err);
    return [];
  }
}

export async function createQuotation(data: any): Promise<CompanyQuotation> {
  const res = await fetch(`${API_BASE}/company-quotations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(data),
  });
  const result = await res.json();
  if (!res.ok) {
    throw new Error(result.message || 'Failed to create quotation');
  }
  return result;
}

export async function updateQuotation(id: number, data: any): Promise<CompanyQuotation> {
  const res = await fetch(`${API_BASE}/company-quotations/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(data),
  });
  const result = await res.json();
  if (!res.ok) {
    throw new Error(result.message || 'Failed to update quotation');
  }
  return result;
}

export async function convertQuotationToInvoice(id: number): Promise<{
  success: boolean;
  message: string;
  invoice: CompanyInvoice;
  quotation: CompanyQuotation;
}> {
  const res = await fetch(`${API_BASE}/company-quotations/${id}/convert-to-invoice`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
  });
  const result = await res.json();
  if (!res.ok) {
    throw new Error(result.message || 'Failed to convert quotation to invoice');
  }
  return result;
}

export async function deleteQuotation(id: number): Promise<any> {
  const res = await fetch(`${API_BASE}/company-quotations/${id}`, {
    method: 'DELETE',
    headers: { Accept: 'application/json' },
  });
  return await res.json();
}

/* ============================================================== */
/* Company Invoices API                                           */
/* ============================================================== */

export async function fetchInvoices(params?: {
  payment_status?: string;
  company_id?: string;
  search?: string;
}): Promise<CompanyInvoice[]> {
  try {
    const query = new URLSearchParams();
    if (params?.payment_status) query.append('payment_status', params.payment_status);
    if (params?.company_id) query.append('company_id', params.company_id);
    if (params?.search) query.append('search', params.search);

    const res = await fetch(`${API_BASE}/company-invoices?${query.toString()}`, {
      cache: 'no-store',
    });
    if (!res.ok) throw new Error('Failed to fetch invoices');
    return await res.json();
  } catch (err) {
    console.error('fetchInvoices error:', err);
    return [];
  }
}

export async function createInvoice(data: any): Promise<CompanyInvoice> {
  const res = await fetch(`${API_BASE}/company-invoices`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(data),
  });
  const result = await res.json();
  if (!res.ok) {
    throw new Error(result.message || 'Failed to create invoice');
  }
  return result;
}

export async function updateInvoice(id: number, data: any): Promise<CompanyInvoice> {
  const res = await fetch(`${API_BASE}/company-invoices/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(data),
  });
  const result = await res.json();
  if (!res.ok) {
    throw new Error(result.message || 'Failed to update invoice');
  }
  return result;
}

export async function markInvoicePaid(
  id: number,
  paymentData: {
    payment_method: string;
    payment_reference?: string;
    amount_paid?: number;
    bank_name?: string;
    notes?: string;
  }
): Promise<{ success: boolean; message: string; invoice: CompanyInvoice }> {
  const res = await fetch(`${API_BASE}/company-invoices/${id}/mark-paid`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(paymentData),
  });
  const result = await res.json();
  if (!res.ok) {
    throw new Error(result.message || 'Failed to record invoice payment');
  }
  return result;
}

export async function deleteInvoice(id: number): Promise<any> {
  const res = await fetch(`${API_BASE}/company-invoices/${id}`, {
    method: 'DELETE',
    headers: { Accept: 'application/json' },
  });
  return await res.json();
}

// -------------------------------------------------------------
// DYNAMIC SUBSCRIPTION PLANS API
// -------------------------------------------------------------

export interface SubscriptionPlan {
  id: number;
  plan_key: string;
  name: string;
  duration_days: number;
  price: number | string;
  currency: string;
  badge?: string | null;
  savings_text?: string | null;
  description?: string | null;
  features?: string[] | null;
  trial_days: number;
  is_popular: boolean;
  is_active: boolean;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
}

export async function fetchSubscriptionPlans(includeInactive = false): Promise<SubscriptionPlan[]> {
  try {
    const res = await fetch(`${API_BASE}/subscription-plans${includeInactive ? '?all=1' : ''}`, {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) throw new Error('Failed to fetch subscription plans');
    return await res.json();
  } catch (err) {
    console.error('Error fetching plans:', err);
    return [];
  }
}

export async function createSubscriptionPlan(data: Partial<SubscriptionPlan>): Promise<SubscriptionPlan> {
  const res = await fetch(`${API_BASE}/subscription-plans`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(data),
  });
  const result = await res.json();
  if (!res.ok) throw new Error(result.message || 'Failed to create plan');
  return result.plan;
}

export async function updateSubscriptionPlan(id: number, data: Partial<SubscriptionPlan>): Promise<SubscriptionPlan> {
  const res = await fetch(`${API_BASE}/subscription-plans/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(data),
  });
  const result = await res.json();
  if (!res.ok) throw new Error(result.message || 'Failed to update plan');
  return result.plan;
}

export async function deleteSubscriptionPlan(id: number): Promise<boolean> {
  const res = await fetch(`${API_BASE}/subscription-plans/${id}`, {
    method: 'DELETE',
    headers: { Accept: 'application/json' },
  });
  const result = await res.json();
  if (!res.ok) throw new Error(result.message || 'Failed to delete plan');
  return true;
}

