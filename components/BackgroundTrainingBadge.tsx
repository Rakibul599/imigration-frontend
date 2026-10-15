'use client';

import React, { useEffect, useState } from 'react';
import { Sparkles, CheckCircle2, AlertCircle, X, Cpu } from 'lucide-react';
import { backgroundTrainingManager, BackgroundTrainingJob } from '@/lib/faceApi';

export default function BackgroundTrainingBadge() {
  const [jobs, setJobs] = useState<BackgroundTrainingJob[]>([]);

  useEffect(() => {
    const unsubscribe = backgroundTrainingManager.subscribe((currentJobs) => {
      setJobs(currentJobs);
    });
    return unsubscribe;
  }, []);

  if (!jobs || jobs.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-auto">
      {jobs.map((job) => {
        const isTraining = job.status === 'training';
        const isSuccess = job.status === 'completed';
        const isError = job.status === 'error';

        return (
          <div
            key={job.id}
            className={`p-4 rounded-2xl border shadow-2xl backdrop-blur-xl transition-all duration-300 animate-in slide-in-from-bottom-3 ${
              isTraining
                ? 'bg-slate-900/95 border-blue-500/50 text-white shadow-blue-500/10'
                : isSuccess
                ? 'bg-emerald-950/95 border-emerald-500/50 text-emerald-100 shadow-emerald-500/10'
                : 'bg-red-950/95 border-red-500/50 text-red-100 shadow-red-500/10'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                    isTraining
                      ? 'bg-blue-600/20 border-blue-400/40 text-blue-400'
                      : isSuccess
                      ? 'bg-emerald-600/20 border-emerald-400/40 text-emerald-400'
                      : 'bg-red-600/20 border-red-400/40 text-red-400'
                  }`}
                >
                  {isTraining && <Cpu size={18} className="animate-spin duration-1000" />}
                  {isSuccess && <CheckCircle2 size={18} />}
                  {isError && <AlertCircle size={18} />}
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-black tracking-wide uppercase m-0">
                      {isTraining && 'AI Training in Background'}
                      {isSuccess && 'Face Model Enrolled ✓'}
                      {isError && 'Training Failed'}
                    </h4>
                    {isTraining && (
                      <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping inline-block" />
                    )}
                  </div>

                  <p className="text-xs font-semibold leading-snug m-0 text-slate-200">
                    {job.name}{' '}
                    <span className="text-slate-400 text-[11px]">({job.employee_code})</span>
                  </p>

                  <p className="text-[11px] leading-relaxed text-slate-400 m-0">
                    {isTraining &&
                      `Encoding ${job.sample_count} poses on CPU. You can freely close windows or continue working.`}
                    {isSuccess && (job.message || 'Face model updated & saved in database.')}
                    {isError && (job.error || 'Face training failed.')}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => backgroundTrainingManager.dismissJob(job.id)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer border-0 bg-transparent"
                title="Dismiss"
              >
                <X size={14} />
              </button>
            </div>

            {/* Pulsing Loading Bar */}
            {isTraining && (
              <div className="w-full bg-slate-800 h-1 rounded-full mt-3 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-blue-500 via-indigo-400 to-teal-400 animate-pulse w-full" />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
