import React, { useState, useEffect } from 'react';
import { 
  CheckCircle, 
  XCircle, 
  Calendar, 
  Search,
  Filter,
  Check,
  ChevronLeft,
  ChevronRight,
  Save,
  ArrowLeft
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { dataService } from '../services/dataService';
import { whatsappService } from '../services/whatsappService';
import { Student, AttendanceRecord, UserProfile } from '../types';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';

export default function Attendance() {
  const { profile } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<Record<string, 'present' | 'absent'>>({});
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedClass, setSelectedClass] = useState('10');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [classTeacher, setClassTeacher] = useState<UserProfile | null>(null);

  useEffect(() => {
    const loadData = async () => {
      if (!profile) return;
      setLoading(true);
      const [sData, aData, tData] = await Promise.all([
        dataService.getStudents(profile.school_id),
        dataService.getAttendanceForDate(profile.school_id, date),
        dataService.getTeachers(profile.school_id)
      ]);
      
      const teacher = tData.find(t => t.class_teacher_of?.class === selectedClass);
      setClassTeacher(teacher || null);

      const filteredStudents = sData.filter(s => s.class === selectedClass);
      setStudents(filteredStudents);
      
      const initialAttendance: Record<string, 'present' | 'absent'> = {};
      aData.forEach(record => {
        initialAttendance[record.student_id] = record.status;
      });
      
      // For students with no record, default to present
      filteredStudents.forEach(s => {
        if (!initialAttendance[s.id]) {
          initialAttendance[s.id] = 'present';
        }
      });
      
      setAttendance(initialAttendance);
      setLoading(false);
    };

    loadData();
  }, [profile, date, selectedClass]);

  const toggleStatus = (studentId: string) => {
    setAttendance(prev => ({
      ...prev,
      [studentId]: prev[studentId] === 'present' ? 'absent' : 'present'
    }));
  };

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    
    const records = Object.entries(attendance).map(([studentId, status]) => ({
      student_id: studentId,
      date,
      status: status as 'present' | 'absent',
      marked_by: profile.uid,
      school_id: profile.school_id
    }));
    
    // In a real app, I'd use batch writes or update existing records.
    // Here we'll just mark them.
    for (const record of records) {
      await dataService.markAttendance(profile.school_id, record);
      
      // Trigger WhatsApp Alert
      const student = students.find(s => s.id === record.student_id);
      if (student) {
        // We use a non-blocking call to avoid slowing down the UI
        whatsappService.sendAttendanceAlert(profile.school_id, student, record.status)
          .catch(err => console.error("Failed to send attendance WhatsApp:", err));
      }
    }
    
    setSaving(false);
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-white">{t('attendance_register')}</h1>
          <p className="text-neutral-500 dark:text-slate-400 mt-1">{t('mark_monitor_attendance')}</p>
        </div>
        <div className="flex items-center gap-2">
           <button className="p-3 bg-white dark:bg-white/5 border border-neutral-100 dark:border-white/10 rounded-2xl hover:bg-neutral-50 dark:hover:bg-white/10 shadow-sm transition-colors">
             <ChevronLeft className="h-5 w-5 text-neutral-400" />
           </button>
           <div className="flex items-center gap-3 px-6 py-3 bg-white dark:bg-white/5 border border-neutral-100 dark:border-white/10 rounded-2xl shadow-sm font-bold text-sm dark:text-white transition-colors">
             <Calendar className="h-4 w-4 text-neutral-400" />
             {format(new Date(date), 'MMMM dd, yyyy')}
           </div>
           <button className="p-3 bg-white dark:bg-white/5 border border-neutral-100 dark:border-white/10 rounded-2xl hover:bg-neutral-50 dark:hover:bg-white/10 shadow-sm transition-colors">
             <ChevronRight className="h-5 w-5 text-neutral-400" />
           </button>
        </div>
      </header>

      <div className="flex flex-col md:flex-row gap-4">
         <div className="w-full md:w-64">
           <select 
             value={selectedClass}
             onChange={e => setSelectedClass(e.target.value)}
             className="w-full px-4 py-3 bg-white dark:bg-white/5 border border-neutral-100 dark:border-white/10 rounded-2xl text-sm font-bold text-neutral-900 dark:text-white shadow-sm focus:ring-2 focus:ring-brand-indigo transition-all"
           >
              {Array.from({length: 12}, (_, i) => i + 1).map(num => (
                <option key={num} value={num.toString()}>{t('class_menu')} {num}</option>
              ))}
           </select>
         </div>
         <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
            <input 
              type="text" 
              placeholder={`${t('search')}...`} 
              className="w-full pl-12 pr-4 py-3 bg-white dark:bg-white/5 border border-neutral-100 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-brand-indigo focus:border-transparent text-sm shadow-sm dark:text-white"
            />
         </div>
      </div>

      <div className="bg-white dark:bg-[#1E1E1E] border border-neutral-100 dark:border-white/5 rounded-[3rem] overflow-hidden shadow-sm transition-colors duration-300">
        <div className="px-8 py-6 border-b border-neutral-100 dark:border-white/5 flex flex-col xl:flex-row items-center justify-between gap-6">
           <div id="attendance-header-pills" className="flex flex-wrap items-center gap-4">
              <div className="flex items-center p-1.5 bg-slate-50 dark:bg-white/5 rounded-3xl border border-slate-100 dark:border-white/10 shadow-sm">
                <button 
                  onClick={() => navigate('/')}
                  className="flex items-center gap-2 px-5 py-2.5 bg-[#2B2D42] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-brand-indigo transition-all shadow-lg shadow-brand-indigo/20 group"
                >
                   <ArrowLeft className="h-3 w-3 group-hover:-translate-x-1 transition-transform" />
                   {t('back_to_dashboard')}
                </button>
                <div className="px-4 py-2">
                   <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{t('register_view')}</span>
                </div>
              </div>

              <div className="flex items-center gap-3 bg-white dark:bg-white/5 px-5 py-2.5 rounded-[2rem] border border-slate-100 dark:border-white/5 shadow-sm">
                <Calendar className="h-3.5 w-3.5 text-brand-indigo" />
                <span className="text-[10px] font-black text-[#2B2D42] dark:text-white uppercase tracking-wider">
                   {format(new Date(date), 'EEEE, do MMMM')}
                </span>
              </div>

              <div className="flex items-center gap-3 bg-white dark:bg-white/5 px-5 py-2.5 rounded-[2rem] border border-slate-100 dark:border-white/5 shadow-sm">
                 <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                 <span className="text-[10px] font-black text-[#2B2D42] dark:text-white uppercase tracking-wider">
                    {students.length} {t('students')}
                 </span>
              </div>

              {classTeacher && (
                <div className="flex items-center gap-2 px-3 py-1 bg-brand-indigo/5 dark:bg-brand-indigo/10 rounded-full border border-brand-indigo/10">
                   <div className="h-6 w-6 rounded-full overflow-hidden border border-white dark:border-white/20 shadow-sm">
                      <img 
                        src={classTeacher.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${classTeacher.name}`} 
                        className="h-full w-full object-cover" 
                        alt="teacher" 
                      />
                   </div>
                   <span className="text-[10px] font-bold text-brand-indigo uppercase tracking-wider">{classTeacher.name}</span>
                </div>
              )}
           </div>
           <button 
             onClick={handleSave}
             disabled={saving}
             className="inline-flex items-center gap-2 px-8 py-3 bg-brand-indigo dark:bg-brand-indigo text-white rounded-2xl text-sm font-bold hover:bg-[#3a4066] transition-all hover:scale-[1.02] active:scale-95 shadow-xl shadow-brand-indigo/20 disabled:opacity-50"
           >
             {saving ? `${t('loading')}...` : (
               <>
                 <Save className="h-4 w-4" />
                 {t('save_register')}
               </>
             )}
           </button>
        </div>
        
        <div className="p-8">
           <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {loading ? (
                 <div className="col-span-full py-20 text-center text-neutral-400 font-medium italic">{t('loading')}...</div>
              ) : students.length === 0 ? (
                 <div className="col-span-full py-20 text-center text-neutral-400 font-medium italic">{t('no_records')}</div>
              ) : students.map(student => (
                <div 
                  key={student.id}
                  onClick={() => toggleStatus(student.id)}
                  className={cn(
                    "p-4 rounded-2xl border-2 transition-all cursor-pointer group flex items-center justify-between",
                    attendance[student.id] === 'present' 
                      ? "bg-emerald-50/10 dark:bg-emerald-500/5 border-emerald-100/50 dark:border-emerald-500/10 hover:border-emerald-200" 
                      : "bg-red-50/10 dark:bg-red-500/5 border-red-100/50 dark:border-red-500/10 hover:border-red-200"
                  )}
                >
                   <div className="flex items-center gap-3">
                      <div className={cn(
                        "h-10 w-10 rounded-xl flex items-center justify-center font-bold text-sm shadow-sm overflow-hidden",
                        attendance[student.id] === 'present' ? "bg-emerald-500 text-white" : "bg-red-500 text-white"
                      )}>
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
                      <div>
                        <p className="text-sm font-bold text-neutral-900 dark:text-white">{student.name}</p>
                        <p className="text-[10px] font-mono text-neutral-400">{student.roll_no}</p>
                      </div>
                   </div>
                   <div className="flex items-center gap-3">
                      <span className={cn(
                        "text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-lg",
                        attendance[student.id] === 'present' ? "text-emerald-600 bg-emerald-100/50 dark:bg-emerald-500/20" : "text-red-600 bg-red-100/50 dark:bg-red-500/20"
                      )}>
                        {attendance[student.id] === 'present' ? t('present') : t('absent')}
                      </span>
                      <div className={cn(
                        "h-6 w-6 rounded-full flex items-center justify-center border-2",
                        attendance[student.id] === 'present' ? "bg-emerald-500 border-emerald-500 text-white" : "border-neutral-200 dark:border-white/10 text-transparent"
                      )}>
                         {attendance[student.id] === 'present' && <Check className="h-3 w-3" />}
                      </div>
                   </div>
                </div>
              ))}
           </div>
        </div>
      </div>
    </div>
  );
}
