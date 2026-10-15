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
  MapPin,
  AlertOctagon,
  LocateFixed,
  Navigation,
  Coffee,
  Play,
} from 'lucide-react';
import { verifyAndMarkAttendance, AttendanceRecord } from '@/lib/faceApi';
import {
  OfficeLocation,
  fetchOfficeLocations,
  checkLocationInOfficeArea,
  GeofenceCheckResult,
  detectUserCoordinates,
} from '@/lib/officeLocationStorage';

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
  preferredMode?: 'auto' | 'clock_in' | 'clock_out' | 'start_rest' | 'end_rest';
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
  const [verificationFeedback, setVerificationFeedback] = useState<string>('Verifying GPS office location...');
  const [attendanceMode, setAttendanceMode] = useState<'auto' | 'clock_in' | 'clock_out' | 'start_rest' | 'end_rest'>(preferredMode);
  const [autoScanEnabled, setAutoScanEnabled] = useState(true);

  // Sync mode when modal opens or preferredMode changes
  useEffect(() => {
    if (isOpen) {
      setAttendanceMode(preferredMode);
    }
  }, [isOpen, preferredMode]);

  // Geolocation Geofence States
  const [geoStatus, setGeoStatus] = useState<'checking' | 'inside' | 'outside' | 'error' | 'disabled'>('checking');
  const [geofenceResult, setGeofenceResult] = useState<GeofenceCheckResult | null>(null);
  const [geoErrorMessage, setGeoErrorMessage] = useState<string | null>(null);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [isRetryingGps, setIsRetryingGps] = useState(false);

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

  const geoStatusRef = useRef(geoStatus);
  geoStatusRef.current = geoStatus;

  // Verify Geofence with Office Locations
  const verifyGeofence = useCallback(async (isRetry = false) => {
    if (isRetry) setIsRetryingGps(true);
    setGeoStatus('checking');
    setGeoErrorMessage(null);
    setVerificationFeedback('Checking GPS office perimeter...');

    try {
      const locations = await fetchOfficeLocations(true);

      // If no active office locations configured, allow attendance unconditionally
      if (!locations || locations.length === 0) {
        setGeoStatus('disabled');
        setGeofenceResult(null);
        setVerificationFeedback('Align your face inside the circle');
        setIsRetryingGps(false);
        return;
      }

      // Detect coordinates using multi-tier GPS / Network IP detection
      const coords = await detectUserCoordinates();
      setUserCoords({ lat: coords.latitude, lng: coords.longitude });

      const result = checkLocationInOfficeArea(coords.latitude, coords.longitude, locations);
      setGeofenceResult(result);

      if (result.noLocationsConfigured) {
        setGeoStatus('disabled');
        setVerificationFeedback('Align your face inside the circle');
      } else if (result.inArea) {
        setGeoStatus('inside');
        setVerificationFeedback('In office area. Align your face inside the circle');
      } else {
        setGeoStatus('outside');
        setVerificationFeedback('You are not in the office area');
      }
      setIsRetryingGps(false);
    } catch (err: any) {
      console.warn('Failed to verify office geofence:', err);
      setGeoStatus('error');
      setGeoErrorMessage(err.message || 'Unable to connect to location services.');
      setVerificationFeedback('You are not in the office area');
      setIsRetryingGps(false);
    }
  }, []);

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
      verifyGeofence();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, startCamera, stopCamera, verifyGeofence]);

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

    // Strict Geofence check verification
    if (geoStatusRef.current === 'checking') {
      setVerificationFeedback('Checking GPS office perimeter...');
      return;
    }
    if (geoStatusRef.current === 'outside') {
      setVerificationFeedback('You are not in the office area');
      return;
    }
    if (geoStatusRef.current === 'error') {
      setVerificationFeedback(geoErrorMessage || 'Location permission required to verify office perimeter.');
      return;
    }

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
  }, [streamActive, captureFrame, playAudioChime, onAttendanceSuccess, geoErrorMessage]);

  // Robust Auto-scan timer loop
  useEffect(() => {
    if (!isOpen || !streamActive || !autoScanEnabled) return;

    const interval = setInterval(() => {
      if (scanResultRef.current?.success) return;
      // Prevent auto-scan when outside office area, still checking GPS, or when GPS errored
      if (
        geoStatusRef.current === 'outside' ||
        geoStatusRef.current === 'checking' ||
        geoStatusRef.current === 'error'
      ) {
        return;
      }
      runVerification();
    }, 1100);

    return () => clearInterval(interval);
  }, [isOpen, streamActive, autoScanEnabled, runVerification]);

  if (!isOpen) return null;

  const handleResetScan = () => {
    setScanResult(null);
    if (geoStatus === 'outside') {
      setVerificationFeedback('You are not in the office area');
    } else {
      setVerificationFeedback('Position your face inside the biometric reticle');
    }
    isBusyRef.current = false;
  };

  const isLocationRestricted = geoStatus === 'outside';

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
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold text-white">
                  {attendanceMode === 'start_rest'
                    ? 'Face Biometric: Take Rest / Break'
                    : attendanceMode === 'end_rest'
                    ? 'Face Biometric: Resume Work'
                    : attendanceMode === 'clock_in'
                    ? 'Face Biometric: Clock In'
                    : attendanceMode === 'clock_out'
                    ? 'Face Biometric: Clock Out'
                    : 'Biometric Face Attendance'}
                </h2>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  CPU HOG AI
                </span>

                {/* Live Geofence Status Badge */}
                {geoStatus === 'inside' && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                    <MapPin size={10} />
                    {geofenceResult?.nearestLocation?.name
                      ? `${geofenceResult.nearestLocation.name} (${geofenceResult.distanceMeters}m)`
                      : 'In Office Area'}
                  </span>
                )}
                {geoStatus === 'outside' && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/25 text-rose-300 border border-rose-500/50 flex items-center gap-1 animate-pulse">
                    <AlertOctagon size={10} />
                    Outside Office
                  </span>
                )}
                {geoStatus === 'checking' && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-700/60 text-slate-300 border border-slate-600/60 flex items-center gap-1">
                    <RefreshCw size={10} className="animate-spin text-blue-400" />
                    Checking GPS...
                  </span>
                )}
                {geoStatus === 'error' && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                    <AlertTriangle size={10} />
                    GPS Required
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Contactless real-time facial recognition attendance clock-in, rest &amp; clock-out
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
        <div className="px-6 py-2.5 bg-slate-950/60 border-b border-slate-800/60 flex items-center justify-between text-xs flex-wrap gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-slate-400 font-medium">Punch Mode:</span>
            <div className="inline-flex rounded-lg bg-slate-800/80 p-0.5 border border-slate-700/60 flex-wrap">
              <button
                type="button"
                onClick={() => setAttendanceMode('auto')}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer border-0 ${
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
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer border-0 ${
                  attendanceMode === 'clock_in'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                Clock In
              </button>
              <button
                type="button"
                onClick={() => setAttendanceMode('start_rest')}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer border-0 inline-flex items-center gap-1 ${
                  attendanceMode === 'start_rest'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Coffee size={12} />
                <span>Take Rest</span>
              </button>
              <button
                type="button"
                onClick={() => setAttendanceMode('end_rest')}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer border-0 inline-flex items-center gap-1 ${
                  attendanceMode === 'end_rest'
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'bg-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Play size={12} />
                <span>End Rest</span>
              </button>
              <button
                type="button"
                onClick={() => setAttendanceMode('clock_out')}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer border-0 ${
                  attendanceMode === 'clock_out'
                    ? 'bg-rose-600 text-white shadow-xs'
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
              disabled={isLocationRestricted}
              onChange={(e) => setAutoScanEnabled(e.target.checked)}
              className="rounded border-slate-700 bg-slate-800 text-blue-600 focus:ring-blue-500 cursor-pointer disabled:opacity-40"
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
                className={`absolute inset-0 w-full h-full object-cover transform -scale-x-100 transition duration-300 ${
                  isLocationRestricted ? 'opacity-40 grayscale-40' : 'opacity-100'
                }`}
              />

              {/* Floating Alert Overlay when outside office area */}
              {isLocationRestricted && (
                <div className="absolute top-4 inset-x-4 sm:inset-x-8 z-30 animate-in fade-in slide-in-from-top-3 duration-300">
                  <div className="p-3.5 rounded-2xl bg-rose-950/95 border-2 border-rose-500/80 backdrop-blur-md shadow-2xl flex items-start gap-3 text-white">
                    <div className="w-9 h-9 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 flex items-center justify-center shrink-0">
                      <AlertOctagon size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs sm:text-sm font-extrabold text-white tracking-wide uppercase">
                          You are not in the office area
                        </h4>
                      </div>
                      <p className="text-[11px] text-rose-200/90 mt-1 leading-snug">
                        {geofenceResult?.nearestLocation ? (
                          <>
                            Nearest office:{' '}
                            <strong className="text-white">
                              {geofenceResult.nearestLocation.name}
                            </strong>{' '}
                            is{' '}
                            <span className="font-mono font-bold text-white underline">
                              {geofenceResult.distanceMeters}m away
                            </span>{' '}
                            (Allowed radius: {geofenceResult.allowedRadiusMeters}m).
                          </>
                        ) : (
                          'Attendance can only be registered within an authorized office location.'
                        )}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => verifyGeofence(true)}
                      disabled={isRetryingGps}
                      className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-bold flex items-center gap-1.5 shrink-0 transition cursor-pointer border-0 shadow-md shadow-rose-950 disabled:opacity-50"
                    >
                      <RefreshCw size={12} className={isRetryingGps ? 'animate-spin' : ''} />
                      Retry GPS
                    </button>
                  </div>
                </div>
              )}

              {/* Scanning Reticle & HUD Overlay */}
              <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-6">
                {/* Circular Reticle with Biometric Corner Brackets */}
                <div
                  className={`relative w-56 h-56 sm:w-64 sm:h-64 rounded-full border-2 transition-all duration-300 flex items-center justify-center ${
                    scanResult?.success
                      ? 'border-emerald-400 shadow-[0_0_50px_rgba(52,211,153,0.7)] scale-102'
                      : isLocationRestricted
                      ? 'border-rose-500 shadow-[0_0_40px_rgba(244,63,94,0.6)] bg-rose-950/20'
                      : isVerifying
                      ? 'border-blue-400 shadow-[0_0_40px_rgba(96,165,250,0.5)]'
                      : 'border-white/40'
                  }`}
                >
                  {/* Outer corner marks */}
                  <div
                    className={`absolute -top-3 -left-3 w-6 h-6 border-t-2 border-l-2 ${
                      isLocationRestricted ? 'border-rose-500' : 'border-blue-400'
                    }`}
                  />
                  <div
                    className={`absolute -top-3 -right-3 w-6 h-6 border-t-2 border-r-2 ${
                      isLocationRestricted ? 'border-rose-500' : 'border-blue-400'
                    }`}
                  />
                  <div
                    className={`absolute -bottom-3 -left-3 w-6 h-6 border-b-2 border-l-2 ${
                      isLocationRestricted ? 'border-rose-500' : 'border-blue-400'
                    }`}
                  />
                  <div
                    className={`absolute -bottom-3 -right-3 w-6 h-6 border-b-2 border-r-2 ${
                      isLocationRestricted ? 'border-rose-500' : 'border-blue-400'
                    }`}
                  />

                  {/* Laser Scanning Line Animation (only active when valid location) */}
                  {isVerifying && !scanResult?.success && !isLocationRestricted && (
                    <div className="absolute inset-x-4 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_15px_#22d3ee] animate-pulse top-1/2 transform -translate-y-1/2" />
                  )}

                  {/* Success Checkmark Circle */}
                  {scanResult?.success && (
                    <div className="w-20 h-20 rounded-full bg-emerald-500/90 text-white flex items-center justify-center shadow-lg animate-in zoom-in duration-300">
                      <Check size={44} className="stroke-[3]" />
                    </div>
                  )}

                  {/* Blocked icon inside circle if location restricted */}
                  {isLocationRestricted && !scanResult?.success && (
                    <div className="w-16 h-16 rounded-full bg-rose-500/30 border border-rose-500/60 text-rose-300 flex items-center justify-center shadow-lg animate-in zoom-in duration-200">
                      <AlertOctagon size={36} />
                    </div>
                  )}
                </div>

                {/* Status Indicator Pill */}
                <div
                  className={`mt-4 px-4 py-1.5 rounded-full backdrop-blur-md border text-xs font-semibold flex items-center gap-2 shadow-lg ${
                    scanResult?.success
                      ? 'bg-slate-900/90 border-slate-700/60 text-white'
                      : isLocationRestricted
                      ? 'bg-rose-950/95 border-rose-500/80 text-rose-200 animate-pulse'
                      : geoStatus === 'error'
                      ? 'bg-amber-950/90 border-amber-600/70 text-amber-200'
                      : 'bg-slate-900/90 border-slate-700/60 text-white'
                  }`}
                >
                  {scanResult?.success ? (
                    <>
                      <CheckCircle2 size={14} className="text-emerald-400" />
                      <span className="text-emerald-300">Identity Confirmed</span>
                    </>
                  ) : isLocationRestricted ? (
                    <>
                      <AlertOctagon size={14} className="text-rose-400" />
                      <span className="text-rose-200 font-bold">You are not in the office area</span>
                    </>
                  ) : geoStatus === 'checking' ? (
                    <>
                      <RefreshCw size={14} className="animate-spin text-blue-400" />
                      <span className="text-blue-200">Verifying GPS office perimeter...</span>
                    </>
                  ) : geoStatus === 'error' ? (
                    <>
                      <AlertTriangle size={14} className="text-amber-400" />
                      <span className="text-amber-200">{geoErrorMessage || 'GPS location error'}</span>
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

                {/* Action Status Badge */}
                <div className="text-right flex flex-col items-center sm:items-end">
                  <div
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                      scanResult.action_taken === 'start_rest'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : scanResult.action_taken === 'end_rest'
                        ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                        : scanResult.action_taken === 'clock_out'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    }`}
                  >
                    {scanResult.action_taken === 'start_rest' ? (
                      <Coffee size={13} />
                    ) : scanResult.action_taken === 'end_rest' ? (
                      <Play size={13} />
                    ) : (
                      <Clock size={13} />
                    )}
                    <span>
                      {scanResult.action_taken === 'start_rest'
                        ? 'REST / BREAK STARTED'
                        : scanResult.action_taken === 'end_rest'
                        ? 'WORK RESUMED'
                        : scanResult.action_taken === 'clock_out'
                        ? 'CLOCKED OUT'
                        : 'CLOCKED IN'}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400 mt-1">
                    {scanResult.action_taken === 'start_rest'
                      ? scanResult.attendance?.rest_start || 'Break Active'
                      : scanResult.action_taken === 'end_rest'
                      ? scanResult.attendance?.rest_end || 'Work Resumed'
                      : scanResult.attendance?.clock_out || scanResult.attendance?.clock_in || 'Recorded'}{' '}
                    • {scanResult.attendance?.date || new Date().toISOString().split('T')[0]}
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
            <div className="space-y-3">
              {/* Geofence Alert Strip if outside office */}
              {isLocationRestricted && (
                <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 text-rose-300 text-left">
                    <AlertOctagon size={16} className="text-rose-400 shrink-0" />
                    <span>
                      <strong className="text-rose-200">Attendance Blocked:</strong> You are not in the office area. Please move inside the registered office boundary.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => verifyGeofence(true)}
                    disabled={isRetryingGps}
                    className="px-3 py-1.5 rounded-lg bg-rose-600/30 hover:bg-rose-600/50 text-rose-200 text-xs font-bold border border-rose-500/40 transition flex items-center gap-1.5 cursor-pointer shrink-0 disabled:opacity-50"
                  >
                    <LocateFixed size={13} className={isRetryingGps ? 'animate-spin' : ''} />
                    Refresh Location
                  </button>
                </div>
              )}

              {/* Normal status footer */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-xs text-slate-400">
                  <p className="font-semibold text-slate-300 flex items-center gap-1.5">
                    <ShieldCheck size={14} className="text-blue-400" />
                    Anti-Spoof Liveness &amp; Geofenced Office Area Active
                  </p>
                  <p className="mt-0.5 text-[11px]">
                    {isLocationRestricted
                      ? 'Attendance locked until you enter office radius.'
                      : 'Look directly at camera. Auto-scan triggers every second.'}
                  </p>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                  {isLocationRestricted ? (
                    <button
                      type="button"
                      onClick={() => verifyGeofence(true)}
                      disabled={isRetryingGps}
                      className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-rose-700/80 hover:bg-rose-600 text-white text-xs font-bold shadow-lg shadow-rose-900/40 transition flex items-center justify-center gap-2 cursor-pointer border border-rose-600/50 disabled:opacity-50"
                    >
                      <RefreshCw size={14} className={isRetryingGps ? 'animate-spin' : ''} />
                      Verify Office Area
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={isVerifying || !streamActive || geoStatus === 'checking'}
                      onClick={runVerification}
                      className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-blue-500/25 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 border-0"
                    >
                      {isVerifying ? (
                        <>
                          <RefreshCw size={15} className="animate-spin" />
                          Scanning...
                        </>
                      ) : geoStatus === 'checking' ? (
                        <>
                          <RefreshCw size={15} className="animate-spin" />
                          Checking GPS...
                        </>
                      ) : (
                        <>
                          <Zap size={15} />
                          Scan Face Now
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

