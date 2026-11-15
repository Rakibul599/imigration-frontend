'use client';

import CustomerStatusListing from '@/components/CustomerStatusListing';

export default function SuperAdminActiveCustomersPage() {
  return <CustomerStatusListing status="active" portalType="superadmin" baseRoute="/superadmin/customers" />;
}

