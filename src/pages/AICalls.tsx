import React, { useState, useEffect } from 'react';
import { 
  Phone, 
  PhoneCall, 
  PhoneOff, 
  PhoneIncoming, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  History,
  Search,
  Filter,
  BarChart3,
  RefreshCw,
  Loader2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { dataService } from '../services/dataService';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import { useLanguage } from '../context/LanguageContext';
import { motion, AnimatePresence } from 'motion/react';

interface CallRecord {
  id: string;
  student_id: string;
  student_name: string;
  parent_phone: string;
  status: 'answered' | 'missed' | 'failed';
  timestamp: string;
  duration?: number;
}

interface QueueRecord {
  id: string;
  student_id: string;
  student_name: string;
  parent_phone: string;
  status: 'pending' | 'processing' | 'failed' | 'completed';
  createdAt: string;
  retries: number;
}

export default function AICalls() {
  const { profile } = useAuth();
  const { t } = useLanguage();
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [queue, setQueue] = useState<QueueRecord[]>([]);
  const [stats, setStats] = useState({ totalToday: 0, answered: 0, failed: 0, missed: 0 });
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'logs' | 'queue'>('logs');

  const loadData = async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const [callsData, queueData, statsData] = await Promise.all([
        dataService.getCalls(profile.school_id),
        dataService.getCallQueue(profile.school_id),
        dataService.getCallStats(profile.school_id)
      ]);
      setCalls(callsData as CallRecord[]);
      setQueue(queueData as QueueRecord[]);
      setStats(statsData);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // Poll for updates every 30 seconds
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [profile]);

  return (
    <div className="space-y-8 pb-12">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-white flex items-center gap-3">
            <PhoneCall className="h-8 w-8 text-brand-indigo" />
            {t('ai_automated_calls')}
          </h1>
          <p className="text-neutral-500 dark:text-slate-400 mt-1">{t('monitor_ai_calls')}</p>
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
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {[
          { label: t('total_calls_today'), value: stats.totalToday, icon: Phone, color: 'text-brand-indigo', bg: 'bg-brand-indigo/10' },
          { label: t('calls_answered'), value: stats.answered, icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
          { label: t('calls_missed'), value: stats.missed, icon: PhoneOff, color: 'text-amber-500', bg: 'bg-amber-500/10' },
          { label: t('calls_failed'), value: stats.failed, icon: XCircle, color: 'text-red-500', bg: 'bg-red-500/10' },
        ].map((stat, i) => (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            key={stat.label} 
            className="p-6 bg-white dark:bg-[#1E1E1E] border border-neutral-100 dark:border-white/5 rounded-[2rem] shadow-sm flex items-center gap-6"
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
        <div className="px-8 border-b border-neutral-100 dark:border-white/5">
          <div className="flex items-center gap-8">
            <button 
              onClick={() => setTab('logs')}
              className={cn(
                "py-6 text-sm font-bold uppercase tracking-widest transition-all relative",
                tab === 'logs' ? "text-brand-indigo" : "text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
              )}
            >
              {t('recent_call_logs')}
              {tab === 'logs' && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-1 bg-brand-indigo rounded-t-full" />}
            </button>
            <button 
              onClick={() => setTab('queue')}
              className={cn(
                "py-6 text-sm font-bold uppercase tracking-widest transition-all relative flex items-center gap-2",
                tab === 'queue' ? "text-brand-indigo" : "text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
              )}
            >
              {t('processing_queue')}
              {queue.length > 0 && <span className="bg-brand-indigo text-white text-[10px] px-1.5 py-0.5 rounded-full">{queue.length}</span>}
              {tab === 'queue' && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-1 bg-brand-indigo rounded-t-full" />}
            </button>
          </div>
        </div>

        <div className="p-8">
          <AnimatePresence mode="wait">
            {tab === 'logs' ? (
              <motion.div
                key="logs"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="overflow-x-auto"
              >
                {calls.length === 0 ? (
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
                        <th className="py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('timestamp_label')}</th>
                        <th className="py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('status_label')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-50 dark:divide-white/5">
                      {calls.map((call) => (
                        <tr key={call.id} className="group hover:bg-neutral-50/50 dark:hover:bg-white/5 transition-colors">
                          <td className="py-4">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-white/10 flex items-center justify-center font-bold text-slate-600 dark:text-slate-300">
                                {call.student_name?.[0] || 'S'}
                              </div>
                              <span className="font-bold text-neutral-900 dark:text-white">{call.student_name}</span>
                            </div>
                          </td>
                          <td className="py-4 text-sm text-neutral-500 dark:text-slate-400">{call.parent_phone}</td>
                          <td className="py-4 text-sm text-neutral-500 dark:text-slate-400">
                            {format(new Date(call.timestamp), 'h:mm a')}
                          </td>
                          <td className="py-4">
                             <div className={cn(
                               "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                               call.status === 'answered' ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400" :
                               call.status === 'missed' ? "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400" :
                               "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400"
                             )}>
                               {call.status === 'answered' && <PhoneIncoming className="h-3 w-3" />}
                               {call.status === 'missed' && <XCircle className="h-3 w-3" />}
                               {call.status === 'failed' && <PhoneOff className="h-3 w-3" />}
                               {t(call.status)}
                             </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="queue"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="overflow-x-auto"
              >
                {queue.length === 0 ? (
                  <div className="py-20 text-center flex flex-col items-center gap-4">
                    <CheckCircle2 className="h-12 w-12 text-emerald-200" />
                    <p className="text-neutral-400 font-medium italic">{t('queue_empty')}</p>
                  </div>
                ) : (
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-neutral-50 dark:border-white/5">
                        <th className="py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('student_label')}</th>
                        <th className="py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('parent_contact_label')}</th>
                        <th className="py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('queue_since_label')}</th>
                        <th className="py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('attempts_label')}</th>
                        <th className="py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('status_label')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-50 dark:divide-white/5">
                      {queue.map((item) => (
                        <tr key={item.id} className="group hover:bg-neutral-50/50 dark:hover:bg-white/5 transition-colors">
                          <td className="py-4">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-white/10 flex items-center justify-center font-bold text-slate-600 dark:text-slate-300">
                                {item.student_name?.[0] || 'S'}
                              </div>
                              <span className="font-bold text-neutral-900 dark:text-white">{item.student_name}</span>
                            </div>
                          </td>
                          <td className="py-4 text-sm text-neutral-500 dark:text-slate-400">{item.parent_phone}</td>
                          <td className="py-4 text-sm text-neutral-500 dark:text-slate-400">
                            {format(new Date(item.createdAt), 'h:mm a')}
                          </td>
                          <td className="py-4 text-sm text-neutral-500 dark:text-slate-400">
                             {item.retries} {t('attempts')}
                          </td>
                          <td className="py-4">
                            <div className={cn(
                               "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                               item.status === 'processing' ? "bg-brand-indigo/10 text-brand-indigo animate-pulse" : "bg-slate-100 text-slate-500"
                             )}>
                               {item.status === 'processing' && <Loader2 className="h-3 w-3 animate-spin" />}
                               {item.status === 'pending' && <Clock className="h-3 w-3" />}
                               {t(item.status)}
                             </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
