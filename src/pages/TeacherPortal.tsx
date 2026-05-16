import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Calendar, 
  CheckCircle, 
  XCircle, 
  Plus, 
  BookOpen, 
  ClipboardList, 
  Search, 
  ChevronRight, 
  LogOut, 
  Bell, 
  Home,
  FileText,
  Upload,
  Clock,
  ArrowRight,
  Edit,
  Camera,
  Settings,
  Palette,
  Moon,
  Sun,
  User,
  MoreVertical,
  Trash2,
  Info,
  PenTool
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { dataService } from '../services/dataService';
import { Student, AttendanceRecord, Homework, LeaveRequest, Attachment } from '../types';
import { cn } from '../lib/utils';
import { format, isSameDay } from 'date-fns';
import { useLanguage } from '../context/LanguageContext';
import { motion, AnimatePresence } from 'motion/react';
import { ImageEditor } from '../components/ImageEditor';

export default function TeacherPortal() {
  const { profile, logout, updateProfile } = useAuth();
  const { t } = useLanguage();
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<Record<string, 'present' | 'absent'>>({});
  const [isAttendanceSubmitted, setIsAttendanceSubmitted] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [homeworks, setHomeworks] = useState<Homework[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [allAttendance, setAllAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'home' | 'attendance' | 'homework' | 'students' | 'leaves' | 'settings'>('home');
  const [searchTerm, setSearchTerm] = useState('');
  const [showHomeworkModal, setShowHomeworkModal] = useState(false);
  const [showViewsModal, setShowViewsModal] = useState(false);
  const [selectedHomeworkViews, setSelectedHomeworkViews] = useState<{ student_id: string; student_name: string; viewed_at: any }[]>([]);
  const [viewsLoading, setViewsLoading] = useState(false);
  const [editingHomeworkId, setEditingHomeworkId] = useState<string | null>(null);
  const [editingImageUrl, setEditingImageUrl] = useState<string | null>(null);
  const [editingImageIndex, setEditingImageIndex] = useState<number | null>(null);
  const [homeworkMenuOpen, setHomeworkMenuOpen] = useState<string | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('teacher_theme') as 'light' | 'dark') || 'light';
  });
  const [hwFormData, setHwFormData] = useState<{
    title: string;
    description: string;
    subject: string;
    due_date: string;
    attachments: (string | Attachment)[];
  }>({
    title: '',
    description: '',
    subject: '',
    due_date: format(new Date(), 'yyyy-MM-dd'),
    attachments: []
  });
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [profileFormData, setProfileFormData] = useState({
    name: profile?.name || '',
    avatar_url: profile?.avatar_url || ''
  });

  const [selectedLeave, setSelectedLeave] = useState<LeaveRequest | null>(null);
  const [leaveRemarks, setLeaveRemarks] = useState('');
  const [processingLeave, setProcessingLeave] = useState(false);
  const [dismissedNotifHash, setDismissedNotifHash] = useState<string | null>(localStorage.getItem('teacher_notif_dismissed_hash'));

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (e.g., max 5MB before compression)
      if (file.size > 5 * 1024 * 1024) {
        alert("File is too large. Please select an image under 5MB.");
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.src = reader.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 400;
          const MAX_HEIGHT = 400;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          // Compress to JPEG with 0.7 quality
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
          setProfileFormData({ ...profileFormData, avatar_url: compressedBase64 });
        };
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    if (profile) {
      loadData();
    }
  }, [profile]);

  useEffect(() => {
    if (profile && !showProfileModal) {
      setProfileFormData({
        name: profile.name,
        avatar_url: profile.avatar_url || ''
      });
    }
  }, [profile, showProfileModal]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setSubmitting(true);
    try {
      await dataService.updateUserProfile(profile.uid, profileFormData);
      updateProfile(profileFormData);
      setShowProfileModal(false);
      alert("Profile updated successfully!");
    } catch (error) {
      console.error("Error updating profile:", error);
      alert("Failed to update profile. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    localStorage.setItem('teacher_theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const handleHomeworkFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // Increased limit for raw photos before crop/edit
        alert("File is too large. Max size is 5MB.");
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        
        if (file.type.startsWith('image/')) {
          setEditingImageUrl(base64);
          setEditingImageIndex(null); // Indicates it's a new upload
        } else {
          const newAttachment: Attachment = {
            url: base64,
            name: file.name,
            type: 'pdf'
          };
          setHwFormData(prev => ({ ...prev, attachments: [...prev.attachments, newAttachment] }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveEditedImage = (editedImage: string) => {
    const newAttachment: Attachment = {
      url: editedImage,
      name: `edited_image_${Date.now()}.jpg`,
      type: 'image'
    };
    
    if (editingImageIndex !== null) {
      // Editing existing attachment
      const newAttachments = [...hwFormData.attachments];
      newAttachments[editingImageIndex] = newAttachment;
      setHwFormData(prev => ({ ...prev, attachments: newAttachments }));
    } else {
      // New upload
      setHwFormData(prev => ({ ...prev, attachments: [...prev.attachments, newAttachment] }));
    }
    setEditingImageUrl(null);
    setEditingImageIndex(null);
  };

  const removeAttachment = (index: number) => {
    setHwFormData(prev => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== index)
    }));
  };

  const loadData = async (retries = 0) => {
    if (!profile) return;
    const today = format(new Date(), 'yyyy-MM-dd');
    setLoading(true);
    try {
      const [sData, hData, todayAttn, lData, allAttn] = await Promise.all([
        dataService.getStudents(profile.school_id),
        dataService.getHomework(profile.school_id, profile.class_assigned, profile.section_assigned),
        dataService.getAttendanceByClassAndDate(profile.school_id, profile.class_assigned, today),
        dataService.getLeaveRequestsBySchool(profile.school_id),
        dataService.getAttendance(profile.school_id) // This currently limit 100, but is a start
      ]);
      
      const filteredStudents = sData.filter(s => 
        s.class === profile.class_assigned && 
        s.section === profile.section_assigned
      );
      
      setStudents(filteredStudents);
      setHomeworks(hData);
      setAllAttendance(allAttn);

      // Filter leave requests for students in the teacher's class
      const studentIdsInClass = new Set(filteredStudents.map(s => s.id));
      const filteredLeaves = lData.filter(l => studentIdsInClass.has(l.student_id));
      setLeaveRequests(filteredLeaves);
      
      if (todayAttn.length > 0) {
        setIsAttendanceSubmitted(true);
        const savedAttendance: Record<string, 'present' | 'absent'> = {};
        todayAttn.forEach(a => {
          savedAttendance[a.student_id] = a.status;
        });
        setAttendance(savedAttendance);
      } else {
        setIsAttendanceSubmitted(false);
        // Initialize attendance with 'present' by default
        const initialAttendance: Record<string, 'present' | 'absent'> = {};
        filteredStudents.forEach(s => {
          initialAttendance[s.id] = 'present';
        });
        setAttendance(initialAttendance);
      }
    } catch (error: any) {
      console.error("Error loading teacher data:", error);
      // Retry if it's a permission error that might be due to replication lag
      if (retries < 2 && (error.message?.includes('permission') || error.message?.includes('insufficient'))) {
        console.log(`Retrying data load... attempt ${retries + 1}`);
        await new Promise(r => setTimeout(r, 1000));
        return loadData(retries + 1);
      }
    } finally {
      if (retries === 0 || retries >= 2) {
        setLoading(false);
      }
    }
  };

  const handleMarkAttendance = async () => {
    if (!profile) return;
    setLoading(true);
    const date = format(new Date(), 'yyyy-MM-dd');
    try {
      await Promise.all(
        Object.entries(attendance).map(([studentId, status]) => 
          dataService.markAttendance(profile.school_id, {
            student_id: studentId,
            date,
            status: status as 'present' | 'absent',
            marked_by: profile.name,
            school_id: profile.school_id
          })
        )
      );
      alert('Attendance marked successfully!');
      setActiveTab('home');
    } catch (error) {
      console.error("Error marking attendance:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitAttendance = async () => {
    if (!profile) return;
    setSubmitting(true);
    const today = format(new Date(), 'yyyy-MM-dd');
    
    const records: Omit<AttendanceRecord, 'id'>[] = students.map(s => ({
      student_id: s.id,
      school_id: profile.school_id,
      class: profile.class_assigned,
      section: profile.section_assigned,
      status: attendance[s.id] || 'present',
      date: today
    }));

    try {
      await dataService.saveAttendanceBatch(profile.school_id, records);
      setIsAttendanceSubmitted(true);
      setIsEditMode(false);
      // Optional: show a success toast or message
    } catch (error) {
      console.error("Error saving attendance:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handlePostHomework = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setSubmitting(true);
    try {
      if (editingHomeworkId) {
        await dataService.updateHomework(profile.school_id, editingHomeworkId, hwFormData);
      } else {
        await dataService.addHomework(profile.school_id, {
          ...hwFormData,
          class: profile.class_assigned!,
          section: profile.section_assigned!,
          teacher_id: profile.uid,
          school_id: profile.school_id
        });
      }
      setShowHomeworkModal(false);
      setEditingHomeworkId(null);
      setHwFormData({ title: '', description: '', subject: '', due_date: format(new Date(), 'yyyy-MM-dd'), attachments: [] });
      loadData();
    } catch (error) {
       console.error("Error posting/updating homework:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const openEditHomework = (hw: Homework) => {
    setHwFormData({
      title: hw.title,
      description: hw.description,
      subject: hw.subject,
      due_date: hw.due_date || format(new Date(), 'yyyy-MM-dd'),
      attachments: hw.attachments || []
    });
    setEditingHomeworkId(hw.id);
    setShowHomeworkModal(true);
    setHomeworkMenuOpen(null);
  };

  const handleDeleteHomework = async (hwId: string) => {
    if (!profile || !window.confirm("Are you sure you want to delete this homework?")) return;
    try {
      await dataService.deleteHomework(profile.school_id, hwId);
      loadData();
    } catch (error) {
      console.error("Error deleting homework:", error);
    }
  };

  const handleShowViews = async (hwId: string) => {
    if (!profile) return;
    setViewsLoading(true);
    setShowViewsModal(true);
    setHomeworkMenuOpen(null);
    try {
      const views = await dataService.getHomeworkViews(profile.school_id, hwId);
      setSelectedHomeworkViews(views);
    } catch (error) {
      console.error("Error fetching views:", error);
    } finally {
      setViewsLoading(false);
    }
  };

  const handleProcessLeave = async (status: 'approved' | 'rejected') => {
    if (!profile || !selectedLeave) return;
    setProcessingLeave(true);
    try {
      await dataService.updateLeaveRequestStatus(profile.school_id, selectedLeave.id, {
        status,
        remarks: leaveRemarks,
        processed_by: profile.name
      });
      setSelectedLeave(null);
      setLeaveRemarks('');
      loadData();
    } catch (error) {
      console.error("Error processing leave:", error);
    } finally {
      setProcessingLeave(false);
    }
  };

  if (loading && students.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 border-4 border-brand-indigo/20 border-t-brand-indigo rounded-full animate-spin"></div>
          <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Loading Teacher App...</p>
        </div>
      </div>
    );
  }

  const absentCount = Object.values(attendance).filter(s => s === 'absent').length;

  return (
    <div className={cn("min-h-screen bg-[#F0F4F8] pb-32 transition-colors duration-300", theme === 'dark' && "bg-[#121212]")}>
      {/* Mobile Top Header */}
      <div className={cn("bg-[#2B2D42] text-white p-6 pb-12 rounded-b-[3rem] shadow-xl transition-colors duration-300", theme === 'dark' && "bg-[#1E1E1E]")}>
        <div className="lg:max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
             <div>
                <h1 className="text-xl font-bold tracking-tight">Hi, {profile?.name.split(' ')[0]}</h1>
                <p className={cn("text-slate-400 text-[10px] font-bold uppercase tracking-widest", theme === 'dark' && "text-slate-500")}>{t('incharge_class')} {profile?.class_assigned}{profile?.section_assigned}</p>
             </div>
          </div>
          <button 
            onClick={() => setActiveTab('settings')}
            className="h-12 w-12 rounded-2xl border-2 border-white/20 overflow-hidden shadow-lg hover:scale-105 transition-transform"
          >
             <img 
               src={profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.name}`} 
               className="h-full w-full object-cover bg-brand-indigo" 
               alt="avatar" 
             />
          </button>
        </div>
      </div>

      <div className="lg:max-w-md mx-auto px-4 -mt-6 space-y-6">
        {/* Notification Banner */}
        {(() => {
          const pendingLeavesCount = leaveRequests.filter(l => l.status === 'pending').length;
          const currentHash = `${pendingLeavesCount}`;

          if (pendingLeavesCount === 0 || dismissedNotifHash === currentHash) return null;

          const handleDismiss = () => {
            localStorage.setItem('teacher_notif_dismissed_hash', currentHash);
            setDismissedNotifHash(currentHash);
          };

          return (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn("bg-white p-4 rounded-[2.5rem] shadow-xl flex items-center justify-between border border-white/50 group transition-colors duration-300", theme === 'dark' && "bg-[#1E1E1E] border-white/5")}
            >
               <div className="flex items-center gap-4">
                  <div className="h-10 w-10 bg-brand-coral rounded-full flex items-center justify-center shadow-md">
                     <Bell className="h-5 w-5 text-white" />
                  </div>
                  <div>
                     <p className={cn("text-sm font-black text-[#2B2D42]", theme === 'dark' && "text-white")}>{pendingLeavesCount} New Leave Request{pendingLeavesCount > 1 ? 's' : ''}</p>
                     <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Awaiting your approval</p>
                  </div>
               </div>
               <div className="flex gap-2">
                 <button 
                  onClick={() => setActiveTab('leaves')}
                  className="px-5 py-2 bg-[#FDC500] text-[#2B2D42] rounded-full text-xs font-black shadow-md hover:scale-105 transition-all"
                 >
                    View
                 </button>
                 <button 
                  onClick={handleDismiss}
                  className="p-2 text-slate-300 hover:text-slate-500 transition-colors"
                 >
                   <XCircle className="h-5 w-5" />
                 </button>
               </div>
            </motion.div>
          );
        })()}

        {activeTab === 'home' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            {/* Class Stats Summary */}
            <div className={cn("bg-white p-6 rounded-[2.5rem] shadow-lg border border-white flex justify-between items-center relative overflow-hidden transition-colors duration-300", theme === 'dark' && "bg-[#1E1E1E] border-white/5")}>
               <div className="relative z-10">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{t('assigned_class')}</p>
                  <h2 className={cn("text-3xl font-black text-[#2B2D42]", theme === 'dark' && "text-white")}>{profile?.class_assigned} - {profile?.section_assigned}</h2>
                  <div className="mt-3 flex items-center gap-3">
                     <span className={cn("flex items-center gap-1 text-xs font-bold text-brand-indigo bg-brand-indigo/10 px-3 py-1 rounded-full", theme === 'dark' && "bg-brand-indigo/20 text-brand-indigo")}>
                        <Users className="h-3 w-3" /> {students.length} {t('students')}
                     </span>
                  </div>
               </div>
               <div className="h-16 w-16 bg-brand-indigo/10 rounded-3xl flex items-center justify-center relative z-10 shrink-0">
                  <BookOpen className="h-8 w-8 text-brand-indigo" />
               </div>
               <div className="absolute top-0 right-0 h-32 w-32 bg-brand-indigo/5 rounded-full blur-3xl translate-x-10 -translate-y-10"></div>
            </div>

            {/* Quick Insights Card */}
            <div className="grid grid-cols-2 gap-4">
               <div className={cn("bg-emerald-500 dark:bg-emerald-600/20 dark:border dark:border-emerald-500/20 p-6 rounded-[2rem] text-white shadow-xl shadow-emerald-500/20 relative overflow-hidden group transition-colors duration-300")}>
                  <div className="relative z-10">
                     <p className="text-[10px] font-bold uppercase tracking-widest opacity-80 mb-1">{t('presents')}</p>
                     <p className="text-3xl font-black">{students.length - absentCount}</p>
                  </div>
                  <CheckCircle className="absolute -bottom-4 -right-4 h-16 w-16 opacity-10 group-hover:scale-110 transition-transform" />
               </div>
               <div className={cn("bg-rose-500 dark:bg-rose-600/20 dark:border dark:border-rose-500/20 p-6 rounded-[2rem] text-white shadow-xl shadow-rose-500/20 relative overflow-hidden group transition-colors duration-300")}>
                  <div className="relative z-10">
                     <p className="text-[10px] font-bold uppercase tracking-widest opacity-80 mb-1">{t('absents')}</p>
                     <p className="text-3xl font-black">{absentCount}</p>
                  </div>
                  <XCircle className="absolute -bottom-4 -right-4 h-16 w-16 opacity-10 group-hover:scale-110 transition-transform" />
               </div>
            </div>

            {/* Main Action Buttons */}
            <div className="space-y-4">
               <button 
                 onClick={() => setActiveTab('attendance')}
                 className={cn("w-full bg-white p-6 rounded-[2.5rem] shadow-lg border border-white flex items-center gap-6 group hover:scale-[1.02] transition-all text-left duration-300", theme === 'dark' && "bg-[#1E1E1E] border-white/5")}
               >
                  <div className="h-16 w-16 bg-brand-indigo rounded-[1.25rem] flex items-center justify-center shrink-0 shadow-lg shadow-brand-indigo/20">
                     <ClipboardList className="h-8 w-8 text-white" />
                  </div>
                  <div className="flex-1">
                     <h3 className={cn("text-lg font-bold text-[#2B2D42]", theme === 'dark' && "text-white")}>{t('mark_attendance')}</h3>
                     <p className="text-xs text-slate-400 font-medium">{t('daily_attendance_registry')}</p>
                  </div>
                  <div className={cn("h-10 w-10 border border-slate-100 rounded-full flex items-center justify-center text-slate-300 group-hover:text-brand-indigo group-hover:border-brand-indigo transition-colors", theme === 'dark' && "border-white/10")}>
                     <ChevronRight className="h-5 w-5" />
                  </div>
               </button>

               <button 
                 onClick={() => setActiveTab('homework')}
                 className={cn("w-full bg-white p-6 rounded-[2.5rem] shadow-lg border border-white flex items-center gap-6 group hover:scale-[1.02] transition-all text-left duration-300", theme === 'dark' && "bg-[#1E1E1E] border-white/5")}
               >
                  <div className="h-16 w-16 bg-brand-coral rounded-[1.25rem] flex items-center justify-center shrink-0 shadow-lg shadow-brand-coral/20">
                     <FileText className="h-8 w-8 text-white" />
                  </div>
                  <div className="flex-1">
                     <h3 className={cn("text-lg font-bold text-[#2B2D42]", theme === 'dark' && "text-white")}>{t('post_homework')}</h3>
                     <p className="text-xs text-slate-400 font-medium">Upload assignments & tasks</p>
                  </div>
                  <div className={cn("h-10 w-10 border border-slate-100 rounded-full flex items-center justify-center text-slate-300 group-hover:text-brand-coral group-hover:border-brand-coral transition-colors", theme === 'dark' && "border-white/10")}>
                     <ChevronRight className="h-5 w-5" />
                  </div>
               </button>

               <button 
                 onClick={() => setActiveTab('students')}
                 className={cn("w-full bg-white p-6 rounded-[2.5rem] shadow-lg border border-white flex items-center gap-6 group hover:scale-[1.02] transition-all text-left duration-300", theme === 'dark' && "bg-[#1E1E1E] border-white/5")}
               >
                  <div className="h-16 w-16 bg-[#FFC300] rounded-[1.25rem] flex items-center justify-center shrink-0 shadow-lg shadow-amber-500/20">
                     <Users className="h-8 w-8 text-white" />
                  </div>
                  <div className="flex-1">
                     <h3 className={cn("text-lg font-bold text-[#2B2D42]", theme === 'dark' && "text-white")}>{t('student_list')}</h3>
                     <p className="text-xs text-slate-400 font-medium">View detailed profiles</p>
                  </div>
                  <div className={cn("h-10 w-10 border border-slate-100 rounded-full flex items-center justify-center text-slate-300 group-hover:text-amber-500 group-hover:border-amber-500 transition-colors", theme === 'dark' && "border-white/10")}>
                     <ChevronRight className="h-5 w-5" />
                  </div>
               </button>

               <button 
                 onClick={() => setActiveTab('leaves')}
                 className={cn("w-full bg-white p-6 rounded-[2.5rem] shadow-lg border border-white flex items-center gap-6 group hover:scale-[1.02] transition-all text-left duration-300", theme === 'dark' && "bg-[#1E1E1E] border-white/5")}
               >
                  <div className="h-16 w-16 bg-emerald-500 rounded-[1.25rem] flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/20">
                     <Clock className="h-8 w-8 text-white" />
                  </div>
                  <div className="flex-1">
                     <h3 className={cn("text-lg font-bold text-[#2B2D42]", theme === 'dark' && "text-white")}>{t('leave_requests')}</h3>
                     <p className="text-xs text-slate-400 font-medium">Approve or Reject leaves</p>
                  </div>
                  <div className={cn("h-10 w-10 border border-slate-100 rounded-full flex items-center justify-center text-slate-300 group-hover:text-emerald-500 group-hover:border-emerald-500 transition-colors", theme === 'dark' && "border-white/10")}>
                     <ChevronRight className="h-5 w-5" />
                  </div>
               </button>
            </div>
          </motion.div>
        )}

        {activeTab === 'leaves' && (
           <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <div className={cn("flex items-center justify-between sticky top-0 bg-[#F0F4F8] py-4 z-20 transition-colors duration-300", theme === 'dark' && "bg-[#121212]")}>
                 <button onClick={() => setActiveTab('home')} className="text-sm font-bold text-slate-400 flex items-center gap-1">
                    <Home className="h-4 w-4" /> {t('back')}
                 </button>
              </div>

              <div className="space-y-4">
                 {leaveRequests.length === 0 ? (
                   <div className="text-center py-20 text-slate-400 font-bold italic">No leave requests found.</div>
                 ) : (
                   leaveRequests.map(leave => {
                     const student = students.find(s => s.id === leave.student_id);
                     return (
                       <div key={leave.id} className={cn("bg-white p-6 rounded-[2.5rem] shadow-sm border border-white group transition-colors duration-300", theme === 'dark' && "bg-[#1E1E1E] border-white/5")}>
                          <div className="flex justify-between items-start mb-4">
                             <div className="flex items-center gap-3">
                                <div className={cn("h-10 w-10 rounded-full overflow-hidden shrink-0 border-2 border-slate-50", theme === 'dark' && "border-white/10")}>
                                   <img src={student?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${student?.name || 'student'}`} className="h-full w-full object-cover" alt="student" />
                                </div>
                                <div>
                                   <p className={cn("text-sm font-bold text-[#2B2D42]", theme === 'dark' && "text-white")}>{student?.name || 'Unknown Student'}</p>
                                   <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{leave.start_date === leave.end_date ? format(new Date(leave.start_date), 'MMM dd') : `${format(new Date(leave.start_date), 'MMM dd')} - ${format(new Date(leave.end_date), 'MMM dd')}`}</p>
                                </div>
                             </div>
                             <div className={cn(
                               "px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest",
                               leave.status === 'pending' ? "bg-amber-500/10 text-amber-500" : 
                               leave.status === 'approved' ? "bg-emerald-500/10 text-emerald-500" : 
                               "bg-rose-500/10 text-rose-500"
                             )}>
                                {leave.status}
                             </div>
                          </div>
                          <p className={cn("text-xs text-[#2B2D42] font-medium leading-relaxed mb-4 bg-slate-50 p-4 rounded-2xl border border-slate-100 italic transition-colors", theme === 'dark' && "bg-white/5 text-slate-300 border-white/5")}>
                             "{leave.reason}"
                          </p>
                          
                          {leave.status === 'pending' ? (
                            <button 
                              onClick={() => setSelectedLeave(leave)}
                              className="w-full py-3 bg-brand-indigo text-white rounded-xl text-xs font-black shadow-lg shadow-brand-indigo/20 flex items-center justify-center gap-2"
                            >
                               {t('review_application')}
                            </button>
                          ) : (
                            <div className={cn("pt-2 border-t border-slate-100", theme === 'dark' && "border-white/10")}>
                               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Teacher Remarks</p>
                               <p className={cn("text-xs text-[#2B2D42] font-bold", theme === 'dark' && "text-white")}>{leave.remarks || 'No remarks provided.'}</p>
                            </div>
                          )}
                       </div>
                     );
                   })
                 )}
              </div>
           </motion.div>
        )}

        {activeTab === 'attendance' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
             <div className={cn("flex items-center justify-between sticky top-0 bg-[#F0F4F8] py-4 z-20 transition-colors duration-300", theme === 'dark' && "bg-[#121212]")}>
                <button onClick={() => setActiveTab('home')} className="text-sm font-bold text-slate-400 flex items-center gap-1">
                   <Home className="h-4 w-4" /> {t('back_to_dashboard')}
                </button>
                <div className="flex gap-3 items-center">
                   {isAttendanceSubmitted && !isEditMode && (
                     <button 
                       onClick={() => setIsEditMode(true)}
                       className={cn("px-4 py-2 bg-white text-[#2B2D42] rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm border border-slate-50 transition-colors", theme === 'dark' && "bg-white/5 text-white border-white/10")}
                     >
                        <Edit className="h-4 w-4" /> Edit
                     </button>
                   )}
                   <div className="text-right">
                      <p className={cn("text-xs font-black text-[#2B2D42]", theme === 'dark' && "text-white")}>{format(new Date(), 'EEEE, do MMM')}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{students.length} Students</p>
                   </div>
                </div>
             </div>

             <div className={cn("bg-white rounded-[2.5rem] shadow-lg border border-white overflow-hidden divide-y divide-slate-50 relative transition-colors duration-300", theme === 'dark' && "bg-[#1E1E1E] border-white/5 divide-white/5")}>
                {isAttendanceSubmitted && !isEditMode && (
                  <div className={cn("absolute inset-0 bg-white/40 backdrop-blur-[1px] z-10 flex items-center justify-center pointer-events-none", theme === 'dark' && "bg-black/40")}>
                     <div className="bg-emerald-500 text-white px-6 py-2 rounded-full font-black text-xs uppercase shadow-xl flex items-center gap-2">
                        <CheckCircle className="h-4 w-4" /> Attendance Recorded
                     </div>
                </div>
                )}
                
                {students.map((stu, i) => (
                  <div key={stu.id} className="p-5 flex items-center justify-between group">
                     <div className="flex items-center gap-4">
                        <div className={cn("h-12 w-12 rounded-2xl bg-slate-100 flex items-center justify-center font-black text-[#2B2D42] shadow-inner transition-colors", theme === 'dark' && "bg-black/20 text-white shadow-none")}>
                           {stu.roll_no || i + 1}
                        </div>
                        <div>
                           <p className={cn("text-sm font-bold text-[#2B2D42]", theme === 'dark' && "text-white")}>{stu.name}</p>
                           <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">ID: {stu.custom_id}</p>
                        </div>
                     </div>
                     <div className={cn("flex bg-slate-50 p-1.5 rounded-2xl border border-slate-100 transition-colors", theme === 'dark' && "bg-white/5 border-white/10")}>
                        <button 
                          disabled={isAttendanceSubmitted && !isEditMode}
                          onClick={() => setAttendance({...attendance, [stu.id]: 'present'})}
                          className={cn(
                            "px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all",
                            attendance[stu.id] === 'present' ? "bg-emerald-500 text-white shadow-md" : "text-slate-400",
                            isAttendanceSubmitted && !isEditMode && "cursor-not-allowed"
                          )}
                        >
                           {t('present')}
                        </button>
                        <button 
                          disabled={isAttendanceSubmitted && !isEditMode}
                          onClick={() => setAttendance({...attendance, [stu.id]: 'absent'})}
                          className={cn(
                            "px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ml-1",
                            attendance[stu.id] === 'absent' ? "bg-rose-500 text-white shadow-md" : "text-slate-400",
                            isAttendanceSubmitted && !isEditMode && "cursor-not-allowed"
                          )}
                        >
                           {t('absent')}
                        </button>
                     </div>
                  </div>
                ))}
             </div>

             {(!isAttendanceSubmitted || isEditMode) && (
               <button 
                 onClick={handleSubmitAttendance}
                 disabled={submitting}
                 className="w-full bg-[#2B2D42] py-6 rounded-[2rem] text-white font-black text-lg shadow-2xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
               >
                  {submitting ? `${t('loading')}...` : isEditMode ? t('update_attendance') : t('confirm_attendance')} 
                  {!submitting && <ArrowRight className="h-5 w-5" />}
               </button>
             )}
          </motion.div>
        )}

        {activeTab === 'homework' && (
           <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <div className={cn("flex items-center justify-between sticky top-0 bg-[#F0F4F8] py-4 z-20 transition-colors duration-300", theme === 'dark' && "bg-[#121212]")}>
                <button onClick={() => setActiveTab('home')} className="text-sm font-bold text-slate-400 flex items-center gap-1">
                   <Home className="h-4 w-4" /> Back
                </button>
                <button 
                  onClick={() => {
                    setEditingHomeworkId(null);
                    setHwFormData({ title: '', description: '', subject: '', due_date: format(new Date(), 'yyyy-MM-dd'), attachments: [] });
                    setShowHomeworkModal(true);
                  }}
                  className="bg-brand-indigo text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-lg shadow-brand-indigo/20 flex items-center gap-2"
                >
                   <Plus className="h-4 w-4" /> {t('post_new')}
                </button>
              </div>

              <div className="space-y-4">
                 {homeworks.length === 0 ? (
                   <div className="text-center py-20 text-slate-400 font-bold italic">No homeworks posted yet.</div>
                 ) : homeworks.map(hw => (
                   <div key={hw.id} className={cn("bg-white p-6 rounded-[2.5rem] shadow-sm border border-white group transition-colors duration-300 relative", theme === 'dark' && "bg-[#1E1E1E] border-white/5")}>
                      <div className="flex justify-between items-start mb-4">
                         <div className={cn("bg-brand-indigo/10 text-brand-indigo px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors", theme === 'dark' && "bg-brand-indigo/20")}>{hw.subject}</div>
                         <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400">
                               <Clock className="h-3 w-3" /> Due {format(new Date(hw.due_date), 'MMM dd')}
                            </div>
                            <div className="relative">
                               <button 
                                 onClick={() => setHomeworkMenuOpen(homeworkMenuOpen === hw.id ? null : hw.id)}
                                 className={cn("p-1.5 hover:bg-slate-100 rounded-lg transition-colors", theme === 'dark' && "hover:bg-white/5")}
                               >
                                  <MoreVertical className="h-4 w-4 text-slate-400" />
                               </button>
                               
                               <AnimatePresence>
                                  {homeworkMenuOpen === hw.id && (
                                     <>
                                        <div className="fixed inset-0 z-10" onClick={() => setHomeworkMenuOpen(null)} />
                                         <motion.div 
                                           initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                           animate={{ opacity: 1, scale: 1, y: 0 }}
                                           exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                           className={cn(
                                             "absolute right-0 mt-2 w-40 bg-white rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.1)] border border-slate-100 z-20 py-2 overflow-hidden",
                                             theme === 'dark' && "bg-[#252525] border-white/10 shadow-black/40"
                                           )}
                                        >
                                           <button 
                                              onClick={() => handleShowViews(hw.id)}
                                              className={cn("w-full px-4 py-3 text-left text-xs font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-3 transition-colors", theme === 'dark' && "text-slate-300 hover:bg-white/5")}
                                           >
                                              <Info className="h-4 w-4" /> Views Info
                                           </button>
                                           <button 
                                              onClick={() => openEditHomework(hw)}
                                              className={cn("w-full px-4 py-3 text-left text-xs font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-3 transition-colors", theme === 'dark' && "text-slate-300 hover:bg-white/5")}
                                           >
                                              <Edit className="h-4 w-4" /> Edit Post
                                           </button>
                                           <button 
                                              onClick={() => {
                                                handleDeleteHomework(hw.id);
                                                setHomeworkMenuOpen(null);
                                              }}
                                              className="w-full px-4 py-3 text-left text-xs font-bold text-rose-500 hover:bg-rose-50 flex items-center gap-3 transition-colors"
                                           >
                                              <Trash2 className="h-4 w-4" /> Delete
                                           </button>
                                        </motion.div>
                                     </>
                                  )}
                               </AnimatePresence>
                            </div>
                         </div>
                      </div>
                      <h4 className={cn("text-lg font-bold text-[#2B2D42] mb-2", theme === 'dark' && "text-white")}>{hw.title}</h4>
                      <p className={cn("text-xs text-slate-500 line-clamp-3 leading-relaxed", theme === 'dark' && "text-slate-400")}>{hw.description}</p>
                   </div>
                 ))}
              </div>
           </motion.div>
        )}

         {activeTab === 'students' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
               <div className={cn("flex items-center justify-between sticky top-0 bg-[#F0F4F8] py-4 z-20 transition-colors duration-300", theme === 'dark' && "bg-[#121212]")}>
                  <button onClick={() => setActiveTab('home')} className="text-sm font-bold text-slate-400 flex items-center gap-1">
                     <Home className="h-4 w-4" /> Back
                  </button>
               </div>

               <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300" />
                  <input 
                    type="text"
                    placeholder="Search student by name or id..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className={cn(
                      "w-full pl-14 pr-6 py-5 bg-white border-transparent focus:ring-2 focus:ring-brand-indigo/20 rounded-[2rem] shadow-lg text-sm font-medium transition-all",
                      theme === 'dark' && "bg-[#1E1E1E] border-white/5 text-white"
                    )}
                  />
               </div>

               <div className="grid grid-cols-1 gap-4">
                  {students.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase())).map(stu => {
                    const studentRecords = allAttendance.filter(a => a.student_id === stu.id);
                    const percentage = studentRecords.length > 0 
                      ? Math.round((studentRecords.filter(a => a.status === 'present').length / studentRecords.length) * 100) 
                      : 0;

                    return (
                      <div key={stu.id} className={cn("bg-white p-6 rounded-[2.5rem] shadow-sm border border-white flex items-center justify-between group transition-colors duration-300", theme === 'dark' && "bg-[#1E1E1E] border-white/5")}>
                         <div className="flex items-center gap-4">
                            <div className={cn("h-16 w-16 rounded-full border-4 border-slate-50 overflow-hidden shrink-0 group-hover:scale-110 transition-transform", theme === 'dark' && "border-white/10")}>
                               <img src={stu.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${stu.name}`} className="h-full w-full bg-slate-50 object-cover" alt="Avatar" />
                            </div>
                            <div>
                               <h4 className={cn("text-base font-black text-[#2B2D42]", theme === 'dark' && "text-white")}>{stu.name}</h4>
                               <div className="flex items-center gap-3 mt-1">
                                  <p className="text-[10px] text-slate-400 font-bold italic uppercase tracking-tight">Roll: {stu.roll_no}</p>
                                  <span className="h-1 w-1 bg-slate-200 rounded-full" />
                                  <p className={cn(
                                    "text-[10px] font-bold uppercase tracking-tight",
                                    percentage >= 75 ? "text-emerald-500" : "text-rose-500"
                                  )}>{percentage}% Attnd.</p>
                               </div>
                            </div>
                         </div>
                         <button className={cn("h-12 w-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-300 group-hover:text-brand-indigo group-hover:bg-brand-indigo/10 transition-all border border-slate-100", theme === 'dark' && "bg-white/5 border-white/10")}>
                            <ChevronRight className="h-6 w-6" />
                         </button>
                      </div>
                    );
                  })}
               </div>
            </motion.div>
         )}

         {activeTab === 'settings' && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6">
               <div className="flex items-center justify-between sticky top-0 bg-inherit py-4 z-20">
                  <button onClick={() => setActiveTab('home')} className="text-sm font-bold text-slate-400 flex items-center gap-1">
                     <Home className="h-4 w-4" /> {t('back_to_dashboard')}
                  </button>
               </div>

               {/* Profile Appearance Section */}
               <div className={cn("bg-white p-8 rounded-[3rem] shadow-lg border border-white transition-colors duration-300", theme === 'dark' && "bg-[#1E1E1E] border-white/5")}>
                 <div className="flex flex-col items-center mb-8">
                    <div className="relative group">
                       <div className="h-32 w-32 rounded-[2.5rem] border-4 border-slate-50 dark:border-white/10 overflow-hidden shadow-2xl transition-all group-hover:scale-105">
                          <img 
                            src={profileFormData.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profileFormData.name}`} 
                            className="h-full w-full object-cover bg-brand-indigo" 
                            alt="avatar preview" 
                          />
                       </div>
                       <label className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-[2.5rem] cursor-pointer">
                          <Camera className="h-8 w-8 text-white shadow-sm" />
                          <input 
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            onChange={handleImageUpload}
                          />
                       </label>
                    </div>
                    <p className={cn("mt-4 text-[10px] font-black text-brand-indigo uppercase tracking-[0.2em]", theme === 'dark' && "text-brand-indigo/80")}>Tap photo to update</p>
                 </div>

                 <form onSubmit={handleUpdateProfile} className="space-y-6">
                    <div className="space-y-3">
                       <label className={cn("text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 transition-colors", theme === 'dark' && "text-slate-500")}>Your Full Name</label>
                       <div className="relative">
                          <User className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300" />
                          <input 
                            required
                            type="text"
                            value={profileFormData.name}
                            onChange={e => setProfileFormData({...profileFormData, name: e.target.value})}
                            className={cn(
                              "w-full pl-16 pr-6 py-5 bg-slate-50 rounded-[2rem] border-transparent focus:ring-4 focus:ring-brand-indigo/10 text-sm font-bold transition-all",
                              theme === 'dark' && "bg-white/5 text-white"
                            )}
                          />
                       </div>
                    </div>

                    <button 
                      type="submit" 
                      disabled={submitting} 
                      className={cn(
                        "w-full py-5 bg-[#2B2D42] text-white rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-xl active:scale-95 transition-all disabled:opacity-50",
                        theme === 'dark' && "bg-brand-indigo shadow-brand-indigo/20"
                      )}
                    >
                       {submitting ? `${t('loading')}...` : t('save_profile_changes')}
                    </button>
                 </form>
               </div>

               {/* Theme & Extras */}
               <div className={cn("bg-white p-8 rounded-[3rem] shadow-lg border border-white transition-colors duration-300", theme === 'dark' && "bg-[#1E1E1E] border-white/5")}>
                  <div className="flex items-center gap-3 mb-8">
                     <div className="h-10 w-10 bg-brand-indigo/10 rounded-2xl flex items-center justify-center">
                        <Palette className="h-5 w-5 text-brand-indigo" />
                     </div>
                     <div>
                        <h4 className={cn("text-sm font-black text-[#2B2D42]", theme === 'dark' && "text-white")}>{t('app_appearance')}</h4>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Customize your view</p>
                     </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                     <button 
                       onClick={() => setTheme('light')}
                       className={cn(
                         "p-6 rounded-[2rem] border-2 transition-all flex flex-col items-center gap-3 group relative overflow-hidden",
                         theme === 'light' ? "border-brand-indigo bg-brand-indigo/5 shadow-inner" : "border-slate-50 bg-slate-50 text-slate-400"
                       )}
                     >
                        <Sun className={cn("h-6 w-6 transition-transform group-hover:rotate-12", theme === 'light' ? "text-brand-indigo" : "text-slate-300")} />
                        <span className="text-[10px] font-black uppercase tracking-widest">Light Mode</span>
                        {theme === 'light' && <div className="absolute top-2 right-2 h-2 w-2 rounded-full bg-brand-indigo" />}
                     </button>
                     <button 
                       onClick={() => setTheme('dark')}
                       className={cn(
                         "p-6 rounded-[2rem] border-2 transition-all flex flex-col items-center gap-3 group relative overflow-hidden",
                         theme === 'dark' ? "border-brand-indigo bg-brand-indigo/10 shadow-inner" : "border-slate-50 bg-slate-50 text-slate-400 dark:bg-white/5 dark:border-white/5"
                       )}
                     >
                        <Moon className={cn("h-6 w-6 transition-transform group-hover:-rotate-12", theme === 'dark' ? "text-brand-indigo" : "text-slate-300")} />
                        <span className="text-[10px] font-black uppercase tracking-widest">Dark Mode</span>
                        {theme === 'dark' && <div className="absolute top-2 right-2 h-2 w-2 rounded-full bg-brand-indigo" />}
                     </button>
                  </div>
               </div>

               {/* Danger Zone */}
               <div className="pt-4">
                  <button 
                    onClick={() => logout()}
                    className="w-full py-6 bg-rose-50 text-rose-500 rounded-[2.5rem] font-black text-xs uppercase tracking-[0.2em] shadow-sm border-2 border-rose-100 hover:bg-rose-500 hover:text-white hover:border-rose-500 transition-all active:scale-95 flex items-center justify-center gap-3 group"
                  >
                     <LogOut className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                     Sign Out Account
                  </button>
                  <p className="text-center mt-6 text-[10px] text-slate-400 font-bold uppercase tracking-widest opacity-50">App Version 2.0.4 (Stable)</p>
               </div>
            </motion.div>
         )}
      </div>

      {/* Tab Navigation */}
      <div className="fixed bottom-8 left-6 right-6 z-50">
         <div className="lg:max-w-md mx-auto bg-[#2B2D42] p-2 rounded-[2.5rem] shadow-2xl flex items-center justify-between relative border border-white/10">
            <button onClick={() => setActiveTab('home')} className={cn("flex-1 flex flex-col items-center gap-1 py-3 transition-all", activeTab === 'home' ? "bg-white text-brand-indigo rounded-[2rem] shadow-xl" : "text-slate-400")}>
               <Home className="h-6 w-6" />
               <span className="text-[9px] font-black uppercase tracking-tighter">Dash</span>
            </button>
            <button onClick={() => setActiveTab('attendance')} className={cn("flex-1 flex flex-col items-center gap-1 py-3 transition-all", activeTab === 'attendance' ? "bg-white text-brand-indigo rounded-[2rem] shadow-xl" : "text-slate-400")}>
               <ClipboardList className="h-6 w-6" />
               <span className="text-[9px] font-black uppercase tracking-tighter">Attn</span>
            </button>
            <button onClick={() => setActiveTab('homework')} className={cn("flex-1 flex flex-col items-center gap-1 py-3 transition-all", activeTab === 'homework' ? "bg-white text-brand-indigo rounded-[2rem] shadow-xl" : "text-slate-400")}>
               <FileText className="h-6 w-6" />
               <span className="text-[9px] font-black uppercase tracking-tighter">H.W</span>
            </button>
            <button onClick={() => setActiveTab('leaves')} className={cn("flex-1 flex flex-col items-center gap-1 py-3 transition-all", activeTab === 'leaves' ? "bg-white text-brand-indigo rounded-[2rem] shadow-xl" : "text-slate-400")}>
               <Clock className="h-6 w-6" />
               <span className="text-[9px] font-black uppercase tracking-tighter">Leaves</span>
            </button>
            <button onClick={() => setActiveTab('settings')} className={cn("flex-1 flex flex-col items-center gap-1 py-3 transition-all", activeTab === 'settings' ? "bg-white text-brand-indigo rounded-[2rem] shadow-xl" : "text-slate-400")}>
               <Settings className="h-6 w-6" />
               <span className="text-[9px] font-black uppercase tracking-tighter">Settings</span>
            </button>
         </div>
      </div>

      {/* Homework Modal */}
      {showHomeworkModal && (
         <div key="homework-modal" className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => {
              if (!loading) {
                setShowHomeworkModal(false);
                setEditingHomeworkId(null);
                setHwFormData({ title: '', description: '', subject: '', due_date: format(new Date(), 'yyyy-MM-dd'), attachments: [] });
              }
            }} />
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className={cn("bg-white rounded-[3rem] w-full max-w-sm relative z-10 p-8 shadow-2xl transition-colors duration-300", theme === 'dark' && "bg-[#1E1E1E]")}>
               <h3 className={cn("text-2xl font-black text-[#2B2D42] mb-6", theme === 'dark' && "text-white")}>{editingHomeworkId ? 'Edit Homework' : 'Create Homework'}</h3>
               <form onSubmit={handlePostHomework} className="space-y-4">
                  <div className="space-y-2">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Title</label>
                     <input 
                       required
                       type="text"
                       placeholder="e.g. Algebra Exercise 4.2"
                       value={hwFormData.title}
                       onChange={e => setHwFormData({...hwFormData, title: e.target.value})}
                       className={cn(
                         "w-full px-6 py-4 bg-slate-50 rounded-2xl border-transparent focus:ring-2 focus:ring-brand-indigo/20 text-sm font-bold transition-all",
                         theme === 'dark' && "bg-white/5 border-white/10 text-white"
                       )}
                     />
                  </div>
                  <div className="space-y-2">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Subject</label>
                     <input 
                       required
                       type="text"
                       placeholder="e.g. Mathematics"
                       value={hwFormData.subject}
                       onChange={e => setHwFormData({...hwFormData, subject: e.target.value})}
                       className={cn(
                         "w-full px-6 py-4 bg-slate-50 rounded-2xl border-transparent focus:ring-2 focus:ring-brand-indigo/20 text-sm font-bold transition-all",
                         theme === 'dark' && "bg-white/5 border-white/10 text-white"
                       )}
                     />
                  </div>
                  <div className="space-y-2">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Description</label>
                     <textarea 
                       required
                       rows={3}
                       placeholder="Instructions for students..."
                       value={hwFormData.description}
                       onChange={e => setHwFormData({...hwFormData, description: e.target.value})}
                       className={cn(
                         "w-full px-6 py-4 bg-slate-50 rounded-2xl border-transparent focus:ring-2 focus:ring-brand-indigo/20 text-sm font-bold transition-all resize-none",
                         theme === 'dark' && "bg-white/5 border-white/10 text-white"
                       )}
                     />
                  </div>
                  <div className="space-y-2">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Due Date</label>
                     <input 
                       required
                       type="date"
                       value={hwFormData.due_date}
                       onChange={e => setHwFormData({...hwFormData, due_date: e.target.value})}
                       className={cn(
                         "w-full px-6 py-4 bg-slate-50 rounded-2xl border-transparent focus:ring-2 focus:ring-brand-indigo/20 text-sm font-bold transition-all",
                         theme === 'dark' && "bg-white/5 border-white/10 text-white"
                       )}
                     />
                  </div>

                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Attachments (Optional)</label>
                    <div className="flex flex-wrap gap-2">
                      {hwFormData.attachments.map((file, idx) => {
                        const isString = typeof file === 'string';
                        const url = isString ? file : file.url;
                        const isImage = url.startsWith('data:image/');
                        return (
                        <div key={`hw-post-${idx}`} className="relative group/file">
                          {isImage ? (
                            <img src={url} className="h-16 w-16 rounded-xl object-cover border border-slate-100 shadow-sm" alt="hw-preview" />
                          ) : (
                            <div className="h-16 w-16 rounded-xl bg-slate-100 flex items-center justify-center border border-slate-100 p-2 overflow-hidden">
                              <div className="flex flex-col items-center">
                                <FileText className="h-5 w-5 text-slate-400" />
                                {!isString && <span className="text-[6px] font-black uppercase text-slate-500 mt-1 truncate w-full text-center">{file.name}</span>}
                              </div>
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black/40 rounded-xl opacity-0 group-hover/file:opacity-100 transition-opacity flex items-center justify-center gap-1">
                            {isImage && (
                              <button 
                                type="button"
                                onClick={() => {
                                  setEditingImageUrl(url);
                                  setEditingImageIndex(idx);
                                }}
                                className="bg-brand-indigo text-white rounded-full p-1 shadow-md"
                              >
                                <PenTool className="h-3 w-3" />
                              </button>
                            )}
                            <button 
                              type="button"
                              onClick={() => removeAttachment(idx)}
                              className="bg-rose-500 text-white rounded-full p-1 shadow-md"
                            >
                              <XCircle className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      )})}
                      <label className={cn(
                        "h-16 w-16 rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center cursor-pointer hover:border-brand-indigo hover:bg-brand-indigo/5 transition-all text-slate-400",
                        theme === 'dark' && "border-white/10"
                      )}>
                        <Plus className="h-5 w-5" />
                        <span className="text-[8px] font-bold mt-1 uppercase">Add</span>
                        <input type="file" accept="image/*,application/pdf" className="hidden" onChange={handleHomeworkFileUpload} />
                      </label>
                    </div>
                  </div>

                  <div className="pt-4 flex gap-4">
                     <button 
                       type="button" 
                       onClick={() => {
                         setShowHomeworkModal(false);
                         setEditingHomeworkId(null);
                         setHwFormData({ title: '', description: '', subject: '', due_date: format(new Date(), 'yyyy-MM-dd'), attachments: [] });
                       }} 
                       className={cn("flex-1 py-4 bg-slate-100 text-slate-400 rounded-2xl font-black text-sm", theme === 'dark' && "bg-white/5")}
                     >
                       {t('cancel')}
                     </button>
                     <button type="submit" disabled={submitting} className="flex-1 py-4 bg-brand-coral text-white rounded-2xl font-black text-sm shadow-xl shadow-brand-coral/20 disabled:opacity-50">
                       {submitting ? (editingHomeworkId ? 'Updating...' : 'Posting...') : (editingHomeworkId ? 'Update Post' : 'Post Task')}
                     </button>
                  </div>
               </form>
            </motion.div>
         </div>
      )}

      {/* Leave Approval Modal */}
      {selectedLeave && (
        <div key="leave-modal" className="fixed inset-0 z-[60] flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => !processingLeave && setSelectedLeave(null)} />
           <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className={cn("bg-white rounded-[3rem] w-full max-w-sm relative z-10 p-8 shadow-2xl transition-colors duration-300", theme === 'dark' && "bg-[#1E1E1E]")}>
              <h3 className={cn("text-2xl font-black text-[#2B2D42] mb-6", theme === 'dark' && "text-white")}>Review Leave</h3>
              <div className="space-y-4">
                 <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Reason (Parent)</p>
                    <p className={cn("mt-1 px-5 py-4 bg-slate-50 rounded-2xl text-xs font-bold text-[#2B2D42] italic border border-slate-100 transition-colors", theme === 'dark' && "bg-white/5 text-slate-300 border-white/10")}>"{selectedLeave.reason}"</p>
                 </div>
                 
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Your Remarks</label>
                    <textarea 
                       rows={3}
                       placeholder="E.g. Approved for family function..."
                       value={leaveRemarks}
                       onChange={e => setLeaveRemarks(e.target.value)}
                       className={cn(
                         "w-full px-6 py-4 bg-slate-50 rounded-2xl border-transparent focus:ring-2 focus:ring-brand-indigo/20 text-sm font-bold transition-all resize-none",
                         theme === 'dark' && "bg-white/5 border-white/10 text-white"
                       )}
                    />
                 </div>

                 <div className="pt-4 grid grid-cols-2 gap-4">
                    <button 
                      onClick={() => handleProcessLeave('rejected')}
                      disabled={processingLeave}
                      className={cn("py-4 border-2 border-rose-100 text-rose-500 rounded-2xl font-black text-xs uppercase hover:bg-rose-50 transition-colors", theme === 'dark' && "border-rose-500/20 hover:bg-rose-500/5")}
                    >
                       Reject
                    </button>
                    <button 
                      onClick={() => handleProcessLeave('approved')}
                      disabled={processingLeave}
                      className="py-4 bg-emerald-500 text-white rounded-2xl font-black text-xs uppercase shadow-xl shadow-emerald-500/20"
                    >
                       Approve
                    </button>
                 </div>
              </div>
           </motion.div>
        </div>
      )}
      {/* Views Stats Modal */}
      {showViewsModal && (
         <div key="views-modal" className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setShowViewsModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className={cn("bg-white rounded-[3rem] w-full max-w-sm relative z-10 p-8 shadow-2xl transition-colors duration-300", theme === 'dark' && "bg-[#1E1E1E]")}>
               <div className="flex justify-between items-center mb-6">
                  <h3 className={cn("text-2xl font-black text-[#2B2D42]", theme === 'dark' && "text-white")}>Homework Views</h3>
                  <button onClick={() => setShowViewsModal(false)} className="p-2 bg-slate-100 rounded-full text-slate-400 dark:bg-white/5">
                     <XCircle className="h-5 w-5" />
                  </button>
               </div>

               {viewsLoading ? (
                  <div className="py-20 flex flex-col items-center justify-center gap-4">
                     <div className="h-8 w-8 border-4 border-brand-indigo/20 border-t-brand-indigo rounded-full animate-spin" />
                     <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Loading stats...</p>
                  </div>
               ) : (
                  <div className="space-y-6">
                     <div className="bg-brand-indigo/10 p-6 rounded-3xl text-center">
                        <p className="text-[10px] font-black text-brand-indigo uppercase tracking-widest mb-1">Total Seen</p>
                        <p className="text-4xl font-black text-brand-indigo">{selectedHomeworkViews.length}</p>
                        <p className="text-[10px] font-bold text-slate-400 mt-1">Out of {students.length} students</p>
                     </div>

                     <div className="space-y-3">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Viewer List</h4>
                        <div className="space-y-2 max-h-48 overflow-y-auto pr-2 scrollbar-none">
                           {selectedHomeworkViews.length > 0 ? [...selectedHomeworkViews].sort((a,b) => (b.viewed_at?.toMillis() || 0) - (a.viewed_at?.toMillis() || 0)).map((view, idx) => (
                              <div key={`view-${idx}`} className={cn("bg-slate-50 p-4 rounded-2xl flex items-center justify-between border border-slate-100", theme === 'dark' && "bg-white/5 border-white/5")}>
                                 <span className={cn("text-xs font-bold text-[#2B2D42]", theme === 'dark' && "text-white")}>{view.student_name}</span>
                                 <span className="text-[10px] font-bold text-slate-400">{view.viewed_at ? format(view.viewed_at.toDate(), 'HH:mm') : 'Just now'}</span>
                              </div>
                           )) : (
                              <div className="py-6 text-center text-slate-300 text-xs italic font-bold">No views recorded yet.</div>
                           )}
                        </div>
                     </div>

                     <button 
                       onClick={() => setShowViewsModal(false)}
                       className="w-full py-4 bg-[#2B2D42] text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-95 shadow-xl"
                     >
                        Close
                     </button>
                  </div>
               )}
            </motion.div>
         </div>
      )}

      {/* Image Editor Overlay */}
      <AnimatePresence>
        {editingImageUrl && (
          <ImageEditor 
            image={editingImageUrl}
            theme={theme}
            onCancel={() => {
              setEditingImageUrl(null);
              setEditingImageIndex(null);
            }}
            onSave={handleSaveEditedImage}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
