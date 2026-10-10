'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Camera,
  CheckCircle2,
  RefreshCw,
  X,
  Sparkles,
  ShieldCheck,
  ChevronRight,
  ChevronLeft,
  RotateCcw,
  AlertCircle,
  User,
  Eye,
  Smile,
  Check,
  Building2,
  Zap,
} from 'lucide-react';
import {
  PoseDefinition,
  EmployeeSelectOption,
  getEmployeesForFaceTraining,
  getStandardPoses,
  analyzePoseFrame,
  trainEmployeeFace,
  backgroundTrainingManager,
} from '@/lib/faceApi';

const DEFAULT_POSES: PoseDefinition[] = [
  { id: 'center_1', name: 'Look Straight Ahead', key: 'center', instruction: 'Look directly at the camera, neutral face.' },
  { id: 'turn_slight_left', name: 'Turn Head Slightly Left', key: 'turn_slight_left', instruction: 'Turn your head slightly to your left.' },
  { id: 'turn_left', name: 'Turn Head Left', key: 'turn_left', instruction: 'Turn head more to the left.' },
  { id: 'turn_far_left', name: 'Turn Profile Left', key: 'turn_far_left', instruction: 'Turn your head to show left side profile.' },
  { id: 'turn_slight_right', name: 'Turn Head Slightly Right', key: 'turn_slight_right', instruction: 'Turn your head slightly to your right.' },
  { id: 'turn_right', name: 'Turn Head Right', key: 'turn_right', instruction: 'Turn head more to the right.' },
  { id: 'turn_far_right', name: 'Turn Profile Right', key: 'turn_far_right', instruction: 'Turn your head to show right side profile.' },
  { id: 'tilt_up', name: 'Tilt Head Up', key: 'tilt_up', instruction: 'Slightly tilt your chin upward.' },
  { id: 'tilt_down', name: 'Tilt Head Down', key: 'tilt_down', instruction: 'Slightly tilt your chin downward.' },
  { id: 'smile', name: 'Smile Naturally', key: 'smile', instruction: 'Smile showing a happy expression.' },
  { id: 'blink', name: 'Blink Eyes', key: 'blink', instruction: 'Close your eyes momentarily or blink.' },
  { id: 'tilt_left_shoulder', name: 'Tilt Head to Left Shoulder', key: 'tilt_left_shoulder', instruction: 'Tilt your head slightly toward your left shoulder.' },
  { id: 'tilt_right_shoulder', name: 'Tilt Head to Right Shoulder', key: 'tilt_right_shoulder', instruction: 'Tilt your head slightly toward your right shoulder.' },
  { id: 'open_mouth', name: 'Open Mouth Slightly', key: 'open_mouth', instruction: 'Open your mouth slightly for liveness proof.' },
  { id: 'center_final', name: 'Look Straight & Hold (Final)', key: 'center', instruction: 'Look straight at the camera and hold still.' }
];

interface FaceEnrollmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (employeeCode: string) => void;
  targetEmployee?: {
    employee_code: string;
    name: string;
    role?: string;
    company_id?: string;
    company_name?: string;
  };
  trainedBy?: string; // 'Self' | 'SuperAdmin' | 'MasterAdmin'
}

export default function FaceEnrollmentModal({
  isOpen,
  onClose,
  onSuccess,
  targetEmployee,
  trainedBy = 'Self',
}: FaceEnrollmentModalProps) {
  const [poses, setPoses] = useState<PoseDefinition[]>(DEFAULT_POSES);
  const [currentPoseIndex, setCurrentPoseIndex] = useState(0);
  const [capturedSamples, setCapturedSamples] = useState<Array<{ pose: string; image: string; label: string }>>([]);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Real-time liveness feedback
  const [isPoseMatched, setIsPoseMatched] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [detectionMessage, setDetectionMessage] = useState('Position your face inside the viewfinder');
  const [detectedTags, setDetectedTags] = useState<string[]>([]);
  const [holdProgress, setHoldProgress] = useState(0); // 0 to 100
  const [flashEffect, setFlashEffect] = useState(false);
  const [autoCaptureEnabled, setAutoCaptureEnabled] = useState(true);

  // Training submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isBackgroundTraining, setIsBackgroundTraining] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [allCompleted, setAllCompleted] = useState(false);

  // Staff Selection for SuperAdmin and MasterAdmin
  const [availableEmployees, setAvailableEmployees] = useState<EmployeeSelectOption[]>([]);
  const [selectedEmpCode, setSelectedEmpCode] = useState<string>('');
  const [currentEmployee, setCurrentEmployee] = useState<{
    employee_code: string;
    name: string;
    role?: string;
    company_id?: string;
    company_name?: string;
  } | null>(null);
  const currentEmployeeRef = useRef<any>(null);
  currentEmployeeRef.current = currentEmployee;
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Robust loop references
  const isBusyRef = useRef(false);
  const isCoolingDownRef = useRef(false);
  const allCompletedRef = useRef(false);
  const isSubmittingRef = useRef(false);
  const matchStreakRef = useRef(0);
  const currentPoseIndexRef = useRef(currentPoseIndex);
  const posesRef = useRef(poses);
  const capturedSamplesRef = useRef(capturedSamples);

  useEffect(() => {
    allCompletedRef.current = allCompleted;
  }, [allCompleted]);

  useEffect(() => {
    isSubmittingRef.current = isSubmitting;
  }, [isSubmitting]);

  useEffect(() => {
    currentPoseIndexRef.current = currentPoseIndex;
  }, [currentPoseIndex]);

  useEffect(() => {
    posesRef.current = poses;
  }, [poses]);

  useEffect(() => {
    capturedSamplesRef.current = capturedSamples;
  }, [capturedSamples]);

  // Load available employees for SuperAdmin / MasterAdmin
  useEffect(() => {
    if (isOpen) {
      if (targetEmployee?.employee_code) {
        setCurrentEmployee(targetEmployee);
        setSelectedEmpCode(targetEmployee.employee_code);
      } else {
        setCurrentEmployee(null);
        setSelectedEmpCode('');
      }

      if (trainedBy !== 'Self') {
        setIsLoadingEmployees(true);
        getEmployeesForFaceTraining()
          .then((emps) => {
            setAvailableEmployees(emps);
            if (targetEmployee?.employee_code) {
              const matched = emps.find((e) => e.employee_code === targetEmployee.employee_code);
              if (matched) {
                setCurrentEmployee({
                  employee_code: matched.employee_code,
                  name: matched.name,
                  role: matched.role,
                  company_name: matched.assigned_companies?.[0] || targetEmployee.company_name || 'Assigned Company',
                });
                setSelectedEmpCode(matched.employee_code);
              }
            }
          })
          .catch((err) => console.error('Failed to load employees for face training:', err))
          .finally(() => setIsLoadingEmployees(false));
      }
    }
  }, [isOpen, targetEmployee, trainedBy]);

  const handleEmployeeChange = (code: string) => {
    setSelectedEmpCode(code);
    const found = availableEmployees.find((e) => e.employee_code === code);
    if (found) {
      setCurrentEmployee({
        employee_code: found.employee_code,
        name: found.name,
        role: found.role,
        company_name: found.assigned_companies?.[0] || 'Assigned Company',
      });
      // Clear any captured samples for the previous person
      setCapturedSamples([]);
      capturedSamplesRef.current = [];
      setCurrentPoseIndex(0);
      currentPoseIndexRef.current = 0;
      setAllCompleted(false);
      allCompletedRef.current = false;
      isCoolingDownRef.current = false;
      matchStreakRef.current = 0;
    } else {
      setCurrentEmployee(null);
    }
  };

  // Load standard 15 poses
  useEffect(() => {
    if (isOpen) {
      getStandardPoses().then((list) => {
        if (list && list.length > 0) {
          setPoses(list);
          posesRef.current = list;
        }
      });
      setCurrentPoseIndex(0);
      currentPoseIndexRef.current = 0;
      setCapturedSamples([]);
      capturedSamplesRef.current = [];
      setSubmitSuccess(false);
      setSubmitError(null);
      setIsBackgroundTraining(false);
      setIsSubmitting(false);
      isSubmittingRef.current = false;
      setAllCompleted(false);
      allCompletedRef.current = false;
      setHoldProgress(0);
      setIsPoseMatched(false);
      setFaceDetected(false);
      isCoolingDownRef.current = false;
      matchStreakRef.current = 0;
    }
  }, [isOpen]);

  // Start Camera
  const startCamera = useCallback(async () => {
    try {
      setCameraError(null);
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
          console.warn('Video play exception:', e);
        }
        setIsCameraActive(true);
      }
    } catch (err: any) {
      setCameraError(
        err.name === 'NotAllowedError'
          ? 'Camera permission denied. Please allow camera access in browser settings.'
          : `Camera error: ${err.message || 'Device unavailable'}`
      );
      setIsCameraActive(false);
    }
  }, []);

  // Stop Camera
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
    isBusyRef.current = false;
  }, []);

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, startCamera, stopCamera]);

  // Capture current frame from canvas (fast JPEG, max 480px width for fast CPU processing)
  const getCanvasFrameBase64 = useCallback((): string | null => {
    if (!videoRef.current || !canvasRef.current) return null;
    const video = videoRef.current;
    const canvas = canvasRef.current;

    const vw = video.videoWidth;
    const vh = video.videoHeight;
    if (vw === 0 || vh === 0) return null;

    // Scale to max width 480px for high-speed CPU landmark detection
    const targetWidth = Math.min(480, vw);
    const targetHeight = Math.round((vh / vw) * targetWidth);

    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.save();
    // Do not mirror captured photo so face landmarks match standard orientation
    ctx.drawImage(video, 0, 0, targetWidth, targetHeight);
    ctx.restore();

    return canvas.toDataURL('image/jpeg', 0.82);
  }, []);

  // Trigger shutter visual and audio flash
  const triggerShutterFlash = useCallback(() => {
    setFlashEffect(true);
    setTimeout(() => setFlashEffect(false), 200);

    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.1);
    } catch {}
  }, []);

  // Capture current pose sample
  const capturePoseAtIndex = useCallback(
    (indexToCapture: number, existingFrame?: string | null) => {
      // ABSOLUTE GATE: If admin has not selected an employee yet, DO NOT TAKE PHOTO
      if (trainedBy !== 'Self' && !currentEmployeeRef.current) {
        return;
      }

      // If already cooling down, completed all poses, or submitting: NEVER TAKE PHOTO
      if (
        isCoolingDownRef.current ||
        allCompletedRef.current ||
        isSubmittingRef.current
      ) {
        return;
      }

      const currentList = posesRef.current.length > 0 ? posesRef.current : DEFAULT_POSES;
      if (indexToCapture < 0 || indexToCapture >= currentList.length) return;
      const targetPose = currentList[indexToCapture];
      if (!targetPose) return;

      const frame = existingFrame || getCanvasFrameBase64();
      if (!frame) return;

      // Lock cooldown immediately to prevent double snaps
      isCoolingDownRef.current = true;
      triggerShutterFlash();

      // Synchronously update captured samples ref AND state
      const copy = [...capturedSamplesRef.current];
      copy[indexToCapture] = {
        pose: targetPose.key,
        image: frame,
        label: targetPose.name,
      };
      capturedSamplesRef.current = copy;
      setCapturedSamples(copy);

      const validCount = copy.filter((s) => Boolean(s && s.image)).length;
      const isDone = validCount >= currentList.length;

      setHoldProgress(100);
      setIsPoseMatched(true);
      setDetectionMessage(`✓ Captured: ${targetPose.name}!`);

      if (isDone) {
        // ALL 15 POSES COMPLETED - PERMANENTLY HALT CAPTURING
        allCompletedRef.current = true;
        setAllCompleted(true);
        isCoolingDownRef.current = true; // Lock permanently
        matchStreakRef.current = 0;
        setCurrentPoseIndex(currentList.length - 1);
        setTimeout(() => {
          setIsPoseMatched(false);
          setHoldProgress(0);
          isCoolingDownRef.current = true; // KEEP locked
          setDetectionMessage('🎉 All 15 poses captured! Click "Enroll & Train All 15 Poses" below.');
        }, 400);
      } else {
        // Advance to next uncaptured pose
        let nextIndex = (indexToCapture + 1) % currentList.length;
        if (copy[nextIndex]?.image) {
          const firstUncaptured = copy.findIndex((s, i) => i < currentList.length && !s?.image);
          if (firstUncaptured !== -1) {
            nextIndex = firstUncaptured;
          }
        }

        currentPoseIndexRef.current = nextIndex;
        setCurrentPoseIndex(nextIndex);
        setTimeout(() => {
          setIsPoseMatched(false);
          setHoldProgress(0);
          matchStreakRef.current = 0;
          isCoolingDownRef.current = false;
        }, 750);
      }
    },
    [trainedBy, getCanvasFrameBase64, triggerShutterFlash]
  );

  // Manual snapshot button click
  const handleManualCapture = () => {
    if (trainedBy !== 'Self' && !currentEmployee) return;
    if (allCompletedRef.current || allCompleted || isSubmitting) return;
    capturePoseAtIndex(currentPoseIndexRef.current);
  };

  // Keyboard shortcut: Spacebar captures current pose
  useEffect(() => {
    if (!isOpen || submitSuccess || allCompleted || isSubmitting) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (trainedBy !== 'Self' && !currentEmployee) return;
      if (allCompletedRef.current || allCompleted || isSubmitting) return;
      if (e.code === 'Space' && e.target === document.body) {
        e.preventDefault();
        handleManualCapture();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, submitSuccess, allCompleted, isSubmitting, trainedBy, currentEmployee, handleManualCapture]);

  // CONTINUOUS LIVENESS & POSE ANALYSIS LOOP (UNBREAKABLE REF-BASED)
  useEffect(() => {
    // If modal not open, camera inactive, submission success, ALL COMPLETED, or SUBMITTING: DO NOT RUN LOOP!
    if (!isOpen || !isCameraActive || submitSuccess || allCompleted || isSubmitting) return;

    const interval = setInterval(async () => {
      // If admin has not chosen an employee, pause frame analysis
      if (trainedBy !== 'Self' && !currentEmployeeRef.current) return;

      // 1. Permanent gate: If all poses completed, submitting, cooldown locked, or busy: STOP immediately
      if (
        allCompletedRef.current ||
        isSubmittingRef.current ||
        isCoolingDownRef.current ||
        isBusyRef.current
      ) {
        return;
      }

      const list = posesRef.current.length > 0 ? posesRef.current : DEFAULT_POSES;
      const validCount = capturedSamplesRef.current.filter((s) => Boolean(s && s.image)).length;
      if (validCount >= list.length) {
        allCompletedRef.current = true;
        setAllCompleted(true);
        isCoolingDownRef.current = true;
        return;
      }

      const idx = currentPoseIndexRef.current;
      if (idx >= list.length) return;
      const pose = list[idx];
      if (!pose) return;

      // If current pose is already captured, do not auto-capture again
      if (capturedSamplesRef.current[idx]?.image) return;

      const frame = getCanvasFrameBase64();
      if (!frame) return;

      isBusyRef.current = true;
      try {
        const result = await analyzePoseFrame(frame, pose.key);

        // Double check gate after async network roundtrip!
        if (
          allCompletedRef.current ||
          isCoolingDownRef.current ||
          isSubmittingRef.current ||
          (trainedBy !== 'Self' && !currentEmployeeRef.current)
        ) {
          return;
        }

        if (!result.face_detected) {
          setFaceDetected(false);
          setIsPoseMatched(false);
          matchStreakRef.current = 0;
          setHoldProgress(0);
          setDetectionMessage(result.message || 'Position face inside the reticle');
          setDetectedTags([]);
        } else {
          setFaceDetected(true);
          setDetectedTags(result.detected_tags || []);

          if (result.is_match) {
            setIsPoseMatched(true);
            setDetectionMessage('Pose matched! Capturing photo...');

            if (autoCaptureEnabled && !isCoolingDownRef.current && !allCompletedRef.current && !isSubmittingRef.current) {
              matchStreakRef.current += 1;
              setHoldProgress(100);
              // Auto-capture immediately on confirmed match!
              capturePoseAtIndex(idx, frame);
            }
          } else {
            setIsPoseMatched(false);
            matchStreakRef.current = 0;
            setHoldProgress(0);
            setDetectionMessage(pose.instruction || `Perform: ${pose.name}`);
          }
        }
      } catch (err) {
        // Continue loop gracefully
      } finally {
        isBusyRef.current = false;
      }
    }, 350);

    return () => {
      clearInterval(interval);
      isBusyRef.current = false;
    };
  }, [
    isOpen,
    isCameraActive,
    submitSuccess,
    allCompleted,
    isSubmitting,
    trainedBy,
    currentEmployee,
    autoCaptureEnabled,
    getCanvasFrameBase64,
    capturePoseAtIndex,
  ]);

  // Submit collected poses to Flask AI backend for background training
  const handleTrainAndEnroll = () => {
    const activeEmp = currentEmployee || targetEmployee;
    if (!activeEmp || !activeEmp.employee_code || capturedSamples.length < 5) return;

    allCompletedRef.current = true;
    setAllCompleted(true);
    isCoolingDownRef.current = true;
    isSubmittingRef.current = true;
    setIsSubmitting(true);
    setIsBackgroundTraining(true);
    setSubmitError(null);

    const validSamples = capturedSamples.filter((s) => Boolean(s && s.image));

    backgroundTrainingManager.startTraining(
      {
        employee_code: activeEmp.employee_code,
        name: activeEmp.name,
        role: activeEmp.role || 'Employee',
        company_id: activeEmp.company_id,
        company_name: activeEmp.company_name,
        trained_by: trainedBy,
        samples: validSamples.map((s) => ({
          pose: s.pose,
          image: s.image,
        })),
      },
      {
        onSuccess: (empCode, message) => {
          setIsSubmitting(false);
          setIsBackgroundTraining(false);
          setSubmitSuccess(true);
          if (onSuccess) {
            onSuccess(empCode);
          }
        },
        onError: (err) => {
          setIsSubmitting(false);
          setIsBackgroundTraining(false);
          setSubmitError(err);
        },
      }
    );
  };

  if (!isOpen) return null;

  const activeEmp = currentEmployee || targetEmployee;
  const currentPose = poses[currentPoseIndex];
  const totalPoses = poses.length || 15;
  const capturedCount = capturedSamples.filter((s) => Boolean(s && s.image)).length;
  const allPosesCompleted = capturedCount >= totalPoses;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col max-h-[96vh] text-white">
        {/* Top Header */}
        <div className="bg-slate-800/90 border-b border-slate-700 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-400 flex items-center justify-center shadow-xs">
              <Camera size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-extrabold m-0 text-white tracking-wide uppercase">
                  Biometric Face Enrollment &amp; Liveness
                </h3>
                <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full uppercase">
                  15 Poses • CPU Model
                </span>
              </div>
              <p className="text-xs text-slate-400 m-0 mt-0.5 flex items-center gap-2 flex-wrap">
                <span>Enrolling Staff:</span>
                {(currentEmployee || targetEmployee) ? (
                  <>
                    <span className="text-blue-300 font-bold">
                      {(currentEmployee || targetEmployee)?.name} ({(currentEmployee || targetEmployee)?.employee_code})
                    </span>
                    {(currentEmployee || targetEmployee)?.company_name && (
                      <>
                        <span>•</span>
                        <span className="text-slate-300 truncate max-w-[180px]">
                          {(currentEmployee || targetEmployee)?.company_name}
                        </span>
                      </>
                    )}
                  </>
                ) : (
                  <span className="text-amber-400 font-semibold italic">
                    Select an employee below to calibrate
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Auto Capture Toggle */}
            <label className="hidden sm:flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700">
              <input
                type="checkbox"
                checked={autoCaptureEnabled}
                onChange={(e) => setAutoCaptureEnabled(e.target.checked)}
                className="rounded border-slate-600 bg-slate-700 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <span>Auto-Capture</span>
            </label>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer transition-colors border border-slate-700"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Hidden Canvas for Frame Capture */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Main Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {submitSuccess ? (
            /* Success View */
            <div className="py-12 px-4 text-center space-y-4">
              <div className="w-18 h-18 mx-auto rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shadow-lg animate-bounce">
                <CheckCircle2 size={44} />
              </div>
              <h2 className="text-xl font-black text-white m-0">Face Profile Enrolled &amp; Trained!</h2>
              <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto leading-relaxed">
                Biometric 128-dimensional encodings have been generated across all 15 poses and stored in MySQL database. {(currentEmployee || targetEmployee)?.name} can now clock in with instant face recognition!
              </p>

              <div className="pt-4 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2.5 rounded-xl bg-[#0b4da2] hover:bg-[#083a7c] text-white text-xs font-bold transition-all shadow-md cursor-pointer border-0"
                >
                  Close &amp; Return to Dashboard
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Employee Selector for SuperAdmin / MasterAdmin */}
              {trainedBy !== 'Self' && (
                <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-3.5 sm:p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center shrink-0">
                      <User size={20} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <label htmlFor="staff-select" className="text-xs font-bold text-white tracking-wide">
                          Select Employee to Train Face
                        </label>
                        <span className="text-[10px] font-bold text-blue-400 bg-blue-950/80 px-2 py-0.5 rounded-full border border-blue-800/60 uppercase">
                          Required
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 m-0 mt-0.5">
                        {currentEmployee
                          ? `Enrolling: ${currentEmployee.name} (${currentEmployee.employee_code}) • ${currentEmployee.company_name || 'Assigned Company'}`
                          : 'Please choose which staff member will be registered with these 15 poses.'}
                      </p>
                    </div>
                  </div>

                  <div className="min-w-[270px] sm:max-w-xs w-full">
                    <select
                      id="staff-select"
                      value={selectedEmpCode}
                      onChange={(e) => handleEmployeeChange(e.target.value)}
                      disabled={isSubmitting || isBackgroundTraining}
                      className="w-full bg-slate-900 border border-slate-600 focus:border-blue-500 hover:border-slate-500 text-white text-xs font-semibold rounded-xl px-3 py-2.5 focus:outline-hidden focus:ring-2 focus:ring-blue-500/40 transition cursor-pointer"
                    >
                      <option value="">
                        {isLoadingEmployees
                          ? 'Loading employees list...'
                          : `-- Choose Employee (${availableEmployees.length} Total) --`}
                      </option>
                      {availableEmployees.map((emp) => (
                        <option key={emp.employee_code} value={emp.employee_code}>
                          {emp.name} ({emp.employee_code}) {emp.is_face_enrolled ? `• [Enrolled (${emp.face_sample_count || 15} Poses)]` : '• [Not Enrolled]'}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Camera Area + Viewfinder */}
              <div className="relative rounded-2xl bg-black overflow-hidden aspect-4/3 max-h-[360px] sm:max-h-[400px] mx-auto flex items-center justify-center shadow-inner border border-slate-800">
                {/* Overlay asking to choose employee first */}
                {trainedBy !== 'Self' && !currentEmployee && (
                  <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center z-20 space-y-3">
                    <div className="w-14 h-14 rounded-2xl bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center shadow-lg animate-pulse">
                      <User size={28} />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-white m-0">Please Select an Employee Above</h4>
                      <p className="text-xs text-slate-300 max-w-xs m-0 leading-relaxed">
                        Choose a staff member from the dropdown above before starting the 15-pose face calibration.
                      </p>
                    </div>
                  </div>
                )}

                {/* Live Video */}
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover transform -scale-x-100 ${
                    flashEffect ? 'brightness-150 contrast-125' : ''
                  }`}
                />

                {/* Shutter White Flash Overlay */}
                {flashEffect && <div className="absolute inset-0 bg-white/70 pointer-events-none transition-opacity duration-150" />}

                {/* Target Viewfinder Overlay */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div
                    className={`relative w-52 h-68 sm:w-60 sm:h-76 rounded-[48%] border-3 transition-all duration-300 ${
                      isPoseMatched
                        ? 'border-emerald-400 shadow-[0_0_35px_rgba(52,211,153,0.7)] scale-102'
                        : faceDetected
                        ? 'border-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.4)]'
                        : 'border-white/30'
                    }`}
                  >
                    {/* Corner Reticles */}
                    <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-white" />
                    <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-white" />
                    <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-white" />
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-white" />

                    {/* Scanning Line */}
                    <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 h-0.5 bg-blue-400/40 animate-pulse" />
                  </div>
                </div>

                {/* Camera Error Message */}
                {cameraError && (
                  <div className="absolute inset-0 bg-slate-900/90 flex flex-col items-center justify-center p-6 text-center text-red-300 space-y-3">
                    <AlertCircle size={36} className="text-red-400" />
                    <p className="text-xs font-semibold max-w-sm">{cameraError}</p>
                    <button
                      type="button"
                      onClick={startCamera}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer border-0"
                    >
                      Try Again
                    </button>
                  </div>
                )}

                {/* Top Overlay Badge: Current Pose Instruction */}
                {currentPose && (
                  <div className="absolute top-3 inset-x-3 flex items-center justify-between pointer-events-none">
                    <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700/80 px-3.5 py-1.5 rounded-xl text-left shadow-lg">
                      <div className="text-[10px] text-blue-400 font-extrabold uppercase tracking-wider">
                        Pose {currentPoseIndex + 1} of {totalPoses}
                      </div>
                      <div className="text-xs sm:text-sm font-black text-white">{currentPose.name}</div>
                    </div>

                    <div
                      className={`px-3 py-1.5 rounded-xl text-[11px] font-bold border backdrop-blur-md shadow-lg transition-all ${
                        allCompleted
                          ? 'bg-emerald-500/30 text-emerald-200 border-emerald-400'
                          : isPoseMatched
                          ? 'bg-emerald-500/25 text-emerald-300 border-emerald-400/60'
                          : faceDetected
                          ? 'bg-blue-500/25 text-blue-300 border-blue-400/50'
                          : 'bg-slate-800/80 text-slate-400 border-slate-700'
                      }`}
                    >
                      {allCompleted
                        ? 'All 15 Poses Completed ✓'
                        : isPoseMatched
                        ? 'Pose Matched ✓'
                        : faceDetected
                        ? 'Face Detected'
                        : 'Looking for Face...'}
                    </div>
                  </div>
                )}

                {/* Bottom Overlay Prompt */}
                <div className="absolute bottom-3 inset-x-3 pointer-events-none flex flex-col items-center">
                  <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700/80 px-4 py-2 rounded-xl text-center shadow-lg max-w-md w-full">
                    <p className="text-xs font-semibold text-slate-200 m-0">{detectionMessage}</p>

                    {/* Holding Progress Bar */}
                    {isPoseMatched && (
                      <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2 overflow-hidden border border-slate-700">
                        <div
                          className="bg-emerald-400 h-full transition-all duration-150"
                          style={{ width: `${holdProgress}%` }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons & Manual Controls Strip */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-800/70 p-3.5 rounded-xl border border-slate-700/60">
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <span className="font-bold text-white text-sm">{capturedCount}</span> of {totalPoses} poses captured
                  <span className="text-slate-500">•</span>
                  <span className="text-[11px] text-slate-400">
                    {allPosesCompleted ? 'All poses captured!' : 'Hold pose or click Snap Photo below'}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (currentPoseIndex > 0) {
                        const prev = currentPoseIndex - 1;
                        currentPoseIndexRef.current = prev;
                        setCurrentPoseIndex(prev);
                      }
                    }}
                    disabled={currentPoseIndex === 0}
                    className="inline-flex items-center gap-1 text-xs font-bold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-2.5 py-2 rounded-lg border border-slate-700 transition cursor-pointer disabled:opacity-40"
                    title="Previous Pose"
                  >
                    <ChevronLeft size={14} />
                    <span>Prev</span>
                  </button>

                  {/* PROMINENT INSTANT SNAP BUTTON */}
                  <button
                    type="button"
                    onClick={handleManualCapture}
                    disabled={!isCameraActive || submitSuccess || allCompleted || isSubmitting}
                    className="inline-flex items-center gap-2 text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 px-4 py-2 rounded-xl border-0 shadow-lg shadow-emerald-600/30 transition cursor-pointer disabled:opacity-50"
                    title={allCompleted ? 'All 15 poses captured' : 'Capture current pose immediately (or press Spacebar)'}
                  >
                    <Camera size={15} />
                    <span>{allCompleted ? 'All 15 Poses Captured ✓' : `Snap Photo #${currentPoseIndex + 1}`}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (currentPoseIndex < totalPoses - 1) {
                        const next = currentPoseIndex + 1;
                        currentPoseIndexRef.current = next;
                        setCurrentPoseIndex(next);
                      }
                    }}
                    disabled={currentPoseIndex >= totalPoses - 1}
                    className="inline-flex items-center gap-1 text-xs font-bold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-2.5 py-2 rounded-lg border border-slate-700 transition cursor-pointer disabled:opacity-40"
                    title="Skip to next pose"
                  >
                    <span>Skip</span>
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>

              {/* 15 Poses Horizontal Dock */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold text-slate-400">
                  <span className="uppercase tracking-wider">15 Facial Angles &amp; Expressions</span>
                  <span className="text-blue-400 text-[11px]">Click any thumbnail to retake</span>
                </div>

                <div className="grid grid-cols-5 sm:grid-cols-8 lg:grid-cols-15 gap-1.5 p-1.5 bg-slate-800/40 rounded-xl border border-slate-800">
                  {poses.map((p, idx) => {
                    const sample = capturedSamples[idx];
                    const isCaptured = Boolean(sample && sample.image);
                    const isCurrent = idx === currentPoseIndex;

                    return (
                      <div
                        key={p.id || idx}
                        onClick={() => {
                          currentPoseIndexRef.current = idx;
                          setCurrentPoseIndex(idx);
                          // Clear this specific sample so user can retake it
                          const updated = [...capturedSamplesRef.current];
                          delete updated[idx];
                          capturedSamplesRef.current = updated;
                          setCapturedSamples(updated);

                          // Allow capturing this specific pose
                          allCompletedRef.current = false;
                          setAllCompleted(false);
                          isCoolingDownRef.current = false;
                        }}
                        className={`relative aspect-square rounded-lg border p-0.5 flex flex-col items-center justify-center cursor-pointer transition-all ${
                          isCurrent
                            ? 'border-blue-400 bg-blue-600/30 ring-2 ring-blue-500/50'
                            : isCaptured
                            ? 'border-emerald-500/60 bg-emerald-950/40 hover:border-emerald-400'
                            : 'border-slate-700 bg-slate-800/60 hover:border-slate-500'
                        }`}
                        title={`${idx + 1}. ${p.name}`}
                      >
                        {isCaptured ? (
                          <>
                            <img
                              src={sample.image}
                              alt=""
                              className="w-full h-full object-cover rounded-md"
                            />
                            <div className="absolute top-0.5 right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-xs">
                              <Check size={9} strokeWidth={3} />
                            </div>
                          </>
                        ) : (
                          <div className="flex flex-col items-center justify-center text-center">
                            <span className="text-[10px] font-bold text-slate-400">#{idx + 1}</span>
                            <span className="text-[8px] text-slate-500 truncate max-w-full px-0.5">
                              {p.key}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Submit Error */}
              {submitError && (
                <div className="p-3 bg-red-900/30 border border-red-500/40 rounded-xl text-red-300 text-xs flex items-center gap-2">
                  <AlertCircle size={15} className="shrink-0 text-red-400" />
                  <span>{submitError}</span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        {!submitSuccess && (
          <div className="bg-slate-800/80 border-t border-slate-700 px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-slate-700 hover:text-white transition-colors cursor-pointer border border-slate-600"
            >
              {isBackgroundTraining ? 'Close Window (Training in Background)' : 'Cancel'}
            </button>

            <div className="flex flex-wrap items-center gap-2.5">
              {isBackgroundTraining && (
                <div className="flex items-center gap-2 text-xs text-blue-300 font-semibold bg-blue-950/70 px-3 py-1.5 rounded-xl border border-blue-500/40">
                  <RefreshCw size={13} className="animate-spin text-blue-400 shrink-0" />
                  <span>AI training running in background... You can close this window.</span>
                </div>
              )}

              <button
                type="button"
                onClick={handleTrainAndEnroll}
                disabled={!activeEmp || capturedCount < 5 || isSubmitting}
                className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-white text-xs font-black transition-all shadow-md cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed border-0 ${
                  allPosesCompleted
                    ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-400 ring-4 ring-emerald-500/40 shadow-emerald-500/30'
                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Training in Background...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={14} />
                    <span>
                      {!activeEmp
                        ? 'Select an Employee Above'
                        : allPosesCompleted
                        ? `Enroll & Train All 15 Poses (${activeEmp.name})`
                        : `Train with ${capturedCount} Poses (${activeEmp.name})`}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
