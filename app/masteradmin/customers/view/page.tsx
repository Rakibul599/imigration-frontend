'use client';

import CustomerFormFullPage from '@/components/CustomerFormFullPage';

export default function MasterAdminViewCustomerPage() {
  return (
    <CustomerFormFullPage
      portalType="masteradmin"
      backUrl="/masteradmin/customers"
      initialMode="view"
    />
  );
}
