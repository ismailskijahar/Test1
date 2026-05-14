import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  Plus, 
  Trash2, 
  Calendar, 
  Image as ImageIcon,
  MoreVertical,
  ExternalLink,
  Info,
  X,
  Target,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { dataService } from '../services/dataService';
import { cn } from '../lib/utils';
import { Announcement, UserRole } from '../types';
import { format } from 'date-fns';
import { useLanguage } from '../context/LanguageContext';

export default function Announcements() {
  const { profile } = useAuth();
  const { t } = useLanguage();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newAnnouncement, setNewAnnouncement] = useState({
    title: '',
    description: '',
    image_url: '',
    target: 'both' as 'teachers' | 'parents' | 'both'
  });

  useEffect(() => {
    if (!profile) return;
    loadData();
  }, [profile]);

  const loadData = async () => {
    setLoading(true);
    const data = await dataService.getAnnouncements(profile!.school_id);
    setAnnouncements(data);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    let target_roles: UserRole[] = [];
    if (newAnnouncement.target === 'teachers') target_roles = ['teacher'];
    else if (newAnnouncement.target === 'parents') target_roles = ['parent'];
    else target_roles = ['teacher', 'parent'];

    await dataService.addAnnouncement(profile.school_id, {
      title: newAnnouncement.title,
      description: newAnnouncement.description,
      image_url: newAnnouncement.image_url,
      date: new Date().toISOString(),
      school_id: profile.school_id,
      target_roles
    });

    setIsModalOpen(false);
    setNewAnnouncement({
      title: '',
      description: '',
      image_url: '',
      target: 'both'
    });
    loadData();
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#2B2D42] dark:text-white">{t('communication_hub')}</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">{t('broadcast_news')}</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 px-6 py-3 bg-[#2B2D42] dark:bg-brand-indigo text-white rounded-2xl font-bold hover:bg-slate-900 transition-all hover:scale-[1.02] active:scale-95 shadow-lg shadow-slate-200 dark:shadow-none"
        >
          <Plus className="h-5 w-5" />
          {t('new_announcement')}
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
         {loading ? (
            <div className="col-span-full py-20 text-center text-slate-400 font-medium italic">{t('loading')}</div>
         ) : announcements.length === 0 ? (
            <div className="col-span-full py-20 bg-white dark:bg-[#1E1E1E] border border-dashed border-slate-200 dark:border-white/10 rounded-[2.5rem] flex flex-col items-center justify-center space-y-4 transition-colors duration-300">
               <div className="h-16 w-16 bg-slate-50 dark:bg-white/5 rounded-full flex items-center justify-center">
                  <Bell className="h-8 w-8 text-slate-300 dark:text-slate-600" />
               </div>
               <p className="text-slate-400 font-medium">{t('no_records')}</p>
            </div>
         ) : announcements.map(news => (
            <div key={news.id} className="bg-white dark:bg-[#1E1E1E] rounded-[2.5rem] border border-slate-100 dark:border-white/5 shadow-sm overflow-hidden flex flex-col group hover:shadow-xl hover:shadow-slate-200/50 dark:hover:shadow-none transition-all duration-500">
               {news.image_url ? (
                  <div className="h-48 overflow-hidden">
                     <img src={news.image_url} alt={news.title} className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-700" />
                  </div>
               ) : (
                  <div className="h-3 bg-brand-coral w-full" />
               )}
               <div className="p-8 flex-1 flex flex-col">
                  <div className="flex items-center justify-between mb-4">
                     <div className="flex items-center gap-2">
                        <div className="p-2 bg-slate-50 dark:bg-white/5 rounded-xl">
                           <Calendar className="h-4 w-4 text-slate-400" />
                        </div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                          {format(new Date(news.date), 'MMM dd, yyyy')}
                        </p>
                     </div>
                     <div className="flex gap-1">
                        {news.target_roles?.includes('teacher') && (
                          <span className="h-2 w-2 rounded-full bg-brand-indigo" title="Teachers"></span>
                        )}
                        {news.target_roles?.includes('parent') && (
                          <span className="h-2 w-2 rounded-full bg-emerald-500" title="Parents"></span>
                        )}
                     </div>
                  </div>
                  <h3 className="text-xl font-bold text-[#2B2D42] dark:text-white mb-3 leading-tight group-hover:text-brand-indigo transition-colors">{news.title}</h3>
                  <p className="text-slate-500 dark:text-slate-400 text-sm line-clamp-3 mb-6 leading-relaxed">{news.description}</p>
                  
                  <div className="mt-auto pt-6 border-t border-slate-50 dark:border-white/5 flex items-center justify-between">
                     <div className="flex gap-2">
                        {news.target_roles?.map(role => (
                           <span key={role} className="text-[9px] font-bold px-3 py-1 bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-400 rounded-lg uppercase tracking-wider">
                             {role}
                           </span>
                        ))}
                     </div>
                     <button className="p-2 hover:bg-slate-50 dark:hover:bg-white/5 rounded-xl transition-colors">
                        <MoreVertical className="h-5 w-5 text-slate-300" />
                     </button>
                  </div>
               </div>
            </div>
         ))}
      </div>
      
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#2B2D42]/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-[#1E1E1E] w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-8 border-b border-slate-100 dark:border-white/5 flex items-center justify-between bg-white dark:bg-[#1E1E1E] sticky top-0 z-10 transition-colors duration-300">
               <div>
                  <h2 className="text-2xl font-bold tracking-tight text-[#2B2D42] dark:text-white">{t('new_announcement')}</h2>
                  <p className="text-slate-400 text-sm font-medium">{t('broadcast_news_modal_desc')}</p>
               </div>
               <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-50 dark:hover:bg-white/5 rounded-full transition-colors">
                  <X className="h-6 w-6 text-slate-300" />
               </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
               <div className="space-y-4">
                  <div className="space-y-2">
                     <label className="text-xs font-bold text-slate-500 ml-1">{t('announcement_title')}</label>
                     <input 
                       required
                       type="text" 
                       value={newAnnouncement.title}
                       onChange={e => setNewAnnouncement({...newAnnouncement, title: e.target.value})}
                       placeholder="e.g. Annual Sports Day 2024"
                       className="w-full px-5 py-3.5 bg-slate-50 dark:bg-white/5 dark:text-white rounded-2xl border-none focus:ring-2 focus:ring-brand-indigo/20 text-sm transition-all"
                     />
                  </div>
                  
                  <div className="space-y-2">
                     <label className="text-xs font-bold text-slate-500 ml-1">{t('message_content')}</label>
                     <textarea 
                       required
                       rows={4}
                       value={newAnnouncement.description}
                       onChange={e => setNewAnnouncement({...newAnnouncement, description: e.target.value})}
                       placeholder="Detail your announcement here..."
                       className="w-full px-5 py-3.5 bg-slate-50 dark:bg-white/5 dark:text-white rounded-2xl border-none focus:ring-2 focus:ring-brand-indigo/20 text-sm transition-all resize-none"
                     />
                  </div>

                  <div className="space-y-2">
                     <label className="text-xs font-bold text-slate-500 ml-1">{t('target_audience')}</label>
                     <div className="grid grid-cols-3 gap-3">
                        {[
                          { id: 'teachers', label: t('teachers'), color: 'bg-brand-indigo' },
                          { id: 'parents', label: t('parents'), color: 'bg-emerald-500' },
                          { id: 'both', label: t('all'), color: 'bg-[#2B2D42] dark:bg-slate-800' }
                        ].map(opt => (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => setNewAnnouncement({...newAnnouncement, target: opt.id as any})}
                            className={cn(
                              "py-3 rounded-xl text-xs font-bold transition-all border-2",
                              newAnnouncement.target === opt.id 
                                ? `border-transparent text-white ${opt.color} shadow-md scale-105` 
                                : "border-slate-100 dark:border-white/5 bg-white dark:bg-white/5 text-slate-400 hover:border-slate-200"
                            )}
                          >
                            {opt.label}
                          </button>
                        ))}
                     </div>
                  </div>

                  <div className="space-y-2">
                     <label className="text-xs font-bold text-slate-500 ml-1">Image URL (Optional)</label>
                     <div className="relative">
                        <ImageIcon className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
                        <input 
                          type="url" 
                          value={newAnnouncement.image_url}
                          onChange={e => setNewAnnouncement({...newAnnouncement, image_url: e.target.value})}
                          placeholder="https://images.unsplash.com/..."
                          className="w-full pl-12 pr-5 py-3.5 bg-slate-50 dark:bg-white/5 dark:text-white rounded-2xl border-none focus:ring-2 focus:ring-brand-indigo/20 text-sm transition-all"
                        />
                     </div>
                  </div>
               </div>

               <div className="pt-4">
                  <button 
                    type="submit"
                    className="w-full py-5 bg-[#2B2D42] dark:bg-brand-indigo text-white rounded-[1.5rem] font-bold hover:bg-slate-900 dark:hover:bg-[#3a4066] transition-all shadow-xl shadow-slate-200 dark:shadow-none flex items-center justify-center gap-3"
                  >
                    {t('post_announcement')}
                    <ArrowRight className="h-5 w-5" />
                  </button>
               </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-[#2B2D42] dark:bg-[#1E1E1E] p-10 rounded-[3rem] text-white overflow-hidden relative group border border-white/5 transition-colors duration-300">
         <div className="relative z-10 max-w-lg">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full mb-6">
               <Info className="h-4 w-4 text-white" />
               <span className="text-[10px] font-bold uppercase tracking-widest text-white">{t('feature_insight')}</span>
            </div>
            <h2 className="text-3xl font-bold tracking-tight mb-4">{t('multi_channel_delivery')}</h2>
            <p className="text-slate-400 leading-relaxed mb-8">{t('multi_channel_desc')}</p>
            <button className="inline-flex items-center gap-2 px-8 py-4 bg-brand-coral text-white rounded-2xl font-bold hover:bg-opacity-90 transition-all shadow-lg shadow-brand-coral/20">
               {t('notification_settings')}
               <ExternalLink className="h-4 w-4" />
            </button>
         </div>
         <div className="absolute -right-20 -bottom-20 h-80 w-80 bg-brand-indigo/20 rounded-full blur-3xl group-hover:scale-110 transition-transform duration-1000"></div>
         <div className="absolute top-1/2 -right-10 flex flex-col gap-4 opacity-5 translate-x-10 group-hover:translate-x-0 transition-transform duration-700">
            <Bell className="h-32 w-32 rotate-12" />
         </div>
      </div>
    </div>
  );
}

