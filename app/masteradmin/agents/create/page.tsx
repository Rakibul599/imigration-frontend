'use client';

import AgentCreateContent from '@/components/AgentCreateContent';

export default function MasterAdminAgentCreatePage() {
  return (
    <AgentCreateContent
      portalType="masteradmin"
      backUrl="/masteradmin/agents"
    />
  );
}

