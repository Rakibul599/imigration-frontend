// API client for Python Flask Face Matching & Attendance Service

export const FACE_API_BASE =
  process.env.NEXT_PUBLIC_FACE_API_URL || 'http://localhost:5001';

export interface PoseDefinition {
  id: string;
  name: string;
  key: string;
  instruction: string;
}

export interface AnalyzePoseResult {
  success: boolean;
  face_detected: boolean;
  is_match: boolean;
  target_pose?: string;
  detected_tags?: string[];
  metrics?: {
    yaw_ratio: number;
    pitch_ratio: number;
    roll_deg: number;
    smile_ratio: number;
    ear: number;
  };
  box?: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  message: string;
}

export interface FaceProfileItem {
  id: number;
  employee_id?: number;
  employee_code: string;
  name: string;
  role: string;
  company_id?: string;
  company_name?: string;
  sample_count: number;
  trained_by: string;
  trained_at?: string;
  is_active: boolean;
  thumbnails: string[];
  pose_labels?: string[];
}

export const LARAVEL_API_BASE =
  process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api';

export interface AttendanceRecord {
  id: number;
  employee_id?: number;
  employee_code: string;
  name: string;
  role: string;
  company_id?: string;
  company_name?: string;
  date: string;
  clock_in?: string;
  clock_out?: string;
  is_working?: boolean;
  rest_start?: string;
  rest_end?: string;
  rest_time_minutes?: number;
  is_on_rest?: boolean;
  current_rest_session_minutes?: number;
  allowed_rest_minutes?: number;
  absent_minutes?: number;
  actual_working_minutes?: number;
  general_working_hours?: number;
  overtime_minutes?: number;
  status: string; // 'Present' | 'Late' | 'Half Day'
  verification_method: string;
  confidence_score: number;
  snapshot_path?: string;
  device_info?: string;
  notes?: string;
}


export interface AttendanceStats {
  date: string;
  total_employees: number;
  total_enrolled_faces: number;
  today_present: number;
  today_late: number;
  today_clocked_in: number;
  today_clocked_out: number;
  attendance_rate: number;
}

export interface EmployeeSelectOption {
  id: number;
  employee_code: string;
  name: string;
  email: string;
  role: string;
  assigned_companies: string[];
  master_admin_id?: string;
  master_admin_name?: string;
  status: string;
  is_face_enrolled: boolean;
  face_sample_count?: number;
  face_trained_at?: string;
}

/** Check service health */
export async function checkFaceServiceHealth(): Promise<{ online: boolean; message?: string }> {
  try {
    const res = await fetch(`${FACE_API_BASE}/health`, { method: 'GET', signal: AbortSignal.timeout(3000) });
    if (!res.ok) return { online: false, message: `Server error ${res.status}` };
    const data = await res.json();
    return { online: data.status === 'online', message: data.service };
  } catch (err: any) {
    return { online: false, message: err.message || 'Face matching server unreachable' };
  }
}

/** Get standard 15 poses */
export async function getStandardPoses(): Promise<PoseDefinition[]> {
  try {
    const res = await fetch(`${FACE_API_BASE}/api/poses`);
    const data = await res.json();
    return data.poses || [];
  } catch {
    return [];
  }
}

/** Real-time pose analysis */
export async function analyzePoseFrame(imageBase64: string, targetPose: string): Promise<AnalyzePoseResult> {
  try {
    const res = await fetch(`${FACE_API_BASE}/api/analyze-pose`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: imageBase64, target_pose: targetPose }),
    });
    return await res.json();
  } catch (err: any) {
    return {
      success: false,
      face_detected: false,
      is_match: false,
      message: err.message || 'Failed to analyze frame',
    };
  }
}

/** Train / Enroll employee face with collected pose samples */
export async function trainEmployeeFace(payload: {
  employee_code: string;
  name: string;
  role?: string;
  company_id?: string;
  company_name?: string;
  trained_by?: string;
  samples: Array<{ pose: string; image: string }>;
}): Promise<{ success: boolean; message: string; samples_trained?: number }> {
  try {
    const res = await fetch(`${FACE_API_BASE}/api/train-face`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    return data;
  } catch (err: any) {
    return { success: false, message: err.message || 'Face enrollment submission failed' };
  }
}

/** Verify face and mark attendance */
export async function verifyAndMarkAttendance(payload: {
  image: string;
  employee_code?: string;
  action?: 'auto' | 'clock_in' | 'clock_out' | 'start_rest' | 'end_rest';
  device_info?: string;
}): Promise<{
  success: boolean;
  matched: boolean;
  message: string;
  action_taken?: string;
  confidence?: number;
  distance?: number;
  employee?: {
    id?: number;
    employee_code: string;
    name: string;
    role: string;
    company_name?: string;
  };
  attendance?: AttendanceRecord;
}> {
  try {
    const res = await fetch(`${FACE_API_BASE}/api/verify-and-attend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    return data;
  } catch (err: any) {
    return {
      success: false,
      matched: false,
      message: err.message || 'Attendance verification request failed',
    };
  }
}

/** List all enrolled face profiles */
export async function getFaceProfiles(): Promise<FaceProfileItem[]> {
  try {
    const res = await fetch(`${FACE_API_BASE}/api/face-profiles`);
    const data = await res.json();
    return data.profiles || [];
  } catch {
    return [];
  }
}

/** Get single employee face profile */
export async function getEmployeeFaceProfile(employeeCode: string): Promise<{
  enrolled: boolean;
  profile?: FaceProfileItem;
  message?: string;
}> {
  try {
    const res = await fetch(`${FACE_API_BASE}/api/face-profiles/${encodeURIComponent(employeeCode)}`);
    if (!res.ok) return { enrolled: false };
    const data = await res.json();
    return { enrolled: Boolean(data.enrolled), profile: data.profile };
  } catch {
    return { enrolled: false };
  }
}

/** Delete / Reset employee face profile */
export async function deleteEmployeeFaceProfile(employeeCode: string): Promise<boolean> {
  try {
    const res = await fetch(`${FACE_API_BASE}/api/face-profiles/${encodeURIComponent(employeeCode)}`, {
      method: 'DELETE',
    });
    const data = await res.json();
    return Boolean(data.success);
  } catch {
    return false;
  }
}

/** Get attendance records with filters */
export async function getAttendanceRecords(params?: {
  date?: string;
  start_date?: string;
  end_date?: string;
  employee_code?: string;
  company_id?: string;
  search?: string;
}): Promise<AttendanceRecord[]> {
  const query = new URLSearchParams();
  if (params?.date) query.set('date', params.date);
  if (params?.start_date) query.set('start_date', params.start_date);
  if (params?.end_date) query.set('end_date', params.end_date);
  if (params?.employee_code) query.set('employee_code', params.employee_code);
  if (params?.company_id) query.set('company_id', params.company_id);
  if (params?.search) query.set('search', params.search);

  // Try Laravel REST API first (which includes schedule calculations and live rest timers)
  try {
    const res = await fetch(`${LARAVEL_API_BASE}/attendances?${query.toString()}`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.records)) {
        return data.records;
      }
    }
  } catch (err) {
    // fallback to Python backend below
  }

  // Fallback to Python Face-Matching service
  try {
    const res = await fetch(`${FACE_API_BASE}/api/attendances?${query.toString()}`);
    const data = await res.json();
    return data.records || [];
  } catch {
    return [];
  }
}

/** Get today's attendance & rest status for an employee */
export async function getTodayAttendanceStatus(employeeCode: string): Promise<{
  success: boolean;
  clocked_in: boolean;
  clocked_out: boolean;
  is_on_rest: boolean;
  current_rest_session_minutes?: number;
  effective_rest_minutes?: number;
  absent_minutes?: number;
  attendance?: AttendanceRecord | null;
  schedule_rules?: {
    general_working_hours: number;
    rest_time_minutes: number;
  };
}> {
  try {
    const res = await fetch(
      `${LARAVEL_API_BASE}/attendances/today-status?employee_code=${encodeURIComponent(employeeCode)}`
    );
    if (res.ok) {
      return await res.json();
    }
  } catch {}

  return {
    success: false,
    clocked_in: false,
    clocked_out: false,
    is_on_rest: false,
    attendance: null,
  };
}

/** Start Rest / Break for employee */
export async function startEmployeeRest(employeeCode: string): Promise<{
  success: boolean;
  message: string;
  attendance?: AttendanceRecord;
}> {
  // Try Laravel first
  try {
    const res = await fetch(`${LARAVEL_API_BASE}/attendances/start-rest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ employee_code: employeeCode }),
    });
    const data = await res.json();
    if (res.ok && data.success) return data;
    if (data.message) return data;
  } catch {}

  // Fallback to Python service
  try {
    const res = await fetch(`${FACE_API_BASE}/api/attendances/start-rest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ employee_code: employeeCode }),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, message: err?.message || 'Failed to start rest' };
  }
}

/** End Rest / Resume Work for employee */
export async function endEmployeeRest(employeeCode: string): Promise<{
  success: boolean;
  message: string;
  break_minutes_taken?: number;
  total_rest_minutes?: number;
  absent_minutes?: number;
  attendance?: AttendanceRecord;
}> {
  // Try Laravel first
  try {
    const res = await fetch(`${LARAVEL_API_BASE}/attendances/end-rest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ employee_code: employeeCode }),
    });
    const data = await res.json();
    if (res.ok && data.success) return data;
    if (data.message) return data;
  } catch {}

  // Fallback to Python service
  try {
    const res = await fetch(`${FACE_API_BASE}/api/attendances/end-rest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ employee_code: employeeCode }),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, message: err?.message || 'Failed to resume work' };
  }
}

/** Clock out employee */
export async function clockOutEmployee(employeeCode: string): Promise<{
  success: boolean;
  message: string;
  attendance?: AttendanceRecord;
}> {
  try {
    const res = await fetch(`${LARAVEL_API_BASE}/attendances/clock-out`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ employee_code: employeeCode }),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, message: err?.message || 'Failed to clock out' };
  }
}

/** Format duration in minutes to user-friendly string */
export function formatDuration(minutes?: number | null, fallback = '-'): string {
  if (minutes === undefined || minutes === null || isNaN(minutes) || minutes < 0) {
    return fallback;
  }
  if (minutes === 0) {
    return '0 min';
  }
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hrs > 0 && mins > 0) {
    return `${hrs} hr ${mins} min`;
  }
  if (hrs > 0) {
    return `${hrs} hr${hrs > 1 ? 's' : ''}`;
  }
  return `${mins} min${mins > 1 ? 's' : ''}`;
}

/** Format 24-hour time string "HH:MM:SS" or "HH:MM" to 12-hour AM/PM format */
export function formatTimeAMPM(timeStr?: string | null): string {
  if (!timeStr) return '—';
  try {
    const parts = timeStr.trim().split(':');
    if (parts.length < 2) return timeStr;
    let hour = parseInt(parts[0], 10);
    const minute = parts[1];
    if (isNaN(hour)) return timeStr;
    const ampm = hour >= 12 ? 'PM' : 'AM';
    hour = hour % 12 || 12;
    return `${hour.toString().padStart(2, '0')}:${minute} ${ampm}`;
  } catch {
    return timeStr;
  }
}


/** Get attendance stats for today */
export async function getAttendanceStats(): Promise<AttendanceStats | null> {
  try {
    const res = await fetch(`${FACE_API_BASE}/api/attendance-stats`);
    const data = await res.json();
    return data.success ? data : null;
  } catch {
    return null;
  }
}

/** Get list of employees for face training dropdown */
export async function getEmployeesForFaceTraining(): Promise<EmployeeSelectOption[]> {
  try {
    const res = await fetch(`${FACE_API_BASE}/api/employees`);
    const data = await res.json();
    return data.employees || [];
  } catch {
    return [];
  }
}

/** Global Background Face Training Tracker */
export interface BackgroundTrainingJob {
  id: string;
  employee_code: string;
  name: string;
  sample_count: number;
  status: 'training' | 'completed' | 'error';
  started_at: number;
  message?: string;
  error?: string;
}

type TrainingListener = (jobs: BackgroundTrainingJob[]) => void;

class BackgroundTrainingManager {
  private activeJobs: Map<string, BackgroundTrainingJob> = new Map();
  private listeners: Set<TrainingListener> = new Set();

  subscribe(listener: TrainingListener): () => void {
    this.listeners.add(listener);
    listener(this.getAllJobs());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    const list = this.getAllJobs();
    this.listeners.forEach((listener) => {
      try {
        listener(list);
      } catch (err) {
        console.error('Training listener error:', err);
      }
    });
  }

  getAllJobs(): BackgroundTrainingJob[] {
    return Array.from(this.activeJobs.values());
  }

  isTraining(employeeCode?: string): boolean {
    if (!employeeCode) {
      return Array.from(this.activeJobs.values()).some((j) => j.status === 'training');
    }
    const cleanCode = employeeCode.trim().toUpperCase();
    return Array.from(this.activeJobs.values()).some(
      (j) => j.employee_code.toUpperCase() === cleanCode && j.status === 'training'
    );
  }

  startTraining(
    payload: {
      employee_code: string;
      name: string;
      role?: string;
      company_id?: string;
      company_name?: string;
      trained_by?: string;
      samples: Array<{ pose: string; image: string }>;
    },
    callbacks?: {
      onSuccess?: (employeeCode: string, message: string) => void;
      onError?: (error: string) => void;
    }
  ): string {
    const jobId = `${payload.employee_code.trim().toUpperCase()}_${Date.now()}`;
    const job: BackgroundTrainingJob = {
      id: jobId,
      employee_code: payload.employee_code.trim().toUpperCase(),
      name: payload.name,
      sample_count: payload.samples.length,
      status: 'training',
      started_at: Date.now(),
    };

    this.activeJobs.set(jobId, job);
    this.notify();

    // Detached promise execution: continues even if any modal or view unmounts!
    trainEmployeeFace(payload)
      .then((res) => {
        if (res.success) {
          job.status = 'completed';
          job.message = res.message || 'Face model successfully trained and synced with database!';
          this.notify();
          if (callbacks?.onSuccess) {
            callbacks.onSuccess(payload.employee_code, job.message);
          }
        } else {
          job.status = 'error';
          job.error = res.message || 'Failed to train face embeddings';
          this.notify();
          if (callbacks?.onError) {
            callbacks.onError(job.error || 'Failed to train face embeddings');
          }
        }
      })
      .catch((err) => {
        job.status = 'error';
        job.error = err.message || 'Network error communicating with AI server';
        this.notify();
        if (callbacks?.onError) {
          callbacks.onError(job.error || 'Network error communicating with AI server');
        }
      })
      .finally(() => {
        // Auto-dismiss completed or error jobs after 7 seconds
        setTimeout(() => {
          this.activeJobs.delete(jobId);
          this.notify();
        }, 7000);
      });

    return jobId;
  }

  dismissJob(jobId: string) {
    this.activeJobs.delete(jobId);
    this.notify();
  }
}

export const backgroundTrainingManager = new BackgroundTrainingManager();
