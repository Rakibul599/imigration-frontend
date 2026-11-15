'use client';

import CustomerStatusListing from '@/components/CustomerStatusListing';

export default function MasterAdminInactiveCustomersPage() {
  return <CustomerStatusListing status="inactive" portalType="masteradmin" baseRoute="/masteradmin/customers" />;
}

