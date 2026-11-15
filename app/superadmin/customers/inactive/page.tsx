'use client';

import CustomerStatusListing from '@/components/CustomerStatusListing';

export default function SuperAdminInactiveCustomersPage() {
  return <CustomerStatusListing status="inactive" portalType="superadmin" baseRoute="/superadmin/customers" />;
}

