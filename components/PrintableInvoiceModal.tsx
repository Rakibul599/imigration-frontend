'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  DollarSign,
  FileText,
  Printer,
  X,
} from 'lucide-react';
import { CompanyInvoice } from '@/lib/companyTrialAndFinanceStorage';
import { Company, resolveFileUrl } from '@/lib/companies';
import { getStoredCompanies } from '@/lib/companyStorage';
import { formatCorporateDate } from './PrintableQuotationModal';

interface PrintableInvoiceModalProps {
  invoice: CompanyInvoice;
  onClose: () => void;
  onOpenSettleModal?: (invoice: CompanyInvoice) => void;
}

export default function PrintableInvoiceModal({
  invoice,
  onClose,
  onOpenSettleModal,
}: PrintableInvoiceModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const companies: Company[] = useMemo(() => {
    return getStoredCompanies();
  }, []);

  const company = useMemo(() => {
    return companies.find(
      (c) => c.id === invoice.company_id || c.name.toLowerCase() === (invoice.company_name || '').toLowerCase()
    );
  }, [companies, invoice.company_id, invoice.company_name]);

  const companyName = company?.name || invoice.company_name || 'LOTUSS STORES (MALAYSIA) SDN BHD';
  const companyLogo = company?.logo || (invoice as any).company_logo || '';
  const companyRoc = company?.roc || (invoice as any).company_roc || '200001018812 (521419-K)';
  const companyAddress = company?.address || (invoice as any).company_address || 'Head Office, Level 3, No. 3, Jalan 7A/62A,\nBandar Menjalara, 52200 Kuala Lumpur.';
  const companyPhone = company?.phone || (invoice as any).company_phone || '(603) 6287 6000';
  const companyBankName = company?.bankName || invoice.bank_name || (invoice as any).company_bank_name || 'AmBank Berhad';
  const companyBankAccountNo = company?.bankAccountNo || invoice.bank_account_no || (invoice as any).company_bank_account_no || '8881-0022-9911';
  const contactName = companyName || 'NIDI COMPUTER SP';
  const contactPhone = companyPhone || '01113310988';

  const totalAmount = Number(invoice.total_amount) || 0;
  const subtotal = Number(invoice.subtotal) || 0;
  const taxAmount = Number(invoice.tax_amount) || 0;
  const taxPercentage = Number(invoice.tax_percentage) || 0;
  const currency = invoice.currency || 'RM';
  const items = invoice.items || [];
  const isPaid = invoice.payment_status === 'Paid';

  const logoUrl = resolveFileUrl(companyLogo);

  if (!mounted) return null;

  const modalContent = (
    <div className="print-modal-portal">
      {/* Print-specific style overrides matching official corporate layout */}
      <style jsx global>{`
        @media print {
          /* 1. Hide everything on the background page completely */
          body > *:not(.print-modal-portal) {
            display: none !important;
          }

          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            height: auto !important;
            min-height: 0 !important;
            overflow: visible !important;
            font-size: 11px !important;
            color: #000000 !important;
          }

          /* 2. Reset modal container overlays */
          .print-modal-portal,
          .print-modal-overlay {
            position: static !important;
            display: block !important;
            inset: auto !important;
            padding: 0 !important;
            margin: 0 !important;
            background: transparent !important;
            backdrop-filter: none !important;
            -webkit-backdrop-filter: none !important;
            width: 100% !important;
            height: auto !important;
            min-height: 0 !important;
            overflow: visible !important;
            border: none !important;
            box-shadow: none !important;
            z-index: auto !important;
          }

          .print-modal-dialog {
            position: static !important;
            display: block !important;
            padding: 0 !important;
            margin: 0 !important;
            background: transparent !important;
            width: 100% !important;
            max-width: 100% !important;
            height: auto !important;
            max-height: none !important;
            min-height: 0 !important;
            border: none !important;
            box-shadow: none !important;
            overflow: visible !important;
          }

          .print-modal-scroll {
            position: static !important;
            display: block !important;
            padding: 0 !important;
            margin: 0 !important;
            background: transparent !important;
            width: 100% !important;
            height: auto !important;
            min-height: 0 !important;
            overflow: visible !important;
          }

          /* 3. The actual printable sheet begins at top (0, 0) */
          #printable-invoice {
            position: relative !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            width: 100% !important;
            max-width: 100% !important;
            min-height: 265mm !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
            background: #ffffff !important;
            color: #000000 !important;
          }

          .bottom-footer {
            margin-top: auto !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

          #printable-invoice,
          #printable-invoice * {
            visibility: visible !important;
          }

          /* Corporate heading text in official green color matching letterhead */
          #printable-invoice .company-top-heading,
          #printable-invoice .company-top-heading * {
            color: #166534 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          /* Ensure table styling is not broken by globals.css */
          #printable-invoice table {
            width: 100% !important;
            border-collapse: collapse !important;
            border: none !important;
          }
          #printable-invoice thead tr {
            background-color: #6b7280 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          #printable-invoice th {
            background-color: #6b7280 !important;
            color: #ffffff !important;
            border: none !important;
            padding: 8px 12px !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          #printable-invoice td {
            border: none !important;
            border-bottom: 1px solid #e5e7eb !important;
            padding: 8px 12px !important;
            color: #000000 !important;
          }

          .no-print {
            display: none !important;
          }

          @page {
            size: A4 portrait;
            margin: 12mm 15mm;
          }

          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .avoid-break {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }
      `}</style>

      {/* Screen Modal Overlay */}
      <div className="print-modal-overlay fixed inset-0 z-50 bg-slate-900/75 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto">
        <div className="print-modal-dialog bg-slate-100 rounded-3xl max-w-4xl w-full my-auto shadow-2xl border border-slate-300 flex flex-col max-h-[96vh]">
          {/* Top Control Bar (Screen only, hidden on print) */}
          <div className="no-print p-4 sm:px-6 bg-white border-b border-slate-200 rounded-t-3xl flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center">
                <FileText size={18} />
              </div>
              <div>
                <div className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span>Tax Invoice #{invoice.invoice_no}</span>
                  <span
                    className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase ${
                      isPaid
                        ? 'bg-emerald-100 text-emerald-800'
                        : invoice.payment_status === 'Partial'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {invoice.payment_status}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500">
                  Official Malaysian Corporate Tax Invoice Format (A4 Ready)
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrint}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0b4da2] hover:bg-[#083877] text-white text-xs font-bold shadow-sm transition-all cursor-pointer border-0"
                title="Print or Save as PDF"
              >
                <Printer size={15} />
                <span>Print Invoice</span>
              </button>

              {!isPaid && onOpenSettleModal && (
                <button
                  type="button"
                  onClick={() => onOpenSettleModal(invoice)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-2xs transition-all cursor-pointer border-0"
                >
                  <DollarSign size={14} />
                  <span>Settle / Receive Payment</span>
                </button>
              )}

              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors border-0 bg-transparent cursor-pointer"
                title="Close"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Document Container */}
          <div className="print-modal-scroll overflow-y-auto p-4 sm:p-8 flex justify-center bg-slate-200/60">
            {/* The Actual A4 Printable Sheet matching user screenshot layout */}
            <div
              id="printable-invoice"
              className="bg-white w-full max-w-[800px] shadow-lg border border-slate-300 p-8 sm:p-12 text-slate-900 font-sans text-xs flex flex-col justify-between"
              style={{ minHeight: '1050px' }}
            >
              <div>
                {/* 1. Header Section: Logo on Left + Company Details */}
                <div className="flex items-start gap-6 pb-6">
                  {/* Left: Company Logo (if available) */}
                  {logoUrl ? (
                    <div className="shrink-0 w-36 max-w-[150px] pt-1">
                      <img
                        src={logoUrl}
                        alt={companyName}
                        className="h-14 sm:h-16 max-w-full object-contain"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    </div>
                  ) : null}

                  {/* Company Heading Info */}
                  <div className="space-y-0.5 text-slate-800 text-[11px] leading-tight flex-1">
                    <div className="company-top-heading font-extrabold text-sm sm:text-base text-[#166534] uppercase tracking-tight flex flex-wrap items-baseline gap-1.5">
                      <span>{companyName}</span>
                      {companyRoc && (
                        <span className="text-xs font-bold text-[#166534]">
                          {companyRoc.trim().startsWith('(') ? companyRoc.trim() : `(${companyRoc.trim()})`}
                        </span>
                      )}
                    </div>
                    {companyAddress && (
                      <div className="text-slate-700 text-[10.5px] whitespace-pre-line leading-relaxed pt-0.5">
                        {companyAddress}
                      </div>
                    )}
                    <div className="text-slate-700 text-[10.5px]">
                      General Line: {companyPhone || '(603) 6287 6000'}
                    </div>
                    <div className="text-slate-700 text-[10.5px]">
                      ST ID: {companyRoc ? `B16-1811-${companyRoc.replace(/\D/g, '').slice(-8) || '32000038'}` : 'B16-1811-32000038'}
                    </div>
                  </div>
                </div>

                {/* 2. Middle Section: BILL TO on Left | TAX INVOICE Meta on Right */}
                <div className="flex justify-between items-start gap-8 my-6 text-[11px] text-slate-800">
                  {/* Left Column: BILL TO */}
                  <div className="space-y-0.5 max-w-[360px] flex-1">
                    <div className="font-black text-xs text-black uppercase tracking-wider mb-1">
                      BILL TO:
                    </div>
                    <div className="font-bold text-xs text-black">
                      {invoice.customer_name || 'CLIENT ACCOUNT'}
                    </div>
                    {invoice.customer_address ? (
                      <div className="text-slate-700 whitespace-pre-line leading-relaxed text-[11px]">
                        {invoice.customer_address}
                      </div>
                    ) : (
                      <div className="text-slate-500 italic text-[10.5px]">No address provided</div>
                    )}
                    {invoice.customer_phone && (
                      <div className="text-slate-700 text-[10.5px]">Tel: {invoice.customer_phone}</div>
                    )}
                    {invoice.customer_email && (
                      <div className="text-slate-700 text-[10.5px]">Email: {invoice.customer_email}</div>
                    )}
                  </div>

                  {/* Right Column: TAX INVOICE Metadata */}
                  <div className="w-56 shrink-0 space-y-1">
                    <div className="font-black text-xs text-black uppercase tracking-wider mb-1">
                      TAX INVOICE
                    </div>
                    <div className="grid grid-cols-[70px_10px_1fr] text-[11px]">
                      <span className="font-bold text-black uppercase">NUMBER</span>
                      <span className="font-bold">:</span>
                      <span className="font-mono font-bold text-black">{invoice.invoice_no}</span>
                    </div>
                    <div className="grid grid-cols-[70px_10px_1fr] text-[11px]">
                      <span className="font-bold text-black uppercase">DATE</span>
                      <span className="font-bold">:</span>
                      <span className="font-bold text-black">
                        {formatCorporateDate(invoice.invoice_date)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 3. Line Items Table (Matches Screenshot: Dark Gray Header, Clean Columns) */}
                <div className="mt-8">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-[#6b7280] text-white font-bold text-xs">
                        <th className="py-2 px-3 text-left">Description</th>
                        <th className="py-2 px-3 text-right w-28">Gross</th>
                        <th className="py-2 px-3 text-right w-24">Tax</th>
                        <th className="py-2 px-3 text-right w-28">{currency}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {/* SST Sub-line matching screenshot */}
                      <tr>
                        <td colSpan={4} className="py-2 px-3 text-[11px] italic text-slate-700 underline font-medium">
                          Subject to {taxPercentage}% SST
                        </td>
                      </tr>

                      {items.map((it, idx) => {
                        const itemGross = it.qty * it.unit_price;
                        const itemTax = (itemGross * taxPercentage) / 100;
                        const itemTotal = itemGross + itemTax;

                        return (
                          <tr key={idx} className="border-b border-slate-100">
                            <td className="py-2 px-3 text-slate-800 text-[11px] align-top">
                              {it.description}
                            </td>
                            <td className="py-2 px-3 text-right text-slate-800 text-[11px] font-mono align-top">
                              {itemGross.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="py-2 px-3 text-right text-slate-800 text-[11px] font-mono align-top">
                              {itemTax.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="py-2 px-3 text-right text-slate-900 text-[11px] font-mono font-bold align-top">
                              {itemTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {/* Dark horizontal underline */}
                  <div className="w-full h-[1.5px] bg-slate-900 mt-1" />
                </div>

                {/* 4. Totals Section (Right Aligned, Total highlighted in Gray) */}
                <div className="flex justify-end mb-6 text-[11px]">
                  <div className="w-72 space-y-1">
                    <div className="grid grid-cols-[100px_10px_1fr] py-0.5 px-2">
                      <span className="font-bold text-slate-800">Subtotal</span>
                      <span className="font-bold">:</span>
                      <span className="text-right font-mono font-bold text-slate-900">
                        {subtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="grid grid-cols-[100px_10px_1fr] py-0.5 px-2">
                      <span className="font-bold text-slate-800">Tax ({taxPercentage}%)</span>
                      <span className="font-bold">:</span>
                      <span className="text-right font-mono font-bold text-slate-900">
                        {taxAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    {/* Total Row with Gray Band */}
                    <div className="grid grid-cols-[100px_10px_1fr] bg-[#9ca3af] text-slate-900 font-extrabold py-1 px-2 rounded-xs">
                      <span className="font-black text-xs uppercase">Total</span>
                      <span className="font-black text-xs">:</span>
                      <span className="text-right font-mono font-black text-xs">
                        {totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 5. Payment Details & Notice (Placed higher up, right after totals) */}
                <div className="space-y-3 pt-2 text-[10.5px] text-slate-700 leading-relaxed avoid-break">
                  <div>This invoice is computer generated and does not require any signature.</div>

                  <div className="space-y-0.5">
                    <div>
                      Please make payment payable to <strong className="text-black uppercase">{companyName}</strong>
                    </div>
                    <div>
                      Electronic Payments: <strong>{companyBankName || 'AmBank Berhad'}</strong>, Account No. :{' '}
                      <strong className="font-mono">{companyBankAccountNo || '8881-0022-9911'}</strong>
                    </div>
                    <div>Interest at 2% per month shall be levied on overdue accounts.</div>
                  </div>
                </div>
              </div>

              {/* 6. Centered Bottom Footer (Matching screenshot, positioned at the very bottom of the page) */}
              <div className="bottom-footer pt-6 pb-1 text-center w-full avoid-break mt-auto">
                <div className="text-[11px] text-slate-700 font-normal">
                  If you have any questions about this invoice, please contact
                </div>
                <div className="text-[11px] font-bold text-slate-900 mt-0.5">
                  [{contactName}, {contactPhone}]
                </div>
                <div className="w-full border-t border-slate-300 my-2" />
                <div className="text-xs sm:text-sm font-bold italic tracking-wide text-slate-900">
                  Thank You For Your Business!
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
