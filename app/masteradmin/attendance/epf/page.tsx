'use client';

import React from 'react';
import AdminStatutoryContributionManagement from '@/components/AdminStatutoryContributionManagement';

export default function MasterAdminEPFPage() {
  return (
    <AdminStatutoryContributionManagement
      type="epf"
      portalType="masteradmin"
      adminName="Master Admin"
    />
  );
}

