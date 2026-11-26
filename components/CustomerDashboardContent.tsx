'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import Link from 'next/link';
import * as XLSX from 'xlsx';
import Select2Search, { Select2Option } from '@/components/Select2Search';
import {
  AlertCircle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Briefcase,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Clock,
  Coins,
  CreditCard,
  DollarSign,
  Download,
  Edit2,
  Eye,
  FileCheck2,
  FileSpreadsheet,
  FileText,
  Filter,
  Globe2,
  Layers,
  LayoutDashboard,
  Mail,
  MapPin,
  Phone,
  PieChart,
  Plus,
  Printer,
  Receipt,
  RefreshCw,
  RotateCcw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Target,
  Trash2,
  TrendingUp,
  User,
  UserCheck,
  UserMinus,
  UserPlus,
  Users,
  UserX,
  Wallet,
  X,
} from 'lucide-react';
import { Company } from '@/lib/companies';
import {
  getStoredCompanies,
  fetchCompaniesFromBackend,
  subscribeToCompanyChanges,
} from '@/lib/companyStorage';
import {
  CustomerDocument,
  CustomerRecord,
  WorkingSector,
  deleteCustomer,
  fetchCustomers,
  fetchWorkingSectors,
  getFileUrl,
} from '@/lib/customerStorage';
import {
  FutureCustomerRecord,
  getStoredFutureCustomers,
  subscribeToFutureCustomers,
} from '@/lib/futureCustomerStorage';
import { ProgramRecord, fetchPrograms, getStoredPrograms } from '@/lib/programStorage';
import CardPriorityModal from '@/components/CardPriorityModal';
import { DynamicCardIcon } from '@/components/DynamicCardIcon';
import CustomerOrderStatisticsChart from '@/components/CustomerOrderStatisticsChart';
import {
  PageStatCardConfig,
  getStoredPageCards,
  saveStoredPageCards,
  resetStoredPageCards,
} from '@/lib/pageCardStorage';
import {
  CustomerTargetAmountRecord,
  CustomerDepositAmountRecord,
  CustomerPendingAmountRecord,
  CustomerCompanyCostRecord,
  CustomerRefundAmountRecord,
  fetchCustomerTargets,
  fetchCustomerDeposits,
  fetchCustomerPendings,
  fetchCustomerCompanyCosts,
  fetchCustomerRefunds,
  getStoredCustomerRefunds,
  saveCustomerRefund,
  REFUND_PURPOSES,
  getCustomerFinanceBalance,
} from '@/lib/customerFinanceStorage';
import {
  useDashboardCardDesign,
  useCardAnimationSettings,
  getServiceCardAnimationClass,
  getServiceCardAnimationStyle,
} from '@/lib/themeSettings';

export interface CustomerDashboardCardItem extends PageStatCardConfig {
  card_key: string;
}

const DEFAULT_CUSTOMER_DASHBOARD_STAT_CARDS: PageStatCardConfig[] = [
  { id: 'total_customers', title: 'Total Customer', subtitle: '', icon: 'Users', order_num: 1, metric_type: 'total_customers' },
  { id: 'active_customers', title: 'Active Customer', subtitle: '', icon: 'UserCheck', order_num: 2, metric_type: 'active_customers' },
  { id: 'inactive_customers', title: 'Inactive Customer', subtitle: '', icon: 'UserX', order_num: 3, metric_type: 'inactive_customers' },
  { id: 'runaway_customers', title: 'Runaway Customer', subtitle: '', icon: 'UserMinus', order_num: 4, metric_type: 'runaway_customers' },
  { id: 'blacklist_customers', title: 'Black List Customer', subtitle: '', icon: 'ShieldAlert', order_num: 5, metric_type: 'blacklist_customers' },
  { id: 'future_customers', title: 'Future Customer', subtitle: '', icon: 'Sparkles', order_num: 6, metric_type: 'future_customers' },
  { id: 'target_amount', title: 'Customer Target Amount', subtitle: '', icon: 'Target', order_num: 7, metric_type: 'target_wallet' },
  { id: 'deposit_amount', title: 'Customer Deposit Amount', subtitle: '', icon: 'DollarSign', order_num: 8, metric_type: 'deposit_wallet' },
  { id: 'refund_amount', title: 'Customer Refund Amount', subtitle: '', icon: 'RotateCcw', order_num: 9, metric_type: 'refund_wallet' },
  { id: 'pending_amount', title: 'Customer Pending Amount', subtitle: '', icon: 'Clock', order_num: 10, metric_type: 'pending_wallet' },
  { id: 'cost_amount', title: 'Customer Cost Amount', subtitle: '', icon: 'FileSpreadsheet', order_num: 11, metric_type: 'cost_wallet' },
];

const CUSTOMER_CARD_METRIC_OPTIONS = [
  { id: 'total_customers', label: 'Total Customer (Live Count)' },
  { id: 'active_customers', label: 'Active Customer (Live Count)' },
  { id: 'inactive_customers', label: 'Inactive Customer (Live Count)' },
  { id: 'runaway_customers', label: 'Runaway Customer (Live Count)' },
  { id: 'blacklist_customers', label: 'Black List Customer (Live Count)' },
  { id: 'future_customers', label: 'Future Customer (Live Count)' },
  { id: 'target_wallet', label: 'Customer Target Amount (RM Value)' },
  { id: 'deposit_wallet', label: 'Customer Deposit Amount (RM Value)' },
  { id: 'pending_wallet', label: 'Customer Pending Amount (RM Value)' },
  { id: 'cost_wallet', label: 'Customer Cost Amount (RM Value)' },
  { id: 'refund_wallet', label: 'Customer Refund Amount (RM Value)' },
  { id: 'custom', label: 'Custom Value / Fixed Number' },
];

const MALAYSIAN_BANKS = [
  'Maybank (Malayan Banking Berhad)',
  'CIMB Bank',
  'Public Bank Berhad',
  'RHB Bank',
  'Hong Leong Bank',
  'AmBank',
  'Bank Islam',
  'Touch n Go eWallet / DuitNow',
  'Cash Counter',
  'Other / Direct CDM',
];

interface CustomerDashboardContentProps {
  portalType?: 'superadmin' | 'masteradmin' | 'employee';
  baseRoute?: string;
}

export default function CustomerDashboardContent({
  portalType = 'superadmin',
  baseRoute = '/customers',
}: CustomerDashboardContentProps) {
  const cardDesign = useDashboardCardDesign();
  const isGlass = cardDesign === 'glassmorphism';
  const {
    animation: cardAnimation,
    duration: cardDuration,
    stagger: cardStagger,
    animTriggerKey,
  } = useCardAnimationSettings();

  const [companies, setCompanies] = useState<Company[]>([]);
  const [sectors, setSectors] = useState<WorkingSector[]>([]);
  const [programs, setPrograms] = useState<ProgramRecord[]>([]);
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [futureCustomers, setFutureCustomers] = useState<FutureCustomerRecord[]>([]);
  const [targetRecords, setTargetRecords] = useState<CustomerTargetAmountRecord[]>([]);
  const [depositRecords, setDepositRecords] = useState<CustomerDepositAmountRecord[]>([]);
  const [pendingRecords, setPendingRecords] = useState<CustomerPendingAmountRecord[]>([]);
  const [costRecords, setCostRecords] = useState<CustomerCompanyCostRecord[]>([]);
  const [refundRecords, setRefundRecords] = useState<CustomerRefundAmountRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Customer Refund Modal State
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
  const [selectedRefundCustomerId, setSelectedRefundCustomerId] = useState<string>('');
  const [refundAmount, setRefundAmount] = useState<string | number>('');
  const [refundDate, setRefundDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [refundPurpose, setRefundPurpose] = useState<string>('Visa Application Rejected');
  const [refundCustomPurpose, setRefundCustomPurpose] = useState<string>('');
  const [refundPaymentMethod, setRefundPaymentMethod] = useState<string>('Bank Transfer');
  const [refundBankName, setRefundBankName] = useState<string>('Maybank (Malayan Banking Berhad)');
  const [refundBankAccountNo, setRefundBankAccountNo] = useState<string>('');
  const [refundReceiptNo, setRefundReceiptNo] = useState<string>(() => `REF-${Date.now().toString().slice(-6)}`);
  const [refundSlipUrl, setRefundSlipUrl] = useState<string | null>(null);
  const [refundSlipFilename, setRefundSlipFilename] = useState<string>('');
  const [refundRemarks, setRefundRemarks] = useState<string>('');
  const [refundSubmitting, setRefundSubmitting] = useState(false);
  const [voucherToPrint, setVoucherToPrint] = useState<CustomerRefundAmountRecord | null>(null);

  // Top Card Select2 Filters (matching Companies Dashboard)
  const [selectedCompanyCardId, setSelectedCompanyCardId] = useState<string>('ALL');
  const [selectedSectorCardId, setSelectedSectorCardId] = useState<string>('ALL');
  const [selectedProgramCardId, setSelectedProgramCardId] = useState<string>('ALL');
  const [selectedYearCardId, setSelectedYearCardId] = useState<string>('ALL');

  // Stat Cards Management State
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [initialShowAdd, setInitialShowAdd] = useState(false);
  const [cards, setCards] = useState<PageStatCardConfig[]>(DEFAULT_CUSTOMER_DASHBOARD_STAT_CARDS);

  // Table Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [tableStatusFilter, setTableStatusFilter] = useState<'all' | 'active' | 'inactive' | 'runaway' | 'blacklist' | 'absent' | 'pending'>('all');
  const [tableSectorFilter, setTableSectorFilter] = useState('ALL');
  const [tableCompanyFilter, setTableCompanyFilter] = useState('ALL');

  // Export Dropdown State & Ref
  const [isExportOpen, setIsExportOpen] = useState(false);
  const exportDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        exportDropdownRef.current &&
        !exportDropdownRef.current.contains(event.target as Node)
      ) {
        setIsExportOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Deletion Modal & Toast
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'info' | 'error'; message: string } | null>(null);

  const showToast = (type: 'success' | 'info' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3500);
  };

  useEffect(() => {
    const stored = getStoredPageCards('customer_dashboard', DEFAULT_CUSTOMER_DASHBOARD_STAT_CARDS);
    const sorted = [...stored].sort((a, b) => (a.order_num || 0) - (b.order_num || 0));
    const depositIdx = sorted.findIndex((c) => c.id === 'deposit_amount' || c.metric_type === 'deposit_wallet');
    const refundIdx = sorted.findIndex((c) => c.id === 'refund_amount' || c.metric_type === 'refund_wallet');
    const isDirectlyAfter = depositIdx >= 0 && refundIdx === depositIdx + 1;

    if (!isDirectlyAfter || sorted.length !== DEFAULT_CUSTOMER_DASHBOARD_STAT_CARDS.length) {
      saveStoredPageCards('customer_dashboard', DEFAULT_CUSTOMER_DASHBOARD_STAT_CARDS);
      setCards(DEFAULT_CUSTOMER_DASHBOARD_STAT_CARDS);
    } else {
      setCards(stored);
    }

    const handleUpdate = (e: any) => {
      setCards(e.detail || getStoredPageCards('customer_dashboard', DEFAULT_CUSTOMER_DASHBOARD_STAT_CARDS));
    };
    window.addEventListener('superadmin_cards_update_customer_dashboard', handleUpdate);
    return () => window.removeEventListener('superadmin_cards_update_customer_dashboard', handleUpdate);
  }, []);

  const handleSaveCards = (updated: PageStatCardConfig[]) => {
    const saved = saveStoredPageCards('customer_dashboard', updated);
    setCards(saved);
    showToast('success', 'Cards priority and names updated successfully.');
  };

  const handleResetCards = () => {
    const reset = resetStoredPageCards('customer_dashboard', DEFAULT_CUSTOMER_DASHBOARD_STAT_CARDS);
    setCards(reset);
    showToast('info', 'Customer dashboard cards reset to default.');
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [comps, secList, custList, progList, futureList, targets, deposits, pendings, costs, refunds] = await Promise.all([
        fetchCompaniesFromBackend().catch(() => getStoredCompanies()),
        fetchWorkingSectors(),
        fetchCustomers(),
        fetchPrograms().catch(() => getStoredPrograms()),
        getStoredFutureCustomers(),
        fetchCustomerTargets().catch(() => []),
        fetchCustomerDeposits().catch(() => []),
        fetchCustomerPendings().catch(() => []),
        fetchCustomerCompanyCosts().catch(() => []),
        fetchCustomerRefunds().catch(() => []),
      ]);
      setCompanies(comps);
      setSectors(secList);
      setCustomers(custList);
      setPrograms(progList);
      setFutureCustomers(futureList || []);
      setTargetRecords(targets || []);
      setDepositRecords(deposits || []);
      setPendingRecords(pendings || []);
      setCostRecords(costs || []);
      setRefundRecords(refunds || []);
    } catch (err) {
      console.error('Failed to load customer dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const unsubFuture = subscribeToFutureCustomers((list) => {
      setFutureCustomers(list);
    });
    const unsubCompany = subscribeToCompanyChanges(() => {
      setCompanies(getStoredCompanies());
    });
    const handleRefundsUpdated = () => {
      setRefundRecords(getStoredCustomerRefunds());
    };
    const handleDataReload = () => {
      loadData();
    };
    window.addEventListener('customerRefundsUpdated', handleRefundsUpdated);
    window.addEventListener('customersUpdated', handleDataReload);
    window.addEventListener('customerDepositsUpdated', handleDataReload);
    window.addEventListener('customerTargetsUpdated', handleDataReload);
    window.addEventListener('customerPendingsUpdated', handleDataReload);
    window.addEventListener('companyCostsUpdated', handleDataReload);
    return () => {
      unsubFuture();
      unsubCompany();
      window.removeEventListener('customerRefundsUpdated', handleRefundsUpdated);
      window.removeEventListener('customersUpdated', handleDataReload);
      window.removeEventListener('customerDepositsUpdated', handleDataReload);
      window.removeEventListener('customerTargetsUpdated', handleDataReload);
      window.removeEventListener('customerPendingsUpdated', handleDataReload);
      window.removeEventListener('companyCostsUpdated', handleDataReload);
    };
  }, []);

  const handleOpenRefundModal = (cust?: CustomerRecord) => {
    if (cust) {
      setSelectedRefundCustomerId(String(cust.id));
    }
    setRefundAmount('');
    setRefundDate(new Date().toISOString().split('T')[0]);
    setRefundReceiptNo(`REF-${Date.now().toString().slice(-6)}`);
    setRefundSlipUrl(null);
    setRefundSlipFilename('');
    setRefundRemarks('');
    setIsRefundModalOpen(true);
  };

  const handleRefundSlipUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setRefundSlipFilename(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setRefundSlipUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const selectedRefundCustomer = useMemo(() => {
    if (!selectedRefundCustomerId) return null;
    return customers.find((c) => String(c.id) === String(selectedRefundCustomerId)) || null;
  }, [customers, selectedRefundCustomerId]);

  const selectedRefundCustomerBalance = useMemo(() => {
    if (!selectedRefundCustomerId) return null;
    return getCustomerFinanceBalance(selectedRefundCustomerId);
  }, [selectedRefundCustomerId, depositRecords, refundRecords]);

  const handleSubmitRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRefundCustomer) {
      showToast('error', 'Please select a customer to refund.');
      return;
    }
    const amt = Number(refundAmount);
    if (!amt || amt <= 0) {
      showToast('error', 'Please enter a valid refund amount in RM.');
      return;
    }

    setRefundSubmitting(true);
    try {
      const finalPurpose = refundPurpose === 'Other' && refundCustomPurpose.trim() ? refundCustomPurpose.trim() : refundPurpose;
      const matchedComp = companies.find((c) => c.id.toLowerCase() === selectedRefundCustomer.company_id?.toLowerCase());
      const compName = matchedComp?.name || selectedRefundCustomer.other_company_name || undefined;

      const newRecord: CustomerRefundAmountRecord = {
        id: `ref_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        customer_id: selectedRefundCustomer.id,
        customer_name: selectedRefundCustomer.full_name,
        passport_no: selectedRefundCustomer.passport_no || undefined,
        nid_no: selectedRefundCustomer.nid_no || undefined,
        company_id: selectedRefundCustomer.company_id || undefined,
        company_name: compName,
        program_id: selectedRefundCustomer.program_id || undefined,
        program_name: selectedRefundCustomer.program_name || undefined,
        working_sector: selectedRefundCustomer.working_sector || undefined,
        refund_amount: amt,
        refund_date: refundDate || new Date().toISOString().split('T')[0],
        payment_method: refundPaymentMethod,
        bank_name: refundBankName || undefined,
        bank_account_no: refundBankAccountNo || undefined,
        receipt_no: refundReceiptNo || `REF-${Date.now().toString().slice(-6)}`,
        purpose: finalPurpose,
        refunded_by: 'Super Admin',
        receipt_url: refundSlipUrl || undefined,
        receipt_filename: refundSlipFilename || undefined,
        status: 'Completed',
        remarks: refundRemarks || undefined,
        created_at: new Date().toISOString(),
      };

      const updated = await saveCustomerRefund(newRecord);
      setRefundRecords(updated);
      showToast('success', `Refund of RM ${amt.toLocaleString(undefined, { minimumFractionDigits: 2 })} processed successfully for ${selectedRefundCustomer.full_name}.`);
      setIsRefundModalOpen(false);
      setVoucherToPrint(newRecord);

      // Reset fields
      setRefundAmount('');
      setRefundRemarks('');
      setRefundSlipUrl(null);
      setRefundSlipFilename('');
      setRefundReceiptNo(`REF-${Date.now().toString().slice(-6)}`);
    } catch (err) {
      console.error('Failed to issue refund:', err);
      showToast('error', 'Failed to process refund. Please try again.');
    } finally {
      setRefundSubmitting(false);
    }
  };

  const handlePrintRefundVoucher = (voucher: CustomerRefundAmountRecord) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      window.print();
      return;
    }
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Customer Refund Voucher - ${voucher.receipt_no}</title>
          <style>
            @page { size: A4; margin: 20mm; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #0f172a; margin: 0; padding: 20px; }
            .header { border-bottom: 3px solid #0b4da2; padding-bottom: 16px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-start; }
            .title { font-size: 24px; font-weight: 800; color: #0b4da2; margin: 0; text-transform: uppercase; letter-spacing: 0.5px; }
            .subtitle { font-size: 13px; color: #64748b; margin-top: 4px; font-weight: 500; }
            .badge { display: inline-block; background-color: #fee2e2; color: #991b1b; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 700; text-transform: uppercase; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; }
            .card { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 16px; }
            .card-label { font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; margin-bottom: 6px; }
            .card-val { font-size: 14px; font-weight: 700; color: #1e293b; }
            .amount-box { background: linear-gradient(135deg, #fdf2f8, #fff1f2); border: 2px solid #fecdd3; border-radius: 10px; padding: 18px 22px; margin-bottom: 24px; text-align: center; }
            .amount-label { font-size: 12px; font-weight: 700; text-transform: uppercase; color: #9f1239; margin-bottom: 4px; }
            .amount-val { font-size: 32px; font-weight: 800; color: #e11d48; font-family: monospace; }
            .meta-table { width: 100%; border-collapse: collapse; margin-bottom: 28px; }
            .meta-table th { background-color: #0b4da2; color: white; padding: 10px 14px; text-align: left; font-size: 12px; font-weight: 700; text-transform: uppercase; }
            .meta-table td { padding: 10px 14px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #334155; }
            .slip-preview { margin-top: 20px; margin-bottom: 28px; text-align: center; }
            .slip-preview img { max-width: 320px; max-height: 220px; border: 1px solid #cbd5e1; border-radius: 8px; }
            .signatures { margin-top: 48px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
            .sig-line { border-top: 1px solid #94a3b8; padding-top: 8px; text-align: center; font-size: 12px; font-weight: 600; color: #475569; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1 class="title">Official Customer Refund Voucher</h1>
              <div class="subtitle">Agency Treasury & Foreign Worker Financial Management</div>
            </div>
            <div style="text-align: right;">
              <span class="badge">Refund Processed</span>
              <div style="font-size: 11px; color: #64748b; margin-top: 6px;">Voucher No: <strong>${voucher.receipt_no}</strong></div>
              <div style="font-size: 11px; color: #64748b;">Date: <strong>${voucher.refund_date}</strong></div>
            </div>
          </div>

          <div class="amount-box">
            <div class="amount-label">Total Refunded Amount</div>
            <div class="amount-val">RM ${(Number(voucher.refund_amount) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          </div>

          <div class="grid">
            <div class="card">
              <div class="card-label">Beneficiary / Customer Information</div>
              <div class="card-val">${voucher.customer_name}</div>
              <div style="font-size: 12px; color: #64748b; margin-top: 4px;">Passport: <strong>${voucher.passport_no || '—'}</strong> • NID: <strong>${voucher.nid_no || '—'}</strong></div>
              <div style="font-size: 12px; color: #64748b;">Company: <strong>${voucher.company_name || 'Individual Worker'}</strong></div>
            </div>
            <div class="card">
              <div class="card-label">Payment & Banking Details</div>
              <div class="card-val">${voucher.payment_method}</div>
              <div style="font-size: 12px; color: #64748b; margin-top: 4px;">Bank: <strong>${voucher.bank_name || 'Direct Treasury'}</strong></div>
              <div style="font-size: 12px; color: #64748b;">Account No: <strong>${voucher.bank_account_no || '—'}</strong></div>
            </div>
          </div>

          <table class="meta-table">
            <thead>
              <tr>
                <th>Description / Purpose</th>
                <th>Payment Mode</th>
                <th>Authorized By</th>
                <th style="text-align: right;">Amount (RM)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>${voucher.purpose}</strong>${voucher.remarks ? `<div style="font-size: 11px; color: #64748b; margin-top: 3px;">Note: ${voucher.remarks}</div>` : ''}</td>
                <td>${voucher.payment_method}</td>
                <td>${voucher.refunded_by || 'Super Admin'}</td>
                <td style="text-align: right; font-weight: 700; font-family: monospace;">RM ${(Number(voucher.refund_amount) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              </tr>
            </tbody>
          </table>

          ${voucher.receipt_url ? `
            <div class="slip-preview">
              <div style="font-size: 11px; color: #64748b; font-weight: 700; text-transform: uppercase; margin-bottom: 8px;">Attached Refund Slip / Proof</div>
              <img src="${voucher.receipt_url}" alt="Refund Slip" />
            </div>
          ` : ''}

          <div class="signatures">
            <div>
              <div style="height: 50px;"></div>
              <div class="sig-line">Authorized Agency Officer Signature & Stamp</div>
            </div>
            <div>
              <div style="height: 50px;"></div>
              <div class="sig-line">Beneficiary / Customer Acknowledgement</div>
            </div>
          </div>
        </body>
      </html>
    `;
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 300);
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteCustomer(id);
      setCustomers((prev) => prev.filter((c) => c.id !== id));
      setDeleteConfirmId(null);
      showToast('info', 'Customer record was successfully deleted.');
    } catch {
      showToast('error', 'Failed to delete customer record.');
    }
  };

  // Customers filtered by Top Card Select2 Filters
  const customersFilteredForCards = useMemo(() => {
    return customers.filter((cust) => {
      const matchCompany =
        selectedCompanyCardId === 'ALL' ||
        (cust.company_id && cust.company_id.toLowerCase() === selectedCompanyCardId.toLowerCase());

      const matchSector =
        selectedSectorCardId === 'ALL' ||
        (cust.working_sector && cust.working_sector.toLowerCase() === selectedSectorCardId.toLowerCase());

      const matchProgram =
        selectedProgramCardId === 'ALL' ||
        (cust.program_id && String(cust.program_id) === String(selectedProgramCardId));

      const matchYear =
        selectedYearCardId === 'ALL' ||
        (cust.created_at && cust.created_at.slice(0, 4) === selectedYearCardId) ||
        (cust.passport_issue_date && cust.passport_issue_date.slice(0, 4) === selectedYearCardId);

      return matchCompany && matchSector && matchProgram && matchYear;
    });
  }, [customers, selectedCompanyCardId, selectedSectorCardId, selectedProgramCardId, selectedYearCardId]);

  // Selected single company object for top banner badge
  const selectedSingleCompany = useMemo(() => {
    if (selectedCompanyCardId === 'ALL') return null;
    return companies.find((c) => c.id.toLowerCase() === selectedCompanyCardId.toLowerCase()) || null;
  }, [companies, selectedCompanyCardId]);

  const availableYears = useMemo(() => {
    const years = new Set<string>();
    const currentYear = new Date().getFullYear();
    for (let y = currentYear + 1; y >= currentYear - 5; y--) {
      years.add(String(y));
    }
    customers.forEach((cust) => {
      if (cust.created_at) {
        const y = cust.created_at.slice(0, 4);
        if (/^\d{4}$/.test(y)) years.add(y);
      }
      if (cust.passport_issue_date) {
        const y = cust.passport_issue_date.slice(0, 4);
        if (/^\d{4}$/.test(y)) years.add(y);
      }
    });
    return Array.from(years).sort((a, b) => Number(b) - Number(a));
  }, [customers]);

  const yearCardFilterOptions: Select2Option[] = useMemo(() => [
    {
      value: 'ALL',
      label: `All Years (${availableYears.length})`,
      subLabel: 'All historical & current clearance years',
      badge: `${availableYears.length} Yrs`,
    },
    ...availableYears.map((yr) => ({
      value: yr,
      label: `Year ${yr}`,
      subLabel: `Clearances & quotas for ${yr}`,
    })),
  ], [availableYears]);

  // Select2 Options for Top Filters
  const companyCardFilterOptions: Select2Option[] = useMemo(() => {
    return [
      { value: 'ALL', label: 'All Employer Companies (Aggregated)', subLabel: `${companies.length} Companies` },
      ...companies.map((c) => ({
        value: c.id,
        label: c.name,
        subLabel: `${c.sector || 'General'} • ROC: ${c.roc || '—'}`,
        badge: c.status,
      })),
    ];
  }, [companies]);

  const sectorCardFilterOptions: Select2Option[] = useMemo(() => {
    const uniqueSectors = Array.from(new Set(sectors.map((s) => s.name)));
    return [
      { value: 'ALL', label: 'All Working Sectors', subLabel: `${uniqueSectors.length} Sectors` },
      ...uniqueSectors.map((s) => ({
        value: s,
        label: s,
      })),
    ];
  }, [sectors]);

  const programCardFilterOptions: Select2Option[] = useMemo(() => {
    return [
      { value: 'ALL', label: 'All Programs', subLabel: `${programs.length} Programs` },
      ...programs.map((p) => ({
        value: String(p.id),
        label: p.name,
        subLabel: p.category || undefined,
      })),
    ];
  }, [programs]);

  const customerRefundSelectOptions: Select2Option[] = useMemo(() => {
    return [
      { value: '', label: 'Select Customer to Refund...', subLabel: 'Search by worker name, passport, or company' },
      ...customers.map((c) => {
        const cComp = companies.find((comp) => comp.id.toLowerCase() === c.company_id?.toLowerCase());
        const compLabel = cComp?.name || c.other_company_name || 'Individual Worker';
        return {
          value: String(c.id),
          label: c.full_name,
          subLabel: `Passport: ${c.passport_no || '—'} • ${compLabel}`,
          badge: c.status,
        };
      }),
    ];
  }, [customers, companies]);

  // Dynamic Card Metric Values calculation based on selected filters
  const getCardMetrics = (card: PageStatCardConfig) => {
    const metric = card.metric_type || card.id;
    const list = customersFilteredForCards;

    switch (metric) {
      case 'total_customers': {
        return {
          value: list.length.toLocaleString(),
          sub: 'Across selected employer entities • View Directory →',
          isLink: true,
          link: `${baseRoute}/dashboard`,
          theme: { bg: 'bg-blue-50', text: 'text-[#0b4da2]', valColor: 'text-slate-900' },
        };
      }
      case 'active_permits':
      case 'active_customers': {
        const c = list.filter((w) => w.status === 'active').length;
        return {
          value: c.toLocaleString(),
          sub: 'Authorized worker permits • View Active →',
          isLink: true,
          link: `${baseRoute}/active`,
          theme: { bg: 'bg-emerald-50', text: 'text-emerald-700', valColor: 'text-emerald-600' },
        };
      }
      case 'inactive_workers':
      case 'inactive_customers': {
        const c = list.filter((w) => w.status === 'inactive').length;
        return {
          value: c.toLocaleString(),
          sub: 'Suspended worker accounts • View Inactive →',
          isLink: true,
          link: `${baseRoute}/inactive`,
          theme: { bg: 'bg-rose-50', text: 'text-rose-700', valColor: 'text-rose-600' },
        };
      }
      case 'runaway_workers':
      case 'runaway_customers': {
        const c = list.filter((w) => w.status === 'runaway').length;
        return {
          value: c.toLocaleString(),
          sub: 'Absentee & runaway alerts • View Runaway →',
          isLink: true,
          link: `${baseRoute}/runaway`,
          theme: { bg: 'bg-orange-50', text: 'text-orange-700', valColor: 'text-orange-600' },
        };
      }
      case 'blacklist_workers':
      case 'blacklist_customers': {
        const c = list.filter((w) => w.status === 'blacklist').length;
        return {
          value: c.toLocaleString(),
          sub: 'Flagged immigration records • View Blacklist →',
          isLink: true,
          link: `${baseRoute}/blacklist`,
          theme: { bg: 'bg-slate-900', text: 'text-white', valColor: 'text-slate-900' },
        };
      }
      case 'future_candidates':
      case 'future_customers': {
        const c = futureCustomers.length;
        return {
          value: c.toLocaleString(),
          sub: 'Upcoming candidate leads • View Future →',
          isLink: true,
          link: `${baseRoute}/future`,
          theme: { bg: 'bg-purple-50', text: 'text-purple-700', valColor: 'text-purple-600' },
        };
      }
      case 'passport_verified': {
        const c = list.filter((w) => Boolean(w.passport_no || w.passport_file)).length;
        return {
          value: c.toLocaleString(),
          sub: 'Biometric passports archived',
          isLink: false,
          theme: { bg: 'bg-teal-50', text: 'text-teal-700', valColor: 'text-teal-600' },
        };
      }
      case 'document_dossiers': {
        const c = list.reduce((sum, w) => sum + (w.documents?.length || 0), 0);
        return {
          value: c.toLocaleString(),
          sub: 'Uploaded compliance files',
          isLink: false,
          theme: { bg: 'bg-amber-50', text: 'text-amber-700', valColor: 'text-amber-600' },
        };
      }
      case 'target_wallet':
      case 'target_amount':
      case 'customer_target_amount': {
        const relevantTargets = targetRecords.filter((t) => {
          if (selectedCompanyCardId !== 'ALL' && t.company_id && t.company_id.toLowerCase() !== selectedCompanyCardId.toLowerCase()) return false;
          return true;
        });
        const targetSum = list.length === 0
          ? 0
          : relevantTargets.reduce((sum, t) => sum + (Number(t.target_amount) || 0), 0);
        return {
          value: `RM ${targetSum.toLocaleString()}`,
          isLink: true,
          link: `${baseRoute}/target-amount`,
          theme: { bg: 'bg-blue-50', text: 'text-[#0b4da2]', valColor: 'text-slate-900' },
        };
      }
      case 'deposit_wallet':
      case 'deposit_amount':
      case 'customer_deposit_amount': {
        const relevantDeposits = depositRecords.filter((d) => {
          if (selectedCompanyCardId !== 'ALL' && d.company_id && d.company_id.toLowerCase() !== selectedCompanyCardId.toLowerCase()) return false;
          return true;
        });
        const depositSum = list.length === 0
          ? 0
          : relevantDeposits.reduce((sum, d) => sum + (Number(d.deposit_amount) || 0), 0);
        return {
          value: `RM ${depositSum.toLocaleString()}`,
          isLink: true,
          link: `${baseRoute}/deposit-amount`,
          theme: { bg: 'bg-emerald-50', text: 'text-emerald-700', valColor: 'text-emerald-600' },
        };
      }
      case 'cost_wallet':
      case 'cost_amount':
      case 'customer_cost_amount': {
        const relevantCosts = costRecords.filter((c) => {
          if (selectedCompanyCardId !== 'ALL' && c.company_id && c.company_id.toLowerCase() !== selectedCompanyCardId.toLowerCase()) return false;
          return true;
        });
        const costSum = list.length === 0
          ? 0
          : relevantCosts.reduce((sum, c) => sum + (Number(c.total_cost_amount) || 0), 0);
        return {
          value: `RM ${costSum.toLocaleString()}`,
          isLink: true,
          link: `${baseRoute}/company-cost`,
          theme: { bg: 'bg-rose-50', text: 'text-rose-700', valColor: 'text-rose-600' },
        };
      }
      case 'pending_wallet':
      case 'pending_amount':
      case 'customer_pending_amount': {
        const relevantPendings = pendingRecords.filter((p) => {
          if (selectedCompanyCardId !== 'ALL' && p.company_id && p.company_id.toLowerCase() !== selectedCompanyCardId.toLowerCase()) return false;
          return true;
        });
        const pendingSum = list.length === 0
          ? 0
          : relevantPendings.reduce((sum, p) => sum + (Number(p.pending_amount) || 0), 0);
        return {
          value: `RM ${pendingSum.toLocaleString()}`,
          isLink: true,
          link: `${baseRoute}/pending-amount`,
          theme: { bg: 'bg-amber-50', text: 'text-amber-700', valColor: 'text-amber-600' },
        };
      }
      case 'refund_wallet':
      case 'refund_amount':
      case 'customer_refund_amount': {
        const relevantRefunds = refundRecords.filter((r) => {
          if (selectedCompanyCardId !== 'ALL' && r.company_id && r.company_id.toLowerCase() !== selectedCompanyCardId.toLowerCase()) return false;
          return true;
        });
        const refundSum = list.length === 0
          ? 0
          : relevantRefunds.reduce((sum, r) => sum + (Number(r.refund_amount) || 0), 0);
        return {
          value: `RM ${refundSum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          isLink: true,
          link: `${baseRoute}/refund-amount`,
          theme: { bg: 'bg-rose-50', text: 'text-rose-700', valColor: 'text-rose-600' },
        };
      }
      default: {
        return {
          value: card.custom_value !== undefined ? String(card.custom_value) : '0',
          sub: card.subtitle || 'Custom metric value',
          isLink: false,
          theme: { bg: 'bg-slate-100', text: 'text-slate-700', valColor: 'text-slate-800' },
        };
      }
    }
  };

  // Status Tab Counts for the Table
  const statusCounts = useMemo(() => {
    return {
      all: customers.length,
      active: customers.filter((c) => c.status === 'active').length,
      inactive: customers.filter((c) => c.status === 'inactive').length,
      runaway: customers.filter((c) => c.status === 'runaway').length,
      blacklist: customers.filter((c) => c.status === 'blacklist').length,
      absent: customers.filter((c) => c.status === 'absent').length,
      pending: customers.filter((c) => c.status === 'pending').length,
    };
  }, [customers]);

  // Filtered customer list for the Table
  const filteredCustomers = useMemo(() => {
    return customers.filter((cust) => {
      const term = searchTerm.toLowerCase().trim();
      const matchSearch =
        !term ||
        cust.full_name.toLowerCase().includes(term) ||
        cust.nid_no.toLowerCase().includes(term) ||
        (cust.passport_no && cust.passport_no.toLowerCase().includes(term)) ||
        (cust.phone && cust.phone.toLowerCase().includes(term)) ||
        (cust.email && cust.email.toLowerCase().includes(term)) ||
        (cust.working_sector && cust.working_sector.toLowerCase().includes(term)) ||
        (cust.working_address && cust.working_address.toLowerCase().includes(term));

      const matchStatus =
        tableStatusFilter === 'all' || cust.status === tableStatusFilter;

      const matchSector =
        tableSectorFilter === 'ALL' ||
        (cust.working_sector && cust.working_sector.toLowerCase() === tableSectorFilter.toLowerCase());

      const matchCompany =
        tableCompanyFilter === 'ALL' ||
        (cust.company_id && cust.company_id.toLowerCase() === tableCompanyFilter.toLowerCase());

      return matchSearch && matchStatus && matchSector && matchCompany;
    });
  }, [customers, searchTerm, tableStatusFilter, tableSectorFilter, tableCompanyFilter]);

  const getCustomerExportRow = (cust: CustomerRecord, idx: number) => {
    const compMatch = companies.find(
      (c) => c.id.toLowerCase() === (cust.company_id || '').toLowerCase()
    );
    const companyName = compMatch ? compMatch.name : cust.company_id || cust.other_company_name || '—';
    const docCount = Array.isArray(cust.documents) ? cust.documents.length : 0;

    return {
      sl: idx + 1,
      name: cust.full_name || '',
      passport: cust.passport_no || '—',
      nid: cust.nid_no || '—',
      company: companyName,
      sector: cust.working_sector || 'General',
      salary: cust.basic_salary || '—',
      phone: cust.phone || cust.worker_phone || '—',
      email: cust.email || '—',
      country: cust.country || 'Malaysia / Expat',
      dossiers: docCount,
      status: (cust.status || 'active').toUpperCase(),
      agent: cust.agent_name || '—',
      program: cust.program_name || '—',
    };
  };

  const handleExportExcel = () => {
    setIsExportOpen(false);
    if (!filteredCustomers || filteredCustomers.length === 0) {
      alert('No customers found to export.');
      return;
    }

    const data = filteredCustomers.map((cust, idx) => {
      const row = getCustomerExportRow(cust, idx);
      return {
        '#': row.sl,
        'Worker Name': row.name,
        'Country': row.country,
        'Passport No': row.passport,
        'NID No': row.nid,
        'Employer Company': row.company,
        'Sector': row.sector,
        'Basic Salary': row.salary,
        'Phone': row.phone,
        'Email': row.email,
        'Dossiers Count': row.dossiers,
        'Status': row.status,
        'Agent': row.agent,
        'Program': row.program,
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    worksheet['!cols'] = [
      { wch: 5 },  // #
      { wch: 25 }, // Worker Name
      { wch: 18 }, // Country
      { wch: 16 }, // Passport No
      { wch: 16 }, // NID No
      { wch: 28 }, // Company
      { wch: 18 }, // Sector
      { wch: 14 }, // Basic Salary
      { wch: 18 }, // Phone
      { wch: 24 }, // Email
      { wch: 14 }, // Dossiers
      { wch: 14 }, // Status
      { wch: 18 }, // Agent
      { wch: 18 }, // Program
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Foreign Customers');
    const today = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `foreign_customers_${today}.xlsx`);
  };

  const handleExportCSV = () => {
    setIsExportOpen(false);
    if (!filteredCustomers || filteredCustomers.length === 0) {
      alert('No customers found to export.');
      return;
    }

    const headers = [
      '#',
      'Worker Name',
      'Country',
      'Passport No',
      'NID No',
      'Employer Company',
      'Sector',
      'Basic Salary',
      'Phone',
      'Email',
      'Dossiers Count',
      'Status',
      'Agent',
      'Program',
    ];

    const escapeCSV = (val: any) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = filteredCustomers.map((cust, idx) => {
      const row = getCustomerExportRow(cust, idx);
      return [
        row.sl,
        escapeCSV(row.name),
        escapeCSV(row.country),
        escapeCSV(row.passport),
        escapeCSV(row.nid),
        escapeCSV(row.company),
        escapeCSV(row.sector),
        escapeCSV(row.salary),
        escapeCSV(row.phone),
        escapeCSV(row.email),
        row.dossiers,
        escapeCSV(row.status),
        escapeCSV(row.agent),
        escapeCSV(row.program),
      ].join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const today = new Date().toISOString().split('T')[0];
    link.setAttribute('href', url);
    link.setAttribute('download', `foreign_customers_${today}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportPDF = () => {
    setIsExportOpen(false);
    if (!filteredCustomers || filteredCustomers.length === 0) {
      alert('No customers found to export.');
      return;
    }

    const today = new Date().toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

    const rowsHtml = filteredCustomers
      .map((cust, idx) => {
        const row = getCustomerExportRow(cust, idx);
        const isAct = row.status === 'ACTIVE';
        const isRunaway = row.status === 'RUNAWAY';
        const isBlacklist = row.status === 'BLACKLIST';
        const badgeClass = isAct
          ? 'badge-active'
          : isRunaway
          ? 'badge-runaway'
          : isBlacklist
          ? 'badge-blacklist'
          : 'badge-inactive';

        return `
          <tr>
            <td style="text-align: center;">${row.sl}</td>
            <td style="font-weight: 600;">
              <div>${row.name || '—'}</div>
              <div style="font-size: 9px; color: #64748b; font-weight: normal;">${row.country}</div>
            </td>
            <td style="font-family: monospace;">${row.passport}</td>
            <td style="font-family: monospace;">${row.nid}</td>
            <td style="font-weight: 500;">${row.company}</td>
            <td>${row.sector}</td>
            <td style="font-family: monospace;">${row.salary}</td>
            <td style="font-family: monospace;">${row.phone}</td>
            <td style="text-align: center; font-family: monospace;">${row.dossiers}</td>
            <td style="text-align: center;">
              <span class="badge ${badgeClass}">${row.status}</span>
            </td>
          </tr>
        `;
      })
      .join('');

    const totalActive = filteredCustomers.filter((c) => c.status === 'active').length;
    const totalInactive = filteredCustomers.filter((c) => c.status === 'inactive').length;
    const totalRunaway = filteredCustomers.filter((c) => c.status === 'runaway').length;
    const totalBlacklist = filteredCustomers.filter((c) => c.status === 'blacklist').length;

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Foreign Customer Registry Report - ${today}</title>
        <style>
          @page {
            size: landscape;
            margin: 8mm;
          }
          * {
            box-sizing: border-box;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #1e293b;
            margin: 0;
            padding: 16px;
            font-size: 11px;
            background: #fff;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid #0b4da2;
            padding-bottom: 10px;
            margin-bottom: 12px;
          }
          .title {
            font-size: 18px;
            font-weight: 800;
            color: #0b4da2;
            margin: 0;
          }
          .subtitle {
            font-size: 11px;
            color: #64748b;
            margin-top: 2px;
          }
          .meta {
            text-align: right;
            font-size: 11px;
            color: #475569;
          }
          .summary-bar {
            display: flex;
            gap: 10px;
            margin-bottom: 14px;
          }
          .summary-card {
            flex: 1;
            padding: 8px 10px;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            background: #f8fafc;
          }
          .summary-card .lbl {
            font-size: 9px;
            text-transform: uppercase;
            font-weight: 700;
            color: #64748b;
          }
          .summary-card .val {
            font-size: 13px;
            font-weight: 800;
            color: #0f172a;
            margin-top: 2px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 10px;
          }
          th {
            background: #0b4da2;
            color: #ffffff;
            font-weight: 700;
            text-align: left;
            padding: 6px 7px;
            border: 1px solid #083c7e;
            white-space: nowrap;
          }
          td {
            padding: 5px 7px;
            border: 1px solid #e2e8f0;
            vertical-align: middle;
          }
          tr:nth-child(even) {
            background: #f8fafc;
          }
          .badge {
            display: inline-block;
            padding: 1px 5px;
            border-radius: 4px;
            font-size: 9px;
            font-weight: 700;
            text-transform: uppercase;
          }
          .badge-active {
            background: #dcfce7;
            color: #15803d;
            border: 1px solid #bbf7d0;
          }
          .badge-inactive {
            background: #fee2e2;
            color: #b91c1c;
            border: 1px solid #fecaca;
          }
          .badge-runaway {
            background: #ffedd5;
            color: #c2410c;
            border: 1px solid #fed7aa;
          }
          .badge-blacklist {
            background: #0f172a;
            color: #f8fafc;
            border: 1px solid #020617;
          }
          .footer {
            margin-top: 12px;
            display: flex;
            justify-content: space-between;
            font-size: 9px;
            color: #94a3b8;
          }
          @media print {
            body {
              padding: 0;
            }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1 class="title">FOREIGN CUSTOMER REGISTRY REPORT</h1>
            <div class="subtitle">Foreign Customer / Worker Directory</div>
          </div>
          <div class="meta">
            <div><strong>Report Date:</strong> ${today}</div>
            <div><strong>Total Filtered:</strong> ${filteredCustomers.length} Records</div>
          </div>
        </div>

        <div class="summary-bar">
          <div class="summary-card">
            <div class="lbl">Total Listed</div>
            <div class="val">${filteredCustomers.length}</div>
          </div>
          <div class="summary-card">
            <div class="lbl">Active Permits</div>
            <div class="val" style="color: #15803d;">${totalActive}</div>
          </div>
          <div class="summary-card">
            <div class="lbl">Inactive</div>
            <div class="val" style="color: #b91c1c;">${totalInactive}</div>
          </div>
          <div class="summary-card">
            <div class="lbl">Runaway Alerts</div>
            <div class="val" style="color: #c2410c;">${totalRunaway}</div>
          </div>
          <div class="summary-card">
            <div class="lbl">Blacklist</div>
            <div class="val" style="color: #0f172a;">${totalBlacklist}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 25px; text-align: center;">#</th>
              <th>Worker Name</th>
              <th>Passport</th>
              <th>NID No</th>
              <th>Employer Company</th>
              <th>Sector</th>
              <th>Salary</th>
              <th>Contact</th>
              <th style="text-align: center;">Dossiers</th>
              <th style="text-align: center;">Status</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <div class="footer">
          <span>Generated by Foreign Customer Management System</span>
          <span>Confidential</span>
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 300);
          };
        </script>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.open();
      printWindow.document.write(printContent);
      printWindow.document.close();
    } else {
      window.print();
    }
  };

  const activeStatCards = useMemo(() => {
    const list = (cards && cards.length > 0 ? cards : DEFAULT_CUSTOMER_DASHBOARD_STAT_CARDS)
      .filter((c) => c.visible !== false);

    const canonicalOrder: Record<string, number> = {
      total_customers: 1,
      active_customers: 2,
      inactive_customers: 3,
      runaway_customers: 4,
      blacklist_customers: 5,
      future_customers: 6,
      target_amount: 7,
      target_wallet: 7,
      deposit_amount: 8,
      deposit_wallet: 8,
      refund_amount: 9,
      refund_wallet: 9,
      pending_amount: 10,
      pending_wallet: 10,
      cost_amount: 11,
      cost_wallet: 11,
    };

    return [...list].sort((a, b) => {
      const aKey = a.id || a.metric_type || '';
      const bKey = b.id || b.metric_type || '';
      const aOrder = canonicalOrder[aKey] ?? a.order_num ?? 99;
      const bOrder = canonicalOrder[bKey] ?? b.order_num ?? 99;
      return aOrder - bOrder;
    });
  }, [cards]);

  return (
    <div className="space-y-6 max-w-full min-w-0">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-xl border text-xs font-semibold animate-in fade-in slide-in-from-bottom-5 duration-300 ${
            notification.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
              : notification.type === 'error'
              ? 'bg-rose-50 text-rose-800 border-rose-300'
              : 'bg-blue-50 text-blue-800 border-blue-300'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle size={16} className="text-blue-600 shrink-0" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. TOP HEADER (Exact Same Clean Style as Companies Dashboard) */}
      {/* ========================================================================= */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs relative z-30 !overflow-visible">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight m-0">
                Super Admin — Customers Registry
              </h1>
              <span
                className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full transition-colors ${
                  selectedSingleCompany ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-[#0b4da2]'
                }`}
              >
                {selectedSingleCompany ? selectedSingleCompany.name : `${customers.length} Active`}
              </span>
            </div>
            <p className="text-xs text-slate-500 m-0">
              Create, edit, and manage registered foreign workers and biometric records.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={`${baseRoute}/panel`}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold bg-[#0b4da2] hover:bg-blue-700 text-white shadow-xs transition-colors cursor-pointer border-0 no-underline whitespace-nowrap"
            >
              <Wallet size={14} />
              <span>Worker Panel</span>
            </Link>

            <Link
              href={`${baseRoute}/create`}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold bg-[#22a34a] hover:bg-[#1b843c] text-white shadow-xs transition-colors cursor-pointer border-0 no-underline"
            >
              <Plus size={14} />
              <span>Add Customer</span>
            </Link>

            <button
              type="button"
              onClick={loadData}
              title="Reset customer defaults"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 shadow-xs transition-colors cursor-pointer"
            >
              <RotateCcw size={14} />
              <span>Reset Defaults</span>
            </button>
          </div>
        </div>

        {/* Company, Program, Working Sector & Year Select2 Filter for Cards Information */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 relative z-30 !overflow-visible">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700 whitespace-nowrap shrink-0">
              <Building2 size={16} className="text-[#0b4da2]" />
              <span>Filter Cards by Company:</span>
            </div>

            {/* 1. Company Filter */}
            <div className="w-48 sm:w-52 md:w-56 shrink-0 relative z-40">
              <Select2Search
                options={companyCardFilterOptions}
                value={selectedCompanyCardId}
                onChange={(val) => setSelectedCompanyCardId(val)}
                placeholder="All Companies (Aggregated)"
                searchPlaceholder="Search company by name, ROC, sector..."
                icon={<Building2 size={14} className="text-blue-600" />}
                dropdownWidth="w-[calc(100vw-2rem)] sm:w-[320px] max-w-[340px]"
              />
            </div>

            {/* 2. Program Filter */}
            <div className="w-40 sm:w-44 md:w-48 shrink-0 relative z-30">
              <Select2Search
                options={programCardFilterOptions}
                value={selectedProgramCardId}
                onChange={(val) => setSelectedProgramCardId(val)}
                placeholder="All Programs"
                searchPlaceholder="Search program name or code..."
                icon={<Layers size={14} className="text-indigo-600" />}
                dropdownWidth="w-[calc(100vw-2rem)] sm:w-[300px] max-w-[320px]"
              />
            </div>

            {/* 3. Working Sector Filter (Placed immediately beside Program Filter) */}
            <div className="w-40 sm:w-44 md:w-48 shrink-0 relative z-20">
              <Select2Search
                options={sectorCardFilterOptions}
                value={selectedSectorCardId}
                onChange={(val) => setSelectedSectorCardId(val)}
                placeholder="All Sectors"
                searchPlaceholder="Search sector..."
                icon={<Briefcase size={14} className="text-emerald-600" />}
                dropdownWidth="w-[calc(100vw-2rem)] sm:w-[280px] max-w-[300px]"
              />
            </div>

            {/* 4. Year Filter */}
            <div className="w-28 sm:w-32 md:w-36 shrink-0 relative z-10">
              <Select2Search
                options={yearCardFilterOptions}
                value={selectedYearCardId}
                onChange={(val) => setSelectedYearCardId(val)}
                placeholder="All Years"
                searchPlaceholder="Search year (e.g. 2026)..."
                icon={<Calendar size={14} className="text-amber-600" />}
                dropdownAlign="right"
                dropdownWidth="w-[calc(100vw-2rem)] sm:w-[220px] max-w-[240px]"
              />
            </div>

            {/* Reset All Filters button */}
            {(selectedCompanyCardId !== 'ALL' || selectedProgramCardId !== 'ALL' || selectedSectorCardId !== 'ALL' || selectedYearCardId !== 'ALL') && (
              <button
                type="button"
                onClick={() => {
                  setSelectedCompanyCardId('ALL');
                  setSelectedProgramCardId('ALL');
                  setSelectedSectorCardId('ALL');
                  setSelectedYearCardId('ALL');
                }}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#0b4da2] hover:text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer shrink-0"
                title="Reset all card metrics to defaults"
              >
                <X size={13} />
                <span>Reset to All</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. TOP STAT & WALLET CARDS SECTION (Matching Companies Dashboard) */}
      {/* ========================================================================= */}
      <div className="space-y-4">
        {/* Section Header with Add Card & Manage Cards Priority Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
          <div className="flex items-center gap-2.5">
            <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-700">
              Overview &amp; Worker Treasury Cards
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-[#0b4da2] border border-blue-200 text-[10px] font-bold font-mono">
              {activeStatCards.length} Cards
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* + Add Card Button */}
            <button
              type="button"
              onClick={() => {
                setInitialShowAdd(true);
                setIsCardModalOpen(true);
              }}
              title="Add a new custom or metric card to dashboard"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold bg-[#22a34a] hover:bg-[#1b843c] text-white shadow-xs hover:shadow transition-all cursor-pointer border-0"
            >
              <Plus size={14} />
              <span>Add Card</span>
            </button>

            {/* Manage Cards & Priority Button */}
            <button
              type="button"
              onClick={() => {
                setInitialShowAdd(false);
                setIsCardModalOpen(true);
              }}
              title="Click to change card names, icons, and arrange priority"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold bg-[#0b4da2] hover:bg-blue-700 text-white shadow-xs hover:shadow transition-all cursor-pointer border-0"
            >
              <SlidersHorizontal size={14} />
              <span>Manage Cards &amp; Priority</span>
            </button>

            {/* Worker / Customer Panel Link Button */}
            <Link
              href={`${baseRoute}/panel`}
              title="Go to Worker / Customer Financial Panel"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold bg-[#0b4da2] hover:bg-blue-700 text-white shadow-xs hover:shadow transition-all cursor-pointer border-0 no-underline whitespace-nowrap"
            >
              <Wallet size={14} />
              <span>Worker / Customer Panel</span>
            </Link>
          </div>
        </div>

        {/* 12 Stat & Wallet Cards Grid (Matching Dashboard Card Design) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {activeStatCards.map((card, index) => {
            const metrics = getCardMetrics(card);
            const isCurrency = metrics.value.startsWith('RM');
            const animClass = getServiceCardAnimationClass(cardAnimation, index);
            const animStyle = getServiceCardAnimationStyle(index, cardDuration, cardStagger);
            const cardKey = `${card.id || card.metric_type}-${cardAnimation}-${animTriggerKey}-${isGlass ? 'glass' : 'default'}`;

            const cardClasses = `admin-stat-card ${animClass} ${
              isGlass
                ? `dashboard-card-glass rounded-2xl p-5 transition-all flex flex-col justify-between group min-h-[105px] no-underline ${
                    metrics.isLink && metrics.link ? 'cursor-pointer active:scale-[0.99]' : ''
                  }`
                : `bg-white border rounded-xl p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group min-h-[105px] no-underline border-slate-200 hover:border-blue-400 ${
                    metrics.isLink && metrics.link
                      ? 'cursor-pointer hover:border-[#0b4da2] hover:ring-2 hover:ring-blue-100 active:scale-[0.99]'
                      : ''
                  }`
            }`;

            const cardContent = (
              <>
                {/* Top Row: Title on Left, Icon on Right */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span
                    className="text-xs text-slate-600 font-bold tracking-wide group-hover:text-[#0b4da2] transition-colors leading-tight line-clamp-2"
                    title={card.title}
                  >
                    {card.title}
                  </span>
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-colors p-0.5 ${metrics.theme.bg} ${metrics.theme.text}`}
                  >
                    <DynamicCardIcon icon={card.icon} size={16} />
                  </div>
                </div>

                {/* Middle Row: Full Width Value */}
                <div
                  className={`font-bold tracking-tight font-mono my-0.5 ${
                    isCurrency ? 'text-[20px] sm:text-[22px] xl:text-[24px]' : 'text-2xl'
                  } ${metrics.theme.valColor}`}
                >
                  {metrics.value}
                </div>
              </>
            );

            if (metrics.isLink && metrics.link) {
              return (
                <Link key={cardKey} href={metrics.link} style={animStyle} className={cardClasses}>
                  {cardContent}
                </Link>
              );
            }

            return (
              <div key={cardKey} style={animStyle} className={cardClasses}>
                {cardContent}
              </div>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. INTERACTIVE DATE-WISE ORDER & METRIC STATISTICS GRAPH */}
      {/* ========================================================================= */}
      <CustomerOrderStatisticsChart
        customers={customersFilteredForCards}
        companies={companies}
        statCards={activeStatCards}
        initialCardKey="total_customers"
      />

      {/* ========================================================================= */}
      {/* 4. FILTER AND SEARCH BAR FOR CUSTOMER REGISTRY TABLE */}
      {/* ========================================================================= */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3.5">
        {/* Search Bar & Dropdown Filters (with Status Dropdown) */}
        <div className="flex flex-col 2xl:flex-row items-stretch 2xl:items-center justify-between gap-3">
          {/* Search Bar */}
          <div className="relative w-full 2xl:w-72 shrink-0">
            <Search
              size={15}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search worker by name, passport, NID, phone..."
              className="w-full bg-white border border-slate-300 rounded-lg pl-9 pr-8 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-400 transition-all shadow-xs"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-0.5 bg-transparent border-0 cursor-pointer"
              >
                <X size={13} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0">
            {/* Status Dropdown Filter */}
            <div className="relative shrink-0">
              <select
                value={tableStatusFilter}
                onChange={(e) => setTableStatusFilter(e.target.value as any)}
                className="appearance-none bg-white hover:bg-slate-50 border border-slate-300 rounded-lg pl-3 pr-7 py-2 text-xs text-slate-800 font-bold focus:outline-none focus:border-[#0b4da2] shadow-2xs cursor-pointer w-36 sm:w-40 truncate"
                title="Filter table by status"
              >
                <option value="all">All Customer ({statusCounts.all})</option>
                <option value="active">Active ({statusCounts.active})</option>
                <option value="inactive">Inactive ({statusCounts.inactive})</option>
                <option value="runaway">Runaway ({statusCounts.runaway})</option>
                <option value="blacklist">Black List ({statusCounts.blacklist})</option>
                <option value="absent">Absent ({statusCounts.absent})</option>
                <option value="pending">Pending ({statusCounts.pending})</option>
              </select>
              <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>

            {/* Sector Dropdown Filter */}
            <div className="relative shrink-0">
              <select
                value={tableSectorFilter}
                onChange={(e) => setTableSectorFilter(e.target.value)}
                className="appearance-none bg-white hover:bg-slate-50 border border-slate-300 rounded-lg pl-3 pr-7 py-2 text-xs text-slate-700 font-medium focus:outline-none focus:border-blue-500 shadow-2xs cursor-pointer w-32 sm:w-36 truncate"
                title="Filter table by sector"
              >
                <option value="ALL">All Sectors</option>
                {sectors.map((s) => (
                  <option key={s.id} value={s.name}>
                    {s.name}
                  </option>
                ))}
              </select>
              <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>

            {/* Employer Company Dropdown Filter */}
            <div className="relative shrink-0">
              <select
                value={tableCompanyFilter}
                onChange={(e) => setTableCompanyFilter(e.target.value)}
                className="appearance-none bg-white hover:bg-slate-50 border border-slate-300 rounded-lg pl-3 pr-7 py-2 text-xs text-slate-700 font-medium focus:outline-none focus:border-blue-500 shadow-2xs cursor-pointer w-36 sm:w-44 truncate"
                title="Filter table by company"
              >
                <option value="ALL">All Companies</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>

            {/* Reset Filters button */}
            {(tableStatusFilter !== 'all' || tableSectorFilter !== 'ALL' || tableCompanyFilter !== 'ALL' || searchTerm) && (
              <button
                type="button"
                onClick={() => {
                  setTableStatusFilter('all');
                  setTableSectorFilter('ALL');
                  setTableCompanyFilter('ALL');
                  setSearchTerm('');
                }}
                className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-200 px-2.5 py-2 rounded-lg transition-colors cursor-pointer shrink-0"
                title="Reset all filters"
              >
                <RotateCcw size={12} />
                <span>Reset</span>
              </button>
            )}

            {/* Export Dropdown Button (Excel, CSV, PDF) */}
            <div className="relative inline-block text-left shrink-0" ref={exportDropdownRef}>
              <button
                type="button"
                onClick={() => setIsExportOpen(!isExportOpen)}
                className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs transition-colors cursor-pointer border border-emerald-700 shrink-0 whitespace-nowrap"
                title="Export Foreign Customer List"
              >
                <Download size={13} className="shrink-0" />
                <span>Export</span>
                <ChevronDown
                  size={13}
                  className={`transition-transform duration-200 ${isExportOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {isExportOpen && (
                <div className="absolute right-0 mt-1.5 w-52 rounded-xl bg-white shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-3.5 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                    Export ({filteredCustomers.length} records)
                  </div>
                  <button
                    type="button"
                    onClick={handleExportExcel}
                    className="w-full text-left px-3.5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 flex items-center gap-2.5 transition-colors cursor-pointer border-0 bg-transparent"
                  >
                    <FileSpreadsheet size={15} className="text-emerald-600 shrink-0" />
                    <span>Export Excel (.xlsx)</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleExportCSV}
                    className="w-full text-left px-3.5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-700 flex items-center gap-2.5 transition-colors cursor-pointer border-0 bg-transparent"
                  >
                    <FileText size={15} className="text-blue-600 shrink-0" />
                    <span>Export CSV (.csv)</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleExportPDF}
                    className="w-full text-left px-3.5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-rose-50 hover:text-rose-700 flex items-center gap-2.5 transition-colors cursor-pointer border-0 bg-transparent"
                  >
                    <Printer size={15} className="text-rose-600 shrink-0" />
                    <span>Export PDF (.pdf)</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Customers Table */}
        <div className="overflow-x-auto pt-1">
          <table className="w-full text-left text-xs text-slate-700 border-collapse">
            <thead>
              <tr className="bg-slate-50/80 text-slate-600 font-bold text-[11px] uppercase tracking-wider border-b border-slate-200">
                <th className="py-3.5 px-4 whitespace-nowrap min-w-[200px]">Worker Name</th>
                <th className="py-3.5 px-4 whitespace-nowrap min-w-[130px]">Passport</th>
                <th className="py-3.5 px-4 whitespace-nowrap min-w-[130px]">NID No</th>
                <th className="py-3.5 px-4 whitespace-nowrap min-w-[160px]">Employer Company</th>
                <th className="py-3.5 px-4 whitespace-nowrap min-w-[140px]">Sector</th>
                <th className="py-3.5 px-4 whitespace-nowrap min-w-[110px]">Salary</th>
                <th className="py-3.5 px-4 whitespace-nowrap min-w-[130px]">Contact</th>
                <th className="py-3.5 px-4 whitespace-nowrap text-center min-w-[100px]">Dossiers</th>
                <th className="py-3.5 px-4 whitespace-nowrap text-center min-w-[110px]">Status</th>
                <th className="py-3.5 px-4 whitespace-nowrap text-right min-w-[140px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-500">
                    <Users size={36} className="mx-auto text-slate-300 mb-2" />
                    <p className="text-sm font-semibold text-slate-700">No customer records found</p>
                    <p className="text-xs text-slate-400 mt-1 mb-4">
                      {searchTerm
                        ? 'Try clearing the search query or changing filters'
                        : 'No foreign workers registered in this category'}
                    </p>
                    <Link
                      href={`${baseRoute}/create`}
                      className="inline-flex items-center gap-1.5 bg-[#0b4da2] text-white px-3.5 py-2 rounded-xl text-xs font-semibold cursor-pointer border-0 shadow-xs no-underline"
                    >
                      <Plus size={14} />
                      <span>Register Customer</span>
                    </Link>
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((cust) => {
                  const compMatch = companies.find(
                    (c) => c.id.toLowerCase() === (cust.company_id || '').toLowerCase()
                  );
                  const docCount = Array.isArray(cust.documents) ? cust.documents.length : 0;

                  return (
                    <tr key={cust.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Worker Name */}
                      <td className="py-4 px-4 align-middle whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          {cust.profile_pic || cust.profile_image ? (
                            <img
                              src={getFileUrl(cust.profile_pic || cust.profile_image)}
                              alt={cust.full_name}
                              className="w-9 h-9 rounded-full object-cover shadow-xs shrink-0 border border-slate-200"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 text-slate-600 flex items-center justify-center font-bold text-xs shrink-0">
                              {cust.full_name
                                .split(' ')
                                .map((n) => n[0])
                                .slice(0, 2)
                                .join('')
                                .toUpperCase() || 'CW'}
                            </div>
                          )}
                          <div>
                            <div className="font-bold text-slate-900 text-xs">
                              {cust.full_name}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              {cust.country || 'Malaysia / Expat'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Passport */}
                      <td className="py-4 px-4 align-middle whitespace-nowrap font-mono text-xs">
                        <span className="font-semibold text-slate-800">
                          {cust.passport_no || '—'}
                        </span>
                      </td>

                      {/* NID No */}
                      <td className="py-4 px-4 align-middle whitespace-nowrap font-mono text-xs">
                        <span className="font-semibold text-slate-800">
                          {cust.nid_no || '—'}
                        </span>
                      </td>

                      {/* Employer Company */}
                      <td className="py-4 px-4 align-middle whitespace-nowrap">
                        <span className="font-semibold text-slate-800">
                          {compMatch ? compMatch.name : cust.company_id || cust.other_company_name || '—'}
                        </span>
                      </td>

                      {/* Working Sector */}
                      <td className="py-4 px-4 align-middle whitespace-nowrap">
                        <span className="font-medium text-slate-800">
                          {cust.working_sector || 'General'}
                        </span>
                      </td>

                      {/* Basic Salary */}
                      <td className="py-4 px-4 align-middle whitespace-nowrap font-mono text-xs">
                        <span className="text-slate-800 font-semibold">
                          {cust.basic_salary || '—'}
                        </span>
                      </td>

                      {/* Contact */}
                      <td className="py-4 px-4 align-middle whitespace-nowrap font-mono text-xs">
                        <span className="text-slate-800">
                          {cust.phone || cust.worker_phone || '—'}
                        </span>
                      </td>

                      {/* Documents */}
                      <td className="py-4 px-4 align-middle text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            docCount > 0
                              ? 'bg-amber-50 text-amber-800 border border-amber-200'
                              : 'bg-slate-100 text-slate-400'
                          }`}
                        >
                          <FileText size={11} />
                          <span>{docCount} files</span>
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4 align-middle text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            cust.status === 'active'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : cust.status === 'pending'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : cust.status === 'absent'
                              ? 'bg-purple-50 text-purple-700 border border-purple-200'
                              : cust.status === 'runaway'
                              ? 'bg-orange-50 text-orange-700 border border-orange-200'
                              : cust.status === 'blacklist'
                              ? 'bg-rose-950 text-rose-100 border border-rose-900'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              cust.status === 'active'
                                ? 'bg-emerald-500'
                                : cust.status === 'pending'
                                ? 'bg-amber-500'
                                : cust.status === 'absent'
                                ? 'bg-purple-500'
                                : cust.status === 'runaway'
                                ? 'bg-orange-500'
                                : cust.status === 'blacklist'
                                ? 'bg-rose-400'
                                : 'bg-rose-500'
                            }`}
                          />
                          <span className="capitalize">
                            {cust.status === 'blacklist' ? 'Black List' : cust.status || 'Active'}
                          </span>
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-4 align-middle text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={`${baseRoute}/view?id=${cust.id}`}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-[#0b4da2] hover:bg-blue-50 transition-colors"
                            title="View customer dossier"
                          >
                            <Eye size={15} />
                          </Link>

                          <Link
                            href={`${baseRoute}/statement?id=${cust.id}`}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-purple-600 hover:bg-purple-50 transition-colors"
                            title="View Financial Statement & Wallet"
                          >
                            <Wallet size={15} />
                          </Link>

                          <Link
                            href={`${baseRoute}/create?id=${cust.id}`}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                            title="Edit customer details"
                          >
                            <Edit2 size={15} />
                          </Link>

                          <button
                            type="button"
                            onClick={() => setDeleteConfirmId(cust.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer border-0 bg-transparent"
                            title="Delete customer record"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-sm w-full p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <Trash2 size={24} />
            </div>
            <h3 className="text-sm font-bold text-slate-900 mb-1">Delete Customer Record</h3>
            <p className="text-xs text-slate-500 mb-5">
              Are you sure you want to delete this customer record? All target records and uploaded documents will be permanently removed.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors border-0 bg-transparent cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDelete(deleteConfirmId)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition-colors border-0 cursor-pointer shadow-xs"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manage Cards & Priority Modal */}
      <CardPriorityModal
        isOpen={isCardModalOpen}
        onClose={() => setIsCardModalOpen(false)}
        cards={cards}
        onSave={handleSaveCards}
        onReset={handleResetCards}
        pageTitle="Customer Dashboard Cards"
        availableMetrics={CUSTOMER_CARD_METRIC_OPTIONS}
        initialShowAdd={initialShowAdd}
        allowAdd={true}
      />

      {/* ========================================================================= */}
      {/* 5. ISSUE CUSTOMER REFUND MODAL */}
      {/* ========================================================================= */}
      {isRefundModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-[#0b4da2] text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-white shrink-0">
                  <RotateCcw size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white m-0">Issue Customer Refund</h3>
                  <p className="text-xs text-blue-100 m-0">
                    Process official deposit refund &amp; generate refundable voucher
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsRefundModalOpen(false)}
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer border-0"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleSubmitRefund} className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Customer Select2 Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                  Select Foreign Worker / Customer <span className="text-rose-500">*</span>
                </label>
                <Select2Search
                  options={customerRefundSelectOptions}
                  value={selectedRefundCustomerId}
                  onChange={(val) => setSelectedRefundCustomerId(val)}
                  placeholder="Search and select worker by name, passport, or company..."
                  searchPlaceholder="Type name, passport number, NID, employer..."
                  icon={<User size={15} className="text-[#0b4da2]" />}
                />
              </div>

              {/* Customer Financial Balance Snapshot */}
              {selectedRefundCustomer && selectedRefundCustomerBalance && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">Customer Financial Balance:</span>
                    <span className="text-[11px] font-semibold text-slate-500">
                      Passport: {selectedRefundCustomer.passport_no || '—'}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-white border border-slate-200 rounded-lg p-2.5 text-center">
                      <div className="text-[10px] font-bold text-slate-500 uppercase">Total Deposited</div>
                      <div className="text-xs font-bold text-emerald-600 font-mono mt-0.5">
                        RM {selectedRefundCustomerBalance.total_deposited.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-lg p-2.5 text-center">
                      <div className="text-[10px] font-bold text-slate-500 uppercase">Total Refunded</div>
                      <div className="text-xs font-bold text-rose-600 font-mono mt-0.5">
                        RM {(selectedRefundCustomerBalance.total_refunded || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>
                    <div className="bg-white border border-emerald-300 rounded-lg p-2.5 text-center bg-emerald-50/50">
                      <div className="text-[10px] font-bold text-emerald-800 uppercase">Net Available</div>
                      <div className="text-xs font-bold text-emerald-700 font-mono mt-0.5">
                        RM {(selectedRefundCustomerBalance.net_balance !== undefined ? selectedRefundCustomerBalance.net_balance : selectedRefundCustomerBalance.total_deposited).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>
                  {/* Quick Fill Button */}
                  {(selectedRefundCustomerBalance.net_balance ?? selectedRefundCustomerBalance.total_deposited) > 0 && (
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          const avail = selectedRefundCustomerBalance.net_balance ?? selectedRefundCustomerBalance.total_deposited;
                          if (avail > 0) setRefundAmount(avail);
                        }}
                        className="text-[11px] font-bold text-[#0b4da2] hover:text-blue-800 hover:underline cursor-pointer bg-transparent border-0 p-0"
                      >
                        + Use Full Available Balance (RM {(selectedRefundCustomerBalance.net_balance ?? selectedRefundCustomerBalance.total_deposited).toLocaleString()})
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Amount and Date Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                    Refund Amount (RM) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                      RM
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      value={refundAmount}
                      onChange={(e) => setRefundAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-white border border-slate-300 rounded-lg pl-10 pr-3 py-2 text-xs font-bold font-mono text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                    Refund Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={refundDate}
                    onChange={(e) => setRefundDate(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-400"
                  />
                </div>
              </div>

              {/* Refund Category / Purpose */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                  Refund Category / Reason <span className="text-rose-500">*</span>
                </label>
                <select
                  value={refundPurpose}
                  onChange={(e) => setRefundPurpose(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-400 cursor-pointer"
                >
                  {REFUND_PURPOSES.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                  <option value="Other">Other (Custom Purpose)</option>
                </select>
                {refundPurpose === 'Other' && (
                  <input
                    type="text"
                    required
                    value={refundCustomPurpose}
                    onChange={(e) => setRefundCustomPurpose(e.target.value)}
                    placeholder="Enter custom refund reason..."
                    className="mt-2 w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                  />
                )}
              </div>

              {/* Payment Method & Bank Info */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                    Payment Method
                  </label>
                  <select
                    value={refundPaymentMethod}
                    onChange={(e) => setRefundPaymentMethod(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Cash">Cash Counter</option>
                    <option value="CDM">Cash Deposit Machine (CDM)</option>
                    <option value="Cheque">Bank Cheque</option>
                    <option value="Online FPX">Online FPX / DuitNow</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                    Bank Name
                  </label>
                  <select
                    value={refundBankName}
                    onChange={(e) => setRefundBankName(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    {MALAYSIAN_BANKS.map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                    Bank Account No / Ref
                  </label>
                  <input
                    type="text"
                    value={refundBankAccountNo}
                    onChange={(e) => setRefundBankAccountNo(e.target.value)}
                    placeholder="Account number..."
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono text-slate-800 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Voucher / Slip Attachment */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                    Voucher Reference No
                  </label>
                  <input
                    type="text"
                    value={refundReceiptNo}
                    onChange={(e) => setRefundReceiptNo(e.target.value)}
                    placeholder="REF-XXXXXX"
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                    Attach Refund Slip / Receipt
                  </label>
                  <div className="relative border border-dashed border-slate-300 rounded-lg p-2.5 flex items-center justify-between gap-2 bg-slate-50/60 hover:bg-slate-50 transition-colors">
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={handleRefundSlipUpload}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      title="Upload refund slip receipt"
                    />
                    <div className="flex items-center gap-2 min-w-0">
                      <FileCheck2 size={16} className="text-[#0b4da2] shrink-0" />
                      <span className="text-xs text-slate-600 truncate">
                        {refundSlipFilename || 'Click or drag slip / receipt...'}
                      </span>
                    </div>
                    {refundSlipUrl && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setRefundSlipUrl(null);
                          setRefundSlipFilename('');
                        }}
                        className="text-xs text-rose-600 hover:text-rose-800 font-bold p-1 z-10 cursor-pointer bg-transparent border-0"
                        title="Remove attached file"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Remarks */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                  Remarks / Administrative Notes
                </label>
                <textarea
                  rows={2}
                  value={refundRemarks}
                  onChange={(e) => setRefundRemarks(e.target.value)}
                  placeholder="Add approval reference, authorization notes, or deduction details..."
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>

              {/* Submit Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsRefundModalOpen(false)}
                  disabled={refundSubmitting}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer border-0 bg-transparent"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={refundSubmitting}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold text-white bg-[#0b4da2] hover:bg-blue-700 transition-colors shadow-xs cursor-pointer border-0 disabled:opacity-50"
                >
                  {refundSubmitting ? (
                    <>
                      <RotateCcw size={14} className="animate-spin" />
                      <span>Processing Refund...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={14} />
                      <span>Confirm &amp; Issue Refund</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. PRINT OFFICIAL REFUND VOUCHER DIALOG */}
      {/* ========================================================================= */}
      {voucherToPrint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 text-center animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 size={24} />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">Refund Processed Successfully</h3>
            <p className="text-xs text-slate-500 mb-4">
              Voucher <strong>{voucherToPrint.receipt_no}</strong> for <strong>RM {(Number(voucherToPrint.refund_amount) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong> has been issued for <strong>{voucherToPrint.customer_name}</strong>.
            </p>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 mb-5 text-left text-xs space-y-1.5">
              <div className="flex justify-between text-slate-600">
                <span>Passport No:</span>
                <span className="font-bold text-slate-800">{voucherToPrint.passport_no || '—'}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Purpose:</span>
                <span className="font-bold text-slate-800">{voucherToPrint.purpose}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Payment Mode:</span>
                <span className="font-bold text-slate-800">{voucherToPrint.payment_method}</span>
              </div>
            </div>

            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setVoucherToPrint(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer border-0 bg-transparent"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => handlePrintRefundVoucher(voucherToPrint)}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold text-white bg-[#0b4da2] hover:bg-blue-700 transition-colors shadow-xs cursor-pointer border-0"
              >
                <Printer size={14} />
                <span>Print Official Voucher</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
