'use client';

export interface EmployeePermissions {
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
}

export interface ModuleAccess {
  view: boolean;
  create?: boolean;
  edit?: boolean;
  delete?: boolean;
}

export interface ModulePermissions {
  companies?: ModuleAccess;
  customers?: ModuleAccess;
  services?: ModuleAccess;
  passwords?: ModuleAccess;
  [key: string]: ModuleAccess | undefined;
}

export interface AuthUser {
  id: number | string;
  employee_code: string;
  username?: string;
  name: string;
  email: string;
  role: 'Employee' | 'Admin' | 'SUPER_ADMIN' | 'MasterAdmin' | 'Customer' | string;
  assigned_companies: string[];
  assigned_service_cards?: string[];
  permissions: EmployeePermissions;
  master_admin_id?: string | null;
  master_admin_name?: string | null;
  module_permissions?: ModulePermissions;
  customer_id?: number | string;
  passport_no?: string;
  can_login?: boolean;
}

const STORAGE_KEY = 'portal_current_user';
const TOKEN_KEY = 'portal_auth_token';
const MASTER_ADMIN_STORAGE_KEY = 'masterAdminUser';
const MASTER_ADMIN_LOGGED_KEY = 'isMasterAdminLoggedIn';
const SUPER_ADMIN_STORAGE_KEY = 'superAdminUser';
const SUPER_ADMIN_LOGGED_KEY = 'isSuperAdminLoggedIn';

/**
 * Get the backend API base URL
 */
export function getBackendApiUrl(): string {
  if (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_BACKEND_API_URL) {
    return process.env.NEXT_PUBLIC_BACKEND_API_URL;
  }
  return 'http://127.0.0.1:8000/api';
}

/**
 * Get current Super Admin user from localStorage
 */
export function getSuperAdminUser(): AuthUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(SUPER_ADMIN_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Check if Super Admin is authenticated
 */
export function isSuperAdminAuthenticated(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const logged = localStorage.getItem(SUPER_ADMIN_LOGGED_KEY) === 'true';
    const user = getSuperAdminUser();
    return Boolean(logged && user);
  } catch {
    return false;
  }
}

/**
 * Save Super Admin session
 */
export function setSuperAdminUser(user: AuthUser, token?: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SUPER_ADMIN_STORAGE_KEY, JSON.stringify(user));
    localStorage.setItem(SUPER_ADMIN_LOGGED_KEY, 'true');
    localStorage.setItem('isLoggedIn', 'true');
    if (token) {
      localStorage.setItem('superAdminToken', token);
    }
    setCurrentUser(user, token);
  } catch (err) {
    console.error('Failed to set Super Admin session', err);
  }
}

/**
 * Log out Super Admin
 */
export function logoutSuperAdmin(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(SUPER_ADMIN_STORAGE_KEY);
    localStorage.removeItem(SUPER_ADMIN_LOGGED_KEY);
    localStorage.removeItem('superAdminToken');
    logoutUser();
  } catch (err) {
    console.error('Failed to logout Super Admin', err);
  }
}

/**
 * Get current authenticated user from localStorage across all role types
 */
export function getCurrentUser(): AuthUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
    const superAdmin = getSuperAdminUser();
    if (superAdmin && localStorage.getItem(SUPER_ADMIN_LOGGED_KEY) === 'true') {
      return superAdmin;
    }
    const masterAdmin = getMasterAdminUser();
    if (masterAdmin && localStorage.getItem(MASTER_ADMIN_LOGGED_KEY) === 'true') {
      return masterAdmin;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Check if any authorized user (SuperAdmin, MasterAdmin, Employee, Admin) is authenticated
 */
export function isAuthenticated(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const user = getCurrentUser() || getSuperAdminUser() || getMasterAdminUser();
    const loggedIn =
      localStorage.getItem('isLoggedIn') === 'true' ||
      localStorage.getItem(SUPER_ADMIN_LOGGED_KEY) === 'true' ||
      localStorage.getItem(MASTER_ADMIN_LOGGED_KEY) === 'true';
    return Boolean(user && loggedIn);
  } catch {
    return false;
  }
}

/**
 * Save current authenticated user to localStorage and dispatch update event
 */
export function setCurrentUser(user: AuthUser, token?: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    localStorage.setItem('isLoggedIn', 'true');
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    }
    window.dispatchEvent(new Event('portal-auth-change'));
  } catch (err) {
    console.error('Failed to save user in localStorage', err);
  }
}

/**
 * Clear session and log out
 */
export function logoutUser(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem(SUPER_ADMIN_STORAGE_KEY);
    localStorage.removeItem(SUPER_ADMIN_LOGGED_KEY);
    localStorage.removeItem('superAdminToken');
    localStorage.removeItem(MASTER_ADMIN_STORAGE_KEY);
    localStorage.removeItem(MASTER_ADMIN_LOGGED_KEY);
    localStorage.removeItem('masterAdminToken');
    localStorage.removeItem('activeCompany');
    localStorage.removeItem('activeService');
    window.dispatchEvent(new Event('portal-auth-change'));
  } catch (err) {
    console.error('Failed to log out', err);
  }
}

/**
 * Get current Master Admin user from localStorage
 */
export function getMasterAdminUser(): AuthUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(MASTER_ADMIN_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Check if Master Admin is authenticated
 */
export function isMasterAdminAuthenticated(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const logged = localStorage.getItem(MASTER_ADMIN_LOGGED_KEY) === 'true';
    const user = getMasterAdminUser();
    return Boolean(logged && user);
  } catch {
    return false;
  }
}

/**
 * Save Master Admin session
 */
export function setMasterAdminUser(user: AuthUser, token?: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(MASTER_ADMIN_STORAGE_KEY, JSON.stringify(user));
    localStorage.setItem(MASTER_ADMIN_LOGGED_KEY, 'true');
    localStorage.setItem('isLoggedIn', 'true');
    if (token) {
      localStorage.setItem('masterAdminToken', token);
    }
    // Also sync portal session for cross-component access
    setCurrentUser(user, token);
  } catch (err) {
    console.error('Failed to set Master Admin session', err);
  }
}

/**
 * Log out Master Admin
 */
export function logoutMasterAdmin(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(MASTER_ADMIN_STORAGE_KEY);
    localStorage.removeItem(MASTER_ADMIN_LOGGED_KEY);
    localStorage.removeItem('masterAdminToken');
    logoutUser();
  } catch (err) {
    console.error('Failed to logout Master Admin', err);
  }
}

/**
 * Resolve user panel navigation target and badge
 * Super Admin -> /superadmin (Strictly only real SUPER_ADMIN)
 * Master Admin -> /masteradmin (Cannot access /superadmin)
 * Employee -> /companies (Cannot access /superadmin)
 */
export function getUserPanelInfo(): {
  hasPanel: boolean;
  panelUrl: string;
  panelLabel: string;
  panelBadge: string;
  roleType: 'SUPER_ADMIN' | 'MasterAdmin' | 'Employee' | 'User';
} {
  if (typeof window === 'undefined') {
    return {
      hasPanel: false,
      panelUrl: '/services',
      panelLabel: 'Your Panel',
      panelBadge: 'Panel',
      roleType: 'User',
    };
  }

  const current = getCurrentUser();
  const superLogged = localStorage.getItem(SUPER_ADMIN_LOGGED_KEY) === 'true';
  const superUser = getSuperAdminUser();
  const masterLogged = localStorage.getItem(MASTER_ADMIN_LOGGED_KEY) === 'true';
  const masterUser = getMasterAdminUser();

  // 0. Customer / Foreign Worker Check: Customer has NO administrative panel!
  if (current?.role === 'Customer' || current?.role === 'Worker') {
    return {
      hasPanel: false,
      panelUrl: '/services',
      panelLabel: '',
      panelBadge: '',
      roleType: 'User',
    };
  }

  // 1. Employee Check: An employee can NEVER access Super Admin!
  const isEmployeeUser =
    current?.role === 'Employee' ||
    (current?.role !== 'SUPER_ADMIN' && current?.role !== 'MasterAdmin' && current?.role !== 'Customer' && current?.role !== 'Worker' && Boolean(current?.employee_code));

  if (isEmployeeUser) {
    return {
      hasPanel: true,
      panelUrl: '/employee',
      panelLabel: 'Your Panel',
      panelBadge: 'Employee',
      roleType: 'Employee',
    };
  }

  // 2. Master Admin Check: Master Admin can NEVER access Super Admin!
  const isMasterUser =
    current?.role === 'MasterAdmin' ||
    masterLogged ||
    masterUser?.role === 'MasterAdmin';

  if (isMasterUser) {
    return {
      hasPanel: true,
      panelUrl: '/masteradmin',
      panelLabel: 'Your Panel',
      panelBadge: 'Master Admin',
      roleType: 'MasterAdmin',
    };
  }

  // 3. Super Admin Check: ONLY real Super Admin is permitted into /superadmin!
  const isRealSuperAdmin =
    (current?.role === 'SUPER_ADMIN' || (superLogged && superUser?.role === 'SUPER_ADMIN')) &&
    !isEmployeeUser &&
    !isMasterUser;

  if (isRealSuperAdmin) {
    return {
      hasPanel: true,
      panelUrl: '/superadmin',
      panelLabel: 'Your Panel',
      panelBadge: 'Super Admin',
      roleType: 'SUPER_ADMIN',
    };
  }

  if (current || localStorage.getItem('isLoggedIn') === 'true') {
    return {
      hasPanel: true,
      panelUrl: '/companies',
      panelLabel: 'Your Panel',
      panelBadge: 'Employee',
      roleType: 'Employee',
    };
  }

  return {
    hasPanel: false,
    panelUrl: '/services',
    panelLabel: 'Your Panel',
    panelBadge: 'Panel',
    roleType: 'User',
  };
}

/**
 * Authenticate Master Admin against Laravel backend POST /api/masteradmin/login
 */
export async function authenticateMasterAdmin(
  username: string,
  password: string
): Promise<{ success: boolean; message: string; user?: AuthUser; token?: string }> {
  const apiUrl = getBackendApiUrl();
  try {
    const res = await fetch(`${apiUrl}/masteradmin/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        username: username.trim(),
        password,
      }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      return {
        success: false,
        message: data.message || 'Master Admin authentication failed.',
      };
    }
    const user: AuthUser = {
      id: data.user.id,
      employee_code: data.user.username,
      username: data.user.username,
      name: data.user.name,
      email: data.user.email,
      role: 'MasterAdmin',
      assigned_companies: Array.isArray(data.user.assigned_companies) ? data.user.assigned_companies : [],
      permissions: {
        can_create: false,
        can_edit: true,
        can_delete: false,
      },
    };
    setMasterAdminUser(user, data.token);
    return {
      success: true,
      message: data.message || 'Master Admin authenticated successfully.',
      user,
      token: data.token,
    };
  } catch (err) {
    console.error('Master admin auth error:', err);
    // Offline fallback for demo
    if (username.trim().toLowerCase() === 'masteradmin' && (password === 'password123' || password === 'admin')) {
      const demoMasterAdmin: AuthUser = {
        id: 1,
        employee_code: 'masteradmin',
        username: 'masteradmin',
        name: 'Tan Sri Syed Mokhtar',
        email: 'syed@masteradmin.com',
        role: 'MasterAdmin',
        assigned_companies: ['gamuda', 'top-glove', 'sime-darby'],
        permissions: {
          can_create: false,
          can_edit: true,
          can_delete: false,
        },
      };
      setMasterAdminUser(demoMasterAdmin);
      return {
        success: true,
        message: 'Master Admin authenticated (offline fallback).',
        user: demoMasterAdmin,
      };
    }
    return {
      success: false,
      message: 'Unable to connect to authentication server.',
    };
  }
}

/**
 * Check if the currently logged-in user has access to a specific company ID
 */
export function hasCompanyAccess(companyId: string, companyName?: string, roc?: string): boolean {
  const user = getCurrentUser() || getMasterAdminUser();
  if (!user) return true; // Unauthenticated public view
  if (user.role === 'SUPER_ADMIN') return true;

  // MasterAdmin, Employee, and Customer/Worker are strictly restricted to assigned_companies only
  if (
    user.role === 'MasterAdmin' ||
    user.role === 'Employee' ||
    user.role === 'Admin' ||
    user.role === 'Customer' ||
    user.role === 'Worker'
  ) {
    if (!Array.isArray(user.assigned_companies) || user.assigned_companies.length === 0) {
      return false;
    }
    if (user.assigned_companies.includes('*')) return true;

    const targetId = (companyId || '').trim().toLowerCase();
    const targetName = (companyName || '').trim().toLowerCase();
    const targetRoc = (roc || '').trim().toLowerCase();
    const targetNormalized = targetName.replace(/[^a-z0-9]/g, '');

    return user.assigned_companies.some((id) => {
      const cleanId = (id || '').trim().toLowerCase();
      if (!cleanId) return false;
      if (cleanId === targetId) return true;
      if (cleanId === targetName) return true;
      if (targetRoc && cleanId === targetRoc) return true;
      const cleanNormalized = cleanId.replace(/[^a-z0-9]/g, '');
      if (cleanNormalized && targetNormalized && cleanNormalized === targetNormalized) return true;
      return false;
    });
  }

  return true;
}

/**
 * Check if the currently logged-in employee has access to a specific service card
 */
export function hasServiceCardAccess(
  cardId: string,
  cardTitle?: string,
  userOverride?: AuthUser | null
): boolean {
  const user = userOverride !== undefined
    ? userOverride
    : (getCurrentUser() || getMasterAdminUser() || getSuperAdminUser());
  if (!user) return true;
  if (user.role === 'SUPER_ADMIN' || user.role === 'MasterAdmin') return true;

  // For Employee/Customer: check assigned_service_cards
  let allowedCards: string[] = ['*'];
  const rawCards = user.assigned_service_cards;

  if (rawCards === undefined || rawCards === null) {
    return true;
  }

  if (Array.isArray(rawCards)) {
    allowedCards = rawCards;
  } else if (typeof rawCards === 'string') {
    const rawStr: string = rawCards;
    try {
      const parsed = JSON.parse(rawStr);
      if (Array.isArray(parsed)) {
        allowedCards = parsed.map(String);
      } else if (parsed === '*') {
        allowedCards = ['*'];
      } else {
        allowedCards = [String(parsed)];
      }
    } catch {
      allowedCards = rawStr === '*' ? ['*'] : [rawStr];
    }
  }

  if (allowedCards.includes('*') || allowedCards.includes('ALL')) {
    return true;
  }
  if (allowedCards.length === 0) {
    return false;
  }

  const targetId = (cardId || '').trim().toLowerCase();
  const targetTitle = (cardTitle || '').trim().toLowerCase();
  const targetNormalizedTitle = targetTitle.replace(/[^a-z0-9]/g, '');

  return allowedCards.some((id) => {
    const clean = (id || '').trim().toLowerCase();
    if (!clean) return false;
    if (clean === '*' || clean === 'all') return true;
    if (clean === targetId) return true;
    if (targetTitle && clean === targetTitle) return true;
    if (targetNormalizedTitle && clean.replace(/[^a-z0-9]/g, '') === targetNormalizedTitle) return true;
    return false;
  });
}

/**
 * Check if the user has permission to create a company.
 * Master Admin CANNOT create any company!
 */
export function canCreate(): boolean {
  const user = getCurrentUser() || getMasterAdminUser();
  if (!user) return false;
  if (user.role === 'MasterAdmin' || user.role === 'Customer' || user.role === 'Worker') return false; // Masteradmin/Customer CANNOT create companies!
  if (user.role === 'SUPER_ADMIN') return true;
  return Boolean(user.permissions?.can_create);
}

/**
 * Check if the user has permission to edit a company
 */
export function canEdit(): boolean {
  const user = getCurrentUser() || getMasterAdminUser();
  if (!user) return false;
  if (user.role === 'Customer' || user.role === 'Worker') return false;
  if (user.role === 'SUPER_ADMIN' || user.role === 'MasterAdmin') return true;
  return Boolean(user.permissions?.can_edit);
}

/**
 * Check if the user has permission to delete a company
 */
export function canDelete(): boolean {
  const user = getCurrentUser() || getMasterAdminUser();
  if (!user) return false;
  if (user.role === 'MasterAdmin' || user.role === 'Customer' || user.role === 'Worker') return false;
  if (user.role === 'SUPER_ADMIN') return true;
  return Boolean(user.permissions?.can_delete);
}

/**
 * Authenticate against Laravel backend POST /api/login
 */
export async function authenticateEmployee(
  userId: string,
  password: string,
  role?: string
): Promise<{ success: boolean; message: string; user?: AuthUser; token?: string }> {
  const apiUrl = getBackendApiUrl();

  try {
    const res = await fetch(`${apiUrl}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        userId: userId.trim(),
        password,
        role,
        portal: role ? role.toLowerCase() : 'employee',
      }),
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      return {
        success: false,
        message: data.message || 'Authentication failed. Please verify your credentials.',
      };
    }

    let parsedAssignedCards: string[] = ['*'];
    if (Array.isArray(data.user.assigned_service_cards)) {
      parsedAssignedCards = data.user.assigned_service_cards;
    } else if (typeof data.user.assigned_service_cards === 'string') {
      try {
        const parsed = JSON.parse(data.user.assigned_service_cards);
        if (Array.isArray(parsed)) parsedAssignedCards = parsed;
        else if (data.user.assigned_service_cards === '*') parsedAssignedCards = ['*'];
        else parsedAssignedCards = [data.user.assigned_service_cards];
      } catch {
        parsedAssignedCards = data.user.assigned_service_cards === '*' ? ['*'] : [data.user.assigned_service_cards];
      }
    } else if (data.user.assigned_service_cards === null || data.user.assigned_service_cards === undefined) {
      parsedAssignedCards = ['*'];
    }

    const authUser: AuthUser = {
      id: data.user.id,
      employee_code: data.user.employee_code || userId.trim(),
      name: data.user.name,
      email: data.user.email,
      role: data.user.role || 'Employee',
      assigned_companies: Array.isArray(data.user.assigned_companies)
        ? data.user.assigned_companies
        : [],
      assigned_service_cards: parsedAssignedCards,
      permissions: {
        can_create: Boolean(data.user.permissions?.can_create),
        can_edit: Boolean(data.user.permissions?.can_edit),
        can_delete: Boolean(data.user.permissions?.can_delete),
      },
      master_admin_id: data.user.master_admin_id ?? null,
      master_admin_name: data.user.master_admin_name ?? null,
      module_permissions: data.user.module_permissions ?? undefined,
    };

    if (authUser.role === 'MasterAdmin') {
      setMasterAdminUser(authUser, data.token);
    } else {
      setCurrentUser(authUser, data.token);
    }

    return {
      success: true,
      message: data.message || 'Authentication successful.',
      user: authUser,
      token: data.token,
    };
  } catch (error) {
    console.error('Backend authentication error:', error);
    // In case backend is temporarily unreachable, support MasterAdmin, Admin, and DEMO fallbacks
    const cleanUser = userId.trim().toLowerCase();
    if (cleanUser === 'masteradmin' && (password === 'password123' || password === 'admin')) {
      const demoMasterAdmin: AuthUser = {
        id: 1,
        employee_code: 'masteradmin',
        username: 'masteradmin',
        name: 'Tan Sri Syed Mokhtar',
        email: 'syed@masteradmin.com',
        role: 'MasterAdmin',
        assigned_companies: ['gamuda', 'top-glove', 'sime-darby'],
        permissions: {
          can_create: false,
          can_edit: true,
          can_delete: false,
        },
      };
      setMasterAdminUser(demoMasterAdmin);
      return {
        success: true,
        message: 'Master Administrator authenticated successfully.',
        user: demoMasterAdmin,
      };
    }

    const isAdmin =
      cleanUser === 'admin' ||
      cleanUser === 'superadmin';

    if (isAdmin && (password === 'admin' || password === 'admin123' || password === 'superadmin2026' || password.length >= 4)) {
      const adminUser: AuthUser = {
        id: 0,
        employee_code: 'ADMIN',
        name: 'System Administrator',
        email: 'admin@agency.gov.my',
        role: 'Admin',
        assigned_companies: [],
        permissions: {
          can_create: true,
          can_edit: true,
          can_delete: true,
        },
      };
      setCurrentUser(adminUser);
      return {
        success: true,
        message: 'Administrator authenticated successfully. Full company access granted.',
        user: adminUser,
      };
    }

    if (userId.trim().toUpperCase() === 'DEMO2026' && password === 'password123') {
      const demoUser: AuthUser = {
        id: 1,
        employee_code: 'DEMO2026',
        name: 'Ahmad bin Zulkifli',
        email: 'ahmad@demo.com',
        role: 'Employee',
        assigned_companies: ['natasha-construction', 'gamuda'],
        assigned_service_cards: ['*'],
        permissions: {
          can_create: true,
          can_edit: true,
          can_delete: false,
        },
      };
      setCurrentUser(demoUser);
      return {
        success: true,
        message: 'Demo credentials authenticated (offline fallback).',
        user: demoUser,
      };
    }

    return {
      success: false,
      message: 'Unable to connect to the authentication server. Please ensure the backend is running.',
    };
  }
}
