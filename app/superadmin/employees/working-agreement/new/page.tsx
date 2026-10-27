'use client';

import React from 'react';
import AdminAssignWorkingAgreementSubpage from '@/components/AdminAssignWorkingAgreementSubpage';

export default function SuperAdminNewWorkingAgreementPage() {
  return (
    <AdminAssignWorkingAgreementSubpage
      portalType="superadmin"
      adminName="Super Admin"
    />
  );
}
