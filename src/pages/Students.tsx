import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Plus, 
  Search, 
  Filter, 
  MoreVertical, 
  Mail, 
  Phone,
  GraduationCap,
  X,
  ArrowRight,
  Printer,
  Pencil,
  Trash2,
  Fingerprint
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { dataService } from '../services/dataService';
import { feeEngine } from '../services/feeEngine';
import { Student, FeeStructure, StudentIdSettings } from '../types';
import { cn } from '../lib/utils';

export default function Students() {
  const { profile } = useAuth();
  const { t } = useLanguage();
  
  const [students, setStudents] = useState<Student[]>([]);
  const [feeStructures, setFeeStructures] = useState<FeeStructure[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'dropped'>('all');
  const [classFilter, setClassFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [idSettings, setIdSettings] = useState<StudentIdSettings | null>(null);
  const [liveIdPreview, setLiveIdPreview] = useState('');
  const [isGeneratingId, setIsGeneratingId] = useState(false);

  const filteredStudents = students.filter(student => {
    const matchesSearch = 
      student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.custom_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.roll_no.includes(searchQuery);
    
    const matchesStatus = 
      statusFilter === 'all' || 
      (statusFilter === 'active' && !student.is_dropout) ||
      (statusFilter === 'dropped' && student.is_dropout);
    
    const matchesClass = 
      classFilter === 'all' || 
      student.class === classFilter;

    return matchesSearch && matchesStatus && matchesClass;
  });

  const handlePrint = () => {
    setIsPrinting(true);
    setTimeout(() => {
      window.focus();
      window.print();
      setIsPrinting(false);
    }, 500);
  };

  const [newStudent, setNewStudent] = useState({
    custom_id: '',
    name: '',
    roll_no: '',
    class: '',
    section: '',
    dob: '',
    father_name: '',
    mother_name: '',
    address: '',
    father_phone: '',
    mother_phone: '',
    fee_structure_id: '',
    class_key: '',
    is_dropout: false
  });

  useEffect(() => {
    if (!profile) return;
    
    setLoading(true);
    const loadData = async () => {
      const structures = await dataService.getFeeStructures(profile.school_id);
      setFeeStructures(structures);
      
      const settings = await dataService.getStudentIdSettings(profile.school_id);
      setIdSettings(settings);
    };
    loadData();

    const unsubscribe = dataService.subscribeToStudents(profile.school_id, (data) => {
      setStudents(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [profile]);

  const handleEdit = (student: Student) => {
    setEditingStudent(student);
    setNewStudent({
      custom_id: student.custom_id,
      name: student.name,
      roll_no: student.roll_no,
      class: student.class,
      section: student.section,
      dob: student.dob || '',
      father_name: student.father_name || '',
      mother_name: student.mother_name || '',
      address: student.address || '',
      father_phone: student.father_phone || '',
      mother_phone: student.mother_phone || '',
      fee_structure_id: student.fee_structure_id || '',
      class_key: student.class_key || '',
      is_dropout: student.is_dropout || false
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (studentId: string) => {
    if (!profile) return;
    const success = await dataService.deleteStudent(profile.school_id, studentId);
    if (success) {
      setDeleteConfirmId(null);
    }
  };

  const resetForm = () => {
    setNewStudent({
      custom_id: '',
      name: '',
      roll_no: '',
      class: '',
      section: '',
      dob: '',
      father_name: '',
      mother_name: '',
      address: '',
      father_phone: '',
      mother_phone: '',
      fee_structure_id: '',
      class_key: '',
      is_dropout: false
    });
    setEditingStudent(null);
    setErrorMessage(null);
  };

  useEffect(() => {
    // Subscription handled in the other useEffect
  }, [profile]);

  useEffect(() => {
    const updatePreview = async () => {
      if (!idSettings || editingStudent || !profile) {
        setLiveIdPreview("");
        return;
      }

      const nextSerial = await dataService.peekNextStudentSerial(profile.school_id, {
        class: newStudent.class,
        section: newStudent.section
      });

      const now = new Date();
      const yearStr = idSettings.yearFormat === 'YYYY' ? now.getFullYear().toString() : now.getFullYear().toString().slice(-2);
      const serialStr = nextSerial.toString().padStart(idSettings.serialLength, '0');
      
      const preview = idSettings.format
        .replace('{SCHOOL}', idSettings.prefix)
        .replace('{YEAR}', yearStr)
        .replace('{CLASS}', newStudent.class || '??')
        .replace('{SECTION}', newStudent.section || '??')
        .replace('{ROLL}', newStudent.roll_no || '??')
        .replace('{SERIAL}', serialStr);
      
      setLiveIdPreview(preview);
    };

    updatePreview();
  }, [newStudent.class, newStudent.section, newStudent.roll_no, idSettings, editingStudent, profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setErrorMessage(null);

    // 1. Phone number validation (10 digits)
    const phoneRegex = /^\d{10}$/;
    if (!phoneRegex.test(newStudent.father_phone)) {
      setErrorMessage("Father's phone number must be exactly 10 digits.");
      return;
    }
    if (!phoneRegex.test(newStudent.mother_phone)) {
      setErrorMessage("Mother's phone number must be exactly 10 digits.");
      return;
    }

    let finalCustomId = newStudent.custom_id;

    if (!editingStudent) {
      setIsGeneratingId(true);
      try {
        finalCustomId = await dataService.generateStudentId(profile.school_id, {
          class: newStudent.class,
          section: newStudent.section,
          roll_no: newStudent.roll_no
        });
      } catch (err: any) {
        setErrorMessage(err.message || "Failed to generate unique Student ID.");
        setIsGeneratingId(false);
        return;
      }
      setIsGeneratingId(false);
    }
    
    if (editingStudent) {
      await dataService.updateStudent(profile.school_id, editingStudent.id, {
        ...newStudent
      });
    } else {
      const docRef = await dataService.addStudent(profile.school_id, {
        ...newStudent,
        custom_id: finalCustomId,
        school_id: profile.school_id
      });
      if (docRef) {
        // Trigger due engine for this new student
        await feeEngine.syncStudentDues(profile.school_id);
      }
    }
    
    setIsModalOpen(false);
    resetForm();
  };

  return (
    <div className="space-y-8 print:space-y-0">
      {/* Printable Area - Hidden on screen, shown on top during print */}
      <div id="print-only-layout" className="print-only">
        <div className="print-header">
           <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20pt', marginBottom: '8pt' }}>
             <GraduationCap style={{ width: '45pt', height: '45pt', color: '#000' }} />
             <div style={{ textAlign: 'center' }}>
               <h1 style={{ fontSize: '24pt', fontWeight: 'bold' }}>{profile?.school_name?.toUpperCase() || 'LABBAIK ENGLISH SCHOOL'}</h1>
               <p style={{ fontSize: '10pt', margin: '2pt 0' }}>FATEPUR, MAYA, LALGOLA, MURSHIDABAD (WB) | PH: 9876543210</p>
               <div style={{ padding: '4pt 20pt', border: '1pt solid black', display: 'inline-block', marginTop: '5pt', fontWeight: 'bold', fontSize: '9pt', textTransform: 'uppercase' }}>
                 GENERAL STUDENTS LIST
               </div>
             </div>
           </div>
        </div>

        <table className="print-table">
          <thead>
            <tr>
              <th style={{ width: '25pt' }}>SL NO</th>
              <th style={{ width: '50pt', textAlign: 'center' }}>ID</th>
              <th style={{ width: '130pt' }}>STUDENT NAME</th>
              <th style={{ width: '130pt' }}>FATHER NAME</th>
              <th style={{ width: '30pt' }}>CLASS</th>
              <th style={{ width: '30pt' }}>SEC</th>
              <th style={{ width: '30pt' }}>ROLL</th>
              <th style={{ width: '75pt' }}>PHONE</th>
              <th style={{ width: '75pt' }}>WHATSAPP</th>
            </tr>
          </thead>
          <tbody>
            {(filteredStudents.length > 0 ? filteredStudents : Array.from({ length: 20 })).map((s, index) => {
              const student = s as Student;
              return (
                <tr key={student?.id || index}>
                  <td style={{ textAlign: 'center' }}>{index + 1}</td>
                  <td style={{ fontSize: '7pt', textAlign: 'center' }}>{student?.custom_id || ''}</td>
                  <td style={{ fontWeight: 'bold' }}>{student?.name?.toUpperCase() || ''}</td>
                  <td>{student?.father_name || ''}</td>
                  <td style={{ textAlign: 'center' }}>{student?.class || ''}</td>
                  <td style={{ textAlign: 'center' }}>{student?.section || ''}</td>
                  <td style={{ textAlign: 'center' }}>{student?.roll_no || ''}</td>
                  <td>{student?.father_phone || ''}</td>
                  <td>{student?.father_phone || ''}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        
        <div className="print-footer" style={{ marginTop: '20pt', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderTop: '1pt solid #000', paddingTop: '10pt' }}>
          <div style={{ fontSize: '8pt' }}>
            <p>Total Records: <strong>{filteredStudents.length}</strong></p>
            <p>Generated: {new Date().toLocaleString()}</p>
          </div>
          <div style={{ textAlign: 'center', width: '180pt' }}>
            <div style={{ borderBottom: '1pt solid black', marginBottom: '4pt' }}></div>
            <p style={{ fontSize: '8pt', fontWeight: 'bold' }}>OFFICE SEAL & SIGNATURE</p>
          </div>
        </div>
      </div>

      {/* SCREEN UI - Hidden during printing */}
      <div className="no-print print:hidden space-y-8">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-[#2B2D42] dark:text-white">{t('student_directory')}</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">{t('manage_and_track_students')}</p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-6 py-3 bg-white dark:bg-white/5 border border-neutral-100 dark:border-white/10 text-neutral-700 dark:text-white rounded-2xl font-bold hover:bg-neutral-50 dark:hover:bg-white/10 transition-all shadow-sm"
            >
              <Printer className="h-5 w-5" />
              {isPrinting ? t('loading') : t('print_list')}
            </button>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-brand-coral text-white rounded-2xl font-bold hover:bg-[#d58a6d] transition-all hover:scale-[1.02] active:scale-95 shadow-lg shadow-brand-coral/20"
            >
              <Plus className="h-5 w-5" />
              {t('enroll_student')}
            </button>
          </div>
        </header>



        <div className="flex flex-col md:flex-row gap-4">
           <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
              <input 
                type="text" 
                placeholder={t('search_placeholder')} 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white dark:bg-white/5 border border-neutral-100 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-neutral-900 dark:focus:ring-brand-indigo focus:border-transparent text-sm shadow-sm dark:text-white transition-all duration-300"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 dark:hover:bg-white/10 rounded-full transition-colors"
                >
                  <X className="h-3 w-3 text-slate-400" />
                </button>
              )}
           </div>
           <div className="flex gap-2">
             <button 
               onClick={() => setShowFilters(!showFilters)}
               className={cn(
                 "inline-flex items-center gap-2 px-6 py-3 border rounded-2xl text-sm font-bold transition-all duration-300 shadow-sm",
                 showFilters 
                   ? "bg-brand-coral text-white border-transparent" 
                   : "bg-white dark:bg-white/5 border-neutral-100 dark:border-white/10 text-neutral-600 dark:text-slate-300 hover:bg-neutral-50 dark:hover:bg-white/10"
               )}
             >
                <Filter className="h-4 w-4" />
                {t('filters')}
                {(classFilter !== 'all' || statusFilter !== 'all') && (
                  <span className="ml-1 px-1.5 py-0.5 bg-black/10 dark:bg-white/20 rounded-lg text-[10px]">
                    {(classFilter !== 'all' ? 1 : 0) + (statusFilter !== 'all' ? 1 : 0)}
                  </span>
                )}
             </button>
           </div>
        </div>

        {/* Dynamic Filters Panel */}
        {showFilters && (
          <div className="bg-slate-50/50 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-3xl p-6 grid grid-cols-1 md:grid-cols-3 gap-6 animate-in slide-in-from-top-2 duration-300">
            <div className="space-y-3">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">{t('by_status')}</label>
              <div className="flex p-1 bg-white dark:bg-white/5 border border-neutral-100 dark:border-white/10 rounded-xl shadow-sm">
                {['all', 'active', 'dropped'].map((status) => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status as any)}
                    className={cn(
                      "flex-1 py-2 text-xs font-bold rounded-lg transition-all capitalize",
                      statusFilter === status 
                        ? "bg-[#2B2D42] text-white shadow-md" 
                        : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    )}
                  >
                    {t(status)}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">{t('by_class')}</label>
              <select
                value={classFilter}
                onChange={e => setClassFilter(e.target.value)}
                className="w-full px-4 py-2.5 bg-white dark:bg-white/5 border border-neutral-100 dark:border-white/10 rounded-xl text-xs font-bold text-[#2B2D42] dark:text-white focus:ring-2 focus:ring-brand-coral/20 outline-none transition-all shadow-sm"
              >
                <option value="all">{t('all')} {t('class_menu')}</option>
                {Array.from({length: 12}, (_, i) => i + 1).map(num => (
                  <option key={num} value={num.toString()}>{t('class_menu')} {num}</option>
                ))}
              </select>
            </div>

            <div className="flex items-end pb-0.5">
              <button 
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('all');
                  setClassFilter('all');
                }}
                className="text-xs font-bold text-slate-400 hover:text-rose-500 transition-colors flex items-center gap-2 ml-auto"
              >
                <X className="h-4 w-4" />
                {t('clear_filters')}
              </button>
            </div>
          </div>
        )}

        <div className="bg-white dark:bg-[#1E1E1E] border border-slate-100 dark:border-white/5 rounded-[2.5rem] overflow-hidden shadow-sm transition-colors duration-300">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-white/5 border-b border-slate-100 dark:border-white/5">
                  <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-slate-400">{t('student_name')}</th>
                  <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-slate-400">ID / {t('roll_no')}</th>
                  <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-slate-400">{t('parents')}</th>
                  <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-slate-400 text-center">{t('class_menu')} & {t('section')}</th>
                  <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-slate-400">{t('status')}</th>
                  <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-slate-400 text-right">{t('actions')}</th>
                </tr>
              </thead>
              <tbody className="text-[#2B2D42] dark:text-slate-300 transition-colors">
                 {loading ? (
                    <tr>
                       <td colSpan={6} className="px-8 py-20 text-center text-slate-400 font-medium italic">{t('loading')}</td>
                    </tr>
                 ) : filteredStudents.length === 0 ? (
                    <tr>
                       <td colSpan={6} className="px-8 py-20 text-center text-slate-400 font-medium italic">
                         {searchQuery || classFilter !== 'all' || statusFilter !== 'all' 
                           ? `${t('no_records')}`
                           : `${t('no_records')}`}
                       </td>
                    </tr>
                  ) : filteredStudents.map((student) => (
                    <tr key={student.id} className="border-b border-slate-50 dark:border-white/5 hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors group cursor-pointer">
                       <td className="px-8 py-5">
                          <div className="flex items-center gap-4">
                             <div className="h-12 w-12 rounded-2xl bg-slate-100 dark:bg-white/5 flex items-center justify-center font-bold text-slate-400 overflow-hidden group-hover:bg-[#2B2D42] dark:group-hover:bg-brand-indigo group-hover:text-white transition-all duration-300">
                                {student.avatar_url ? (
                                  <img src={student.avatar_url} alt={student.name} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                                ) : (
                                  student.name.charAt(0)
                                )}
                             </div>
                             <div>
                                <p className="font-bold text-sm tracking-tight">{student.name}</p>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">{student.dob || t('dob')}</p>
                             </div>
                          </div>
                       </td>
                       <td className="px-8 py-5">
                          <div className="space-y-1">
                             <p className="font-mono text-xs font-bold text-[#2B2D42] dark:text-white">{student.custom_id}</p>
                             <p className="text-[10px] text-slate-400 font-bold">{t('roll_no')}: {student.roll_no}</p>
                          </div>
                       </td>
                       <td className="px-8 py-5">
                          <div className="space-y-1">
                             <p className="text-xs font-bold text-slate-600 dark:text-slate-400">{student.father_name}</p>
                             <p className="text-[10px] text-slate-400 font-medium">{student.father_phone}</p>
                          </div>
                       </td>
                       <td className="px-8 py-5 text-center">
                          <div className="inline-flex items-center px-4 py-1.5 bg-slate-100 dark:bg-white/5 rounded-xl text-[11px] font-bold text-[#2B2D42] dark:text-white border border-slate-200/50 dark:border-white/5">
                             CL {student.class} • SEC {student.section}
                          </div>
                       </td>
                       <td className="px-8 py-5">
                          <div className={cn(
                             "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                             student.is_dropout ? "bg-rose-50 dark:bg-rose-500/10 text-rose-500" : "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600"
                          )}>
                             <div className={cn("h-1.5 w-1.5 rounded-full", student.is_dropout ? "bg-rose-500" : "bg-emerald-500")}></div>
                             {student.is_dropout ? t('dropped') : t('active')}
                          </div>
                       </td>
                       <td className="px-8 py-5 text-right">
                          <div className="flex justify-end gap-2">
                             <button 
                               onClick={() => handleEdit(student)}
                               className="p-2.5 bg-brand-coral/10 text-brand-coral hover:bg-brand-coral hover:text-white rounded-xl transition-all shadow-sm"
                               title={t('edit')}
                             >
                                <Pencil className="h-4 w-4" />
                             </button>
                             {deleteConfirmId === student.id ? (
                               <div className="flex items-center gap-1 animate-in slide-in-from-right-2">
                                 <button 
                                   onClick={() => handleDelete(student.id)}
                                   className="px-3 py-2 bg-rose-500 text-white text-[10px] font-bold rounded-lg hover:bg-rose-600 transition-all shadow-sm"
                                 >
                                   {t('confirm')}
                                 </button>
                                 <button 
                                   onClick={() => setDeleteConfirmId(null)}
                                   className="p-2 bg-slate-100 text-slate-500 rounded-lg hover:bg-slate-200 transition-all"
                                 >
                                   <X className="h-4 w-4" />
                                 </button>
                               </div>
                             ) : (
                               <button 
                                 onClick={() => setDeleteConfirmId(student.id)}
                                 className="p-2.5 bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white rounded-xl transition-all shadow-sm"
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

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#2B2D42]/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white dark:bg-[#1E1E1E] w-full max-w-3xl rounded-[2.5rem] shadow-2xl my-8 overflow-hidden animate-in fade-in zoom-in duration-200 transition-colors">
            <div className="p-8 border-b border-slate-100 dark:border-white/5 flex items-center justify-between sticky top-0 bg-white dark:bg-[#1E1E1E] z-10">
              <div>
                 <h2 className="text-2xl font-bold tracking-tight text-[#2B2D42] dark:text-white">
                   {editingStudent ? t('edit') : t('enroll_student')}
                 </h2>
                 <p className="text-slate-400 text-sm font-medium">
                   {editingStudent ? t('update_student') : t('add_comprehensive_records')}
                 </p>
              </div>
              <button 
                onClick={() => {
                  setIsModalOpen(false);
                  resetForm();
                }}
                className="p-2 hover:bg-slate-50 dark:hover:bg-white/5 rounded-full transition-colors"
              >
                 <X className="h-6 w-6 text-slate-300" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
               {errorMessage && (
                 <div className="p-4 bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/20 rounded-2xl text-rose-500 text-xs font-bold animate-in fade-in slide-in-from-top-1">
                   {errorMessage}
                 </div>
               )}
               {/* Academic Information */}
               <section className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                     <div className="h-8 w-1 bg-brand-coral rounded-full"></div>
                     <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400">{t('academic_info')}</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                       <label className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-1">{t('student_id')}</label>
                       <div className="relative">
                          <input 
                            disabled
                            readOnly
                            type="text" 
                            value={editingStudent ? newStudent.custom_id : (liveIdPreview || "System-Generated")}
                            className={cn(
                              "w-full px-5 py-3.5 bg-slate-100 dark:bg-white/5 dark:text-white rounded-2xl border-none text-sm font-mono tracking-wider cursor-not-allowed",
                              !editingStudent && "text-brand-indigo font-black"
                            )}
                          />
                          {!editingStudent && (
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-brand-indigo/10 text-brand-indigo rounded-lg">
                               <Fingerprint className="h-4 w-4" />
                            </div>
                          )}
                       </div>
                       {!editingStudent && (
                         <div className="flex items-center gap-2 mt-1 ml-2">
                           <div className="h-1.5 w-1.5 bg-brand-indigo animate-pulse rounded-full"></div>
                           <p className="text-[9px] text-brand-indigo font-bold uppercase tracking-widest">Real-time Preview</p>
                         </div>
                       )}
                    </div>
                    <div className="space-y-2">
                       <label className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-1">{t('student_name')}</label>
                       <input 
                         required
                         type="text" 
                         value={newStudent.name}
                         onChange={e => setNewStudent({...newStudent, name: e.target.value})}
                         placeholder={t('full_name')}
                         className="w-full px-5 py-3.5 bg-slate-50 dark:bg-white/5 dark:text-white rounded-2xl border-none focus:ring-2 focus:ring-brand-coral/20 text-sm placeholder:text-slate-300 transition-all"
                       />
                    </div>
                    <div className="space-y-2">
                       <label className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-1">{t('dob')}</label>
                       <input 
                         required
                         type="date" 
                         value={newStudent.dob}
                         onChange={e => setNewStudent({...newStudent, dob: e.target.value})}
                         className="w-full px-5 py-3.5 bg-slate-50 dark:bg-white/5 dark:text-white rounded-2xl border-none focus:ring-2 focus:ring-brand-coral/20 text-sm transition-all"
                       />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-1">{t('class_menu')}</label>
                          <select 
                            required
                            value={newStudent.class}
                            onChange={e => setNewStudent({...newStudent, class: e.target.value})}
                            className="w-full px-5 py-3.5 bg-slate-50 dark:bg-white/5 dark:text-white rounded-2xl border-none focus:ring-2 focus:ring-brand-coral/20 text-sm transition-all"
                          >
                             <option value="">{t('all')}</option>
                             {Array.from({length: 12}, (_, i) => i + 1).map(num => (
                               <option key={num} value={num.toString()}>{t('class_menu')} {num}</option>
                             ))}
                          </select>
                       </div>
                       <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-1">{t('section')}</label>
                          <select 
                            required
                            value={newStudent.section}
                            onChange={e => setNewStudent({...newStudent, section: e.target.value})}
                            className="w-full px-5 py-3.5 bg-slate-50 dark:bg-white/5 dark:text-white rounded-2xl border-none focus:ring-2 focus:ring-brand-coral/20 text-sm transition-all"
                          >
                             <option value="">{t('all')}</option>
                             <option value="A">A</option>
                             <option value="B">B</option>
                             <option value="C">C</option>
                          </select>
                       </div>
                    </div>
                    <div className="space-y-2">
                       <label className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-1">{t('roll_no')}</label>
                       <input 
                         required
                         type="text" 
                         value={newStudent.roll_no}
                         onChange={e => setNewStudent({...newStudent, roll_no: e.target.value})}
                         placeholder="e.g. 01"
                         className="w-full px-5 py-3.5 bg-slate-50 dark:bg-white/5 dark:text-white rounded-2xl border-none focus:ring-2 focus:ring-brand-coral/20 text-sm placeholder:text-slate-300 transition-all"
                       />
                    </div>
                  </div>
               </section>

               {/* Parental Information */}
               <section className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                     <div className="h-8 w-1 bg-brand-indigo rounded-full"></div>
                     <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400">{t('parent_info')}</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                       <label className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-1">{t('father_name')}</label>
                       <input 
                         required
                         type="text" 
                         value={newStudent.father_name}
                         onChange={e => setNewStudent({...newStudent, father_name: e.target.value})}
                         className="w-full px-5 py-3.5 bg-slate-50 dark:bg-white/5 dark:text-white rounded-2xl border-none focus:ring-2 focus:ring-brand-indigo/20 text-sm transition-all"
                       />
                    </div>
                    <div className="space-y-2">
                       <label className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-1">{t('mother_name')}</label>
                       <input 
                         required
                         type="text" 
                         value={newStudent.mother_name}
                         onChange={e => setNewStudent({...newStudent, mother_name: e.target.value})}
                         className="w-full px-5 py-3.5 bg-slate-50 dark:bg-white/5 dark:text-white rounded-2xl border-none focus:ring-2 focus:ring-brand-indigo/20 text-sm transition-all"
                       />
                    </div>
                    <div className="space-y-2">
                       <label className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-1">{t('phone')}</label>
                       <input 
                         required
                         type="tel" 
                         maxLength={10}
                         pattern="[0-9]*"
                         value={newStudent.father_phone}
                         onChange={e => setNewStudent({...newStudent, father_phone: e.target.value.replace(/\D/g, '')})}
                         className="w-full px-5 py-3.5 bg-slate-50 dark:bg-white/5 dark:text-white rounded-2xl border-none focus:ring-2 focus:ring-brand-indigo/20 text-sm transition-all"
                       />
                    </div>
                    <div className="space-y-2">
                       <label className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-1">{t('phone')}</label>
                       <input 
                         required
                         type="tel" 
                         maxLength={10}
                         pattern="[0-9]*"
                         value={newStudent.mother_phone}
                         onChange={e => setNewStudent({...newStudent, mother_phone: e.target.value.replace(/\D/g, '')})}
                         className="w-full px-5 py-3.5 bg-slate-50 dark:bg-white/5 dark:text-white rounded-2xl border-none focus:ring-2 focus:ring-brand-indigo/20 text-sm transition-all"
                       />
                    </div>
                    <div className="md:col-span-2 space-y-2">
                       <label className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-1">{t('address')}</label>
                       <textarea 
                         required
                         rows={2}
                         value={newStudent.address}
                         onChange={e => setNewStudent({...newStudent, address: e.target.value})}
                         className="w-full px-5 py-3.5 bg-slate-50 dark:bg-white/5 dark:text-white rounded-2xl border-none focus:ring-2 focus:ring-brand-indigo/20 text-sm transition-all resize-none"
                       />
                    </div>
                  </div>
               </section>

               {/* Fee Information - Automated */}
               <section className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                     <div className="h-8 w-1 bg-yellow-400 rounded-full"></div>
                     <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400">Automated Fee Profile</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                       <label className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-1">Fee Structure (Selected based on Class)</label>
                       <select 
                         required
                         value={newStudent.fee_structure_id}
                         onChange={e => {
                           const structure = feeStructures.find(fs => fs.id === e.target.value);
                           if (structure) {
                             setNewStudent({
                               ...newStudent, 
                               fee_structure_id: structure.id,
                               class_key: structure.class_key,
                               class: structure.class_name // Sync class name
                             });
                           } else {
                             setNewStudent({...newStudent, fee_structure_id: e.target.value});
                           }
                         }}
                         className="w-full px-5 py-3.5 bg-slate-50 dark:bg-white/5 dark:text-white rounded-2xl border-none focus:ring-2 focus:ring-yellow-400/20 text-sm transition-all"
                       >
                          <option value="">Select Structure</option>
                          {feeStructures.map(fs => (
                            <option key={fs.id} value={fs.id}>{fs.class_name} (Structure: {fs.class_key})</option>
                          ))}
                       </select>
                    </div>

                    <div className="p-4 bg-yellow-50 dark:bg-yellow-400/5 rounded-2xl flex flex-col justify-center">
                       {newStudent.fee_structure_id ? (
                         <>
                           <div className="flex justify-between items-center text-xs">
                              <span className="text-slate-500">Monthly Tuition:</span>
                              <span className="font-bold text-[#2B2D42] dark:text-white">
                                ¥{feeStructures.find(fs => fs.id === newStudent.fee_structure_id)?.monthly_fee}
                              </span>
                           </div>
                           <div className="flex justify-between items-center text-xs mt-1">
                              <span className="text-slate-500">Admission Fee:</span>
                              <span className="font-bold text-[#2B2D42] dark:text-white">
                                ¥{feeStructures.find(fs => fs.id === newStudent.fee_structure_id)?.admission_fee}
                              </span>
                           </div>
                         </>
                       ) : (
                         <p className="text-[10px] text-slate-400 italic">Select a class/structure to view amounts</p>
                       )}
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-400 italic">Fee amounts are automatically fetched from the class-wise structure. No manual input required.</p>
               </section>

               <div className="pt-8">
                  <button 
                    type="submit"
                    disabled={isGeneratingId}
                    className="w-full py-5 bg-[#2B2D42] text-white rounded-[1.5rem] font-bold hover:bg-slate-900 transition-all shadow-xl shadow-slate-200 flex items-center justify-center gap-3 disabled:opacity-70 disabled:cursor-wait"
                  >
                    {isGeneratingId ? "Generating Unique ID..." : editingStudent ? t('save') : t('complete_registration')}
                    <ArrowRight className="h-5 w-5" />
                  </button>
               </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
