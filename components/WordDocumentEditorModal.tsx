'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  FileText,
  Save,
  X,
  Undo,
  Redo,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Download,
  Printer,
  FileDown,
  Check,
  Sparkles,
  Type,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { DirectorExcelDocument } from '@/lib/companies';
import mammoth from 'mammoth';

interface WordDocumentEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (document: DirectorExcelDocument) => void;
  initialDocument?: DirectorExcelDocument | null;
}

export default function WordDocumentEditorModal({
  isOpen,
  onClose,
  onSave,
  initialDocument,
}: WordDocumentEditorModalProps) {
  const [docTitle, setDocTitle] = useState('Director_Appointment_Letter.docx');
  const [activeTab, setActiveTab] = useState<'Home' | 'Insert' | 'Layout' | 'Review' | 'View'>('Home');
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState(false);
  const [fontFamily, setFontFamily] = useState('Calibri');
  const [fontSize, setFontSize] = useState('11pt');

  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setIsSaving(false);
      setSaveSuccessMsg(false);

      if (initialDocument) {
        const rawName = initialDocument.name || initialDocument.fileName || 'Document.docx';
        setDocTitle(
          rawName.endsWith('.docx') || rawName.endsWith('.doc')
            ? rawName
            : `${rawName.replace(/\.[^/.]+$/, '')}.docx`
        );

        if (initialDocument.htmlContent) {
          setHtmlContent(initialDocument.htmlContent);
        } else if (initialDocument.fileData) {
          // Attempt async parse of docx arrayBuffer from fileData
          (async () => {
            try {
              let arrayBuffer: ArrayBuffer | null = null;
              if (initialDocument.fileData?.startsWith('data:')) {
                const base64 = initialDocument.fileData.split(',')[1] || initialDocument.fileData;
                const binaryString = atob(base64);
                const bytes = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) {
                  bytes[i] = binaryString.charCodeAt(i);
                }
                arrayBuffer = bytes.buffer;
              } else if (
                initialDocument.fileData?.startsWith('http') ||
                initialDocument.fileData?.startsWith('/storage/')
              ) {
                const resp = await fetch(initialDocument.fileData);
                if (resp.ok) {
                  arrayBuffer = await resp.arrayBuffer();
                }
              }

              if (arrayBuffer) {
                const result = await mammoth.convertToHtml({ arrayBuffer });
                if (result && result.value) {
                  setHtmlContent(result.value);
                  return;
                }
              }
            } catch (err) {
              console.warn('Could not parse Word document with mammoth:', err);
            }
          })();
        } else {
          setHtmlContent(`
            <h1 style="color: #2b579a; font-size: 20pt; margin-bottom: 8pt; font-weight: bold;">
              ${initialDocument.name || 'Executive Director Supporting Document'}
            </h1>
            <p style="color: #555; font-size: 11pt; line-height: 1.6; margin-bottom: 12pt;">
              <strong>Document Reference:</strong> ${initialDocument.fileName || 'OFFICIAL-DOC-2026'}<br />
              <strong>File Status:</strong> Verified &amp; Attached to Corporate Director Registry
            </p>
            <hr style="border: 0; border-top: 1px solid #d4d4d4; margin: 16pt 0;" />
            <p style="font-size: 11pt; line-height: 1.8; color: #222;">
              This official corporate appointment document is registered under the Malaysian Immigration &amp; Foreign Worker Regulatory Framework. The board confirms that all statutory documentation, identification records, and salary disbursement schedules for the appointed director are authentic.
            </p>
            <h2 style="color: #2b579a; font-size: 14pt; margin-top: 16pt; margin-bottom: 8pt; font-weight: bold;">
              Key Terms &amp; Conditions
            </h2>
            <ul style="font-size: 11pt; line-height: 1.8; color: #333; margin-left: 20pt;">
              <li>Appointed pursuant to the Companies Act 2016 and Jim Foreign Worker Portal Guidelines.</li>
              <li>Director executive payroll and statutory contributions (SOCSO &amp; EPF) are remitted monthly.</li>
              <li>Vehicle allocation and company allowances are authorized by the board of directors.</li>
            </ul>
          `);
        }
      } else {
        setDocTitle('New_Director_Document.docx');
        setHtmlContent(`
          <h1 style="color: #2b579a; font-size: 20pt; margin-bottom: 8pt; font-weight: bold;">
            Executive Director Board Resolution &amp; Appointment
          </h1>
          <p style="color: #555; font-size: 11pt; line-height: 1.6; margin-bottom: 12pt;">
            <strong>Organization:</strong> Registered Employer Corporation<br />
            <strong>Date:</strong> ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
          <hr style="border: 0; border-top: 1px solid #d4d4d4; margin: 16pt 0;" />
          <p style="font-size: 11pt; line-height: 1.8; color: #222;">
            IT WAS RESOLVED THAT the executive director be duly appointed with authorized executive powers to administer foreign worker quota applications, corporate bank operations, and statutory compliance submissions.
          </p>
        `);
      }
    }
  }, [initialDocument, isOpen]);

  // Keep editor content synchronized
  useEffect(() => {
    if (editorRef.current && htmlContent !== undefined) {
      if (editorRef.current.innerHTML !== htmlContent) {
        editorRef.current.innerHTML = htmlContent;
      }
    }
  }, [htmlContent]);

  if (!isOpen) return null;

  // Rich Text Formatting Actions via execCommand
  const execCmd = (command: string, value: string | undefined = undefined) => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      setHtmlContent(editorRef.current.innerHTML);
    }
  };

  // Calculate live word count & character count
  const stats = (() => {
    if (typeof window === 'undefined') return { words: 0, chars: 0 };
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent || '';
    const text = tempDiv.textContent || tempDiv.innerText || '';
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const chars = text.length;
    return { words, chars };
  })();

  // Print Document
  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${docTitle}</title>
          <style>
            body { font-family: ${fontFamily}, 'Segoe UI', Arial, sans-serif; padding: 40px; color: #111; line-height: 1.6; }
            h1, h2, h3 { color: #2b579a; }
            table { border-collapse: collapse; width: 100%; margin: 15px 0; }
            table, th, td { border: 1px solid #ccc; padding: 8px; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          ${htmlContent}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  // Download Document as HTML / DOC file
  const handleDownload = () => {
    const blob = new Blob(
      [
        `<!DOCTYPE html>
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head><meta charset='utf-8'><title>${docTitle}</title>
        <style>
          body { font-family: ${fontFamily}, 'Calibri', 'Segoe UI', Arial, sans-serif; font-size: 11pt; line-height: 1.6; margin: 40pt; }
          h1, h2, h3 { color: #2b579a; font-family: 'Calibri', Arial, sans-serif; }
          table { border-collapse: collapse; width: 100%; margin: 15pt 0; }
          th, td { border: 1pt solid #bbb; padding: 6pt; }
        </style>
        </head>
        <body>${htmlContent}</body></html>`
      ],
      { type: 'application/msword;charset=utf-8' }
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = docTitle.endsWith('.doc') || docTitle.endsWith('.docx') ? docTitle : `${docTitle}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Save changes to Director
  const handleSaveAndApply = () => {
    if (isSaving) return;
    setIsSaving(true);

    try {
      const currentHTML = editorRef.current ? editorRef.current.innerHTML : htmlContent;
      const title = docTitle.replace(/\.[^/.]+$/, '').trim() || 'Director_Document';
      const cleanFileName = docTitle.endsWith('.docx') || docTitle.endsWith('.doc') ? docTitle : `${title}.docx`;
      const sizeKB = Math.max(1, Math.round(currentHTML.length / 1024)).toString();

      // Base64 HTML representation for persistence
      const base64Data = `data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,${btoa(
        unescape(encodeURIComponent(currentHTML))
      )}`;

      const doc: DirectorExcelDocument = {
        id: initialDocument?.id || `word-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        name: title,
        fileName: cleanFileName,
        fileSize: `${sizeKB} KB`,
        fileType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        fileData: initialDocument?.fileData?.startsWith('http') || initialDocument?.fileData?.startsWith('/storage/')
          ? initialDocument.fileData
          : base64Data,
        category: 'word',
        htmlContent: currentHTML,
        headers: [],
        rows: [],
        updatedAt: new Date().toISOString(),
      };

      setSaveSuccessMsg(true);
      setTimeout(() => {
        onSave(doc);
        onClose();
      }, 350);
    } catch (err) {
      console.error('Error saving Word document:', err);
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 z-50 animate-in fade-in duration-150">
      <div className="bg-[#f3f2f1] rounded-xl max-w-5xl w-full flex flex-col h-[94vh] shadow-2xl border border-slate-300 overflow-hidden font-sans select-none">
        
        {/* ============================================================== */}
        {/* 1. MICROSOFT WORD TITLE BAR (WORD BLUE #2b579a)                */}
        {/* ============================================================== */}
        <div className="bg-[#2b579a] text-white px-3 py-2 flex items-center justify-between shrink-0 shadow-xs">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {/* Word Icon Badge */}
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-white rounded flex items-center justify-center shadow-xs">
                <span className="text-[#2b579a] font-black text-sm tracking-tighter">W</span>
              </div>
              <span className="font-semibold text-xs tracking-wide text-blue-100 hidden sm:inline">
                Microsoft Word
              </span>
            </div>

            <div className="h-4 w-[1px] bg-blue-400/40 hidden sm:block" />

            {/* Editable Document Title */}
            <div className="flex items-center gap-1.5 flex-1 max-w-md">
              <input
                type="text"
                value={docTitle}
                onChange={(e) => setDocTitle(e.target.value)}
                className="bg-blue-900/60 hover:bg-blue-900/80 focus:bg-white focus:text-slate-900 text-white font-medium text-xs px-2.5 py-1 rounded border border-blue-400/50 focus:border-white focus:outline-none transition-colors w-full"
                title="Click to rename document"
              />
              <span className="text-[10px] text-blue-200 hidden md:inline shrink-0 bg-blue-800/80 px-1.5 py-0.5 rounded">
                .docx
              </span>
            </div>

            {/* AutoSave Indicator */}
            <div className="hidden lg:flex items-center gap-1.5 bg-blue-900/50 px-2 py-0.5 rounded text-[11px] text-blue-100 border border-blue-700/50">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-300 animate-pulse" />
              <span>AutoSave: On</span>
            </div>
          </div>

          {/* Quick Actions & Window Controls */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1 bg-blue-800 hover:bg-blue-700 text-white text-[11px] font-semibold px-2.5 py-1 rounded transition-colors cursor-pointer border border-blue-600"
              title="Print Word Document"
            >
              <Printer size={13} />
              <span className="hidden sm:inline">Print</span>
            </button>

            <button
              type="button"
              onClick={handleDownload}
              className="inline-flex items-center gap-1 bg-blue-800 hover:bg-blue-700 text-white text-[11px] font-semibold px-2.5 py-1 rounded transition-colors cursor-pointer border border-blue-600"
              title="Download Word Document (.doc)"
            >
              <FileDown size={13} />
              <span className="hidden sm:inline">Download</span>
            </button>

            <button
              type="button"
              onClick={handleSaveAndApply}
              disabled={isSaving}
              className="inline-flex items-center gap-1 bg-white hover:bg-blue-50 text-[#2b579a] text-[11px] font-bold px-3 py-1 rounded shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <span className="w-3 h-3 border-2 border-[#2b579a] border-t-transparent rounded-full animate-spin" />
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
              className="p-1 hover:bg-blue-800 rounded text-blue-100 hover:text-white transition-colors cursor-pointer ml-1"
              title="Close Word Document"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ============================================================== */}
        {/* 2. WORD RIBBON TABS (Home, Insert, Layout, Review, View)       */}
        {/* ============================================================== */}
        <div className="bg-[#f3f2f1] border-b border-[#e1dfdd] px-3 flex items-center gap-1 shrink-0 text-xs font-medium text-slate-700">
          {(['Home', 'Insert', 'Layout', 'Review', 'View'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 text-xs font-semibold cursor-pointer border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-[#2b579a] text-[#2b579a] bg-white rounded-t'
                  : 'border-transparent text-slate-600 hover:bg-slate-200/60'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* ============================================================== */}
        {/* 3. WORD RIBBON COMMAND BAR                                    */}
        {/* ============================================================== */}
        <div className="bg-white border-b border-[#d4d4d4] px-3 py-1.5 flex flex-wrap items-center gap-3 shrink-0 text-slate-700 shadow-2xs">
          {/* Undo / Redo */}
          <div className="flex items-center gap-0.5 border-r border-slate-200 pr-2">
            <button
              type="button"
              onClick={() => execCmd('undo')}
              className="p-1.5 hover:bg-slate-100 rounded text-slate-600 cursor-pointer"
              title="Undo"
            >
              <Undo size={14} />
            </button>
            <button
              type="button"
              onClick={() => execCmd('redo')}
              className="p-1.5 hover:bg-slate-100 rounded text-slate-600 cursor-pointer"
              title="Redo"
            >
              <Redo size={14} />
            </button>
          </div>

          {/* Font Family & Size */}
          <div className="flex items-center gap-1.5 border-r border-slate-200 pr-2">
            <select
              value={fontFamily}
              onChange={(e) => {
                setFontFamily(e.target.value);
                execCmd('fontName', e.target.value);
              }}
              className="bg-slate-50 border border-slate-300 rounded px-2 py-1 text-xs text-slate-800 focus:outline-none focus:border-[#2b579a]"
            >
              <option value="Calibri">Calibri</option>
              <option value="Segoe UI">Segoe UI</option>
              <option value="Times New Roman">Times New Roman</option>
              <option value="Arial">Arial</option>
              <option value="Inter">Inter</option>
            </select>

            <select
              value={fontSize}
              onChange={(e) => {
                setFontSize(e.target.value);
                execCmd('fontSize', e.target.value === '18pt' ? '5' : e.target.value === '14pt' ? '4' : '3');
              }}
              className="bg-slate-50 border border-slate-300 rounded px-2 py-1 text-xs text-slate-800 focus:outline-none focus:border-[#2b579a]"
            >
              <option value="10pt">10</option>
              <option value="11pt">11</option>
              <option value="12pt">12</option>
              <option value="14pt">14</option>
              <option value="18pt">18</option>
              <option value="24pt">24</option>
            </select>
          </div>

          {/* Basic Text Formatting */}
          <div className="flex items-center gap-1 border-r border-slate-200 pr-2">
            <button
              type="button"
              onClick={() => execCmd('bold')}
              className="p-1.5 hover:bg-slate-100 rounded text-slate-700 font-black cursor-pointer"
              title="Bold (Ctrl+B)"
            >
              <Bold size={14} />
            </button>
            <button
              type="button"
              onClick={() => execCmd('italic')}
              className="p-1.5 hover:bg-slate-100 rounded text-slate-700 cursor-pointer"
              title="Italic (Ctrl+I)"
            >
              <Italic size={14} />
            </button>
            <button
              type="button"
              onClick={() => execCmd('underline')}
              className="p-1.5 hover:bg-slate-100 rounded text-slate-700 cursor-pointer"
              title="Underline (Ctrl+U)"
            >
              <Underline size={14} />
            </button>
            <button
              type="button"
              onClick={() => execCmd('strikeThrough')}
              className="p-1.5 hover:bg-slate-100 rounded text-slate-700 cursor-pointer"
              title="Strikethrough"
            >
              <Strikethrough size={14} />
            </button>
          </div>

          {/* Alignment */}
          <div className="flex items-center gap-1 border-r border-slate-200 pr-2">
            <button
              type="button"
              onClick={() => execCmd('justifyLeft')}
              className="p-1.5 hover:bg-slate-100 rounded text-slate-700 cursor-pointer"
              title="Align Left"
            >
              <AlignLeft size={14} />
            </button>
            <button
              type="button"
              onClick={() => execCmd('justifyCenter')}
              className="p-1.5 hover:bg-slate-100 rounded text-slate-700 cursor-pointer"
              title="Center"
            >
              <AlignCenter size={14} />
            </button>
            <button
              type="button"
              onClick={() => execCmd('justifyRight')}
              className="p-1.5 hover:bg-slate-100 rounded text-slate-700 cursor-pointer"
              title="Align Right"
            >
              <AlignRight size={14} />
            </button>
            <button
              type="button"
              onClick={() => execCmd('justifyFull')}
              className="p-1.5 hover:bg-slate-100 rounded text-slate-700 cursor-pointer"
              title="Justify"
            >
              <AlignJustify size={14} />
            </button>
          </div>

          {/* Lists */}
          <div className="flex items-center gap-1 border-r border-slate-200 pr-2">
            <button
              type="button"
              onClick={() => execCmd('insertUnorderedList')}
              className="p-1.5 hover:bg-slate-100 rounded text-slate-700 cursor-pointer"
              title="Bullet List"
            >
              <List size={14} />
            </button>
            <button
              type="button"
              onClick={() => execCmd('insertOrderedList')}
              className="p-1.5 hover:bg-slate-100 rounded text-slate-700 cursor-pointer"
              title="Numbered List"
            >
              <ListOrdered size={14} />
            </button>
          </div>

          {/* Text Color / Highlight */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => execCmd('foreColor', '#2b579a')}
              className="w-5 h-5 rounded bg-blue-700 border border-slate-300 hover:scale-110 transition-transform cursor-pointer"
              title="Word Blue Color"
            />
            <button
              type="button"
              onClick={() => execCmd('foreColor', '#111827')}
              className="w-5 h-5 rounded bg-slate-900 border border-slate-300 hover:scale-110 transition-transform cursor-pointer"
              title="Dark Black Color"
            />
            <button
              type="button"
              onClick={() => execCmd('hiliteColor', '#fef08a')}
              className="w-5 h-5 rounded bg-yellow-200 border border-slate-300 hover:scale-110 transition-transform cursor-pointer"
              title="Highlight Yellow"
            />
          </div>
        </div>

        {/* ============================================================== */}
        {/* 4. WORD DOCUMENT A4 CANVAS                                    */}
        {/* ============================================================== */}
        <div className="flex-1 bg-[#eae8e8] overflow-auto p-4 sm:p-8 flex justify-center">
          {/* A4 Paper Container */}
          <div className="bg-white max-w-[850px] w-full min-h-[950px] p-8 sm:p-14 shadow-xl border border-slate-300 rounded-sm relative text-slate-800 font-sans select-text">
            {/* Document Header Watermark/Notice */}
            <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-200 text-xs text-slate-400">
              <span className="font-semibold text-slate-500 uppercase tracking-wider text-[10px]">
                Official Corporate Filing Attachment
              </span>
              <span className="font-mono text-[11px]">{docTitle}</span>
            </div>

            {/* Editable Document Body */}
            <div
              ref={editorRef}
              contentEditable
              suppressContentEditableWarning
              onInput={(e) => setHtmlContent((e.target as HTMLElement).innerHTML)}
              style={{
                fontFamily: fontFamily,
                fontSize: fontSize,
                outline: 'none',
                minHeight: '750px',
                lineHeight: '1.7',
              }}
              className="focus:outline-none prose prose-slate max-w-none prose-headings:text-[#2b579a] prose-a:text-[#0b4da2] prose-table:border prose-th:bg-slate-50 prose-th:p-2 prose-td:p-2 prose-td:border"
            />
          </div>
        </div>

        {/* ============================================================== */}
        {/* 5. MICROSOFT WORD STATUS BAR                                  */}
        {/* ============================================================== */}
        <div className="bg-[#f3f2f1] border-t border-[#d4d4d4] px-4 py-1.5 flex items-center justify-between text-[11px] text-slate-600 shrink-0 select-none">
          <div className="flex items-center gap-3">
            <span>Page 1 of 1</span>
            <div className="h-3 w-[1px] bg-slate-300" />
            <span>Words: <strong className="text-slate-700">{stats.words}</strong></span>
            <div className="h-3 w-[1px] bg-slate-300" />
            <span>Characters: <strong className="text-slate-700">{stats.chars}</strong></span>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden sm:inline">English (United States)</span>
            <div className="h-3 w-[1px] bg-slate-300 hidden sm:block" />
            <span className="text-[#2b579a] font-bold">100%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
