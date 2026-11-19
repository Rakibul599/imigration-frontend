'use client';

import React from 'react';
import AdminStatutoryContributionManagement from '@/components/AdminStatutoryContributionManagement';

export default function SuperAdminSOCSOPage() {
  return (
    <AdminStatutoryContributionManagement
      type="socso"
      portalType="superadmin"
      adminName="Super Admin"
    />
  );
}

