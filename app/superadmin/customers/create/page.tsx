'use client';

import CustomerFormFullPage from '@/components/CustomerFormFullPage';

export default function SuperAdminCreateCustomerPage() {
  return (
    <CustomerFormFullPage
      portalType="superadmin"
      backUrl="/superadmin/customers"
    />
  );
}
