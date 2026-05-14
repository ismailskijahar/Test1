import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, 
  Send, 
  CheckCheck, 
  AlertCircle, 
  History,
  RefreshCw,
  Search,
  Filter,
  Languages
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { dataService } from '../services/dataService';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import { useLanguage } from '../context/LanguageContext';
import { motion, AnimatePresence } from 'motion/react';

interface WhatsAppLog {
  id: string;
  student_id: string;
  student_name: string;
  parent_phone: string;
  status: 'sent' | 'delivered' | 'failed';
  message: string;
  sent_at: any;
  error?: string;
}

export default function WhatsAppAlerts() {
  const { profile } = useAuth();
  const { t } = useLanguage();
  const [logs, setLogs] = useState<WhatsAppLog[]>([]);
  const [stats, setStats] = useState({ totalToday: 0, delivered: 0, failed: 0 });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const loadData = async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const [logsData, statsData] = await Promise.all([
        dataService.getWhatsAppLogs(profile.school_id),
        dataService.getWhatsAppStats(profile.school_id)
      ]);
      setLogs(logsData as WhatsAppLog[]);
      setStats(statsData);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [profile]);

  const filteredLogs = logs.filter(log => 
    log.student_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.parent_phone?.includes(searchTerm)
  );

  return (
    <div className="space-y-8 pb-12">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-white flex items-center gap-3">
            <MessageSquare className="h-8 w-8 text-brand-indigo" />
            {t('whatsapp_alerts')}
          </h1>
          <p className="text-neutral-500 dark:text-slate-400 mt-1">{t('bilingual_notifications')}</p>
        </div>
        <button 
          onClick={loadData}
          className="flex items-center gap-2 px-6 py-2.5 bg-white dark:bg-white/5 border border-neutral-100 dark:border-white/10 rounded-2xl text-sm font-bold text-neutral-900 dark:text-white shadow-sm hover:bg-neutral-50 dark:hover:bg-white/10 transition-all"
        >
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          {t('refresh_data')}
        </button>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: t('alerts_sent_today'), value: stats.totalToday, icon: Send, color: 'text-brand-indigo', bg: 'bg-brand-indigo/10' },
          { label: t('successfully_delivered'), value: stats.delivered, icon: CheckCheck, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
          { label: t('failed_alerts'), value: stats.failed, icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-500/10' },
        ].map((stat, i) => (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            key={stat.label} 
            className="p-6 bg-white dark:bg-[#1E1E1E] border border-neutral-100 dark:border-white/5 rounded-[2.5rem] shadow-sm flex items-center gap-6"
          >
            <div className={cn("h-14 w-14 rounded-2xl flex items-center justify-center", stat.bg)}>
              <stat.icon className={cn("h-7 w-7", stat.color)} />
            </div>
            <div>
              <p className="text-sm font-medium text-neutral-500 dark:text-slate-400">{stat.label}</p>
              <h3 className="text-2xl font-bold dark:text-white">{stat.value}</h3>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="bg-white dark:bg-[#1E1E1E] border border-neutral-100 dark:border-white/5 rounded-[3rem] overflow-hidden shadow-sm">
        <div className="p-8 border-b border-neutral-100 dark:border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-brand-indigo/10 rounded-xl">
               <Languages className="h-5 w-5 text-brand-indigo" />
             </div>
             <h2 className="text-xl font-bold text-neutral-900 dark:text-white">{t('message_logs')}</h2>
          </div>
          
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
            <input 
              type="text"
              placeholder={`${t('search')}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-11 pr-6 py-2.5 bg-neutral-50 dark:bg-white/5 border-none rounded-2xl text-sm focus:ring-2 focus:ring-brand-indigo/20 transition-all w-full md:w-80 dark:text-white"
            />
          </div>
        </div>

        <div className="p-8">
          <div className="overflow-x-auto">
            {filteredLogs.length === 0 ? (
              <div className="py-20 text-center flex flex-col items-center gap-4">
                <History className="h-12 w-12 text-neutral-200" />
                <p className="text-neutral-400 font-medium italic">{t('no_records')}</p>
              </div>
            ) : (
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-neutral-50 dark:border-white/5">
                    <th className="py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('student_label')}</th>
                    <th className="py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('parent_contact_label')}</th>
                    <th className="py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('sent_at_label')}</th>
                    <th className="py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('status_label')}</th>
                    <th className="py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">{t('preview_label')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-50 dark:divide-white/5">
                  {filteredLogs.map((log) => (
                    <tr key={log.id} className="group hover:bg-neutral-50/50 dark:hover:bg-white/5 transition-colors">
                      <td className="py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-white/10 flex items-center justify-center font-bold text-slate-600 dark:text-slate-300">
                            {log.student_name?.[0] || 'S'}
                          </div>
                          <span className="font-bold text-neutral-900 dark:text-white">{log.student_name}</span>
                        </div>
                      </td>
                      <td className="py-4 text-sm text-neutral-500 dark:text-slate-400">{log.parent_phone}</td>
                      <td className="py-4 text-sm text-neutral-500 dark:text-slate-400">
                        {log.sent_at && format(log.sent_at.toDate ? log.sent_at.toDate() : new Date(log.sent_at), 'h:mm a')}
                      </td>
                      <td className="py-4">
                         <div className={cn(
                           "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                           log.status === 'sent' || log.status === 'delivered' ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400" :
                           "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400"
                         )}>
                           {log.status === 'sent' || log.status === 'delivered' ? <CheckCheck className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                           {t(log.status)}
                         </div>
                      </td>
                      <td className="py-4 text-right">
                        <button 
                          className="p-2 hover:bg-brand-indigo/10 rounded-lg text-brand-indigo transition-colors"
                          title="View message content"
                          onClick={() => alert(log.message)}
                        >
                          <MessageSquare className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
