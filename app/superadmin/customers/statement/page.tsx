'use client';

import CustomerFinancialLedgerPage from '@/components/CustomerFinancialLedgerPage';

export default function SuperAdminCustomerStatementPage() {
  return (
    <CustomerFinancialLedgerPage
      portalType="superadmin"
      backUrl="/superadmin/customers"
    />
  );
}
