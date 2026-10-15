'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Clock,
  Calendar,
  CalendarDays,
  Coffee,
  Hourglass,
  MapPin,
  Plus,
  Trash2,
  Edit2,
  ShieldCheck,
  AlertTriangle,
  Compass,
  CheckCircle2,
  ExternalLink,
  RefreshCw,
  ArrowLeft,
  Navigation,
  Building2,
  Sliders,
  Check,
  X,
  Info,
  Briefcase,
} from 'lucide-react';
import {
  OfficeLocation,
  fetchOfficeLocations,
  getStoredOfficeLocations,
  createOfficeLocation,
  updateOfficeLocation,
  deleteOfficeLocation,
  calculateDistanceMeters,
  GeofenceCheckResult,
  detectUserCoordinates,
  DetectedCoordinates,
} from '@/lib/officeLocationStorage';
import {
  AttendanceSchedule,
  WorkingShift,
  PublicHoliday,
  DEFAULT_SCHEDULE,
  fetchAttendanceSettings,
  updateGeneralSchedule,
  createWorkingShift,
  updateWorkingShift,
  deleteWorkingShift,
  createPublicHoliday,
  updatePublicHoliday,
  deletePublicHoliday,
  calculateShiftDuration,
} from '@/lib/attendanceSettingsStorage';

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function OfficeLocationSettingsPage() {
  // Navigation Tabs: 'schedule' | 'holidays' | 'geofence'
  const [activeTab, setActiveTab] = useState<'schedule' | 'holidays' | 'geofence'>('schedule');

  // --- ATTENDANCE SCHEDULE & HOLIDAYS STATE ---
  const [schedule, setSchedule] = useState<AttendanceSchedule>(DEFAULT_SCHEDULE);
  const [shifts, setShifts] = useState<WorkingShift[]>([]);
  const [holidays, setHolidays] = useState<PublicHoliday[]>([]);
  const [isSettingsLoading, setIsSettingsLoading] = useState(false);

  // General Settings Form State
  const [generalWorkingHours, setGeneralWorkingHours] = useState<number>(8.0);
  const [gracePeriodMinutes, setGracePeriodMinutes] = useState<number>(15);
  const [restTimeMinutes, setRestTimeMinutes] = useState<number>(60);
  const [monthlyHolidays, setMonthlyHolidays] = useState<number>(2);
  const [selectedWeeklyDays, setSelectedWeeklyDays] = useState<string[]>(['Friday', 'Saturday']);
  const [isSavingGeneral, setIsSavingGeneral] = useState(false);
  const [isSavingHolidays, setIsSavingHolidays] = useState(false);

  // Shift Modal State
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<WorkingShift | null>(null);
  const [shiftFormData, setShiftFormData] = useState({
    name: '',
    start_time: '09:00',
    end_time: '17:30',
    description: '',
    is_active: true,
  });
  const [shiftSubmitting, setShiftSubmitting] = useState(false);
  const [shiftError, setShiftError] = useState<string | null>(null);

  // Public Holiday Modal State
  const [isHolidayModalOpen, setIsHolidayModalOpen] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<PublicHoliday | null>(null);
  const [holidayFormData, setHolidayFormData] = useState({
    title: '',
    holiday_date: '',
    days_count: 1,
    holiday_type: 'National Public Holiday',
    description: '',
    is_active: true,
  });
  const [holidaySubmitting, setHolidaySubmitting] = useState(false);
  const [holidayError, setHolidayError] = useState<string | null>(null);

  // --- GEOFENCE & OFFICE LOCATIONS STATE ---
  const [locations, setLocations] = useState<OfficeLocation[]>(() => {
    if (typeof window !== 'undefined') {
      return getStoredOfficeLocations();
    }
    return [];
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<OfficeLocation | null>(null);

  // Location Form state
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    latitude: '',
    longitude: '',
    radius_meters: 150,
    is_active: true,
    notes: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDetectingGps, setIsDetectingGps] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Live Test Geofence Widget states
  const [isTestingLocation, setIsTestingLocation] = useState(false);
  const [testResult, setTestResult] = useState<GeofenceCheckResult | null>(null);
  const [testUserCoords, setTestUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [detectedMeta, setDetectedMeta] = useState<DetectedCoordinates | null>(null);
  const [manualTestLat, setManualTestLat] = useState('24.133632');
  const [manualTestLng, setManualTestLng] = useState('90.377421');
  const [activeTestTab, setActiveTestTab] = useState<'live' | 'manual'>('live');
  const [pasteInput, setPasteInput] = useState('');
  const [testError, setTestError] = useState<string | null>(null);

  // Notifications
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  const showToast = (type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  // Load Schedule and Holidays from Backend
  const loadAttendanceSettings = useCallback(async () => {
    setIsSettingsLoading(true);
    try {
      const data = await fetchAttendanceSettings();
      if (data.schedule) {
        setSchedule(data.schedule);
        setGeneralWorkingHours(Number(data.schedule.general_working_hours) || 8.0);
        setGracePeriodMinutes(Number(data.schedule.grace_period_minutes) ?? 15);
        setRestTimeMinutes(Number(data.schedule.rest_time_minutes) ?? 60);
        setMonthlyHolidays(Number(data.schedule.monthly_fixed_holidays) ?? 2);
        if (Array.isArray(data.schedule.weekly_fixed_days)) {
          setSelectedWeeklyDays(data.schedule.weekly_fixed_days);
        }
      }
      setShifts(data.shifts || []);
      setHolidays(data.holidays || []);
    } catch (err) {
      console.error('Failed to load attendance settings:', err);
    } finally {
      setIsSettingsLoading(false);
    }
  }, []);

  // Load Locations from Backend
  const loadLocations = useCallback(async () => {
    setLocations((current) => {
      if (!current || current.length === 0) {
        setIsLoading(true);
      }
      return current;
    });
    try {
      const data = await fetchOfficeLocations();
      setLocations(data);
    } catch (err: any) {
      console.error('Failed to load office locations:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAttendanceSettings();
    loadLocations();
  }, [loadAttendanceSettings, loadLocations]);

  // --- WORKING SCHEDULE ACTIONS ---
  const handleSaveGeneralSchedule = async () => {
    setIsSavingGeneral(true);
    try {
      const updated = await updateGeneralSchedule({
        general_working_hours: Number(generalWorkingHours),
        grace_period_minutes: Number(gracePeriodMinutes),
        rest_time_minutes: Number(restTimeMinutes),
      });
      setSchedule(updated);
      showToast('success', 'General working time, grace period & rest time saved successfully.');
    } catch (err: any) {
      showToast('error', err.message || 'Failed to save general schedule.');
    } finally {
      setIsSavingGeneral(false);
    }
  };

  const handleOpenAddShift = () => {
    setEditingShift(null);
    setShiftFormData({
      name: '',
      start_time: '09:00',
      end_time: '17:30',
      description: '',
      is_active: true,
    });
    setShiftError(null);
    setIsShiftModalOpen(true);
  };

  const handleOpenEditShift = (shift: WorkingShift) => {
    setEditingShift(shift);
    setShiftFormData({
      name: shift.name,
      start_time: shift.start_time,
      end_time: shift.end_time,
      description: shift.description || '',
      is_active: shift.is_active,
    });
    setShiftError(null);
    setIsShiftModalOpen(true);
  };

  const handleSubmitShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shiftFormData.name.trim()) {
      setShiftError('Please enter a shift name (e.g. Regular Shift).');
      return;
    }
    if (!shiftFormData.start_time || !shiftFormData.end_time) {
      setShiftError('Please specify both start time and end time.');
      return;
    }

    setShiftSubmitting(true);
    setShiftError(null);
    const duration = calculateShiftDuration(shiftFormData.start_time, shiftFormData.end_time);

    try {
      if (editingShift) {
        const updated = await updateWorkingShift(editingShift.id, {
          name: shiftFormData.name.trim(),
          start_time: shiftFormData.start_time,
          end_time: shiftFormData.end_time,
          total_working_time: duration.formatted,
          total_minutes: duration.minutes,
          is_active: shiftFormData.is_active,
          description: shiftFormData.description.trim() || undefined,
        });
        setShifts((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
        showToast('success', `Shift "${updated.name}" updated successfully.`);
      } else {
        const created = await createWorkingShift({
          name: shiftFormData.name.trim(),
          start_time: shiftFormData.start_time,
          end_time: shiftFormData.end_time,
          total_working_time: duration.formatted,
          total_minutes: duration.minutes,
          is_active: shiftFormData.is_active,
          description: shiftFormData.description.trim() || undefined,
        });
        setShifts((prev) => [...prev, created]);
        showToast('success', `New working shift "${created.name}" created.`);
      }
      setIsShiftModalOpen(false);
    } catch (err: any) {
      setShiftError(err.message || 'Failed to save working shift.');
    } finally {
      setShiftSubmitting(false);
    }
  };

  const handleDeleteShift = async (shift: WorkingShift) => {
    if (!confirm(`Are you sure you want to delete shift "${shift.name}"?`)) return;
    try {
      await deleteWorkingShift(shift.id);
      setShifts((prev) => prev.filter((s) => s.id !== shift.id));
      showToast('success', `Shift "${shift.name}" removed.`);
    } catch (err: any) {
      showToast('error', err.message || 'Failed to delete shift.');
    }
  };

  const handleToggleShiftActive = async (shift: WorkingShift) => {
    try {
      const updated = await updateWorkingShift(shift.id, { is_active: !shift.is_active });
      setShifts((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      showToast('info', `Shift "${shift.name}" is now ${updated.is_active ? 'Active' : 'Disabled'}.`);
    } catch (err: any) {
      showToast('error', err.message || 'Failed to update shift status.');
    }
  };

  // --- HOLIDAY SETTINGS ACTIONS ---
  const handleToggleWeeklyDay = (day: string) => {
    setSelectedWeeklyDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handleSaveHolidayPolicies = async () => {
    setIsSavingHolidays(true);
    try {
      const updated = await updateGeneralSchedule({
        monthly_fixed_holidays: Number(monthlyHolidays),
        weekly_fixed_days: selectedWeeklyDays,
      });
      setSchedule(updated);
      showToast('success', 'Monthly flexible leave & weekly fixed days off updated.');
    } catch (err: any) {
      showToast('error', err.message || 'Failed to save holiday policies.');
    } finally {
      setIsSavingHolidays(false);
    }
  };

  const handleOpenAddHoliday = () => {
    setEditingHoliday(null);
    setHolidayFormData({
      title: '',
      holiday_date: new Date().toISOString().split('T')[0],
      days_count: 1,
      holiday_type: 'National Public Holiday',
      description: '',
      is_active: true,
    });
    setHolidayError(null);
    setIsHolidayModalOpen(true);
  };

  const handleOpenEditHoliday = (hol: PublicHoliday) => {
    setEditingHoliday(hol);
    const dateFormatted = hol.holiday_date ? hol.holiday_date.substring(0, 10) : '';
    setHolidayFormData({
      title: hol.title,
      holiday_date: dateFormatted,
      days_count: hol.days_count || 1,
      holiday_type: hol.holiday_type || 'National Public Holiday',
      description: hol.description || '',
      is_active: hol.is_active,
    });
    setHolidayError(null);
    setIsHolidayModalOpen(true);
  };

  const handleSubmitHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!holidayFormData.title.trim()) {
      setHolidayError('Please enter holiday title.');
      return;
    }
    if (!holidayFormData.holiday_date) {
      setHolidayError('Please select the holiday date.');
      return;
    }

    setHolidaySubmitting(true);
    setHolidayError(null);

    try {
      if (editingHoliday) {
        const updated = await updatePublicHoliday(editingHoliday.id, {
          title: holidayFormData.title.trim(),
          holiday_date: holidayFormData.holiday_date,
          days_count: Number(holidayFormData.days_count),
          holiday_type: holidayFormData.holiday_type,
          description: holidayFormData.description.trim() || undefined,
          is_active: holidayFormData.is_active,
        });
        setHolidays((prev) => prev.map((h) => (h.id === updated.id ? updated : h)));
        showToast('success', `Holiday "${updated.title}" updated.`);
      } else {
        const created = await createPublicHoliday({
          title: holidayFormData.title.trim(),
          holiday_date: holidayFormData.holiday_date,
          days_count: Number(holidayFormData.days_count),
          holiday_type: holidayFormData.holiday_type,
          description: holidayFormData.description.trim() || undefined,
          is_active: holidayFormData.is_active,
        });
        setHolidays((prev) => [...prev, created]);
        showToast('success', `Public holiday "${created.title}" added.`);
      }
      setIsHolidayModalOpen(false);
    } catch (err: any) {
      setHolidayError(err.message || 'Failed to save public holiday.');
    } finally {
      setHolidaySubmitting(false);
    }
  };

  const handleDeleteHoliday = async (hol: PublicHoliday) => {
    if (!confirm(`Are you sure you want to remove holiday "${hol.title}"?`)) return;
    try {
      await deletePublicHoliday(hol.id);
      setHolidays((prev) => prev.filter((h) => h.id !== hol.id));
      showToast('success', `Holiday "${hol.title}" removed.`);
    } catch (err: any) {
      showToast('error', err.message || 'Failed to delete public holiday.');
    }
  };

  // --- LOCATION ACTIONS (Preserved) ---
  const handleOpenCreateModal = () => {
    setEditingLocation(null);
    setFormData({
      name: '',
      address: '',
      latitude: '',
      longitude: '',
      radius_meters: 150,
      is_active: true,
      notes: '',
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (loc: OfficeLocation) => {
    setEditingLocation(loc);
    setFormData({
      name: loc.name,
      address: loc.address || '',
      latitude: String(loc.latitude),
      longitude: String(loc.longitude),
      radius_meters: loc.radius_meters || 150,
      is_active: loc.is_active,
      notes: loc.notes || '',
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleDetectGPS = async () => {
    setIsDetectingGps(true);
    setFormError(null);
    try {
      const coords = await detectUserCoordinates();
      setFormData((prev) => ({
        ...prev,
        latitude: coords.latitude.toFixed(6),
        longitude: coords.longitude.toFixed(6),
      }));
      showToast('success', `Coordinates detected via ${coords.source === 'gps' ? 'Device GPS' : 'Network IP'}!`);
    } catch (err: any) {
      setFormError(err.message || 'Could not detect current coordinates.');
    } finally {
      setIsDetectingGps(false);
    }
  };

  const handleSubmitLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setFormError('Please enter office name.');
      return;
    }
    const lat = parseFloat(formData.latitude);
    const lng = parseFloat(formData.longitude);

    if (isNaN(lat) || lat < -90 || lat > 90) {
      setFormError('Please enter a valid latitude (-90.0 to 90.0).');
      return;
    }
    if (isNaN(lng) || lng < -180 || lng > 180) {
      setFormError('Please enter a valid longitude (-180.0 to 180.0).');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      if (editingLocation) {
        await updateOfficeLocation(editingLocation.id, {
          name: formData.name.trim(),
          address: formData.address.trim() || undefined,
          latitude: lat,
          longitude: lng,
          radius_meters: Number(formData.radius_meters),
          is_active: formData.is_active,
          notes: formData.notes.trim() || undefined,
        });
        showToast('success', `Office location "${formData.name}" updated!`);
      } else {
        await createOfficeLocation({
          name: formData.name.trim(),
          address: formData.address.trim() || undefined,
          latitude: lat,
          longitude: lng,
          radius_meters: Number(formData.radius_meters),
          is_active: formData.is_active,
          notes: formData.notes.trim() || undefined,
        });
        showToast('success', `New office location "${formData.name}" added!`);
      }

      setIsModalOpen(false);
      await loadLocations();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save office location.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleLocationActive = async (loc: OfficeLocation) => {
    try {
      await updateOfficeLocation(loc.id, { is_active: !loc.is_active });
      showToast('info', `"${loc.name}" is now ${!loc.is_active ? 'Active' : 'Disabled'}.`);
      await loadLocations();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to toggle status.');
    }
  };

  const handleDeleteLocation = async (loc: OfficeLocation) => {
    if (!confirm(`Are you sure you want to remove "${loc.name}"?`)) return;
    try {
      await deleteOfficeLocation(loc.id);
      showToast('success', `Office location "${loc.name}" removed.`);
      await loadLocations();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to delete office location.');
    }
  };

  const handleRunManualTest = (latParam?: number, lngParam?: number) => {
    const lat = latParam !== undefined ? latParam : parseFloat(manualTestLat);
    const lng = lngParam !== undefined ? lngParam : parseFloat(manualTestLng);

    if (isNaN(lat) || isNaN(lng)) {
      setTestError('Please enter valid test coordinates.');
      return;
    }
    setTestError(null);
    setTestUserCoords({ lat, lng });
    setDetectedMeta({ latitude: lat, longitude: lng, source: 'cached' });

    const activeList = locations.filter((l) => l.is_active);
    if (activeList.length === 0) {
      setTestResult({
        inArea: false,
        nearestLocation: null,
        distanceMeters: 0,
        allowedRadiusMeters: 0,
        noLocationsConfigured: true,
      });
      return;
    }

    let nearest: OfficeLocation | null = null;
    let minDistance = Infinity;

    activeList.forEach((loc) => {
      const dist = calculateDistanceMeters(lat, lng, loc.latitude, loc.longitude);
      if (dist < minDistance) {
        minDistance = dist;
        nearest = loc;
      }
    });

    const isInside = nearest ? minDistance <= (nearest as OfficeLocation).radius_meters : false;
    setTestResult({
      inArea: isInside,
      nearestLocation: nearest,
      distanceMeters: Math.round(minDistance),
      allowedRadiusMeters: nearest ? (nearest as OfficeLocation).radius_meters : 150,
    });
  };

  const activeCount = locations.filter((l) => l.is_active).length;
  const liveShiftDurationPreview = calculateShiftDuration(shiftFormData.start_time, shiftFormData.end_time);

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 pb-16 font-sans">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed top-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl text-xs font-semibold border animate-in slide-in-from-top-2 duration-200 ${
            notification.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
              : notification.type === 'error'
              ? 'bg-rose-50 text-rose-900 border-rose-300'
              : 'bg-blue-50 text-blue-900 border-blue-300'
          }`}
        >
          {notification.type === 'success' && <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />}
          {notification.type === 'error' && <AlertTriangle size={16} className="text-rose-600 shrink-0" />}
          {notification.type === 'info' && <Info size={16} className="text-blue-600 shrink-0" />}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Link
                href="/masteradmin/attendance"
                className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors no-underline"
              >
                <ArrowLeft size={13} />
                <span>Attendance Monitoring</span>
              </Link>
              <span className="text-slate-300">•</span>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#0b4da2] bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100">
                Attendance Management
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight m-0 flex items-center gap-2.5">
              <Sliders className="text-[#0b4da2]" size={24} />
              <span>Attendance Management Settings</span>
            </h1>
            <p className="text-xs text-slate-500 mt-1 max-w-3xl m-0 leading-relaxed">
              Configure working shifts, general duty hours, grace period, rest time, holiday rules, and physical geofence boundaries.
            </p>
          </div>
        </div>

        {/* Primary Navigation Tabs */}
        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center gap-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('schedule')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
              activeTab === 'schedule'
                ? 'bg-[#0b4da2] text-white border-[#0b4da2] shadow-xs'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200'
            }`}
          >
            <Clock size={15} />
            <span>Working Schedule</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                activeTab === 'schedule' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
              }`}
            >
              {shifts.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('holidays')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
              activeTab === 'holidays'
                ? 'bg-[#0b4da2] text-white border-[#0b4da2] shadow-xs'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200'
            }`}
          >
            <CalendarDays size={15} />
            <span>Holiday Settings</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                activeTab === 'holidays' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
              }`}
            >
              {holidays.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('geofence')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
              activeTab === 'geofence'
                ? 'bg-[#0b4da2] text-white border-[#0b4da2] shadow-xs'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200'
            }`}
          >
            <Compass size={15} />
            <span>Office Geofence &amp; Locations</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                activeTab === 'geofence' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
              }`}
            >
              {locations.length}
            </span>
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* TAB 1: WORKING SCHEDULE */}
      {/* ========================================================= */}
      {activeTab === 'schedule' && (
        <div className="space-y-6">
          {/* Card 1: General Working Rules (Single Configuration) */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <Sliders size={18} className="text-[#0b4da2]" />
                  <h2 className="text-base font-bold text-slate-900 m-0">General Working Time &amp; Attendance Rules</h2>
                </div>
                <p className="text-xs text-slate-500 m-0 mt-0.5">
                  Universal baseline parameters applied across the organisation.
                </p>
              </div>

              <button
                type="button"
                onClick={handleSaveGeneralSchedule}
                disabled={isSavingGeneral}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0b4da2] hover:bg-[#083c80] text-white text-xs font-bold transition shadow-xs cursor-pointer border-0 disabled:opacity-50"
              >
                {isSavingGeneral ? <RefreshCw size={13} className="animate-spin" /> : <Check size={13} />}
                <span>Save General Rules</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-5">
              {/* General Working Time */}
              <div className="bg-slate-50/70 border border-slate-200/90 rounded-xl p-4.5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-700">General Daily Working Time</span>
                  <Briefcase size={16} className="text-[#0b4da2]" />
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    max="24"
                    value={generalWorkingHours}
                    onChange={(e) => setGeneralWorkingHours(parseFloat(e.target.value) || 0)}
                    className="w-24 px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-bold text-slate-900 focus:outline-hidden focus:border-[#0b4da2]"
                  />
                  <span className="text-xs font-semibold text-slate-600">Hours / Day</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-2 m-0">
                  Standard expected target duty hours for daily operations.
                </p>
              </div>

              {/* Grace Period */}
              <div className="bg-slate-50/70 border border-slate-200/90 rounded-xl p-4.5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-700">Late Grace Period</span>
                  <Hourglass size={16} className="text-amber-600" />
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <input
                    type="number"
                    min="0"
                    max="180"
                    value={gracePeriodMinutes}
                    onChange={(e) => setGracePeriodMinutes(parseInt(e.target.value, 10) || 0)}
                    className="w-24 px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-bold text-slate-900 focus:outline-hidden focus:border-[#0b4da2]"
                  />
                  <span className="text-xs font-semibold text-slate-600">Minutes</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-2 m-0">
                  Allowed delay after shift start before attendance is marked as &ldquo;Late&rdquo;.
                </p>
              </div>

              {/* Total Rest Time */}
              <div className="bg-slate-50/70 border border-slate-200/90 rounded-xl p-4.5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-700">Total Rest / Break Time</span>
                  <Coffee size={16} className="text-emerald-600" />
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <input
                    type="number"
                    min="0"
                    max="360"
                    value={restTimeMinutes}
                    onChange={(e) => setRestTimeMinutes(parseInt(e.target.value, 10) || 0)}
                    className="w-24 px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-bold text-slate-900 focus:outline-hidden focus:border-[#0b4da2]"
                  />
                  <span className="text-xs font-semibold text-slate-600">Minutes</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-2 m-0">
                  Daily allocated lunch and relaxation break allowance.
                </p>
              </div>
            </div>
          </div>

          {/* Card 2: Multiple Working Shifts / Working Times */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <Clock size={18} className="text-[#0b4da2]" />
                  <h2 className="text-base font-bold text-slate-900 m-0">
                    Working Shifts &amp; Duty Timings ({shifts.length})
                  </h2>
                </div>
                <p className="text-xs text-slate-500 m-0 mt-0.5">
                  Add multiple working times with start time, end time, and automatically calculated duty hours.
                </p>
              </div>

              <button
                type="button"
                onClick={handleOpenAddShift}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0b4da2] hover:bg-[#083c80] text-white text-xs font-bold transition shadow-xs cursor-pointer border-0"
              >
                <Plus size={14} />
                <span>Add Working Time / Shift</span>
              </button>
            </div>

            {/* Shifts Table */}
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Shift Name</th>
                    <th className="py-3 px-4">Start Time</th>
                    <th className="py-3 px-4">End Time</th>
                    <th className="py-3 px-4 text-center">Total Working Time</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {shifts.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-slate-400">
                        <Clock size={28} className="mx-auto mb-2 opacity-30 text-slate-400" />
                        <p className="font-medium text-xs">No working shifts configured yet.</p>
                        <button
                          type="button"
                          onClick={handleOpenAddShift}
                          className="mt-2 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#0b4da2] text-white text-xs font-bold border-0 cursor-pointer"
                        >
                          <Plus size={12} />
                          <span>Add First Shift</span>
                        </button>
                      </td>
                    </tr>
                  ) : (
                    shifts.map((shift) => (
                      <tr key={shift.id} className="hover:bg-blue-50/20 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900 text-sm">{shift.name}</div>
                          {shift.description && (
                            <div className="text-[11px] text-slate-400 mt-0.5">{shift.description}</div>
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-800 text-xs">
                          {shift.start_time}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-800 text-xs">
                          {shift.end_time}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className="inline-flex items-center gap-1 font-bold px-2.5 py-1 rounded-full bg-blue-50 text-[#0b4da2] border border-blue-200 text-xs">
                            <Clock size={11} />
                            {shift.total_working_time || '8 hrs'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleShiftActive(shift)}
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider cursor-pointer border ${
                              shift.is_active
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                                : 'bg-slate-100 text-slate-500 border-slate-300'
                            }`}
                          >
                            {shift.is_active ? 'Active' : 'Disabled'}
                          </button>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleOpenEditShift(shift)}
                              className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                              title="Edit shift"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteShift(shift)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                              title="Delete shift"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: HOLIDAY SETTINGS */}
      {/* ========================================================= */}
      {activeTab === 'holidays' && (
        <div className="space-y-6">
          {/* Card 1: Monthly Flexible Leave & Weekly Fixed Days Off */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <Calendar size={18} className="text-[#0b4da2]" />
                  <h2 className="text-base font-bold text-slate-900 m-0">Monthly &amp; Weekly Off-Day Policies</h2>
                </div>
                <p className="text-xs text-slate-500 m-0 mt-0.5">
                  Configure monthly flexible rest days and weekly fixed non-working days.
                </p>
              </div>

              <button
                type="button"
                onClick={handleSaveHolidayPolicies}
                disabled={isSavingHolidays}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0b4da2] hover:bg-[#083c80] text-white text-xs font-bold transition shadow-xs cursor-pointer border-0 disabled:opacity-50"
              >
                {isSavingHolidays ? <RefreshCw size={13} className="animate-spin" /> : <Check size={13} />}
                <span>Save Holiday Rules</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-5">
              {/* Option 1: Monthly Fixed Holidays */}
              <div className="bg-slate-50/70 border border-slate-200/90 rounded-xl p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                    Option 1: Monthly Fixed Holidays
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                    Flexible Any Time
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-1 mb-3">
                  Number of fixed monthly leave days employees are allowed to avail at any time during the month.
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="15"
                    value={monthlyHolidays}
                    onChange={(e) => setMonthlyHolidays(parseInt(e.target.value, 10) || 0)}
                    className="w-24 px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-bold text-slate-900 focus:outline-hidden focus:border-[#0b4da2]"
                  />
                  <span className="text-xs font-semibold text-slate-600">Days per Month</span>
                </div>
              </div>

              {/* Option 2: Weekly / Manual Fixed Days Off */}
              <div className="bg-slate-50/70 border border-slate-200/90 rounded-xl p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                    Option 2: Weekly Fixed Days Off
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-[#0b4da2]">
                    Weekly Cycle
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-1 mb-3">
                  Click to select the standard weekly recurring days off for all staff.
                </p>
                <div className="flex flex-wrap gap-2">
                  {WEEKDAYS.map((day) => {
                    const isSelected = selectedWeeklyDays.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => handleToggleWeeklyDay(day)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer border ${
                          isSelected
                            ? 'bg-[#0b4da2] text-white border-[#0b4da2] shadow-xs'
                            : 'bg-white text-slate-600 border-slate-300 hover:border-slate-400'
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Public Holidays List */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <CalendarDays size={18} className="text-[#0b4da2]" />
                  <h2 className="text-base font-bold text-slate-900 m-0">Official Public Holidays ({holidays.length})</h2>
                </div>
                <p className="text-xs text-slate-500 m-0 mt-0.5">
                  Gazetted national and state holidays when attendance tracking is exempt.
                </p>
              </div>

              <button
                type="button"
                onClick={handleOpenAddHoliday}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0b4da2] hover:bg-[#083c80] text-white text-xs font-bold transition shadow-xs cursor-pointer border-0"
              >
                <Plus size={14} />
                <span>Add Public Holiday</span>
              </button>
            </div>

            {/* Public Holidays Table */}
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Holiday Title</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4 text-center">Duration</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {holidays.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-10 text-center text-slate-400">
                        <CalendarDays size={28} className="mx-auto mb-2 opacity-30 text-slate-400" />
                        <p className="font-medium text-xs">No public holidays registered yet.</p>
                        <button
                          type="button"
                          onClick={handleOpenAddHoliday}
                          className="mt-2 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#0b4da2] text-white text-xs font-bold border-0 cursor-pointer"
                        >
                          <Plus size={12} />
                          <span>Add First Holiday</span>
                        </button>
                      </td>
                    </tr>
                  ) : (
                    holidays.map((hol) => (
                      <tr key={hol.id} className="hover:bg-blue-50/20 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900 text-sm">{hol.title}</div>
                          {hol.description && (
                            <div className="text-[11px] text-slate-400 mt-0.5">{hol.description}</div>
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-800 text-xs">
                          {hol.holiday_date}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className="font-semibold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-full text-xs">
                            {hol.days_count} {hol.days_count === 1 ? 'Day' : 'Days'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="inline-block px-2.5 py-0.5 rounded bg-blue-50 text-[#0b4da2] border border-blue-200 text-[11px] font-semibold">
                            {hol.holiday_type || 'National Public Holiday'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleOpenEditHoliday(hol)}
                              className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                              title="Edit holiday"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteHoliday(hol)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                              title="Delete holiday"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: OFFICE GEOFENCE & LOCATIONS (Preserved) */}
      {/* ========================================================= */}
      {activeTab === 'geofence' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
            <div>
              <h2 className="text-base font-bold text-slate-900 m-0">Physical Geofences &amp; Coordinate Perimeters</h2>
              <p className="text-xs text-slate-500 m-0 mt-0.5">
                Clock-in attendance is checked against registered office GPS perimeters.
              </p>
            </div>
            <button
              onClick={handleOpenCreateModal}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0b4da2] hover:bg-[#083c80] text-white font-bold text-xs transition-all shadow-xs cursor-pointer border-0"
            >
              <Plus size={15} />
              <span>Add Office Location</span>
            </button>
          </div>

          {/* Overview Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-[#0b4da2] flex items-center justify-center shrink-0">
                <Building2 size={24} />
              </div>
              <div>
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Offices</div>
                <div className="text-2xl font-black text-slate-900 mt-0.5">{locations.length}</div>
                <div className="text-[11px] text-slate-400 mt-0.5">Approved locations</div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <ShieldCheck size={24} />
              </div>
              <div>
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Active Geofences</div>
                <div className="text-2xl font-black text-emerald-700 mt-0.5">{activeCount}</div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  {activeCount > 0 ? 'Enforced on facial scan' : 'No active geofences'}
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <Navigation size={24} />
              </div>
              <div>
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Geofence Rule</div>
                <div className="text-sm font-black text-slate-900 mt-0.5">Strict Proximity</div>
                <div className="text-[11px] text-emerald-600 font-semibold mt-0.5 flex items-center gap-1">
                  <CheckCircle2 size={12} />
                  <span>&ldquo;You are not in the office area&rdquo; active</span>
                </div>
              </div>
            </div>
          </div>

          {/* Live Geofence Radar Simulator Widget */}
          <div className="bg-[#0f172a] border border-slate-700/80 rounded-2xl p-6 text-white shadow-xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <h3 className="text-base font-extrabold text-white m-0">Live Geofence Radar Simulator</h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                    GPS &amp; IP Check
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-1 m-0">
                  Verify your location or test custom coordinates against all registered office perimeters.
                </p>
              </div>

              <div className="inline-flex rounded-xl bg-slate-800 p-1 border border-slate-700 self-start md:self-auto shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveTestTab('live')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer border-0 ${
                    activeTestTab === 'live'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-transparent text-slate-400 hover:text-white'
                  }`}
                >
                  Live Detection
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTestTab('manual')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer border-0 ${
                    activeTestTab === 'manual'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-transparent text-slate-400 hover:text-white'
                  }`}
                >
                  Manual Coordinates
                </button>
              </div>
            </div>

            {/* Test tab: Live device scan */}
            {activeTestTab === 'live' ? (
              <div className="mt-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <div className="text-xs font-bold text-slate-200">Test Your Current Physical Location</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Queries device GPS (or network IP) and compares distance to nearest office perimeter.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    setIsTestingLocation(true);
                    setTestError(null);
                    setTestResult(null);
                    try {
                      const coords = await detectUserCoordinates();
                      setTestUserCoords({ lat: coords.latitude, lng: coords.longitude });
                      setDetectedMeta(coords);
                      handleRunManualTest(coords.latitude, coords.longitude);
                    } catch (err: any) {
                      setTestError(err.message || 'Location access denied or timed out.');
                    } finally {
                      setIsTestingLocation(false);
                    }
                  }}
                  disabled={isTestingLocation}
                  className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition flex items-center gap-2 cursor-pointer border-0 disabled:opacity-50"
                >
                  {isTestingLocation ? <RefreshCw size={14} className="animate-spin" /> : <Navigation size={14} />}
                  <span>{isTestingLocation ? 'Scanning Coordinates...' : 'Scan My Location Now'}</span>
                </button>
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <div className="flex-1">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Test Latitude</label>
                    <input
                      type="number"
                      step="any"
                      value={manualTestLat}
                      onChange={(e) => setManualTestLat(e.target.value)}
                      placeholder="e.g. 24.133632"
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs font-mono focus:border-blue-500 focus:outline-hidden"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Test Longitude</label>
                    <input
                      type="number"
                      step="any"
                      value={manualTestLng}
                      onChange={(e) => setManualTestLng(e.target.value)}
                      placeholder="e.g. 90.377421"
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs font-mono focus:border-blue-500 focus:outline-hidden"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRunManualTest()}
                    className="w-full sm:w-auto mt-4 sm:mt-0 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition cursor-pointer border-0 self-end"
                  >
                    Evaluate Coordinates
                  </button>
                </div>
              </div>
            )}

            {/* Test Results Card */}
            {testResult && testUserCoords && (
              <div className="mt-5 pt-4 border-t border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div className="bg-slate-800/90 p-3.5 rounded-xl border border-slate-700">
                  <div className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">Evaluated Location</div>
                  <div className="font-mono font-bold text-white text-sm mt-1">
                    {testUserCoords.lat.toFixed(6)}, {testUserCoords.lng.toFixed(6)}
                  </div>
                </div>

                <div className="bg-slate-800/90 p-3.5 rounded-xl border border-slate-700">
                  <div className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">Nearest Office Perimeter</div>
                  <div className="font-bold text-white text-sm mt-1 truncate">
                    {testResult.nearestLocation?.name || 'No Offices Found'}
                  </div>
                  <div className="text-[11px] text-slate-300 font-mono mt-1">
                    Distance: <span className="font-bold text-amber-300">{testResult.distanceMeters.toLocaleString()}m</span> (Permitted: {testResult.allowedRadiusMeters}m)
                  </div>
                </div>

                <div
                  className={`p-3.5 rounded-xl border flex items-center gap-3 ${
                    testResult.inArea
                      ? 'bg-emerald-950/70 border-emerald-500/60 text-emerald-200'
                      : 'bg-rose-950/70 border-rose-500/60 text-rose-200'
                  }`}
                >
                  {testResult.inArea ? (
                    <>
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/40">
                        <CheckCircle2 size={22} />
                      </div>
                      <div>
                        <div className="font-extrabold text-white text-xs uppercase tracking-wide">INSIDE OFFICE AREA</div>
                        <div className="text-[11px] text-emerald-300/90 mt-0.5">Biometric Face Attendance is PERMITTED</div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 border border-rose-500/40">
                        <AlertTriangle size={22} />
                      </div>
                      <div>
                        <div className="font-extrabold text-white text-xs uppercase tracking-wide">OUTSIDE OFFICE AREA</div>
                        <div className="text-[11px] text-rose-300/90 mt-0.5">Prompt: &ldquo;You are not in the office area&rdquo;</div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Offices Table Card */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900 m-0">Registered Office Coordinates ({locations.length})</h2>
                <p className="text-xs text-slate-500 m-0 mt-0.5">
                  An employee located in any active location radius will be allowed to clock in.
                </p>
              </div>
              <button
                onClick={loadLocations}
                className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer"
                title="Refresh list"
              >
                <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Office Name &amp; Address</th>
                    <th className="py-3 px-4">Coordinates (Lat, Lng)</th>
                    <th className="py-3 px-4 text-center">Permitted Radius</th>
                    <th className="py-3 px-4 text-center">Geofence Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {locations.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-400">
                        <MapPin size={32} className="mx-auto mb-2 opacity-30 text-slate-400" />
                        <p className="font-medium">No office locations configured yet.</p>
                      </td>
                    </tr>
                  ) : (
                    locations.map((loc) => {
                      const googleMapsUrl = `https://www.google.com/maps?q=${loc.latitude},${loc.longitude}`;

                      return (
                        <tr key={loc.id} className="hover:bg-blue-50/20 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900 text-sm">{loc.name}</span>
                              {loc.is_active && (
                                <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                                  Active
                                </span>
                              )}
                            </div>
                            {loc.address && (
                              <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                                <MapPin size={11} className="text-slate-400 shrink-0" />
                                <span>{loc.address}</span>
                              </div>
                            )}
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="font-mono text-xs font-semibold text-slate-800">
                              {loc.latitude.toFixed(6)}, {loc.longitude.toFixed(6)}
                            </div>
                            <a
                              href={googleMapsUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[10px] text-blue-600 hover:underline mt-0.5"
                            >
                              <span>View on Maps</span>
                              <ExternalLink size={10} />
                            </a>
                          </td>

                          <td className="py-3.5 px-4 text-center">
                            <span className="font-bold font-mono text-slate-800 bg-slate-100 px-2 py-0.5 rounded-full text-xs">
                              {loc.radius_meters}m
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-center">
                            <button
                              type="button"
                              onClick={() => handleToggleLocationActive(loc)}
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider cursor-pointer border ${
                                loc.is_active
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                                  : 'bg-slate-100 text-slate-500 border-slate-300'
                              }`}
                            >
                              {loc.is_active ? 'Active' : 'Disabled'}
                            </button>
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleOpenEditModal(loc)}
                                className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                title="Edit office"
                              >
                                <Edit2 size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteLocation(loc)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                                title="Delete office"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: ADD / EDIT WORKING SHIFT */}
      {/* ========================================================= */}
      {isShiftModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock size={18} className="text-[#0b4da2]" />
                <h3 className="text-base font-bold text-slate-900 m-0">
                  {editingShift ? 'Edit Working Shift' : 'Add New Working Shift'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsShiftModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitShift} className="p-5 space-y-4">
              {shiftError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertTriangle size={15} className="shrink-0" />
                  <span>{shiftError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Shift Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. General Office Shift, Morning Shift"
                  value={shiftFormData.name}
                  onChange={(e) => setShiftFormData({ ...shiftFormData, name: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-800 focus:bg-white focus:border-[#0b4da2] focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Start Time *</label>
                  <input
                    type="time"
                    required
                    value={shiftFormData.start_time}
                    onChange={(e) => setShiftFormData({ ...shiftFormData, start_time: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-mono font-bold text-slate-800 focus:bg-white focus:border-[#0b4da2] focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">End Time *</label>
                  <input
                    type="time"
                    required
                    value={shiftFormData.end_time}
                    onChange={(e) => setShiftFormData({ ...shiftFormData, end_time: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-mono font-bold text-slate-800 focus:bg-white focus:border-[#0b4da2] focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Live Computed Duration Preview */}
              <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-xl flex items-center justify-between text-xs">
                <span className="text-slate-600 font-medium">Calculated Total Working Time:</span>
                <span className="font-extrabold text-[#0b4da2] bg-white px-2.5 py-1 rounded-lg border border-blue-200">
                  {liveShiftDurationPreview.formatted}
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Description (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Standard daytime shift"
                  value={shiftFormData.description}
                  onChange={(e) => setShiftFormData({ ...shiftFormData, description: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-800 focus:bg-white focus:border-[#0b4da2] focus:outline-hidden"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="shift_active"
                  checked={shiftFormData.is_active}
                  onChange={(e) => setShiftFormData({ ...shiftFormData, is_active: e.target.checked })}
                  className="rounded text-[#0b4da2] focus:ring-[#0b4da2]"
                />
                <label htmlFor="shift_active" className="text-xs font-semibold text-slate-700 cursor-pointer">
                  Active (available for employee duty schedules)
                </label>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsShiftModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition border-0 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={shiftSubmitting}
                  className="px-5 py-2 rounded-xl bg-[#0b4da2] hover:bg-[#083c80] text-white text-xs font-bold transition shadow-xs cursor-pointer border-0 disabled:opacity-50"
                >
                  {shiftSubmitting ? 'Saving...' : editingShift ? 'Update Shift' : 'Create Shift'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: ADD / EDIT PUBLIC HOLIDAY */}
      {/* ========================================================= */}
      {isHolidayModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarDays size={18} className="text-[#0b4da2]" />
                <h3 className="text-base font-bold text-slate-900 m-0">
                  {editingHoliday ? 'Edit Public Holiday' : 'Add Public Holiday'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsHolidayModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitHoliday} className="p-5 space-y-4">
              {holidayError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertTriangle size={15} className="shrink-0" />
                  <span>{holidayError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Holiday Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. National Day, Eid-ul-Fitr, New Year"
                  value={holidayFormData.title}
                  onChange={(e) => setHolidayFormData({ ...holidayFormData, title: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-800 focus:bg-white focus:border-[#0b4da2] focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Holiday Date *</label>
                  <input
                    type="date"
                    required
                    value={holidayFormData.holiday_date}
                    onChange={(e) => setHolidayFormData({ ...holidayFormData, holiday_date: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-mono text-slate-800 focus:bg-white focus:border-[#0b4da2] focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Number of Days</label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={holidayFormData.days_count}
                    onChange={(e) => setHolidayFormData({ ...holidayFormData, days_count: parseInt(e.target.value, 10) || 1 })}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-800 focus:bg-white focus:border-[#0b4da2] focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Holiday Type</label>
                <select
                  value={holidayFormData.holiday_type}
                  onChange={(e) => setHolidayFormData({ ...holidayFormData, holiday_type: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-800 focus:bg-white focus:border-[#0b4da2] focus:outline-hidden cursor-pointer"
                >
                  <option value="National Public Holiday">National Public Holiday</option>
                  <option value="Religious Holiday">Religious Holiday</option>
                  <option value="State / Regional Holiday">State / Regional Holiday</option>
                  <option value="Gazetted Holiday">Gazetted Holiday</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Description (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Official public holiday for all sectors"
                  value={holidayFormData.description}
                  onChange={(e) => setHolidayFormData({ ...holidayFormData, description: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-800 focus:bg-white focus:border-[#0b4da2] focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsHolidayModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition border-0 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={holidaySubmitting}
                  className="px-5 py-2 rounded-xl bg-[#0b4da2] hover:bg-[#083c80] text-white text-xs font-bold transition shadow-xs cursor-pointer border-0 disabled:opacity-50"
                >
                  {holidaySubmitting ? 'Saving...' : editingHoliday ? 'Update Holiday' : 'Add Holiday'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: ADD / EDIT OFFICE LOCATION (Preserved) */}
      {/* ========================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin size={18} className="text-[#0b4da2]" />
                <h3 className="text-base font-bold text-slate-900 m-0">
                  {editingLocation ? 'Edit Office Geofence' : 'Register New Office Location'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitLocation} className="p-5 space-y-4">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertTriangle size={15} className="shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Office Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Main Headquarters, Subang Branch"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-800 focus:bg-white focus:border-[#0b4da2] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Address (Optional)</label>
                <input
                  type="text"
                  placeholder="Street, City, Postal Code"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-800 focus:bg-white focus:border-[#0b4da2] focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700">Latitude *</label>
                    <button
                      type="button"
                      onClick={handleDetectGPS}
                      disabled={isDetectingGps}
                      className="text-[10px] text-blue-600 hover:text-blue-800 font-bold flex items-center gap-0.5 border-0 bg-transparent cursor-pointer p-0"
                    >
                      {isDetectingGps ? 'Detecting...' : 'Autofill GPS'}
                    </button>
                  </div>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="e.g. 3.1579"
                    value={formData.latitude}
                    onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-mono text-slate-800 focus:bg-white focus:border-[#0b4da2] focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Longitude *</label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="e.g. 101.7116"
                    value={formData.longitude}
                    onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-mono text-slate-800 focus:bg-white focus:border-[#0b4da2] focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Permitted Radius: <span className="text-[#0b4da2] font-mono">{formData.radius_meters}m</span>
                </label>
                <input
                  type="range"
                  min="20"
                  max="2000"
                  step="10"
                  value={formData.radius_meters}
                  onChange={(e) => setFormData({ ...formData, radius_meters: parseInt(e.target.value, 10) || 150 })}
                  className="w-full accent-[#0b4da2] cursor-pointer"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="loc_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="rounded text-[#0b4da2] focus:ring-[#0b4da2]"
                />
                <label htmlFor="loc_active" className="text-xs font-semibold text-slate-700 cursor-pointer">
                  Active (enforce attendance verification against this office)
                </label>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition border-0 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-[#0b4da2] hover:bg-[#083c80] text-white text-xs font-bold transition shadow-xs cursor-pointer border-0 disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : editingLocation ? 'Update Location' : 'Save Location'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
