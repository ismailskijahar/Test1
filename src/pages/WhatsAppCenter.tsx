import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, 
  Send, 
  CheckCheck, 
  AlertCircle, 
  RefreshCw,
  Search,
  User,
  Bot,
  MoreVertical,
  ArrowLeft,
  Settings,
  Circle,
  FileText,
  Image as ImageIcon,
  Headphones,
  Video
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { whatsappService, WhatsAppConversation, WhatsAppMessage } from '../services/whatsappService';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import { useLanguage } from '../context/LanguageContext';
import { motion, AnimatePresence } from 'motion/react';

export default function WhatsAppCenter() {
  const { profile } = useAuth();
  const { t } = useLanguage();
  const [conversations, setConversations] = useState<WhatsAppConversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<WhatsAppConversation | null>(null);
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isMobileView, setIsMobileView] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Load Conversations
  useEffect(() => {
    if (!profile?.school_id) return;

    const unsubscribe = whatsappService.subscribeToConversations(profile.school_id, (data) => {
      setConversations(data);
      setLoading(false);
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [profile]);

  // Handle mobile resize
  useEffect(() => {
    const handleResize = () => {
      const isMobile = window.innerWidth < 768;
      setIsMobileView(isMobile);
      if (!isMobile) setSidebarOpen(true);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const selectConversation = (conv: WhatsAppConversation) => {
    setSelectedConv(conv);
    if (isMobileView) setSidebarOpen(false);
  };

  // Load Messages for selected conversation
  useEffect(() => {
    if (!profile?.school_id || !selectedConv) {
      setMessages([]);
      return;
    }

    const unsubscribe = whatsappService.subscribeToMessages(profile.school_id, selectedConv.id, (data) => {
      setMessages(data);
      // Mark as read when messages arrive and we are viewing it
      whatsappService.markAsRead(profile.school_id, selectedConv.id);
    });

    return () => unsubscribe();
  }, [selectedConv, profile]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || !selectedConv || !profile) return;

    const content = inputMessage.trim();
    setInputMessage('');

    try {
      await whatsappService.sendMessage(profile.school_id, selectedConv.id, selectedConv.phone, content);
    } catch (error) {
      console.error(error);
      alert("Failed to send message. Check console for details.");
    }
  };

  const toggleMode = async (mode: 'ai' | 'human') => {
    if (!selectedConv || !profile) return;
    await whatsappService.updateMode(profile.school_id, selectedConv.id, mode);
  };

  const filteredConversations = conversations.filter(conv => 
    conv.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conv.phone?.includes(searchTerm)
  );

  const formatTime = (ts: any) => {
    if (!ts) return '';
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    return format(date, 'h:mm a');
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (!profile) return null;

  const renderMessageContent = (msg: WhatsAppMessage) => {
    if (msg.type && msg.type !== 'text') {
      return (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 p-3 bg-black/5 dark:bg-white/5 rounded-xl border border-dashed border-black/10 dark:border-white/10">
            {msg.type === 'image' && <ImageIcon className="h-5 w-5 text-neutral-400" />}
            {msg.type === 'audio' && <Headphones className="h-5 w-5 text-neutral-400" />}
            {msg.type === 'video' && <Video className="h-5 w-5 text-neutral-400" />}
            {(msg.type === 'document' || msg.type === 'file') && <FileText className="h-5 w-5 text-neutral-400" />}
            <span className="text-[10px] font-bold uppercase tracking-tight text-neutral-400">{msg.type} received</span>
          </div>
          {msg.content && <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>}
        </div>
      );
    }
    return <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>;
  };

  return (
    <div className="h-[calc(100vh-10rem)] flex flex-col md:flex-row bg-white dark:bg-[#121212] border border-neutral-100 dark:border-white/5 rounded-[2rem] overflow-hidden shadow-2xl relative">
      
      {/* Sidebar */}
      <div className={cn(
        "w-full md:w-80 lg:w-96 flex flex-col border-r border-neutral-100 dark:border-white/5 transition-all duration-300",
        !sidebarOpen && "md:w-0 overflow-hidden border-none"
      )}>
        {/* Sidebar Header */}
        <div className="p-6 border-b border-neutral-100 dark:border-white/5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold flex items-center gap-2 dark:text-white">
                    <MessageSquare className="h-6 w-6 text-brand-indigo" />
                    WhatsApp Center
                  </h2>
            <div className="flex items-center gap-2">
               <button className="p-2 hover:bg-neutral-50 dark:hover:bg-white/5 rounded-xl transition-all">
                 <RefreshCw className={cn("h-4 w-4 text-neutral-400", loading && "animate-spin")} />
               </button>
               <button className="p-2 hover:bg-neutral-50 dark:hover:bg-white/5 rounded-xl transition-all md:hidden" onClick={() => setSidebarOpen(false)}>
                 <ArrowLeft className="h-4 w-4 text-neutral-400" />
               </button>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
            <input 
              type="text"
              placeholder="Search chats..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-neutral-50 dark:bg-white/5 border-none rounded-2xl text-xs focus:ring-2 focus:ring-brand-indigo/20 transition-all dark:text-white"
            />
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
          {loading ? (
            <div className="p-8 text-center">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto text-neutral-200" />
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-8 text-center space-y-2">
               <MessageSquare className="h-10 w-10 text-neutral-100 dark:text-white/5 mx-auto" />
               <p className="text-sm text-neutral-400 font-medium italic">No conversations yet</p>
            </div>
          ) : (
            filteredConversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => selectConversation(conv)}
                className={cn(
                  "w-full p-4 rounded-3xl flex items-center gap-4 transition-all duration-200 group text-left",
                  selectedConv?.id === conv.id 
                    ? "bg-brand-indigo/5 dark:bg-brand-indigo/10 border-none ring-1 ring-brand-indigo/20" 
                    : "hover:bg-neutral-50 dark:hover:bg-white/5 border border-transparent"
                )}
              >
                <div className="relative">
                  <div className={cn(
                    "h-12 w-12 rounded-2xl flex items-center justify-center font-bold text-sm",
                    selectedConv?.id === conv.id ? "bg-brand-indigo text-white shadow-lg shadow-brand-indigo/20" : "bg-neutral-100 dark:bg-white/10 text-neutral-500 dark:text-neutral-400"
                  )}>
                    {getInitials(conv.name)}
                  </div>
                  {conv.unread_count > 0 && (
                    <div className="absolute -top-1 -right-1 h-5 w-5 bg-brand-coral text-white rounded-full flex items-center justify-center text-[10px] font-black border-2 border-white dark:border-[#121212] animate-bounce">
                      {conv.unread_count}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-0.5">
                    <h3 className="font-bold text-sm text-neutral-900 dark:text-white truncate">{conv.name}</h3>
                    <span className="text-[10px] font-medium text-neutral-400">{formatTime(conv.updated_at)}</span>
                  </div>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate flex items-center gap-1.5">
                    {conv.mode === 'ai' || conv.mode === 'agent' ? <Bot className="h-3 w-3 inline" /> : <User className="h-3 w-3 inline" />}
                    {conv.last_message || "No messages"}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col relative bg-neutral-50/50 dark:bg-[#0A0A0A]/30">
        <AnimatePresence mode="wait">
          {!selectedConv ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col items-center justify-center p-12 text-center"
            >
              <div className="h-24 w-24 bg-white dark:bg-white/5 rounded-[2.5rem] flex items-center justify-center shadow-xl mb-6">
                <MessageSquare className="h-12 w-12 text-brand-indigo animate-pulse" />
              </div>
              <h2 className="text-2xl font-bold dark:text-white mb-2">Welcome to WhatsApp Center</h2>
              <p className="text-sm text-neutral-400 max-w-sm">Select a conversation from the sidebar to view chat history and manage AI replies.</p>
            </motion.div>
          ) : (
            <motion.div 
              key={selectedConv.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex-1 flex flex-col h-full overflow-hidden"
            >
              {/* Chat Header */}
              <div className="p-6 bg-white dark:bg-[#1E1E1E] border-b border-neutral-100 dark:border-white/5 flex items-center justify-between z-10 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-brand-indigo text-white flex items-center justify-center font-bold shadow-lg shadow-brand-indigo/10">
                    {getInitials(selectedConv.name)}
                  </div>
                  <div>
                    <h3 className="font-bold dark:text-white flex items-center gap-2">
                       {selectedConv.name}
                       <span className={cn(
                         "px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest",
                         (selectedConv.mode === 'ai' || selectedConv.mode === 'agent') ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10" : "bg-orange-100 text-orange-600 dark:bg-orange-500/10"
                       )}>
                         {selectedConv.mode === 'agent' ? 'ai' : selectedConv.mode}
                       </span>
                    </h3>
                    <p className="text-[10px] font-medium text-neutral-400">{selectedConv.phone}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                   <div className="hidden lg:flex items-center bg-neutral-100 dark:bg-white/5 rounded-2xl p-1">
                      <button 
                        onClick={() => toggleMode('ai')}
                        className={cn(
                          "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                          (selectedConv.mode === 'ai' || selectedConv.mode === 'agent') ? "bg-white dark:bg-brand-indigo text-brand-indigo dark:text-white shadow-md" : "text-neutral-400"
                        )}
                      >
                        AI Assistant
                      </button>
                      <button 
                        onClick={() => toggleMode('human')}
                        className={cn(
                          "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                          selectedConv.mode === 'human' ? "bg-white dark:bg-brand-indigo text-brand-indigo dark:text-white shadow-md" : "text-neutral-400"
                        )}
                      >
                        Human Portal
                      </button>
                   </div>
                   <button className="p-3 hover:bg-neutral-50 dark:hover:bg-white/5 rounded-2xl transition-all">
                      <MoreVertical className="h-5 w-5 text-neutral-400" />
                   </button>
                </div>
              </div>

              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar scroll-smooth">
                {messages.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-neutral-300 dark:text-white/5 italic text-sm">
                    No messages in this chat
                  </div>
                ) : (
                  messages.map((msg, i) => {
                    const isUser = msg.role === 'user';
                    const showDateHeader = i === 0 || format(new Date(msg.created_at?.toDate ? msg.created_at.toDate() : msg.created_at), 'yyyy-MM-dd') !== format(new Date(messages[i-1].created_at?.toDate ? messages[i-1].created_at.toDate() : messages[i-1].created_at), 'yyyy-MM-dd');

                    return (
                      <React.Fragment key={msg.id}>
                        {showDateHeader && (
                          <div className="flex justify-center my-8">
                            <span className="px-4 py-1.5 bg-neutral-100 dark:bg-white/5 rounded-full text-[9px] font-black text-neutral-400 uppercase tracking-[0.2em]">
                              {format(new Date(msg.created_at?.toDate ? msg.created_at.toDate() : msg.created_at), 'MMMM d, yyyy')}
                            </span>
                          </div>
                        )}
                        <div className={cn(
                          "flex w-full mb-4",
                          isUser ? "justify-start" : "justify-end"
                        )}>
                          <div className={cn(
                            "max-w-[80%] px-5 py-3 rounded-2xl shadow-sm relative group",
                            isUser 
                              ? "bg-white dark:bg-[#1E1E1E] text-neutral-900 dark:text-white rounded-bl-none border border-neutral-100 dark:border-white/5" 
                              : "bg-brand-indigo text-white rounded-br-none"
                          )}>
                            {renderMessageContent(msg)}
                            <div className={cn(
                              "flex items-center gap-1.5 font-bold uppercase tracking-widest mt-2",
                              isUser ? "text-neutral-400" : "text-white/60"
                            )}>
                               <span className="text-[8px]">{formatTime(msg.created_at)}</span>
                               {!isUser && <CheckCheck className="h-3 w-3" />}
                            </div>
                          </div>
                        </div>
                      </React.Fragment>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className="p-6 bg-white dark:bg-[#1E1E1E] border-t border-neutral-100 dark:border-white/5">
                {(selectedConv.mode === 'ai' || selectedConv.mode === 'agent') && (
                  <div className="mb-4 p-3 bg-emerald-50 dark:bg-emerald-500/5 rounded-xl border border-emerald-100 dark:border-emerald-500/10 flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                    <Bot className="h-4 w-4 text-emerald-500" />
                    <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-tight">AI Assistant is active. It will automatically reply to new messages.</p>
                  </div>
                )}
                <form onSubmit={handleSendMessage} className="flex items-center gap-4">
                   <div className="flex-1 relative">
                     <textarea 
                       rows={1}
                       value={inputMessage}
                       onChange={(e) => setInputMessage(e.target.value)}
                       onKeyDown={(e) => {
                         if (e.key === 'Enter' && !e.shiftKey) {
                           e.preventDefault();
                           handleSendMessage(e);
                         }
                       }}
                       placeholder="Type your message here..."
                       className="w-full pl-6 pr-12 py-4 bg-neutral-50 dark:bg-white/5 border-none rounded-[1.5rem] text-sm focus:ring-2 focus:ring-brand-indigo/20 resize-none transition-all dark:text-white"
                     />
                   </div>
                   <button 
                     type="submit"
                     disabled={!inputMessage.trim()}
                     className="h-14 w-14 bg-brand-indigo text-white rounded-2xl flex items-center justify-center shadow-lg shadow-brand-indigo/20 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 transition-all font-bold"
                   >
                     <Send className="h-6 w-6" />
                   </button>
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Floating Toggle for Sidebar visibility - Mobile/Tablet only */}
      {!sidebarOpen && (
        <button 
          onClick={() => setSidebarOpen(true)}
          className="absolute left-6 bottom-24 p-4 bg-brand-indigo text-white rounded-2xl shadow-xl z-50 animate-in scale-in"
        >
          <ArrowLeft className="h-6 w-6 rotate-180" />
        </button>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(156, 163, 175, 0.2);
          border-radius: 10px;
        }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.05);
        }
      `}</style>
    </div>
  );
}

