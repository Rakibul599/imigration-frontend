'use client';

import React from 'react';
import AdminEmployeeSalaryManagement from '@/components/AdminEmployeeSalaryManagement';

export default function SuperAdminAttendanceSalaryPage() {
  return (
    <AdminEmployeeSalaryManagement
      portalType="superadmin"
      adminName="Super Admin"
    />
  );
}

