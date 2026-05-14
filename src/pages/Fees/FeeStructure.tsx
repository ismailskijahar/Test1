import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  Edit2, 
  CheckCircle, 
  X,
  IndianRupee,
  Layout
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { dataService } from '../../services/dataService';
import { FeeStructure } from '../../types';
import { formatCurrency, cn } from '../../lib/utils';
import { useLanguage } from '../../context/LanguageContext';

export default function FeeStructurePage() {
  const { profile } = useAuth();
  const { t } = useLanguage();
  const [structures, setStructures] = useState<FeeStructure[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState<Omit<FeeStructure, 'id' | 'createdAt'>>({
    class_name: '',
    class_key: '',
    admission_fee: 0,
    monthly_fee: 0,
    transport_fee: 0,
    exam_fee: 0,
    school_id: profile?.school_id || '',
    active: true
  });

  const loadData = async () => {
    if (!profile) return;
    const data = await dataService.getFeeStructures(profile.school_id);
    setStructures(data);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    if (editingId) {
      await dataService.updateFeeStructure(profile.school_id, editingId, formData);
    } else {
      await dataService.addFeeStructure(profile.school_id, formData);
    }

    setIsModalOpen(false);
    setEditingId(null);
    setFormData({
      class_name: '',
      class_key: '',
      admission_fee: 0,
      monthly_fee: 0,
      transport_fee: 0,
      exam_fee: 0,
      school_id: profile.school_id,
      active: true
    });
    loadData();
  };

  const handleEdit = (s: FeeStructure) => {
    setEditingId(s.id);
    setFormData({
      class_name: s.class_name,
      class_key: s.class_key,
      admission_fee: s.admission_fee,
      monthly_fee: s.monthly_fee,
      transport_fee: s.transport_fee,
      exam_fee: s.exam_fee,
      school_id: s.school_id,
      active: s.active
    });
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-[#2B2D42] dark:text-white">Fee Structure</h2>
          <p className="text-slate-500 dark:text-slate-400">Manage class-wise fee configurations</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-6 py-3 bg-[#2B2D42] dark:bg-brand-indigo text-white rounded-2xl font-semibold shadow-lg hover:opacity-90 transition-all"
        >
          <Plus className="h-5 w-5" />
          Add Structure
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full py-20 text-center text-slate-400">Loading...</div>
        ) : structures.length === 0 ? (
          <div className="col-span-full py-20 text-center text-slate-400">No fee structures defined.</div>
        ) : structures.map((s) => (
          <div key={s.id} className="bg-white dark:bg-[#1E1E1E] p-6 rounded-[2rem] border border-slate-100 dark:border-white/5 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-brand-indigo/10 rounded-xl flex items-center justify-center">
                  <Layout className="h-5 w-5 text-brand-indigo" />
                </div>
                <div>
                  <h3 className="font-bold text-[#2B2D42] dark:text-white">{s.class_name}</h3>
                  <code className="text-[10px] bg-slate-100 dark:bg-white/5 px-2 py-0.5 rounded text-slate-500 uppercase">{s.class_key}</code>
                </div>
              </div>
              <button 
                onClick={() => handleEdit(s)}
                className="p-2 hover:bg-slate-50 dark:hover:bg-white/5 rounded-xl transition-colors"
              >
                <Edit2 className="h-4 w-4 text-slate-400" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500">Monthly Fee</span>
                <span className="font-bold text-[#2B2D42] dark:text-white">{formatCurrency(s.monthly_fee)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500">Admission Fee</span>
                <span className="font-bold text-[#2B2D42] dark:text-white">{formatCurrency(s.admission_fee)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500">Transport Fee</span>
                <span className="font-bold text-[#2B2D42] dark:text-white">{formatCurrency(s.transport_fee)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500">Exam Fee</span>
                <span className="font-bold text-[#2B2D42] dark:text-white">{formatCurrency(s.exam_fee)}</span>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-slate-50 dark:border-white/5">
              <div className="flex items-center gap-2">
                <div className={cn("w-2 h-2 rounded-full", s.active ? "bg-emerald-500" : "bg-rose-500")} />
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {s.active ? 'Active' : 'Deactivated'}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-white dark:bg-[#1E1E1E] w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in duration-200">
            <div className="p-8 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-[#2B2D42] dark:text-white">
                {editingId ? 'Edit Fee Structure' : 'Add Fee Structure'}
              </h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-slate-50 dark:hover:bg-white/5 rounded-full"
              >
                <X className="h-6 w-6 text-slate-300" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-400 px-1">Class Name</label>
                  <input 
                    required
                    value={formData.class_name}
                    onChange={e => setFormData({...formData, class_name: e.target.value})}
                    placeholder="e.g. Class 1"
                    className="w-full px-5 py-4 bg-slate-50 dark:bg-white/5 border-transparent focus:border-brand-indigo rounded-2xl transition-all dark:text-white outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-400 px-1">Class Key</label>
                  <input 
                    required
                    value={formData.class_key}
                    onChange={e => setFormData({...formData, class_key: e.target.value.toLowerCase().replace(/\s+/g, '_')})}
                    placeholder="e.g. class_1"
                    className="w-full px-5 py-4 bg-slate-50 dark:bg-white/5 border-transparent focus:border-brand-indigo rounded-2xl transition-all dark:text-white outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-400 px-1">Monthly Fee</label>
                  <div className="relative">
                    <IndianRupee className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input 
                      type="number"
                      required
                      value={formData.monthly_fee}
                      onChange={e => setFormData({...formData, monthly_fee: Number(e.target.value)})}
                      className="w-full pl-12 pr-5 py-4 bg-slate-50 dark:bg-white/5 border-transparent focus:border-brand-indigo rounded-2xl transition-all dark:text-white outline-none"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-400 px-1">Admission Fee</label>
                  <div className="relative">
                    <IndianRupee className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input 
                      type="number"
                      value={formData.admission_fee}
                      onChange={e => setFormData({...formData, admission_fee: Number(e.target.value)})}
                      className="w-full pl-12 pr-5 py-4 bg-slate-50 dark:bg-white/5 border-transparent focus:border-brand-indigo rounded-2xl transition-all dark:text-white outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-400 px-1">Transport Fee</label>
                  <div className="relative">
                    <IndianRupee className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input 
                      type="number"
                      value={formData.transport_fee}
                      onChange={e => setFormData({...formData, transport_fee: Number(e.target.value)})}
                      className="w-full pl-12 pr-5 py-4 bg-slate-50 dark:bg-white/5 border-transparent focus:border-brand-indigo rounded-2xl transition-all dark:text-white outline-none"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-400 px-1">Exam Fee</label>
                  <div className="relative">
                    <IndianRupee className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input 
                      type="number"
                      value={formData.exam_fee}
                      onChange={e => setFormData({...formData, exam_fee: Number(e.target.value)})}
                      className="w-full pl-12 pr-5 py-4 bg-slate-50 dark:bg-white/5 border-transparent focus:border-brand-indigo rounded-2xl transition-all dark:text-white outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 py-2">
                <input 
                  type="checkbox"
                  id="active"
                  checked={formData.active}
                  onChange={e => setFormData({...formData, active: e.target.checked})}
                  className="w-5 h-5 rounded-lg text-brand-indigo"
                />
                <label htmlFor="active" className="text-sm font-semibold text-slate-600 dark:text-slate-300">Active Structure</label>
              </div>

              <button 
                type="submit"
                className="w-full py-5 bg-[#2B2D42] dark:bg-brand-indigo text-white rounded-3xl font-bold shadow-xl hover:opacity-90 transition-all flex items-center justify-center gap-3"
              >
                <CheckCircle className="h-5 w-5" />
                {editingId ? 'Update Structure' : 'Create Structure'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
