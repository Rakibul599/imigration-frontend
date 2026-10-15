'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import EmployeeFormFullPage from '@/components/EmployeeFormFullPage';

function EditEmployeeContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id') || undefined;

  return <EmployeeFormFullPage editId={id} backUrl="/superadmin/employees" />;
}

export default function EditEmployeePage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 max-w-[1140px] mx-auto flex items-center justify-center min-h-[400px]">
          <div className="flex flex-col items-center gap-3 text-slate-500">
            <div className="w-8 h-8 border-3 border-[#0b4da2] border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-semibold">Loading employee editor...</span>
          </div>
        </div>
      }
    >
      <EditEmployeeContent />
    </Suspense>
  );
}
