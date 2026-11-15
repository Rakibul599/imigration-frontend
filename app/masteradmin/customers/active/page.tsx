'use client';

import CustomerStatusListing from '@/components/CustomerStatusListing';

export default function MasterAdminActiveCustomersPage() {
  return <CustomerStatusListing status="active" portalType="masteradmin" baseRoute="/masteradmin/customers" />;
}

