'use client';

import { Suspense } from 'react';
import AgentWiseCustomersContent from '@/components/AgentWiseCustomersContent';

export default function FrontendSuperAdminAgentWiseCustomersPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[360px]">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-slate-200 border-t-[#0b4da2]"></div>
        </div>
      }
    >
      <AgentWiseCustomersContent
        portalType="frontend_superadmin"
        backUrl="/superadmin/agents"
      />
    </Suspense>
  );
}
