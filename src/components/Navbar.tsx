import React from 'react';
import { Bell, Search, Globe, ChevronDown, Mail, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Logo } from './Logo';
import { cn } from '../lib/utils';

export default function Navbar() {
  const { profile, logout } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const [showLangMenu, setShowLangMenu] = React.useState(false);

  const languages = [
    { code: 'en', name: 'English', flag: 'EN' },
    { code: 'hi', name: 'हिन्दी', flag: 'HI' },
    { code: 'bn', name: 'বাংলা', flag: 'BN' },
    { code: 'ur', name: 'اردو', flag: 'UR' },
    { code: 'ar', name: 'العربية', flag: 'AR' },
    { code: 'te', name: 'తెలుగు', flag: 'TE' },
    { code: 'ta', name: 'தமிழ்', flag: 'TA' },
    { code: 'gu', name: 'ગુજરાતી', flag: 'GU' },
    { code: 'pa', name: 'ਪੰਜਾਬੀ', flag: 'PA' },
    { code: 'ml', name: 'മലയാളം', flag: 'ML' },
    { code: 'kn', name: 'ಕನ್ನಡ', flag: 'KN' },
    { code: 'mr', name: 'मराठी', flag: 'MR' },
    { code: 'es', name: 'Español', flag: 'ES' },
    { code: 'fr', name: 'Français', flag: 'FR' },
    { code: 'it', name: 'Italiano', flag: 'IT' },
    { code: 'de', name: 'Deutsch', flag: 'DE' },
    { code: 'ru', name: 'Русский', flag: 'RU' },
    { code: 'ja', name: '日本語', flag: 'JA' },
    { code: 'zh', name: '中文', flag: 'ZH' },
    { code: 'ko', name: '한국어', flag: 'KO' },
  ];

  const currentLang = languages.find(l => l.code === language) || languages[0];
  
  return (
    <header className="no-print h-20 bg-brand-bg dark:bg-[#121212] px-4 md:px-8 flex items-center justify-between sticky top-0 z-30 transition-colors duration-300">
      <div className="flex items-center gap-4 lg:gap-8 flex-1">
        <div className="md:hidden ml-12">
          <Logo size="sm" />
        </div>
        <h2 className="hidden lg:block text-2xl font-bold text-[#2B2D42] dark:text-white truncate">
          {window.location.pathname === '/' ? t('dashboard') : t(window.location.pathname.substring(1))}
        </h2>
        
        <div className="flex-1 max-w-sm relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-brand-coral transition-colors" />
          <input 
            type="text" 
            placeholder={t('search') + '...'} 
            className="w-full pl-12 pr-4 py-2 bg-white dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-xl text-sm focus:ring-1 focus:ring-brand-coral/20 focus:border-brand-coral outline-none transition-all placeholder:text-slate-300 shadow-sm dark:text-white"
          />
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="relative">
          <div 
            onClick={() => setShowLangMenu(!showLangMenu)}
            className="hidden sm:flex items-center gap-2 text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer transition-colors px-3 py-1.5 rounded-lg hover:bg-white dark:hover:bg-white/5 ring-1 ring-transparent hover:ring-slate-100 dark:hover:ring-white/10"
          >
            <Globe className="h-4 w-4 text-brand-coral" />
            <span className="text-sm font-bold uppercase tracking-wider">{currentLang.flag}</span>
            <ChevronDown className={cn("h-3 w-3 transition-transform duration-300", showLangMenu ? "rotate-180" : "")} />
          </div>

          {showLangMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowLangMenu(false)}></div>
              <div className="absolute top-full right-0 mt-2 w-48 bg-white dark:bg-[#1A1A1A] border border-slate-100 dark:border-white/10 rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="p-2 grid grid-cols-1 gap-1">
                  {languages.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => {
                        setLanguage(lang.code as any);
                        setShowLangMenu(false);
                      }}
                      className={cn(
                        "flex items-center justify-between px-4 py-2 text-sm font-medium rounded-xl transition-all",
                        language === lang.code 
                          ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900" 
                          : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5"
                      )}
                    >
                      <span>{lang.name}</span>
                      <span className="text-[10px] opacity-50 font-bold">{lang.flag}</span>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button className="p-2.5 text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-white/5 rounded-xl transition-all relative">
            <Mail className="h-5 w-5" />
          </button>
          <button className="p-2.5 text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-white/5 rounded-xl transition-all relative">
            <Bell className="h-5 w-5" />
            <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-brand-coral rounded-full border-2 border-brand-bg dark:border-[#121212]"></span>
          </button>
        </div>

        <div className="flex items-center gap-3 pl-6 border-l border-slate-200 dark:border-white/10 min-w-0">
          <div className="text-right hidden md:block min-w-0">
            <p className="text-sm font-bold text-slate-900 dark:text-white leading-none truncate max-w-[150px]">{profile?.name}</p>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1 truncate">
              {profile?.role.replace('_', ' ')}
            </p>
          </div>
          <a
            href="/settings"
            className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-400 font-bold hover:bg-[#2B2D42] dark:hover:bg-brand-indigo hover:text-white transition-all overflow-hidden shadow-sm border-2 border-white dark:border-white/10 group"
            title="Settings"
          >
             {profile?.avatar_url ? (
               <img src={profile.avatar_url} alt={profile.name} className="h-full w-full object-cover" />
             ) : (
               profile?.name.charAt(0)
             )}
          </a>
        </div>
      </div>
    </header>
  );
}
