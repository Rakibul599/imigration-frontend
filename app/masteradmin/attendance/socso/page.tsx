'use client';

import React from 'react';
import AdminStatutoryContributionManagement from '@/components/AdminStatutoryContributionManagement';

export default function MasterAdminSOCSOPage() {
  return (
    <AdminStatutoryContributionManagement
      type="socso"
      portalType="masteradmin"
      adminName="Master Admin"
    />
  );
}

