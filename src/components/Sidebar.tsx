import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  CheckCircle, 
  IndianRupee, 
  Bell, 
  UserCircle,
  LogOut,
  GraduationCap,
  BookOpen,
  ClipboardList,
  Settings,
  X,
  Menu,
  PhoneCall,
  MessageSquare
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { cn } from '../lib/utils';

import { Logo } from './Logo';

export default function Sidebar() {
  const { profile, logout } = useAuth();
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);

  if (!profile) return null;

  const isAdmin = ['super_admin', 'school_admin', 'accountant', 'teacher'].includes(profile.role);

  const menuItems = isAdmin ? [
    { icon: LayoutDashboard, label: t('dashboard'), path: '/' },
    { icon: Users, label: t('students'), path: '/students' },
    { icon: GraduationCap, label: t('teachers'), path: '/teachers' },
    { icon: UserCircle, label: t('parents'), path: '/parents' },
    { icon: IndianRupee, label: t('fees'), path: '/fees' },
    { icon: BookOpen, label: t('class_menu'), path: '/class' },
    { icon: ClipboardList, label: t('exam'), path: '/exam' },
    { icon: PhoneCall, label: t('ai_calls'), path: '/ai-calls' },
    ...(profile.role !== 'teacher' ? [{ icon: MessageSquare, label: 'WhatsApp Center', path: '/whatsapp-center' }] : []),
    { icon: Bell, label: t('notice'), path: '/announcements' },
  ] : [
    { icon: GraduationCap, label: 'Portal', path: '/' },
  ];

  const bottomItems = [
    { icon: Settings, label: t('settings'), path: '/settings' },
  ];

  const sidebarContent = (
    <>
      <div className="p-8">
        <Logo size="md" />
      </div>

      <nav className="flex-1 px-6 space-y-1 overflow-y-auto">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => cn(
              "flex items-center gap-4 px-4 py-3 text-sm font-medium rounded-2xl transition-all duration-300",
              isActive 
                ? "bg-white dark:bg-white/10 text-brand-coral shadow-sm border border-slate-100 dark:border-white/10" 
                : "text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-white/5"
            )}
          >
            <item.icon className={cn("h-5 w-5")} />
            {item.label}
          </NavLink>
        ))}
        
        <div className="pt-6 mt-6 border-t border-slate-100 dark:border-white/10">
          {bottomItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => cn(
                "flex items-center gap-4 px-4 py-3 text-sm font-medium rounded-2xl transition-all",
                isActive 
                  ? "bg-white dark:bg-white/10 text-brand-coral shadow-sm border border-slate-100 dark:border-white/10" 
                  : "text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-white/5"
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </>
  );

  return (
    <>
      {/* Mobile Trigger */}
      <button 
        onClick={() => setIsOpen(true)}
        className="md:hidden fixed top-4 left-4 z-50 p-2 bg-white dark:bg-[#1E1E1E] text-[#2B2D42] dark:text-white rounded-xl shadow-lg border border-slate-100 dark:border-white/10"
      >
        <Menu className="h-6 w-6" />
      </button>

      {/* Mobile Drawer */}
      {isOpen && (
        <div className="fixed inset-0 z-[60] md:hidden">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsOpen(false)} />
          <aside className="absolute top-0 left-0 bottom-0 w-72 bg-white dark:bg-[#1A1C1E] shadow-2xl flex flex-col animate-in slide-in-from-left duration-300 border-r border-slate-100 dark:border-white/5">
            <button 
              onClick={() => setIsOpen(false)}
              className="absolute top-8 right-4 p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside className="no-print hidden md:flex w-72 flex-col bg-white dark:bg-[#1A1C1E] relative z-40 border-r border-slate-100/50 dark:border-white/5 transition-colors duration-300">
        {sidebarContent}
      </aside>
    </>
  );
}
