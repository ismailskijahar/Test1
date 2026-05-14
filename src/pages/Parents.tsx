import React, { useEffect, useState } from 'react';
import { 
  Plus, 
  UserCircle, 
  Search, 
  MoreVertical, 
  Users,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { dataService } from '../services/dataService';
import { cn } from '../lib/utils';
import { ParentProfile } from '../types';

export default function Parents() {
  const { profile } = useAuth();
  const { t } = useLanguage();
  const [parents, setParents] = useState<ParentProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!profile) return;
    loadParents();
  }, [profile]);

  const loadParents = async () => {
    setLoading(true);
    const data = await dataService.getParents(profile!.school_id);
    setParents(data as any[]);
    setLoading(false);
  };

  // Deduplicate parents to hide session duplicates
  const uniqueParents: any[] = Array.from(
    parents.reduce((map, parent: any) => {
      // Use a combination of name and student ID as a stable key for parents
      const nameKey = (parent.name || '').trim().toLowerCase();
      const studentKey = (parent.linked_student_id || '').trim();
      const key = `${nameKey}-${studentKey}`;
      
      const existing = map.get(key);
      if (!existing || (!existing.is_session && parent.is_session)) {
        // Prefer the one that is NOT a session if possible
        if (existing && !existing.is_session) {
           return map;
        }
        map.set(key, parent);
      }
      return map;
    }, new Map<string, any>()).values()
  );

  const filteredParents = uniqueParents.filter((p: any) => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#2B2D42] dark:text-white">{t('parent_community')}</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Total {uniqueParents.length} {t('registered_parents_count')}</p>
        </div>
        <button 
          className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-500 text-white rounded-2xl font-bold hover:bg-emerald-600 transition-all hover:scale-[1.02] active:scale-95 shadow-lg shadow-emerald-500/20"
        >
          <Plus className="h-5 w-5" />
          {t('invite_parent')}
        </button>
      </header>

      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white dark:bg-[#1E1E1E] p-4 rounded-[2rem] border border-slate-100 dark:border-white/5 shadow-sm">
         <div className="relative flex-1 w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input 
              type="text" 
              placeholder={`${t('search')}...`}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-white/5 rounded-xl border-none focus:ring-2 focus:ring-emerald-500/20 text-sm transition-all dark:text-white"
            />
         </div>
      </div>

      <div className="bg-white dark:bg-[#1E1E1E] border border-slate-100 dark:border-white/5 rounded-[2.5rem] overflow-hidden shadow-sm transition-colors duration-300">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-white/5 border-b border-slate-100 dark:border-white/5">
                <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-slate-400">{t('parent_info')}</th>
                <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-slate-400">{t('phone')}</th>
                <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-slate-400">{t('students_linked')}</th>
                <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-slate-400 text-right">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="text-[#2B2D42] dark:text-white">
               {loading ? (
                  <tr>
                     <td colSpan={4} className="px-8 py-20 text-center text-slate-400 font-medium italic">{t('loading')}</td>
                  </tr>
               ) : filteredParents.length === 0 ? (
                  <tr>
                     <td colSpan={4} className="px-8 py-20 text-center text-slate-400 font-medium italic">{t('no_records')}</td>
                  </tr>
               ) : filteredParents.map((parent) => (
                  <tr key={parent.uid} className="border-b border-slate-50 dark:border-white/5 hover:bg-slate-50/50 dark:hover:bg-white/10 transition-colors group cursor-pointer">
                     <td className="px-8 py-5">
                        <div className="flex items-center gap-4">
                           <div className="h-12 w-12 rounded-2xl bg-emerald-100 dark:bg-emerald-500/10 flex items-center justify-center font-bold text-emerald-600 dark:text-emerald-500 overflow-hidden group-hover:bg-emerald-500 group-hover:text-white transition-all duration-300">
                              {parent.name.charAt(0)}
                           </div>
                           <div>
                              <p className="font-bold text-sm">{parent.name}</p>
                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">{t('verified_profile')}</p>
                           </div>
                        </div>
                     </td>
                     <td className="px-8 py-5">
                        <div className="space-y-1">
                           <p className="text-xs font-bold text-slate-600 dark:text-slate-400">{parent.phone || t('no_phone')}</p>
                        </div>
                     </td>
                     <td className="px-8 py-5">
                        <div className="flex items-center gap-2">
                           <div className="h-8 w-8 bg-slate-100 dark:bg-white/5 rounded-lg flex items-center justify-center text-slate-400 group-hover:bg-brand-coral group-hover:text-white transition-colors">
                              <Users className="h-4 w-4" />
                           </div>
                           <span className="text-xs font-bold">{(parent.linked_student_ids || []).length} {t('students_count')}</span>
                        </div>
                     </td>
                     <td className="px-8 py-5 text-right">
                        <button className="p-2.5 hover:bg-white dark:hover:bg-white/10 hover:shadow-md border border-transparent hover:border-slate-100 dark:hover:border-white/10 rounded-xl transition-all">
                           <MoreVertical className="h-5 w-5 text-slate-300 group-hover:text-[#2B2D42] dark:group-hover:text-white" />
                        </button>
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
