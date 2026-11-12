'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  AlertCircle,
  ArrowLeft,
  Briefcase,
  Building2,
  Calendar,
  Car,
  Check,
  ChevronDown,
  ChevronRight,
  Coins,
  CreditCard,
  DollarSign,
  Download,
  Eye,
  FileCheck,
  FileSpreadsheet,
  FileText,
  FileUp,
  Globe2,
  Image as ImageIcon,
  Languages,
  Mail,
  MapPin,
  Phone,
  PhoneCall,
  Plus,
  RefreshCw,
  Save,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Trash2,
  UploadCloud,
  UserCheck,
  UserPlus,
  Crown,
  KeyRound,
  EyeOff,
  Lock,
  Edit2,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { SubscriptionPlan, fetchSubscriptionPlans } from '@/lib/companyTrialAndFinanceStorage';
import { Company, CompanyBankAccount, CompanyDirector, DirectorCar, DirectorDocument, DirectorExcelDocument, UploadedFileInfo, resolveFileUrl } from '@/lib/companies';
import {
  fileToBase64,
  getCompanyById,
  getStoredCompanies,
  saveStoredCompany,
  updateStoredCompany,
} from '@/lib/companyStorage';
import { WorkingSector, fetchWorkingSectors, createWorkingSector } from '@/lib/customerStorage';
import Select2Search from '@/components/Select2Search';
import { ALL_WORLD_LANGUAGES } from '@/lib/languages';
import { ALL_WORLD_CURRENCIES } from '@/lib/currencies';
import ExcelSheetEditorModal from '@/components/ExcelSheetEditorModal';
import WordDocumentEditorModal from '@/components/WordDocumentEditorModal';
import * as XLSX from 'xlsx';
import mammoth from 'mammoth';

const SECTOR_OPTIONS = [
  'Civil & Building Construction',
  'Agriculture & Plantation',
  'Manufacturing & Healthcare',
  'Hospitality & Services',
  'Agri-Commodity & Processing',
  'Engineering & Development',
  'Logistics & Supply Chain',
  'General Commercial & Services',
  'Information Technology & Telecom',
  'Finance & Corporate Services',
];

const CURRENCY_OPTIONS = [
  { code: 'MYR', name: 'Malaysian Ringgit (RM)', symbol: 'RM' },
  { code: 'USD', name: 'US Dollar ($)', symbol: '$' },
  { code: 'SGD', name: 'Singapore Dollar (S$)', symbol: 'S$' },
  { code: 'EUR', name: 'Euro (€)', symbol: '€' },
  { code: 'GBP', name: 'British Pound (£)', symbol: '£' },
  { code: 'BDT', name: 'Bangladeshi Taka (৳)', symbol: '৳' },
  { code: 'IDR', name: 'Indonesian Rupiah (Rp)', symbol: 'Rp' },
  { code: 'INR', name: 'Indian Rupee (₹)', symbol: '₹' },
];

const LANGUAGE_OPTIONS = [
  'English (Default)',
  'Bahasa Melayu (Malay)',
  'Chinese (Mandarin)',
  'Tamil',
  'Bengali',
  'Arabic',
];

const BANK_PRESETS = [
  'Maybank (Malayan Banking Berhad)',
  'CIMB Bank Berhad',
  'Public Bank Berhad',
  'RHB Bank Berhad',
  'Hong Leong Bank Berhad',
  'AmBank Group',
  'Standard Chartered Bank Malaysia',
  'HSBC Bank Malaysia',
  'United Overseas Bank (UOB)',
  'Other Corporate Bank',
];

function createEmptyCar(index = 1): DirectorCar {
  return {
    id: `car-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    plateNo: '',
    purchaseType: 'emi',
    depositAmount: '',
    emiPeriod: '',
    amount: '',
    totalPayment: '',
  };
}

function createEmptyDirector(index = 1): CompanyDirector {
  return {
    id: `dir-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    name: '',
    nidNo: '',
    passportNo: '',
    phone: '',
    email: '',
    socsoNo: '',
    epfNo: '',
    carPlateNo: '',
    carPlates: [''],
    carPurchaseType: 'emi',
    carDepositAmount: '',
    carEmiPeriod: '',
    carAmount: '',
    carTotalPayment: '',
    cars: [createEmptyCar(1)],
    basicSalary: '',
    otherDocuments: [],
    excelDocuments: [],
  };
}

export interface StagedMasterAdmin {
  id: string;
  name: string;
  email: string;
  username: string;
  password: string;
  showPassword?: boolean;
  subscription_package: string;
  status: 'active' | 'inactive';
}

export interface StagedEmployee {
  id: string;
  name: string;
  employee_code: string;
  email: string;
  password: string;
  showPassword?: boolean;
  role: string;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
  status: 'active' | 'inactive';
}

function generateSecurePassword(length = 10): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnopqrstuvwxyz';
  const numbers = '23456789';
  const symbols = '!@#$%&*';
  const all = upper + lower + numbers + symbols;
  let pass = '';
  pass += upper.charAt(Math.floor(Math.random() * upper.length));
  pass += lower.charAt(Math.floor(Math.random() * lower.length));
  pass += numbers.charAt(Math.floor(Math.random() * numbers.length));
  pass += symbols.charAt(Math.floor(Math.random() * symbols.length));
  for (let i = 4; i < length; i++) {
    pass += all.charAt(Math.floor(Math.random() * all.length));
  }
  return pass.split('').sort(() => 0.5 - Math.random()).join('');
}

function createEmptyMasterAdmin(index = 1, companyName = ''): StagedMasterAdmin {
  const cleanComp = companyName ? companyName.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8) : 'company';
  return {
    id: `ma-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    name: '',
    email: '',
    username: cleanComp ? `${cleanComp}_admin${index > 1 ? index : ''}` : `admin_${index}`,
    password: generateSecurePassword(10),
    showPassword: true,
    subscription_package: '1_month',
    status: 'active',
  };
}

function createEmptyEmployee(index = 1, companyName = ''): StagedEmployee {
  const prefix = companyName ? companyName.trim().slice(0, 3).toUpperCase().replace(/[^A-Z]/g, 'EMP') : 'EMP';
  const randNum = Math.floor(1000 + Math.random() * 9000);
  return {
    id: `emp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    name: '',
    employee_code: `${prefix.padEnd(3, 'E')}-${randNum}`,
    email: '',
    password: generateSecurePassword(10),
    showPassword: true,
    role: 'Employee',
    can_create: true,
    can_edit: true,
    can_delete: false,
    status: 'active',
  };
}

function CreateCompanyFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('id');

  // Company core states
  const [name, setName] = useState('');
  const [roc, setRoc] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [telephone, setTelephone] = useState('');
  const [email, setEmail] = useState('');
  const [logo, setLogo] = useState<string>('');
  const [currency, setCurrency] = useState('MYR');
  const [language, setLanguage] = useState('English');
  const [bankAccounts, setBankAccounts] = useState<CompanyBankAccount[]>([
    { id: `bank-${Date.now()}`, bankName: '', bankAccountName: '', bankAccountNo: '' }
  ]);
  const [sector, setSector] = useState('');
  const [companySectors, setCompanySectors] = useState<string[]>([]);
  const [sectorsList, setSectorsList] = useState<WorkingSector[]>([]);
  const [totalWorkers, setTotalWorkers] = useState<number>(0);
  const [description, setDescription] = useState('');
  const [tag, setTag] = useState('Verified JIM');

  // Staged Master Admins (multiple accounts to create)
  const [masterAdmins, setMasterAdmins] = useState<StagedMasterAdmin[]>([]);
  const [existingMasterAdmins, setExistingMasterAdmins] = useState<any[]>([]);

  // Staged Employees (multiple staff to create)
  const [employees, setEmployees] = useState<StagedEmployee[]>([]);
  const [existingEmployees, setExistingEmployees] = useState<any[]>([]);

  // Subscription Plans
  const [subscriptionPlans, setSubscriptionPlans] = useState<SubscriptionPlan[]>([]);

  // Directors state (multiple directors / CEOs)
  const [directors, setDirectors] = useState<CompanyDirector[]>([createEmptyDirector(1)]);

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<{ name: string; url: string; type?: string } | null>(null);

  // Excel Modal State
  const [isExcelEditorOpen, setIsExcelEditorOpen] = useState(false);
  const [editingExcelInfo, setEditingExcelInfo] = useState<{
    directorIndex: number;
    docIndex: number | null;
    doc: DirectorExcelDocument | null;
  } | null>(null);

  // Word Modal State
  const [isWordEditorOpen, setIsWordEditorOpen] = useState(false);
  const [editingWordInfo, setEditingWordInfo] = useState<{
    directorIndex: number;
    docIndex: number | null;
    doc: DirectorExcelDocument | null;
  } | null>(null);

  useEffect(() => {
    const loadSectors = () => {
      fetchWorkingSectors()
        .then((list) => {
          if (list && list.length > 0) {
            setSectorsList(list);
          }
        })
        .catch(() => {});
    };
    loadSectors();
    window.addEventListener('working_sectors_updated', loadSectors);
    return () => window.removeEventListener('working_sectors_updated', loadSectors);
  }, []);

  // Load existing data in Edit mode
  useEffect(() => {
    if (editId) {
      const comp = getCompanyById(editId);
      if (comp) {
        setName(comp.name);
        setRoc(comp.roc);
        setAddress(comp.address || '');
        setPhone(comp.phone || '');
        setTelephone(comp.telephone || '');
        setEmail(comp.email || '');
        setLogo(comp.logo || '');
        setCurrency(comp.currency || 'MYR');
        setLanguage(comp.language || 'English');
        if (comp.bankAccounts && comp.bankAccounts.length > 0) {
          setBankAccounts(
            comp.bankAccounts.map((b, bIdx) => ({
              id: b.id || `bank-${bIdx + 1}-${Date.now()}`,
              bankName: b.bankName || '',
              bankAccountName: b.bankAccountName || '',
              bankAccountNo: b.bankAccountNo || '',
            }))
          );
        } else if (comp.bankName || comp.bankAccountNo) {
          setBankAccounts([
            {
              id: `bank-1-${Date.now()}`,
              bankName: comp.bankName || '',
              bankAccountName: comp.bankAccountName || '',
              bankAccountNo: comp.bankAccountNo || '',
            },
          ]);
        }
        const secStr = comp.sector || '';
        const secArr = comp.sectors && Array.isArray(comp.sectors) && comp.sectors.length > 0
          ? comp.sectors
          : (secStr ? secStr.split(',').map((s) => s.trim()).filter(Boolean) : []);
        const primarySec = secArr[0] || secStr || '';
        setCompanySectors(secArr.length > 0 ? secArr : (primarySec ? [primarySec] : []));
        setSector(primarySec);
        setTotalWorkers(comp.totalWorkers || 0);
        setDescription(comp.description || '');
        setTag(comp.tag || 'Verified JIM');

        if (comp.directors && comp.directors.length > 0) {
          setDirectors(
            comp.directors.map((d) => {
              let parsedCars: DirectorCar[] = [];
              if (Array.isArray(d.cars) && d.cars.length > 0) {
                parsedCars = d.cars.map((c, cIdx) => ({
                  id: c.id || `car-${cIdx + 1}-${Date.now()}`,
                  plateNo: c.plateNo || '',
                  purchaseType: (c.purchaseType || 'emi') as 'cash' | 'emi',
                  depositAmount: c.depositAmount || '',
                  emiPeriod: c.emiPeriod || '',
                  amount: c.amount || '',
                  totalPayment: c.totalPayment || '',
                }));
              } else {
                const legacyPlates = Array.isArray(d.carPlates) && d.carPlates.length > 0
                  ? d.carPlates
                  : (d.carPlateNo ? d.carPlateNo.split(',').map((p) => p.trim()).filter(Boolean) : ['']);
                parsedCars = legacyPlates.map((plate, pIdx) => ({
                  id: `car-${pIdx + 1}-${Date.now()}`,
                  plateNo: plate || '',
                  purchaseType: (pIdx === 0 ? (d.carPurchaseType || 'emi') : 'emi') as 'cash' | 'emi',
                  depositAmount: pIdx === 0 ? (d.carDepositAmount || '') : '',
                  emiPeriod: pIdx === 0 ? (d.carEmiPeriod || '') : '',
                  amount: pIdx === 0 ? (d.carAmount || '') : '',
                  totalPayment: pIdx === 0 ? (d.carTotalPayment || '') : '',
                }));
              }
              if (parsedCars.length === 0) {
                parsedCars = [createEmptyCar(1)];
              }

              return {
                ...d,
                cars: parsedCars,
                carPurchaseType: parsedCars[0]?.purchaseType || 'emi',
                carDepositAmount: parsedCars[0]?.depositAmount || '',
                carEmiPeriod: parsedCars[0]?.emiPeriod || '',
                carAmount: parsedCars[0]?.amount || '',
                carTotalPayment: parsedCars[0]?.totalPayment || '',
                carPlates: parsedCars.map((c) => c.plateNo),
                carPlateNo: parsedCars.map((c) => c.plateNo).filter(Boolean).join(', '),
                excelDocuments: Array.isArray(d.excelDocuments) ? d.excelDocuments : [],
              };
            })
          );
        }
      }
    }
  }, [editId]);

  // Load subscription plans for Master Admin dropdown
  useEffect(() => {
    fetchSubscriptionPlans()
      .then((plans) => {
        if (plans && plans.length > 0) {
          setSubscriptionPlans(plans);
        }
      })
      .catch(() => {});
  }, []);

  // In edit mode, load existing master admins and employees assigned to this company
  useEffect(() => {
    if (editId) {
      const apiBase = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://127.0.0.1:8000/api';
      fetch(`${apiBase}/master-admins`, { cache: 'no-store' })
        .then((r) => (r.ok ? r.json() : []))
        .then((data) => {
          if (Array.isArray(data)) {
            const matched = data.filter((m: any) =>
              Array.isArray(m.assigned_companies) && m.assigned_companies.includes(editId)
            );
            setExistingMasterAdmins(matched);
          }
        })
        .catch(() => {});

      fetch(`${apiBase}/employees`, { cache: 'no-store' })
        .then((r) => (r.ok ? r.json() : []))
        .then((data) => {
          if (Array.isArray(data)) {
            const matched = data.filter((e: any) =>
              Array.isArray(e.assigned_companies) && e.assigned_companies.includes(editId)
            );
            setExistingEmployees(matched);
          }
        })
        .catch(() => {});
    }
  }, [editId]);

  // Master Admin Handlers
  const handleAddMasterAdmin = () => {
    setMasterAdmins((prev) => [...prev, createEmptyMasterAdmin(prev.length + 1, name)]);
  };

  const handleRemoveMasterAdmin = (index: number) => {
    setMasterAdmins((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateMasterAdmin = (index: number, field: keyof StagedMasterAdmin, value: any) => {
    setMasterAdmins((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleRegenerateMasterAdminPassword = (index: number) => {
    handleUpdateMasterAdmin(index, 'password', generateSecurePassword(10));
    handleUpdateMasterAdmin(index, 'showPassword', true);
  };

  // Staff Employee Handlers
  const handleAddEmployee = () => {
    setEmployees((prev) => [...prev, createEmptyEmployee(prev.length + 1, name)]);
  };

  const handleRemoveEmployee = (index: number) => {
    setEmployees((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateEmployee = (index: number, field: keyof StagedEmployee, value: any) => {
    setEmployees((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleRegenerateEmployeePassword = (index: number) => {
    handleUpdateEmployee(index, 'password', generateSecurePassword(10));
    handleUpdateEmployee(index, 'showPassword', true);
  };

  const handleSectorChange = (selectedSector: string) => {
    setSector(selectedSector);
    if (selectedSector) {
      setCompanySectors([selectedSector]);
    } else {
      setCompanySectors([]);
    }
  };

  // Handle Logo File Upload (Save to LocalStorage via Base64)
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('Logo file size should be less than 2MB for optimal storage.');
    }

    try {
      const converted = await fileToBase64(file);
      setLogo(converted.fileData);
    } catch (err) {
      console.error('Error reading logo file:', err);
    } finally {
      e.target.value = '';
    }
  };

  // Add a new Director / CEO
  const handleAddDirector = () => {
    setDirectors((prev) => [...prev, createEmptyDirector(prev.length + 1)]);
  };

  // Remove a Director / CEO
  const handleRemoveDirector = (index: number) => {
    if (directors.length <= 1) {
      alert('At least one Director/CEO is required for registration.');
      return;
    }
    setDirectors((prev) => prev.filter((_, i) => i !== index));
  };

  // Update a specific Director's field
  const handleUpdateDirector = (index: number, field: keyof CompanyDirector, value: any) => {
    setDirectors((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  // Upload file for a Director (NID or Passport)
  const handleDirectorFileUpload = async (
    directorIndex: number,
    type: 'nidFile' | 'passportFile',
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const converted = await fileToBase64(file);
      handleUpdateDirector(directorIndex, type, converted);
    } catch (err) {
      console.error(`Error uploading director ${type}:`, err);
    } finally {
      e.target.value = '';
    }
  };

  // Add an "Other Document" to a Director
  const handleAddOtherDocument = (directorIndex: number) => {
    setDirectors((prev) => {
      const copy = [...prev];
      const dir = copy[directorIndex];
      const newDoc: DirectorDocument = {
        id: `doc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        name: '',
        fileName: '',
        fileData: '',
        uploadedAt: new Date().toISOString(),
      };
      dir.otherDocuments = [...(dir.otherDocuments || []), newDoc];
      return copy;
    });
  };

  // Update Other Document Title / Name
  const handleUpdateOtherDocName = (directorIndex: number, docIndex: number, newName: string) => {
    setDirectors((prev) => {
      const copy = [...prev];
      const docs = [...(copy[directorIndex].otherDocuments || [])];
      docs[docIndex] = { ...docs[docIndex], name: newName };
      copy[directorIndex].otherDocuments = docs;
      return copy;
    });
  };

  // Upload file for Other Document
  const handleOtherDocFileUpload = async (
    directorIndex: number,
    docIndex: number,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const converted = await fileToBase64(file);
      setDirectors((prev) => {
        const copy = [...prev];
        const docs = [...(copy[directorIndex].otherDocuments || [])];
        docs[docIndex] = {
          ...docs[docIndex],
          fileName: converted.fileName,
          fileSize: converted.fileSize,
          fileType: converted.fileType,
          fileData: converted.fileData,
          name: docs[docIndex].name || converted.fileName,
        };
        copy[directorIndex].otherDocuments = docs;
        return copy;
      });
    } catch (err) {
      console.error('Error uploading other document:', err);
    } finally {
      e.target.value = '';
    }
  };

  // Remove Other Document
  const handleRemoveOtherDoc = (directorIndex: number, docIndex: number) => {
    setDirectors((prev) => {
      const copy = [...prev];
      copy[directorIndex].otherDocuments = copy[directorIndex].otherDocuments.filter((_, i) => i !== docIndex);
      return copy;
    });
  };

  // Car Handlers (Multiple Cars with Plate, Scheme, Amount, Total Payment)
  const handleAddCar = (directorIndex: number) => {
    setDirectors((prev) => {
      const copy = [...prev];
      const dir = copy[directorIndex];
      const currentCars = Array.isArray(dir.cars) ? [...dir.cars] : [];
      const updatedCars = [...currentCars, createEmptyCar(currentCars.length + 1)];
      copy[directorIndex] = {
        ...dir,
        cars: updatedCars,
        carPlates: updatedCars.map((c) => c.plateNo),
        carPlateNo: updatedCars.map((c) => c.plateNo).filter(Boolean).join(', '),
      };
      return copy;
    });
  };

  const handleUpdateCar = (
    directorIndex: number,
    carIndex: number,
    field: keyof DirectorCar,
    value: any
  ) => {
    setDirectors((prev) => {
      const copy = [...prev];
      const dir = copy[directorIndex];
      const currentCars = Array.isArray(dir.cars) ? [...dir.cars] : [createEmptyCar(1)];
      const updatedCar = { ...currentCars[carIndex], [field]: value };

      // Auto-compute total payment for EMI when deposit, period, or monthly amount changes
      if (updatedCar.purchaseType === 'emi') {
        if (field === 'depositAmount' || field === 'emiPeriod' || field === 'amount' || field === 'purchaseType') {
          const deposit = parseFloat(String(updatedCar.depositAmount || 0)) || 0;
          const monthly = parseFloat(String(updatedCar.amount || 0)) || 0;
          const months = parseFloat(String(updatedCar.emiPeriod || 0)) || 0;
          if (months > 0 || monthly > 0 || deposit > 0) {
            const computed = deposit + (monthly * months);
            updatedCar.totalPayment = computed > 0 ? String(computed) : '';
          }
        }
      }

      currentCars[carIndex] = updatedCar;

      copy[directorIndex] = {
        ...dir,
        cars: currentCars,
        carPurchaseType: currentCars[0]?.purchaseType || 'emi',
        carDepositAmount: currentCars[0]?.depositAmount || '',
        carEmiPeriod: currentCars[0]?.emiPeriod || '',
        carAmount: currentCars[0]?.amount || '',
        carTotalPayment: currentCars[0]?.totalPayment || '',
        carPlates: currentCars.map((c) => c.plateNo),
        carPlateNo: currentCars.map((c) => c.plateNo).filter(Boolean).join(', '),
      };
      return copy;
    });
  };

  const handleRemoveCar = (directorIndex: number, carIndex: number) => {
    setDirectors((prev) => {
      const copy = [...prev];
      const dir = copy[directorIndex];
      const currentCars = Array.isArray(dir.cars) ? [...dir.cars] : [createEmptyCar(1)];
      if (currentCars.length <= 1) {
        currentCars[0] = createEmptyCar(1);
      } else {
        currentCars.splice(carIndex, 1);
      }
      copy[directorIndex] = {
        ...dir,
        cars: currentCars,
        carPurchaseType: currentCars[0]?.purchaseType || 'emi',
        carDepositAmount: currentCars[0]?.depositAmount || '',
        carEmiPeriod: currentCars[0]?.emiPeriod || '',
        carAmount: currentCars[0]?.amount || '',
        carTotalPayment: currentCars[0]?.totalPayment || '',
        carPlates: currentCars.map((c) => c.plateNo),
        carPlateNo: currentCars.map((c) => c.plateNo).filter(Boolean).join(', '),
      };
      return copy;
    });
  };

  // Office Documents Handlers (Upload / Create / Edit for Excel & Word)
  const handleExcelFileUpload = async (directorIndex: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const fileName = file.name;
      const sizeKB = (file.size / 1024).toFixed(1);
      const lowerName = fileName.toLowerCase();
      const isDocx = lowerName.endsWith('.docx') || lowerName.endsWith('.doc');
      const isCsv = lowerName.endsWith('.csv');
      const docTitle = fileName.replace(/\.[^/.]+$/, '').trim() || (isDocx ? 'Word_Document' : 'Spreadsheet');

      if (isDocx) {
        // Microsoft Word document (.docx / .doc)
        let htmlContent = '';
        try {
          const arrayBuffer = await file.arrayBuffer();
          if (lowerName.endsWith('.docx')) {
            const res = await mammoth.convertToHtml({ arrayBuffer });
            htmlContent = res.value || '';
          }
        } catch (docxErr) {
          console.warn('Word docx parsing warning:', docxErr);
        }

        if (!htmlContent.trim()) {
          htmlContent = `
            <h1 style="color: #2b579a; font-size: 20pt; font-weight: bold; margin-bottom: 8pt;">
              ${docTitle}
            </h1>
            <p style="color: #555; font-size: 11pt; line-height: 1.6; margin-bottom: 12pt;">
              <strong>Document Reference:</strong> ${fileName}<br />
              <strong>File Format:</strong> Microsoft Word Document (.docx)
            </p>
            <hr style="border: 0; border-top: 1px solid #d4d4d4; margin: 16pt 0;" />
            <p style="font-size: 11pt; line-height: 1.8; color: #222;">
              This official document has been attached to the director profile. You can view, format, and edit this document directly using the built-in Microsoft Word editor.
            </p>
          `;
        }

        const converted = await fileToBase64(file);
        const newWordDoc: DirectorExcelDocument = {
          id: `word-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          name: docTitle,
          fileName,
          fileSize: `${sizeKB} KB`,
          fileType: file.type || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          fileData: converted.fileData,
          category: 'word',
          htmlContent,
          headers: [],
          rows: [],
          updatedAt: new Date().toISOString(),
        };

        setDirectors((prev) => {
          const copy = [...prev];
          const cur = copy[directorIndex].excelDocuments ? [...copy[directorIndex].excelDocuments!] : [];
          const existingIdx = cur.findIndex(
            (d) => d.fileName.toLowerCase() === fileName.toLowerCase() || d.name.toLowerCase() === docTitle.toLowerCase()
          );
          if (existingIdx >= 0) {
            cur[existingIdx] = { ...newWordDoc, id: cur[existingIdx].id };
          } else {
            cur.push(newWordDoc);
          }
          copy[directorIndex].excelDocuments = cur;
          return copy;
        });

        return;
      }

      // Handle Excel / CSV
      let headers: string[] = [];
      let rows: string[][] = [];

      if (isCsv) {
        // Read CSV
        const text = await file.text();
        const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
        const parsedRows = lines.map((line) => {
          const cells: string[] = [];
          let current = '';
          let inQuotes = false;
          for (let i = 0; i < line.length; i++) {
            const ch = line[i];
            if (ch === '"') {
              inQuotes = !inQuotes;
            } else if (ch === ',' && !inQuotes) {
              cells.push(current.trim());
              current = '';
            } else {
              current += ch;
            }
          }
          cells.push(current.trim());
          return cells;
        });

        if (parsedRows.length > 0) {
          headers = parsedRows[0].map((h, i) => (h ? h.trim() : `Col ${String.fromCharCode(65 + (i % 26))}`));
          rows = parsedRows.slice(1);
        }
      } else {
        // Read real Excel (.xlsx / .xls) with SheetJS
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'array' });
        const sheetName = workbook.SheetNames[0] || 'Sheet1';
        const worksheet = workbook.Sheets[sheetName];

        const rawData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

        if (rawData && rawData.length > 0) {
          // Find first non-empty row as header
          const firstRow = rawData[0];
          headers = firstRow.map((cell: any, i: number) => {
            const str = cell !== undefined && cell !== null ? String(cell).trim() : '';
            return str || `Col ${String.fromCharCode(65 + (i % 26))}`;
          });

          // Subsequent rows as data
          rows = rawData.slice(1).map((r: any[]) => {
            return headers.map((_, i) => (r[i] !== undefined && r[i] !== null ? String(r[i]).trim() : ''));
          });
        }
      }

      if (headers.length === 0) {
        headers = ['A', 'B', 'C', 'D'];
        rows = [['', '', '', '']];
      }

      const converted = await fileToBase64(file);

      const newDoc: DirectorExcelDocument = {
        id: `excel-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        name: docTitle,
        fileName,
        fileSize: `${sizeKB} KB`,
        fileType: file.type || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        fileData: converted.fileData,
        category: 'excel',
        headers,
        rows: rows.length > 0 ? rows : [['', '', '', '']],
        updatedAt: new Date().toISOString(),
      };

      setDirectors((prev) => {
        const copy = [...prev];
        const cur = copy[directorIndex].excelDocuments ? [...copy[directorIndex].excelDocuments!] : [];
        // Prevent duplicate file: if same fileName or title already exists, update it
        const existingIdx = cur.findIndex(
          (d) => d.fileName.toLowerCase() === fileName.toLowerCase() || d.name.toLowerCase() === docTitle.toLowerCase()
        );
        if (existingIdx >= 0) {
          cur[existingIdx] = { ...newDoc, id: cur[existingIdx].id };
        } else {
          cur.push(newDoc);
        }
        copy[directorIndex].excelDocuments = cur;
        return copy;
      });
    } catch (err) {
      console.error('Error reading document file:', err);
      alert('Could not parse document. Please ensure the file is a valid .xlsx, .csv, or .docx file.');
    } finally {
      e.target.value = '';
    }
  };

  const handleOpenCreateExcel = (directorIndex: number) => {
    setEditingExcelInfo({
      directorIndex,
      docIndex: null,
      doc: null,
    });
    setIsExcelEditorOpen(true);
  };

  const handleOpenEditExcel = (directorIndex: number, docIndex: number) => {
    const dir = directors[directorIndex];
    const doc = dir.excelDocuments ? dir.excelDocuments[docIndex] : null;
    if (!doc) return;
    setEditingExcelInfo({
      directorIndex,
      docIndex,
      doc,
    });
    setIsExcelEditorOpen(true);
  };

  const handleSaveExcelDoc = (doc: DirectorExcelDocument) => {
    if (!editingExcelInfo) return;
    const { directorIndex, docIndex } = editingExcelInfo;

    setDirectors((prev) => {
      const copy = [...prev];
      const cur = copy[directorIndex].excelDocuments ? [...copy[directorIndex].excelDocuments!] : [];
      if (docIndex !== null && docIndex >= 0 && docIndex < cur.length) {
        cur[docIndex] = doc;
      } else {
        // Prevent accidental duplicate file: check by id or fileName
        const existingIdx = cur.findIndex(
          (d) => d.id === doc.id || d.fileName.toLowerCase() === doc.fileName.toLowerCase()
        );
        if (existingIdx >= 0) {
          cur[existingIdx] = doc;
        } else {
          cur.push(doc);
        }
      }
      copy[directorIndex].excelDocuments = cur;
      return copy;
    });

    setIsExcelEditorOpen(false);
    setEditingExcelInfo(null);
  };

  const handleOpenCreateWord = (directorIndex: number) => {
    setEditingWordInfo({
      directorIndex,
      docIndex: null,
      doc: null,
    });
    setIsWordEditorOpen(true);
  };

  const handleOpenEditWord = (directorIndex: number, docIndex: number) => {
    const dir = directors[directorIndex];
    const doc = dir.excelDocuments ? dir.excelDocuments[docIndex] : null;
    if (!doc) return;
    setEditingWordInfo({
      directorIndex,
      docIndex,
      doc,
    });
    setIsWordEditorOpen(true);
  };

  const handleSaveWordDoc = (doc: DirectorExcelDocument) => {
    if (!editingWordInfo) return;
    const { directorIndex, docIndex } = editingWordInfo;

    setDirectors((prev) => {
      const copy = [...prev];
      const cur = copy[directorIndex].excelDocuments ? [...copy[directorIndex].excelDocuments!] : [];
      if (docIndex !== null && docIndex >= 0 && docIndex < cur.length) {
        cur[docIndex] = doc;
      } else {
        const existingIdx = cur.findIndex(
          (d) => d.id === doc.id || d.fileName.toLowerCase() === doc.fileName.toLowerCase()
        );
        if (existingIdx >= 0) {
          cur[existingIdx] = doc;
        } else {
          cur.push(doc);
        }
      }
      copy[directorIndex].excelDocuments = cur;
      return copy;
    });

    setIsWordEditorOpen(false);
    setEditingWordInfo(null);
  };

  const handleDeleteExcelDoc = (directorIndex: number, docIndex: number) => {
    setDirectors((prev) => {
      const copy = [...prev];
      if (!copy[directorIndex].excelDocuments) return copy;
      copy[directorIndex].excelDocuments = copy[directorIndex].excelDocuments!.filter((_, i) => i !== docIndex);
      return copy;
    });
  };

  // Multiple Bank Accounts Handlers
  const handleAddBankAccount = () => {
    setBankAccounts((prev) => [
      ...prev,
      {
        id: `bank-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        bankName: '',
        bankAccountName: '',
        bankAccountNo: '',
      },
    ]);
  };

  const handleRemoveBankAccount = (index: number) => {
    setBankAccounts((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleUpdateBankAccount = (
    index: number,
    field: keyof CompanyBankAccount,
    value: string
  ) => {
    setBankAccounts((prev) => {
      const copy = [...prev];
      const val = field === 'bankAccountNo' ? value.replace(/\D/g, '') : value;
      copy[index] = { ...copy[index], [field]: val };
      return copy;
    });
  };

  // Submit Handler: Saves to LocalStorage & navigates to list page
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!name.trim()) {
      setErrorMessage('Please enter the Company Name.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (!roc.trim()) {
      setErrorMessage('Please enter the Registration Number (ROC).');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // Validate staged Master Admins
    for (let i = 0; i < masterAdmins.length; i++) {
      const ma = masterAdmins[i];
      if (!ma.name.trim()) {
        setErrorMessage(`Please enter Full Name for Master Admin #${i + 1}.`);
        window.scrollTo({ top: 300, behavior: 'smooth' });
        return;
      }
      if (!ma.username.trim()) {
        setErrorMessage(`Please enter Username for Master Admin #${i + 1}.`);
        window.scrollTo({ top: 300, behavior: 'smooth' });
        return;
      }
      if (!ma.email.trim() || !ma.email.includes('@')) {
        setErrorMessage(`Please enter a valid Email Address for Master Admin #${i + 1}.`);
        window.scrollTo({ top: 300, behavior: 'smooth' });
        return;
      }
      if (!ma.password.trim() || ma.password.trim().length < 4) {
        setErrorMessage(`Password must be at least 4 characters for Master Admin #${i + 1}.`);
        window.scrollTo({ top: 300, behavior: 'smooth' });
        return;
      }
    }

    // Validate staged Employees
    for (let i = 0; i < employees.length; i++) {
      const emp = employees[i];
      if (!emp.name.trim()) {
        setErrorMessage(`Please enter Full Name for Staff Employee #${i + 1}.`);
        window.scrollTo({ top: 500, behavior: 'smooth' });
        return;
      }
      if (!emp.employee_code.trim()) {
        setErrorMessage(`Please enter Employee Code for Staff Employee #${i + 1}.`);
        window.scrollTo({ top: 500, behavior: 'smooth' });
        return;
      }
      if (!emp.email.trim() || !emp.email.includes('@')) {
        setErrorMessage(`Please enter a valid Email Address for Staff Employee #${i + 1}.`);
        window.scrollTo({ top: 500, behavior: 'smooth' });
        return;
      }
      if (!emp.password.trim() || emp.password.trim().length < 4) {
        setErrorMessage(`Password must be at least 4 characters for Staff Employee #${i + 1}.`);
        window.scrollTo({ top: 500, behavior: 'smooth' });
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const sanitizedId = editId
        ? editId
        : name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');

      const companyData: Company = {
        id: sanitizedId,
        name: name.trim().toUpperCase(),
        roc: roc.trim(),
        sector: companySectors.join(', ') || sector,
        sectors: companySectors.length > 0 ? companySectors : [sector],
        tag,
        totalWorkers: Number(totalWorkers) || 0,
        logo: logo || '',
        description: description.trim() || 'Verified registered employer organization within the Malaysian Immigration portal.',
        address: address.trim(),
        phone: phone.trim(),
        telephone: telephone.trim(),
        email: email.trim(),
        currency,
        language,
        bankName: bankAccounts[0]?.bankName || '',
        bankAccountName: (bankAccounts[0]?.bankAccountName || '').trim(),
        bankAccountNo: (bankAccounts[0]?.bankAccountNo || '').trim(),
        bankAccounts: bankAccounts.map((b) => ({
          id: b.id,
          bankName: b.bankName || '',
          bankAccountName: (b.bankAccountName || '').trim(),
          bankAccountNo: (b.bankAccountNo || '').trim(),
        })),
        directors: directors.map((dir) => {
          const cleanCars: DirectorCar[] = (dir.cars && dir.cars.length > 0 ? dir.cars : [createEmptyCar(1)]).map((c) => ({
            id: c.id,
            plateNo: (c.plateNo || '').trim(),
            purchaseType: (c.purchaseType || 'emi') as 'cash' | 'emi',
            depositAmount: c.depositAmount || '0',
            emiPeriod: c.emiPeriod || '0',
            amount: c.amount || '0',
            totalPayment: c.purchaseType === 'emi' ? (c.totalPayment || '0') : '0',
          }));
          const cleanPlates = cleanCars.map((c) => c.plateNo).filter(Boolean);

          return {
            ...dir,
            cars: cleanCars,
            name: dir.name.trim(),
            nidNo: dir.nidNo.trim(),
            passportNo: dir.passportNo.trim(),
            phone: dir.phone.trim(),
            email: dir.email.trim(),
            socsoNo: dir.socsoNo.trim(),
            epfNo: dir.epfNo.trim(),
            carPlateNo: cleanPlates.length > 0 ? cleanPlates.join(', ') : '',
            carPlates: cleanPlates.length > 0 ? cleanPlates : [''],
            carPurchaseType: cleanCars[0]?.purchaseType || 'emi',
            carDepositAmount: cleanCars[0]?.depositAmount || '0',
            carEmiPeriod: cleanCars[0]?.purchaseType === 'emi' ? (cleanCars[0]?.emiPeriod || '0') : '0',
            carAmount: cleanCars[0]?.amount || '0',
            carTotalPayment: cleanCars[0]?.purchaseType === 'emi' ? (cleanCars[0]?.totalPayment || '0') : '0',
            basicSalary: dir.basicSalary || '0',
            otherDocuments: dir.otherDocuments || [],
            excelDocuments: dir.excelDocuments || [],
          };
        }),
      };

      if (editId) {
        await updateStoredCompany(companyData);
      } else {
        await saveStoredCompany(companyData);
      }

      // Persist staged Master Admins to backend
      const apiBase = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://127.0.0.1:8000/api';
      const accountErrors: string[] = [];

      for (let i = 0; i < masterAdmins.length; i++) {
        const ma = masterAdmins[i];
        try {
          const maRes = await fetch(`${apiBase}/master-admins`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Accept: 'application/json',
            },
            body: JSON.stringify({
              name: ma.name.trim(),
              username: ma.username.trim(),
              email: ma.email.trim().toLowerCase(),
              password: ma.password.trim(),
              assigned_companies: [sanitizedId],
              status: ma.status || 'active',
              subscription_package: ma.subscription_package || null,
            }),
          });
          if (!maRes.ok) {
            const errData = await maRes.json().catch(() => ({}));
            accountErrors.push(`Master Admin (${ma.username}): ${errData.message || 'Registration failed'}`);
          }
        } catch (err: any) {
          accountErrors.push(`Master Admin (${ma.username}): ${err.message || 'Network error'}`);
        }
      }

      // Persist staged Employees to backend
      for (let i = 0; i < employees.length; i++) {
        const emp = employees[i];
        try {
          const empRes = await fetch(`${apiBase}/employees`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Accept: 'application/json',
            },
            body: JSON.stringify({
              name: emp.name.trim(),
              employee_code: emp.employee_code.trim(),
              email: emp.email.trim().toLowerCase(),
              password: emp.password.trim(),
              role: 'Employee',
              assigned_companies: [sanitizedId],
              assigned_service_cards: ['*'],
              can_create: Boolean(emp.can_create),
              can_edit: Boolean(emp.can_edit),
              can_delete: Boolean(emp.can_delete),
              module_permissions: {
                companies: { view: true, statistics: true, cards: ['*'] },
                customers: {
                  view: true,
                  create: Boolean(emp.can_create),
                  edit: Boolean(emp.can_edit),
                  delete: Boolean(emp.can_delete),
                },
              },
              status: emp.status || 'active',
            }),
          });
          if (!empRes.ok) {
            const errData = await empRes.json().catch(() => ({}));
            accountErrors.push(`Employee (${emp.name}): ${errData.message || 'Registration failed'}`);
          }
        } catch (err: any) {
          accountErrors.push(`Employee (${emp.name}): ${err.message || 'Network error'}`);
        }
      }

      if (accountErrors.length > 0) {
        alert(`Company saved successfully, but some associated accounts had notices:\n\n${accountErrors.join('\n')}`);
      }

      // Successfully saved to localStorage & backend, navigate to registered company list page
      router.push('/companies/registered');
    } catch (err: any) {
      console.error('Error saving company:', err);
      setErrorMessage(err.message || 'Failed to save company to storage.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Link href="/" className="hover:text-[#0b4da2] transition-colors">
          Dashboard
        </Link>
        <ChevronRight size={13} className="text-slate-400" />
        <Link href="/companies" className="hover:text-[#0b4da2] transition-colors">
          Companies Management
        </Link>
        <ChevronRight size={13} className="text-slate-400" />
        <Link href="/companies/registered" className="hover:text-[#0b4da2] transition-colors">
          Registered Companies
        </Link>
        <ChevronRight size={13} className="text-slate-400" />
        <span className="font-semibold text-slate-800">
          {editId ? 'Edit Employer Organization' : 'Create Company'}
        </span>
      </div>

      {/* Top Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 border border-emerald-100 shrink-0">
              <Building2 size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight m-0">
                  {editId ? 'Edit Registered Company' : 'Register New Corporate Entity'}
                </h1>
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  Page View
                </span>
              </div>
              <p className="text-xs text-slate-500 m-0 mt-0.5">
                Complete company profile, bank account, and appointed Directors/CEOs with document uploads. Stored persistently in LocalStorage.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/companies/registered"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors no-underline"
            >
              <ArrowLeft size={14} />
              <span>Back to List</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Error notification banner */}
      {errorMessage && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-xl flex items-center gap-2.5 text-xs animate-in fade-in">
          <AlertCircle size={16} className="text-red-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* THE COMPREHENSIVE FORM */}
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* SECTION 1: COMPANY IDENTIFICATION & CONTACT */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 shadow-xs space-y-6">
          <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-[#0b4da2] flex items-center justify-center font-bold text-xs">
              1
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 m-0">Company Profile &amp; Registration</h2>
              <p className="text-[11px] text-slate-500 m-0">Official business registration details, ROC, and contact coordinates.</p>
            </div>
          </div>

          <div className="space-y-4">
            {/* ROW 1: 3 Fields (Company Name, ROC, Sector) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Company Name */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Company Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Building2 size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-400 transition-all uppercase"
                  />
                </div>
              </div>

              {/* Registration No (ROC) */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Registration No (ROC) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <ShieldCheck size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={roc}
                    onChange={(e) => setRoc(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-4 py-2.5 text-xs font-mono text-slate-800 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-400 transition-all"
                  />
                </div>
              </div>

              {/* Working Sector */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Company Working Sector <span className="text-red-500">*</span>
                </label>

                <div className="relative">
                  <Briefcase size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <select
                    required
                    value={sector}
                    onChange={(e) => handleSectorChange(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-10 py-2.5 text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-400 transition-all cursor-pointer appearance-none"
                  >
                    <option value="">-- Choose Company Sector --</option>
                    {sectorsList
                      .filter((s) => (s.status || 'active') === 'active')
                      .map((s) => (
                        <option key={s.id} value={s.name}>
                          {s.name}
                        </option>
                      ))}
                    {/* Keep existing sector visible if editing a legacy company */}
                    {sector && !sectorsList.some((s) => s.name === sector) && (
                      <option value={sector}>{sector} (Assigned)</option>
                    )}
                  </select>
                  <ChevronDown size={15} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* ROW 2: Phone Number, Telephone Number & Email Address (3 Columns) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Phone No */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="tel"
                    inputMode="numeric"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-400 transition-all"
                  />
                </div>
              </div>

              {/* Telephone No */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Telephone Number
                </label>
                <div className="relative">
                  <PhoneCall size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="tel"
                    inputMode="numeric"
                    value={telephone}
                    onChange={(e) => setTelephone(e.target.value.replace(/\D/g, ''))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-400 transition-all"
                  />
                </div>
              </div>

              {/* Email No */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-400 transition-all"
                  />
                </div>
              </div>
            </div>

            {/* ROW 3: Company Registered Address */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Company Registered Address
              </label>
              <div className="relative">
                <MapPin size={16} className="absolute left-3.5 top-3 text-slate-400" />
                <textarea
                  rows={2}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-400 transition-all"
                />
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 2: COMPANY LOGO & BRANDING */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 shadow-xs space-y-6">
          <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-[#0b4da2] flex items-center justify-center font-bold text-xs">
              2
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 m-0">Company Logo Upload</h2>
              <p className="text-[11px] text-slate-500 m-0">Upload official company crest/logo. Stored in browser LocalStorage.</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-6">
            {/* Logo Preview Box */}
            <div className="w-24 h-24 rounded-2xl bg-slate-50 border-2 border-dashed border-slate-300 flex items-center justify-center p-2 shrink-0 shadow-2xs relative overflow-hidden group">
              {logo ? (
                <img
                  src={resolveFileUrl(logo)}
                  alt="Logo Preview"
                  className="max-h-full max-w-full object-contain"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-slate-400 text-center">
                  <Building2 size={28} className="text-slate-300 mb-1" />
                  <span className="text-[10px] font-semibold">No Logo</span>
                </div>
              )}
            </div>

            {/* Upload Button */}
            <div className="flex-1 space-y-2 w-full">
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => document.getElementById('company-logo-upload-input')?.click()}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-[#0b4da2] hover:bg-[#083c80] text-white shadow-2xs transition-colors cursor-pointer border-0"
                >
                  <UploadCloud size={16} />
                  <span>Upload Logo from Computer</span>
                </button>
                <input
                  id="company-logo-upload-input"
                  type="file"
                  accept="image/*"
                  onClick={(e) => e.stopPropagation()}
                  onChange={handleLogoUpload}
                  className="hidden"
                />
                {logo && (
                  <button
                    type="button"
                    onClick={() => setLogo('')}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-600 transition-colors cursor-pointer border border-slate-200"
                    title="Remove uploaded logo"
                  >
                    <Trash2 size={13} />
                    <span>Remove Logo</span>
                  </button>
                )}
              </div>
              <p className="text-[11px] text-slate-400 m-0">
                Upload official company crest or logo (PNG, JPG, or SVG up to 2MB).
              </p>
            </div>
          </div>
        </div>

        {/* SECTION 3: BANKING INFORMATION */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-blue-50 text-[#0b4da2] flex items-center justify-center font-bold text-xs">
                3
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 m-0">Banking Information</h2>
                <p className="text-[11px] text-slate-500 m-0">Corporate bank name, account name, and bank account number. Multiple bank accounts can be added.</p>
              </div>
            </div>

            {/* Add Bank Account Button */}
            <button
              type="button"
              onClick={handleAddBankAccount}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-blue-50 hover:bg-blue-100 text-[#0b4da2] border border-blue-200 shadow-2xs transition-colors cursor-pointer shrink-0"
            >
              <Plus size={14} />
              <span>Add Bank Account</span>
            </button>
          </div>

          {/* Bank Accounts List */}
          <div className="space-y-4">
            {bankAccounts.map((account, bIndex) => (
              <div
                key={account.id || bIndex}
                className="bg-slate-50/70 border border-slate-200 rounded-2xl p-4 sm:p-5 relative space-y-4"
              >
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#0b4da2] text-white text-[10px] font-bold flex items-center justify-center">
                      {bIndex + 1}
                    </span>
                    <span className="text-xs font-bold text-slate-800">
                      {account.bankName ? account.bankName : `Bank Account #${bIndex + 1}`}
                    </span>
                  </div>

                  {bankAccounts.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveBankAccount(bIndex)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-red-600 hover:bg-red-50 border border-red-200 bg-white transition-colors cursor-pointer"
                      title="Remove Bank Account"
                    >
                      <Trash2 size={13} />
                      <span>Remove</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Bank Name */}
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Company Bank Name
                    </label>
                    <div className="relative">
                      <Building2 size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={account.bankName}
                        onChange={(e) => handleUpdateBankAccount(bIndex, 'bankName', e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-400 transition-all"
                      />
                    </div>
                  </div>

                  {/* Company Account Name */}
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Company Account Name
                    </label>
                    <div className="relative">
                      <UserCheck size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={account.bankAccountName}
                        onChange={(e) => handleUpdateBankAccount(bIndex, 'bankAccountName', e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-400 transition-all"
                      />
                    </div>
                  </div>

                  {/* Company Bank Account No (Digits Only) */}
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Company Bank Account No
                    </label>
                    <div className="relative">
                      <CreditCard size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        inputMode="numeric"
                        value={account.bankAccountNo}
                        onChange={(e) => handleUpdateBankAccount(bIndex, 'bankAccountNo', e.target.value.replace(/\D/g, ''))}
                        className="w-full bg-white border border-slate-300 rounded-xl pl-10 pr-4 py-2.5 text-xs font-mono text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-400 transition-all"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* SECTION 4: CURRENCY & LANGUAGE */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 shadow-xs space-y-6">
          <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-xs">
              4
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 m-0">Currency &amp; Language</h2>
              <p className="text-[11px] text-slate-500 m-0">Transactional currency and operating language.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Currency Selection (Select2 Searchable) */}
            <div>
              <Select2Search
                label="Currency Selection"
                options={ALL_WORLD_CURRENCIES}
                value={currency}
                onChange={(val) => setCurrency(val)}
                placeholder=""
                searchPlaceholder=""
                icon={<Coins size={16} />}
              />
            </div>

            {/* Language Selection (Select2 Searchable with all countries) */}
            <div>
              <Select2Search
                label="Language Selection"
                options={ALL_WORLD_LANGUAGES}
                value={language}
                onChange={(val) => setLanguage(val)}
                placeholder=""
                searchPlaceholder=""
                icon={<Languages size={16} />}
              />
            </div>
          </div>
        </div>

        {/* SECTION 5: MASTER ADMINISTRATOR ACCOUNT(S) - MULTIPLE ADD */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-xs">
                5
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 m-0">Master Administrator Account(s)</h2>
                <p className="text-[11px] text-slate-500 m-0">
                  Assign administrative login credentials for this company to access the Master Admin Portal. Multiple master admins can be added.
                </p>
              </div>
            </div>

            {/* + Add Master Admin Button */}
            <button
              type="button"
              onClick={handleAddMasterAdmin}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 shadow-2xs transition-colors cursor-pointer shrink-0"
            >
              <Crown size={14} />
              <span>Add Master Admin</span>
            </button>
          </div>

          {/* Existing Master Admins (when editing company) */}
          {existingMasterAdmins && existingMasterAdmins.length > 0 && (
            <div className="bg-indigo-50/40 border border-indigo-200/70 rounded-xl p-4 space-y-2.5">
              <div className="flex items-center gap-2 text-indigo-900 text-xs font-bold">
                <ShieldCheck size={14} className="text-indigo-600" />
                <span>Currently Assigned Master Admins ({existingMasterAdmins.length})</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                {existingMasterAdmins.map((adm) => (
                  <div key={adm.id} className="bg-white p-3 rounded-lg border border-indigo-100 shadow-2xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-800 truncate">{adm.name}</span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {adm.status || 'active'}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono truncate">
                      @{adm.username} • {adm.email}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Staged Master Admins List */}
          {masterAdmins.length === 0 ? (
            <div className="text-[11px] text-slate-400 italic bg-white/60 p-4 rounded-xl border border-dashed border-slate-200 text-center flex flex-col sm:flex-row items-center justify-center gap-2">
              <ShieldCheck size={16} className="text-indigo-400" />
              <span>No Master Admin account added yet. Click &quot;+ Add Master Admin&quot; to assign administrator credentials to this company.</span>
            </div>
          ) : (
            <div className="space-y-5">
              {masterAdmins.map((admin, mIndex) => (
                <div
                  key={admin.id || mIndex}
                  className="bg-slate-50/70 border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-5 relative"
                >
                  {/* Master Admin Header */}
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                    <div className="flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-[11px] font-bold flex items-center justify-center">
                        {mIndex + 1}
                      </span>
                      <h3 className="text-xs font-bold text-slate-900 m-0 uppercase tracking-wide">
                        {admin.name ? admin.name : `Master Admin #${mIndex + 1}`}
                      </h3>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded border bg-indigo-50 text-indigo-700 border-indigo-200">
                        Master Administrator
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveMasterAdmin(mIndex)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-red-600 hover:bg-red-50 border border-red-200 bg-white transition-colors cursor-pointer"
                      title="Remove Master Admin"
                    >
                      <Trash2 size={13} />
                      <span>Remove</span>
                    </button>
                  </div>

                  {/* Form Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Full Name */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Full Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={admin.name}
                        onChange={(e) => {
                          const val = e.target.value;
                          handleUpdateMasterAdmin(mIndex, 'name', val);
                          if (!admin.username || admin.username.startsWith('admin_') || admin.username.includes('_admin')) {
                            const clean = val.toLowerCase().replace(/[^a-z0-9]/g, '');
                            if (clean) {
                              handleUpdateMasterAdmin(mIndex, 'username', clean);
                            }
                          }
                        }}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    {/* Username */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Username (Login Handle) <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-mono">@</span>
                        <input
                          type="text"
                          value={admin.username}
                          onChange={(e) => handleUpdateMasterAdmin(mIndex, 'username', e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ''))}
                          className="w-full bg-white border border-slate-300 rounded-xl pl-7 pr-3.5 py-2 text-xs font-mono text-slate-800 focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>

                    {/* Email */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Email Address <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="email"
                          value={admin.email}
                          onChange={(e) => handleUpdateMasterAdmin(mIndex, 'email', e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>

                    {/* Password */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Password <span className="text-red-500">*</span>
                      </label>
                      <div className="flex items-center gap-1.5">
                        <div className="relative flex-1">
                          <KeyRound size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            type={admin.showPassword ? 'text' : 'password'}
                            value={admin.password}
                            onChange={(e) => handleUpdateMasterAdmin(mIndex, 'password', e.target.value)}
                            className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-8 py-2 text-xs font-mono text-slate-800 focus:outline-none focus:border-indigo-500"
                          />
                          <button
                            type="button"
                            onClick={() => handleUpdateMasterAdmin(mIndex, 'showPassword', !admin.showPassword)}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer border-0 bg-transparent p-0"
                            title={admin.showPassword ? 'Hide password' : 'Show password'}
                          >
                            {admin.showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRegenerateMasterAdminPassword(mIndex)}
                          className="p-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 shadow-2xs cursor-pointer transition-colors shrink-0"
                          title="Generate Secure Random Password"
                        >
                          <Sparkles size={14} className="text-indigo-600" />
                        </button>
                      </div>
                    </div>

                    {/* Subscription Package */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Subscription Plan
                      </label>
                      <select
                        value={admin.subscription_package}
                        onChange={(e) => handleUpdateMasterAdmin(mIndex, 'subscription_package', e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 cursor-pointer"
                      >
                        {subscriptionPlans.length > 0 ? (
                          subscriptionPlans.map((plan) => (
                            <option key={plan.id} value={plan.plan_key}>
                              {plan.name} ({plan.duration_days || 30} Days) - {plan.price ? `${plan.price} ${plan.currency || 'RM'}` : 'Default'}
                            </option>
                          ))
                        ) : (
                          <>
                            <option value="1_month">1 Month Standard (30 Days)</option>
                            <option value="3_months">3 Months Business (90 Days)</option>
                            <option value="6_months">6 Months Enterprise (180 Days)</option>
                            <option value="1_year">1 Year Full Package (365 Days)</option>
                            <option value="trial">3-Day Free Trial</option>
                          </>
                        )}
                      </select>
                    </div>

                    {/* Status Toggle */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Account Status
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => handleUpdateMasterAdmin(mIndex, 'status', 'active')}
                          className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                            admin.status === 'active'
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                              : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          Active
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdateMasterAdmin(mIndex, 'status', 'inactive')}
                          className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                            admin.status === 'inactive'
                              ? 'bg-slate-700 text-white border-slate-700 shadow-2xs'
                              : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          Inactive
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* SECTION 6: STAFF EMPLOYEE ACCOUNT(S) - MULTIPLE ADD */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center font-bold text-xs">
                6
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 m-0">Staff Employee Account(s)</h2>
                <p className="text-[11px] text-slate-500 m-0">
                  Create employee credentials and set operating permissions for this company. Multiple employees can be added.
                </p>
              </div>
            </div>

            {/* + Add Employee Button */}
            <button
              type="button"
              onClick={handleAddEmployee}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 shadow-2xs transition-colors cursor-pointer shrink-0"
            >
              <UserPlus size={14} />
              <span>Add Employee</span>
            </button>
          </div>

          {/* Existing Employees (when editing company) */}
          {existingEmployees && existingEmployees.length > 0 && (
            <div className="bg-teal-50/40 border border-teal-200/70 rounded-xl p-4 space-y-2.5">
              <div className="flex items-center gap-2 text-teal-900 text-xs font-bold">
                <Users size={14} className="text-teal-600" />
                <span>Currently Assigned Staff Employees ({existingEmployees.length})</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                {existingEmployees.map((emp) => (
                  <div key={emp.id} className="bg-white p-3 rounded-lg border border-teal-100 shadow-2xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-800 truncate">{emp.name}</span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200">
                        {emp.employee_code}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono truncate">
                      {emp.email} • {emp.status || 'active'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Staged Employees List */}
          {employees.length === 0 ? (
            <div className="text-[11px] text-slate-400 italic bg-white/60 p-4 rounded-xl border border-dashed border-slate-200 text-center flex flex-col sm:flex-row items-center justify-center gap-2">
              <Users size={16} className="text-teal-400" />
              <span>No staff employee accounts added yet. Click &quot;+ Add Employee&quot; to assign staff members to this company.</span>
            </div>
          ) : (
            <div className="space-y-5">
              {employees.map((emp, eIndex) => (
                <div
                  key={emp.id || eIndex}
                  className="bg-slate-50/70 border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-5 relative"
                >
                  {/* Employee Header */}
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                    <div className="flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded-full bg-teal-600 text-white text-[11px] font-bold flex items-center justify-center">
                        {eIndex + 1}
                      </span>
                      <h3 className="text-xs font-bold text-slate-900 m-0 uppercase tracking-wide">
                        {emp.name ? emp.name : `Employee #${eIndex + 1}`}
                      </h3>
                      <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded border bg-teal-50 text-teal-700 border-teal-200">
                        {emp.employee_code || 'CODE'}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveEmployee(eIndex)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-red-600 hover:bg-red-50 border border-red-200 bg-white transition-colors cursor-pointer"
                      title="Remove Employee"
                    >
                      <Trash2 size={13} />
                      <span>Remove</span>
                    </button>
                  </div>

                  {/* Form Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Full Name */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Staff Full Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={emp.name}
                        onChange={(e) => handleUpdateEmployee(eIndex, 'name', e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:border-teal-500"
                      />
                    </div>

                    {/* Employee Code */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Employee Code <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={emp.employee_code}
                        onChange={(e) => handleUpdateEmployee(eIndex, 'employee_code', e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-800 focus:outline-none focus:border-teal-500"
                      />
                    </div>

                    {/* Email */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Email Address <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="email"
                          value={emp.email}
                          onChange={(e) => handleUpdateEmployee(eIndex, 'email', e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:border-teal-500"
                        />
                      </div>
                    </div>

                    {/* Password */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Password <span className="text-red-500">*</span>
                      </label>
                      <div className="flex items-center gap-1.5">
                        <div className="relative flex-1">
                          <KeyRound size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            type={emp.showPassword ? 'text' : 'password'}
                            value={emp.password}
                            onChange={(e) => handleUpdateEmployee(eIndex, 'password', e.target.value)}
                            className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-8 py-2 text-xs font-mono text-slate-800 focus:outline-none focus:border-teal-500"
                          />
                          <button
                            type="button"
                            onClick={() => handleUpdateEmployee(eIndex, 'showPassword', !emp.showPassword)}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer border-0 bg-transparent p-0"
                            title={emp.showPassword ? 'Hide password' : 'Show password'}
                          >
                            {emp.showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRegenerateEmployeePassword(eIndex)}
                          className="p-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 shadow-2xs cursor-pointer transition-colors shrink-0"
                          title="Generate Secure Random Password"
                        >
                          <Sparkles size={14} className="text-teal-600" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Permissions & Status Row */}
                  <div className="pt-3 border-t border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-3">
                    {/* Permissions Checkboxes */}
                    <div className="flex flex-wrap items-center gap-4">
                      <span className="text-xs font-bold text-slate-700">Permissions:</span>
                      <label className="inline-flex items-center gap-1.5 text-xs text-slate-700 font-medium cursor-pointer">
                        <input
                          type="checkbox"
                          checked={emp.can_create}
                          onChange={(e) => handleUpdateEmployee(eIndex, 'can_create', e.target.checked)}
                          className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
                        />
                        <span>Can Create</span>
                      </label>
                      <label className="inline-flex items-center gap-1.5 text-xs text-slate-700 font-medium cursor-pointer">
                        <input
                          type="checkbox"
                          checked={emp.can_edit}
                          onChange={(e) => handleUpdateEmployee(eIndex, 'can_edit', e.target.checked)}
                          className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
                        />
                        <span>Can Edit</span>
                      </label>
                      <label className="inline-flex items-center gap-1.5 text-xs text-slate-700 font-medium cursor-pointer">
                        <input
                          type="checkbox"
                          checked={emp.can_delete}
                          onChange={(e) => handleUpdateEmployee(eIndex, 'can_delete', e.target.checked)}
                          className="rounded border-slate-300 text-red-600 focus:ring-red-500 cursor-pointer"
                        />
                        <span className="text-slate-600">Can Delete</span>
                      </label>
                    </div>

                    {/* Status selector */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-700">Status:</span>
                      <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5">
                        <button
                          type="button"
                          onClick={() => handleUpdateEmployee(eIndex, 'status', 'active')}
                          className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer border-0 ${
                            emp.status === 'active'
                              ? 'bg-emerald-600 text-white'
                              : 'bg-transparent text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          Active
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdateEmployee(eIndex, 'status', 'inactive')}
                          className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer border-0 ${
                            emp.status === 'inactive'
                              ? 'bg-slate-700 text-white'
                              : 'bg-transparent text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          Inactive
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* SECTION 7: COMPANY DIRECTORS (CEOs) & DOCUMENT UPLOADS - MULTIPLE ADD */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center font-bold text-xs">
                7
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 m-0">Company Director(s) &amp; Document Upload(s)</h2>
                <p className="text-[11px] text-slate-500 m-0">
                  Multiple directors can be added. Includes National ID, Passport, Car, Salary, and other uploaded documents.
                </p>
              </div>
            </div>

            {/* + Add Director Button */}
            <button
              type="button"
              onClick={handleAddDirector}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 shadow-2xs transition-colors cursor-pointer shrink-0"
            >
              <UserPlus size={14} />
              <span>Add Director / CEO</span>
            </button>
          </div>

          {/* Director Cards List */}
          <div className="space-y-6">
            {directors.map((director, dIndex) => (
              <div
                key={director.id || dIndex}
                className="bg-slate-50/70 border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-5 relative"
              >
                {/* Director Header */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-full bg-purple-600 text-white text-[11px] font-bold flex items-center justify-center">
                      {dIndex + 1}
                    </span>
                    <h3 className="text-xs font-bold text-slate-900 m-0 uppercase tracking-wide">
                      {director.name ? director.name : `Director / CEO #${dIndex + 1}`}
                    </h3>
                  </div>

                  {directors.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveDirector(dIndex)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-red-600 hover:bg-red-50 border border-red-200 bg-white transition-colors cursor-pointer"
                      title="Remove Director"
                    >
                      <Trash2 size={13} />
                      <span>Remove</span>
                    </button>
                  )}
                </div>

                {/* Director Info Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Director Name */}
                  <div className="sm:col-span-2 lg:col-span-1">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Director Full Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={director.name}
                      onChange={(e) => handleUpdateDirector(dIndex, 'name', e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  {/* Director Phone */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={director.phone}
                      onChange={(e) => handleUpdateDirector(dIndex, 'phone', e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  {/* Director Email */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={director.email}
                      onChange={(e) => handleUpdateDirector(dIndex, 'email', e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  {/* National ID No */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      National ID No
                    </label>
                    <input
                      type="text"
                      value={director.nidNo}
                      onChange={(e) => handleUpdateDirector(dIndex, 'nidNo', e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-800 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  {/* National ID Upload */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      National ID Document Upload
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => document.getElementById(`nid-file-input-${dIndex}`)?.click()}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 shadow-2xs transition-colors cursor-pointer w-full justify-center"
                      >
                        <FileUp size={14} className="text-blue-600" />
                        <span className="truncate">
                          {director.nidFile ? director.nidFile.fileName : 'Choose National ID File'}
                        </span>
                      </button>
                      <input
                        id={`nid-file-input-${dIndex}`}
                        type="file"
                        accept="image/*,application/pdf"
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => handleDirectorFileUpload(dIndex, 'nidFile', e)}
                        className="hidden"
                      />
                      {director.nidFile && (
                        <button
                          type="button"
                          onClick={() => setPreviewFile({ name: director.nidFile!.fileName, url: director.nidFile!.fileData, type: director.nidFile!.fileType })}
                          className="p-2 rounded-lg bg-blue-50 text-[#0b4da2] hover:bg-blue-100 border border-blue-200 cursor-pointer shrink-0"
                          title="Preview Uploaded National ID"
                        >
                          <Eye size={14} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Passport No */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Passport No
                    </label>
                    <input
                      type="text"
                      value={director.passportNo}
                      onChange={(e) => handleUpdateDirector(dIndex, 'passportNo', e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-800 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  {/* Passport Upload */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Passport Document Upload
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => document.getElementById(`passport-file-input-${dIndex}`)?.click()}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 shadow-2xs transition-colors cursor-pointer w-full justify-center"
                      >
                        <FileCheck size={14} className="text-emerald-600" />
                        <span className="truncate">
                          {director.passportFile ? director.passportFile.fileName : 'Choose Passport File'}
                        </span>
                      </button>
                      <input
                        id={`passport-file-input-${dIndex}`}
                        type="file"
                        accept="image/*,application/pdf"
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => handleDirectorFileUpload(dIndex, 'passportFile', e)}
                        className="hidden"
                      />
                      {director.passportFile && (
                        <button
                          type="button"
                          onClick={() => setPreviewFile({ name: director.passportFile!.fileName, url: director.passportFile!.fileData, type: director.passportFile!.fileType })}
                          className="p-2 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 cursor-pointer shrink-0"
                          title="Preview Uploaded Passport"
                        >
                          <Eye size={14} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* SOCSO No */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      SOCSO No
                    </label>
                    <input
                      type="text"
                      value={director.socsoNo}
                      onChange={(e) => handleUpdateDirector(dIndex, 'socsoNo', e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-800 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  {/* EPF No */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      EPF No
                    </label>
                    <input
                      type="text"
                      value={director.epfNo}
                      onChange={(e) => handleUpdateDirector(dIndex, 'epfNo', e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-800 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  {/* Basic Salary */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Basic Monthly Salary ({currency})
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={director.basicSalary}
                      onChange={(e) => handleUpdateDirector(dIndex, 'basicSalary', e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-800 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* DIRECTOR ASSIGNED CAR(S) & VEHICLE EMI */}
                <div className="pt-4 border-t border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <Car size={15} className="text-[#0b4da2]" />
                        <h4 className="text-xs font-bold text-slate-800 m-0">Director Assigned Car(s)</h4>
                      </div>
                      <p className="text-[11px] text-slate-500 m-0 mt-0.5">
                        Assigned vehicles with individual registration plate, purchase scheme (EMI/Cash), monthly amount, and total payment.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleAddCar(dIndex)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-bold bg-blue-50 hover:bg-blue-100 text-[#0b4da2] border border-blue-200 shadow-2xs cursor-pointer transition-colors"
                    >
                      <Plus size={13} />
                      <span>Add Car</span>
                    </button>
                  </div>

                  <div className="space-y-3">
                    {((director.cars && director.cars.length > 0)
                      ? director.cars
                      : [createEmptyCar(1)]
                    ).map((car, cIndex) => (
                      <div
                        key={car.id || cIndex}
                        className="bg-slate-50/80 border border-slate-200 rounded-xl p-3.5 space-y-3 relative"
                      >
                        <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-md bg-[#0b4da2] text-white font-bold text-[10px] flex items-center justify-center">
                              {cIndex + 1}
                            </span>
                            <span className="text-xs font-bold text-slate-800">
                              Vehicle #{cIndex + 1} {car.plateNo ? `• ${car.plateNo}` : ''}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                                car.purchaseType === 'cash'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : 'bg-blue-50 text-blue-700 border-blue-200'
                              }`}
                            >
                              {car.purchaseType === 'cash' ? 'Cash Purchase' : 'EMI Scheme'}
                            </span>
                          </div>

                          {(director.cars && director.cars.length > 1) && (
                            <button
                              type="button"
                              onClick={() => handleRemoveCar(dIndex, cIndex)}
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-2 py-0.5 rounded border border-red-200 cursor-pointer transition-colors"
                              title="Delete Car"
                            >
                              <Trash2 size={12} />
                              <span>Remove</span>
                            </button>
                          )}
                        </div>

                        <div className="space-y-3.5">
                          {/* Row 1: Car Plate No & Purchase Scheme */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                            {/* Car Plate No */}
                            <div>
                              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                Car Plate No
                              </label>
                              <div className="relative">
                                <Car size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                  type="text"
                                  value={car.plateNo}
                                  onChange={(e) => handleUpdateCar(dIndex, cIndex, 'plateNo', e.target.value.toUpperCase())}
                                  className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-3.5 py-2 text-xs font-mono uppercase text-slate-800 focus:outline-none focus:border-blue-500"
                                />
                              </div>
                            </div>

                            {/* Purchase Scheme */}
                            <div>
                              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                Car Purchase Scheme
                              </label>
                              <div className="grid grid-cols-2 gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleUpdateCar(dIndex, cIndex, 'purchaseType', 'emi')}
                                  className={`py-2 px-3 rounded-xl text-[11px] font-bold transition-all cursor-pointer border ${
                                    car.purchaseType === 'emi'
                                      ? 'bg-[#0b4da2] text-white border-[#0b4da2] shadow-2xs'
                                      : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                                  }`}
                                >
                                  EMI (Installment)
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateCar(dIndex, cIndex, 'purchaseType', 'cash')}
                                  className={`py-2 px-3 rounded-xl text-[11px] font-bold transition-all cursor-pointer border ${
                                    car.purchaseType === 'cash'
                                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                                      : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                                  }`}
                                >
                                  Cash (Paid)
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Financial Fields */}
                          {car.purchaseType === 'emi' ? (
                            <div className="space-y-2.5">
                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
                                {/* 1. First Deposit Amount */}
                                <div>
                                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                    First Deposit Amount ({currency})
                                  </label>
                                  <input
                                    type="number"
                                    min="0"
                                    value={car.depositAmount || ''}
                                    onChange={(e) => handleUpdateCar(dIndex, cIndex, 'depositAmount', e.target.value)}
                                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono text-slate-800 focus:outline-none focus:border-blue-500"
                                  />
                                </div>

                                {/* 2. EMI Period (Months) */}
                                <div>
                                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                    EMI Period (Months)
                                  </label>
                                  <input
                                    type="number"
                                    min="0"
                                    value={car.emiPeriod || ''}
                                    onChange={(e) => handleUpdateCar(dIndex, cIndex, 'emiPeriod', e.target.value)}
                                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono text-slate-800 focus:outline-none focus:border-blue-500"
                                  />
                                </div>

                                {/* 3. Monthly EMI Amount */}
                                <div>
                                  <label className="block text-[11px] font-bold text-slate-700 mb-1 truncate">
                                    Monthly EMI Amount ({currency})
                                  </label>
                                  <input
                                    type="number"
                                    min="0"
                                    value={car.amount}
                                    onChange={(e) => handleUpdateCar(dIndex, cIndex, 'amount', e.target.value)}
                                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono text-slate-800 focus:outline-none focus:border-blue-500"
                                  />
                                </div>

                                {/* 4. Total Payment (EMI Only) */}
                                <div>
                                  <div className="flex items-center justify-between mb-1">
                                    <label className="block text-[11px] font-bold text-slate-700 m-0">
                                      Total Payment ({currency})
                                    </label>
                                    <span className="text-[10px] text-blue-700 font-bold bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200">
                                      EMI Total
                                    </span>
                                  </div>
                                  <input
                                    type="number"
                                    min="0"
                                    value={car.totalPayment || ''}
                                    onChange={(e) => handleUpdateCar(dIndex, cIndex, 'totalPayment', e.target.value)}
                                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-blue-900 focus:outline-none focus:border-blue-500"
                                  />
                                </div>
                              </div>

                              {/* Calculation Display / Summary Box */}
                              {(Number(car.depositAmount) > 0 || Number(car.amount) > 0 || Number(car.emiPeriod) > 0) && (
                                <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-blue-50/70 border border-blue-200 text-xs">
                                  <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                                    <span className="font-bold text-blue-900">EMI Calculation:</span>
                                    <span>
                                      Deposit ({Number(car.depositAmount || 0).toLocaleString()} {currency}) + [{Number(car.amount || 0).toLocaleString()} {currency} × {car.emiPeriod || 0} Months]
                                    </span>
                                  </div>
                                  <div className="text-right">
                                    <span className="text-slate-500 text-[11px] mr-1.5">Calculated Total:</span>
                                    <span className="font-bold font-mono text-blue-900 text-sm">
                                      {(
                                        (Number(car.depositAmount) || 0) +
                                        ((Number(car.amount) || 0) * (Number(car.emiPeriod) || 0))
                                      ).toLocaleString()} {currency}
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                              <div>
                                <label className="block text-[11px] font-bold text-slate-700 mb-1 truncate">
                                  Car Cash Total Amount ({currency})
                                </label>
                                <input
                                  type="number"
                                  min="0"
                                  value={car.amount}
                                  onChange={(e) => handleUpdateCar(dIndex, cIndex, 'amount', e.target.value)}
                                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono text-slate-800 focus:outline-none focus:border-blue-500"
                                />
                              </div>

                              <div>
                                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                  Payment Status
                                </label>
                                <div className="h-[36px] flex items-center px-3 bg-emerald-50 border border-emerald-200 rounded-xl text-[11px] font-bold text-emerald-700">
                                  Paid in Full (Cash)
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* OTHER DOCUMENTS UPLOAD (MULTIPLE NAME + FILE UPLOAD) */}
                <div className="pt-4 border-t border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-800 m-0">Other Documents Upload</h4>
                      <p className="text-[11px] text-slate-500 m-0">
                        Upload additional supporting documents for this director (Appointment letter, board resolution, tax clearance, etc.).
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleAddOtherDocument(dIndex)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-bold bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 shadow-2xs cursor-pointer"
                    >
                      <Plus size={13} />
                      <span>Add Document</span>
                    </button>
                  </div>

                  {director.otherDocuments && director.otherDocuments.length > 0 ? (
                    <div className="space-y-2.5">
                      {director.otherDocuments.map((doc, docIndex) => (
                        <div
                          key={doc.id || docIndex}
                          className="flex flex-col sm:flex-row items-center gap-2.5 bg-white p-3 rounded-xl border border-slate-200"
                        >
                          {/* Document Name / Title */}
                          <div className="w-full sm:w-1/3">
                            <input
                              type="text"
                              value={doc.name}
                              onChange={(e) => handleUpdateOtherDocName(dIndex, docIndex, e.target.value)}
                              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:bg-white focus:outline-none"
                            />
                          </div>

                          {/* File Upload */}
                          <div className="w-full sm:flex-1 flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => document.getElementById(`other-doc-file-input-${dIndex}-${docIndex}`)?.click()}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-300 transition-colors cursor-pointer flex-1 truncate text-left"
                            >
                              <FileSpreadsheet size={14} className="text-purple-600 shrink-0" />
                              <span className="truncate">
                                {doc.fileName ? `${doc.fileName} (${doc.fileSize || 'File'})` : 'Upload File (PDF/Image)'}
                              </span>
                            </button>
                            <input
                              id={`other-doc-file-input-${dIndex}-${docIndex}`}
                              type="file"
                              accept="image/*,application/pdf,.doc,.docx"
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => handleOtherDocFileUpload(dIndex, docIndex, e)}
                              className="hidden"
                            />

                            {doc.fileData && (
                              <button
                                type="button"
                                onClick={() => setPreviewFile({ name: doc.fileName || doc.name, url: doc.fileData, type: doc.fileType })}
                                className="p-1.5 rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 cursor-pointer"
                                title="Preview Document"
                              >
                                <Eye size={13} />
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => handleRemoveOtherDoc(dIndex, docIndex)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 border-0 bg-transparent cursor-pointer"
                              title="Delete Document"
                            >
                              <X size={15} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-[11px] text-slate-400 italic bg-white/60 p-3 rounded-xl border border-dashed border-slate-200 text-center">
                      No additional documents uploaded for this director. Click &quot;+ Add Document&quot; if needed.
                    </div>
                  )}
                          {/* EXCEL SPREADSHEETS & DOCUMENTS SECTION */}
                <div className="pt-4 border-t border-slate-200 space-y-3">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                    <div className="min-w-0 flex-1 pr-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <FileSpreadsheet size={15} className="text-emerald-600 shrink-0" />
                        <h4 className="text-xs font-bold text-slate-800 m-0">Excel Spreadsheets &amp; Documents</h4>
                        <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0">
                          {director.excelDocuments?.length || 0} Files
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 m-0 mt-0.5">
                        Upload Excel (.xlsx, .csv) or Word (.docx, .doc) files, or create &amp; edit spreadsheets and documents directly in the browser.
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 flex-nowrap">
                      <button
                        type="button"
                        onClick={() => document.getElementById(`excel-file-input-${dIndex}`)?.click()}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 shadow-2xs cursor-pointer transition-colors whitespace-nowrap shrink-0"
                        title="Upload Excel (.xlsx, .xls, .csv) or Microsoft Word (.docx, .doc) file"
                      >
                        <UploadCloud size={13} className="text-[#2b579a]" />
                        <span>Upload Document (.xlsx, .docx, .csv)</span>
                      </button>
                      <input
                        id={`excel-file-input-${dIndex}`}
                        type="file"
                        accept=".xlsx,.xls,.csv,.docx,.doc,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword"
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => handleExcelFileUpload(dIndex, e)}
                        className="hidden"
                      />

                      <button
                        type="button"
                        onClick={() => handleOpenCreateExcel(dIndex)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs cursor-pointer transition-colors whitespace-nowrap shrink-0"
                        title="Create a new spreadsheet"
                      >
                        <Plus size={13} />
                        <span>Excel Sheet</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenCreateWord(dIndex)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-[#2b579a] hover:bg-[#1f3f72] text-white shadow-2xs cursor-pointer transition-colors whitespace-nowrap shrink-0"
                        title="Create a new Microsoft Word document"
                      >
                        <Plus size={13} />
                        <span>Word Doc</span>
                      </button>
                    </div>
                  </div>

                  {director.excelDocuments && director.excelDocuments.length > 0 ? (
                    <div className="space-y-2">
                      {director.excelDocuments.map((xDoc, xIndex) => {
                        const isWord =
                          xDoc.category === 'word' ||
                          xDoc.fileName?.toLowerCase().endsWith('.docx') ||
                          xDoc.fileName?.toLowerCase().endsWith('.doc');

                        return (
                          <div
                            key={xDoc.id || xIndex}
                            className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl border transition-colors ${
                              isWord
                                ? 'bg-blue-50/40 border-blue-200 hover:border-blue-300'
                                : 'bg-emerald-50/40 border-emerald-200 hover:border-emerald-300'
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div
                                className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border shadow-2xs ${
                                  isWord
                                    ? 'bg-[#2b579a] text-white border-blue-800 font-bold text-sm'
                                    : 'bg-emerald-100 text-emerald-700 border-emerald-200'
                                }`}
                              >
                                {isWord ? <span>W</span> : <FileSpreadsheet size={18} />}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="text-xs font-bold text-slate-800 m-0 truncate">
                                    {xDoc.name || xDoc.fileName}
                                  </p>
                                  <span
                                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                      isWord
                                        ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                        : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                    }`}
                                  >
                                    {isWord ? 'Word' : 'Excel'}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500">
                                  <span className={`font-mono font-semibold ${isWord ? 'text-blue-800' : 'text-emerald-800'}`}>
                                    {xDoc.fileName}
                                  </span>
                                  <span>•</span>
                                  <span className="text-slate-400">{xDoc.fileSize || (isWord ? 'Word Document' : 'Spreadsheet')}</span>
                                  {!isWord && xDoc.headers && xDoc.rows && (
                                    <>
                                      <span>•</span>
                                      <span className="text-emerald-700 font-medium">
                                        {xDoc.headers.length} Cols • {xDoc.rows.length} Rows
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                              {/* Eye Icon to View Document */}
                              <button
                                type="button"
                                onClick={() => {
                                  if (isWord) {
                                    handleOpenEditWord(dIndex, xIndex);
                                  } else {
                                    handleOpenEditExcel(dIndex, xIndex);
                                  }
                                }}
                                className={`p-1.5 rounded-lg border cursor-pointer transition-colors ${
                                  isWord
                                    ? 'bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200'
                                    : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200'
                                }`}
                                title={isWord ? 'View Document in Microsoft Word' : 'View Spreadsheet in Microsoft Excel'}
                              >
                                <Eye size={14} />
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  if (isWord) {
                                    handleOpenEditWord(dIndex, xIndex);
                                  } else {
                                    handleOpenEditExcel(dIndex, xIndex);
                                  }
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 shadow-2xs transition-colors cursor-pointer"
                                title={isWord ? 'Open in Microsoft Word Editor' : 'Open in Spreadsheet Editor'}
                              >
                                <Edit2 size={13} className={isWord ? 'text-blue-600' : 'text-emerald-600'} />
                                <span>{isWord ? 'Edit Doc' : 'Edit Sheet'}</span>
                              </button>

                              {xDoc.fileData && (
                                <a
                                  href={xDoc.fileData}
                                  download={xDoc.fileName}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 shadow-2xs transition-colors no-underline cursor-pointer"
                                  title={`Download ${xDoc.fileName}`}
                                >
                                  <Download size={13} className={isWord ? 'text-blue-600' : 'text-emerald-600'} />
                                  <span>Download</span>
                                </a>
                              )}

                              <button
                                type="button"
                                onClick={() => handleDeleteExcelDoc(dIndex, xIndex)}
                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg border-0 bg-transparent cursor-pointer transition-colors"
                                title="Delete Document"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-[11px] text-slate-400 italic bg-white/60 p-3 rounded-xl border border-dashed border-slate-200 text-center flex items-center justify-center gap-2">
                      <FileSpreadsheet size={15} className="text-slate-300" />
                      <span>No spreadsheets or Word documents added yet. You can upload an Excel/Word file or create a new sheet/doc.</span>
                    </div>
                  )}
                </div>              </div>
              </div>
            ))}
          </div>
        </div>

        {/* BOTTOM FORM ACTIONS */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <Link
            href="/companies/registered"
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors text-center no-underline"
          >
            Cancel &amp; Return
          </Link>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3 rounded-xl text-xs font-bold bg-[#22a34a] hover:bg-[#1b843c] text-white shadow-md hover:shadow-lg transition-all cursor-pointer border-0 disabled:opacity-50"
            >
              <Save size={16} />
              <span>{isSubmitting ? 'Saving Company & Accounts...' : editId ? 'Save & Update Company' : 'Register & Save Company'}</span>
            </button>
          </div>
        </div>
      </form>

      {/* FILE PREVIEW MODAL */}
      {previewFile && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-5 shadow-2xl border border-slate-300 relative flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <FileText size={18} className="text-[#0b4da2]" />
                <h3 className="text-sm font-bold text-slate-900 m-0 truncate max-w-md">
                  {previewFile.name}
                </h3>
              </div>
              <button
                onClick={() => setPreviewFile(null)}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer bg-transparent border-0"
              >
                <X size={18} />
              </button>
            </div>

            <div className="py-4 flex-1 overflow-auto flex items-center justify-center min-h-[300px] bg-slate-100 rounded-xl my-3">
              {previewFile.url.startsWith('data:image/') ? (
                <img
                  src={previewFile.url}
                  alt={previewFile.name}
                  className="max-h-[60vh] max-w-full object-contain rounded-lg shadow-xs"
                />
              ) : previewFile.url.startsWith('data:application/pdf') ? (
                <iframe
                  src={previewFile.url}
                  title={previewFile.name}
                  className="w-full h-[60vh] rounded-lg border-0"
                />
              ) : (
                <div className="text-center p-6 text-slate-500">
                  <FileText size={48} className="mx-auto text-slate-400 mb-2" />
                  <p className="font-semibold text-xs text-slate-700 m-0">{previewFile.name}</p>
                  <p className="text-[11px] text-slate-400 mt-1">Binary document file stored locally.</p>
                </div>
              )}
            </div>

            <div className="pt-2 flex items-center justify-between">
              <span className="text-[11px] text-slate-500">Document stored in LocalStorage</span>
              <div className="flex items-center gap-2">
                <a
                  href={previewFile.url}
                  download={previewFile.name}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-[#22a34a] hover:bg-[#1b843c] text-white shadow-xs transition-colors no-underline cursor-pointer"
                >
                  <Download size={14} />
                  <span>Download File</span>
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewFile(null)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border-0 cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EXCEL SHEET SPREADSHEET EDITOR MODAL */}
      <ExcelSheetEditorModal
        isOpen={isExcelEditorOpen}
        onClose={() => {
          setIsExcelEditorOpen(false);
          setEditingExcelInfo(null);
        }}
        onSave={handleSaveExcelDoc}
        initialDocument={editingExcelInfo?.doc}
      />

      {/* WORD DOCUMENT EDITOR MODAL */}
      <WordDocumentEditorModal
        isOpen={isWordEditorOpen}
        onClose={() => {
          setIsWordEditorOpen(false);
          setEditingWordInfo(null);
        }}
        onSave={handleSaveWordDoc}
        initialDocument={editingWordInfo?.doc}
      />
    </div>
  );
}

export default function CreateCompanyPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[400px] flex items-center justify-center">
          <div className="w-8 h-8 border-3 border-[#0b4da2] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <CreateCompanyFormContent />
    </Suspense>
  );
}
