'use client';

import React from 'react';
import {
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  DollarSign,
  Download,
  FileCheck,
  FileSpreadsheet,
  Globe2,
  Mail,
  MapPin,
  Phone,
  Printer,
  QrCode,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';
import { CompanyQuotation } from '@/lib/companyTrialAndFinanceStorage';

interface PrintableQuotationModalProps {
  quotation: CompanyQuotation;
  onClose: () => void;
  onConvertToInvoice?: (quotation: CompanyQuotation) => void;
}

export function amountToWords(amount: number, currency: string = 'Ringgit Malaysia'): string {
  const units = [
    '',
    'One',
    'Two',
    'Three',
    'Four',
    'Five',
    'Six',
    'Seven',
    'Eight',
    'Nine',
    'Ten',
    'Eleven',
    'Twelve',
    'Thirteen',
    'Fourteen',
    'Fifteen',
    'Sixteen',
    'Seventeen',
    'Eighteen',
    'Nineteen',
  ];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const numToWordsLessThanThousand = (num: number): string => {
    if (num === 0) return '';
    if (num < 20) return units[num];
    if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 !== 0 ? ' ' + units[num % 10] : '');
    return units[Math.floor(num / 100)] + ' Hundred' + (num % 100 !== 0 ? ' ' + numToWordsLessThanThousand(num % 100) : '');
  };

  const integerPart = Math.floor(Math.abs(amount));
  const decimalPart = Math.round((Math.abs(amount) - integerPart) * 100);

  if (integerPart === 0 && decimalPart === 0) return `${currency}: Zero Only`;

  let words = '';
  const millions = Math.floor(integerPart / 1000000);
  const thousands = Math.floor((integerPart % 1000000) / 1000);
  const remainder = integerPart % 1000;

  if (millions > 0) words += numToWordsLessThanThousand(millions) + ' Million ';
  if (thousands > 0) words += numToWordsLessThanThousand(thousands) + ' Thousand ';
  if (remainder > 0) words += numToWordsLessThanThousand(remainder);

  words = words.trim();
  let result = `${currency}: ${words}`;
  if (decimalPart > 0) {
    result += ` and Cents ${numToWordsLessThanThousand(decimalPart)}`;
  }
  result += ' Only';
  return result;
}

export default function PrintableQuotationModal({
  quotation,
  onClose,
  onConvertToInvoice,
}: PrintableQuotationModalProps) {
  const handlePrint = () => {
    window.print();
  };

  const totalAmount = Number(quotation.total_amount) || 0;
  const subtotal = Number(quotation.subtotal) || 0;
  const discount = Number(quotation.discount) || 0;
  const taxAmount = Number(quotation.tax_amount) || 0;
  const taxPercentage = Number(quotation.tax_percentage) || 0;
  const currency = quotation.currency || 'MYR';

  return (
    <>
      {/* Print-specific style overrides */}
      <style jsx global>{`
        @media print {
          /* Hide everything in the DOM */
          body * {
            visibility: hidden !important;
          }
          /* Make our printable document visible */
          #printable-quotation,
          #printable-quotation * {
            visibility: visible !important;
          }
          #printable-quotation {
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
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#0b4da2] border border-blue-100 flex items-center justify-center">
                <FileSpreadsheet size={18} />
              </div>
              <div>
                <div className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span>Quotation #{quotation.quotation_no}</span>
                  <span className="text-[10px] bg-blue-100 text-[#0b4da2] font-extrabold px-2 py-0.5 rounded-full uppercase">
                    {quotation.status}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500">
                  Official Malaysian Corporate Format (A4 Ready)
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
                <span>Print Document</span>
              </button>

              {quotation.status !== 'Converted' && onConvertToInvoice && (
                <button
                  type="button"
                  onClick={() => onConvertToInvoice(quotation)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-2xs transition-all cursor-pointer border-0"
                >
                  <DollarSign size={14} />
                  <span>Convert to Invoice</span>
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
              id="printable-quotation"
              className="bg-white w-full max-w-[800px] shadow-lg border border-slate-300 p-8 sm:p-12 text-slate-800 font-sans text-xs flex flex-col justify-between"
              style={{ minHeight: '1050px' }}
            >
              {/* Top Letterhead */}
              <div>
                <div className="flex justify-between items-start pb-6 border-b-2 border-[#0b4da2]">
                  {/* Company Logo & Details */}
                  <div className="space-y-1 max-w-[420px]">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0b4da2] to-[#062c5e] text-white flex items-center justify-center font-black text-lg shadow-sm">
                        AC
                      </div>
                      <div>
                        <h1 className="text-base sm:text-lg font-black tracking-tight text-[#0b4da2] m-0 leading-tight">
                          ACCO AGENCY &amp; WORKFORCE MANAGEMENT
                        </h1>
                        <p className="text-[10px] font-bold text-slate-500 tracking-wider m-0 uppercase">
                          Official Licensed Agency &amp; Enterprise Solutions
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
                    <div className="inline-block bg-[#0b4da2] text-white px-4 py-1.5 rounded-lg text-sm sm:text-base font-black tracking-wider uppercase">
                      OFFICIAL QUOTATION
                    </div>
                    <div className="space-y-1 text-xs pt-1">
                      <div>
                        <span className="text-slate-400 font-medium">Quotation No: </span>
                        <strong className="text-slate-900 font-mono text-sm">{quotation.quotation_no}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 font-medium">Date: </span>
                        <strong className="text-slate-800">{quotation.quotation_date}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 font-medium">Valid Until: </span>
                        <strong className="text-slate-800">{quotation.valid_until || '30 Days from Issue'}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 font-medium">Currency: </span>
                        <strong className="text-[#0b4da2] font-bold">{currency}</strong>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Recipient / Client Details */}
                <div className="grid grid-cols-2 gap-6 my-6 p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-1">
                      QUOTATION ISSUED TO:
                    </span>
                    <div className="font-extrabold text-sm text-slate-900 leading-tight">
                      {quotation.company_name || 'Client Corporate Account'}
                    </div>
                    <div className="text-slate-700 font-semibold mt-1">
                      Attn: {quotation.customer_name}
                    </div>
                    {quotation.customer_address && (
                      <div className="text-slate-600 mt-0.5 leading-relaxed">
                        {quotation.customer_address}
                      </div>
                    )}
                    <div className="text-slate-600 mt-1 flex flex-wrap gap-x-4">
                      {quotation.customer_email && <span>Email: {quotation.customer_email}</span>}
                      {quotation.customer_phone && <span>Tel: {quotation.customer_phone}</span>}
                    </div>
                  </div>

                  <div className="text-right flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-1">
                        STATUS &amp; REFERENCES:
                      </span>
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-[#0b4da2] border border-blue-200">
                        <CheckCircle2 size={13} />
                        <span>Status: {quotation.status}</span>
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 pt-2">
                      Please refer to Quote <strong>#{quotation.quotation_no}</strong> for all inquiries.
                    </div>
                  </div>
                </div>

                {/* Itemized Table */}
                <div className="border border-slate-300 rounded-xl overflow-hidden mb-6">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-[#0b4da2] text-white font-bold text-[11px] uppercase tracking-wider">
                        <th className="py-3 px-3 text-center w-10">#</th>
                        <th className="py-3 px-4">Item &amp; Service Description</th>
                        <th className="py-3 px-3 text-center w-16">Qty</th>
                        <th className="py-3 px-4 text-right w-28">Unit Price ({currency})</th>
                        <th className="py-3 px-4 text-right w-28">Total ({currency})</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {quotation.items && quotation.items.length > 0 ? (
                        quotation.items.map((it, idx) => (
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
                  {/* Left: Amount in Words & Bank Details */}
                  <div className="flex-1 space-y-3">
                    <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl">
                      <span className="text-[10px] uppercase font-bold text-[#0b4da2] block">
                        AMOUNT IN WORDS:
                      </span>
                      <p className="font-semibold text-slate-800 text-xs italic m-0 mt-0.5">
                        {amountToWords(totalAmount, currency)}
                      </p>
                    </div>

                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-[11px] text-slate-600">
                      <strong className="text-slate-800 block text-xs">Payment Remittance Details:</strong>
                      <div>Bank: <strong>Malayan Banking Berhad (Maybank)</strong></div>
                      <div>Account Name: <strong>ACCO AGENCY WORKFORCE SDN BHD</strong></div>
                      <div>Account No: <strong className="font-mono text-slate-900">5140 1234 5678</strong> (DuitNow Accepted)</div>
                    </div>
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
                        <span>Sales Tax / SST ({taxPercentage}%):</span>
                        <span className="font-mono font-semibold text-slate-800">{currency} {taxAmount.toFixed(2)}</span>
                      </div>
                    )}

                    <div className="pt-2 border-t-2 border-[#0b4da2] flex justify-between items-baseline">
                      <span className="text-sm font-black text-slate-900 uppercase">Grand Total:</span>
                      <span className="text-lg font-black text-[#0b4da2] font-mono">
                        {currency} {totalAmount.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Terms and Signatures */}
                <div className="pt-6 space-y-6 avoid-break">
                  {quotation.terms && (
                    <div className="text-[10px] text-slate-500 leading-relaxed">
                      <strong className="text-slate-700 uppercase block mb-1">Terms &amp; Conditions:</strong>
                      <div className="whitespace-pre-line">{quotation.terms}</div>
                    </div>
                  )}

                  {/* Signatures Dual Box */}
                  <div className="grid grid-cols-2 gap-8 pt-4">
                    {/* Issuer Sign */}
                    <div className="border border-slate-200 rounded-xl p-4 flex flex-col justify-between h-36">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-bold text-slate-400">ISSUED BY:</span>
                        <span className="text-[9px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded font-bold">
                          VERIFIED
                        </span>
                      </div>
                      <div className="border-t border-slate-300 pt-1.5 flex justify-between items-end">
                        <div>
                          <div className="font-bold text-slate-800">Authorized Signature</div>
                          <div className="text-[10px] text-slate-500">ACCO Agency Management</div>
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">Date: {quotation.quotation_date}</div>
                      </div>
                    </div>

                    {/* Client Acceptance */}
                    <div className="border border-slate-200 rounded-xl p-4 flex flex-col justify-between h-36">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-bold text-slate-400">ACCEPTED &amp; CONFIRMED BY:</span>
                        <span className="text-[9px] text-slate-400 font-medium">Customer Stamp</span>
                      </div>
                      <div className="border-t border-slate-300 pt-1.5 flex justify-between items-end">
                        <div>
                          <div className="font-bold text-slate-800">Client Signature / Chop</div>
                          <div className="text-[10px] text-slate-500">{quotation.company_name || quotation.customer_name}</div>
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
                  <span>Computer Generated Quotation &bull; Compliant with Malaysian Commercial Practice</span>
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
