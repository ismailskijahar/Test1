import React, { useState, useEffect } from 'react';
import { 
  ClipboardList,
  Sun,
  Bell, 
  ChevronRight, 
  CheckCircle, 
  XCircle,
  Plus,
  GraduationCap,
  Clock,
  ArrowRight,
  Menu,
  MoreHorizontal,
  FileText,
  History,
  Info,
  DollarSign,
  LogOut,
  Camera,
  User,
  Download,
  Share2,
  Maximize2,
  ExternalLink,
  Printer,
  FileDown
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { dataService } from '../services/dataService';
import { Student, AttendanceRecord, FeeDefinition, Payment, Announcement, Homework, UserProfile, LeaveRequest, Attachment, Receipt } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { format } from 'date-fns';
import { useLanguage } from '../context/LanguageContext';
import { motion, AnimatePresence } from 'motion/react';
import { ReceiptPrint } from '../components/ReceiptPrint';

export default function ParentPortal() {
  const { profile, logout, updateProfile } = useAuth();
  const { t } = useLanguage();
  const [student, setStudent] = useState<Student | null>(null);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [fees, setFees] = useState<FeeDefinition[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [homeworks, setHomeworks] = useState<Homework[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [teacher, setTeacher] = useState<UserProfile | null>(null);
  const [leaveHistory, setLeaveHistory] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modals state
  const [activeModal, setActiveModal] = useState<'leave' | 'history' | 'attendance' | 'holiday_hw' | 'profile' | 'homework_detail' | 'receipts' | 'receipt_detail' | null>(null);
  const [selectedHomework, setSelectedHomework] = useState<Homework | null>(null);
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  const [viewingAttachment, setViewingAttachment] = useState<string | null>(null);
  const [submissionData, setSubmissionData] = useState<{
    content: string;
    attachments: (string | Attachment)[];
  }>({
    content: '',
    attachments: []
  });
  const [profileFormData, setProfileFormData] = useState({
    name: profile?.name || '',
    avatar_url: profile?.avatar_url || ''
  });
  const [leaveFormData, setLeaveFormData] = useState({
    start_date: format(new Date(), 'yyyy-MM-dd'),
    end_date: format(new Date(), 'yyyy-MM-dd'),
    reason: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [dismissedHash, setDismissedHash] = useState<string | null>(localStorage.getItem('urgent_dismissed_hash'));

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

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setSubmitting(true);
    try {
      await dataService.updateUserProfile(profile.uid, profileFormData);
      
      // Also update current student's avatar if profile is changed
      if (student && profileFormData.avatar_url) {
        await dataService.updateStudent(profile.school_id, student.id, {
          avatar_url: profileFormData.avatar_url
        });
        setStudent(prev => prev ? { ...prev, avatar_url: profileFormData.avatar_url } : null);
      }

      updateProfile(profileFormData);
      setActiveModal(null);
      alert("Profile updated successfully!");
    } catch (error) {
      console.error("Error updating profile:", error);
      alert("Failed to update profile. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmissionFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert("File too large. max 2MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        if (file.type.startsWith('image/')) {
          const img = new Image();
          img.src = base64;
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 800;
            const MAX_HEIGHT = 800;
            let width = img.width;
            let height = img.height;
            if (width > height) {
              if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
            } else {
              if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(img, 0, 0, width, height);
            const compressed = canvas.toDataURL('image/jpeg', 0.6);
            const newAttachment: Attachment = {
              url: compressed,
              name: file.name,
              type: 'image'
            };
            setSubmissionData(prev => ({ ...prev, attachments: [...prev.attachments, newAttachment] }));
          };
        } else {
          const newAttachment: Attachment = {
            url: base64,
            name: file.name,
            type: file.type.includes('pdf') ? 'pdf' : 'file'
          };
          setSubmissionData(prev => ({ ...prev, attachments: [...prev.attachments, newAttachment] }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmitHomework = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !selectedHomework) return;
    
    setSubmitting(true);
    try {
      await dataService.submitHomework(profile.school_id, {
        homework_id: selectedHomework.id,
        student_id: profile.uid,
        student_name: profile.name,
        content: submissionData.content,
        attachments: submissionData.attachments,
        school_id: profile.school_id
      });
      alert("Homework submitted successfully!");
      setSubmissionData({ content: '', attachments: [] });
      setActiveModal(null);
    } catch (error) {
      console.error("Error submitting homework:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleShare = async (attachment: string | Attachment) => {
    const isString = typeof attachment === 'string';
    const file = isString ? attachment : attachment.url;
    const name = isString ? 'homework_attachment' : attachment.name;

    if (navigator.share) {
      try {
        if (file.startsWith('data:')) {
          const res = await fetch(file);
          const blob = await res.blob();
          const fileName = name || (file.startsWith('data:image/') ? 'homework_attachment.jpg' : 'homework_attachment.pdf');
          const shareFile = new File([blob], fileName, { type: blob.type });

          await navigator.share({
            files: [shareFile],
            title: 'Homework Attachment',
          });
        } else {
          await navigator.share({
            url: file,
            title: 'Homework Attachment',
          });
        }
      } catch (err) {
        console.error('Error sharing:', err);
      }
    } else {
      alert("Sharing is not supported on this browser.");
    }
  };

  const handleDownload = (attachment: string | Attachment) => {
    const isString = typeof attachment === 'string';
    const file = isString ? attachment : attachment.url;
    const name = isString ? (file.startsWith('data:image/') ? 'attachment.jpg' : 'attachment.pdf') : attachment.name;

    const link = document.createElement('a');
    link.href = file;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const openAttachment = (attachment: string | Attachment) => {
    const isString = typeof attachment === 'string';
    const url = isString ? attachment : attachment.url;
    const name = isString ? 'Document' : attachment.name;
    const isImage = url.startsWith('data:image/');

    if (isImage) {
      setViewingAttachment(url);
      return;
    }

    const win = window.open('', '_blank');
    if (win) {
      win.document.write(`
        <html>
          <head>
            <title>${name}</title>
            <style>
              body { margin: 0; padding: 0; background: #333; height: 100vh; overflow: hidden; }
              iframe { border: none; width: 100%; height: 100%; }
            </style>
          </head>
          <body>
            <iframe src="${url}"></iframe>
          </body>
        </html>
      `);
      win.document.close();
    }
  };

  useEffect(() => {
    if (profile && activeModal !== 'profile') {
      setProfileFormData({
        name: profile.name,
        avatar_url: profile.avatar_url || ''
      });
    }
  }, [profile, activeModal]);

  useEffect(() => {
    const loadStudentData = async (retries = 0) => {
      const studentId = localStorage.getItem('aerovax_parent_student_id');
      
      if (!profile) {
        setLoading(false);
        return;
      }

      let currentStudentId = studentId;

      if (!currentStudentId) {
        try {
          const allStudents = await dataService.getStudents(profile.school_id);
          if (allStudents.length > 0) {
            currentStudentId = allStudents[0].id;
            localStorage.setItem('aerovax_parent_student_id', currentStudentId);
          }
        } catch (e) {
          console.error(e);
        }
      }

      if (!currentStudentId) {
        setLoading(false);
        return;
      }

      try {
        const allStudents = await dataService.getStudents(profile.school_id);
        const matched = allStudents.find(s => s.id === currentStudentId);
        if (matched) {
          setStudent(matched);
          const [attn, ann, fData, pData, hwData, teacherData, leaves, rData] = await Promise.all([
            dataService.getAttendance(profile.school_id, matched.id),
            dataService.getAnnouncements(profile.school_id),
            dataService.getFees(profile.school_id, matched.id),
            dataService.getPayments(profile.school_id, matched.id),
            dataService.getHomework(profile.school_id, matched.class, matched.section),
            dataService.getTeacherForClass(profile.school_id, matched.class, matched.section),
            dataService.getLeaveHistory(profile.school_id, matched.id),
            dataService.getReceipts(profile.school_id, matched.id)
          ]);
          setAttendance(attn);
          setAnnouncements(ann);
          setFees(fData.filter(f => f.class === matched.class));
          setPayments(pData);
          setHomeworks(hwData);
          setTeacher(teacherData);
          setLeaveHistory(leaves);
          setReceipts(rData);
        }
      } catch (error: any) {
        console.error("Error loading student data:", error);
        // Retry if it's a permission error that might be due to replication lag
        if (retries < 2 && (error.message?.includes('permission') || error.message?.includes('insufficient'))) {
          console.log(`Retrying parent data load... attempt ${retries + 1}`);
          await new Promise(r => setTimeout(r, 1000));
          return loadStudentData(retries + 1);
        }
      } finally {
        if (retries === 0 || retries >= 2) {
          setLoading(false);
        }
      }
    };

    loadStudentData();
  }, [profile]);

  const handleApplyLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !student) return;
    setSubmitting(true);
    try {
      await dataService.applyLeave(profile.school_id, {
        student_id: student.id,
        parent_id: profile.uid,
        ...leaveFormData,
        status: 'pending'
      });
      // Refresh history
      const leaves = await dataService.getLeaveHistory(profile.school_id, student.id);
      setLeaveHistory(leaves);
      setActiveModal('history');
      setLeaveFormData({
        start_date: format(new Date(), 'yyyy-MM-dd'),
        end_date: format(new Date(), 'yyyy-MM-dd'),
        reason: ''
      });
    } catch (error) {
      console.error("Error applying for leave:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewHomework = async (hw: Homework) => {
    if (!profile || !student) return;
    setSelectedHomework(hw);
    setActiveModal('homework_detail');
    // Track the view in Firestore
    await dataService.markHomeworkAsSeen(profile.school_id, hw.id, profile.uid, profile.name);
  };

  const handlePrintReceipt = (receipt: Receipt) => {
    setSelectedReceipt(receipt);
    setActiveModal('receipt_detail');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 border-4 border-brand-indigo/20 border-t-brand-indigo rounded-full animate-spin"></div>
          <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Entering Portal...</p>
        </div>
      </div>
    );
  }

  if (!student) {
    return <div className="p-10 text-center">Student record not found. Please log in again.</div>;
  }

  const totalFees = fees.reduce((sum, f) => sum + f.amount, 0);
  const totalPaid = payments.reduce((sum, p) => sum + p.amount_paid, 0);
  const dues = totalFees - totalPaid;

  const quickActions = [
    { icon: ClipboardList, label: t('apply_leave'), color: 'bg-brand-indigo', textColor: 'text-brand-indigo', id: 'leave' },
    { icon: History, label: t('leave_history'), color: 'bg-emerald-500', textColor: 'text-emerald-500', id: 'history' },
    { icon: Info, label: t('attendance_report'), color: 'bg-indigo-600', textColor: 'text-indigo-600', id: 'attendance' },
    { icon: FileText, label: 'Receipts', color: 'bg-emerald-600', textColor: 'text-emerald-600', id: 'receipts' },
    { icon: Sun, label: t('holiday_hw'), color: 'bg-amber-500', textColor: 'text-amber-500', id: 'holiday_hw' },
  ];

  return (
    <div className="min-h-screen bg-[#F0F4F8] pb-10">
      {/* Mobile Top Header */}
      <div className="bg-[#2B2D42] text-white p-6 pb-12 rounded-b-[3rem] shadow-xl">
        <div className="lg:max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
             <button 
               onClick={() => logout()}
               className="p-2 border border-white/20 rounded-xl hover:bg-white/10 transition-colors"
               title="Logout"
             >
                <LogOut className="h-6 w-6" />
             </button>
            <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-2xl border-2 border-white/10 overflow-hidden shadow-inner hidden sm:block">
                   <img 
                     src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${student.name}`} 
                     className="h-full w-full object-cover bg-slate-700" 
                     alt="student avatar" 
                   />
                </div>
                <div>
                   <h1 className="text-xl font-bold tracking-tight">Hi, {student.name.split(' ')[0]}</h1>
                   <p className="text-slate-400 text-[10px] font-semibold uppercase tracking-wider">Class {student.class} {student.section}</p>
                   <div className="mt-0.5 bg-white/10 px-2 py-0.5 rounded text-[9px] font-bold uppercase inline-block font-mono tracking-tighter">ID: {student.custom_id}</div>
                </div>
             </div>
          </div>
          <button 
            onClick={() => setActiveModal('profile')}
            className="relative group h-14 w-14 rounded-2xl border-4 border-white/20 overflow-hidden shadow-lg group-hover:scale-105 transition-transform"
          >
             {profile?.avatar_url ? (
               <img src={profile.avatar_url} className="h-full w-full object-cover" alt="Profile" />
             ) : (
               <img 
                 src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.name}`} 
                 className="h-full w-full object-cover bg-brand-indigo" 
                 alt="avatar" 
               />
             )}
             <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Camera className="h-4 w-4 text-white" />
             </div>
             <div className="absolute -bottom-1 -right-1 h-4 w-4 bg-emerald-500 border-2 border-[#2B2D42] rounded-full"></div>
          </button>
        </div>
      </div>

      <div className="lg:max-w-4xl mx-auto px-4 -mt-6 space-y-6">
        {/* Urgent Notification Banner */}
        {(() => {
          const newHwCount = homeworks.filter(hw => {
            const created = new Date(hw.createdAt || hw.due_date);
            return (new Date().getTime() - created.getTime()) < (3 * 24 * 60 * 60 * 1000);
          }).length;
          
          const upcomingEventsCount = announcements.filter(ann => {
            const date = new Date(ann.date);
            const now = new Date();
            const diff = date.getTime() - now.getTime();
            return diff > 0 && diff < (7 * 24 * 60 * 60 * 1000);
          }).length;

          const recentNoticesCount = announcements.filter(ann => {
            const date = new Date(ann.date);
            const now = new Date();
            const diff = now.getTime() - date.getTime();
            return diff >= 0 && diff < (2 * 24 * 60 * 60 * 1000);
          }).length;

          const holidayCount = announcements.filter(ann => 
            ann.title.toLowerCase().includes('holiday') || 
            ann.description.toLowerCase().includes('holiday')
          ).length;

          const recentLeaveUpdates = leaveHistory.filter(l => l.status !== 'pending').length;

          const totalUrgent = newHwCount + upcomingEventsCount + recentNoticesCount + holidayCount + recentLeaveUpdates;
          const currentHash = `${newHwCount}-${upcomingEventsCount}-${recentNoticesCount}-${holidayCount}-${recentLeaveUpdates}`;

          if (totalUrgent === 0 || dismissedHash === currentHash) return null;

          const handleDismiss = () => {
            localStorage.setItem('urgent_dismissed_hash', currentHash);
            setDismissedHash(currentHash);
          };

          return (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white p-4 rounded-[2.5rem] shadow-xl flex items-center justify-between border border-white/50 relative group"
            >
               <div className="flex items-center gap-4">
                  <div className="h-10 w-10 bg-[#2B2D42] rounded-full flex items-center justify-center shadow-md">
                     <Bell className="h-5 w-5 text-white" />
                  </div>
                  <div>
                     <p className="text-sm font-black text-[#2B2D42]">{totalUrgent} New Updates</p>
                     <div className="flex gap-2 mt-0.5">
                        {newHwCount > 0 && <span className="text-[8px] font-black text-brand-coral uppercase tracking-tighter">HW</span>}
                        {upcomingEventsCount > 0 && <span className="text-[8px] font-black text-brand-indigo uppercase tracking-tighter">Events</span>}
                        {recentNoticesCount > 0 && <span className="text-[8px] font-black text-amber-500 uppercase tracking-tighter">Notice</span>}
                        {holidayCount > 0 && <span className="text-[8px] font-black text-emerald-500 uppercase tracking-tighter">Holiday</span>}
                        {recentLeaveUpdates > 0 && <span className="text-[8px] font-black text-sky-500 uppercase tracking-tighter">Leave</span>}
                     </div>
                  </div>
               </div>
               <div className="flex gap-2">
                 <button 
                  onClick={() => {
                    setActiveModal('history');
                    handleDismiss();
                  }}
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

        {/* Featured Banner (Admissions/Events) */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-[2.5rem] overflow-hidden shadow-lg border border-white relative group h-44 cursor-pointer"
        >
           <div className="p-8 h-full flex flex-col justify-center relative z-10 w-2/3">
              <p className="text-[10px] font-bold text-[#2B2D42] uppercase tracking-widest mb-1">Coming Soon 2024-25</p>
              <h2 className="text-3xl font-bold text-[#2B2D42] leading-none mb-2">Admissions Open</h2>
              <p className="text-xs text-slate-400 font-bold mb-4">Click to Apply Now</p>
              <div className="text-xs font-bold text-brand-indigo">+91 99999-99999</div>
           </div>
           <div className="absolute top-0 right-0 h-full w-1/2 flex items-center justify-center p-4">
              <div className="h-full w-full bg-[#E0E7FF] rounded-[2rem] relative overflow-hidden group-hover:bg-[#C7D2FE] transition-colors">
                  <GraduationCap className="absolute -bottom-4 -right-4 h-32 w-32 text-brand-indigo opacity-20 rotate-12" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <img 
                      src="https://images.unsplash.com/photo-1577891748550-6927da250003?auto=format&fit=crop&q=80&w=200" 
                      className="h-28 w-28 rounded-full border-4 border-white shadow-xl object-cover transform -rotate-6"
                      alt="Student"
                    />
                  </div>
              </div>
           </div>
        </motion.div>

        {/* Quick Contacts / Avatars */}
        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-none px-1">
           <div className="flex flex-col items-center gap-2 flex-shrink-0">
              <div className="h-16 w-16 rounded-full border-4 border-brand-coral shadow-md transition-transform hover:scale-110 cursor-pointer overflow-hidden flex items-center justify-center">
                 <img 
                   src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${student.name}`} 
                   className="h-full w-full object-cover bg-slate-100" 
                   alt="avatar" 
                 />
              </div>
              <span className="text-[10px] font-bold text-slate-400 truncate w-16 text-center">{student.name.split(' ')[0]}</span>
           </div>
           
           {teacher && (
             <div className="flex flex-col items-center gap-2 flex-shrink-0">
                <div className="h-16 w-16 rounded-full border-4 border-[#FFC300] shadow-md transition-transform hover:scale-110 cursor-pointer overflow-hidden flex items-center justify-center">
                   <img 
                     src={teacher.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${teacher.name}`} 
                     className="h-full w-full object-cover bg-slate-100" 
                     alt="avatar" 
                   />
                </div>
                <span className="text-[10px] font-bold text-slate-400 truncate w-16 text-center">T. {teacher.name.split(' ')[0]}</span>
             </div>
           )}

           {['Principal', 'Admin', 'Bus Driver'].map((n) => (
             <div key={n} className="flex flex-col items-center gap-2 flex-shrink-0">
                <div className="h-16 w-16 rounded-full border-4 border-white shadow-md transition-transform hover:scale-110 cursor-pointer overflow-hidden flex items-center justify-center">
                   <img 
                     src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${n}`} 
                     className="h-full w-full object-cover bg-slate-100" 
                     alt="avatar" 
                   />
                </div>
                <span className="text-[10px] font-bold text-slate-400 truncate w-16 text-center">{n}</span>
             </div>
           ))}
        </div>

        {/* Section Wrapper for PC compatibility */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Left Column (Stats & Actions) */}
          <div className="space-y-6">
            {/* Fees Due Card (Mobile Style Highlight) */}
            {dues > 0 && (
              <motion.div 
                whileHover={{ scale: 1.02 }}
                className="bg-brand-coral text-white p-8 rounded-[3rem] shadow-xl relative overflow-hidden h-40 flex items-center justify-between"
              >
                 <div className="relative z-10">
                    <p className="text-sm font-bold opacity-80 uppercase tracking-widest mb-1">{t('fees_due')}</p>
                    <div className="text-4xl font-black">₹{dues.toLocaleString()}</div>
                 </div>
                 <div className="relative z-10">
                    <button className="bg-white text-brand-coral px-6 py-3 rounded-2xl font-bold hover:bg-slate-50 transition-colors shadow-lg">
                       {t('pay_now')}
                    </button>
                 </div>
                 <div className="absolute top-0 right-0 h-40 w-40 bg-white/10 rounded-full blur-3xl translate-x-10 -translate-y-10"></div>
                 <DollarSign className="absolute bottom-2 right-4 h-24 w-24 text-white opacity-10" />
              </motion.div>
            )}

            {/* Attendance Summary */}
            <div className="bg-white p-8 rounded-[3rem] shadow-xl border border-white relative overflow-hidden group">
               <div className="absolute top-0 right-0 h-32 w-32 bg-emerald-500/5 rounded-full blur-3xl -translate-y-10 translate-x-10 group-hover:bg-emerald-500/10 transition-colors duration-700"></div>
               
               <div className="flex items-center justify-between mb-8 relative z-10">
                 <div className="bg-gradient-to-r from-[#F8A100] to-[#FFC300] px-6 py-2 rounded-2xl shadow-lg shadow-amber-500/20">
                    <span className="text-[10px] font-black text-white uppercase tracking-[0.1em]">Recent Attendance</span>
                 </div>
                 <div className="text-right">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Monthly Presence</p>
                    <div className="flex items-baseline justify-end gap-1">
                      <p className="text-2xl font-black text-emerald-500 tabular-nums">
                        {attendance.length > 0 ? Math.round((attendance.filter(a => a.status === 'present').length / attendance.length) * 100) : 0}
                      </p>
                      <span className="text-xs font-black text-emerald-500/50">%</span>
                    </div>
                 </div>
               </div>
               
               <div className="grid grid-cols-5 gap-3 relative z-10">
                  {attendance.slice(0, 5).map((record) => (
                    <motion.div 
                      key={record.id} 
                      whileHover={{ y: -5 }}
                      className="flex flex-col items-center gap-3"
                    >
                       <span className="text-[9px] font-black text-slate-300 uppercase tracking-tighter">{format(new Date(record.date), 'EEE')}</span>
                       <div className={cn(
                         "h-12 w-12 rounded-[1.25rem] flex items-center justify-center transition-all duration-300 shadow-sm",
                         record.status === 'present' 
                          ? "bg-emerald-50 text-emerald-500 border border-emerald-100/50 group-hover:shadow-emerald-500/10" 
                          : "bg-rose-50 text-rose-500 border border-rose-100/50 group-hover:shadow-rose-500/10"
                       )}>
                          {record.status === 'present' ? <CheckCircle className="h-6 w-6 stroke-[2.5]" /> : <XCircle className="h-6 w-6 stroke-[2.5]" />}
                       </div>
                       <div className="flex flex-col items-center">
                         <span className="text-xs font-black text-[#2B2D42]">{format(new Date(record.date), 'dd')}</span>
                         <div className={cn("h-1 w-1 rounded-full mt-1", record.status === 'present' ? "bg-emerald-400" : "bg-rose-400")}></div>
                       </div>
                    </motion.div>
                  ))}
                  {attendance.length === 0 && (
                    <div className="col-span-5 text-center py-6 text-slate-300 text-xs italic font-bold">Waiting for attendance data...</div>
                  )}
               </div>
            </div>

            {/* Quick Actions Grid */}
            <div className="bg-white p-6 rounded-[3.5rem] shadow-lg grid grid-cols-4 gap-4 border border-white/50">
               {quickActions.map((action) => (
                 <motion.button 
                   whileTap={{ scale: 0.95 }}
                   key={action.id} 
                   onClick={() => setActiveModal(action.id as any)}
                   className="flex flex-col items-center gap-2 group"
                 >
                    <div className={cn(
                      "h-14 w-14 rounded-[1.25rem] flex items-center justify-center transition-all group-hover:scale-110 shadow-sm",
                      action.color, "bg-opacity-10", action.textColor
                    )}>
                       <action.icon className="h-6 w-6" />
                    </div>
                    <span className="text-[9px] font-bold text-slate-400 text-center leading-tight">{action.label}</span>
                 </motion.button>
               ))}
            </div>
          </div>

          {/* Right Column (Announcements/Upcoming) */}
          <div id="upcoming-section" className="scroll-mt-6 space-y-6">
             <div className="flex items-center justify-between mb-2">
                <h3 className="text-xl font-bold text-[#2B2D42]">Upcoming Events</h3>
                <button className="text-xs font-bold text-brand-indigo">View Calendar</button>
             </div>
             <div className="space-y-4">
                {announcements.length > 0 ? announcements.slice(0, 3).map((ann) => (
                  <motion.div 
                    key={ann.id}
                    whileHover={{ x: 5 }}
                    className="bg-white p-5 rounded-[2rem] shadow-sm border border-slate-100 flex items-center gap-4 group cursor-pointer"
                  >
                     <div className={cn("h-14 w-14 rounded-2xl flex flex-col items-center justify-center shrink-0 shadow-inner", 
                       ann.type === 'holiday' ? "bg-emerald-50 text-emerald-500" : "bg-brand-indigo/10 text-brand-indigo"
                     )}>
                        <span className="text-[10px] font-bold uppercase leading-none">{format(new Date(ann.date), 'MMM')}</span>
                        <span className="text-lg font-black leading-none mt-1">{format(new Date(ann.date), 'dd')}</span>
                     </div>
                     <div className="flex-1">
                        <h4 className="text-sm font-bold text-[#2B2D42] group-hover:text-brand-indigo transition-colors">{ann.title}</h4>
                        <p className="text-xs text-slate-400 line-clamp-1 mt-1">{ann.description}</p>
                     </div>
                     <ChevronRight className="h-4 w-4 text-slate-200 group-hover:text-brand-indigo" />
                  </motion.div>
                )) : (
                  <div className="text-slate-400 text-xs italic p-4 text-center">No announcements yet</div>
                )}
             </div>

             {/* Homework Section */}
             <div className="flex items-center justify-between mt-8 mb-2">
                <h3 className="text-xl font-bold text-[#2B2D42]">{t('new_homework')}</h3>
                <span className="bg-brand-coral text-white px-2 py-0.5 rounded text-[10px] font-bold">{homeworks.length}</span>
             </div>
             <div className="space-y-4">
                {homeworks.length > 0 ? homeworks.slice(0, 3).map((hw) => (
                  <motion.div 
                    key={hw.id}
                    whileHover={{ scale: 1.01 }}
                    className="bg-white p-6 rounded-[2.5rem] shadow-lg border-b-4 border-brand-indigo group"
                  >
                     <div className="flex items-center justify-between mb-3">
                        <span className="px-3 py-1 bg-brand-indigo/10 text-brand-indigo font-bold text-[10px] rounded-full uppercase tracking-tighter">
                          {hw.subject}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                          <Clock className="h-3 w-3" /> Due {format(new Date(hw.due_date), 'MMM dd')}
                        </span>
                     </div>
                     <h4 className="text-base font-black text-[#2B2D42] mb-1">{hw.title}</h4>
                     <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">{hw.description}</p>
                     <button 
                       onClick={() => handleViewHomework(hw)}
                       className="mt-4 flex items-center gap-2 text-xs font-black text-brand-indigo group-hover:gap-3 transition-all"
                     >
                        View Details <ArrowRight className="h-4 w-4" />
                     </button>
                  </motion.div>
                )) : (
                  <div className="bg-slate-100 p-8 rounded-[2rem] text-center border-2 border-dashed border-slate-200">
                    <FileText className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs font-bold text-slate-400">No homework assigned yet.</p>
                  </div>
                )}
             </div>

             {/* Support Card */}
             <div className="bg-[#2B2D42] p-8 rounded-[2.5rem] text-white relative overflow-hidden group">
                <div className="relative z-10">
                   <h3 className="text-2xl font-bold mb-2">{t('need_support')}</h3>
                   <p className="text-slate-400 text-sm mb-6 max-w-[200px]">Contact the school administration for any queries.</p>
                   <button 
                    onClick={() => {
                      const phoneNumber = '919932502174';
                      const message = `Hello, I am the parent of ${student.name} (ID: ${student.custom_id}). I have a query regarding my child.`;
                      window.open(`https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`, '_blank');
                    }}
                    className="bg-brand-indigo px-6 py-3 rounded-2xl font-bold text-sm shadow-xl shadow-brand-indigo/20 hover:scale-105 transition-transform"
                   >
                      {t('send_message')}
                   </button>
                </div>
                <div className="absolute -right-6 -bottom-6 h-32 w-32 bg-white/5 rounded-full blur-2xl group-hover:scale-110 transition-transform duration-700"></div>
                <GraduationCap className="absolute top-1/2 -right-4 h-32 w-32 text-white/5 -rotate-12" />
             </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {viewingAttachment && (
          <div key="viewing-attachment" className="fixed inset-0 z-[100] flex flex-col items-center justify-center p-4">
             <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               onClick={() => setViewingAttachment(null)}
               className="absolute inset-0 bg-black/95 backdrop-blur-xl"
             />
             
             <div className="absolute top-6 right-6 flex gap-4 z-10">
                <button 
                  onClick={() => handleShare(viewingAttachment)}
                  className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-md transition-colors shadow-2xl"
                  title="Share"
                >
                   <Share2 className="h-6 w-6" />
                </button>
                <button 
                  onClick={() => handleDownload(viewingAttachment)}
                  className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-md transition-colors shadow-2xl"
                  title="Download"
                >
                   <Download className="h-6 w-6" />
                </button>
                <button 
                  onClick={() => setViewingAttachment(null)}
                  className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-md transition-colors shadow-2xl"
                >
                   <XCircle className="h-6 w-6" />
                </button>
             </div>

             <motion.div 
               initial={{ opacity: 0, scale: 0.9 }}
               animate={{ opacity: 1, scale: 1 }}
               exit={{ opacity: 0, scale: 0.9 }}
               className="relative z-10 w-full max-w-4xl h-full flex items-center justify-center pointer-events-none"
             >
                {viewingAttachment.startsWith('data:image/') ? (
                  <img src={viewingAttachment} className="max-h-full max-w-full object-contain rounded-2xl shadow-2xl pointer-events-auto" alt="Full view" />
                ) : (
                  <div className="bg-white p-12 rounded-[3rem] flex flex-col items-center gap-6 pointer-events-auto">
                     <FileText className="h-24 w-24 text-brand-indigo" />
                     <h3 className="text-xl font-black text-[#2B2D42]">PDF Document</h3>
                     <div className="flex gap-4">
                        <a 
                          href={viewingAttachment} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="px-8 py-4 bg-brand-indigo text-white rounded-2xl font-black text-sm shadow-xl flex items-center gap-2"
                        >
                           <ExternalLink className="h-5 w-5" /> Open PDF
                        </a>
                     </div>
                  </div>
                )}
             </motion.div>
          </div>
        )}

        {activeModal && (
          <div key={`modal-${activeModal}`} className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveModal(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-[3rem] w-full max-w-lg relative z-10 p-8 shadow-2xl max-h-[85vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-8">
                 <h3 className="text-2xl font-black text-[#2B2D42] capitalize">{activeModal.replace('_', ' ')}</h3>
                 <button onClick={() => setActiveModal(null)} className="p-2 bg-slate-100 rounded-full text-slate-400 hover:bg-slate-200 transition-colors">
                    <XCircle className="h-6 w-6" />
                 </button>
              </div>

              {activeModal === 'leave' && (
                <form onSubmit={handleApplyLeave} className="space-y-4">
                   <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">{t('start_date')}</label>
                         <input 
                           type="date"
                           required
                           className="w-full px-6 py-4 bg-slate-50 rounded-2xl border-transparent focus:ring-2 focus:ring-brand-indigo/20 text-sm font-bold"
                           value={leaveFormData.start_date}
                           onChange={e => setLeaveFormData({...leaveFormData, start_date: e.target.value})}
                         />
                      </div>
                      <div className="space-y-1">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">{t('end_date')}</label>
                         <input 
                           type="date"
                           required
                           className="w-full px-6 py-4 bg-slate-50 rounded-2xl border-transparent focus:ring-2 focus:ring-brand-indigo/20 text-sm font-bold"
                           value={leaveFormData.end_date}
                           onChange={e => setLeaveFormData({...leaveFormData, end_date: e.target.value})}
                         />
                      </div>
                   </div>
                   <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">{t('reason')}</label>
                      <textarea 
                        required
                        rows={4}
                        placeholder="Why is leave needed?"
                        className="w-full px-6 py-4 bg-slate-50 rounded-2xl border-transparent focus:ring-2 focus:ring-brand-indigo/20 text-sm font-bold resize-none"
                        value={leaveFormData.reason}
                        onChange={e => setLeaveFormData({...leaveFormData, reason: e.target.value})}
                      />
                   </div>
                   <button 
                     disabled={submitting}
                     className="w-full py-4 bg-[#2B2D42] text-white rounded-2xl font-black shadow-xl shadow-brand-indigo/10 flex items-center justify-center gap-2"
                   >
                     {submitting ? `${t('loading')}...` : t('apply_leave')}
                   </button>
                </form>
              )}

              {activeModal === 'history' && (
                <div className="space-y-4">
                   {leaveHistory.length > 0 ? leaveHistory.map((leave) => (
                     <div key={leave.id} className="bg-slate-50 p-6 rounded-3xl border border-slate-100 flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                           <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{format(new Date(leave.start_date), 'MMM dd')} - {format(new Date(leave.end_date), 'MMM dd')}</span>
                           <span className={cn(
                             "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                             leave.status === 'pending' ? "bg-amber-100 text-amber-500" : 
                             leave.status === 'approved' ? "bg-emerald-100 text-emerald-500" : "bg-rose-100 text-rose-500"
                           )}>{leave.status}</span>
                        </div>
                        <div>
                           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                              <Info className="h-3 w-3" /> Your Reason
                           </p>
                           <p className="text-sm font-bold text-[#2B2D42] italic">"{leave.reason}"</p>
                        </div>
                        
                        {(leave.status === 'approved' || leave.status === 'rejected') && (
                          <div className="pt-3 border-t border-slate-200 mt-1">
                             <p className="text-[10px] font-black text-brand-indigo uppercase tracking-widest mb-1">Teacher Remarks</p>
                             <p className="text-xs font-bold text-[#2B2D42]">{leave.remarks || 'Processed without remarks.'}</p>
                             {leave.processed_by && (
                               <p className="text-[9px] text-slate-400 font-bold mt-1">— {leave.processed_by}</p>
                             )}
                          </div>
                        )}
                     </div>
                   )) : <div className="text-center py-10 text-slate-400 font-bold italic">No leave history found.</div>}
                </div>
              )}

              {activeModal === 'attendance' && (
                <div className="space-y-6">
                   <div className="grid grid-cols-2 gap-4">
                      <div className="bg-emerald-50 p-6 rounded-3xl text-center">
                         <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Present</p>
                         <p className="text-3xl font-black text-emerald-700">{attendance.filter(a => a.status === 'present').length}</p>
                      </div>
                      <div className="bg-red-50 p-6 rounded-3xl text-center">
                         <p className="text-[10px] font-black text-red-600 uppercase tracking-widest mb-1">Absent</p>
                         <p className="text-3xl font-black text-red-700">{attendance.filter(a => a.status === 'absent').length}</p>
                      </div>
                   </div>
                   <div className="space-y-3">
                      <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Detail Logs</h4>
                      <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                         {attendance.map((record) => (
                           <div key={record.id} className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl">
                              <span className="text-xs font-bold">{format(new Date(record.date), 'MMMM dd, yyyy')}</span>
                              <span className={cn(
                                "px-3 py-1 rounded-full text-[10px] font-bold uppercase",
                                record.status === 'present' ? "bg-emerald-100 text-emerald-600" : "bg-red-100 text-red-600"
                              )}>{record.status}</span>
                           </div>
                         ))}
                      </div>
                   </div>
                </div>
              )}

              {activeModal === 'holiday_hw' && (
                <div className="space-y-4">
                    {homeworks.filter(hw => hw.is_holiday_homework).length > 0 ? homeworks.filter(hw => hw.is_holiday_homework).map((hw) => (
                       <div key={hw.id} className="bg-slate-50 p-6 rounded-3xl border border-slate-100 space-y-3 cursor-pointer group hover:border-brand-indigo transition-colors"
                         onClick={() => handleViewHomework(hw)}
                       >
                         <div className="flex items-center justify-between">
                            <span className="px-3 py-1 bg-brand-indigo/10 text-brand-indigo font-bold text-[10px] rounded-full uppercase">{hw.subject}</span>
                            <span className="text-[10px] font-bold text-slate-400">Due {format(new Date(hw.due_date), 'MMM dd')}</span>
                         </div>
                         <h4 className="text-base font-black text-[#2B2D42]">{hw.title}</h4>
                         <p className="text-xs text-slate-500">{hw.description}</p>
                         <div className="flex items-center gap-2 text-[10px] font-black text-brand-indigo opacity-0 group-hover:opacity-100 transition-opacity">
                            View Assignment <ArrowRight className="h-3 w-3" />
                         </div>
                       </div>
                    )) : <div className="text-center py-10 text-slate-400 font-bold italic">No holiday tasks assigned.</div>}
                </div>
              )}

              {activeModal === 'homework_detail' && selectedHomework && (
                <div className="space-y-6">
                   <div className="space-y-4">
                      <div className="flex items-center justify-between">
                         <span className="px-3 py-1 bg-brand-indigo/10 text-brand-indigo font-bold text-[10px] rounded-full uppercase tracking-tighter">
                           {selectedHomework.subject}
                         </span>
                         <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                           <Clock className="h-3 w-3" /> Due {format(new Date(selectedHomework.due_date), 'MMMM dd, yyyy')}
                         </span>
                      </div>
                      <h2 className="text-xl font-black text-[#2B2D42]">{selectedHomework.title}</h2>
                      <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
                         <p className="text-sm text-[#2B2D42] leading-relaxed whitespace-pre-wrap">{selectedHomework.description}</p>
                      </div>

                      {selectedHomework.attachments && selectedHomework.attachments.length > 0 && (
                        <div className="space-y-3">
                           <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Attachments</h4>
                           <div className="grid grid-cols-2 gap-3">
                              {selectedHomework.attachments.map((file, idx) => {
                                const isString = typeof file === 'string';
                                const url = isString ? file : file.url;
                                const isImage = url.startsWith('data:image/');
                                const name = isString ? 'Attachment' : file.name;

                                return (
                                <div key={`hw-attach-${idx}`} className="group/attach relative overflow-hidden rounded-2xl border border-slate-100 shadow-sm bg-slate-50">
                                   {isImage ? (
                                     <div className="aspect-square relative cursor-pointer" onClick={() => openAttachment(file)}>
                                        <img src={url} className="h-full w-full object-cover" alt="attachment" />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/attach:opacity-100 transition-opacity flex items-center justify-center">
                                           <div className="flex gap-2">
                                              <button 
                                                onClick={(e) => { e.stopPropagation(); handleDownload(file); }}
                                                className="bg-white text-[#2B2D42] p-2 rounded-full shadow-lg hover:scale-110 transition-transform"
                                              >
                                                <Download className="h-4 w-4" />
                                              </button>
                                              <button className="bg-white text-[#2B2D42] p-2 rounded-full shadow-lg hover:scale-110 transition-transform">
                                                <Maximize2 className="h-4 w-4" />
                                              </button>
                                           </div>
                                        </div>
                                     </div>
                                   ) : (
                                     <div className="aspect-square flex flex-col items-center justify-center p-4 text-center">
                                        <FileText className="h-10 w-10 text-brand-indigo mb-2" />
                                        <span className="text-[8px] font-black uppercase text-slate-400 truncate w-full">{name}</span>
                                        <div className="flex gap-2 mt-3">
                                          <button 
                                            onClick={() => openAttachment(file)}
                                            className="px-4 py-2 bg-brand-indigo text-white text-[9px] font-black rounded-lg shadow-md"
                                          >
                                            View PDF
                                          </button>
                                          <button 
                                            onClick={() => handleDownload(file)}
                                            className="p-2 bg-slate-100 text-slate-400 rounded-lg hover:bg-slate-200 transition-colors"
                                          >
                                            <Download className="h-4 w-4" />
                                          </button>
                                        </div>
                                     </div>
                                   )}
                                </div>
                                );
                              })}
                           </div>
                        </div>
                      )}

                      <div className="h-px bg-slate-100 my-6" />

                      <form onSubmit={handleSubmitHomework} className="space-y-4">
                         <h3 className="text-sm font-black text-[#2B2D42] uppercase tracking-tight">Submit Your Work</h3>
                         <textarea 
                           required
                           placeholder="Type your notes or response here..."
                           value={submissionData.content}
                           onChange={e => setSubmissionData({...submissionData, content: e.target.value})}
                           className="w-full px-6 py-4 bg-slate-50 rounded-[1.5rem] border-transparent focus:ring-2 focus:ring-brand-indigo/20 text-xs font-bold transition-all min-h-[100px]"
                         />
                         <div className="flex flex-wrap gap-2">
                            {submissionData.attachments.map((file, idx) => (
                              <div key={`sub-attach-${idx}`} className="relative group/sub">
                                {file.startsWith('data:image/') ? (
                                  <img src={file} className="h-12 w-12 rounded-lg object-cover" alt="sub" />
                                ) : (
                                  <div className="h-12 w-12 rounded-lg bg-slate-200 flex items-center justify-center">
                                    <FileText className="h-6 w-6 text-slate-400" />
                                  </div>
                                )}
                                <button 
                                  type="button" 
                                  onClick={() => setSubmissionData(prev => ({ ...prev, attachments: prev.attachments.filter((_, i) => i !== idx)}))}
                                  className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover/sub:opacity-100 transition-opacity"
                                >
                                   <XCircle className="h-3 w-3" />
                                </button>
                              </div>
                            ))}
                            <label className="h-12 w-12 rounded-lg border-2 border-dashed border-slate-200 flex items-center justify-center cursor-pointer hover:border-brand-indigo hover:bg-brand-indigo/5 transition-all text-slate-300">
                               <Plus className="h-5 w-5" />
                               <input type="file" accept="image/*,application/pdf" className="hidden" onChange={handleSubmissionFileUpload} />
                            </label>
                         </div>
                         <button 
                           type="submit" 
                           disabled={submitting}
                           className="w-full py-4 bg-brand-indigo text-white rounded-2xl font-black text-xs shadow-lg shadow-brand-indigo/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                         >
                            {submitting ? 'Submitting...' : 'Submit Assignment'}
                         </button>
                      </form>
                   </div>
                </div>
              )}

              {activeModal === 'receipts' && (
                <div className="space-y-4">
                   {receipts.length > 0 ? receipts.map((receipt) => (
                     <div key={receipt.id} className="bg-slate-50 p-6 rounded-3xl border border-slate-100 flex items-center justify-between group hover:border-brand-indigo transition-colors cursor-pointer"
                       onClick={() => handlePrintReceipt(receipt)}
                     >
                        <div className="flex items-center gap-4">
                           <div className="h-12 w-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center">
                              <FileText className="h-6 w-6" />
                           </div>
                           <div>
                              <p className="text-sm font-black text-[#2B2D42]">{receipt.receipt_no}</p>
                              <p className="text-[10px] font-bold text-slate-400">{format(new Date(receipt.date), 'MMMM dd, yyyy')}</p>
                           </div>
                        </div>
                        <div className="text-right">
                           <p className="text-sm font-black text-brand-indigo">{formatCurrency(receipt.amount)}</p>
                           <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">{receipt.payment_status}</p>
                        </div>
                     </div>
                   )) : <div className="text-center py-10 text-slate-400 font-bold italic">No receipts generated yet.</div>}
                </div>
              )}

              {activeModal === 'receipt_detail' && selectedReceipt && (
                <div className="bg-white p-0">
                  <div className="flex items-center justify-between mb-4 no-print px-4">
                    <button 
                      onClick={() => setActiveModal('receipts')}
                      className="text-brand-indigo font-bold text-sm flex items-center gap-1"
                    >
                      <ArrowRight className="h-4 w-4 rotate-180" /> Back to list
                    </button>
                    <button 
                      onClick={() => window.print()}
                      className="p-3 bg-brand-indigo text-white rounded-2xl shadow-lg hover:bg-brand-indigo/90 transition-all flex items-center gap-2 text-xs font-bold"
                    >
                      <Printer className="h-4 w-4" /> Print Receipt
                    </button>
                  </div>
                  <div className="border border-slate-100 rounded-2xl overflow-hidden scale-[0.8] origin-top md:scale-100">
                    <ReceiptPrint 
                      receipt={selectedReceipt}
                      schoolName="Labbaik English School"
                      schoolAddress="Main Campus, Education Valley, New Delhi"
                      schoolPhone="+91 91234 56789"
                      schoolEmail="contact@labbaikschool.edu"
                    />
                  </div>
                </div>
              )}

              {activeModal === 'profile' && (
                <form onSubmit={handleUpdateProfile} className="space-y-4 pt-2">
                   <div className="flex flex-col items-center mb-6">
                      <div className="relative group">
                         <div className="h-24 w-24 rounded-[2rem] border-4 border-slate-50 overflow-hidden shadow-xl transition-transform group-hover:scale-105">
                            <img 
                              src={profileFormData.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profileFormData.name}`} 
                              className="h-full w-full object-cover bg-brand-indigo transition-transform" 
                              alt="avatar preview" 
                            />
                         </div>
                         <label className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-[2rem] cursor-pointer">
                            <Camera className="h-6 w-6 text-white" />
                            <input 
                              type="file" 
                              accept="image/*" 
                              className="hidden" 
                              onChange={handleImageUpload}
                            />
                         </label>
                      </div>
                      <p className="mt-2 text-[10px] font-black text-brand-indigo uppercase tracking-widest">Tap photo to change</p>
                   </div>

                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Your Name</label>
                      <input 
                        required
                        type="text"
                        value={profileFormData.name}
                        onChange={e => setProfileFormData({...profileFormData, name: e.target.value})}
                        className="w-full px-6 py-4 bg-slate-50 rounded-2xl border-transparent focus:ring-2 focus:ring-brand-indigo/20 text-sm font-bold transition-all"
                      />
                   </div>

                   <div className="flex gap-4 mt-6">
                      <button 
                        type="button"
                        onClick={() => setActiveModal(null)}
                        className="flex-1 py-4 bg-slate-100 text-slate-400 rounded-2xl font-black text-sm hover:bg-slate-200 transition-colors"
                      >
                        Cancel
                      </button>
                      <button 
                        type="submit" 
                        disabled={submitting}
                        className="flex-1 py-4 bg-[#2B2D42] text-white rounded-2xl font-black text-sm shadow-xl disabled:opacity-50 active:scale-95 transition-all"
                      >
                        {submitting ? 'Saving...' : 'Save Profile'}
                      </button>
                   </div>
                </form>
              )}

            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
