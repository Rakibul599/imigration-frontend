'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  Send,
  Building2,
  User,
  Calendar,
  AlertCircle,
  RefreshCw,
  Plus,
} from 'lucide-react';
import {
  getEmployeeResignations,
  updateResignationStatus,
  issueOfficialResignationLetter,
  EmployeeResignationItem,
} from '@/lib/employeeRequestsApi';

interface AdminResignationModalProps {
  isOpen: boolean;
  onClose: () => void;
  adminName?: string;
  employeesList?: { id: number; employee_code: string; name: string }[];
}

export default function AdminResignationModal({
  isOpen,
  onClose,
  adminName = 'Super Admin',
  employeesList = [],
}: AdminResignationModalProps) {
  const [resignations, setResignations] = useState<EmployeeResignationItem[]>([]);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Review modal state
  const [reviewItem, setReviewItem] = useState<EmployeeResignationItem | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [acceptanceLetterText, setAcceptanceLetterText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Issue Letter Directly Modal
  const [isDirectIssueOpen, setIsDirectIssueOpen] = useState(false);
  const [directEmployeeCode, setDirectEmployeeCode] = useState('');
  const [directLastDay, setDirectLastDay] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });
  const [directLetter, setDirectLetter] = useState(
    'This letter serves as official confirmation and acceptance of your resignation. Your last working day has been confirmed. We thank you for your contributions and wish you success in your future endeavors.'
  );

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getEmployeeResignations({
        status: statusFilter !== 'all' ? statusFilter : undefined,
      });
      setResignations(data);
    } catch (err) {
      console.error('Failed to load resignations:', err);
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, loadData]);

  if (!isOpen) return null;

  const handleApprove = async (item: EmployeeResignationItem) => {
    setIsProcessing(true);
    try {
      const letter =
        acceptanceLetterText.trim() ||
        `Dear ${item.employee_name || item.employee_code},\n\nYour resignation notice has been formally accepted by management. Your official last working day is confirmed as ${item.requested_last_day}. Please ensure all company assets and handovers are completed before departure.\n\nSigned,\n${adminName}`;

      await updateResignationStatus(
        item.id,
        'approved',
        reviewNotes.trim() || 'Resignation request approved by management.',
        adminName,
        letter
      );

      setFeedback({ type: 'success', message: `Resignation approved for ${item.employee_name || item.employee_code}.` });
      setReviewItem(null);
      setReviewNotes('');
      setAcceptanceLetterText('');
      await loadData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to approve resignation.' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async (item: EmployeeResignationItem) => {
    setIsProcessing(true);
    try {
      await updateResignationStatus(
        item.id,
        'rejected',
        reviewNotes.trim() || 'Resignation request rejected after management review.',
        adminName
      );

      setFeedback({ type: 'success', message: `Resignation rejected for ${item.employee_name || item.employee_code}.` });
      setReviewItem(null);
      setReviewNotes('');
      await loadData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to reject resignation.' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDirectIssueSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!directEmployeeCode) {
      setFeedback({ type: 'error', message: 'Please select an employee.' });
      return;
    }

    setIsProcessing(true);
    try {
      const selectedEmp = employeesList.find((e) => e.employee_code === directEmployeeCode);

      await issueOfficialResignationLetter({
        employee_code: directEmployeeCode,
        employee_name: selectedEmp?.name,
        last_working_day: directLastDay,
        official_acceptance_letter: directLetter,
        admin_name: adminName,
        admin_notes: 'Direct official resignation letter issued by admin.',
      });

      setFeedback({ type: 'success', message: 'Official resignation letter issued and sent to employee portal.' });
      setIsDirectIssueOpen(false);
      setDirectEmployeeCode('');
      await loadData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to issue resignation letter.' });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl max-w-4xl w-full p-6 shadow-2xl border border-slate-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <FileText size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 m-0">Employee Resignation &amp; Clearances</h2>
              <p className="text-xs text-slate-500 m-0 mt-0.5">
                Review employee resignation notices, approve/reject, and issue official resignation letters.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsDirectIssueOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0b4da2] hover:bg-blue-700 text-white font-bold text-xs shadow-xs cursor-pointer border-0"
            >
              <Plus size={14} />
              <span>Issue Resignation Letter</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 border-0 bg-transparent cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`mt-4 p-3 rounded-xl flex items-center justify-between text-xs font-semibold ${
              feedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            <span>{feedback.message}</span>
            <button
              onClick={() => setFeedback(null)}
              className="text-slate-500 hover:text-slate-800 font-bold ml-4 cursor-pointer border-0 bg-transparent"
            >
              ✕
            </button>
          </div>
        )}

        {/* Filter Pills */}
        <div className="flex items-center justify-between gap-3 mt-4">
          <div className="flex items-center gap-1.5">
            {(['all', 'pending', 'approved', 'rejected'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                  statusFilter === st
                    ? 'bg-[#0b4da2] text-white border-[#0b4da2]'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span className="capitalize">{st}</span>
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={loadData}
            className="p-2 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 cursor-pointer bg-white"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Table Body */}
        <div className="mt-4 flex-1 overflow-y-auto border border-slate-200 rounded-2xl">
          {resignations.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400 font-semibold">
              No resignation applications found in this category.
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[11px] sticky top-0 border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Apply Date</th>
                  <th className="py-3 px-4">Requested Last Day</th>
                  <th className="py-3 px-4">Notice Days</th>
                  <th className="py-3 px-4">Reason</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {resignations.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-slate-900 m-0">{item.employee_name || 'Staff'}</p>
                      <p className="font-mono text-[11px] text-slate-400 m-0">{item.employee_code}</p>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-700">
                      {String(item.apply_date).slice(0, 10)}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                      {String(item.requested_last_day).slice(0, 10)}
                    </td>
                    <td className="py-3.5 px-4 text-slate-700">{item.notice_period_days} Days</td>
                    <td className="py-3.5 px-4 text-slate-600 max-w-xs truncate">{item.reason}</td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                          item.status === 'approved'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : item.status === 'rejected'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        <span className="capitalize">{item.status}</span>
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-1.5 whitespace-nowrap">
                      {item.status === 'pending' ? (
                        <button
                          type="button"
                          onClick={() => {
                            setReviewItem(item);
                            setReviewNotes('');
                            setAcceptanceLetterText(
                              `Dear ${item.employee_name || item.employee_code},\n\nYour resignation notice has been formally accepted by management. Your official last working day is confirmed as ${item.requested_last_day}.\n\nThank you for your service.\n\nSigned,\n${adminName}`
                            );
                          }}
                          className="px-3 py-1.5 rounded-lg bg-[#0b4da2] hover:bg-blue-700 text-white font-bold text-xs cursor-pointer border-0"
                        >
                          Review &amp; Decide
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setReviewItem(item)}
                          className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer border-0"
                        >
                          View Details
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Submodal: Review and Decide */}
        {reviewItem && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-base font-bold text-slate-900 m-0">
                  Resignation Notice: {reviewItem.employee_name} ({reviewItem.employee_code})
                </h3>
                <button
                  type="button"
                  onClick={() => setReviewItem(null)}
                  className="text-slate-400 hover:text-slate-700 p-1 rounded-lg border-0 bg-transparent cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1">
                  <p className="text-slate-500 m-0">
                    <span className="font-bold text-slate-700">Reason:</span> {reviewItem.reason}
                  </p>
                  <p className="text-slate-500 m-0">
                    <span className="font-bold text-slate-700">Notice Days:</span> {reviewItem.notice_period_days} Days
                    • <span className="font-bold text-slate-700">Requested Last Day:</span>{' '}
                    {String(reviewItem.requested_last_day).slice(0, 10)}
                  </p>
                  {reviewItem.resignation_letter && (
                    <div className="pt-2 border-t border-slate-200/60 mt-2">
                      <span className="font-bold text-slate-700 block mb-0.5">Formal Letter:</span>
                      <p className="text-slate-600 whitespace-pre-wrap">{reviewItem.resignation_letter}</p>
                    </div>
                  )}
                </div>

                {reviewItem.status === 'pending' && (
                  <>
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">
                        Official Resignation Acceptance Letter to Issue:
                      </label>
                      <textarea
                        rows={4}
                        value={acceptanceLetterText}
                        onChange={(e) => setAcceptanceLetterText(e.target.value)}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:border-[#0b4da2]"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Internal Admin Remarks (Optional):</label>
                      <input
                        type="text"
                        placeholder="Admin remarks or clearance notes..."
                        value={reviewNotes}
                        onChange={(e) => setReviewNotes(e.target.value)}
                        className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:border-[#0b4da2]"
                      />
                    </div>
                  </>
                )}

                {reviewItem.official_acceptance_letter && (
                  <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200">
                    <span className="font-bold text-emerald-800 block mb-1">Issued Official Acceptance Letter:</span>
                    <p className="text-emerald-900 whitespace-pre-wrap">{reviewItem.official_acceptance_letter}</p>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setReviewItem(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs cursor-pointer"
                >
                  Close
                </button>

                {reviewItem.status === 'pending' && (
                  <>
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => handleReject(reviewItem)}
                      className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs cursor-pointer border-0"
                    >
                      Reject Notice
                    </button>
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => handleApprove(reviewItem)}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer border-0"
                    >
                      {isProcessing ? 'Processing...' : 'Approve & Issue Letter'}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Submodal: Issue Official Letter Directly */}
        {isDirectIssueOpen && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-base font-bold text-slate-900 m-0">Issue Resignation Letter to Employee</h3>
                <button
                  type="button"
                  onClick={() => setIsDirectIssueOpen(false)}
                  className="text-slate-400 hover:text-slate-700 p-1 rounded-lg border-0 bg-transparent cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleDirectIssueSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Select Employee *</label>
                  <select
                    required
                    value={directEmployeeCode}
                    onChange={(e) => setDirectEmployeeCode(e.target.value)}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:border-[#0b4da2] cursor-pointer"
                  >
                    <option value="">-- Choose Employee --</option>
                    {employeesList.map((emp) => (
                      <option key={emp.employee_code} value={emp.employee_code}>
                        {emp.name} ({emp.employee_code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Confirmed Last Working Day *</label>
                  <input
                    type="date"
                    required
                    value={directLastDay}
                    onChange={(e) => setDirectLastDay(e.target.value)}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:border-[#0b4da2]"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Official Acceptance / Clearance Letter *</label>
                  <textarea
                    rows={4}
                    required
                    value={directLetter}
                    onChange={(e) => setDirectLetter(e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:border-[#0b4da2]"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsDirectIssueOpen(false)}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isProcessing}
                    className="px-5 py-2.5 rounded-xl bg-[#0b4da2] hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-600/20 cursor-pointer border-0"
                  >
                    {isProcessing ? 'Issuing...' : 'Issue & Send to Employee'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
