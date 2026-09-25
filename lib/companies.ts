export type UploadedFileInfo = {
  fileName: string;
  fileSize?: string;
  fileType?: string;
  fileData: string; // Base64 Data URL or server /storage/ path
};

/**
 * Resolves a company logo or file URL to an accessible browser path.
 * If the path is a Laravel relative storage path (/storage/...), it prepends the backend base domain
 * so that it loads cleanly in all contexts.
 */
export function resolveFileUrl(path?: string): string {
  if (!path) return '';
  if (
    path.startsWith('data:') ||
    path.startsWith('blob:') ||
    path.startsWith('http://') ||
    path.startsWith('https://')
  ) {
    return path;
  }
  const clean = path.startsWith('/') ? path : `/${path}`;
  if (clean.startsWith('/storage/')) {
    const backendBase = (process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://127.0.0.1:8000/api')
      .replace(/\/api\/?$/, '');
    return `${backendBase}${clean}`;
  }
  return clean;
}

export type DirectorDocument = {
  id: string;
  name: string; // Document title / remark
  fileName: string;
  fileSize?: string;
  fileType?: string;
  fileData: string; // Base64 Data URL
  uploadedAt: string;
};

export type CompanyDirector = {
  id: string;
  name: string;
  nidNo: string;
  nidFile?: UploadedFileInfo;
  passportNo: string;
  passportFile?: UploadedFileInfo;
  phone: string;
  email: string;
  socsoNo: string;
  epfNo: string;
  carPlateNo: string;
  carPurchaseType: 'cash' | 'emi' | ''; // EMI or Cash
  carAmount: string | number; // EMI/Cash Amount
  basicSalary: string | number; // Basic Salary
  otherDocuments: DirectorDocument[]; // Multiple documents (name + file upload)
};

export type Company = {
  id: string;
  name: string;
  roc: string; // Registration of Companies number
  sector: string;
  description: string;
  logo: string;
  tag?: string;
  totalWorkers: number;

  // Foreign Worker & Wallet Metrics
  activeWorkers?: number; // Total active foreign workers
  inactiveWorkers?: number; // Total inactive foreign workers
  incomeWallet?: number; // Total Income Wallet (MYR)
  costWallet?: number; // Total Cost Wallet (MYR)
  profitWallet?: number; // Total Profit Wallet (MYR)
  workerWallet?: number; // Foreign Worker Wallet (MYR)

  // Additional comprehensive company fields
  address?: string; // Company Address
  phone?: string; // Phone number
  email?: string; // Email address
  currency?: string; // Currency selection (e.g. MYR, USD)
  language?: string; // Language selection (e.g. English, Malay)
  bankName?: string; // Bank name
  bankAccountNo?: string; // Company Bank Account No
  directors?: CompanyDirector[]; // Multiple Directors / CEOs
  createdAt?: string;
  updatedAt?: string;
};

// Helper utilities to retrieve or realistically compute active/inactive workers and wallet balances
export function getCompanyActiveWorkers(c: Company): number {
  if (typeof c.activeWorkers === 'number') return c.activeWorkers;
  const total = c.totalWorkers || 0;
  return Math.round(total * 0.9);
}

export function getCompanyInactiveWorkers(c: Company): number {
  if (typeof c.inactiveWorkers === 'number') return c.inactiveWorkers;
  const total = c.totalWorkers || 0;
  return Math.max(0, total - getCompanyActiveWorkers(c));
}

export function getCompanyIncomeWallet(c: Company): number {
  if (typeof c.incomeWallet === 'number') return c.incomeWallet;
  const active = getCompanyActiveWorkers(c);
  return active * 450 + 15000;
}

export function getCompanyCostWallet(c: Company): number {
  if (typeof c.costWallet === 'number') return c.costWallet;
  const active = getCompanyActiveWorkers(c);
  return active * 180 + 6000;
}

export function getCompanyProfitWallet(c: Company): number {
  if (typeof c.profitWallet === 'number') return c.profitWallet;
  return Math.max(0, getCompanyIncomeWallet(c) - getCompanyCostWallet(c));
}

export function getCompanyWorkerWallet(c: Company): number {
  if (typeof c.workerWallet === 'number') return c.workerWallet;
  const active = getCompanyActiveWorkers(c);
  return active * 135 + 4500;
}

export const companies: Company[] = [
  {
    id: 'natasha-construction',
    name: 'NATASHA CONSTRUCTION SDN. BHD.',
    roc: 'ROC-201801045921',
    sector: 'Civil & Building Construction',
    description: 'Specialized structural engineering, residential construction, and infrastructure projects.',
    logo: '/images/companies/gamuda.svg',
    tag: 'Verified Entity',
    totalWorkers: 3450,
  },
  {
    id: 'sime-darby',
    name: 'Sime Darby Plantation Berhad',
    roc: 'ROC-197001000284',
    sector: 'Agriculture & Plantation',
    description: 'Premier Malaysian agri-business and sustainable palm oil producer.',
    logo: '/images/companies/sime-darby.svg',
    tag: 'Govt Certified',
    totalWorkers: 14250,
  },
  {
    id: 'gamuda',
    name: 'Gamuda Berhad',
    roc: 'ROC-197601003632',
    sector: 'Infrastructure & Construction',
    description: 'Leading regional infrastructure, tunneling, and mass transit engineering group.',
    logo: '/images/companies/gamuda.svg',
    tag: 'Tier 1 Employer',
    totalWorkers: 8640,
  },
  {
    id: 'top-glove',
    name: 'Top Glove Corporation Bhd',
    roc: 'ROC-199801018294',
    sector: 'Manufacturing & Healthcare',
    description: 'World’s largest personal protection equipment and glove manufacturer.',
    logo: '/images/companies/top-glove.svg',
    tag: 'Verified JIM',
    totalWorkers: 11800,
  },
  {
    id: 'genting',
    name: 'Genting Malaysia Berhad',
    roc: 'ROC-198001004238',
    sector: 'Hospitality & Services',
    description: 'Integrated leisure, resort entertainment, and premier hospitality operations.',
    logo: '/images/companies/genting.svg',
    tag: 'Major Sponsor',
    totalWorkers: 7920,
  },
  {
    id: 'ioi-group',
    name: 'IOI Corporation Berhad',
    roc: 'ROC-196901000889',
    sector: 'Agri-Commodity & Processing',
    description: 'Leading international palm oil processing and resource-based industrial group.',
    logo: '/images/companies/ioi-group.svg',
    tag: 'Verified Entity',
    totalWorkers: 9450,
  },
  {
    id: 'sunway',
    name: 'Sunway Construction Group',
    roc: 'ROC-201401032422',
    sector: 'Engineering & Development',
    description: 'Leading civil engineering, building contractor, and smart township developer.',
    logo: '/images/companies/sunway.svg',
    tag: 'Verified JIM',
    totalWorkers: 6830,
  },
];
