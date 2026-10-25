'use client';

import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  Hourglass,
  Info,
  Power,
  PowerOff,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Timer,
  X,
} from 'lucide-react';
import { Company } from '@/lib/companies';
import { updateCompanyStatus } from '@/lib/companyStorage';

interface CompanyStatusModalProps {
  company: Company | null;
  onClose: () => void;
  onUpdated: (updatedCompany: Company) => void;
}

export default function CompanyStatusModal({
  company,
  onClose,
  onUpdated,
}: CompanyStatusModalProps) {
  if (!company) return null;

  const currentStatus = company.status === 'inactive' ? 'inactive' : 'active';
  const hasExistingTimer =
    currentStatus === 'active' &&
    !!company.auto_deactivate_at &&
    new Date(company.auto_deactivate_at).getTime() > Date.now();

  const [mode, setMode] = useState<'immediate' | 'timer'>(hasExistingTimer ? 'timer' : 'immediate');
  const [targetStatus, setTargetStatus] = useState<'active' | 'inactive'>(currentStatus);
  const [presetDuration, setPresetDuration] = useState<string>(company.deactivation_duration || '24h');
  const [customDateTime, setCustomDateTime] = useState<string>(() => {
    if (company.auto_deactivate_at) {
      const d = new Date(company.auto_deactivate_at);
      d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
      return d.toISOString().slice(0, 16);
    }
    const d = new Date();
    d.setHours(d.getHours() + 24);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  });
  const [reason, setReason] = useState<string>(company.deactivation_reason || '');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Quick preset helper
  const handleSelectPreset = (hours: number, label: string) => {
    setPresetDuration(label);
    const d = new Date();
    d.setHours(d.getHours() + hours);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    setCustomDateTime(d.toISOString().slice(0, 16));
  };

  // Immediate Toggle
  const handleImmediateToggle = async (newStatus: 'active' | 'inactive') => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const updatedList = await updateCompanyStatus(
        company.id,
        newStatus,
        null, // clear auto timer
        newStatus === 'inactive' ? (reason.trim() || 'Immediate deactivation by Administrator') : null,
        null
      );
      const updatedComp = updatedList.find((c) => c.id === company.id) || {
        ...company,
        status: newStatus,
        auto_deactivate_at: null,
      };
      onUpdated(updatedComp);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update company status');
    } finally {
      setIsLoading(false);
    }
  };

  // Save Scheduled Auto-Deactivation Timer
  const handleSaveTimer = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      if (!customDateTime) {
        throw new Error('Please select an auto-deactivation date and time.');
      }
      const targetDate = new Date(customDateTime);
      if (isNaN(targetDate.getTime()) || targetDate.getTime() <= Date.now()) {
        throw new Error('Auto-deactivation time must be in the future.');
      }

      const isoTime = targetDate.toISOString();
      const updatedList = await updateCompanyStatus(
        company.id,
        'active', // company remains active until the timer fires
        isoTime,
        reason.trim() || `Auto-deactivation scheduled (${presetDuration})`,
        presetDuration
      );

      const updatedComp = updatedList.find((c) => c.id === company.id) || {
        ...company,
        status: 'active',
        auto_deactivate_at: isoTime,
        deactivation_duration: presetDuration,
        deactivation_reason: reason.trim(),
      };
      onUpdated(updatedComp);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to schedule auto-deactivation');
    } finally {
      setIsLoading(false);
    }
  };

  // Cancel Scheduled Timer
  const handleCancelTimer = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const updatedList = await updateCompanyStatus(
        company.id,
        'active',
        null, // clear timer
        null,
        null
      );
      const updatedComp = updatedList.find((c) => c.id === company.id) || {
        ...company,
        status: 'active',
        auto_deactivate_at: null,
        deactivation_duration: null,
      };
      onUpdated(updatedComp);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to clear timer');
    } finally {
      setIsLoading(false);
    }
  };

  // Remaining time calculation
  const getRemainingTimeText = (autoTimeStr: string) => {
    const diff = new Date(autoTimeStr).getTime() - Date.now();
    if (diff <= 0) return 'Time elapsed (Turning off)';
    const mins = Math.floor((diff / (1000 * 60)) % 60);
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days > 0) return `${days}d ${hours}h ${mins}m remaining`;
    if (hours > 0) return `${hours}h ${mins}m remaining`;
    return `${mins}m remaining`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-6">
        {/* Modal Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div
              className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                currentStatus === 'active'
                  ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                  : 'bg-rose-50 text-rose-600 border border-rose-200'
              }`}
            >
              {currentStatus === 'active' ? <Power size={22} /> : <PowerOff size={22} />}
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
                Company Status &amp; Auto-Deactivation
              </h2>
              <div className="text-xs text-slate-500 font-medium truncate max-w-xs mt-0.5">
                <span className="font-semibold text-slate-700">{company.name}</span>
                {company.roc && <span className="ml-1 text-slate-400">({company.roc})</span>}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer border-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* Current Status Banner */}
        <div
          className={`p-4 rounded-xl border flex items-center justify-between gap-3 text-xs ${
            currentStatus === 'active'
              ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
              : 'bg-rose-50/70 border-rose-200 text-rose-900'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div
              className={`w-3 h-3 rounded-full shrink-0 ${
                currentStatus === 'active' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
              }`}
            />
            <div>
              <div className="font-bold flex items-center gap-1.5">
                <span>Current Status:</span>
                <span className="uppercase tracking-wider">
                  {currentStatus === 'active' ? 'ACTIVE & OPERATIONAL' : 'INACTIVE / TURNED OFF'}
                </span>
              </div>
              {hasExistingTimer && company.auto_deactivate_at && (
                <div className="text-[11px] text-amber-700 font-semibold mt-0.5 flex items-center gap-1">
                  <Clock size={12} />
                  <span>
                    Auto-off scheduled: {new Date(company.auto_deactivate_at).toLocaleString()} (
                    {getRemainingTimeText(company.auto_deactivate_at)})
                  </span>
                </div>
              )}
              {currentStatus === 'inactive' && company.deactivated_at && (
                <div className="text-[11px] text-rose-700 mt-0.5">
                  Deactivated on: {new Date(company.deactivated_at).toLocaleString()}
                </div>
              )}
            </div>
          </div>

          <span
            className={`px-2.5 py-1 rounded-full font-bold text-[10px] uppercase shrink-0 border ${
              currentStatus === 'active'
                ? 'bg-emerald-100 border-emerald-300 text-emerald-800'
                : 'bg-rose-100 border-rose-300 text-rose-800'
            }`}
          >
            {currentStatus}
          </span>
        </div>

        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertTriangle size={15} className="shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Action Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
          <button
            type="button"
            onClick={() => setMode('immediate')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border-0 ${
              mode === 'immediate'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Power size={13} />
            <span>Immediate Switch</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('timer')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border-0 ${
              mode === 'timer'
                ? 'bg-[#0b4da2] text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Timer size={13} />
            <span>Auto-Off Timer (Duration)</span>
          </button>
        </div>

        {/* Mode 1: Immediate Action */}
        {mode === 'immediate' && (
          <div className="space-y-4 pt-1">
            <div className="text-xs text-slate-600">
              {currentStatus === 'active' ? (
                <p>
                  Turning off this company will immediately set its status to <strong>Inactive</strong>.
                  Master admins and linked users will be restricted from operations until reactivated.
                </p>
              ) : (
                <p>
                  Reactivating this company will immediately set its status to <strong>Active</strong> and
                  restore all system privileges and operations.
                </p>
              )}
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                Reason / Administrative Note (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Non-payment, contract expired, audit, routine maintenance"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              {currentStatus === 'active' ? (
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => handleImmediateToggle('inactive')}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer transition-colors shadow-xs disabled:opacity-50"
                >
                  {isLoading ? (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <PowerOff size={14} />
                  )}
                  <span>Deactivate Immediately (Turn Off)</span>
                </button>
              ) : (
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => handleImmediateToggle('active')}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer transition-colors shadow-xs disabled:opacity-50"
                >
                  {isLoading ? (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Power size={14} />
                  )}
                  <span>Reactivate Company (Turn On)</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Mode 2: Duration / Auto-Deactivate Timer */}
        {mode === 'timer' && (
          <div className="space-y-4 pt-1 text-xs">
            <p className="text-slate-600">
              Set a duration or exact datetime. The company will remain operational now, and will
              <strong> automatically turn off (switch to Inactive)</strong> once the timer expires.
            </p>

            {/* Quick Presets */}
            <div>
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                Quick Duration Presets
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: '1 Hour', hours: 1 },
                  { label: '6 Hours', hours: 6 },
                  { label: '12 Hours', hours: 12 },
                  { label: '24 Hours', hours: 24 },
                  { label: '3 Days', hours: 72 },
                  { label: '7 Days', hours: 168 },
                  { label: '14 Days', hours: 336 },
                  { label: '30 Days', hours: 720 },
                ].map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => handleSelectPreset(item.hours, item.label)}
                    className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer ${
                      presetDuration === item.label
                        ? 'bg-[#0b4da2] text-white border-[#0b4da2] shadow-2xs font-bold'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Exact Date & Time Picker */}
            <div>
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                Auto-Off Date &amp; Time (Local)
              </label>
              <div className="relative">
                <input
                  type="datetime-local"
                  value={customDateTime}
                  onChange={(e) => {
                    setCustomDateTime(e.target.value);
                    setPresetDuration('Custom');
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#0b4da2]/10 focus:border-[#0b4da2]"
                />
              </div>
            </div>

            {/* Scheduled Summary Alert */}
            {customDateTime && (
              <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200 text-blue-900 flex items-start gap-2.5">
                <Hourglass size={16} className="text-[#0b4da2] shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold">Scheduled Auto-Deactivation Target:</div>
                  <div className="text-[11px] text-blue-800 mt-0.5 font-medium">
                    {new Date(customDateTime).toLocaleString(undefined, {
                      weekday: 'short',
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}{' '}
                    ({getRemainingTimeText(customDateTime)})
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                Deactivation Reason (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Free trial expiring, grace period, awaiting payment"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#0b4da2]/10 focus:border-[#0b4da2]"
              />
            </div>

            <div className="pt-2 flex items-center justify-between gap-2">
              <div>
                {hasExistingTimer && (
                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={handleCancelTimer}
                    className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-semibold cursor-pointer"
                  >
                    <RotateCcw size={12} />
                    <span>Clear Timer</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={handleSaveTimer}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0b4da2] hover:bg-[#083877] text-white text-xs font-bold cursor-pointer transition-colors shadow-xs disabled:opacity-50"
                >
                  {isLoading ? (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Clock size={14} />
                  )}
                  <span>Set Auto-Off Timer</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
