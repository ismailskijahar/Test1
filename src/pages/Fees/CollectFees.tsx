import React, { useState, useEffect } from 'react';
import { 
  Search, 
  IndianRupee, 
  CreditCard, 
  Clock, 
  CheckCircle,
  AlertCircle,
  TrendingDown,
  Calendar,
  Receipt as ReceiptIcon,
  ChevronRight,
  Filter,
  Layout,
  Printer,
  X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { dataService } from '../../services/dataService';
import { whatsappService } from '../../services/whatsappService';
import { Student, DueRecord, FeeTransaction, Receipt } from '../../types';
import { feeEngine } from '../../services/feeEngine';
import { formatCurrency, cn } from '../../lib/utils';
import { format } from 'date-fns';
import { useLanguage } from '../../context/LanguageContext';
import { ReceiptPrint } from '../../components/ReceiptPrint';
// import { printReceipt } from '../../services/printService';

export default function CollectFees() {
  const { profile } = useAuth();
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [dues, setDues] = useState<DueRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCollecting, setIsCollecting] = useState(false);
  const [successInfo, setSuccessInfo] = useState<{receipt: Receipt, tx: FeeTransaction} | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  const [paymentData, setPaymentData] = useState({
    amount: 0,
    method: 'cash' as const,
    remarks: '',
    months: [] as string[]
  });

  useEffect(() => {
    if (!profile) return;
    const loadStudents = async () => {
      const data = await dataService.getStudents(profile.school_id);
      setAllStudents(data);
      setLoading(false);
    };
    loadStudents();
  }, [profile]);

  useEffect(() => {
    if (searchQuery.length > 1) {
      const filtered = allStudents.filter(s => 
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        s.custom_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.roll_no.includes(searchQuery)
      );
      setFilteredStudents(filtered);
    } else {
      setFilteredStudents([]);
    }
  }, [searchQuery, allStudents]);

  const selectStudent = async (student: Student) => {
    setSelectedStudent(student);
    setSearchQuery('');
    setFilteredStudents([]);
    setSuccessInfo(null);
    if (!profile) return;
    const sDues = await dataService.getDueRecords(profile.school_id, student.id);
    // Sort dues by month
    setDues(sDues.sort((a, b) => a.month.localeCompare(b.month)));
    setPaymentData(prev => ({ ...prev, months: [] }));
  };

  const handleMonthToggle = (month: string, amount: number) => {
    setPaymentData(prev => {
      const isSelected = prev.months.includes(month);
      const newMonths = isSelected 
        ? prev.months.filter(m => m !== month)
        : [...prev.months, month];
      
      const newAmount = newMonths.reduce((sum, m) => {
        const due = dues.find(d => d.month === m);
        return sum + (due ? (due.amount - due.paid_amount) : 0);
      }, 0);

      return { ...prev, months: newMonths, amount: newAmount };
    });
  };

  const handleCollect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !selectedStudent || paymentData.months.length === 0) return;

    setIsCollecting(true);
    try {
      const result = await dataService.collectPayment(profile.school_id, {
        student_id: selectedStudent.id,
        amount: paymentData.amount,
        payment_date: new Date().toISOString(),
        method: paymentData.method,
        months: paymentData.months,
        remarks: paymentData.remarks,
        recorded_by: profile.uid,
        school_id: profile.school_id
      });

      if (result) {
        setSuccessInfo(result);
        setShowReceiptModal(true);
        
        // Trigger WhatsApp Receipt
        whatsappService.sendFeeReceiptAlert(profile.school_id, selectedStudent, paymentData.amount, result.receipt.receipt_no)
          .catch(err => console.error("Failed to send WhatsApp receipt:", err));

        setSelectedStudent(null);
        setDues([]);
      }
    } catch (error) {
      console.error('Payment collection failed:', error);
    } finally {
      setIsCollecting(false);
    }
  };

  return (
    <div className="space-y-8 pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#2B2D42] dark:text-white">Collect Fees</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Search student and record payments instantly</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Search and Student Info */}
        <div className="lg:col-span-1 space-y-6">
          <div className="relative">
             <div className="bg-white dark:bg-[#1E1E1E] p-4 rounded-3xl border border-slate-100 dark:border-white/5 shadow-sm">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <input 
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search Name or ID..."
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-white/5 border-transparent rounded-2xl outline-none focus:ring-2 focus:ring-brand-indigo/20 transition-all dark:text-white"
                  />
                </div>
                
                {filteredStudents.length > 0 && (
                  <div className="mt-4 space-y-2 max-h-96 overflow-y-auto">
                    {filteredStudents.map(student => (
                      <button 
                        key={student.id}
                        onClick={() => selectStudent(student)}
                        className="w-full flex items-center justify-between p-3 hover:bg-slate-50 dark:hover:bg-white/5 rounded-2xl transition-all border border-transparent hover:border-slate-100 dark:hover:border-white/10"
                      >
                         <div className="flex items-center gap-3">
                           <div className="w-10 h-10 bg-brand-coral/10 rounded-xl flex items-center justify-center font-bold text-brand-coral shrink-0 overflow-hidden">
                             {student.avatar_url ? (
                               <img 
                                 src={student.avatar_url} 
                                 alt={student.name} 
                                 className="w-full h-full object-cover"
                                 referrerPolicy="no-referrer"
                               />
                             ) : (
                               student.name.charAt(0)
                             )}
                           </div>
                           <div className="text-left">
                             <p className="font-bold text-sm text-[#2B2D42] dark:text-white">{student.name}</p>
                             <p className="text-[10px] text-slate-400 font-medium">ID: {student.custom_id} • Class {student.class}</p>
                           </div>
                         </div>
                         <ChevronRight className="h-4 w-4 text-slate-300" />
                      </button>
                    ))}
                  </div>
                )}
             </div>
          </div>

          {selectedStudent && (
             <div className="bg-white dark:bg-[#1E1E1E] p-8 rounded-[2.5rem] border border-slate-100 dark:border-white/5 shadow-sm animate-in slide-in-from-bottom duration-300">
                <div className="flex flex-col items-center text-center space-y-4 mb-8">
                   <div className="w-24 h-24 bg-brand-indigo/10 rounded-[2rem] flex items-center justify-center text-3xl font-bold text-brand-indigo shadow-inner">
                      {selectedStudent.name.charAt(0)}
                   </div>
                   <div>
                      <h2 className="text-2xl font-bold text-[#2B2D42] dark:text-white">{selectedStudent.name}</h2>
                      <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 dark:bg-white/5 rounded-full mt-2">
                         <Layout className="h-3 w-3 text-slate-400" />
                         <span className="text-[10px] font-bold text-slate-500 uppercase">Class {selectedStudent.class} {selectedStudent.section}</span>
                      </div>
                   </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Roll No</p>
                      <p className="font-bold text-[#2B2D42] dark:text-white">#{selectedStudent.roll_no}</p>
                   </div>
                   <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Father</p>
                      <p className="font-bold text-[#2B2D42] dark:text-white truncate">{selectedStudent.father_name}</p>
                   </div>
                </div>

                <div className="mt-8 flex justify-center">
                   <button 
                     onClick={() => setSelectedStudent(null)}
                     className="text-xs font-bold text-rose-500 hover:text-rose-600 transition-colors underline underline-offset-4"
                   >
                     Clear Selection
                   </button>
                </div>
             </div>
          )}

          {!selectedStudent && !successInfo && (
            <div className="bg-indigo-50/50 dark:bg-brand-indigo/5 p-8 rounded-[2.5rem] border border-indigo-100 dark:border-brand-indigo/10 flex flex-col items-center text-center">
               <div className="w-16 h-16 bg-white dark:bg-white/5 rounded-[1.5rem] flex items-center justify-center mb-6 shadow-sm">
                  <Search className="h-8 w-8 text-brand-indigo" />
               </div>
               <h3 className="font-bold text-brand-indigo mb-2">Select a Student</h3>
               <p className="text-sm text-slate-500 dark:text-slate-400">Search for a student using their name, Roll No, or admission ID to begin fee collection.</p>
            </div>
          )}

          {successInfo && (
            <div className="bg-emerald-50 dark:bg-emerald-500/5 p-8 rounded-[2.5rem] border border-emerald-100 dark:border-emerald-500/10 flex flex-col items-center text-center animate-in zoom-in">
               <div className="w-16 h-16 bg-white dark:bg-white/5 rounded-[1.5rem] flex items-center justify-center mb-6 shadow-sm">
                  <CheckCircle className="h-8 w-8 text-emerald-500" />
               </div>
               <h3 className="font-bold text-emerald-600 mb-2">Payment Collected</h3>
               <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Receipt {successInfo.receipt.receipt_no} has been generated successfully.</p>
               <div className="flex flex-col w-full gap-3">
                 <button 
                   onClick={() => setShowReceiptModal(true)}
                   className="py-4 bg-emerald-500 text-white rounded-2xl font-bold shadow-lg hover:bg-emerald-600 transition-all flex items-center justify-center gap-2"
                 >
                   <ReceiptIcon className="h-4 w-4" />
                   View & Print Receipt
                 </button>
                 <button 
                   onClick={() => setSuccessInfo(null)}
                   className="py-4 border border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-500 rounded-2xl font-bold hover:bg-white dark:hover:bg-emerald-500/10 transition-all"
                 >
                   Collect New Fee
                 </button>
               </div>
            </div>
          )}
        </div>

        {/* Dues and Collection Form */}
        <div className="lg:col-span-2 space-y-6">
           {selectedStudent ? (
             <form onSubmit={handleCollect} className="space-y-6">
                <div className="bg-white dark:bg-[#1E1E1E] p-8 rounded-[2.5rem] border border-slate-100 dark:border-white/5 shadow-sm">
                   <div className="flex items-center justify-between mb-8">
                      <h3 className="text-xl font-bold text-[#2B2D42] dark:text-white">Outstanding Dues</h3>
                      <div className="flex flex-col items-end gap-1">
                          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-100 dark:bg-white/5 px-4 py-2 rounded-full">
                             <Calendar className="h-3 w-3" />
                             Timeline view
                          </div>
                          <div className="text-[10px] font-black text-rose-500 uppercase tracking-widest">
                             Overdue: {formatCurrency(feeEngine.calculateTotalOverdue(dues))}
                          </div>
                       </div>
                   </div>

                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {dues.length === 0 ? (
                        <div className="col-span-full py-10 text-center text-slate-400 italic bg-slate-50 dark:bg-white/5 rounded-3xl">
                           No outstanding dues found for this student.
                        </div>
                      ) : dues.map((due) => {
                        const isOverdue = feeEngine.getOverdueMonthsList().includes(due.month) && due.status !== 'Paid';
                        return (
                        <button
                          key={due.id}
                          type="button"
                          disabled={due.status === 'Paid'}
                          onClick={() => handleMonthToggle(due.month, due.amount)}
                          className={cn(
                            "group p-6 rounded-3xl border-2 transition-all flex items-center justify-between relative overflow-hidden",
                            paymentData.months.includes(due.month) 
                              ? "bg-brand-indigo/5 border-brand-indigo shadow-md" 
                              : due.status === 'Paid'
                                ? "bg-emerald-50 dark:bg-emerald-500/5 border-emerald-100 dark:border-emerald-500/20 cursor-default"
                                : isOverdue 
                                  ? "bg-rose-50 dark:bg-rose-500/5 border-rose-100 dark:border-rose-500/20 hover:border-rose-200"
                                  : due.status === 'Partially Paid'
                                    ? "bg-amber-50 dark:bg-amber-500/5 border-amber-100 dark:border-amber-500/20 hover:border-amber-200"
                                    : "bg-white dark:bg-white/5 border-slate-50 dark:border-white/5 hover:border-slate-200 dark:hover:border-white/20"
                          )}
                        >
                           <div className="absolute top-0 right-0 p-2">
                              {due.status === 'Paid' ? (
                                 <div className="bg-emerald-500 text-white p-1 rounded-full">
                                   <CheckCircle className="h-3 w-3" />
                                 </div>
                              ) : isOverdue ? (
                                 <div className="bg-rose-500 text-white px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-tighter shadow-sm animate-pulse">
                                   OVERDUE
                                 </div>
                              ) : null}
                           </div>
                           <div className="flex items-center gap-4 text-left">
                              <div className={cn(
                                "w-10 h-10 rounded-2xl flex items-center justify-center transition-all",
                                paymentData.months.includes(due.month) 
                                  ? "bg-brand-indigo text-white" 
                                  : due.status === 'Paid'
                                    ? "bg-emerald-500 text-white"
                                    : isOverdue ? "bg-rose-500 text-white"
                                    : due.status === 'Partially Paid'
                                      ? "bg-amber-500 text-white"
                                      : "bg-slate-100 dark:bg-white/10 text-slate-400"
                              )}>
                                 {paymentData.months.includes(due.month) ? <CheckCircle className="h-5 w-5" /> : 
                                  due.status === 'Paid' ? <CheckCircle className="h-5 w-5" /> :
                                  isOverdue ? <AlertCircle className="h-5 w-5" /> : 
                                  <Clock className="h-5 w-5" />}
                              </div>
                              <div>
                                 <p className={cn(
                                   "font-bold text-sm",
                                   due.status === 'Paid' ? "text-emerald-700 dark:text-emerald-400" : 
                                   isOverdue ? "text-rose-700 dark:text-rose-400" : "text-[#2B2D42] dark:text-white"
                                 )}>
                                   {format(new Date(due.month + '-01'), 'MMMM yyyy')}
                                 </p>
                                 <p className="text-[10px] font-medium text-slate-400 uppercase">
                                   {due.status === 'Paid' ? 'Fee Fully Paid' : isOverdue ? 'Overdue Payment' : 'Monthly Tuition Fee'}
                                 </p>
                              </div>
                           </div>
                           <div className="text-right">
                              <p className={cn(
                                "font-bold transition-all",
                                paymentData.months.includes(due.month) ? "text-brand-indigo" : 
                                due.status === 'Paid' ? "text-emerald-600 dark:text-emerald-500" : 
                                isOverdue ? "text-rose-600 dark:text-rose-500" : "text-[#2B2D42] dark:text-white"
                              )}>
                                {due.status === 'Paid' ? 'Paid' : formatCurrency(due.amount - due.paid_amount)}
                              </p>
                              {due.status === 'Partially Paid' && (
                                <p className="text-[10px] text-amber-500 font-bold italic">Balance: {formatCurrency(due.amount - due.paid_amount)}</p>
                              )}
                           </div>
                        </button>
                      )})}
                   </div>
                </div>

                <div className="bg-white dark:bg-[#1E1E1E] p-8 rounded-[2.5rem] border border-slate-100 dark:border-white/5 shadow-sm">
                   <div className="flex items-center justify-between mb-8">
                      <h3 className="text-xl font-bold text-[#2B2D42] dark:text-white">Payment Selection</h3>
                      <p className="text-[10px] font-bold text-brand-indigo uppercase bg-brand-indigo/10 px-4 py-2 rounded-full">
                        {paymentData.months.length} Month{paymentData.months.length !== 1 ? 's' : ''} Selected
                      </p>
                   </div>

                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-6">
                         <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-widest text-slate-400 px-1">Amount to Pay</label>
                            <div className="relative">
                               <IndianRupee className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-brand-indigo" />
                               <input 
                                 type="number"
                                 value={paymentData.amount}
                                 onChange={e => setPaymentData({...paymentData, amount: Number(e.target.value)})}
                                 className="w-full pl-12 pr-6 py-5 bg-slate-50 dark:bg-white/5 border-transparent focus:border-brand-indigo rounded-[1.5rem] text-xl font-bold dark:text-white outline-none transition-all"
                               />
                            </div>
                            <p className="text-[10px] text-slate-400 px-2 italic">You can enter a lower amount for partial payment.</p>
                         </div>

                         <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-widest text-slate-400 px-1 text-center">Payment Method</label>
                            <div className="grid grid-cols-3 gap-3">
                               {['cash', 'upi', 'bank'].map((m) => (
                                 <button
                                   key={m}
                                   type="button"
                                   onClick={() => setPaymentData({...paymentData, method: m as any})}
                                   className={cn(
                                     "py-3 rounded-2xl border-2 font-bold text-xs uppercase transition-all",
                                     paymentData.method === m 
                                       ? "bg-brand-indigo/5 border-brand-indigo text-brand-indigo shadow-md" 
                                       : "bg-slate-50 dark:bg-white/5 border-transparent text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10"
                                   )}
                                 >
                                    {m}
                                 </button>
                               ))}
                            </div>
                         </div>
                      </div>

                      <div className="space-y-6">
                         <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-widest text-slate-400 px-1">Remarks (Optional)</label>
                            <textarea 
                              value={paymentData.remarks}
                              onChange={e => setPaymentData({...paymentData, remarks: e.target.value})}
                              placeholder="Add payment notes..."
                              rows={4}
                              className="w-full px-5 py-4 bg-slate-50 dark:bg-white/5 border-transparent focus:border-brand-indigo rounded-[1.5rem] dark:text-white outline-none transition-all resize-none"
                            />
                         </div>
                         
                         <div className="bg-brand-indigo p-6 rounded-[2rem] text-white shadow-xl shadow-brand-indigo/20">
                            <div className="flex justify-between items-center mb-2">
                               <span className="text-indigo-200 text-xs font-medium uppercase tracking-widest">Grand Total</span>
                               <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-bold">Real-time</span>
                            </div>
                            <p className="text-3xl font-bold">{formatCurrency(paymentData.amount)}</p>
                            <button 
                               disabled={isCollecting || paymentData.amount <= 0 || paymentData.months.length === 0}
                               className="w-full mt-4 py-4 bg-white text-brand-indigo rounded-2xl font-bold shadow-sm hover:bg-indigo-50 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                               {isCollecting ? (
                                  <div className="h-5 w-5 border-2 border-brand-indigo border-t-transparent rounded-full animate-spin" />
                               ) : (
                                  <>
                                    <IndianRupee className="h-5 w-5" />
                                    Confirm Collection
                                  </>
                               )}
                            </button>
                         </div>
                      </div>
                   </div>
                </div>
             </form>
           ) : (
              <div className="h-full bg-slate-50 dark:bg-white/5 rounded-[3rem] border-2 border-dashed border-slate-200 dark:border-white/10 flex flex-col items-center justify-center p-12 text-center min-h-[400px]">
                 <div className="w-20 h-20 bg-white dark:bg-white/5 rounded-3xl flex items-center justify-center mb-6 shadow-sm">
                    <IndianRupee className="h-10 w-10 text-slate-300 dark:text-slate-600" />
                 </div>
                 <h3 className="text-xl font-bold text-slate-400 dark:text-slate-500 mb-2">No Student Selected</h3>
                 <p className="text-slate-400 text-sm max-w-xs">Select a student from the sidebar to view their fee history and record new collections.</p>
              </div>
           )}
        </div>
      </div>
      {/* Receipt Modal */}
      {showReceiptModal && successInfo && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 print:p-0 overflow-y-auto print-visible">
          <div className="bg-white dark:bg-[#1E1E1E] w-full max-w-4xl rounded-[40px] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300 print:shadow-none print:rounded-none">
            <div className="sticky top-0 z-10 bg-white dark:bg-[#1E1E1E] flex items-center justify-between p-4 md:p-8 border-b border-slate-100 dark:border-white/5 print:hidden">
              <div className="flex items-center gap-2 md:gap-3">
                <div className="h-8 w-8 md:h-10 md:w-10 bg-emerald-100 text-emerald-600 rounded-xl md:rounded-2xl flex items-center justify-center font-bold">
                   <CheckCircle className="h-5 w-5 md:h-6 md:w-6" />
                </div>
                <div>
                   <h3 className="text-sm md:text-xl font-bold line-clamp-1">Receipt Preview</h3>
                   <p className="hidden md:block text-xs text-slate-400 font-medium">Receipt No: {successInfo.receipt.receipt_no}</p>
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
                  onClick={() => setShowReceiptModal(false)}
                  className="p-2.5 md:p-3 bg-slate-100 dark:bg-white/5 text-slate-500 rounded-xl md:rounded-2xl hover:bg-slate-200 dark:hover:bg-white/10 transition-all"
                >
                  <X className="h-5 w-5 md:h-6 md:w-6" />
                </button>
              </div>
            </div>


            <div className="p-0 md:p-8 bg-slate-100 dark:bg-black/20 print:p-0 print:bg-white overflow-hidden">
               {/* Receipt Display Wrapper */}
               <div className="bg-white mx-auto print:mx-0 shadow-2xl print:shadow-none ring-1 ring-black/5 dark:ring-white/5 md:rounded-[20px] overflow-hidden">
                  <ReceiptPrint 
                    receipt={successInfo.receipt}
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
