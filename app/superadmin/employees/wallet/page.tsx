'use client';

import React from 'react';
import AdminEmployeeWalletManagement from '@/components/AdminEmployeeWalletManagement';

export default function SuperAdminEmployeeWalletPage() {
  return (
    <AdminEmployeeWalletManagement
      portalType="superadmin"
      adminName="Super Admin"
    />
  );
}
