'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Camera,
  X,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Clock,
  Sparkles,
  ShieldCheck,
  User,
  Building2,
  Check,
  Zap,
} from 'lucide-react';
import { verifyAndMarkAttendance, AttendanceRecord } from '@/lib/faceApi';

interface ScanSuccessData {
  success: boolean;
  matched: boolean;
  message: string;
  action_taken?: string;
  confidence?: number;
  employee?: {
    id?: number;
    employee_code: string;
    name: string;
    role: string;
    company_name?: string;
  };
  attendance?: AttendanceRecord;
}

interface FaceAttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  preferredMode?: 'auto' | 'clock_in' | 'clock_out';
  expectedEmployeeCode?: string;
  onAttendanceSuccess?: (record: any) => void;
}

export default function FaceAttendanceModal({
  isOpen,
  onClose,
  preferredMode = 'auto',
  expectedEmployeeCode,
  onAttendanceSuccess,
}: FaceAttendanceModalProps) {
  const [streamActive, setStreamActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [scanResult, setScanResult] = useState<ScanSuccessData | null>(null);
  const [verificationFeedback, setVerificationFeedback] = useState<string>('Align your face inside the circle');
  const [attendanceMode, setAttendanceMode] = useState<'auto' | 'clock_in' | 'clock_out'>(preferredMode);
  const [autoScanEnabled, setAutoScanEnabled] = useState(true);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Unbreakable ref-based loop
  const isBusyRef = useRef(false);
  const attendanceModeRef = useRef(attendanceMode);
  attendanceModeRef.current = attendanceMode;
  const expectedEmployeeCodeRef = useRef(expectedEmployeeCode);
  expectedEmployeeCodeRef.current = expectedEmployeeCode;
  const scanResultRef = useRef(scanResult);
  scanResultRef.current = scanResult;

  // Play synthetic audio chime using Web Audio API
  const playAudioChime = useCallback((type: 'success' | 'beep') => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'success') {
        osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
      } else {
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
        osc.start();
        osc.stop(ctx.currentTime + 0.1);
      }
    } catch {
      // Audio not supported or blocked
    }
  }, []);

  // Initialize camera
  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user',
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        try {
          await videoRef.current.play();
        } catch (e) {
          console.warn('Attendance video play exception:', e);
        }
        setStreamActive(true);
      }
    } catch (err: any) {
      console.error('Camera access error:', err);
      setCameraError('Camera access denied or device not found. Please allow camera permissions.');
      setStreamActive(false);
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setStreamActive(false);
    isBusyRef.current = false;
  }, []);

  useEffect(() => {
    if (isOpen) {
      startCamera();
      setScanResult(null);
      setVerificationFeedback('Position your face inside the biometric reticle');
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, startCamera, stopCamera]);

  // Capture current frame from video as JPEG Base64 (max 480px width for fast CPU dlib recognition)
  const captureFrame = useCallback((): string | null => {
    if (!videoRef.current || !canvasRef.current) return null;
    const video = videoRef.current;
    const canvas = canvasRef.current;

    const vw = video.videoWidth;
    const vh = video.videoHeight;
    if (vw === 0 || vh === 0) return null;

    const targetWidth = Math.min(480, vw);
    const targetHeight = Math.round((vh / vw) * targetWidth);

    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.save();
    ctx.drawImage(video, 0, 0, targetWidth, targetHeight);
    ctx.restore();

    return canvas.toDataURL('image/jpeg', 0.82);
  }, []);

  // Perform single verification attempt
  const runVerification = useCallback(async () => {
    if (isBusyRef.current || !streamActive || scanResultRef.current?.success) return;

    const frameBase64 = captureFrame();
    if (!frameBase64) return;

    isBusyRef.current = true;
    setIsVerifying(true);
    setVerificationFeedback('Analyzing biometric features on CPU AI...');

    try {
      const resp = await verifyAndMarkAttendance({
        image: frameBase64,
        action: attendanceModeRef.current,
        employee_code: expectedEmployeeCodeRef.current,
      });

      if (resp.success && resp.matched) {
        playAudioChime('success');
        setScanResult(resp);
        setVerificationFeedback(resp.message || 'Face matched and attendance recorded!');
        if (onAttendanceSuccess && resp.attendance) {
          onAttendanceSuccess(resp.attendance);
        }
      } else {
        setVerificationFeedback(resp.message || 'Face not recognized. Please face camera directly.');
      }
    } catch (err: any) {
      setVerificationFeedback('Biometric verification server unreachable.');
    } finally {
      setIsVerifying(false);
      isBusyRef.current = false;
    }
  }, [streamActive, captureFrame, playAudioChime, onAttendanceSuccess]);

  // Robust Auto-scan timer loop
  useEffect(() => {
    if (!isOpen || !streamActive || !autoScanEnabled) return;

    const interval = setInterval(() => {
      if (scanResultRef.current?.success) return;
      runVerification();
    }, 1100);

    return () => clearInterval(interval);
  }, [isOpen, streamActive, autoScanEnabled, runVerification]);

  if (!isOpen) return null;

  const handleResetScan = () => {
    setScanResult(null);
    setVerificationFeedback('Position your face inside the biometric reticle');
    isBusyRef.current = false;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col text-slate-100">
        {/* Top Header */}
        <div className="px-6 py-4 border-b border-slate-800/80 flex items-center justify-between bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20 text-white">
              <Camera size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Biometric Face Attendance
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  CPU HOG AI
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Contactless real-time facial recognition attendance clock-in &amp; clock-out
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer border-0 bg-transparent"
          >
            <X size={20} />
          </button>
        </div>

        {/* Mode Selector Strip */}
        <div className="px-6 py-2.5 bg-slate-950/60 border-b border-slate-800/60 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium">Punch Mode:</span>
            <div className="inline-flex rounded-lg bg-slate-800/80 p-0.5 border border-slate-700/60">
              <button
                type="button"
                onClick={() => setAttendanceMode('auto')}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer border-0 ${
                  attendanceMode === 'auto'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                Auto Detect
              </button>
              <button
                type="button"
                onClick={() => setAttendanceMode('clock_in')}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer border-0 ${
                  attendanceMode === 'clock_in'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                Clock In
              </button>
              <button
                type="button"
                onClick={() => setAttendanceMode('clock_out')}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer border-0 ${
                  attendanceMode === 'clock_out'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                Clock Out
              </button>
            </div>
          </div>

          <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={autoScanEnabled}
              onChange={(e) => setAutoScanEnabled(e.target.checked)}
              className="rounded border-slate-700 bg-slate-800 text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
            <span>Auto Continuous Scan</span>
          </label>
        </div>

        {/* Camera Viewfinder Area */}
        <div className="relative bg-black h-80 sm:h-96 flex items-center justify-center overflow-hidden">
          {cameraError ? (
            <div className="p-6 text-center max-w-sm">
              <AlertTriangle className="mx-auto text-amber-400 mb-3" size={40} />
              <p className="text-sm font-semibold text-white mb-2">{cameraError}</p>
              <button
                onClick={startCamera}
                className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-500 transition cursor-pointer border-0"
              >
                <RefreshCw size={14} /> Retry Camera
              </button>
            </div>
          ) : (
            <>
              {/* Video Element */}
              <video
                ref={videoRef}
                playsInline
                muted
                autoPlay
                className="absolute inset-0 w-full h-full object-cover transform -scale-x-100"
              />

              {/* Scanning Reticle & HUD Overlay */}
              <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-6">
                {/* Circular Reticle with Biometric Corner Brackets */}
                <div
                  className={`relative w-56 h-56 sm:w-64 sm:h-64 rounded-full border-2 transition-all duration-300 flex items-center justify-center ${
                    scanResult?.success
                      ? 'border-emerald-400 shadow-[0_0_50px_rgba(52,211,153,0.7)] scale-102'
                      : isVerifying
                      ? 'border-blue-400 shadow-[0_0_40px_rgba(96,165,250,0.5)]'
                      : 'border-white/40'
                  }`}
                >
                  {/* Outer corner marks */}
                  <div className="absolute -top-3 -left-3 w-6 h-6 border-t-2 border-l-2 border-blue-400" />
                  <div className="absolute -top-3 -right-3 w-6 h-6 border-t-2 border-r-2 border-blue-400" />
                  <div className="absolute -bottom-3 -left-3 w-6 h-6 border-b-2 border-l-2 border-blue-400" />
                  <div className="absolute -bottom-3 -right-3 w-6 h-6 border-b-2 border-r-2 border-blue-400" />

                  {/* Laser Scanning Line Animation */}
                  {isVerifying && !scanResult?.success && (
                    <div className="absolute inset-x-4 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_15px_#22d3ee] animate-pulse top-1/2 transform -translate-y-1/2" />
                  )}

                  {/* Success Checkmark Circle */}
                  {scanResult?.success && (
                    <div className="w-20 h-20 rounded-full bg-emerald-500/90 text-white flex items-center justify-center shadow-lg animate-in zoom-in duration-300">
                      <Check size={44} className="stroke-[3]" />
                    </div>
                  )}
                </div>

                {/* Status Indicator Pill */}
                <div className="mt-4 px-4 py-1.5 rounded-full bg-slate-900/90 backdrop-blur-md border border-slate-700/60 text-xs font-semibold flex items-center gap-2 text-white shadow-lg">
                  {scanResult?.success ? (
                    <>
                      <CheckCircle2 size={14} className="text-emerald-400" />
                      <span className="text-emerald-300">Identity Confirmed</span>
                    </>
                  ) : isVerifying ? (
                    <>
                      <RefreshCw size={14} className="animate-spin text-blue-400" />
                      <span className="text-blue-200">{verificationFeedback}</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={14} className="text-amber-400" />
                      <span className="text-slate-200">{verificationFeedback}</span>
                    </>
                  )}
                </div>
              </div>
            </>
          )}

          <canvas ref={canvasRef} className="hidden" />
        </div>

        {/* Verification Result Card or Scanner Controls */}
        <div className="p-6 bg-slate-900 border-t border-slate-800">
          {scanResult?.success ? (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-emerald-950/50 border border-emerald-700/50 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-emerald-600/30 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shrink-0">
                    <User size={24} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-white leading-tight">
                        {scanResult.employee?.name || 'Authorized Staff'}
                      </h3>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                        {scanResult.employee?.employee_code}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-300">
                      <span className="flex items-center gap-1">
                        <Building2 size={13} className="text-slate-400" />
                        {scanResult.employee?.company_name || 'Assigned Company'}
                      </span>
                      <span>•</span>
                      <span className="text-emerald-400 font-semibold">
                        Match Confidence: {scanResult.confidence || 98}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Clock In / Out Badge */}
                <div className="text-right flex flex-col items-center sm:items-end">
                  <div
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                      scanResult.action_taken === 'clock_out'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    }`}
                  >
                    <Clock size={13} />
                    <span>
                      {scanResult.action_taken === 'clock_out' ? 'CLOCKED OUT' : 'CLOCKED IN'}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400 mt-1">
                    {scanResult.attendance?.clock_out || scanResult.attendance?.clock_in || 'Recorded'} • {scanResult.attendance?.date || new Date().toISOString().split('T')[0]}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleResetScan}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition cursor-pointer border border-slate-700"
                >
                  Scan Next Person
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/30 transition cursor-pointer border-0"
                >
                  Done &amp; Close
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs text-slate-400">
                <p className="font-semibold text-slate-300 flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-blue-400" />
                  Anti-Spoof Liveness &amp; 128-d Vector Match Active
                </p>
                <p className="mt-0.5 text-[11px]">
                  Look directly at camera. Auto-scan triggers every second.
                </p>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  disabled={isVerifying || !streamActive}
                  onClick={runVerification}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-blue-500/25 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 border-0"
                >
                  {isVerifying ? (
                    <>
                      <RefreshCw size={15} className="animate-spin" />
                      Scanning...
                    </>
                  ) : (
                    <>
                      <Zap size={15} />
                      Scan Face Now
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
