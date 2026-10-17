'use client';

import { Suspense } from 'react';
import AttendanceCardListDrilldown from '@/components/AttendanceCardListDrilldown';

export default function SuperAdminAttendanceListPage() {
  return (
    <Suspense
      fallback={
        <div className="p-12 text-center text-xs font-semibold text-slate-400">
          Loading attendance records list...
        </div>
      }
    >
      <AttendanceCardListDrilldown portalType="superadmin" />
    </Suspense>
  );
}
