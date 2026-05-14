import React, { useState, useEffect } from 'react';
import { 
  User, 
  Camera, 
  Moon, 
  Sun, 
  LogOut, 
  Palette,
  Shield,
  Bell,
  Fingerprint,
  RefreshCw,
  Hash,
  Link,
  Code,
  ChevronDown
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { dataService } from '../services/dataService';
import { cn } from '../lib/utils';
import { useLanguage } from '../context/LanguageContext';
import { motion, AnimatePresence } from 'motion/react';
import { StudentIdSettings } from '../types';

export default function Settings() {
  const { profile, logout, updateProfile } = useAuth();
  const { t } = useLanguage();
  const isAdmin = profile && ['super_admin', 'school_admin'].includes(profile.role);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const isTeacher = profile?.role === 'teacher';
    const themeKey = isTeacher ? 'teacher_theme' : 'admin_theme';
    return (localStorage.getItem(themeKey) as 'light' | 'dark') || 'light';
  });
  const [submitting, setSubmitting] = useState(false);
  const [profileFormData, setProfileFormData] = useState({
    name: profile?.name || '',
    avatar_url: profile?.avatar_url || ''
  });

  // Student ID Settings State
  const [idSettings, setIdSettings] = useState<StudentIdSettings | null>(null);
  const [loadingIdSettings, setLoadingIdSettings] = useState(false);
  const [savingIdSettings, setSavingIdSettings] = useState(false);
  const [idPreview, setIdPreview] = useState('');
  const [isIdSettingsExpanded, setIsIdSettingsExpanded] = useState(false);

  useEffect(() => {
    if (profile && isAdmin) {
      fetchIdSettings();
    }
  }, [profile, isAdmin]);

  const fetchIdSettings = async () => {
    if (!profile?.school_id) return;
    setLoadingIdSettings(true);
    const settings = await dataService.getStudentIdSettings(profile.school_id);
    if (settings) {
      setIdSettings(settings);
    }
    setLoadingIdSettings(false);
  };

  useEffect(() => {
    if (idSettings) {
      generatePreview();
    }
  }, [idSettings]);

  const generatePreview = () => {
    if (!idSettings) return;
    const now = new Date();
    const yearStr = idSettings.yearFormat === 'YYYY' ? now.getFullYear().toString() : now.getFullYear().toString().slice(-2);
    const serialStr = "1".padStart(idSettings.serialLength, '0');
    
    const preview = idSettings.format
      .replace('{SCHOOL}', idSettings.prefix)
      .replace('{YEAR}', yearStr)
      .replace('{CLASS}', '5')
      .replace('{SECTION}', 'A')
      .replace('{ROLL}', '12')
      .replace('{SERIAL}', serialStr);
    
    setIdPreview(preview);
  };

  const handleUpdateIdSettings = async () => {
    if (!profile?.school_id || !idSettings) return;
    setSavingIdSettings(true);
    const success = await dataService.updateStudentIdSettings(profile.school_id, idSettings);
    if (success) {
      alert("Student ID settings updated successfully!");
    } else {
      alert("Failed to update Student ID settings.");
    }
    setSavingIdSettings(false);
  };

  const presets = [
    { name: 'Standard', format: '{SCHOOL}-{YEAR}-{SERIAL}', prefix: 'LES', serial: 4 },
    { name: 'Advanced', format: '{SCHOOL}-STU-{YEAR}-{SERIAL}', prefix: 'ARX', serial: 4 },
    { name: 'Compact', format: '{SCHOOL}{YEAR}{SERIAL}', prefix: 'AX', serial: 5 },
    { name: 'Slash Format', format: '{SCHOOL}/{YEAR}/{SERIAL}', prefix: 'LES', serial: 4 },
    { name: 'Year First', format: '{YEAR}-{SCHOOL}-{SERIAL}', prefix: 'LES', serial: 4 },
    { name: 'Class Based', format: '{SCHOOL}-{CLASS}{SECTION}-{SERIAL}', prefix: 'LES', serial: 4 },
    { name: 'Modern', format: 'STD-{YEAR}-{SERIAL}', prefix: 'STD', serial: 6 }
  ];

  const applyPreset = (preset: typeof presets[0]) => {
    if (!idSettings) return;
    setIdSettings({
      ...idSettings,
      format: preset.format,
      prefix: preset.prefix,
      serialLength: preset.serial
    });
  };

  useEffect(() => {
    if (profile) {
      setProfileFormData({
        name: profile.name,
        avatar_url: profile.avatar_url || ''
      });
    }
  }, [profile]);

  useEffect(() => {
    const isAdmin = profile && ['super_admin', 'school_admin', 'accountant'].includes(profile.role);
    const isTeacher = profile?.role === 'teacher';
    const themeKey = isTeacher ? 'teacher_theme' : 'admin_theme';
    
    localStorage.setItem(themeKey, theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme, profile]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
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
      updateProfile(profileFormData);
      alert("Profile updated successfully!");
    } catch (error) {
      console.error("Error updating profile:", error);
      alert("Failed to update profile.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black text-[#2B2D42] dark:text-white">{t('settings')}</h2>
          <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mt-1">{t('manage_account_desc')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile Section */}
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white dark:bg-[#1E1E1E] p-8 rounded-[2.5rem] shadow-xl border border-white dark:border-white/5 transition-colors duration-300">
            <div className="flex items-center gap-4 mb-8">
              <div className="h-12 w-12 bg-brand-indigo/10 rounded-2xl flex items-center justify-center">
                <User className="h-6 w-6 text-brand-indigo" />
              </div>
              <h3 className="text-lg font-bold text-[#2B2D42] dark:text-white">{t('profile_information')}</h3>
            </div>

            <form onSubmit={handleUpdateProfile} className="space-y-6">
              <div className="flex flex-col sm:flex-row items-center gap-8 mb-8">
                <div className="relative group">
                  <div className="h-32 w-32 rounded-[2.5rem] border-4 border-slate-50 dark:border-white/10 overflow-hidden shadow-2xl transition-all group-hover:scale-105">
                    <img 
                      src={profileFormData.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profileFormData.name}`} 
                      className="h-full w-full object-cover bg-brand-indigo" 
                      alt="avatar" 
                    />
                  </div>
                  <label className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-[2.5rem] cursor-pointer">
                    <Camera className="h-8 w-8 text-white" />
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                  </label>
                </div>
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-bold text-[#2B2D42] dark:text-white">{t('profile_picture')}</p>
                  <p className="text-xs text-slate-400">Click the photo to upload a new avatar. Recommended size: 400x400px.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">{t('student_name')}</label>
                  <input 
                    required
                    type="text"
                    value={profileFormData.name}
                    onChange={e => setProfileFormData({...profileFormData, name: e.target.value})}
                    className="w-full px-6 py-4 bg-slate-50 dark:bg-white/5 dark:text-white rounded-2xl border-transparent focus:ring-4 focus:ring-brand-indigo/10 text-sm font-bold transition-all"
                    placeholder="Enter your name"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">{t('email')}</label>
                  <input 
                    disabled
                    type="email"
                    value={profile?.email || ''}
                    className="w-full px-6 py-4 bg-slate-100 dark:bg-white/5 text-slate-400 rounded-2xl border-transparent text-sm font-bold cursor-not-allowed"
                  />
                  <p className="text-[9px] text-slate-400 ml-4 italic">Email cannot be changed.</p>
                </div>
              </div>

              <button 
                type="submit" 
                disabled={submitting}
                className="w-full py-5 bg-[#2B2D42] dark:bg-brand-indigo text-white rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
              >
                {submitting ? `${t('loading')}...` : t('save')}
              </button>
            </form>
          </div>

          {isAdmin && (
            <div className="bg-white dark:bg-[#1E1E1E] p-6 md:p-8 rounded-[2.5rem] shadow-xl border border-white dark:border-white/5 transition-colors duration-300">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 md:h-12 md:w-12 bg-brand-indigo/10 rounded-xl md:rounded-2xl flex items-center justify-center shrink-0">
                    <Fingerprint className="h-5 w-5 md:h-6 md:w-6 text-brand-indigo" />
                  </div>
                  <div>
                    <h3 className="text-base md:text-lg font-bold text-[#2B2D42] dark:text-white">Student ID Settings</h3>
                    <p className="text-[10px] md:text-xs text-slate-400 font-medium">Configure automatic ID generation structure</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={fetchIdSettings}
                    disabled={loadingIdSettings}
                    className="p-2.5 md:p-3 bg-slate-50 dark:bg-white/5 text-slate-400 rounded-xl md:rounded-2xl hover:text-brand-indigo transition-all"
                  >
                    <RefreshCw className={cn("h-4 w-4 md:h-5 md:w-5", loadingIdSettings && "animate-spin")} />
                  </button>
                  <button 
                    onClick={() => setIsIdSettingsExpanded(!isIdSettingsExpanded)}
                    className={cn(
                      "flex-1 md:flex-none px-4 md:px-5 py-2.5 md:py-3 rounded-xl md:rounded-2xl font-bold text-[9px] md:text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2",
                      isIdSettingsExpanded 
                        ? "bg-slate-100 dark:bg-white/5 text-slate-500" 
                        : "bg-brand-indigo text-white shadow-lg shadow-brand-indigo/20"
                    )}
                  >
                    {isIdSettingsExpanded ? "Hide" : "Configure Structure"}
                    <ChevronDown className={cn("h-3.5 w-3.5 md:h-4 md:w-4 transition-transform duration-300", isIdSettingsExpanded && "rotate-180")} />
                  </button>
                </div>
              </div>

              <AnimatePresence>
                {isIdSettingsExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0, marginTop: 0 }}
                    animate={{ height: "auto", opacity: 1, marginTop: 32 }}
                    exit={{ height: 0, opacity: 0, marginTop: 0 }}
                    className="overflow-hidden"
                  >
                    {loadingIdSettings ? (
                      <div className="py-12 text-center text-slate-400 italic">Loading settings...</div>
                    ) : idSettings ? (
                      <div className="space-y-8">
                        {/* Preview Card */}
                        <div className="p-6 bg-slate-50 dark:bg-black/20 rounded-[2rem] border-2 border-dashed border-slate-200 dark:border-white/10">
                          <div className="flex items-center justify-between mb-4">
                             <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Live Preview Result</p>
                             <div className="px-3 py-1 bg-emerald-500/10 text-emerald-500 rounded-full text-[10px] font-black uppercase tracking-widest">Active Format</div>
                          </div>
                          <div className="flex items-center gap-4">
                             <div className="h-16 w-16 bg-white dark:bg-white/5 rounded-2xl flex items-center justify-center shadow-sm">
                                <Code className="h-8 w-8 text-brand-indigo" />
                             </div>
                             <p className="text-3xl font-black text-[#2B2D42] dark:text-white tracking-tight">{idPreview}</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">ID Format (Custom Builder)</label>
                             <div className="relative">
                                <input 
                                  type="text"
                                  value={idSettings.format}
                                  onChange={e => setIdSettings({...idSettings, format: e.target.value})}
                                  className="w-full pl-12 pr-6 py-4 bg-slate-50 dark:bg-white/5 dark:text-white rounded-2xl border-transparent focus:ring-4 focus:ring-brand-indigo/10 text-sm font-bold transition-all"
                                  placeholder="{SCHOOL}-{YEAR}-{SERIAL}"
                                />
                                <Code className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300" />
                             </div>
                             <div className="flex flex-wrap gap-2 mt-2 px-2">
                                {['{SCHOOL}', '{YEAR}', '{CLASS}', '{SECTION}', '{SERIAL}'].map(token => (
                                  <button 
                                    key={token}
                                    onClick={() => setIdSettings({...idSettings, format: idSettings.format + token})}
                                    className="text-[10px] font-black text-brand-indigo bg-brand-indigo/5 px-2 py-1 rounded-lg hover:bg-brand-indigo/10 transition-colors"
                                  >
                                    {token}
                                  </button>
                                ))}
                             </div>
                          </div>

                          <div className="space-y-2">
                             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">School Prefix</label>
                             <div className="relative">
                                <input 
                                  type="text"
                                  value={idSettings.prefix}
                                  onChange={e => setIdSettings({...idSettings, prefix: e.target.value})}
                                  className="w-full pl-12 pr-6 py-4 bg-slate-50 dark:bg-white/5 dark:text-white rounded-2xl border-transparent focus:ring-4 focus:ring-brand-indigo/10 text-sm font-bold transition-all"
                                  placeholder="LES"
                                />
                                <Link className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300" />
                             </div>
                          </div>

                          <div className="space-y-2">
                             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Serial Number Length</label>
                             <div className="relative">
                                <input 
                                  type="number"
                                  min="3"
                                  max="8"
                                  value={idSettings.serialLength}
                                  onChange={e => setIdSettings({...idSettings, serialLength: parseInt(e.target.value) || 4})}
                                  className="w-full pl-12 pr-6 py-4 bg-slate-50 dark:bg-white/5 dark:text-white rounded-2xl border-transparent focus:ring-4 focus:ring-brand-indigo/10 text-sm font-bold transition-all"
                                />
                                <Hash className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300" />
                             </div>
                          </div>

                          <div className="space-y-2">
                             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Year Format</label>
                             <div className="flex gap-4">
                                {['YYYY', 'YY'].map(y => (
                                  <button 
                                    key={y}
                                    onClick={() => setIdSettings({...idSettings, yearFormat: y as any})}
                                    className={cn(
                                      "flex-1 py-4 px-6 rounded-2xl text-xs font-black transition-all border-2",
                                      idSettings.yearFormat === y 
                                        ? "bg-brand-indigo/5 border-brand-indigo text-brand-indigo" 
                                        : "bg-slate-50 dark:bg-white/5 border-transparent text-slate-400"
                                    )}
                                  >
                                    {y}
                                  </button>
                                ))}
                             </div>
                          </div>
                        </div>

                        <div className="space-y-4">
                           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Serial Counter Mode</p>
                           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <button 
                                onClick={() => setIdSettings({...idSettings, useClassBasedSerial: !idSettings.useClassBasedSerial})}
                                className={cn(
                                  "p-5 rounded-[1.5rem] border-2 transition-all flex items-center justify-between",
                                  idSettings.useClassBasedSerial 
                                    ? "bg-brand-indigo/5 border-brand-indigo" 
                                    : "bg-slate-50 dark:bg-white/5 border-transparent"
                                )}
                              >
                                 <div className="text-left">
                                    <p className={cn("text-xs font-black", idSettings.useClassBasedSerial ? "text-brand-indigo" : "text-slate-400")}>Class Based Serial</p>
                                    <p className="text-[9px] font-medium text-slate-400">Restarts for each class</p>
                                 </div>
                                 <div className={cn("h-2 w-2 rounded-full", idSettings.useClassBasedSerial ? "bg-emerald-500" : "bg-slate-300")} />
                              </button>
                              <button 
                                disabled={!idSettings.useClassBasedSerial}
                                onClick={() => setIdSettings({...idSettings, useSectionBasedSerial: !idSettings.useSectionBasedSerial})}
                                className={cn(
                                  "p-5 rounded-[1.5rem] border-2 transition-all flex items-center justify-between",
                                  idSettings.useSectionBasedSerial 
                                    ? "bg-brand-indigo/5 border-brand-indigo" 
                                    : "bg-slate-50 dark:bg-white/5 border-transparent",
                                  !idSettings.useClassBasedSerial && "opacity-50 cursor-not-allowed"
                                )}
                              >
                                 <div className="text-left">
                                    <p className={cn("text-xs font-black", idSettings.useSectionBasedSerial ? "text-brand-indigo" : "text-slate-400")}>Section Based Serial</p>
                                    <p className="text-[9px] font-medium text-slate-400">Restarts for each section</p>
                                 </div>
                                 <div className={cn("h-2 w-2 rounded-full", idSettings.useSectionBasedSerial ? "bg-emerald-500" : "bg-slate-300")} />
                              </button>
                           </div>
                        </div>

                        <div className="space-y-4">
                           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Presets</p>
                           <div className="flex flex-wrap gap-2">
                              {presets.map(p => (
                                <button 
                                  key={p.name}
                                  onClick={() => applyPreset(p)}
                                  className="px-4 py-2 bg-slate-100 dark:bg-white/5 hover:bg-brand-indigo hover:text-white rounded-xl text-[10px] font-bold text-slate-500 transition-all uppercase tracking-tight"
                                >
                                  {p.name}
                                </button>
                              ))}
                           </div>
                        </div>

                        <button 
                          onClick={handleUpdateIdSettings}
                          disabled={savingIdSettings}
                          className="w-full py-5 bg-brand-indigo text-white rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                        >
                          {savingIdSettings ? "Saving Settings..." : "Save ID Configuration"}
                        </button>
                      </div>
                    ) : null}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          <div className="bg-white dark:bg-[#1E1E1E] p-8 rounded-[2.5rem] shadow-xl border border-white dark:border-white/5 transition-colors duration-300">
             <div className="flex items-center gap-4 mb-6">
                <div className="h-12 w-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center">
                  <Shield className="h-6 w-6 text-emerald-500" />
                </div>
                <h3 className="text-lg font-bold text-[#2B2D42] dark:text-white">{t('security')}</h3>
             </div>
             <p className="text-sm text-slate-400 mb-6">{t('reset_password_contact')}</p>
             <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/5">
                <div>
                   <p className="text-sm font-bold text-[#2B2D42] dark:text-white">{t('active_session')}</p>
                   <p className="text-[10px] text-slate-400 uppercase font-black">{t('google_auth_desc')}</p>
                </div>
                <div className="h-3 w-3 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
             </div>
          </div>
        </div>

        {/* Preferences Section */}
        <div className="space-y-8">
          <div className="bg-white dark:bg-[#1E1E1E] p-8 rounded-[2.5rem] shadow-xl border border-white dark:border-white/5 transition-colors duration-300">
            <div className="flex items-center gap-4 mb-8">
              <div className="h-12 w-12 bg-brand-coral/10 rounded-2xl flex items-center justify-center">
                <Palette className="h-6 w-6 text-brand-coral" />
              </div>
              <h3 className="text-lg font-bold text-[#2B2D42] dark:text-white">{t('appearance')}</h3>
            </div>

            <div className="space-y-4">
               <button 
                 onClick={() => setTheme('light')}
                 className={cn(
                   "w-full flex items-center justify-between p-5 rounded-3xl transition-all border-2",
                   theme === 'light' 
                    ? "bg-brand-indigo/5 border-brand-indigo" 
                    : "bg-slate-50 dark:bg-white/5 border-transparent hover:border-slate-200 dark:hover:border-white/10"
                 )}
               >
                  <div className="flex items-center gap-4">
                     <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center", theme === 'light' ? "bg-white text-brand-indigo" : "bg-white text-slate-400")}>
                        <Sun className="h-5 w-5" />
                     </div>
                     <div className="text-left">
                        <p className={cn("text-sm font-black", theme === 'light' ? "text-brand-indigo" : "text-slate-400")}>{t('light_mode')}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('day_theme')}</p>
                     </div>
                  </div>
                  {theme === 'light' && <div className="h-2 w-2 rounded-full bg-brand-indigo" />}
               </button>

               <button 
                 onClick={() => setTheme('dark')}
                 className={cn(
                   "w-full flex items-center justify-between p-5 rounded-3xl transition-all border-2",
                   theme === 'dark' 
                    ? "bg-brand-indigo/10 border-brand-indigo" 
                    : "bg-slate-50 dark:bg-white/5 border-transparent hover:border-slate-200 dark:hover:border-white/10"
                 )}
               >
                  <div className="flex items-center gap-4">
                     <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center", theme === 'dark' ? "bg-slate-800 text-brand-indigo" : "bg-white text-slate-400")}>
                        <Moon className="h-5 w-5" />
                     </div>
                     <div className="text-left">
                        <p className={cn("text-sm font-black", theme === 'dark' ? "text-white" : "text-slate-400")}>{t('dark_mode')}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('night_theme')}</p>
                     </div>
                  </div>
                  {theme === 'dark' && <div className="h-2 w-2 rounded-full bg-brand-indigo" />}
               </button>
            </div>
          </div>

          <div className="bg-white dark:bg-[#1E1E1E] p-8 rounded-[3rem] shadow-xl border border-white dark:border-white/5 transition-colors duration-300">
             <div className="flex items-center gap-4 mb-6">
                <div className="h-12 w-12 bg-rose-500/10 rounded-2xl flex items-center justify-center">
                   <LogOut className="h-6 w-6 text-rose-500" />
                </div>
                <h3 className="text-lg font-bold text-[#2B2D42] dark:text-white">{t('account')}</h3>
             </div>
             <button 
               onClick={() => logout()}
               className="w-full py-5 bg-rose-500 text-white rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-xl hover:scale-[1.02] active:scale-95 transition-all"
             >
                {t('logout')}
             </button>
             <p className="text-center mt-6 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">AerovaX v1.0.4</p>
          </div>
        </div>
      </div>
    </div>
  );
}
