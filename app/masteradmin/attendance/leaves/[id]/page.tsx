'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import AdminLeaveDetailsSubpage from '@/components/AdminLeaveDetailsSubpage';

export default function MasteradminLeaveDetailsPage() {
  const params = useParams();
  const id = Array.isArray(params?.id) ? params.id[0] : params?.id || '';

  return <AdminLeaveDetailsSubpage leaveId={id} portalType="masteradmin" adminName="Master Admin" />;
}
