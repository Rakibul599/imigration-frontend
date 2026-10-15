'use client';

import CustomerFormFullPage from '@/components/CustomerFormFullPage';

export default function MasterAdminCreateCustomerPage() {
  return (
    <CustomerFormFullPage
      portalType="masteradmin"
      backUrl="/masteradmin/customers"
    />
  );
}
