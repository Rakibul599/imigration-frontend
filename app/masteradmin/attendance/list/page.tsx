'use client';

import { Suspense } from 'react';
import AttendanceCardListDrilldown from '@/components/AttendanceCardListDrilldown';

export default function MasterAdminAttendanceListPage() {
  return (
    <Suspense
      fallback={
        <div className="p-12 text-center text-xs font-semibold text-slate-400">
          Loading master admin attendance records list...
        </div>
      }
    >
      <AttendanceCardListDrilldown portalType="masteradmin" />
    </Suspense>
  );
}
