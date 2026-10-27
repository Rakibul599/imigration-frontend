'use client';

import React from 'react';
import AdminAssignJoiningLetterSubpage from '@/components/AdminAssignJoiningLetterSubpage';

export default function SuperAdminNewJoiningLetterPage() {
  return (
    <AdminAssignJoiningLetterSubpage
      portalType="superadmin"
      adminName="Super Admin"
    />
  );
}
