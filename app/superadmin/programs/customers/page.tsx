'use client';

import { Suspense } from 'react';
import { RefreshCw } from 'lucide-react';
import ProgramCustomersContent from '@/components/ProgramCustomersContent';

export default function SuperAdminProgramCustomersPage() {
  return (
    <Suspense
      fallback={
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 max-w-7xl mx-auto">
          <RefreshCw size={24} className="animate-spin text-indigo-600 mx-auto mb-3" />
          <p className="text-xs font-semibold text-slate-600">Loading program customers...</p>
        </div>
      }
    >
      <ProgramCustomersContent showTabBar={true} />
    </Suspense>
  );
}
