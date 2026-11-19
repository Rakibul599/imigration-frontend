'use client';

import React from 'react';
import AdminStatutoryContributionManagement from '@/components/AdminStatutoryContributionManagement';

export default function SuperAdminEPFPage() {
  return (
    <AdminStatutoryContributionManagement
      type="epf"
      portalType="superadmin"
      adminName="Super Admin"
    />
  );
}

