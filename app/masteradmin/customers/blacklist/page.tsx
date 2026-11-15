'use client';

import CustomerStatusListing from '@/components/CustomerStatusListing';

export default function MasterAdminBlacklistCustomersPage() {
  return <CustomerStatusListing status="blacklist" portalType="masteradmin" baseRoute="/masteradmin/customers" />;
}

