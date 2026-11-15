'use client';

import CustomerStatusListing from '@/components/CustomerStatusListing';

export default function SuperAdminBlackListCustomersPage() {
  return <CustomerStatusListing status="blacklist" portalType="superadmin" baseRoute="/superadmin/customers" />;
}

