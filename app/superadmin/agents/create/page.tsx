'use client';

import AgentCreateContent from '@/components/AgentCreateContent';

export default function FrontendSuperAdminAgentCreatePage() {
  return (
    <AgentCreateContent
      portalType="frontend_superadmin"
      backUrl="/superadmin/agents"
    />
  );
}
