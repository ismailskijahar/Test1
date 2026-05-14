import React from 'react';
import { NavLink, Outlet, useLocation, Navigate } from 'react-router-dom';
import { 
  IndianRupee, 
  Wallet, 
  FileText, 
  BarChart3, 
  Settings2,
  AlertCircle
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useLanguage } from '../context/LanguageContext';

export default function Fees() {
  const { t } = useLanguage();
  const location = useLocation();

  const subMenuItems = [
    { icon: Wallet, label: 'Collect Fees', path: '/fees/collect' },
    { icon: AlertCircle, label: 'Due Students', path: '/fees/due-students' },
    { icon: Settings2, label: 'Fee Structure', path: '/fees/fee-structure' },
    { icon: FileText, label: 'Receipts', path: '/fees/receipts' },
    { icon: BarChart3, label: 'Reports', path: '/fees/reports' },
  ];

  // If we are at /fees, redirect to /fees/collect
  if (location.pathname === '/fees' || location.pathname === '/fees/') {
    return <Navigate to="/fees/collect" replace />;
  }

  return (
    <div className="space-y-8">
      <div className="flex border-b border-slate-100 dark:border-white/5 pb-1 overflow-x-auto no-scrollbar gap-2">
        {subMenuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => cn(
              "flex items-center gap-2 px-6 py-3 text-sm font-bold whitespace-nowrap transition-all border-b-2",
              isActive 
                ? "border-brand-coral text-brand-coral" 
                : "border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            )}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </NavLink>
        ))}
      </div>

      <div className="animate-in fade-in duration-500">
        <Outlet />
      </div>
    </div>
  );
}
