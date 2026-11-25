'use client';

import CustomerFinancialLedgerPage from '@/components/CustomerFinancialLedgerPage';

export default function MasterAdminCustomerStatementPage() {
  return (
    <CustomerFinancialLedgerPage
      portalType="masteradmin"
      backUrl="/masteradmin/customers"
    />
  );
}
