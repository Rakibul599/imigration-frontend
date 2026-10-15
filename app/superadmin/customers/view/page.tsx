'use client';

import CustomerFormFullPage from '@/components/CustomerFormFullPage';

export default function SuperAdminViewCustomerPage() {
  return (
    <CustomerFormFullPage
      portalType="superadmin"
      backUrl="/superadmin/customers"
      initialMode="view"
    />
  );
}
