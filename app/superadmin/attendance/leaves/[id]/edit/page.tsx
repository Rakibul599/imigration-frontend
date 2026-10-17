'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import AdminLeaveEditSubpage from '@/components/AdminLeaveEditSubpage';

export default function SuperadminLeaveEditPage() {
  const params = useParams();
  const id = Array.isArray(params?.id) ? params.id[0] : params?.id || '';

  return <AdminLeaveEditSubpage leaveId={id} portalType="superadmin" adminName="Super Admin" />;
}
