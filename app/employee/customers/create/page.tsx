'use client';

import CustomerFormFullPage from '@/components/CustomerFormFullPage';

export default function EmployeeCreateCustomerPage() {
  return (
    <CustomerFormFullPage
      portalType="employee"
      backUrl="/employee/customers"
    />
  );
}
