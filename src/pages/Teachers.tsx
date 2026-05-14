import React, { useEffect, useState } from 'react';
import { 
  Plus, 
  GraduationCap, 
  Search, 
  Mail, 
  Phone,
  X,
  ArrowRight,
  Edit2,
  Trash2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { dataService } from '../services/dataService';
import { cn } from '../lib/utils';
import { UserProfile } from '../types';

export default function Teachers() {
  const { profile } = useAuth();
  const { t } = useLanguage();
  const [teachers, setTeachers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<UserProfile | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    username: '',
    password: '',
    avatar_url: '',
    role: 'teacher' as any,
    class_assigned: '1',
    section_assigned: 'A',
    subject_assigned: 'General',
    assignments: [{ class: '1', section: 'A', subject: 'General' }],
    class_teacher_of: { class: '1', section: 'A' }
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!profile) return;
    
    setLoading(true);
    const unsubscribe = dataService.subscribeToTeachers(profile.school_id, (data) => {
      setTeachers(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [profile]);

  const handleAddTeacher = async (e: React.FormEvent) => {
     e.preventDefault();
     if (!profile) return;
     console.log("Submitting teacher data:", formData);
     setSubmitting(true);
     try {
       const finalData = {
         ...formData,
         email: formData.email.trim(),
         // Sync for backward compatibility with single-class queries
         class_assigned: formData.assignments[0]?.class || '1',
         section_assigned: formData.assignments[0]?.section || 'A',
         subject_assigned: formData.assignments[0]?.subject || 'General'
       };

       if (editingTeacher) {
         // Filter out credentials if they weren't changed or shouldn't be updated here
         const updateData = { ...finalData };
         // @ts-ignore
         delete updateData.password; 
         await dataService.updateUserProfile(editingTeacher.uid, updateData);
       } else {
         await dataService.addTeacher(profile.school_id, finalData);
       }
       setShowAddModal(false);
       setEditingTeacher(null);
       setFormData({
         name: '', email: '', phone: '', username: '', password: '', 
         avatar_url: '',
         role: 'teacher', class_assigned: '1', section_assigned: 'A', subject_assigned: 'General',
         assignments: [{ class: '1', section: 'A', subject: 'General' }],
         class_teacher_of: { class: '1', section: 'A' }
       });
     } catch (error) {
       console.error("Error saving teacher:", error);
       alert("Error saving teacher: " + (error instanceof Error ? error.message : String(error)));
     } finally {
       setSubmitting(false);
     }
  };

  const handleEdit = (teacher: UserProfile) => {
    setEditingTeacher(teacher);
    setFormData({
      name: teacher.name,
      email: teacher.email,
      phone: teacher.phone || '',
      username: teacher.username || '',
      password: '', // Don't show password
      avatar_url: teacher.avatar_url || '',
      role: teacher.role,
      class_assigned: teacher.class_assigned || '1',
      section_assigned: teacher.section_assigned || 'A',
      subject_assigned: teacher.subject_assigned || 'General',
      assignments: teacher.assignments || [{ class: teacher.class_assigned || '1', section: teacher.section_assigned || 'A', subject: teacher.subject_assigned || 'General' }],
      class_teacher_of: teacher.class_teacher_of || { class: '1', section: 'A' }
    });
    setShowAddModal(true);
  };

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleDelete = async (teacher: UserProfile) => {
    setDeletingId(teacher.uid);
    try {
      if (teacher.email) {
        const email = teacher.email.trim().toLowerCase();
        const duplicates = teachers.filter(t => t.email && t.email.trim().toLowerCase() === email).length;
        
        if (duplicates > 1) {
          if (profile) {
            await dataService.deleteTeachersByEmail(profile.school_id, email);
          }
        } else {
          await dataService.deleteUser(teacher.uid);
        }
      } else {
        await dataService.deleteUser(teacher.uid);
      }
      setDeleteConfirmId(null);
    } catch (error) {
      console.error("Error deleting teacher:", error);
      alert('Error deleting teacher: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setDeletingId(null);
    }
  };

  // Deduplicate teachers by email (hide session-based duplicate entries)
  const uniqueTeachers: UserProfile[] = Array.from(
    teachers.reduce((map, teacher) => {
      const email = (teacher.email || '').trim().toLowerCase();
      if (!email) {
        // If no email, treat it as a unique entry by UID
        map.set(teacher.uid, teacher);
        return map;
      }
      // Prefer the "original" record (one without is_session) if duplicates exist
      const existing = map.get(email);
      if (!existing || (existing.is_session && !teacher.is_session)) {
        map.set(email, teacher);
      }
      return map;
    }, new Map<string, UserProfile>()).values()
  );

  const filteredTeachers = uniqueTeachers.filter(t => 
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500 w-full overflow-x-hidden">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 min-w-0">
        <div className="min-w-0">
          <h1 className="text-3xl font-bold tracking-tight text-[#2B2D42] dark:text-white truncate">{t('teacher_directory')}</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 truncate">{t('manage_faculty')}</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-2 px-6 py-3 bg-brand-indigo text-white rounded-2xl font-bold hover:bg-[#3a4066] transition-all hover:scale-[1.02] active:scale-95 shadow-lg shadow-brand-indigo/20"
        >
          <Plus className="h-5 w-5" />
          {t('add_teacher')}
        </button>
      </header>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => !submitting && (setShowAddModal(false), setEditingTeacher(null))} />
          <div className="bg-white dark:bg-[#1E1E1E] w-full max-w-2xl relative z-10 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100 dark:border-white/5">
             <div className="p-8 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
                <div>
                   <h2 className="text-2xl font-bold text-[#2B2D42] dark:text-white">{editingTeacher ? t('update_faculty_member') : t('add_faculty_member')}</h2>
                   <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">{editingTeacher ? t('teacher_update_note') : t('teacher_profile_note')}</p>
                </div>
                <button onClick={() => { setShowAddModal(false); setEditingTeacher(null); }} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition-colors">
                   <X className="h-5 w-5 text-slate-400" />
                </button>
             </div>
             
             <form onSubmit={handleAddTeacher} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto scrollbar-none">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t('student_name')}</label>
                      <input 
                        required
                        type="text" 
                        value={formData.name}
                        onChange={e => setFormData({...formData, name: e.target.value})}
                        className="w-full px-5 py-4 bg-slate-50 dark:bg-white/5 dark:text-white rounded-2xl border-transparent focus:ring-2 focus:ring-brand-indigo/20 text-sm transition-all" 
                        placeholder="e.g. John Doe"
                      />
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t('email_address')}</label>
                      <input 
                        required
                        type="email" 
                        value={formData.email}
                        onChange={e => setFormData({...formData, email: e.target.value})}
                        className="w-full px-5 py-4 bg-slate-50 dark:bg-white/5 dark:text-white rounded-2xl border-transparent focus:ring-2 focus:ring-brand-indigo/20 text-sm transition-all" 
                        placeholder="teacher@school.com"
                      />
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t('username')}</label>
                      <input 
                        required
                        type="text" 
                        value={formData.username}
                        onChange={e => setFormData({...formData, username: e.target.value})}
                        className="w-full px-5 py-4 bg-slate-50 dark:bg-white/5 dark:text-white rounded-2xl border-transparent focus:ring-2 focus:ring-brand-indigo/20 text-sm transition-all font-mono" 
                        placeholder="t_jdoe"
                      />
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t('phone')}</label>
                      <input 
                        type="tel" 
                        value={formData.phone}
                        onChange={e => setFormData({...formData, phone: e.target.value})}
                        className="w-full px-5 py-4 bg-slate-50 dark:bg-white/5 dark:text-white rounded-2xl border-transparent focus:ring-2 focus:ring-brand-indigo/20 text-sm transition-all font-mono" 
                        placeholder="+1 234 567 890"
                      />
                   </div>
                   {!editingTeacher && (
                      <div className="space-y-2">
                         <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t('password')}</label>
                         <input 
                           required
                           type="password" 
                           value={formData.password}
                           onChange={e => setFormData({...formData, password: e.target.value})}
                           className="w-full px-5 py-4 bg-slate-50 dark:bg-white/5 dark:text-white rounded-2xl border-transparent focus:ring-2 focus:ring-brand-indigo/20 text-sm transition-all font-mono" 
                           placeholder="••••••••"
                         />
                      </div>
                   )}
                   <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Avatar URL</label>
                      <input 
                        type="url" 
                        value={formData.avatar_url}
                        onChange={e => setFormData({...formData, avatar_url: e.target.value})}
                        className="w-full px-5 py-4 bg-slate-50 dark:bg-white/5 dark:text-white rounded-2xl border-transparent focus:ring-2 focus:ring-brand-indigo/20 text-sm transition-all shadow-inner" 
                        placeholder="e.g. https://images.unsplash.com/photo-..."
                      />
                   </div>
                   <div className="space-y-4 col-span-full border-t border-slate-100 dark:border-white/5 pt-6">
                      <div className="flex items-center justify-between">
                         <h3 className="text-sm font-bold text-[#2B2D42] dark:text-white">{t('class_teacher_designation')}</h3>
                      </div>
                      <div className="grid grid-cols-2 gap-4 p-4 bg-brand-indigo/5 dark:bg-brand-indigo/10 rounded-2xl border border-brand-indigo/10">
                        <div className="space-y-1.5">
                           <label className="text-[9px] font-black text-brand-indigo uppercase tracking-[0.1em] ml-1">Class Teacher Of</label>
                           <select 
                             value={formData.class_teacher_of?.class || '1'}
                             onChange={e => setFormData({
                               ...formData, 
                               class_teacher_of: { ...(formData.class_teacher_of || { section: 'A' }), class: e.target.value }
                             })}
                             className="w-full px-3 py-2 bg-white dark:bg-slate-800 rounded-xl border-slate-100 dark:border-white/5 text-xs font-bold focus:ring-2 focus:ring-brand-indigo/10 transition-all dark:text-white"
                           >
                               {[1,2,3,4,5,6,7,8,9,10,11,12].map(num => <option key={num} value={String(num)}>{t('class_menu')} {num}</option>)}
                           </select>
                        </div>
                        <div className="space-y-1.5">
                           <label className="text-[9px] font-black text-brand-indigo uppercase tracking-[0.1em] ml-1">{t('section')}</label>
                           <select 
                             value={formData.class_teacher_of?.section || 'A'}
                             onChange={e => setFormData({
                               ...formData, 
                               class_teacher_of: { ...(formData.class_teacher_of || { class: '1' }), section: e.target.value }
                             })}
                             className="w-full px-3 py-2 bg-white dark:bg-slate-800 rounded-xl border-slate-100 dark:border-white/5 text-xs font-bold focus:ring-2 focus:ring-brand-indigo/10 transition-all font-mono dark:text-white"
                           >
                               {['A', 'B', 'C', 'D'].map(sec => <option key={sec} value={sec}>{sec}</option>)}
                           </select>
                        </div>
                      </div>
                   </div>

                   <div className="space-y-4 col-span-full border-t border-slate-100 dark:border-white/5 pt-6">
                      <div className="flex items-center justify-between">
                         <h3 className="text-sm font-bold text-[#2B2D42] dark:text-white">{t('class_assignments')}</h3>
                         <button 
                           type="button"
                           onClick={() => setFormData({
                             ...formData, 
                             assignments: [...formData.assignments, { class: '1', section: 'A', subject: 'General' }]
                           })}
                           className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-indigo/10 text-brand-indigo rounded-lg text-[10px] font-bold hover:bg-brand-indigo hover:text-white transition-all uppercase tracking-wider"
                         >
                            <Plus className="h-3 w-3" />
                            {t('add_assignment')}
                         </button>
                      </div>
                      
                      <div className="space-y-3">
                         {formData.assignments.map((assignment, index) => (
                           <div key={index} className="grid grid-cols-12 gap-3 items-end p-4 bg-slate-50 dark:bg-white/5 rounded-2xl relative group">
                              <div className="col-span-3 space-y-1.5">
                                 <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.1em] ml-1">{t('class_menu')}</label>
                                 <select 
                                   value={assignment.class}
                                   onChange={e => {
                                      const newAssignments = [...formData.assignments];
                                      newAssignments[index].class = e.target.value;
                                      setFormData({...formData, assignments: newAssignments});
                                   }}
                                   className="w-full px-3 py-2 bg-white dark:bg-slate-800 rounded-xl border-slate-100 dark:border-white/5 text-xs font-bold focus:ring-2 focus:ring-brand-indigo/10 transition-all dark:text-white"
                                 >
                                    {[1,2,3,4,5,6,7,8,9,10,11,12].map(num => <option key={num} value={String(num)}>{t('class_menu')} {num}</option>)}
                                 </select>
                              </div>
                              <div className="col-span-3 space-y-1.5">
                                 <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.1em] ml-1">{t('section')}</label>
                                 <select 
                                   value={assignment.section}
                                   onChange={e => {
                                      const newAssignments = [...formData.assignments];
                                      newAssignments[index].section = e.target.value;
                                      setFormData({...formData, assignments: newAssignments});
                                   }}
                                   className="w-full px-3 py-2 bg-white dark:bg-slate-800 rounded-xl border-slate-100 dark:border-white/5 text-xs font-bold focus:ring-2 focus:ring-brand-indigo/10 transition-all font-mono dark:text-white"
                                 >
                                    {['A', 'B', 'C', 'D'].map(sec => <option key={sec} value={sec}>{sec}</option>)}
                                 </select>
                              </div>
                              <div className="col-span-5 space-y-1.5">
                                 <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.1em] ml-1">{t('subject')}</label>
                                 <input 
                                   type="text"
                                   placeholder="e.g. Mathematics"
                                   value={assignment.subject}
                                   onChange={e => {
                                      const newAssignments = [...formData.assignments];
                                      newAssignments[index].subject = e.target.value;
                                      setFormData({...formData, assignments: newAssignments});
                                   }}
                                   className="w-full px-3 py-2 bg-white dark:bg-slate-800 rounded-xl border-slate-100 dark:border-white/5 text-xs font-bold focus:ring-2 focus:ring-brand-indigo/10 transition-all dark:text-white"
                                 />
                              </div>
                              <div className="col-span-1 pb-1 text-right">
                                 <button 
                                   type="button"
                                   disabled={formData.assignments.length <= 1}
                                   onClick={() => {
                                      const newAssignments = formData.assignments.filter((_, i) => i !== index);
                                      setFormData({...formData, assignments: newAssignments});
                                   }}
                                   className="p-2 text-rose-300 hover:text-rose-500 hover:bg-white rounded-lg transition-all disabled:opacity-30"
                                 >
                                    <X className="h-4 w-4" />
                                 </button>
                              </div>
                           </div>
                         ))}
                      </div>
                   </div>
                </div>

                <div className="p-6 bg-amber-50 rounded-[2rem] border border-amber-100 flex gap-4">
                   <div className="h-10 w-10 bg-amber-200 rounded-full shrink-0 flex items-center justify-center">
                      <Plus className="h-5 w-5 text-amber-700" />
                   </div>
                   <div>
                      <p className="text-xs font-bold text-amber-900">{t('security_note')}</p>
                      <p className="text-[10px] text-amber-700 font-medium">{t('security_note_desc')}</p>
                   </div>
                </div>

                <div className="flex gap-4 pt-4">
                   <button 
                     type="button"
                     disabled={submitting}
                     onClick={() => { setShowAddModal(false); setEditingTeacher(null); }}
                     className="flex-1 py-4 bg-slate-50 text-slate-400 rounded-2xl font-bold hover:bg-slate-100 transition-all font-sans"
                   >
                      {t('cancel')}
                   </button>
                   <button 
                     type="submit"
                     disabled={submitting}
                     className="flex-1 py-4 bg-brand-indigo text-white rounded-2xl font-bold hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-brand-indigo/20 flex items-center justify-center gap-2"
                   >
                      {submitting ? `${t('loading')}...` : <>{editingTeacher ? t('update_profile') : t('save_faculty')} <ArrowRight className="h-4 w-4" /></>}
                   </button>
                </div>
             </form>
          </div>
        </div>
      )}

      <div id="search-container" className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white dark:bg-[#1E1E1E] p-4 rounded-[2rem] border border-slate-100 dark:border-white/5 shadow-sm transition-colors duration-300">
         <div className="relative w-full min-w-0">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input 
              type="text" 
              placeholder={t('search_faculty_placeholder')}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-white/5 rounded-xl border-none focus:ring-2 focus:ring-brand-indigo/20 text-sm transition-all dark:text-white"
            />
         </div>
         <div className="flex items-center justify-end gap-3 px-4">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-brand-indigo animate-pulse"></div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{filteredTeachers.length} {t('active_listings')}</span>
            </div>
         </div>
      </div>

      <div className="bg-white dark:bg-[#1E1E1E] border border-slate-100 dark:border-white/5 rounded-[2.5rem] overflow-hidden shadow-sm transition-colors duration-300">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-white/5 border-b border-slate-100 dark:border-white/5">
                <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-slate-400">{t('teacher_directory')}</th>
                <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-slate-400">{t('contact_info')}</th>
                <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-slate-400">{t('academic_info')}</th>
                <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-slate-400 text-right">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="text-[#2B2D42] dark:text-white">
               {loading ? (
                  <tr>
                     <td colSpan={4} className="px-8 py-20 text-center text-slate-400 font-medium italic">{t('loading')}</td>
                  </tr>
               ) : filteredTeachers.length === 0 ? (
                  <tr>
                     <td colSpan={4} className="px-8 py-20 text-center text-slate-400 font-medium italic">{t('no_records')}</td>
                  </tr>
               ) : filteredTeachers.map((teacher) => (
                  <tr key={teacher.uid} className="border-b border-slate-50 dark:border-white/5 hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors group cursor-pointer">
                     <td className="px-8 py-5">
                        <div className="flex items-center gap-4">
                           <div className="h-12 w-12 rounded-2xl bg-brand-indigo/10 flex items-center justify-center font-bold text-brand-indigo overflow-hidden group-hover:shadow-lg transition-all duration-300">
                              {teacher.avatar_url ? (
                                <img src={teacher.avatar_url} alt={teacher.name} className="h-full w-full object-cover" />
                              ) : (
                                <span>{teacher.name.charAt(0)}</span>
                              )}
                           </div>
                           <div className="min-w-0">
                              <p className="font-bold text-sm truncate">{teacher.name}</p>
                              {teacher.class_teacher_of ? (
                                <div className="flex items-center gap-2 mt-0.5">
                                   <p className="text-[9px] text-brand-indigo font-black uppercase tracking-wider truncate bg-brand-indigo/5 dark:bg-brand-indigo/20 px-2 py-0.5 rounded-md border border-brand-indigo/10 w-fit">
                                     {t('class_teacher_label')}: {teacher.class_teacher_of.class}-{teacher.class_teacher_of.section}
                                   </p>
                                </div>
                              ) : (
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5 truncate">{t('primary_faculty')}</p>
                              )}
                           </div>
                        </div>
                     </td>
                     <td className="px-8 py-5 min-w-0">
                        <div className="space-y-1 min-w-0">
                           <p className="text-xs font-bold text-slate-600 dark:text-slate-400 truncate">{teacher.email}</p>
                           <p className="text-[10px] text-slate-400 font-medium truncate">{teacher.phone || 'No phone recorded'}</p>
                        </div>
                     </td>
                     <td className="px-8 py-5">
                        <div className="flex flex-wrap gap-1.5">
                           {teacher.assignments && teacher.assignments.length > 0 ? (
                             teacher.assignments.map((asg, idx) => (
                               <div key={idx} className="inline-flex items-center px-2 py-1 bg-brand-coral/5 dark:bg-brand-coral/10 rounded-lg text-[9px] font-black text-brand-coral border border-brand-coral/10 uppercase tracking-tighter">
                                 {asg.class}-{asg.section} : {asg.subject}
                               </div>
                             ))
                           ) : (
                             <div className="inline-flex items-center px-4 py-1.5 bg-brand-coral/10 rounded-xl text-[11px] font-bold text-brand-coral border border-brand-coral/10">
                                {teacher.class_assigned}-{teacher.section_assigned} : {teacher.subject_assigned || 'General'}
                             </div>
                           )}
                        </div>
                     </td>
                     <td className="px-8 py-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                           <button 
                             onClick={(e) => { e.stopPropagation(); handleEdit(teacher); }}
                             className="p-2.5 hover:bg-white dark:hover:bg-white/10 hover:shadow-md border border-transparent hover:border-slate-100 dark:hover:border-white/10 rounded-xl transition-all text-slate-400 hover:text-brand-indigo"
                             title={t('edit')}
                           >
                              <Edit2 className="h-4 w-4" />
                           </button>
                           
                           {deleteConfirmId === teacher.uid ? (
                              <div className="flex items-center gap-1 animate-in slide-in-from-right-2" onClick={e => e.stopPropagation()}>
                                <button 
                                  disabled={deletingId === teacher.uid}
                                  onClick={(e) => { e.stopPropagation(); handleDelete(teacher); }}
                                  className="px-3 py-2 bg-rose-500 text-white text-[10px] font-bold rounded-lg hover:bg-rose-600 transition-all shadow-sm"
                                >
                                  {deletingId === teacher.uid ? (
                                     <div className="h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                  ) : t('confirm')}
                                </button>
                                <button 
                                  onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(null); }}
                                  className="p-2 bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-400 rounded-lg hover:bg-slate-200 dark:hover:bg-white/20 transition-all"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                           ) : (
                              <button 
                                onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(teacher.uid); }}
                                className="p-2.5 hover:bg-white dark:hover:bg-white/10 hover:shadow-md border border-transparent hover:border-slate-100 dark:hover:border-white/10 rounded-xl transition-all text-slate-400 hover:text-rose-500"
                                title={t('delete')}
                              >
                                 <Trash2 className="h-4 w-4" />
                              </button>
                           )}
                        </div>
                     </td>
                  </tr>
               ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
