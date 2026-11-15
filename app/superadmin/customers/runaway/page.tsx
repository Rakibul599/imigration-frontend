'use client';

import CustomerStatusListing from '@/components/CustomerStatusListing';

export default function SuperAdminRunawayCustomersPage() {
  return <CustomerStatusListing status="runaway" portalType="superadmin" baseRoute="/superadmin/customers" />;
}

