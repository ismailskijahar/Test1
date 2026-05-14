import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  Download,
  IndianRupee,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  CalendarDays,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { dataService } from '../../services/dataService';
import { FeeTransaction, DueRecord, Student } from '../../types';
import { feeEngine } from '../../services/feeEngine';
import { formatCurrency, cn } from '../../lib/utils';
import { format, startOfMonth, endOfMonth, isWithinInterval, subMonths } from 'date-fns';
import { useLanguage } from '../../context/LanguageContext';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';

export default function Reports() {
  const { profile } = useAuth();
  const { t } = useLanguage();
  const [transactions, setTransactions] = useState<FeeTransaction[]>([]);
  const [dues, setDues] = useState<DueRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    const loadData = async () => {
      const [tData, dData] = await Promise.all([
        dataService.getTransactionHistory(profile.school_id),
        dataService.getDueRecords(profile.school_id)
      ]);
      setTransactions(tData);
      setDues(dData);
      setLoading(false);
    };
    loadData();
  }, [profile]);

  const now = new Date();
  const currentMonthStart = startOfMonth(now);
  const currentMonthEnd = endOfMonth(now);

  const thisMonthTransactions = transactions.filter(t => 
    isWithinInterval(new Date(t.payment_date), { start: currentMonthStart, end: currentMonthEnd })
  );

  const lastMonthTransactions = transactions.filter(t => 
    isWithinInterval(new Date(t.payment_date), { 
      start: startOfMonth(subMonths(now, 1)), 
      end: endOfMonth(subMonths(now, 1)) 
    })
  );

  const totalThisMonth = thisMonthTransactions.reduce((sum, t) => sum + t.amount, 0);
  const totalLastMonth = lastMonthTransactions.reduce((sum, t) => sum + t.amount, 0);
  const growth = totalLastMonth === 0 ? 100 : ((totalThisMonth - totalLastMonth) / totalLastMonth) * 100;

  const totalOutstanding = feeEngine.calculateTotalOverdue(dues);
  const overdueMonths = feeEngine.getOverdueMonthsList();
  const overdueCount = dues.filter(d => overdueMonths.includes(d.month) && d.status !== 'Paid').length;

  // Yearly Metrics (Jan - Dec of Current Year)
  const currentYearStr = now.getFullYear().toString();
  const yearlyDues = dues.filter(d => d.month.startsWith(currentYearStr));
  const yearlyTarget = yearlyDues.reduce((sum, d) => sum + d.amount, 0);
  const yearlyCollected = yearlyDues.reduce((sum, d) => sum + d.paid_amount, 0);
  const yearlyBalance = yearlyTarget - yearlyCollected;

  // Collection by method
  const collectionByMethod = [
    { name: 'Cash', value: transactions.filter(t => t.method === 'cash').reduce((sum, t) => sum + t.amount, 0) },
    { name: 'UPI', value: transactions.filter(t => t.method === 'upi').reduce((sum, t) => sum + t.amount, 0) },
    { name: 'Bank', value: transactions.filter(t => t.method === 'bank').reduce((sum, t) => sum + t.amount, 0) },
  ];

  // Monthly breakdown for chart
  const last6Months = Array.from({ length: 6 }).map((_, i) => {
    const d = subMonths(now, 5 - i);
    const mStr = format(d, 'MMM');
    const mKey = format(d, 'yyyy-MM');
    const monthTx = transactions.filter(t => t.payment_date.startsWith(mKey));
    return {
      name: mStr,
      amount: monthTx.reduce((sum, t) => sum + t.amount, 0)
    };
  });

  const [isResetting, setIsResetting] = useState(false);

  const handleReset = async () => {
    if (!profile) return;
    
    const confirmMessage = "CRITICAL ACTION: This will permanently delete ALL transactions, receipts, and due records. Students and fee structures will be preserved, but all financial history will be wiped. Are you sure you want to proceed?";
    
    if (window.confirm(confirmMessage)) {
      setIsResetting(true);
      try {
        const success = await dataService.resetFeesSystem(profile.school_id);
        if (success) {
          alert('Financial records reset successfully. Dues have been regenerated for the current session.');
          window.location.reload();
        } else {
          alert('Failed to reset records. Please check your permissions or network connection.');
        }
      } catch (error) {
        console.error('Reset failed:', error);
        alert('An unexpected error occurred during reset.');
      } finally {
        setIsResetting(false);
      }
    }
  };

  return (
    <div className="space-y-8 pb-12">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#2B2D42] dark:text-white">Financial Reports</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Deep dive into collection metrics and outstanding dues</p>
        </div>
        <button className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-[#1E1E1E] border border-slate-100 dark:border-white/5 rounded-2xl font-bold text-slate-600 dark:text-white hover:bg-slate-50 dark:hover:bg-white/10 transition-all shadow-sm">
           <Download className="h-5 w-5" />
           Export PDF
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
         {/* Yearly Session Summary */}
         <div className="lg:col-span-2 bg-brand-indigo p-8 pb-10 rounded-[2.5rem] text-white shadow-xl shadow-brand-indigo/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl opacity-50" />
            <div className="relative z-10">
               <div className="flex items-center justify-between mb-8">
                  <div>
                    <p className="text-indigo-200 text-[10px] font-bold uppercase tracking-widest">Academic Year {now.getFullYear()}</p>
                    <h3 className="text-2xl font-black mt-1">Session Summary</h3>
                  </div>
                  <div className="bg-white/20 px-4 py-2 rounded-2xl flex items-center gap-2">
                     <Calendar className="h-4 w-4" />
                     <span className="text-xs font-bold italic">Jan → Dec Cycle</span>
                  </div>
               </div>

               <div className="grid grid-cols-3 gap-8">
                  <div>
                     <p className="text-indigo-200 text-[10px] font-bold uppercase tracking-widest mb-1">Total Target</p>
                     <p className="text-2xl font-black leading-tight text-white">{formatCurrency(yearlyTarget)}</p>
                  </div>
                  <div>
                     <p className="text-indigo-200 text-[10px] font-bold uppercase tracking-widest mb-1">Collected</p>
                     <p className="text-2xl font-black leading-tight text-emerald-300">{formatCurrency(yearlyCollected)}</p>
                  </div>
                  <div>
                     <p className="text-indigo-200 text-[10px] font-bold uppercase tracking-widest mb-1">Balance Due</p>
                     <p className="text-2xl font-black leading-tight text-brand-coral">{formatCurrency(yearlyBalance)}</p>
                  </div>
               </div>

               <div className="mt-8 pt-8 border-t border-white/10">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-xs font-bold text-indigo-100 uppercase tracking-widest">Collection Progress</span>
                    <span className="text-sm font-black">{yearlyTarget === 0 ? 0 : Math.round((yearlyCollected/yearlyTarget)*100)}%</span>
                  </div>
                  <div className="w-full bg-white/10 h-3 rounded-full overflow-hidden">
                     <div 
                        className="h-full bg-emerald-400 rounded-full transition-all duration-1000" 
                        style={{ width: `${yearlyTarget === 0 ? 0 : (yearlyCollected/yearlyTarget)*100}%` }}
                     />
                  </div>
               </div>
            </div>
         </div>

         <div className="bg-white dark:bg-[#1E1E1E] p-8 rounded-[2.5rem] border border-slate-100 dark:border-white/5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
               <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-500/10 rounded-2xl flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-emerald-500" />
               </div>
               <div className={cn(
                 "flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold",
                 growth >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
               )}>
                  {growth >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                  {Math.abs(Math.round(growth))}%
               </div>
            </div>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">This Month Collection</p>
            <p className="text-2xl font-black text-[#2B2D42] dark:text-white mt-1">{formatCurrency(totalThisMonth)}</p>
         </div>

         <div className="bg-white dark:bg-[#1E1E1E] p-8 rounded-[2.5rem] border border-slate-100 dark:border-white/5 shadow-sm">
            <div className="w-12 h-12 bg-rose-50 dark:bg-rose-500/10 rounded-2xl flex items-center justify-center mb-4">
               <TrendingDown className="h-6 w-6 text-rose-500" />
            </div>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Total Outstanding</p>
            <p className="text-2xl font-black text-rose-500 mt-1">{formatCurrency(totalOutstanding)}</p>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
         <div className="bg-white dark:bg-[#1E1E1E] p-10 rounded-[3rem] border border-slate-100 dark:border-white/5 shadow-sm">
            <h3 className="text-xl font-bold text-[#2B2D42] dark:text-white mb-8">Collection Trend (6 Months)</h3>
            <div className="h-[300px] w-full mt-4">
               <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={last6Months}>
                    <defs>
                      <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2B2D42" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#2B2D42" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 12, fontWeight: 600, fill: '#94a3b8' }} 
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 12, fontWeight: 600, fill: '#94a3b8' }}
                      tickFormatter={(value) => `${value / 1000}k`}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        borderRadius: '24px', 
                        border: 'none', 
                        boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                        padding: '16px'
                      }}
                      itemStyle={{ fontWeight: 800, color: '#2B2D42' }}
                    />
                    <Area type="monotone" dataKey="amount" stroke="#2B2D42" strokeWidth={4} fillOpacity={1} fill="url(#colorAmount)" />
                  </AreaChart>
               </ResponsiveContainer>
            </div>
         </div>

         <div className="bg-white dark:bg-[#1E1E1E] p-10 rounded-[3rem] border border-slate-100 dark:border-white/5 shadow-sm">
            <h3 className="text-xl font-bold text-[#2B2D42] dark:text-white mb-10">Payment Methods</h3>
            <div className="space-y-10">
               {collectionByMethod.map((item, idx) => {
                  const total = collectionByMethod.reduce((sum, i) => sum + i.value, 0);
                  const percentage = total === 0 ? 0 : Math.round((item.value / total) * 100);
                  const colors = ['bg-indigo-500', 'bg-emerald-500', 'bg-amber-500'];
                  
                  return (
                    <div key={item.name} className="space-y-3">
                       <div className="flex justify-between items-center">
                          <span className="font-bold text-[#2B2D42] dark:text-white uppercase tracking-widest text-[10px]">{item.name}</span>
                          <span className="font-black text-[#2B2D42] dark:text-white text-lg">{formatCurrency(item.value)}</span>
                       </div>
                       <div className="w-full bg-slate-50 dark:bg-white/5 h-4 rounded-full overflow-hidden">
                          <div 
                            className={cn("h-full rounded-full transition-all duration-1000", colors[idx])} 
                            style={{ width: `${percentage}%` }}
                          />
                       </div>
                       <div className="flex justify-between">
                          <span className="text-[10px] font-bold text-slate-400">{percentage}% of total</span>
                          <span className="text-[10px] font-bold text-slate-400">Target 100%</span>
                       </div>
                    </div>
                  );
               })}
            </div>
         </div>
      </div>

      {/* Advanced Tools - Danger Zone */}
      {(profile?.role === 'school_admin' || profile?.role === 'super_admin') && (
        <div className="bg-rose-50 dark:bg-rose-500/5 p-10 rounded-[30px] border border-rose-100 dark:border-rose-500/20 mt-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-6">
              <div className="h-16 w-16 bg-rose-100 dark:bg-rose-500/20 rounded-3xl flex items-center justify-center text-rose-500">
                <RefreshCw className="h-8 w-8" />
              </div>
              <div className="text-left">
                <h3 className="text-xl font-bold text-rose-600">Advanced Tools (Danger Zone)</h3>
                <p className="text-xs text-rose-500/80 mt-1 max-w-lg">Resetting the system will permanently delete all transactions, receipts, and due records. This is useful for clearing test data or starting a new academic year.</p>
              </div>
            </div>
            <button 
              onClick={handleReset}
              disabled={isResetting}
              className={cn(
                "px-10 py-4 bg-rose-600 text-white rounded-2xl font-bold hover:bg-rose-700 transition-all shadow-xl shadow-rose-600/30 flex items-center gap-2 whitespace-nowrap active:scale-95 disabled:opacity-50",
                isResetting && "animate-pulse"
              )}
            >
              {isResetting ? (
                <>
                  <RefreshCw className="h-5 w-5 animate-spin" />
                  Resetting Records...
                </>
              ) : (
                'Reset Fees Data'
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
