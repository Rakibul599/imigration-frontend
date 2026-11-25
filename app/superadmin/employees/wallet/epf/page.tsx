'use client';

import React from 'react';
import AdminEmployeeWalletManagement from '@/components/AdminEmployeeWalletManagement';

export default function FrontendSuperAdminEpfWalletPage() {
  return (
    <AdminEmployeeWalletManagement
      portalType="superadmin"
      adminName="Super Admin"
      initialTab="epf"
    />
  );
}
