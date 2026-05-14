import React, { useRef } from 'react';
import { format } from 'date-fns';
import { Receipt } from '../types';
import { formatCurrency } from '../lib/utils';
import { Download, Printer } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface ReceiptPrintProps {
  receipt: Receipt;
  schoolName: string;
  schoolAddress: string;
  schoolPhone: string;
  schoolEmail: string;
  logoUrl?: string;
  copyLabel: string;
}

const SingleReceipt = ({ 
  receipt, 
  schoolName, 
  schoolAddress, 
  schoolPhone, 
  schoolEmail, 
  logoUrl,
  copyLabel 
}: ReceiptPrintProps) => {
  return (
    <div className="bg-white p-4 md:p-8 font-serif text-[#1a1a1a] min-h-[480px]">
      {/* Label */}
      <div className="flex justify-end mb-2">
        <span className="text-[8px] md:text-[10px] font-bold border border-black px-2 py-0.5 uppercase tracking-wider">
          {copyLabel}
        </span>
      </div>

      {/* Header */}
      <div className="text-center mb-6 border-b border-black pb-4">
        <div className="flex flex-col md:flex-row items-center justify-center gap-2 md:gap-4 mb-2">
          {logoUrl && <img src={logoUrl} alt="Logo" className="h-10 md:h-12 w-auto" />}
          <div>
            <h1 className="text-lg md:text-2xl font-black uppercase tracking-tight leading-none">AEROVAX SCHOOL SYSTEM</h1>
            <h2 className="text-md md:text-xl font-bold mt-1">{schoolName}</h2>
          </div>
        </div>
        <p className="text-[9px] md:text-xs italic grayscale opacity-80 uppercase tracking-widest leading-relaxed">
          {schoolAddress}
        </p>
        <p className="text-[9px] md:text-xs font-bold mt-1">
          Phone: {schoolPhone} | Email: {schoolEmail}
        </p>
      </div>

      {/* Meta Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 mb-6">
        <div className="space-y-1">
          <div className="flex justify-between text-xs border-b border-dotted border-black/30 pb-0.5">
            <span className="font-bold uppercase tracking-wider text-[10px]">Receipt No</span>
            <span className="font-mono font-bold">{receipt.receipt_no}</span>
          </div>
          <div className="flex justify-between text-xs border-b border-dotted border-black/30 pb-0.5">
            <span className="font-bold uppercase tracking-wider text-[10px]">Date</span>
            <span className="font-medium">{format(new Date(receipt.date), 'dd MMM yyyy, hh:mm a')}</span>
          </div>
        </div>
        <div className="space-y-1">
          <div className="flex justify-between text-xs border-b border-dotted border-black/30 pb-0.5">
            <span className="font-bold uppercase tracking-wider text-[10px]">Payment Method</span>
            <span className="uppercase font-medium">{receipt.payment_method}</span>
          </div>
          <div className="flex justify-between text-xs border-b border-dotted border-black/30 pb-0.5">
            <span className="font-bold uppercase tracking-wider text-[10px]">Status</span>
            <span className="font-black text-brand-indigo">{receipt.payment_status}</span>
          </div>
        </div>
      </div>

      {/* Student Profile Info */}
      <div className="bg-slate-50 border border-black/10 p-3 md:p-4 rounded-sm grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-2 mb-6">
        <div className="flex border-b border-black/5 pb-1">
          <span className="w-24 text-[9px] md:text-[10px] font-bold uppercase tracking-wider text-slate-500">Student Name</span>
          <span className="text-xs font-bold uppercase">{receipt.student_metadata?.name || 'N/A'}</span>
        </div>
        <div className="flex border-b border-black/5 pb-1">
          <span className="w-24 text-[9px] md:text-[10px] font-bold uppercase tracking-wider text-slate-500">Class/Section</span>
          <span className="text-xs font-bold uppercase text-right md:text-left ml-auto md:ml-0">{receipt.student_metadata?.class || 'N/A'} {receipt.student_metadata?.section ? `- ${receipt.student_metadata.section}` : ''}</span>
        </div>
        <div className="flex border-b border-black/5 pb-1">
          <span className="w-24 text-[9px] md:text-[10px] font-bold uppercase tracking-wider text-slate-500">Roll No</span>
          <span className="text-xs font-bold uppercase text-right md:text-left ml-auto md:ml-0">{receipt.student_metadata?.roll_no || 'N/A'}</span>
        </div>
        <div className="flex border-b border-black/5 pb-1">
          <span className="w-24 text-[9px] md:text-[10px] font-bold uppercase tracking-wider text-slate-500">Guardian</span>
          <span className="text-xs font-bold uppercase text-right md:text-left ml-auto md:ml-0">{receipt.student_metadata?.father_name || receipt.student_metadata?.mother_name || 'N/A'}</span>
        </div>
        {receipt.student_metadata?.parent_phone && (
          <div className="flex border-b border-black/5 pb-1 col-span-1 md:col-span-2">
            <span className="w-24 text-[9px] md:text-[10px] font-bold uppercase tracking-wider text-slate-500">Phone</span>
            <span className="text-xs font-bold uppercase">{receipt.student_metadata.parent_phone}</span>
          </div>
        )}
      </div>

      {/* Monthly Breakdown Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse mb-6 min-w-[400px] md:min-w-0">
          <thead>
            <tr className="bg-slate-100 border-t border-b border-black uppercase text-[10px] tracking-widest font-black">
              <th className="py-2 px-3 pl-4">Month/Session</th>
              <th className="py-2 px-3 text-right">Fee (₹)</th>
              <th className="py-2 px-3 text-right">Paid (₹)</th>
              <th className="py-2 px-3 pr-4 text-right">Remaining (₹)</th>
            </tr>
          </thead>
          <tbody>
            {(receipt.monthly_breakdown || []).map((row, idx) => (
              <tr key={idx} className="border-b border-black/10 text-xs">
                <td className="py-2 px-3 pl-4 font-bold">{format(new Date(row.month + '-01'), 'MMMM yyyy')}</td>
                <td className="py-2 px-3 text-right font-medium">{Number(row.fee).toLocaleString()}</td>
                <td className="py-2 px-3 text-right font-bold text-emerald-600">{Number(row.paid).toLocaleString()}</td>
                <td className="py-2 px-3 pr-4 text-right font-medium text-rose-600">{Number(row.due).toLocaleString()}</td>
              </tr>
            ))}
            {(!receipt.monthly_breakdown || receipt.monthly_breakdown.length === 0) && (
              <tr className="border-b border-black/10 text-xs">
                <td colSpan={4} className="py-2 px-3 text-center italic text-slate-400">
                  Breakdown details not available for legacy records.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Summary Section */}
      <div className="flex justify-end mb-8">
        <div className="w-full md:w-64 space-y-2 border-t border-black pt-4 md:border-none md:pt-0">
          <div className="flex justify-between items-center text-sm">
            <span className="font-bold uppercase tracking-wider text-[10px] text-slate-500">Amount Received</span>
            <span className="text-xl font-black">{formatCurrency(receipt.amount)}</span>
          </div>
          <div className="flex justify-between items-center text-rose-600">
            <span className="font-bold uppercase tracking-wider text-[10px]">Remaining Due</span>
            <span className="font-bold">{formatCurrency(receipt.remaining_due)}</span>
          </div>
        </div>
      </div>

      {/* Footer / Signatures */}
      <div className="flex justify-between items-end pt-12">
        <div className="text-center w-32 md:w-48">
          <div className="border-t border-black pt-2 text-[8px] md:text-[10px] font-bold uppercase tracking-widest italic opacity-60">
            Parent Signature
          </div>
        </div>
        <div className="text-center w-32 md:w-48">
          <div className="border-t border-black pt-2 text-[8px] md:text-[10px] font-bold uppercase tracking-widest italic opacity-60">
            Authorized Signature
          </div>
        </div>
      </div>
      
      <div className="mt-8 text-center text-[7px] md:text-[8px] text-slate-400 font-mono tracking-tighter uppercase">
        Aerovax School System • Secure Digital Receipt • Gen: {format(new Date(), 'yyyy-MM-dd HH:mm:ss')} • Ref: {receipt.id}
      </div>
    </div>
  );
};

export const ReceiptPrint = ({ 
  receipt, 
  schoolName, 
  schoolAddress, 
  schoolPhone, 
  schoolEmail, 
  logoUrl 
}: Omit<ReceiptPrintProps, 'copyLabel'>) => {
  const componentRef = useRef<HTMLDivElement>(null);

  const handleDownloadPDF = async () => {
    if (!componentRef.current) return;
    
    try {
      const canvas = await html2canvas(componentRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Receipt_${receipt.receipt_no}.pdf`);
    } catch (error) {
      console.error('PDF Generation Error:', error);
      alert('Could not generate PDF. Please try printing instead.');
    }
  };

  const handleNativePrint = () => {
    window.print();
  };

  return (
    <div className="receipt-print-wrapper bg-white">
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          #root {
            height: auto !important;
            overflow: visible !important;
          }
          .receipt-print-wrapper, .receipt-print-wrapper * {
            visibility: visible !important;
          }
          .receipt-print-wrapper {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            z-index: 1000 !important;
          }
          .print-break {
            height: 1px !important;
            border-top: 1px dashed black !important;
            margin: 20px 0 !important;
            display: block !important;
            visibility: visible !important;
          }
          .no-print {
            display: none !important;
          }
          @page {
            size: A4;
            margin: 0; 
          }
        }
      `}</style>
      
      {/* Control Buttons for Mobile */}
      <div className="no-print flex items-center justify-center gap-4 py-6 bg-slate-50 dark:bg-black/20 border-b border-slate-100 dark:border-white/5 md:hidden">
        <button 
          onClick={handleNativePrint}
          className="flex flex-col items-center gap-1.5 p-4 bg-white dark:bg-white/5 rounded-2xl shadow-sm text-brand-indigo active:scale-95 transition-all"
        >
          <Printer className="h-6 w-6" />
          <span className="text-[10px] font-black uppercase tracking-widest">Print</span>
        </button>
        <button 
          onClick={handleDownloadPDF}
          className="flex flex-col items-center gap-1.5 p-4 bg-white dark:bg-white/5 rounded-2xl shadow-sm text-emerald-500 active:scale-95 transition-all"
        >
          <Download className="h-6 w-6" />
          <span className="text-[10px] font-black uppercase tracking-widest">Save PDF</span>
        </button>
      </div>

      <div ref={componentRef} className="receipt-container max-w-[800px] mx-auto bg-white shadow-xl md:shadow-none">
        {/* School Copy */}
        <SingleReceipt 
          receipt={receipt} 
          schoolName={schoolName} 
          schoolAddress={schoolAddress} 
          schoolPhone={schoolPhone} 
          schoolEmail={schoolEmail} 
          logoUrl={logoUrl}
          copyLabel="SCHOOL COPY (RECEPTIONIST)" 
        />
        
        {/* Dash Line */}
        <div className="print-break w-full my-4 h-1 border-t border-dashed border-black opacity-20" />
        
        {/* Parent Copy */}
        <SingleReceipt 
          receipt={receipt} 
          schoolName={schoolName} 
          schoolAddress={schoolAddress} 
          schoolPhone={schoolPhone} 
          schoolEmail={schoolEmail} 
          logoUrl={logoUrl}
          copyLabel="PARENT COPY" 
        />
      </div>
    </div>
  );
};

