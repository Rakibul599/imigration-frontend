'use client';

import React from 'react';
import AdminEmployeeWalletManagement from '@/components/AdminEmployeeWalletManagement';

export default function FrontendSuperAdminSocsoWalletPage() {
  return (
    <AdminEmployeeWalletManagement
      portalType="superadmin"
      adminName="Super Admin"
      initialTab="socso"
    />
  );
}
