'use client';

import React from 'react';
import AdminEmployeeSalaryManagement from '@/components/AdminEmployeeSalaryManagement';

export default function MasterAdminAttendanceSalaryPage() {
  return (
    <AdminEmployeeSalaryManagement
      portalType="masteradmin"
      adminName="Master Admin"
    />
  );
}

