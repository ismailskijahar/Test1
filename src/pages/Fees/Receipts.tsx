import React, { useState, useEffect } from 'react';
import { 
  Search, 
  IndianRupee, 
  Receipt as ReceiptIcon,
  Printer,
  Download,
  Calendar,
  User,
  ExternalLink,
  Filter,
  X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { dataService } from '../../services/dataService';
import { Student, Receipt } from '../../types';
import { formatCurrency, cn } from '../../lib/utils';
import { format } from 'date-fns';
import { useLanguage } from '../../context/LanguageContext';
import { ReceiptPrint } from '../../components/ReceiptPrint';
// import { printReceipt } from '../../services/printService';

export default function ReceiptsPage() {
  const { profile } = useAuth();
  const { t } = useLanguage();
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  const [showPrintModal, setShowPrintModal] = useState(false);

  useEffect(() => {
    if (!profile) return;
    const loadData = async () => {
      const [rData, sData] = await Promise.all([
        dataService.getReceipts(profile.school_id),
        dataService.getStudents(profile.school_id)
      ]);
      setReceipts(rData);
      setStudents(sData);
      setLoading(false);
    };
    loadData();
  }, [profile]);

  const filtered = receipts.filter(r => {
    const student = students.find(s => s.id === r.student_id);
    return r.receipt_no.toLowerCase().includes(searchQuery.toLowerCase()) || 
           student?.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const handlePrint = (receipt: Receipt) => {
    setSelectedReceipt(receipt);
    setShowPrintModal(true);
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#2B2D42] dark:text-white">Fee Receipts</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">View and manage all payment receipts</p>
        </div>
      </header>

      <div className="flex flex-col md:flex-row items-center gap-4">
        <div className="relative flex-1">
           <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
           <input 
             type="text"
             value={searchQuery}
             onChange={e => setSearchQuery(e.target.value)}
             placeholder="Search Receipt No or Student Name..."
             className="w-full pl-12 pr-6 py-4 bg-white dark:bg-[#1E1E1E] border border-slate-100 dark:border-white/5 rounded-2xl text-sm shadow-sm dark:text-white outline-none focus:ring-2 focus:ring-brand-indigo/20 transition-all"
           />
        </div>
      </div>

      <div className="bg-white dark:bg-[#1E1E1E] border border-slate-100 dark:border-white/5 rounded-[2.5rem] overflow-hidden shadow-sm">
         {/* Desktop Table View */}
         <div className="hidden md:block overflow-x-auto">
           <table className="w-full text-left border-collapse">
              <thead>
                 <tr className="bg-slate-50/50 dark:bg-white/5 border-b border-slate-100 dark:border-white/5">
                    <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Date</th>
                    <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Receipt No</th>
                    <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Student Info</th>
                    <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Paid Period</th>
                    <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-slate-400 text-right">Amount</th>
                    <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-slate-400 text-right">Actions</th>
                 </tr>
              </thead>
              <tbody className="dark:text-white">
                 {loading ? (
                    <tr><td colSpan={6} className="px-8 py-10 text-center text-slate-400 italic">Loading receipts...</td></tr>
                 ) : filtered.length === 0 ? (
                    <tr><td colSpan={6} className="px-8 py-20 text-center text-slate-400 italic font-medium">No receipts found.</td></tr>
                 ) : filtered.map(r => {
                    const student = students.find(s => s.id === r.student_id);
                    return (
                      <tr key={r.id} className="border-b border-slate-50 dark:border-white/5 hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors">
                         <td className="px-8 py-5 text-sm text-slate-500 font-medium">
                            {format(new Date(r.date), 'MMM dd, yyyy')}
                         </td>
                         <td className="px-8 py-5">
                            <span className="font-bold text-[#2B2D42] dark:text-white">{r.receipt_no}</span>
                         </td>
                         <td className="px-8 py-5">
                            <div className="flex items-center gap-3">
                               <div className="w-8 h-8 bg-brand-coral/10 rounded-lg flex items-center justify-center font-bold text-brand-coral text-xs overflow-hidden">
                                  {student?.avatar_url ? (
                                    <img 
                                      src={student.avatar_url} 
                                      alt={student.name} 
                                      className="w-full h-full object-cover"
                                      referrerPolicy="no-referrer"
                                    />
                                  ) : (
                                    student?.name.charAt(0)
                                  )}
                               </div>
                               <div>
                                  <p className="font-bold text-sm text-[#2B2D42] dark:text-white">{student?.name || 'Unknown'}</p>
                                  <p className="text-[10px] text-slate-400 font-medium uppercase">Roll {student?.roll_no || '-'}</p>
                               </div>
                            </div>
                         </td>
                         <td className="px-8 py-5">
                            <div className="flex flex-wrap gap-1">
                               {r.months_paid.map(m => (
                                 <span key={m} className="text-[10px] bg-brand-indigo/5 text-brand-indigo px-2 py-0.5 rounded font-bold uppercase">
                                    {format(new Date(m + '-01'), 'MMM yy')}
                                 </span>
                               ))}
                            </div>
                         </td>
                         <td className="px-8 py-5 text-right font-black text-[#2B2D42] dark:text-white">
                            {formatCurrency(r.amount)}
                         </td>
                         <td className="px-8 py-5">
                            <div className="flex justify-end gap-2">
                               <button 
                                 onClick={() => handlePrint(r)}
                                 className="p-2.5 bg-slate-50 dark:bg-white/5 text-slate-400 hover:text-brand-indigo hover:bg-brand-indigo/5 rounded-xl transition-all"
                                 title="Print"
                               >
                                  <Printer className="h-4 w-4" />
                               </button>
                               <button className="p-2.5 bg-slate-50 dark:bg-white/5 text-slate-400 hover:text-brand-indigo hover:bg-brand-indigo/5 rounded-xl transition-all" title="View Transaction">
                                  <ExternalLink className="h-4 w-4" />
                               </button>
                            </div>
                         </td>
                      </tr>
                    );
                 })}
              </tbody>
           </table>
         </div>

         {/* Mobile Card View */}
         <div className="md:hidden divide-y divide-slate-50 dark:divide-white/5">
            {loading ? (
              <div className="p-8 text-center text-slate-400 italic">Loading receipts...</div>
            ) : filtered.length === 0 ? (
              <div className="p-12 text-center text-slate-400 italic">No receipts found.</div>
            ) : filtered.map(r => {
              const student = students.find(s => s.id === r.student_id);
              return (
                <div key={r.id} className="p-6 space-y-4">
                   <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                         <div className="w-10 h-10 bg-brand-coral/10 rounded-xl flex items-center justify-center font-bold text-brand-coral overflow-hidden">
                            {student?.avatar_url ? (
                              <img 
                                src={student.avatar_url} 
                                alt={student.name} 
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              student?.name.charAt(0)
                            )}
                         </div>
                         <div>
                            <p className="font-bold text-[#2B2D42] dark:text-white">{student?.name || 'Unknown'}</p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{r.receipt_no}</p>
                         </div>
                      </div>
                      <div className="text-right">
                         <p className="text-xs font-bold text-slate-400">{format(new Date(r.date), 'MMM dd, yyyy')}</p>
                         <p className="text-lg font-black text-brand-indigo">{formatCurrency(r.amount)}</p>
                      </div>
                   </div>
                   
                   <div className="flex flex-wrap gap-1.5">
                      {r.months_paid.map(m => (
                        <span key={m} className="text-[10px] bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 px-2 py-1 rounded-md font-bold uppercase tracking-tight">
                           {format(new Date(m + '-01'), 'MMMM yyyy')}
                        </span>
                      ))}
                   </div>

                   <div className="flex gap-3 pt-2">
                      <button 
                        onClick={() => handlePrint(r)}
                        className="flex-1 py-3.5 bg-brand-indigo text-white rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-brand-indigo/20 active:scale-95 transition-all"
                      >
                         <Printer className="h-4 w-4" />
                         Print Receipt
                      </button>
                      <button className="w-12 h-12 bg-slate-100 dark:bg-white/5 text-slate-400 flex items-center justify-center rounded-2xl active:scale-95 transition-all">
                         <ExternalLink className="h-4 w-4" />
                      </button>
                   </div>
                </div>
              );
            })}
         </div>
      </div>

      {/* Reprint Modal */}
      {showPrintModal && selectedReceipt && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 print:p-0 overflow-y-auto print-visible">
          <div className="bg-white dark:bg-[#1E1E1E] w-full max-w-4xl rounded-[40px] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300 print:shadow-none print:rounded-none">
            <div className="sticky top-0 z-10 bg-white dark:bg-[#1E1E1E] flex items-center justify-between p-4 md:p-8 border-b border-slate-100 dark:border-white/5 print:hidden">
              <div className="flex items-center gap-2 md:gap-3">
                <div className="h-8 w-8 md:h-10 md:w-10 bg-brand-indigo/10 text-brand-indigo rounded-xl md:rounded-2xl flex items-center justify-center font-bold">
                  <Printer className="h-5 w-5 md:h-6 md:w-6" />
                </div>
                <div>
                   <h3 className="text-sm md:text-xl font-bold font-sans line-clamp-1">Reprint Receipt</h3>
                   <p className="hidden md:block text-xs text-slate-400 font-medium text-slate-400 font-medium tracking-tight">Record: {selectedReceipt.receipt_no}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 md:gap-3">
                <button 
                  onClick={() => window.print()}
                  className="px-4 md:px-6 py-2.5 md:py-3 bg-brand-indigo text-white rounded-xl md:rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-brand-indigo/90 transition-all shadow-lg shadow-brand-indigo/20 active:scale-95 text-xs md:text-sm"
                >
                  <Printer className="h-3.5 w-3.5 md:h-4 md:w-4" />
                  <span className="hidden xs:inline">Print</span>
                  <span className="xs:hidden">Print</span>
                </button>
                <button 
                  onClick={() => setShowPrintModal(false)}
                  className="p-2.5 md:p-3 bg-slate-100 dark:bg-white/5 text-slate-500 rounded-xl md:rounded-2xl hover:bg-slate-200 dark:hover:bg-white/10 transition-all"
                >
                  <X className="h-5 w-5 md:h-6 md:w-6" />
                </button>
              </div>
            </div>

            <div className="p-0 md:p-8 bg-slate-100 dark:bg-black/20 print:p-0 print:bg-white overflow-hidden">
               <div className="bg-white mx-auto print:mx-0 shadow-2xl print:shadow-none ring-1 ring-black/5 md:rounded-[20px] overflow-hidden">
                  <ReceiptPrint 
                    receipt={selectedReceipt}
                    schoolName="Labbaik English School"
                    schoolAddress="Main Campus, Education Valley, New Delhi"
                    schoolPhone="+91 91234 56789"
                    schoolEmail="contact@labbaikschool.edu"
                  />
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
