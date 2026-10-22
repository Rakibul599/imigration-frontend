'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import {
  ArrowLeft,
  MapPin,
  Crosshair,
  RefreshCw,
  Check,
  AlertTriangle,
  Building2,
  Shapes,
  CircleDot,
  CheckCircle2,
  Info,
  Sliders,
  Compass,
  FileText,
} from 'lucide-react';
import {
  OfficeLocation,
  PolygonPoint,
  createOfficeLocation,
  updateOfficeLocation,
  detectUserCoordinates,
  calculatePolygonAreaSqMeters,
  calculatePolygonPerimeterMeters,
} from '@/lib/officeLocationStorage';

const GeofenceMapPicker = dynamic(() => import('@/components/GeofenceMapPicker'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[520px] bg-slate-900 rounded-3xl flex flex-col items-center justify-center gap-3 text-slate-400 border border-slate-800">
      <div className="w-10 h-10 rounded-full border-3 border-blue-500 border-t-transparent animate-spin" />
      <span className="text-sm font-medium">Loading high-resolution interactive map...</span>
    </div>
  ),
});

interface OfficeLocationFormProps {
  initialLocation?: OfficeLocation | null;
  isEdit?: boolean;
}

export default function OfficeLocationForm({
  initialLocation,
  isEdit = false,
}: OfficeLocationFormProps) {
  const router = useRouter();

  const [name, setName] = useState(initialLocation?.name || '');
  const [address, setAddress] = useState(initialLocation?.address || '');
  const [latitude, setLatitude] = useState(
    initialLocation?.latitude ? String(initialLocation.latitude) : '3.139000'
  );
  const [longitude, setLongitude] = useState(
    initialLocation?.longitude ? String(initialLocation.longitude) : '101.686900'
  );
  const [radiusMeters, setRadiusMeters] = useState<number>(
    initialLocation?.radius_meters || 150
  );
  const [geofenceType, setGeofenceType] = useState<'circle' | 'polygon'>(
    initialLocation?.geofence_type || 'circle'
  );
  const [polygonCoordinates, setPolygonCoordinates] = useState<PolygonPoint[]>(
    initialLocation && Array.isArray(initialLocation.polygon_coordinates)
      ? initialLocation.polygon_coordinates
      : []
  );
  const [isActive, setIsActive] = useState(
    initialLocation?.is_active !== undefined ? initialLocation.is_active : true
  );
  const [notes, setNotes] = useState(initialLocation?.notes || '');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDetectingGps, setIsDetectingGps] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // If initialLocation changes (e.g. async fetch)
  useEffect(() => {
    if (initialLocation) {
      setName(initialLocation.name);
      setAddress(initialLocation.address || '');
      setLatitude(String(initialLocation.latitude));
      setLongitude(String(initialLocation.longitude));
      setRadiusMeters(initialLocation.radius_meters || 150);
      setGeofenceType(initialLocation.geofence_type || 'circle');
      if (Array.isArray(initialLocation.polygon_coordinates)) {
        setPolygonCoordinates(initialLocation.polygon_coordinates);
      }
      setIsActive(initialLocation.is_active);
      setNotes(initialLocation.notes || '');
    }
  }, [initialLocation]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Get Current Location handler
  const handleDetectGPS = async () => {
    setIsDetectingGps(true);
    setErrorMessage(null);
    try {
      const coords = await detectUserCoordinates();
      setLatitude(coords.latitude.toFixed(6));
      setLongitude(coords.longitude.toFixed(6));
      showToast(
        `Location detected successfully via ${
          coords.source === 'gps' ? 'Device GPS' : 'High-Accuracy Network IP'
        }!`
      );
    } catch (err: any) {
      setErrorMessage(err.message || 'Could not fetch current coordinates.');
    } finally {
      setIsDetectingGps(false);
    }
  };

  // Form Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    if (!name.trim()) {
      setErrorMessage('Please enter the office or facility name.');
      return;
    }
    if (isNaN(lat) || lat < -90 || lat > 90) {
      setErrorMessage('Please enter a valid Latitude between -90 and 90.');
      return;
    }
    if (isNaN(lng) || lng < -180 || lng > 180) {
      setErrorMessage('Please enter a valid Longitude between -180 and 180.');
      return;
    }

    if (geofenceType === 'polygon' && (!polygonCoordinates || polygonCoordinates.length < 3)) {
      setErrorMessage(
        'Please define at least 3 corner points for the Polygon room geofence (or click Reset 25m Room on the map).'
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        name: name.trim(),
        address: address.trim() || undefined,
        latitude: lat,
        longitude: lng,
        radius_meters: radiusMeters,
        geofence_type: geofenceType,
        polygon_coordinates: geofenceType === 'polygon' ? polygonCoordinates : null,
        is_active: isActive,
        notes: notes.trim() || undefined,
      };

      if (isEdit && initialLocation) {
        await updateOfficeLocation(initialLocation.id, payload);
      } else {
        await createOfficeLocation(payload);
      }

      router.push('/superadmin/attendance/settings?tab=geofence');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save office location.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const parsedLat = parseFloat(latitude) || 3.139;
  const parsedLng = parseFloat(longitude) || 101.6869;
  const polygonArea = calculatePolygonAreaSqMeters(polygonCoordinates);
  const polygonPerimeter = calculatePolygonPerimeterMeters(polygonCoordinates);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-2.5 px-5 py-3 rounded-2xl bg-emerald-600 text-white shadow-xl text-xs font-semibold animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 size={16} className="shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Breadcrumb & Header Banner */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Link
                href="/superadmin/attendance/settings?tab=geofence"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-[#0b4da2] transition-colors no-underline"
              >
                <ArrowLeft size={14} />
                <span>Office Geofence Settings</span>
              </Link>
              <span className="text-slate-300">•</span>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#0b4da2] bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100">
                {isEdit ? 'Edit Geofence' : 'New Office Location'}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight m-0 flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 text-[#0b4da2] flex items-center justify-center border border-blue-100 shadow-2xs">
                <MapPin size={22} />
              </div>
              <span>{isEdit ? 'Edit Office Geofence Perimeter' : 'Add Office Geofence Location'}</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1.5 max-w-3xl m-0 leading-relaxed">
              Define the physical perimeter where employees are authorized to clock in. You can choose
              between a circular radial boundary or custom polygon room corners.
            </p>
          </div>

          <div className="flex items-center gap-2.5 self-start sm:self-center">
            <Link
              href="/superadmin/attendance/settings?tab=geofence"
              className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition shadow-2xs no-underline inline-flex items-center gap-1.5"
            >
              <ArrowLeft size={14} />
              <span>Cancel</span>
            </Link>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-[#0b4da2] hover:bg-[#083c80] text-white text-xs font-bold transition shadow-sm hover:shadow cursor-pointer border-0 disabled:opacity-50 inline-flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Check size={15} />
                  <span>{isEdit ? 'Update Location' : 'Save Office Location'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Main 2-Column Grid */}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Controls & Form Inputs (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          {/* Error Message */}
          {errorMessage && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2.5 shadow-2xs">
              <AlertTriangle size={18} className="shrink-0 text-rose-600" />
              <span className="font-medium leading-relaxed">{errorMessage}</span>
            </div>
          )}

          {/* Section 1: Office General Information */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
              <Building2 size={18} className="text-[#0b4da2]" />
              <h2 className="text-sm font-bold text-slate-900 m-0">Facility Details</h2>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Office / Branch Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Main Head Office (HQ), Subang Logistics Hub"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-xs font-medium text-slate-800 focus:bg-white focus:border-[#0b4da2] focus:ring-2 focus:ring-blue-100 focus:outline-hidden transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Street Address (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Level 24, Petronas Tower 3, Kuala Lumpur"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-xs font-medium text-slate-800 focus:bg-white focus:border-[#0b4da2] focus:ring-2 focus:ring-blue-100 focus:outline-hidden transition"
              />
            </div>

            {/* Prominent Get Current Location button */}
            <div className="pt-1">
              <button
                type="button"
                onClick={handleDetectGPS}
                disabled={isDetectingGps}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-gradient-to-r from-[#0b4da2] to-blue-700 hover:from-[#083c80] hover:to-blue-800 text-white font-bold text-xs transition-all shadow-md hover:shadow-lg cursor-pointer border-0 disabled:opacity-50"
              >
                {isDetectingGps ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    <span>Detecting GPS Coordinates...</span>
                  </>
                ) : (
                  <>
                    <Crosshair size={18} />
                    <span>Get Current Location (Auto-Detect GPS)</span>
                  </>
                )}
              </button>
              <p className="text-[11px] text-slate-400 mt-1.5 text-center leading-tight">
                Instantly queries device GPS/Network IP and moves the center pin here.
              </p>
            </div>

            {/* Latitude & Longitude Inputs */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Latitude <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  placeholder="e.g. 3.139000"
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-xs font-mono font-bold text-slate-800 focus:bg-white focus:border-[#0b4da2] focus:outline-hidden"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Longitude <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  placeholder="e.g. 101.686900"
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-xs font-mono font-bold text-slate-800 focus:bg-white focus:border-[#0b4da2] focus:outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Geofence Shape & Perimeter Configuration */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <Compass size={18} className="text-[#0b4da2]" />
                <h2 className="text-sm font-bold text-slate-900 m-0">Geofence Boundary Type</h2>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Rule Engine
              </span>
            </div>

            {/* Mode Select Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setGeofenceType('circle')}
                className={`p-3.5 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between ${
                  geofenceType === 'circle'
                    ? 'border-[#0b4da2] bg-blue-50/50 ring-2 ring-[#0b4da2]/20'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <div className="w-8 h-8 rounded-xl bg-blue-100 text-[#0b4da2] flex items-center justify-center">
                    <CircleDot size={18} />
                  </div>
                  {geofenceType === 'circle' && (
                    <span className="w-2.5 h-2.5 rounded-full bg-[#0b4da2]" />
                  )}
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">Circle Radius</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Circular perimeter from center pin</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setGeofenceType('polygon')}
                className={`p-3.5 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between ${
                  geofenceType === 'polygon'
                    ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-600/20'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                    <Shapes size={18} />
                  </div>
                  {geofenceType === 'polygon' && (
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                  )}
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">Polygon / Room</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Custom room &amp; building perimeter</div>
                </div>
              </button>
            </div>

            {/* Dynamic Controls based on Geofence Type */}
            {geofenceType === 'circle' ? (
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700">
                    Permitted Radius:
                  </label>
                  <div className="inline-flex items-center gap-1 bg-blue-50 text-[#0b4da2] px-3 py-1 rounded-xl border border-blue-200/80 font-mono font-bold text-xs">
                    <span>{radiusMeters}</span>
                    <span className="text-[10px]">meters</span>
                  </div>
                </div>

                <input
                  type="range"
                  min="20"
                  max="2000"
                  step="10"
                  value={radiusMeters}
                  onChange={(e) => setRadiusMeters(parseInt(e.target.value, 10) || 150)}
                  className="w-full accent-[#0b4da2] cursor-pointer"
                />

                {/* Quick Presets */}
                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  <span className="text-[10px] text-slate-400 font-semibold mr-1">Presets:</span>
                  {[50, 100, 150, 200, 300, 500, 1000].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setRadiusMeters(preset)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition border cursor-pointer ${
                        radiusMeters === preset
                          ? 'bg-[#0b4da2] text-white border-[#0b4da2]'
                          : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                      }`}
                    >
                      {preset}m
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-slate-500 leading-tight">
                  Move slider to dynamically resize the blue geofence circle on the live map preview.
                </p>
              </div>
            ) : (
              <div className="space-y-3 pt-2">
                <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-100 text-xs text-indigo-900 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold flex items-center gap-1.5">
                      <Shapes size={14} className="text-indigo-600" />
                      Polygon Room Geometry
                    </span>
                    <span className="font-mono font-bold bg-indigo-200 text-indigo-800 px-2 py-0.5 rounded-md text-[10px]">
                      {polygonCoordinates.length} Vertices / Sides
                    </span>
                  </div>
                  <div className="text-[11px] text-indigo-700">
                    Area: <strong>{polygonArea.toLocaleString()} m²</strong> (~{Math.round(polygonArea * 10.7639).toLocaleString()} sqft)
                    <br />
                    Perimeter: <strong>{polygonPerimeter} meters</strong>
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 leading-tight">
                  Use the <strong>Sides (+ / -)</strong> buttons or shape presets (Triangle, Square, Pentagon, Hexagon, Octagon) above the map to change the number of sides. The shape is automatically centered on the main office pin.
                </p>
              </div>
            )}

            {/* Active Toggle */}
            <div className="pt-2 border-t border-slate-100 flex items-center gap-3">
              <input
                type="checkbox"
                id="form_loc_active"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="w-4 h-4 rounded text-[#0b4da2] focus:ring-[#0b4da2] cursor-pointer"
              />
              <label
                htmlFor="form_loc_active"
                className="text-xs font-semibold text-slate-700 cursor-pointer select-none"
              >
                Enforce Geofence Verification (Active for employee facial scan)
              </label>
            </div>
          </div>

          {/* Section 3: Notes / Policy */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <FileText size={17} className="text-[#0b4da2]" />
              <h2 className="text-sm font-bold text-slate-900 m-0">Admin Notes / Department (Optional)</h2>
            </div>
            <textarea
              rows={3}
              placeholder="e.g. 5th Floor Head Office. Geofence covers Reception, Meeting Room, and Working Desks."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full p-3.5 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-800 focus:bg-white focus:border-[#0b4da2] focus:outline-hidden"
            />
          </div>
        </div>

        {/* RIGHT COLUMN: Big Interactive Map Preview (7 cols) */}
        <div className="lg:col-span-7 flex flex-col space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 m-0 flex items-center gap-2">
                <MapPin size={18} className="text-[#0b4da2]" />
                <span>Interactive Map &amp; Geofence Preview</span>
              </h3>
              <p className="text-xs text-slate-500 m-0 mt-0.5">
                Real-time visual map for pinpointing office coordinates and boundary perimeter
              </p>
            </div>
          </div>

          {/* Large Map Container */}
          <GeofenceMapPicker
            latitude={parsedLat}
            longitude={parsedLng}
            radiusMeters={radiusMeters}
            mode={geofenceType}
            polygonPoints={polygonCoordinates}
            officeName={name || 'Office Location'}
            onCoordinatesChange={(lat, lng) => {
              setLatitude(lat.toFixed(6));
              setLongitude(lng.toFixed(6));
            }}
            onPolygonChange={(pts) => setPolygonCoordinates(pts)}
            onModeChange={(m) => setGeofenceType(m)}
            minHeight="540px"
            className="w-full shadow-lg"
          />

          {/* Bottom Card Summary */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-slate-600">
              <Info size={16} className="text-[#0b4da2] shrink-0" />
              <span>
                Coordinates:{' '}
                <strong className="font-mono text-slate-900">{parsedLat.toFixed(6)}</strong>,{' '}
                <strong className="font-mono text-slate-900">{parsedLng.toFixed(6)}</strong>
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
                Boundary:
              </span>
              <span className="font-bold text-slate-800 bg-slate-100 px-2.5 py-0.5 rounded-md font-mono">
                {geofenceType === 'circle' ? `${radiusMeters}m Circular Radius` : `${polygonCoordinates.length} Point Polygon`}
              </span>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
