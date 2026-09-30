'use client';

import { useParams } from 'next/navigation';
import EmployeeFormFullPage from '@/components/EmployeeFormFullPage';

export default function EditEmployeePage() {
  const params = useParams();
  const id = params?.id as string | undefined;

  return <EmployeeFormFullPage editId={id} backUrl="/superadmin/employees" />;
}
