'use client';

import CustomerStatusListing from '@/components/CustomerStatusListing';

export default function MasterAdminRunawayCustomersPage() {
  return <CustomerStatusListing status="runaway" portalType="masteradmin" baseRoute="/masteradmin/customers" />;
}

