'use client';

import CustomerDashboardContent from '@/components/CustomerDashboardContent';

export default function SuperAdminCustomerDashboardPage() {
  return <CustomerDashboardContent portalType="superadmin" baseRoute="/superadmin/customers" />;
}

