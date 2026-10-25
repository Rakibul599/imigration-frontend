'use client';

import React from 'react';
import {
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  CreditCard,
  DollarSign,
  Download,
  FileCheck,
  FileSpreadsheet,
  FileText,
  Globe2,
  Mail,
  MapPin,
  Phone,
  Printer,
  QrCode,
  ShieldCheck,
  Sparkles,
  Wallet,
  X,
} from 'lucide-react';
import { CompanyInvoice } from '@/lib/companyTrialAndFinanceStorage';
import { amountToWords } from './PrintableQuotationModal';

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
  const handlePrint = () => {
    window.print();
  };

  const totalAmount = Number(invoice.total_amount) || 0;
  const subtotal = Number(invoice.subtotal) || 0;
  const discount = Number(invoice.discount) || 0;
  const taxAmount = Number(invoice.tax_amount) || 0;
  const taxPercentage = Number(invoice.tax_percentage) || 0;
  const amountPaid = Number(invoice.amount_paid) || 0;
  const balanceDue = Number(invoice.balance_due) >= 0 ? Number(invoice.balance_due) : Math.max(0, totalAmount - amountPaid);
  const currency = invoice.currency || 'MYR';
  const isPaid = invoice.payment_status === 'Paid';

  return (
    <>
      {/* Print-specific style overrides */}
      <style jsx global>{`
        @media print {
          /* Hide everything in the DOM */
          body * {
            visibility: hidden !important;
          }
          /* Make our printable invoice document visible */
          #printable-invoice,
          #printable-invoice * {
            visibility: visible !important;
          }
          #printable-invoice {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 12mm 15mm !important;
            background: white !important;
            z-index: 9999999 !important;
            box-shadow: none !important;
            border: none !important;
          }
          .no-print {
            display: none !important;
          }
          @page {
            size: A4 portrait;
            margin: 0;
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
      <div className="fixed inset-0 z-50 bg-slate-900/75 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto">
        <div className="bg-slate-100 rounded-3xl max-w-4xl w-full my-auto shadow-2xl border border-slate-300 flex flex-col max-h-[96vh]">
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
                  Official Malaysian Tax Invoice &bull; LHDN Compliant
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
                  <span>Record Payment</span>
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
          <div className="overflow-y-auto p-4 sm:p-8 flex justify-center bg-slate-200/60">
            {/* The Actual A4 Printable Sheet */}
            <div
              id="printable-invoice"
              className="bg-white w-full max-w-[800px] shadow-lg border border-slate-300 p-8 sm:p-12 text-slate-800 font-sans text-xs flex flex-col justify-between"
              style={{ minHeight: '1050px' }}
            >
              {/* Top Letterhead */}
              <div>
                <div className="flex justify-between items-start pb-6 border-b-2 border-slate-800">
                  {/* Company Logo & Details */}
                  <div className="space-y-1 max-w-[420px]">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#124021] to-[#1c6e3b] text-white flex items-center justify-center font-black text-lg shadow-sm">
                        AC
                      </div>
                      <div>
                        <h1 className="text-base sm:text-lg font-black tracking-tight text-slate-900 m-0 leading-tight">
                          ACCO AGENCY &amp; WORKFORCE MANAGEMENT
                        </h1>
                        <p className="text-[10px] font-bold text-emerald-700 tracking-wider m-0 uppercase">
                          Corporate Payroll, ERP &amp; Worker Services
                        </p>
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-600 pt-2 space-y-0.5 leading-relaxed">
                      <div>
                        <strong>ROC No:</strong> 202401089234 (1542109-W) &bull; <strong>SST No:</strong> W10-2401-32000491
                      </div>
                      <div>
                        Level 28, Menara Exchange 106, Lingkaran TRX, 55188 Kuala Lumpur, Malaysia
                      </div>
                      <div>
                        Tel: +60 3-2788 9000 &bull; Email: billing@acco-agency.com &bull; Web: www.acco-agency.com
                      </div>
                    </div>
                  </div>

                  {/* Document Title & Meta */}
                  <div className="text-right space-y-2">
                    <div className="inline-block bg-slate-900 text-white px-4 py-1.5 rounded-lg text-sm sm:text-base font-black tracking-wider uppercase">
                      TAX INVOICE
                    </div>
                    <div className="space-y-1 text-xs pt-1">
                      <div>
                        <span className="text-slate-400 font-medium">Invoice No: </span>
                        <strong className="text-slate-900 font-mono text-sm">{invoice.invoice_no}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 font-medium">Invoice Date: </span>
                        <strong className="text-slate-800">{invoice.invoice_date}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 font-medium">Due Date: </span>
                        <strong className="text-slate-800">{invoice.due_date || 'Due Upon Receipt'}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 font-medium">Currency: </span>
                        <strong className="text-slate-900 font-bold">{currency}</strong>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Recipient / Billed To Details */}
                <div className="grid grid-cols-2 gap-6 my-6 p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-1">
                      BILLED TO / CUSTOMER:
                    </span>
                    <div className="font-extrabold text-sm text-slate-900 leading-tight">
                      {invoice.company_name || 'Corporate Customer'}
                    </div>
                    <div className="text-slate-700 font-semibold mt-1">
                      Attn: {invoice.customer_name}
                    </div>
                    {invoice.customer_address && (
                      <div className="text-slate-600 mt-0.5 leading-relaxed">
                        {invoice.customer_address}
                      </div>
                    )}
                    <div className="text-slate-600 mt-1 flex flex-wrap gap-x-4">
                      {invoice.customer_email && <span>Email: {invoice.customer_email}</span>}
                      {invoice.customer_phone && <span>Tel: {invoice.customer_phone}</span>}
                    </div>
                  </div>

                  <div className="text-right flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-1">
                        PAYMENT SETTLEMENT STATUS:
                      </span>
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                          isPaid
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : invoice.payment_status === 'Partial'
                            ? 'bg-amber-50 text-amber-800 border-amber-300'
                            : 'bg-rose-50 text-rose-800 border-rose-300'
                        }`}
                      >
                        <CheckCircle2 size={13} className={isPaid ? 'text-emerald-600' : 'text-slate-400'} />
                        <span>STATUS: {invoice.payment_status?.toUpperCase()}</span>
                      </span>
                    </div>

                    {isPaid && (
                      <div className="pt-2">
                        <span className="inline-block border-2 border-emerald-600 text-emerald-700 font-black px-2.5 py-0.5 rounded text-[11px] uppercase tracking-wider transform rotate-1">
                          ✓ PAID &bull; OFFICIAL RECEIPT
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Itemized Table */}
                <div className="border border-slate-300 rounded-xl overflow-hidden mb-6">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-900 text-white font-bold text-[11px] uppercase tracking-wider">
                        <th className="py-3 px-3 text-center w-10">#</th>
                        <th className="py-3 px-4">Item &amp; Description</th>
                        <th className="py-3 px-3 text-center w-16">Qty</th>
                        <th className="py-3 px-4 text-right w-28">Unit Price ({currency})</th>
                        <th className="py-3 px-4 text-right w-28">Total ({currency})</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {invoice.items && invoice.items.length > 0 ? (
                        invoice.items.map((it, idx) => (
                          <tr key={idx} className={idx % 2 === 1 ? 'bg-slate-50/70' : 'bg-white'}>
                            <td className="py-3 px-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                            <td className="py-3 px-4">
                              <div className="font-bold text-slate-900">{it.description}</div>
                            </td>
                            <td className="py-3 px-3 text-center font-semibold text-slate-700">{it.qty}</td>
                            <td className="py-3 px-4 text-right font-mono text-slate-700">
                              {Number(it.unit_price).toFixed(2)}
                            </td>
                            <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                              {Number(it.total).toFixed(2)}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="py-4 text-center text-slate-500 italic">
                            No items listed
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Calculation Summary & Amount in Words */}
                <div className="flex justify-between items-start gap-6 pb-6 border-b border-slate-200 avoid-break">
                  {/* Left: Amount in Words & Payment Settlement Record */}
                  <div className="flex-1 space-y-3">
                    <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl">
                      <span className="text-[10px] uppercase font-bold text-emerald-800 block">
                        TOTAL INVOICE AMOUNT IN WORDS:
                      </span>
                      <p className="font-semibold text-slate-800 text-xs italic m-0 mt-0.5">
                        {amountToWords(totalAmount, currency)}
                      </p>
                    </div>

                    {/* Payment Receipt Voucher */}
                    {invoice.payment_reference && (
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-[11px] text-slate-600">
                        <strong className="text-slate-800 block text-xs flex items-center justify-between">
                          <span>Official Payment Settlement Record:</span>
                          <span className="text-emerald-700 font-bold">{invoice.payment_method || 'Bank Transfer'}</span>
                        </strong>
                        <div className="flex justify-between">
                          <span>Payment Reference / Transaction ID:</span>
                          <strong className="font-mono text-slate-900">{invoice.payment_reference}</strong>
                        </div>
                        {invoice.payment_date && (
                          <div className="flex justify-between">
                            <span>Settlement Date:</span>
                            <strong className="text-slate-800">{invoice.payment_date}</strong>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span>Bank Account:</span>
                          <span>Maybank &bull; 5140 1234 5678</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right: Numbers Summary */}
                  <div className="w-72 space-y-2 text-right">
                    <div className="flex justify-between text-slate-600 text-xs">
                      <span>Subtotal:</span>
                      <span className="font-mono font-bold text-slate-800">{currency} {subtotal.toFixed(2)}</span>
                    </div>

                    {discount > 0 && (
                      <div className="flex justify-between text-emerald-700 text-xs">
                        <span>Discount:</span>
                        <span className="font-mono font-bold">-{currency} {discount.toFixed(2)}</span>
                      </div>
                    )}

                    {taxPercentage > 0 && (
                      <div className="flex justify-between text-slate-600 text-xs">
                        <span>SST / Tax ({taxPercentage}%):</span>
                        <span className="font-mono font-semibold text-slate-800">{currency} {taxAmount.toFixed(2)}</span>
                      </div>
                    )}

                    <div className="pt-2 border-t-2 border-slate-800 flex justify-between items-baseline">
                      <span className="text-sm font-black text-slate-900 uppercase">Total Invoice:</span>
                      <span className="text-lg font-black text-slate-900 font-mono">
                        {currency} {totalAmount.toFixed(2)}
                      </span>
                    </div>

                    <div className="flex justify-between text-xs text-emerald-700 font-bold pt-1 border-t border-slate-200">
                      <span>Amount Paid:</span>
                      <span className="font-mono">{currency} {amountPaid.toFixed(2)}</span>
                    </div>

                    <div className="flex justify-between text-xs font-bold pt-1 border-t border-slate-200">
                      <span className="text-slate-700">Balance Due:</span>
                      <span className={`font-mono text-sm ${balanceDue > 0 ? 'text-rose-600 font-black' : 'text-emerald-700'}`}>
                        {currency} {balanceDue.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Terms and Signatures */}
                <div className="pt-6 space-y-6 avoid-break">
                  {invoice.notes && (
                    <div className="text-[10px] text-slate-500 leading-relaxed">
                      <strong className="text-slate-700 uppercase block mb-1">Notes &amp; Instructions:</strong>
                      <div className="whitespace-pre-line">{invoice.notes}</div>
                    </div>
                  )}

                  {/* Dual Signature & Verification Box */}
                  <div className="grid grid-cols-2 gap-8 pt-4">
                    {/* Issuer Authorization */}
                    <div className="border border-slate-200 rounded-xl p-4 flex flex-col justify-between h-36">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-bold text-slate-400">ISSUED &amp; VERIFIED BY:</span>
                        <span className="text-[9px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded font-bold">
                          LHDN COMPLIANT
                        </span>
                      </div>
                      <div className="border-t border-slate-300 pt-1.5 flex justify-between items-end">
                        <div>
                          <div className="font-bold text-slate-800">Finance &amp; Accounts Division</div>
                          <div className="text-[10px] text-slate-500">ACCO Agency Management</div>
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">Date: {invoice.invoice_date}</div>
                      </div>
                    </div>

                    {/* Client Acknowledgement */}
                    <div className="border border-slate-200 rounded-xl p-4 flex flex-col justify-between h-36">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-bold text-slate-400">CUSTOMER ACKNOWLEDGEMENT:</span>
                        <span className="text-[9px] text-slate-400 font-medium">Receipt Chop</span>
                      </div>
                      <div className="border-t border-slate-300 pt-1.5 flex justify-between items-end">
                        <div>
                          <div className="font-bold text-slate-800">Received By / Signature</div>
                          <div className="text-[10px] text-slate-500">{invoice.company_name || invoice.customer_name}</div>
                        </div>
                        <div className="text-[10px] text-slate-400">Date: _______________</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Official Footer */}
              <div className="pt-8 border-t border-slate-200 mt-8 flex items-center justify-between text-[10px] text-slate-400">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck size={13} className="text-emerald-600" />
                  <span>Official Computer Generated Tax Invoice &bull; No physical signature required</span>
                </div>
                <div>Page 1 of 1</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
