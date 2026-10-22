import React from 'react';
import OfficeLocationForm from '@/components/OfficeLocationForm';

export const metadata = {
  title: 'Register Office Geofence Location | Agency Attendance',
  description: 'Add new office geofence location with interactive map preview and boundary controls',
};

export default function NewOfficeLocationPage() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-slate-50/60 min-h-screen">
      <OfficeLocationForm isEdit={false} />
    </div>
  );
}
