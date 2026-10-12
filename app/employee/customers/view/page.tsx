'use client';

import CustomerFormFullPage from '@/components/CustomerFormFullPage';

export default function EmployeeViewCustomerPage() {
  return (
    <CustomerFormFullPage
      portalType="employee"
      backUrl="/employee/customers"
      initialMode="view"
    />
  );
}
