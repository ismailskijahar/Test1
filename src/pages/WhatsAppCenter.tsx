import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  Search, 
  MoreVertical, 
  Phone, 
  MessageSquare, 
  User, 
  Bot, 
  UserCircle,
  Check,
  CheckCheck,
  Clock,
  AlertCircle,
  FileText,
  Bell,
  Zap,
  Filter,
  BarChart3
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { dataService } from '../services/dataService';
import { WhatsAppConversation, WhatsAppMessage, WhatsAppLog } from '../types';
import { format } from 'date-fns';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { whatsappService } from '../services/whatsappService';

export default function WhatsAppCenter() {
  const { profile } = useAuth();
  const [conversations, setConversations] = useState<WhatsAppConversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<WhatsAppConversation | null>(null);
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [logs, setLogs] = useState<WhatsAppLog[]>([]);
  const [activeTab, setActiveTab] = useState<'chats' | 'logs' | 'broadcast' | 'stats'>('chats');
  const [input, setInput] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!profile) return;

    const unsubscribeConvs = dataService.getWhatsAppConversations(profile.school_id, (data) => {
      setConversations(data);
      setLoading(false);
    });

    dataService.getWhatsAppLogs(profile.school_id).then(setLogs);

    return () => unsubscribeConvs();
  }, [profile]);

  useEffect(() => {
    if (!profile || !selectedConv) return;

    const unsubscribeMsgs = dataService.getWhatsAppMessages(profile.school_id, selectedConv.id, (data) => {
      setMessages(data);
      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      }, 100);
    });

    return () => unsubscribeMsgs();
  }, [profile, selectedConv]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !selectedConv || !profile || sending) return;

    const msgBody = input;
    setInput('');
    setSending(true);

    try {
      await whatsappService.sendTextMessage(profile.school_id, selectedConv.parent_phone, msgBody);
      // The message will appear via onSnapshot from Firestore once the server saves it
    } catch (error: any) {
      console.error(error);
      const errorData = error.response?.data;
      const errorMessage = errorData?.error?.message || errorData?.details || errorData?.error || error.message;
      alert(`Failed to send message: ${errorMessage}`);
    } finally {
      setSending(false);
    }
  };

  const toggleMode = async () => {
    if (!selectedConv || !profile) return;
    const newMode = selectedConv.mode === 'agent' ? 'human' : 'agent';
    try {
      await dataService.updateWhatsAppConversation(profile.school_id, selectedConv.id, { mode: newMode as any });
      setSelectedConv(prev => prev ? { ...prev, mode: newMode as any } : null);
    } catch (error) {
      console.error(error);
    }
  };

  const filteredConversations = conversations.filter(c => 
    c.parent_phone.includes(search) || 
    c.parent_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col gap-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#2B2D42]">WhatsApp Center</h1>
          <p className="text-slate-500 mt-1">Official Meta Business API Integrated Communication Hub</p>
        </div>
        
        <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-2xl border border-slate-200">
           {['chats', 'logs', 'broadcast', 'stats'].map((tab) => (
             <button
               key={tab}
               onClick={() => setActiveTab(tab as any)}
               className={cn(
                 "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                 activeTab === tab 
                   ? "bg-white text-brand-indigo shadow-md" 
                   : "text-slate-400 hover:text-slate-600"
               )}
             >
               {tab}
             </button>
           ))}
        </div>
      </header>

      <div className="flex-1 flex gap-6 overflow-hidden">
        {activeTab === 'chats' && (
          <>
            {/* Sidebar */}
            <div className="w-full md:w-80 flex flex-col bg-white border border-slate-100 rounded-[2.5rem] overflow-hidden shadow-sm">
              <div className="p-6 border-b border-slate-50 flex flex-col gap-4">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search parents..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-brand-indigo"
                  />
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto">
                {loading ? (
                  <div className="p-10 text-center text-slate-400 font-bold italic">Loading...</div>
                ) : filteredConversations.length > 0 ? (
                  filteredConversations.map((conv) => (
                    <div
                      key={conv.id}
                      onClick={() => setSelectedConv(conv)}
                      className={cn(
                        "p-6 flex items-center gap-4 cursor-pointer border-b border-slate-50 transition-colors",
                        selectedConv?.id === conv.id ? "bg-brand-indigo/5 border-l-4 border-l-brand-indigo" : "hover:bg-slate-50 border-l-4 border-l-transparent"
                      )}
                    >
                      <div className="h-12 w-12 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-600">
                        <UserCircle className="h-6 w-6" />
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <div className="flex items-center justify-between">
                          <p className="font-black text-sm text-[#2B2D42] truncate">{conv.parent_name || conv.parent_phone}</p>
                          <span className="text-[9px] font-bold text-slate-400">
                            {conv.last_message_at ? format(new Date(conv.last_message_at), 'HH:mm') : ''}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 truncate mt-0.5">{conv.last_message}</p>
                      </div>
                      {conv.unread_count > 0 && (
                        <div className="h-5 w-5 rounded-full bg-brand-indigo text-[10px] font-black text-white flex items-center justify-center">
                          {conv.unread_count}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="p-10 text-center text-slate-300 font-bold italic">No active conversations</div>
                )}
              </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 flex flex-col bg-white border border-slate-100 rounded-[2.5rem] overflow-hidden shadow-sm">
              {selectedConv ? (
                <>
                  <div className="px-8 py-4 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 bg-brand-indigo/10 text-brand-indigo rounded-xl flex items-center justify-center shadow-sm">
                        <Phone className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-black text-[#2B2D42]">{selectedConv.parent_name || selectedConv.parent_phone}</p>
                        <button 
                          onClick={toggleMode}
                          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                        >
                          <div className={cn("h-1.5 w-1.5 rounded-full", selectedConv.mode === 'agent' ? "bg-emerald-500" : "bg-brand-indigo")} />
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            {selectedConv.mode === 'agent' ? 'AI Agent Mode' : 'Human Mode'}
                          </span>
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                       <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-xl mr-4">
                          {selectedConv.mode === 'agent' ? <Bot className="h-4 w-4 text-emerald-600" /> : <User className="h-4 w-4 text-brand-indigo" />}
                          <span className="text-[10px] font-bold text-slate-600 uppercase">
                            {selectedConv.mode === 'agent' ? 'AI Responding' : 'Manual Control'}
                          </span>
                       </div>
                      <button className="p-3 text-slate-400 hover:text-brand-indigo rounded-xl transition-colors">
                        <MoreVertical className="h-5 w-5" />
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-8 space-y-6" ref={scrollRef}>
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={cn(
                          "flex",
                          msg.direction === 'outbound' ? "justify-end" : "justify-start"
                        )}
                      >
                        <div className={cn(
                          "max-w-[70%] p-4 rounded-3xl text-sm shadow-sm",
                          msg.direction === 'outbound' 
                            ? "bg-[#2B2D42] text-white rounded-tr-none" 
                            : "bg-slate-100 text-[#2B2D42] rounded-tl-none border border-slate-200"
                        )}>
                          <p className="leading-relaxed">{msg.body}</p>
                          <div className={cn(
                            "flex items-center gap-1 mt-2",
                            msg.direction === 'outbound' ? "justify-end text-white/50" : "text-slate-400"
                          )}>
                            <span className="text-[10px] font-bold uppercase tracking-tighter">
                              {msg.timestamp ? format(new Date(msg.timestamp), 'HH:mm') : ''}
                            </span>
                            {msg.direction === 'outbound' && (
                              <span className="ml-1">
                                {msg.status === 'read' ? <CheckCheck className="h-3 w-3 text-brand-indigo" /> : 
                                 msg.status === 'delivered' ? <CheckCheck className="h-3 w-3" /> :
                                 msg.status === 'sent' ? <Check className="h-3 w-3" /> :
                                 msg.status === 'failed' ? <AlertCircle className="h-3 w-3 text-red-500" /> :
                                 <Clock className="h-3 w-3" />}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <form onSubmit={handleSendMessage} className="p-6 border-t border-slate-50 bg-slate-50/30 flex items-center gap-4">
                    <button type="button" className="p-3 text-slate-400 hover:text-brand-indigo rounded-xl bg-white border border-slate-100 shadow-sm transition-all active:scale-95">
                      <MoreVertical className="h-5 w-5" />
                    </button>
                    <input
                      type="text"
                      placeholder={selectedConv.mode === 'agent' ? "AI is handling this chat..." : "Type a message..."}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      disabled={sending}
                      className="flex-1 px-6 py-3 bg-white border border-slate-100 rounded-2xl text-sm shadow-inner focus:ring-2 focus:ring-brand-indigo disabled:opacity-50"
                    />
                    <button 
                      type="submit" 
                      disabled={sending || !input.trim()}
                      className="p-4 bg-brand-indigo text-white rounded-2xl shadow-xl shadow-brand-indigo/30 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100"
                    >
                      {sending ? <Clock className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                    </button>
                  </form>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-20">
                   <div className="h-24 w-24 bg-slate-50 rounded-[2.5rem] flex items-center justify-center text-slate-200 mb-8 overflow-hidden relative">
                      <MessageSquare className="h-10 w-10" />
                      <div className="absolute inset-0 bg-brand-indigo/5 animate-pulse" />
                   </div>
                   <h3 className="text-xl font-black text-[#2B2D42] mb-2">WhatsApp Communication Center</h3>
                   <p className="text-slate-400 max-w-sm mb-8">Select a parent from the sidebar to begin chatting or viewing historical communication strings.</p>
                   <div className="grid grid-cols-2 gap-4 w-full max-w-md">
                      <div className="p-6 rounded-3xl bg-emerald-50 border border-emerald-100 text-left cursor-pointer hover:border-emerald-300 transition-colors">
                         <Bot className="h-6 w-6 text-emerald-600 mb-3" />
                         <h4 className="font-bold text-sm text-[#2B2D42]">AI Agent Mode</h4>
                         <p className="text-[10px] text-emerald-600 font-black uppercase tracking-widest mt-1">Smart Auto-Reply</p>
                      </div>
                      <div className="p-6 rounded-3xl bg-brand-indigo/5 border border-brand-indigo/10 text-left cursor-pointer hover:border-brand-indigo/30 transition-colors">
                         <User className="h-6 w-6 text-brand-indigo mb-3" />
                         <h4 className="font-bold text-sm text-[#2B2D42]">Receptionist</h4>
                         <p className="text-[10px] text-brand-indigo font-black uppercase tracking-widest mt-1">Human Mode</p>
                      </div>
                   </div>
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === 'logs' && (
          <div className="w-full flex flex-col bg-white border border-slate-100 rounded-[2.5rem] overflow-hidden shadow-sm">
             <div className="p-8 border-b border-slate-50 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black text-[#2B2D42]">Notification Broadcast Logs</h3>
                  <p className="text-xs text-slate-400">Complete audit trail of all automated alerts</p>
                </div>
                <div className="flex items-center gap-3">
                   <button className="flex items-center gap-2 px-6 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors">
                      <Filter className="h-4 w-4" /> Filter Logs
                   </button>
                   <button className="flex items-center gap-2 px-6 py-2.5 bg-[#2B2D42] text-white rounded-xl text-xs font-bold shadow-lg shadow-brand-indigo/10">
                      <BarChart3 className="h-4 w-4" /> Export Report
                   </button>
                </div>
             </div>
             
             <div className="flex-1 overflow-y-auto">
                <table className="w-full">
                   <thead className="sticky top-0 bg-slate-50 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 border-b border-slate-100">
                      <tr>
                         <th className="px-8 py-4 text-left">Student</th>
                         <th className="px-8 py-4 text-left">Parent Phone</th>
                         <th className="px-8 py-4 text-left">Status</th>
                         <th className="px-8 py-4 text-left">Type</th>
                         <th className="px-8 py-4 text-left">Content</th>
                         <th className="px-8 py-4 text-right">Sent At</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-50">
                      {logs.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-50 transition-colors group">
                           <td className="px-8 py-6">
                              <div className="flex items-center gap-3">
                                 <div className="h-8 w-8 rounded-lg bg-brand-indigo/10 flex items-center justify-center font-bold text-[10px] text-brand-indigo">
                                    {log.student_name.charAt(0)}
                                 </div>
                                 <span className="text-sm font-bold text-[#2B2D42]">{log.student_name}</span>
                              </div>
                           </td>
                           <td className="px-8 py-6 text-xs text-slate-500 font-mono">{log.parent_phone}</td>
                           <td className="px-8 py-6">
                              <span className={cn(
                                "text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full",
                                log.status === 'delivered' || log.status === 'read' ? "bg-emerald-50 text-emerald-600" :
                                log.status === 'sent' ? "bg-blue-50 text-blue-600" : "bg-red-50 text-red-600"
                              )}>
                                 {log.status}
                              </span>
                           </td>
                           <td className="px-8 py-6">
                              <div className="flex items-center gap-2 text-xs text-slate-400">
                                 {log.type === 'template' ? <Zap className="h-3 w-3 text-amber-500" /> : <MessageSquare className="h-3 w-3" />}
                                 <span className="font-bold">{log.type}</span>
                              </div>
                           </td>
                           <td className="px-8 py-6 text-xs text-slate-500 max-w-[200px] truncate">{log.message}</td>
                           <td className="px-8 py-6 text-right text-[10px] font-bold text-slate-400">{format(new Date(log.sent_at), 'MMM dd, HH:mm')}</td>
                        </tr>
                      ))}
                   </tbody>
                </table>
             </div>
          </div>
        )}
      </div>
    </div>
  );
}
