'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import OfficeLocationForm from '@/components/OfficeLocationForm';
import { OfficeLocation, getOfficeLocationById } from '@/lib/officeLocationStorage';
import Link from 'next/link';
import { ArrowLeft, AlertCircle } from 'lucide-react';

export default function EditOfficeLocationPage() {
  const params = useParams();
  const id = params?.id as string;

  const [location, setLocation] = useState<OfficeLocation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let isMounted = true;

    async function load() {
      try {
        setLoading(true);
        const data = await getOfficeLocationById(id);
        if (isMounted) {
          if (data) {
            setLocation(data);
          } else {
            setError('Office location not found.');
          }
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || 'Failed to load office location.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      isMounted = false;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="p-8 min-h-screen bg-slate-50/60 flex flex-col items-center justify-center gap-3 text-slate-500">
        <div className="w-10 h-10 rounded-full border-3 border-blue-600 border-t-transparent animate-spin" />
        <span className="text-sm font-semibold">Loading office location details...</span>
      </div>
    );
  }

  if (error || !location) {
    return (
      <div className="p-8 min-h-screen bg-slate-50/60 flex flex-col items-center justify-center gap-4 text-center">
        <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-200">
          <AlertCircle size={28} />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900 m-0">Location Not Found</h2>
          <p className="text-xs text-slate-500 mt-1">{error || 'This office location could not be located.'}</p>
        </div>
        <Link
          href="/superadmin/attendance/settings?tab=geofence"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0b4da2] text-white text-xs font-bold no-underline hover:bg-[#083c80] transition"
        >
          <ArrowLeft size={14} />
          <span>Back to Geofence Settings</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-slate-50/60 min-h-screen">
      <OfficeLocationForm initialLocation={location} isEdit={true} />
    </div>
  );
}
