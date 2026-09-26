'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  FileSpreadsheet,
  Plus,
  Trash2,
  Download,
  Save,
  X,
  Undo,
  Redo,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  DollarSign,
  Percent,
  Check,
  ChevronDown,
  RotateCcw,
  Sparkles,
  Search,
  PaintBucket,
  Type,
  FileDown,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { DirectorExcelDocument } from '@/lib/companies';

interface ExcelSheetEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (document: DirectorExcelDocument) => void;
  initialDocument?: DirectorExcelDocument | null;
}

type CellStyle = {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  align?: 'left' | 'center' | 'right';
  bgColor?: string;
  textColor?: string;
};

export default function ExcelSheetEditorModal({
  isOpen,
  onClose,
  onSave,
  initialDocument,
}: ExcelSheetEditorModalProps) {
  // Workbook & Active Sheet State
  const [sheetName, setSheetName] = useState('Sheet1');
  const [workbookTitle, setWorkbookTitle] = useState('Director_Accounts_Spreadsheet.xlsx');
  const [activeTab, setActiveTab] = useState<'Home' | 'Insert' | 'Formulas' | 'Data' | 'View'>('Home');

  // Columns & Grid data
  const [headers, setHeaders] = useState<string[]>([
    'A', 'B', 'C', 'D', 'E', 'F'
  ]);
  const [rows, setRows] = useState<string[][]>([
    ['Director Allowance', 'Monthly', '18000', 'Approved', 'HQ Treasury', 'Active'],
    ['Vehicle EMI Scheme', 'Fleet', '4500', 'Scheduled', 'Maybank Auto', 'Verified'],
    ['Insurance & SOCSO', 'Statutory', '1250', 'Paid', 'SOCSO Portal', 'Current'],
    ['Fuel & Representation', 'Allowance', '2200', 'Pending', 'Admin Dept', 'Review'],
    ['Medical Benefits', 'Health', '3500', 'Active', 'AIA Corporate', 'Valid'],
    ['Annual Retainer', 'Board', '25000', 'Approved', 'Finance Board', 'Executive'],
    ['', '', '', '', '', ''],
    ['', '', '', '', '', ''],
  ]);

  // Styling state per cell: key `${rIndex}-${cIndex}`
  const [cellStyles, setCellStyles] = useState<Record<string, CellStyle>>({});

  // Active Selected Cell
  const [activeCell, setActiveCell] = useState<{ r: number; c: number }>({ r: 0, c: 0 });
  const [formulaValue, setFormulaValue] = useState<string>('');
  const [isEditingCell, setIsEditingCell] = useState(false);

  // History for Undo / Redo
  const [history, setHistory] = useState<{ headers: string[]; rows: string[][] }[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Prevention of double submit
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState(false);

  // Formula input ref
  const formulaInputRef = useRef<HTMLInputElement>(null);

  // Initialize or reload on document change
  useEffect(() => {
    if (isOpen) {
      setIsSaving(false);
      setSaveSuccessMsg(false);

      if (initialDocument) {
        const rawTitle = initialDocument.name || initialDocument.fileName || 'Spreadsheet.xlsx';
        setWorkbookTitle(rawTitle.endsWith('.xlsx') ? rawTitle : `${rawTitle.replace(/\.[^/.]+$/, '')}.xlsx`);
        setSheetName(initialDocument.name || 'Sheet1');

        if (Array.isArray(initialDocument.headers) && initialDocument.headers.length > 0) {
          setHeaders(initialDocument.headers.map((h) => (h !== null && h !== undefined ? String(h) : '')));
        } else {
          setHeaders(['A', 'B', 'C', 'D', 'E', 'F']);
        }

        if (Array.isArray(initialDocument.rows) && initialDocument.rows.length > 0) {
          setRows(
            initialDocument.rows.map((row) =>
              Array.isArray(row)
                ? row.map((cell) => (cell !== null && cell !== undefined ? String(cell) : ''))
                : []
            )
          );
        } else {
          setRows([['', '', '', '', '', '']]);
        }
      } else {
        setWorkbookTitle('Director_Accounts_Spreadsheet.xlsx');
        setSheetName('Sheet1');
        setHeaders(['A', 'B', 'C', 'D', 'E', 'F']);
        setRows([
          ['Director Allowance', 'Monthly', '18000', 'Approved', 'HQ Treasury', 'Active'],
          ['Vehicle EMI Scheme', 'Fleet', '4500', 'Scheduled', 'Maybank Auto', 'Verified'],
          ['Insurance & SOCSO', 'Statutory', '1250', 'Paid', 'SOCSO Portal', 'Current'],
          ['Fuel & Representation', 'Allowance', '2200', 'Pending', 'Admin Dept', 'Review'],
          ['Medical Benefits', 'Health', '3500', 'Active', 'AIA Corporate', 'Valid'],
          ['Annual Retainer', 'Board', '25000', 'Approved', 'Finance Board', 'Executive'],
          ['', '', '', '', '', ''],
          ['', '', '', '', '', ''],
        ]);
      }
      setActiveCell({ r: 0, c: 0 });
    }
  }, [initialDocument, isOpen]);

  // Sync formula value with active cell
  useEffect(() => {
    if (rows[activeCell.r] && rows[activeCell.r][activeCell.c] !== undefined && rows[activeCell.r][activeCell.c] !== null) {
      setFormulaValue(String(rows[activeCell.r][activeCell.c]));
    } else {
      setFormulaValue('');
    }
  }, [activeCell, rows]);

  if (!isOpen) return null;

  // Save state to undo history
  const pushHistory = (newHeaders: string[], newRows: string[][]) => {
    setHistory((prev) => {
      const upToCurrent = prev.slice(0, historyIndex + 1);
      return [...upToCurrent, { headers: newHeaders, rows: newRows }];
    });
    setHistoryIndex((prev) => prev + 1);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const target = history[historyIndex - 1];
      setHeaders(target.headers);
      setRows(target.rows);
      setHistoryIndex(historyIndex - 1);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const target = history[historyIndex + 1];
      setHeaders(target.headers);
      setRows(target.rows);
      setHistoryIndex(historyIndex + 1);
    }
  };

  // Convert column index to letter (0 -> A, 1 -> B, 26 -> AA)
  const getColLetter = (index: number): string => {
    let letter = '';
    let temp = index;
    while (temp >= 0) {
      letter = String.fromCharCode((temp % 26) + 65) + letter;
      temp = Math.floor(temp / 26) - 1;
    }
    return letter;
  };

  const activeCellAddress = `${getColLetter(activeCell.c)}${activeCell.r + 1}`;

  // Update cell text
  const updateCellValue = (r: number, c: number, val: string) => {
    const updated = rows.map((row) => [...row]);
    while (updated.length <= r) {
      updated.push(new Array(headers.length).fill(''));
    }
    while (updated[r].length <= c) {
      updated[r].push('');
    }
    updated[r][c] = val;
    setRows(updated);
    pushHistory(headers, updated);
  };

  // Formula input change
  const handleFormulaChange = (val: string) => {
    setFormulaValue(val);
    updateCellValue(activeCell.r, activeCell.c, val);
  };

  // Add row
  const handleAddRow = () => {
    const newRows = [...rows, new Array(headers.length).fill('')];
    setRows(newRows);
    pushHistory(headers, newRows);
  };

  // Delete row
  const handleDeleteRow = () => {
    if (rows.length <= 1) {
      setRows([new Array(headers.length).fill('')]);
      return;
    }
    const newRows = rows.filter((_, idx) => idx !== activeCell.r);
    setRows(newRows);
    setActiveCell((prev) => ({
      ...prev,
      r: Math.max(0, Math.min(newRows.length - 1, prev.r)),
    }));
    pushHistory(headers, newRows);
  };

  // Add column
  const handleAddColumn = () => {
    const nextLetter = getColLetter(headers.length);
    const newHeaders = [...headers, nextLetter];
    const newRows = rows.map((row) => [...row, '']);
    setHeaders(newHeaders);
    setRows(newRows);
    pushHistory(newHeaders, newRows);
  };

  // Delete column
  const handleDeleteColumn = () => {
    if (headers.length <= 1) {
      alert('Spreadsheet must contain at least one column.');
      return;
    }
    const newHeaders = headers.filter((_, idx) => idx !== activeCell.c);
    const newRows = rows.map((row) => row.filter((_, idx) => idx !== activeCell.c));
    setHeaders(newHeaders);
    setRows(newRows);
    setActiveCell((prev) => ({
      ...prev,
      c: Math.max(0, Math.min(newHeaders.length - 1, prev.c)),
    }));
    pushHistory(newHeaders, newRows);
  };

  // Cell Formatting toggles
  const activeStyleKey = `${activeCell.r}-${activeCell.c}`;
  const currentStyle = cellStyles[activeStyleKey] || {};

  const toggleBold = () => {
    setCellStyles((prev) => ({
      ...prev,
      [activeStyleKey]: { ...currentStyle, bold: !currentStyle.bold },
    }));
  };

  const toggleItalic = () => {
    setCellStyles((prev) => ({
      ...prev,
      [activeStyleKey]: { ...currentStyle, italic: !currentStyle.italic },
    }));
  };

  const toggleUnderline = () => {
    setCellStyles((prev) => ({
      ...prev,
      [activeStyleKey]: { ...currentStyle, underline: !currentStyle.underline },
    }));
  };

  const setAlign = (align: 'left' | 'center' | 'right') => {
    setCellStyles((prev) => ({
      ...prev,
      [activeStyleKey]: { ...currentStyle, align },
    }));
  };

  const setBgColor = (bgColor: string) => {
    setCellStyles((prev) => ({
      ...prev,
      [activeStyleKey]: { ...currentStyle, bgColor },
    }));
  };

  // AutoSum function: sums numerical values above active cell
  const handleAutoSum = () => {
    let sum = 0;
    for (let i = 0; i < activeCell.r; i++) {
      const val = parseFloat(rows[i]?.[activeCell.c] || '0');
      if (!isNaN(val)) sum += val;
    }
    updateCellValue(activeCell.r, activeCell.c, sum.toString());
  };

  // Calculate live grid statistics
  const gridStats = (() => {
    let count = 0;
    let numCount = 0;
    let sum = 0;
    (rows || []).forEach((row) => {
      if (!Array.isArray(row)) return;
      row.forEach((cell) => {
        const str = cell !== null && cell !== undefined ? String(cell).trim() : '';
        if (str !== '') {
          count++;
          const num = parseFloat(str.replace(/[^0-9.-]/g, ''));
          if (!isNaN(num)) {
            numCount++;
            sum += num;
          }
        }
      });
    });
    const avg = numCount > 0 ? (sum / numCount).toFixed(2) : '0';
    return { count, numCount, sum: sum.toLocaleString(), avg };
  })();

  // Export as true Excel (.xlsx) file
  const handleExportXLSX = () => {
    try {
      const dataToExport = [
        headers.map((h) => String(h ?? '')),
        ...rows.map((row) => (Array.isArray(row) ? row.map((c) => String(c ?? '')) : []))
      ];
      const worksheet = XLSX.utils.aoa_to_sheet(dataToExport);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName || 'Sheet1');

      const fileName = workbookTitle.endsWith('.xlsx') ? workbookTitle : `${workbookTitle.replace(/\.[^/.]+$/, '')}.xlsx`;
      XLSX.writeFile(workbook, fileName);
    } catch (err) {
      console.error('Error exporting XLSX:', err);
    }
  };

  // Export as CSV
  const handleExportCSV = () => {
    try {
      const dataToExport = [
        headers.map((h) => String(h ?? '')),
        ...rows.map((row) => (Array.isArray(row) ? row.map((c) => String(c ?? '')) : []))
      ];
      const worksheet = XLSX.utils.aoa_to_sheet(dataToExport);
      const csv = XLSX.utils.sheet_to_csv(worksheet);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${workbookTitle.replace(/\.[^/.]+$/, '')}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Error exporting CSV:', err);
    }
  };

  // Save Document to Company Director
  const handleSaveAndApply = () => {
    if (isSaving) return; // Prevent double submit
    setIsSaving(true);

    try {
      // Build XLSX workbook and binary data
      const dataToExport = [
        headers.map((h) => String(h ?? '')),
        ...rows.map((row) => (Array.isArray(row) ? row.map((c) => String(c ?? '')) : []))
      ];
      const worksheet = XLSX.utils.aoa_to_sheet(dataToExport);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName || 'Sheet1');

      // Base64 XLSX string
      const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'base64' });
      const base64Data = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${wbout}`;

      const title = workbookTitle.replace(/\.[^/.]+$/, '').trim() || 'Director_Spreadsheet';
      const cleanFileName = `${title}.xlsx`;
      const sizeKB = (Math.round((wbout.length * 0.75) / 1024) || 1).toString();

      const doc: DirectorExcelDocument = {
        id: initialDocument?.id || `excel-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        name: title,
        fileName: cleanFileName,
        fileSize: `${sizeKB} KB`,
        fileType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        fileData: base64Data,
        headers,
        rows,
        updatedAt: new Date().toISOString(),
      };

      setSaveSuccessMsg(true);
      setTimeout(() => {
        onSave(doc);
        onClose();
      }, 350);
    } catch (err) {
      console.error('Error saving excel document:', err);
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 z-50 animate-in fade-in duration-150">
      <div className="bg-[#f3f2f1] rounded-xl max-w-6xl w-full flex flex-col h-[94vh] shadow-2xl border border-slate-300 overflow-hidden font-sans select-none">
        
        {/* ============================================================== */}
        {/* 1. MICROSOFT EXCEL TITLE BAR (EXCEL BRAND GREEN #107c41)     */}
        {/* ============================================================== */}
        <div className="bg-[#107c41] text-white px-3 py-2 flex items-center justify-between shrink-0 shadow-xs">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {/* Excel Icon Badge */}
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-white rounded flex items-center justify-center shadow-xs">
                <span className="text-[#107c41] font-black text-sm tracking-tighter">X</span>
              </div>
              <span className="font-semibold text-xs tracking-wide text-emerald-100 hidden sm:inline">
                Microsoft Excel
              </span>
            </div>

            <div className="h-4 w-[1px] bg-emerald-600 hidden sm:block" />

            {/* Editable Workbook Title */}
            <div className="flex items-center gap-1.5 flex-1 max-w-md">
              <input
                type="text"
                value={workbookTitle}
                onChange={(e) => setWorkbookTitle(e.target.value)}
                className="bg-emerald-900/60 hover:bg-emerald-900/80 focus:bg-white focus:text-slate-900 text-white font-medium text-xs px-2.5 py-1 rounded border border-emerald-500/50 focus:border-white focus:outline-none transition-colors w-full"
                title="Click to rename workbook"
              />
              <span className="text-[10px] text-emerald-200 hidden md:inline shrink-0 bg-emerald-800/80 px-1.5 py-0.5 rounded">
                .xlsx
              </span>
            </div>

            {/* AutoSave Indicator */}
            <div className="hidden lg:flex items-center gap-1.5 bg-emerald-900/50 px-2 py-0.5 rounded text-[11px] text-emerald-100 border border-emerald-700/50">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>AutoSave: On</span>
            </div>
          </div>

          {/* Quick Actions & Window Controls */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleExportXLSX}
              className="inline-flex items-center gap-1 bg-emerald-700 hover:bg-emerald-600 text-white text-[11px] font-semibold px-2.5 py-1 rounded transition-colors cursor-pointer border border-emerald-500"
              title="Download real Excel .xlsx file"
            >
              <FileDown size={13} />
              <span className="hidden sm:inline">Export Excel</span>
            </button>

            <button
              type="button"
              onClick={handleSaveAndApply}
              disabled={isSaving}
              className="inline-flex items-center gap-1 bg-white hover:bg-emerald-50 text-[#107c41] text-[11px] font-bold px-3 py-1 rounded shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <span className="w-3 h-3 border-2 border-[#107c41] border-t-transparent rounded-full animate-spin" />
                  <span>Saving...</span>
                </>
              ) : saveSuccessMsg ? (
                <>
                  <Check size={13} className="text-emerald-600" />
                  <span>Saved!</span>
                </>
              ) : (
                <>
                  <Save size={13} />
                  <span>Save to Director</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1 hover:bg-emerald-800 rounded text-emerald-100 hover:text-white transition-colors cursor-pointer ml-1"
              title="Close Spreadsheet"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ============================================================== */}
        {/* 2. EXCEL RIBBON TABS (Home, Insert, Formulas, Data, View)       */}
        {/* ============================================================== */}
        <div className="bg-[#f3f2f1] border-b border-[#e1dfdd] px-3 flex items-center gap-1 shrink-0 text-xs font-medium text-slate-700">
          {(['Home', 'Insert', 'Formulas', 'Data', 'View'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 text-xs font-semibold cursor-pointer border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-[#107c41] text-[#107c41] bg-white rounded-t'
                  : 'border-transparent text-slate-600 hover:bg-slate-200/60'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* ============================================================== */}
        {/* 3. EXCEL RIBBON COMMAND BAR                                   */}
        {/* ============================================================== */}
        <div className="bg-white border-b border-[#d4d4d4] px-3 py-1.5 flex flex-wrap items-center gap-3 shrink-0 text-slate-700 shadow-2xs">
          {/* Undo / Redo */}
          <div className="flex items-center gap-0.5 border-r border-slate-200 pr-2">
            <button
              type="button"
              onClick={handleUndo}
              disabled={historyIndex <= 0}
              className="p-1.5 hover:bg-slate-100 rounded text-slate-600 disabled:opacity-30 cursor-pointer"
              title="Undo (Ctrl+Z)"
            >
              <Undo size={14} />
            </button>
            <button
              type="button"
              onClick={handleRedo}
              disabled={historyIndex >= history.length - 1}
              className="p-1.5 hover:bg-slate-100 rounded text-slate-600 disabled:opacity-30 cursor-pointer"
              title="Redo (Ctrl+Y)"
            >
              <Redo size={14} />
            </button>
          </div>

          {/* Font Formatting */}
          <div className="flex items-center gap-1 border-r border-slate-200 pr-2">
            <button
              type="button"
              onClick={toggleBold}
              className={`p-1.5 rounded transition-colors cursor-pointer ${
                currentStyle.bold ? 'bg-[#107c41]/15 text-[#107c41] font-black' : 'hover:bg-slate-100 text-slate-700'
              }`}
              title="Bold"
            >
              <Bold size={14} />
            </button>
            <button
              type="button"
              onClick={toggleItalic}
              className={`p-1.5 rounded transition-colors cursor-pointer ${
                currentStyle.italic ? 'bg-[#107c41]/15 text-[#107c41]' : 'hover:bg-slate-100 text-slate-700'
              }`}
              title="Italic"
            >
              <Italic size={14} />
            </button>
            <button
              type="button"
              onClick={toggleUnderline}
              className={`p-1.5 rounded transition-colors cursor-pointer ${
                currentStyle.underline ? 'bg-[#107c41]/15 text-[#107c41]' : 'hover:bg-slate-100 text-slate-700'
              }`}
              title="Underline"
            >
              <Underline size={14} />
            </button>
          </div>

          {/* Alignment */}
          <div className="flex items-center gap-1 border-r border-slate-200 pr-2">
            <button
              type="button"
              onClick={() => setAlign('left')}
              className={`p-1.5 rounded transition-colors cursor-pointer ${
                currentStyle.align === 'left' ? 'bg-[#107c41]/15 text-[#107c41]' : 'hover:bg-slate-100 text-slate-700'
              }`}
              title="Align Left"
            >
              <AlignLeft size={14} />
            </button>
            <button
              type="button"
              onClick={() => setAlign('center')}
              className={`p-1.5 rounded transition-colors cursor-pointer ${
                currentStyle.align === 'center' ? 'bg-[#107c41]/15 text-[#107c41]' : 'hover:bg-slate-100 text-slate-700'
              }`}
              title="Align Center"
            >
              <AlignCenter size={14} />
            </button>
            <button
              type="button"
              onClick={() => setAlign('right')}
              className={`p-1.5 rounded transition-colors cursor-pointer ${
                currentStyle.align === 'right' ? 'bg-[#107c41]/15 text-[#107c41]' : 'hover:bg-slate-100 text-slate-700'
              }`}
              title="Align Right"
            >
              <AlignRight size={14} />
            </button>
          </div>

          {/* Cell Color Fill */}
          <div className="flex items-center gap-1 border-r border-slate-200 pr-2">
            <button
              type="button"
              onClick={() => setBgColor('#fef08a')}
              className="w-5 h-5 rounded bg-yellow-200 border border-slate-300 hover:scale-110 transition-transform cursor-pointer"
              title="Highlight Yellow"
            />
            <button
              type="button"
              onClick={() => setBgColor('#bbf7d0')}
              className="w-5 h-5 rounded bg-emerald-200 border border-slate-300 hover:scale-110 transition-transform cursor-pointer"
              title="Highlight Green"
            />
            <button
              type="button"
              onClick={() => setBgColor('#bae6fd')}
              className="w-5 h-5 rounded bg-sky-200 border border-slate-300 hover:scale-110 transition-transform cursor-pointer"
              title="Highlight Blue"
            />
            <button
              type="button"
              onClick={() => setBgColor('')}
              className="p-1 text-[11px] text-slate-500 hover:text-red-600 hover:bg-slate-100 rounded cursor-pointer"
              title="Clear Color"
            >
              Clear
            </button>
          </div>

          {/* Grid Operations: Rows & Columns */}
          <div className="flex items-center gap-1.5 border-r border-slate-200 pr-2">
            <button
              type="button"
              onClick={handleAddRow}
              className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-semibold cursor-pointer border border-slate-300"
            >
              <Plus size={12} className="text-[#107c41]" />
              <span>Row</span>
            </button>
            <button
              type="button"
              onClick={handleAddColumn}
              className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-semibold cursor-pointer border border-slate-300"
            >
              <Plus size={12} className="text-[#107c41]" />
              <span>Col</span>
            </button>
            <button
              type="button"
              onClick={handleDeleteRow}
              className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-50 hover:bg-red-50 text-slate-700 hover:text-red-700 text-[11px] font-semibold cursor-pointer border border-slate-200"
              title="Delete Active Row"
            >
              <Trash2 size={12} />
              <span>Del Row</span>
            </button>
            <button
              type="button"
              onClick={handleDeleteColumn}
              className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-50 hover:bg-red-50 text-slate-700 hover:text-red-700 text-[11px] font-semibold cursor-pointer border border-slate-200"
              title="Delete Active Column"
            >
              <Trash2 size={12} />
              <span>Del Col</span>
            </button>
          </div>

          {/* AutoSum & Calculations */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleAutoSum}
              className="inline-flex items-center gap-1 px-2 py-1 rounded bg-emerald-50 hover:bg-emerald-100 text-[#107c41] text-[11px] font-bold cursor-pointer border border-emerald-200"
              title="Calculate AutoSum of numbers above"
            >
              <span className="font-serif font-black">Σ</span>
              <span>AutoSum</span>
            </button>
            <button
              type="button"
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold cursor-pointer border border-slate-300"
            >
              <Download size={12} />
              <span>CSV</span>
            </button>
          </div>
        </div>

        {/* ============================================================== */}
        {/* 4. MICROSOFT EXCEL FORMULA BAR (fx)                            */}
        {/* ============================================================== */}
        <div className="bg-white border-b border-[#d4d4d4] px-2 py-1 flex items-center gap-2 shrink-0">
          {/* Active Cell Reference Coordinate (e.g. A1, C3) */}
          <div className="w-16 h-7 bg-slate-50 border border-slate-300 rounded flex items-center justify-center font-mono font-bold text-xs text-slate-800 shadow-2xs">
            {activeCellAddress}
          </div>

          <div className="h-5 w-[1px] bg-slate-300" />

          {/* Excel fx Symbol */}
          <div className="w-6 h-6 flex items-center justify-center text-slate-500 font-serif italic font-bold text-sm select-none">
            fx
          </div>

          {/* Formula / Cell Content Input */}
          <input
            ref={formulaInputRef}
            type="text"
            value={formulaValue}
            onChange={(e) => handleFormulaChange(e.target.value)}
            placeholder="Enter value, text, or formula (e.g. =A1+B1)"
            className="flex-1 bg-white border border-slate-300 rounded px-2.5 py-1 text-xs text-slate-900 font-mono focus:outline-none focus:border-[#107c41] focus:ring-1 focus:ring-[#107c41]/30 transition-all"
          />
        </div>

        {/* ============================================================== */}
        {/* 5. THE SPREADSHEET GRID                                        */}
        {/* ============================================================== */}
        <div className="flex-1 bg-[#eaeaea] overflow-auto relative select-text">
          <table className="border-collapse bg-white table-fixed w-full min-w-max text-xs text-slate-800">
            {/* Column Header (A, B, C, D, E, F...) */}
            <thead className="sticky top-0 z-20 bg-[#f3f2f1] shadow-xs">
              <tr>
                {/* Select All top-left corner */}
                <th className="w-12 h-6 border border-[#d4d4d4] bg-[#e1dfdd] text-[10px] font-bold text-slate-500 text-center select-none sticky left-0 z-30">
                  ◢
                </th>
                {headers.map((col, cIndex) => {
                  const isCurrentCol = activeCell.c === cIndex;
                  return (
                    <th
                      key={cIndex}
                      style={{ minWidth: 140, width: 160 }}
                      className={`h-6 border border-[#d4d4d4] text-[11px] font-bold text-center select-none transition-colors ${
                        isCurrentCol ? 'bg-[#107c41]/20 text-[#107c41] border-b-2 border-b-[#107c41]' : 'bg-[#f3f2f1] text-slate-700'
                      }`}
                      onClick={() => setActiveCell({ r: activeCell.r, c: cIndex })}
                    >
                      <div className="flex items-center justify-center gap-1 px-1">
                        <span className="font-mono">{col}</span>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>

            {/* Row Grid Cells */}
            <tbody>
              {rows.map((row, rIndex) => {
                const isCurrentRow = activeCell.r === rIndex;
                return (
                  <tr key={rIndex} className="hover:bg-slate-50/50">
                    {/* Row Number Header (1, 2, 3...) */}
                    <td
                      className={`w-12 h-7 border border-[#d4d4d4] text-[11px] font-mono font-bold text-center select-none sticky left-0 z-10 transition-colors ${
                        isCurrentRow ? 'bg-[#107c41]/20 text-[#107c41] border-r-2 border-r-[#107c41]' : 'bg-[#f3f2f1] text-slate-600'
                      }`}
                      onClick={() => setActiveCell({ r: rIndex, c: activeCell.c })}
                    >
                      {rIndex + 1}
                    </td>

                    {/* Data Cells */}
                    {headers.map((_, cIndex) => {
                      const isSelected = activeCell.r === rIndex && activeCell.c === cIndex;
                      const cellVal = row && row[cIndex] !== null && row[cIndex] !== undefined ? String(row[cIndex]) : '';
                      const style = cellStyles[`${rIndex}-${cIndex}`] || {};

                      return (
                        <td
                          key={cIndex}
                          onClick={() => {
                            setActiveCell({ r: rIndex, c: cIndex });
                            setIsEditingCell(true);
                          }}
                          style={{
                            backgroundColor: style.bgColor || undefined,
                            textAlign: style.align || 'left',
                            fontWeight: style.bold ? 'bold' : 'normal',
                            fontStyle: style.italic ? 'italic' : 'normal',
                            textDecoration: style.underline ? 'underline' : 'none',
                          }}
                          className={`border border-[#e1dfdd] p-0 relative h-7 transition-all ${
                            isSelected
                              ? 'ring-2 ring-[#107c41] z-10 bg-emerald-50/20'
                              : 'hover:bg-slate-100/40'
                          }`}
                        >
                          <input
                            type="text"
                            value={cellVal}
                            onChange={(e) => updateCellValue(rIndex, cIndex, e.target.value)}
                            onFocus={() => {
                              setActiveCell({ r: rIndex, c: cIndex });
                              setIsEditingCell(true);
                            }}
                            className="w-full h-full px-2 text-xs text-slate-800 bg-transparent border-0 focus:outline-none"
                          />

                          {/* Excel Fill Handle Dot at bottom right */}
                          {isSelected && (
                            <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-[#107c41] border border-white rounded-[1px] pointer-events-none" />
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* ============================================================== */}
        {/* 6. SHEET TABS & EXCEL STATUS BAR                               */}
        {/* ============================================================== */}
        <div className="bg-[#f3f2f1] border-t border-[#d4d4d4] px-3 py-1 flex items-center justify-between text-xs text-slate-600 shrink-0 select-none">
          {/* Sheet Tab List */}
          <div className="flex items-center gap-1">
            <div className="flex items-center bg-white border border-[#d4d4d4] border-b-2 border-b-[#107c41] rounded-t px-3 py-1 text-xs font-bold text-[#107c41] shadow-2xs">
              <FileSpreadsheet size={13} className="mr-1.5 text-[#107c41]" />
              <span>{sheetName}</span>
            </div>
            <button
              type="button"
              onClick={handleAddRow}
              className="p-1 hover:bg-slate-200 rounded text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
              title="Insert more rows"
            >
              <Plus size={14} />
            </button>
          </div>

          {/* Quick Metrics in Status Bar (Ready, Count, Sum, Avg) */}
          <div className="flex items-center gap-3 text-[11px] text-slate-500 font-mono">
            <span>Ready</span>
            <div className="h-3 w-[1px] bg-slate-300" />
            <span>Count: <strong className="text-slate-700">{gridStats.count}</strong></span>
            {gridStats.numCount > 0 && (
              <>
                <div className="h-3 w-[1px] bg-slate-300" />
                <span>Sum: <strong className="text-emerald-700">{gridStats.sum}</strong></span>
                <div className="h-3 w-[1px] bg-slate-300" />
                <span>Avg: <strong className="text-slate-700">{gridStats.avg}</strong></span>
              </>
            )}
            <div className="h-3 w-[1px] bg-slate-300" />
            <span className="text-[#107c41] font-bold">100%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
