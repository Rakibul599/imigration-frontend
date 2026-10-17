'use client';

import React from 'react';
import AdminAssignResignationSubpage from '@/components/AdminAssignResignationSubpage';

export default function SuperadminNewResignationPage() {
  return (
    <AdminAssignResignationSubpage
      portalType="superadmin"
      adminName="Super Admin"
    />
  );
}
