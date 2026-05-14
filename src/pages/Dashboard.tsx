import React, { useEffect, useState } from 'react';
import { 
  Users, 
  GraduationCap, 
  UserCircle, 
  TrendingUp, 
  ArrowRight,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  Info,
  Bell,
  CheckCircle2,
  X,
  RefreshCw
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer,
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { dataService } from '../services/dataService';
import { feeEngine } from '../services/feeEngine';
import { formatCurrency, cn } from '../lib/utils';
import { Student, Payment, Announcement, AttendanceRecord, FeeTransaction } from '../types';
import { format } from 'date-fns';

const notices = [
  { title: "Inter-school competition", desc: "(sports/singing/drawing/drama)", date: "10 Feb, 2023", views: "7k", color: "bg-brand-coral" },
  { title: "Disciplinary action if school discipline is not followed", desc: "", date: "6 Feb, 2023", views: "7k", color: "bg-blue-100" },
  { title: "School Annual function celebration 2023-24", desc: "", date: "2 Feb, 2023", views: "7k", color: "bg-orange-100" },
  { title: "Returning library books timely (Usually pinned on notice...)", desc: "", date: "31 Jan, 2023", views: "7k", color: "bg-green-100" },
];

export default function Dashboard() {
  const { profile } = useAuth();
  const { t } = useLanguage();
  const [studentsData, setStudentsData] = useState<Student[]>([]);
  const [teachersCount, setTeachersCount] = useState(0);
  const [parentsCount, setParentsCount] = useState(0);
  const [transactions, setTransactions] = useState<FeeTransaction[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [attendanceToday, setAttendanceToday] = useState<AttendanceRecord[]>([]);
  const [monthlyAttendance, setMonthlyAttendance] = useState<AttendanceRecord[]>([]);
  const [presentStudents, setPresentStudents] = useState<Student[]>([]);
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [selectedStudentForReport, setSelectedStudentForReport] = useState<Student | null>(null);
  const [studentMonthlyAttendance, setStudentMonthlyAttendance] = useState<AttendanceRecord[]>([]);
  const [loadingReport, setLoadingReport] = useState(false);
  const [loading, setLoading] = useState(true);

  // Attendance Filters
  const [attnSearch, setAttnSearch] = useState('');
  const [attnStatusFilter, setAttnStatusFilter] = useState<'all' | 'present' | 'absent' | 'unmarked' | 'perfect-month'>('all');
  const [attnClassFilter, setAttnClassFilter] = useState('all');
  const [attnSectionFilter, setAttnSectionFilter] = useState('all');

  const loadStudentReport = async (student: Student) => {
    if (!profile) return;
    setSelectedStudentForReport(student);
    setLoadingReport(true);
    try {
      const month = format(new Date(), 'yyyy-MM');
      const attendance = await dataService.getStudentAttendanceForMonth(profile.school_id, student.id, month);
      setStudentMonthlyAttendance(attendance as AttendanceRecord[]);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingReport(false);
    }
  };

  useEffect(() => {
    if (!profile) return;
    const load = async () => {
      const today = format(new Date(), 'yyyy-MM-dd');
      const currentMonth = format(new Date(), 'yyyy-MM');
      try {
        // Sync Fee dues on dashboard load
        await feeEngine.syncStudentDues(profile.school_id);
        
        const [s, t, p, txs, ann, attn, present, monthly] = await Promise.all([
          dataService.getStudents(profile.school_id),
          dataService.getTeachers(profile.school_id),
          dataService.getParents(profile.school_id),
          dataService.getTransactionHistory(profile.school_id),
          dataService.getAnnouncements(profile.school_id),
          dataService.getAttendanceForDate(profile.school_id, today),
          dataService.getTodayPresentStudents(profile.school_id),
          dataService.getSchoolAttendanceForMonth(profile.school_id, currentMonth)
        ]);
        // Deduplicate teachers and parents for accurate counts
        const uniqueTeachersCount = new Set(t.map(teacher => teacher.email.toLowerCase())).size;
        
        // Use name+studentId for parents as they might not have unique emails in this system
        const uniqueParentsCount = new Set(p.map(parent => `${parent.name}-${parent.linked_student_id || ''}`)).size;

        setStudentsData(s);
        setTeachersCount(uniqueTeachersCount);
        setParentsCount(uniqueParentsCount);
        setTransactions(txs);
        setAnnouncements(ann);
        setAttendanceToday(attn);
        setPresentStudents(present as Student[]);
        setMonthlyAttendance(monthly as AttendanceRecord[]);
      } catch (error) {
        console.error("Dashboard data load error:", error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [profile]);

  if (loading) return <div className="p-8 animate-pulse text-slate-400 font-bold uppercase tracking-widest text-center flex flex-col items-center gap-4">
    <div className="h-12 w-12 border-4 border-slate-200 border-t-brand-indigo rounded-full animate-spin"></div>
    Loading Dashboard...
  </div>;

  const totalEarnings = transactions.reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
  const attendancePercentage = studentsData.length > 0 
    ? Math.round((attendanceToday.filter(a => a.status === 'present').length / studentsData.length) * 100) 
    : 0;

  // Filter students for the modal
  const classes = Array.from(new Set(studentsData.map(s => s.class))).sort();
  const sections = Array.from(new Set(studentsData.map(s => s.section))).sort();

  // Find students with perfect attendance for the month
  const activeDaysThisMonth = Array.from(new Set(monthlyAttendance.map(a => a.date))).length;
  const prefectMonthlyIds = new Set(
    studentsData
      .filter(s => {
        const studentMonthly = monthlyAttendance.filter(a => a.student_id === s.id);
        const presentCount = studentMonthly.filter(a => a.status === 'present').length;
        const absentCount = studentMonthly.filter(a => a.status === 'absent').length;
        // Perfect means present counts match active school days AND zero absences
        return presentCount === activeDaysThisMonth && absentCount === 0 && activeDaysThisMonth > 0;
      })
      .map(s => s.id)
  );

  const filteredStudents = studentsData.filter(student => {
    const attendance = attendanceToday.find(a => a.student_id === student.id);
    const status = attendance ? attendance.status : 'unmarked';
    
    const matchesSearch = student.name.toLowerCase().includes(attnSearch.toLowerCase()) || 
                         student.roll_number?.toString().includes(attnSearch);
    
    let matchesStatus = attnStatusFilter === 'all' || status === attnStatusFilter;
    if (attnStatusFilter === 'perfect-month') {
      matchesStatus = prefectMonthlyIds.has(student.id);
    }

    const matchesClass = attnClassFilter === 'all' || student.class === attnClassFilter;
    const matchesSection = attnSectionFilter === 'all' || student.section === attnSectionFilter;

    return matchesSearch && matchesStatus && matchesClass && matchesSection;
  });

  // Process real earnings data
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const realEarningsData = monthNames.map((month, idx) => {
    const monthTransactions = transactions.filter(tx => {
      const pDate = new Date(tx.payment_date);
      return pDate.getMonth() === idx && pDate.getFullYear() === new Date().getFullYear();
    });
    const monthEarnings = monthTransactions.reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
    return {
      month,
      earnings: monthEarnings,
      expense: 0 // We don't have expense tracking in DB yet
    };
  });

  return (
    <div className="flex flex-col xl:flex-row gap-8 pb-12">
      {/* Main Content Area */}
      <div className="flex-1 space-y-8 animate-in fade-in duration-700">
        
        {/* Stat Cards - Bento Style */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
          {[
            { label: t('students'), value: studentsData.length.toString(), icon: Users },
            { label: t('teachers'), value: teachersCount.toString(), icon: GraduationCap },
            { label: t('attendance_rate'), value: `${attendancePercentage}%`, icon: UserCircle },
            { label: t('earnings'), value: formatCurrency(totalEarnings), icon: TrendingUp },
            { label: t('present_today'), value: `${presentStudents.length}/${studentsData.length}`, icon: CheckCircle2, action: () => setShowAttendanceModal(true) },
          ].map((stat, i) => (
            <div 
              key={i} 
              onClick={stat.action}
              className={cn(
                "bento-card p-6 flex flex-col justify-between group cursor-pointer overflow-hidden relative dark:bg-[#1E1E1E] dark:border-white/5 transition-all duration-300",
                stat.action ? "hover:scale-[1.02] border-brand-indigo/30" : ""
              )}
            >
              <div className="flex items-center justify-between relative z-10">
                <span className="text-slate-400 dark:text-slate-500 text-[11px] font-bold uppercase tracking-widest">{stat.label}</span>
                <div className="h-8 w-8 rounded-full border border-slate-100 dark:border-white/10 flex items-center justify-center text-slate-300 group-hover:bg-[#2B2D42] dark:group-hover:bg-brand-indigo group-hover:text-white transition-all transform group-hover:rotate-45">
                  <ArrowRight className="h-3.5 w-3.5" />
                </div>
              </div>
              <div>
                <p className="text-2xl font-bold text-[#2B2D42] dark:text-white mt-4 tracking-tight relative z-10">{stat.value}</p>
                {stat.action && (
                  <button className="mt-2 text-[10px] font-black text-brand-indigo uppercase tracking-wider hover:underline">{t('view_info')}</button>
                )}
              </div>
              <div className="absolute -bottom-2 -right-2 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity dark:text-white">
                <stat.icon className="h-16 w-16" />
              </div>
            </div>
          ))}
        </div>

        {/* Chart Section */}
        <div className="grid grid-cols-1 gap-8">
          {/* Earnings Chart */}
          <div className="bento-card p-8">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-lg font-bold text-[#2B2D42] dark:text-white">{t('earnings')}</h3>
                <div className="flex items-center gap-1 text-xs font-semibold text-slate-400 mt-1">
                  {new Date().getFullYear()} <ArrowRight className="h-3 w-3 rotate-90" />
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-[11px] font-bold text-slate-400">
                  <div className="w-2 h-2 rounded-full bg-brand-indigo"></div>
                  {t('earnings')}
                </div>
                <div className="flex items-center gap-2 text-[11px] font-bold text-slate-400">
                  <div className="w-2 h-2 rounded-full bg-brand-coral"></div>
                  {t('expense')}
                </div>
                <button className="p-2 text-slate-300"><MoreHorizontal className="h-5 w-5" /></button>
              </div>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height={256}>
                <BarChart data={realEarningsData} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-slate-100 dark:text-white/5" />
                  <XAxis 
                    dataKey="month" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: 'currentColor', fontSize: 10, fontWeight: 600 }} 
                    dy={10} 
                    className="text-slate-400 dark:text-slate-500"
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: 'currentColor', fontSize: 10, fontWeight: 600 }} 
                    className="text-slate-400 dark:text-slate-500"
                  />
                  <RechartsTooltip 
                    cursor={{ fill: 'currentColor', opacity: 0.1 }}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', backgroundColor: 'var(--tw-prose-invert)' }}
                  />
                  <Bar dataKey="earnings" fill="#4B5282" radius={[4, 4, 0, 0]} barSize={8} />
                  <Bar dataKey="expense" fill="#EB9B7F" radius={[4, 4, 0, 0]} barSize={8} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>

        {/* Notice Board */}
        <div className="bento-card p-8 dark:bg-[#1E1E1E] dark:border-white/5 transition-colors duration-300">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-lg font-bold text-[#2B2D42] dark:text-white">{t('notice_board')}</h3>
              <p className="text-xs text-slate-400 font-medium">Latest updates and school announcements</p>
            </div>
            <button className="p-2 text-slate-300"><MoreHorizontal className="h-5 w-5" /></button>
          </div>
          <div className="space-y-6">
            {announcements.length === 0 ? (
              <div className="py-10 text-center text-slate-400 italic text-sm">No notices currently posted.</div>
            ) : announcements.map((n, i) => (
              <div key={n.id} className="flex items-center justify-between py-1 group cursor-pointer" onClick={() => window.location.href = '/announcements'}>
                <div className="flex items-center gap-4">
                  {n.image_url ? (
                    <div className="h-12 w-12 rounded-xl overflow-hidden shrink-0">
                      <img src={n.image_url} alt="" className="h-full w-full object-cover" />
                    </div>
                  ) : (
                    <div className={cn("h-12 w-12 rounded-xl flex items-center justify-center shrink-0", 
                      i % 4 === 0 ? "bg-brand-coral" : i % 4 === 1 ? "bg-brand-indigo" : i % 4 === 2 ? "bg-emerald-500" : "bg-yellow-400"
                    )}>
                      <Bell className="h-5 w-5 text-white/50" />
                    </div>
                  )}
                  <div>
                    <h4 className="text-sm font-bold text-[#2B2D42] dark:text-white group-hover:text-brand-coral transition-colors">{n.title}</h4>
                    <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{n.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-8">
                  <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">
                    {format(new Date(n.date), 'dd MMM, yyyy')}
                  </span>
                  <div className="flex gap-1">
                     {n.target_roles?.map(role => (
                       <div key={role} className={cn(
                         "w-2 h-2 rounded-full",
                         role === 'teacher' ? "bg-brand-indigo" : "bg-emerald-500"
                       )} title={role}></div>
                     ))}
                  </div>
                  <div className="flex items-center gap-1 text-[11px] font-bold text-slate-300">
                    <TrendingUp className="h-3 w-3" />
                    Active
                  </div>
                  <button className="p-1 px-3 text-slate-300 group-hover:text-brand-coral transition-colors">
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Sidebar - Calendar & Banner */}
      <div className="w-full xl:w-[380px] space-y-8 h-full">
        {/* Calendar Widget */}
        <div className="bg-brand-indigo rounded-[2.5rem] p-8 text-white shadow-xl shadow-brand-indigo/20 dark:shadow-none">
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-bold text-lg">{t('event_calendar')}</h3>
            <button className="p-1 opacity-50 hover:opacity-100 transition-opacity"><MoreHorizontal className="h-5 w-5" /></button>
          </div>
          
          <div className="flex p-1 bg-white/10 rounded-2xl mb-8">
            <button className="flex-1 py-2 text-xs font-bold rounded-xl bg-brand-coral text-white shadow-sm">Day to day</button>
            <button className="flex-1 py-2 text-xs font-bold rounded-xl text-white/60 hover:text-white transition-colors">Social Media</button>
          </div>

          <div className="space-y-6">
            <div className="flex items-center justify-between">
               <span className="font-bold">Feb 2023</span>
               <div className="flex gap-2">
                 <button className="p-1.5 bg-white/10 rounded-lg"><ChevronLeft className="h-4 w-4" /></button>
                 <button className="p-1.5 bg-white/10 rounded-lg"><ChevronRight className="h-4 w-4" /></button>
               </div>
            </div>
            
            <div className="grid grid-cols-7 gap-y-4 text-center text-[10px] font-bold text-white/40 uppercase tracking-widest">
              {['mo', 'tu', 'we', 'th', 'fr', 'sa', 'su'].map(d => <div key={d}>{d}</div>)}
              {Array.from({length: 31}, (_, i) => i + 1).map(day => (
                <div 
                  key={day} 
                  className={cn(
                    "text-sm h-8 w-8 flex items-center justify-center rounded-xl mx-auto cursor-pointer transition-all",
                    day === 16 ? "bg-brand-coral text-white font-bold scale-110 shadow-lg" : "text-white/80 hover:bg-white/10"
                  )}
                >
                   {day.toString().padStart(2, '0')}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Community Banner */}
        <div className="bg-brand-coral rounded-[2.5rem] p-10 text-white relative overflow-hidden group shadow-xl shadow-brand-coral/20 dark:shadow-none">
           <div className="relative z-10 space-y-6">
              <h3 className="text-xl font-bold leading-tight">Join the community and find out more</h3>
              <p className="text-white/70 text-sm leading-relaxed max-w-[200px]">Join different community and keep updated with the live notices and messages.</p>
              <button className="px-6 py-3 bg-[#2B2D42] text-white rounded-xl text-xs font-bold hover:bg-slate-900 transition-all flex items-center gap-2 group-hover:scale-105">
                 Explore now
                 <ArrowRight className="h-4 w-4" />
              </button>
           </div>
           
           {/* Illustration Placeholder - matching the simple style */}
           <div className="absolute right-0 bottom-0 opacity-20 group-hover:opacity-30 transition-opacity">
              <GraduationCap className="h-40 w-40 -rotate-12 translate-x-10 translate-y-10" />
           </div>
           
           {/* Avatar stack simulation */}
           <div className="absolute left-10 bottom-32 flex -space-x-2">
              {[1,2,3].map(i => <div key={i} className="h-6 w-6 rounded-full border-2 border-brand-coral bg-white/20"></div>)}
              <div className="h-6 w-6 rounded-full border-2 border-brand-coral bg-[#2B2D42] flex items-center justify-center text-[8px] font-bold">+10</div>
           </div>
        </div>
      </div>
      {/* Attendance Information Modal */}
      {showAttendanceModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-[#1E1E1E] w-full max-w-4xl rounded-[3rem] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
            <div className="p-8 border-b border-neutral-100 dark:border-white/5 flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-xl font-bold text-[#2B2D42] dark:text-white">
                  {selectedStudentForReport ? t('monthly_report') : t('daily_attendance')}
                </h3>
                <p className="text-xs text-slate-400 font-medium">
                  {selectedStudentForReport 
                    ? `Viewing status for ${selectedStudentForReport.name} - ${format(new Date(), 'MMMM yyyy')}`
                    : `Tracking ${studentsData.length} students for ${format(new Date(), 'dd MMMM, yyyy')}`
                  }
                </p>
              </div>
              <button 
                onClick={() => {
                  setShowAttendanceModal(false);
                  setSelectedStudentForReport(null);
                }}
                className="p-2 hover:bg-neutral-100 dark:hover:bg-white/5 rounded-xl text-slate-400 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            {/* Conditional Content: List vs Report */}
            {!selectedStudentForReport ? (
              <>
                {/* Filters Bar */}
                <div className="p-6 bg-neutral-50/50 dark:bg-white/5 border-b border-neutral-100 dark:border-white/5 grid grid-cols-1 md:grid-cols-4 gap-4 shrink-0">
                  <div className="relative">
                    <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input 
                      type="text"
                      placeholder={`${t('student_name')}...`}
                      value={attnSearch}
                      onChange={(e) => setAttnSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-white dark:bg-white/10 border border-neutral-200 dark:border-white/10 rounded-xl text-sm focus:ring-2 focus:ring-brand-indigo/20 transition-all dark:text-white"
                    />
                  </div>

                  <select 
                    value={attnStatusFilter}
                    onChange={(e) => setAttnStatusFilter(e.target.value as any)}
                    className="px-4 py-2 bg-white dark:bg-white/10 border border-neutral-200 dark:border-white/10 rounded-xl text-sm focus:ring-2 focus:ring-brand-indigo/20 transition-all dark:text-white"
                  >
                    <option value="all">{t('all')} Status</option>
                    <option value="present">{t('present_today')}</option>
                    <option value="absent">{t('absents')}</option>
                    <option value="unmarked">{t('unmarked')}</option>
                    <option value="perfect-month">Perfect Month Streak ⭐</option>
                  </select>

                  <select 
                    value={attnClassFilter}
                    onChange={(e) => setAttnClassFilter(e.target.value)}
                    className="px-4 py-2 bg-white dark:bg-white/10 border border-neutral-200 dark:border-white/10 rounded-xl text-sm focus:ring-2 focus:ring-brand-indigo/20 transition-all dark:text-white"
                  >
                    <option value="all">All Classes</option>
                    {classes.map(c => <option key={c} value={c}>{t('class_menu')} {c}</option>)}
                  </select>

                  <select 
                    value={attnSectionFilter}
                    onChange={(e) => setAttnSectionFilter(e.target.value)}
                    className="px-4 py-2 bg-white dark:bg-white/10 border border-neutral-200 dark:border-white/10 rounded-xl text-sm focus:ring-2 focus:ring-brand-indigo/20 transition-all dark:text-white"
                  >
                    <option value="all">All Sections</option>
                    {sections.map(s => <option key={s} value={s}>{t('section')} {s}</option>)}
                  </select>
                </div>
                
                <div className="p-8 overflow-y-auto flex-1">
                  {filteredStudents.length === 0 ? (
                    <div className="py-20 text-center text-slate-400 italic">No students match your current filters.</div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {filteredStudents.map((student) => {
                        const attendance = attendanceToday.find(a => a.student_id === student.id);
                        const status = attendance ? attendance.status : 'unmarked';
                        
                        return (
                          <div 
                            key={student.id} 
                            onClick={() => loadStudentReport(student)}
                            className="flex items-center justify-between p-4 bg-neutral-50 dark:bg-white/5 rounded-2xl hover:bg-neutral-100 dark:hover:bg-white/10 cursor-pointer transition-all border border-transparent hover:border-brand-indigo/20"
                          >
                            <div className="flex items-center gap-4">
                              <div className={cn(
                                "h-12 w-12 rounded-xl flex items-center justify-center font-bold overflow-hidden",
                                status === 'present' ? "bg-emerald-500/10 text-emerald-500" :
                                status === 'absent' ? "bg-red-500/10 text-red-500" :
                                "bg-slate-500/10 text-slate-500"
                              )}>
                                {student.avatar_url ? (
                                  <img src={student.avatar_url} alt={student.name} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                                ) : (
                                  student.name[0]
                                )}
                              </div>
                              <div>
                                <h4 className="font-bold text-[#2B2D42] dark:text-white text-sm">{student.name}</h4>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Class {student.class} • Sec {student.section} • Roll {student.roll_number}</p>
                              </div>
                            </div>
                            <div className={cn(
                              "flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                              status === 'present' ? "bg-emerald-500/10 text-emerald-500" :
                              status === 'absent' ? "bg-red-500/10 text-red-500" :
                              "bg-slate-500/10 text-slate-500"
                            )}>
                              {status === 'present' && <CheckCircle2 className="h-3 w-3" />}
                              {status === 'absent' && <X className="h-3 w-3" />}
                              {status}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="p-8 flex-1 overflow-y-auto animate-in slide-in-from-right-4 duration-500">
                <div className="flex items-center justify-between mb-8">
                   <button 
                    onClick={() => setSelectedStudentForReport(null)}
                    className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-brand-indigo hover:opacity-80 transition-opacity"
                   >
                     <ChevronLeft className="h-4 w-4" />
                     {t('back_to_list')}
                   </button>
                   <div className="flex items-center gap-3">
                     <span className="text-xs font-bold text-slate-400">{format(new Date(), 'MMMM yyyy')}</span>
                   </div>
                </div>

                {loadingReport ? (
                  <div className="py-20 flex justify-center">
                    <RefreshCw className="h-8 w-8 text-brand-indigo animate-spin" />
                  </div>
                ) : (
                  <div className="space-y-8">
                    {/* Stats Summary */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="p-6 bg-emerald-500/10 rounded-[2rem] border border-emerald-500/20">
                        <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">{t('presents')}</p>
                        <h4 className="text-3xl font-bold text-emerald-700">{studentMonthlyAttendance.filter(a => a.status === 'present').length}</h4>
                      </div>
                      <div className="p-6 bg-red-500/10 rounded-[2rem] border border-red-500/20">
                        <p className="text-[10px] font-black text-red-600 uppercase tracking-widest mb-1">{t('absents')}</p>
                        <h4 className="text-3xl font-bold text-red-700">{studentMonthlyAttendance.filter(a => a.status === 'absent').length}</h4>
                      </div>
                      <div className="p-6 bg-brand-indigo/10 rounded-[2rem] border border-brand-indigo/20">
                        <p className="text-[10px] font-black text-brand-indigo uppercase tracking-widest mb-1">{t('active')}</p>
                        <h4 className="text-3xl font-bold text-brand-indigo">
                          {Math.round((studentMonthlyAttendance.filter(a => a.status === 'present').length / (studentMonthlyAttendance.length || 1)) * 100)}%
                        </h4>
                      </div>
                    </div>

                    {/* Report Table/List */}
                    <div className="space-y-4">
                      <h4 className="text-sm font-black uppercase tracking-widest text-[#2B2D42] dark:text-white px-2">Daily Breakdown</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                        {Array.from({ length: 31 }, (_, i) => {
                          const dateStr = format(new Date(new Date().getFullYear(), new Date().getMonth(), i + 1), 'yyyy-MM-dd');
                          const record = studentMonthlyAttendance.find(a => a.date === dateStr);
                          const isFuture = new Date(dateStr) > new Date();
                          if (new Date(dateStr).getMonth() !== new Date().getMonth()) return null;

                          return (
                            <div key={dateStr} className={cn(
                              "p-4 rounded-3xl border transition-all",
                              isFuture ? "opacity-30 bg-slate-50 dark:bg-white/5 border-transparent" :
                              record?.status === 'present' ? "bg-emerald-50 border-emerald-100 dark:bg-emerald-500/5 dark:border-emerald-500/10" :
                              record?.status === 'absent' ? "bg-red-50 border-red-100 dark:bg-red-500/5 dark:border-red-500/10" :
                              "bg-white dark:bg-[#1E1E1E] border-neutral-100 dark:border-white/5"
                            )}>
                              <div className="flex items-center justify-between">
                                <span className="text-lg font-bold dark:text-white">{i + 1}</span>
                                {record && (
                                  <div className={cn(
                                    "p-1.5 rounded-full",
                                    record.status === 'present' ? "bg-emerald-500 text-white" : "bg-red-500 text-white"
                                  )}>
                                    {record.status === 'present' ? <CheckCircle2 className="h-3 w-3" /> : <X className="h-3 w-3" />}
                                  </div>
                                )}
                              </div>
                              <p className="text-[10px] font-medium text-slate-400 mt-1 uppercase">{format(new Date(dateStr), 'EEEE')}</p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="p-8 bg-neutral-50 dark:bg-white/5 border-t border-neutral-100 dark:border-white/5 flex items-center justify-between shrink-0">
              <p className="text-xs text-slate-400 font-bold">
                {!selectedStudentForReport ? `Showing ${filteredStudents.length} of ${studentsData.length} students` : 'Monthly Report Center'}
              </p>
              <button 
                onClick={() => {
                  setShowAttendanceModal(false);
                  setSelectedStudentForReport(null);
                }}
                className="px-8 py-3 bg-[#2B2D42] dark:bg-white/10 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-900 transition-all"
              >
                {t('close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
