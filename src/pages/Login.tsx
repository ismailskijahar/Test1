import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { GraduationCap, ArrowRight, Lock, Mail, Users, UserCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import { Logo } from '../components/Logo';

export default function Login() {
  const { login, teacherLogin, parentLogin } = useAuth();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState<'school_admin' | 'teacher' | 'parent'>('school_admin');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [studentName, setStudentName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [error, setError] = useState('');

  const handleStaffLogin = async () => {
    setLoading(true);
    try {
      await login();
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleParentLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const success = await parentLogin(studentName, studentId);
      if (!success) {
        setError('Record not found. Please verify details.');
      }
    } catch (error) {
      setError('Connection error. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleTeacherLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const success = await teacherLogin(username, password);
      if (!success) {
        setError('Invalid username or password.');
      }
    } catch (err) {
      setError('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-bg flex items-center justify-center p-6 relative overflow-hidden font-sans">
      {/* Decorative Atmosphere */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand-coral/10 rounded-full blur-[120px]"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-brand-indigo/10 rounded-full blur-[100px]"></div>

      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 bg-white dark:bg-[#1E1E1E] rounded-[3rem] shadow-xl overflow-hidden relative z-10 border border-slate-100 dark:border-white/5">
        {/* Left Side */}
        <div className="bg-[#2B2D42] p-12 text-white flex flex-col justify-between relative group overflow-hidden">
           <div className="absolute inset-0 opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none">
              <div className="absolute top-20 left-10 w-40 h-40 border-2 border-white rounded-full"></div>
              <div className="absolute bottom-40 right-10 w-60 h-60 border-2 border-white rounded-full opacity-50"></div>
           </div>

           <div className="relative z-10">
              <Logo theme="dark" size="lg" />
           </div>

           <div className="space-y-6 relative z-10">
              <h2 className="text-4xl lg:text-5xl font-bold leading-tight">{t('elevate_school_hub')}</h2>
              <p className="text-slate-400 text-lg leading-relaxed max-w-sm">
                {role === 'parent' 
                  ? t('parent_portal_desc')
                  : t('admin_portal_desc')}
              </p>
           </div>

           <div className="flex items-center gap-4 relative z-10">
              <div className="flex -space-x-3">
                 {[1,2,3,4].map(i => <div key={i} className="h-8 w-8 rounded-full border-2 border-[#2B2D42] bg-slate-700"></div>)}
              </div>
              <p className="text-sm text-slate-400 font-medium tracking-wide">{t('join_parents')}</p>
           </div>
        </div>

        {/* Right Side */}
        <div className="p-12 lg:p-20 flex flex-col justify-center">
           <div className="mb-10 text-center md:text-left">
              <h3 className="text-3xl font-bold text-[#2B2D42] dark:text-white">
                {role === 'parent' ? t('parent_access') : t('portal_sign_in')}
              </h3>
              <p className="text-slate-400 mt-2 font-medium">{t('select_portal')}</p>
           </div>

           <div className="space-y-6">
              {/* Role Selection */}
              <div className="grid grid-cols-3 gap-3">
                 {[
                   { id: 'school_admin', icon: Lock, label: t('admin') },
                   { id: 'teacher', icon: GraduationCap, label: t('teacher') },
                   { id: 'parent', icon: Users, label: t('parent') }
                 ].map(opt => (
                   <button 
                     key={opt.id}
                     onClick={() => { setRole(opt.id as any); setError(''); }}
                     className={cn(
                       "py-4 flex flex-col items-center gap-2 text-[10px] font-bold uppercase tracking-widest rounded-2xl transition-all duration-300 border",
                       role === opt.id 
                        ? "bg-[#2B2D42] text-white border-transparent shadow-lg scale-105" 
                        : "bg-slate-50 dark:bg-white/5 text-slate-400 border-transparent hover:bg-slate-100 dark:hover:bg-white/10"
                     )}
                   >
                     <opt.icon className="h-5 w-5" />
                     {opt.label}
                   </button>
                 ))}
              </div>

              <div className="pt-4">
                {role === 'parent' ? (
                   <form onSubmit={handleParentLogin} className="space-y-4">
                    <div className="space-y-2">
                       <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">{t('student_full_name')}</label>
                       <input 
                         required
                         type="text"
                         value={studentName}
                         onChange={e => setStudentName(e.target.value)}
                         placeholder={t('student_name_placeholder') || "As registered in school"}
                         className="w-full px-6 py-4 bg-slate-50 dark:bg-white/5 rounded-2xl border-transparent focus:ring-2 focus:ring-brand-coral/20 text-sm text-slate-900 dark:text-white transition-all"
                       />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">{t('student_id_label')}</label>
                       <input 
                         required
                         type="text"
                         value={studentId}
                         onChange={e => setStudentId(e.target.value)}
                         placeholder="e.g. STU2024001"
                         className="w-full px-6 py-4 bg-slate-50 dark:bg-white/5 rounded-2xl border-transparent focus:ring-2 focus:ring-brand-coral/20 text-sm text-slate-900 dark:text-white transition-all"
                       />
                    </div>
                    
                    {error && <p className="text-rose-500 text-xs font-bold bg-rose-50 p-3 rounded-xl border border-rose-100">{error}</p>}
                    
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-5 bg-brand-coral text-white rounded-[1.5rem] font-bold text-sm hover:bg-[#e06d64] transition-all shadow-xl shadow-brand-coral/20 flex items-center justify-center gap-3 disabled:opacity-50"
                    >
                      {loading ? (
                        <div className="h-4 w-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                      ) : (
                        <>{t('enter_portal')} <ArrowRight className="h-4 w-4" /></>
                      )}
                    </button>
                  </form>
                ) : role === 'teacher' ? (
                   <form onSubmit={handleTeacherLogin} className="space-y-4">
                    <div className="space-y-2">
                       <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">{t('username_id')}</label>
                       <input 
                         required
                         type="text"
                         value={username}
                         onChange={e => setUsername(e.target.value)}
                         placeholder={t('teacher_username')}
                         className="w-full px-6 py-4 bg-slate-50 dark:bg-white/5 rounded-2xl border-transparent focus:ring-2 focus:ring-brand-indigo/20 text-sm text-slate-900 dark:text-white transition-all"
                       />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">{t('password')}</label>
                       <input 
                         required
                         type="password"
                         value={password}
                         onChange={e => setPassword(e.target.value)}
                         placeholder="••••••••"
                         className="w-full px-6 py-4 bg-slate-50 dark:bg-white/5 rounded-2xl border-transparent focus:ring-2 focus:ring-brand-indigo/20 text-sm text-slate-900 dark:text-white transition-all"
                       />
                    </div>
                    
                    {error && <p className="text-rose-500 text-xs font-bold bg-rose-50 p-3 rounded-xl border border-rose-100">{error}</p>}
                    
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-5 bg-brand-indigo text-white rounded-[1.5rem] font-bold text-sm hover:bg-opacity-90 transition-all shadow-xl shadow-brand-indigo/20 flex items-center justify-center gap-3 disabled:opacity-50"
                    >
                      {loading ? (
                        <div className="h-4 w-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                      ) : (
                        <>{t('sign_in')} <ArrowRight className="h-4 w-4" /></>
                      )}
                    </button>
                  </form>
                ) : (
                  <div className="space-y-4">
                    <p className="text-xs text-slate-400 font-medium text-center mb-6">{t('staff_auth_google')}</p>
                    <button
                      onClick={handleStaffLogin}
                      disabled={loading}
                      className="w-full flex items-center justify-center gap-4 px-8 py-5 bg-[#2B2D42] text-white rounded-[1.5rem] font-bold text-sm hover:bg-slate-900 transition-all shadow-xl shadow-slate-200 disabled:opacity-50"
                    >
                      {loading ? (
                        <div className="h-4 w-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                      ) : (
                        <img src="https://www.google.com/favicon.ico" className="w-4 h-4 bg-white rounded-md p-0.5" alt="G" />
                      )}
                      {t('continue_admin_portal')}
                    </button>
                  </div>
                )}
              </div>
           </div>
        </div>
      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-8 opacity-40">
         <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{t('secure_access_label')}</span>
         <div className="w-1 h-1 bg-slate-300 rounded-full"></div>
         <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">© 2024 AerovaX</span>
      </div>
    </div>
  );
}
