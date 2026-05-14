import React, { useState, useEffect } from 'react';
import { 
  Search, 
  IndianRupee, 
  Clock, 
  Filter, 
  MessageCircle,
  ChevronRight,
  User,
  Layout,
  LayoutGrid,
  List,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { dataService } from '../../services/dataService';
import { feeEngine } from '../../services/feeEngine';
import { Student, DueRecord, UserProfile } from '../../types';
import { formatCurrency, cn } from '../../lib/utils';
import { useLanguage } from '../../context/LanguageContext';
import { format } from 'date-fns';

export default function DueStudents() {
  const { profile } = useAuth();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<Student[]>([]);
  const [allDues, setAllDues] = useState<DueRecord[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [classFilter, setClassFilter] = useState('all');

  useEffect(() => {
    if (!profile) return;
    const loadData = async () => {
      setLoading(true);
      // Sync Fee dues before showing
      await feeEngine.syncStudentDues(profile.school_id);
      
      const [sData, dData] = await Promise.all([
        dataService.getStudents(profile.school_id),
        dataService.getDueRecords(profile.school_id)
      ]);
      setStudents(sData);
      setAllDues(dData);
      setLoading(false);
    };
    loadData();
  }, [profile]);

  // Aggregate dues per student
  const studentDues = students.map(student => {
    const dues = allDues.filter(d => d.student_id === student.id && d.status !== 'Paid');
    const totalDue = feeEngine.calculateTotalOverdue(dues);
    const overdueList = feeEngine.getOverdueMonthsList();
    const overdueCount = dues.filter(d => overdueList.includes(d.month)).length;
    
    return {
      student,
      totalDue,
      monthsCount: overdueCount,
      oldestMonth: dues.filter(d => overdueList.includes(d.month)).sort((a,b) => a.month.localeCompare(b.month))[0]?.month
    };
  }).filter(sd => sd.totalDue > 0);

  const filtered = studentDues.filter(sd => {
    const matchesSearch = sd.student.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          sd.student.custom_id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesClass = classFilter === 'all' || sd.student.class === classFilter;
    return matchesSearch && matchesClass;
  });

  const uniqueClasses = Array.from(new Set(students.map(s => s.class))).sort();

  const handleWhatsAppReminder = (sd: any) => {
    const message = `Dear parent, this is a reminder regarding the outstanding school fees for ${sd.student.name}. Total balance: ${formatCurrency(sd.totalDue)} for ${sd.monthsCount} month(s). Please clear the dues at your earliest convenience. Thank you.`;
    const phone = sd.student.father_phone || sd.student.mother_phone;
    if (phone) {
       window.open(`https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`, '_blank');
    } else {
       alert('No phone number found for this student.');
    }
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#2B2D42] dark:text-white">Due Students</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Track outstanding balances and send reminders</p>
        </div>
        <div className="flex items-center gap-3 bg-white dark:bg-[#1E1E1E] p-1.5 rounded-2xl shadow-sm border border-slate-100 dark:border-white/5">
           <button 
             onClick={() => setViewMode('grid')}
             className={cn(
               "p-2.5 rounded-xl transition-all",
               viewMode === 'grid' ? "bg-brand-indigo text-white shadow-md" : "text-slate-400 hover:text-slate-900 dark:hover:text-white"
             )}
           >
             <LayoutGrid className="h-5 w-5" />
           </button>
           <button 
             onClick={() => setViewMode('list')}
             className={cn(
               "p-2.5 rounded-xl transition-all",
               viewMode === 'list' ? "bg-brand-indigo text-white shadow-md" : "text-slate-400 hover:text-slate-900 dark:hover:text-white"
             )}
           >
             <List className="h-5 w-5" />
           </button>
        </div>
      </header>

      <div className="flex flex-col md:flex-row items-center gap-4">
        <div className="relative flex-1">
           <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
           <input 
             type="text"
             value={searchQuery}
             onChange={e => setSearchQuery(e.target.value)}
             placeholder="Search student name or ID..."
             className="w-full pl-12 pr-6 py-4 bg-white dark:bg-[#1E1E1E] border border-slate-100 dark:border-white/5 rounded-2xl text-sm shadow-sm dark:text-white outline-none focus:ring-2 focus:ring-brand-indigo/20 transition-all"
           />
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
           <div className="flex items-center gap-2 bg-white dark:bg-[#1E1E1E] border border-slate-100 dark:border-white/5 rounded-2xl px-4 py-3 shadow-sm">
             <Filter className="h-4 w-4 text-slate-400" />
             <select 
               value={classFilter}
               onChange={e => setClassFilter(e.target.value)}
               className="bg-transparent text-sm font-bold text-[#2B2D42] dark:text-white outline-none"
             >
                <option value="all">All Classes</option>
                {uniqueClasses.map(c => <option key={c} value={c}>Class {c}</option>)}
             </select>
           </div>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center text-slate-400 italic">Finding students with dues...</div>
      ) : filtered.length === 0 ? (
        <div className="py-20 text-center text-slate-400 italic flex flex-col items-center gap-4">
           <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-500 italic">
              <CheckCircle className="h-8 w-8" />
           </div>
           <p>Great! No students have outstanding dues.</p>
        </div>
      ) : (
        <div className={cn(
          "grid gap-6",
          viewMode === 'grid' ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" : "grid-cols-1"
        )}>
           {filtered.map((sd) => (
             <div 
               key={sd.student.id} 
               className={cn(
                 "bg-white dark:bg-[#1E1E1E] border border-slate-100 dark:border-white/5 shadow-sm transition-all hover:shadow-md",
                 viewMode === 'grid' ? "p-8 rounded-[2.5rem]" : "p-6 rounded-3xl flex items-center gap-8"
               )}
             >
                <div className="flex items-center gap-4 flex-1">
                   <div className="w-16 h-16 bg-brand-coral/10 rounded-2xl flex items-center justify-center text-xl font-bold text-brand-coral shrink-0 overflow-hidden">
                      {sd.student.avatar_url ? (
                        <img 
                          src={sd.student.avatar_url} 
                          alt={sd.student.name} 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        sd.student.name.charAt(0)
                      )}
                   </div>
                   <div>
                      <h3 className="font-bold text-[#2B2D42] dark:text-white text-lg">{sd.student.name}</h3>
                      <div className="flex items-center gap-3 flex-wrap mt-1">
                         <span className="text-[10px] font-bold text-slate-400 bg-slate-50 dark:bg-white/5 px-2 py-0.5 rounded uppercase">Class {sd.student.class}</span>
                         <span className="text-[10px] font-bold text-slate-400 bg-slate-50 dark:bg-white/5 px-2 py-0.5 rounded uppercase">Roll {sd.student.roll_no}</span>
                         <span className="text-[10px] font-bold text-brand-indigo bg-brand-indigo/5 px-2 py-0.5 rounded uppercase">ID: {sd.student.custom_id}</span>
                      </div>
                   </div>
                </div>

                <div className={cn(
                   "flex items-center justify-between",
                   viewMode === 'grid' ? "mt-8 pt-8 border-t border-slate-50 dark:border-white/5" : "gap-12"
                )}>
                   <div className="text-left">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Outstanding Balance</p>
                      <div className="flex items-center gap-2">
                         <p className="text-2xl font-black text-rose-500">{formatCurrency(sd.totalDue)}</p>
                         <span className="text-[10px] bg-rose-50 text-rose-500 px-2 py-0.5 rounded-full font-bold">
                           {sd.monthsCount} Mon{sd.monthsCount > 1 ? 's' : ''}
                         </span>
                      </div>
                      {sd.oldestMonth && (
                        <p className="text-[10px] text-slate-400 font-medium mt-1 flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3 text-amber-500" />
                          Pending since {format(new Date(sd.oldestMonth + '-01'), 'MMMM yyyy')}
                        </p>
                      )}
                   </div>

                   <div className="flex flex-col gap-2">
                      <button 
                        onClick={() => handleWhatsAppReminder(sd)}
                        className="p-3 bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white rounded-2xl transition-all shadow-sm flex items-center gap-2 font-bold text-[10px] uppercase tracking-wider"
                      >
                         <MessageCircle className="h-4 w-4" />
                         {viewMode === 'list' ? 'Send Reminder' : ''}
                      </button>
                      <button className="p-3 bg-slate-50 dark:bg-white/5 text-slate-400 hover:text-brand-indigo rounded-2xl transition-all shadow-sm flex items-center gap-2 font-bold text-[10px] uppercase tracking-wider">
                         <ChevronRight className="h-4 w-4" />
                         {viewMode === 'list' ? 'View Profile' : ''}
                      </button>
                   </div>
                </div>
             </div>
           ))}
        </div>
      )}
    </div>
  );
}
