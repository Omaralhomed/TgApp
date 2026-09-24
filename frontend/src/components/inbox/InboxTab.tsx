'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  Send,
  RefreshCw,
  Search,
  Check,
  CheckCheck,
  Smartphone,
  User,
  Users,
  Radio,
  Sparkles,
  Paperclip,
  MoreVertical,
  CornerDownLeft,
  Filter,
} from 'lucide-react';
import { translations, Language } from '../../lib/translations';
import { getAccountDialogs, getDialogMessages, sendDirectReply } from '../../lib/api';
import { useSocket } from '../../hooks/useSocket';
import { useToast } from '../ui/ToastContext';

interface TelegramAccountOption {
  id: string;
  phone: string;
  firstName?: string | null;
  lastName?: string | null;
  status: string;
}

interface DialogItem {
  id: string;
  title: string;
  username?: string | null;
  phone?: string | null;
  unreadCount: number;
  lastMessage: string;
  date?: string | null;
  isUser: boolean;
  isGroup: boolean;
  isChannel: boolean;
}

interface MessageItem {
  id: number;
  out: boolean;
  text: string;
  date: string;
  senderId?: string | null;
}

interface InboxTabProps {
  accounts: TelegramAccountOption[];
  lang: Language;
}

export function InboxTab({ accounts, lang }: InboxTabProps) {
  const isRtl = lang === 'ar';
  const t = translations[lang];
  const toast = useToast();

  const activeAccounts = accounts.filter((a) => a.status === 'ACTIVE');
  const [selectedAccountId, setSelectedAccountId] = useState<string>(activeAccounts[0]?.id || '');
  const [dialogs, setDialogs] = useState<DialogItem[]>([]);
  const [selectedPeer, setSelectedPeer] = useState<DialogItem | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [replyText, setReplyText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingDialogs, setLoadingDialogs] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [filterType, setFilterType] = useState<'ALL' | 'UNREAD' | 'USERS' | 'GROUPS'>('ALL');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { socket } = useSocket();

  useEffect(() => {
    if (activeAccounts.length > 0 && !selectedAccountId) {
      setSelectedAccountId(activeAccounts[0].id);
    }
  }, [activeAccounts, selectedAccountId]);

  // Load Dialogs whenever selected account changes
  useEffect(() => {
    if (!selectedAccountId) return;
    loadDialogs(selectedAccountId);
  }, [selectedAccountId]);

  // Load Messages whenever selected peer changes
  useEffect(() => {
    if (!selectedAccountId || !selectedPeer) return;
    loadMessages(selectedAccountId, selectedPeer.id);
  }, [selectedAccountId, selectedPeer]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Listen for real-time MTProto messages
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (payload: {
      accountId: string;
      messageId: number;
      peerId: string;
      senderId: string;
      senderUsername?: string;
      senderName?: string;
      text: string;
      date: string;
    }) => {
      if (
        payload.accountId === selectedAccountId &&
        selectedPeer &&
        (selectedPeer.id === payload.peerId || selectedPeer.id === payload.senderId)
      ) {
        setMessages((prev) => [
          ...prev,
          {
            id: payload.messageId,
            out: false,
            text: payload.text,
            date: payload.date,
            senderId: payload.senderId,
          },
        ]);
      }

      setDialogs((prev) => {
        const index = prev.findIndex((d) => d.id === payload.peerId || d.id === payload.senderId);
        if (index >= 0) {
          const updated = [...prev];
          updated[index] = {
            ...updated[index],
            lastMessage: payload.text,
            date: payload.date,
            unreadCount:
              selectedPeer?.id === updated[index].id ? 0 : updated[index].unreadCount + 1,
          };
          const [item] = updated.splice(index, 1);
          return [item, ...updated];
        } else {
          const newDialog: DialogItem = {
            id: payload.peerId,
            title: payload.senderName || payload.senderUsername || `User ${payload.senderId}`,
            username: payload.senderUsername || null,
            unreadCount: 1,
            lastMessage: payload.text,
            date: payload.date,
            isUser: true,
            isGroup: false,
            isChannel: false,
          };
          return [newDialog, ...prev];
        }
      });
    };

    socket.on('inbox:new_message', handleNewMessage);
    return () => {
      socket.off('inbox:new_message', handleNewMessage);
    };
  }, [socket, selectedAccountId, selectedPeer]);

  const loadDialogs = async (accountId: string) => {
    setLoadingDialogs(true);
    try {
      const data = await getAccountDialogs(accountId);
      setDialogs(data || []);
      if (data && data.length > 0 && !selectedPeer) {
        setSelectedPeer(data[0]);
      }
    } catch (err: any) {
      toast.error(isRtl ? 'تعذر مزامنة المحادثات' : 'Failed to load conversations', err.message);
    } finally {
      setLoadingDialogs(false);
    }
  };

  const loadMessages = async (accountId: string, peerId: string) => {
    setLoadingMessages(true);
    try {
      const data = await getDialogMessages(accountId, peerId);
      setMessages(data || []);
    } catch (err: any) {
      console.error('Error fetching messages', err);
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!replyText.trim() || !selectedAccountId || !selectedPeer || isSending) return;

    const textToSend = replyText.trim();
    setIsSending(true);
    try {
      const res = await sendDirectReply(selectedAccountId, selectedPeer.id, textToSend);

      const newMsg: MessageItem = {
        id: res.messageId || Date.now(),
        out: true,
        text: textToSend,
        date: res.date || new Date().toISOString(),
      };
      setMessages((prev) => [...prev, newMsg]);
      setReplyText('');

      setDialogs((prev) =>
        prev.map((d) => (d.id === selectedPeer.id ? { ...d, lastMessage: textToSend, date: new Date().toISOString() } : d)),
      );
    } catch (err: any) {
      toast.error(isRtl ? 'فشل إرسال الرد' : 'Failed to send reply', err.message);
    } finally {
      setIsSending(false);
    }
  };

  const filteredDialogs = dialogs.filter((d) => {
    const q = searchQuery.toLowerCase();
    const matchesQuery =
      d.title.toLowerCase().includes(q) ||
      (d.username && d.username.toLowerCase().includes(q)) ||
      d.lastMessage.toLowerCase().includes(q);

    if (!matchesQuery) return false;

    if (filterType === 'UNREAD') return d.unreadCount > 0;
    if (filterType === 'USERS') return d.isUser;
    if (filterType === 'GROUPS') return d.isGroup || d.isChannel;
    return true;
  });

  const selectedAccount = accounts.find((a) => a.id === selectedAccountId);
  const totalUnread = dialogs.reduce((acc, d) => acc + (d.unreadCount || 0), 0);

  return (
    <div className="flex flex-col gap-3 w-full h-[calc(100vh-8.5rem)] text-start select-none animate-[fadeIn_0.2s_ease-out]">
      {/* ── Top Bar / Summary ────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-white dark:bg-[#11151D] border border-black/[.06] dark:border-white/[.07] shadow-sm shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-[#111827] dark:text-white">
              {isRtl ? 'صندوق الوارد الموحد' : 'Unified MTProto Inbox'}
            </h2>
            {totalUnread > 0 && (
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#007AFF] text-white">
                {totalUnread} {isRtl ? 'جديد' : 'New'}
              </span>
            )}
          </div>
          <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-mono text-[#34C759] bg-[#34C759]/10 px-2 py-0.5 rounded-md">
            <span className="w-1.5 h-1.5 rounded-full bg-[#34C759] animate-pulse" />
            MTProto Live
          </span>
        </div>

        {/* Account Selector & Refresh */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-[#F6F8FB] dark:bg-[#171D28] border border-black/[.06] dark:border-white/[.07] rounded-lg px-2.5 py-1">
            <Smartphone className="w-3.5 h-3.5 text-[#007AFF]" />
            <select
              value={selectedAccountId}
              onChange={(e) => {
                setSelectedAccountId(e.target.value);
                setSelectedPeer(null);
                setMessages([]);
              }}
              className="bg-transparent text-xs text-[#111827] dark:text-white font-bold focus:outline-none cursor-pointer"
            >
              {activeAccounts.length === 0 ? (
                <option value="">{isRtl ? 'لا توجد حسابات نشطة' : 'No active accounts'}</option>
              ) : (
                activeAccounts.map((acc) => (
                  <option key={acc.id} value={acc.id} className="bg-white dark:bg-[#171D28] text-[#111827] dark:text-white">
                    {acc.phone} {acc.firstName ? `(${acc.firstName})` : ''}
                  </option>
                ))
              )}
            </select>
          </div>

          <button
            onClick={() => selectedAccountId && loadDialogs(selectedAccountId)}
            disabled={loadingDialogs || !selectedAccountId}
            title={isRtl ? 'تحديث المحادثات' : 'Sync Dialogs'}
            className="p-1.5 rounded-lg border border-black/[.06] dark:border-white/[.07] hover:bg-black/[.04] dark:hover:bg-white/5 text-[#64748B] hover:text-[#111827] dark:hover:text-white transition cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingDialogs ? 'animate-spin text-[#007AFF]' : ''}`} />
          </button>
        </div>
      </div>

      {/* ── Main Workspace: 2-Column Split ────────────────────────── */}
      <div className="flex-1 min-h-0 flex rounded-xl border border-black/[.06] dark:border-white/[.07] bg-white dark:bg-[#11151D] shadow-sm overflow-hidden">
        
        {/* Left Column: Dialogs Stream */}
        <div className="w-72 sm:w-84 md:w-96 border-e border-black/[.06] dark:border-white/[.07] flex flex-col bg-[#FAFAFC] dark:bg-[#0E121A] shrink-0">
          
          {/* Search & Filters */}
          <div className="p-2.5 border-b border-black/[.06] dark:border-white/[.07] space-y-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute start-2.5 top-2.5 text-[#94A3B8]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isRtl ? 'بحث في المحادثات والرسائل...' : 'Search dialogs...'}
                className="w-full ps-8 pe-3 py-1.5 bg-white dark:bg-[#171D28] border border-black/[.08] dark:border-white/10 rounded-lg text-xs text-[#111827] dark:text-white placeholder-[#94A3B8] focus:outline-none focus:border-[#007AFF]"
              />
            </div>

            {/* Quick Filter Pills */}
            <div className="flex items-center gap-1 text-[11px] font-bold">
              {[
                { id: 'ALL', label: isRtl ? 'الكل' : 'All' },
                { id: 'UNREAD', label: isRtl ? 'غير مقروء' : 'Unread' },
                { id: 'USERS', label: isRtl ? 'أفراد' : 'Direct' },
                { id: 'GROUPS', label: isRtl ? 'مجموعات' : 'Groups' },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFilterType(f.id as any)}
                  className={`px-2 py-0.5 rounded-md transition cursor-pointer ${
                    filterType === f.id
                      ? 'bg-[#007AFF] text-white shadow-xs'
                      : 'text-[#64748B] dark:text-[#94A3B8] hover:bg-black/[.04] dark:hover:bg-white/5'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Dialog List */}
          <div className="flex-1 overflow-y-auto divide-y divide-black/[.03] dark:divide-white/[.03]">
            {loadingDialogs ? (
              <div className="py-12 text-center text-xs text-[#94A3B8] flex flex-col items-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-[#007AFF]" />
                <span>{isRtl ? 'جاري مزامنة المحادثات من تليجرام...' : 'Syncing conversations...'}</span>
              </div>
            ) : filteredDialogs.length === 0 ? (
              <div className="py-12 text-center text-xs text-[#94A3B8]">
                {dialogs.length === 0
                  ? isRtl
                    ? 'لا توجد محادثات نشطة لهذا الحساب'
                    : 'No active dialogs found'
                  : isRtl
                  ? 'لا توجد نتائج مطابقة'
                  : 'No matching dialogs'}
              </div>
            ) : (
              filteredDialogs.map((d) => {
                const isSelected = selectedPeer?.id === d.id;
                return (
                  <div
                    key={d.id}
                    onClick={() => {
                      setSelectedPeer(d);
                      if (d.unreadCount > 0) {
                        setDialogs((prev) =>
                          prev.map((item) => (item.id === d.id ? { ...item, unreadCount: 0 } : item)),
                        );
                      }
                    }}
                    className={`p-2.5 flex items-start gap-2.5 cursor-pointer transition select-none ${
                      isSelected
                        ? 'bg-[#007AFF]/10 border-s-3 border-[#007AFF]'
                        : 'hover:bg-black/[.02] dark:hover:bg-white/[.02]'
                    }`}
                  >
                    {/* Avatar */}
                    <div className="relative shrink-0">
                      <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-[#007AFF]/20 to-indigo-500/20 text-[#007AFF] dark:text-white flex items-center justify-center font-bold text-xs">
                        {d.isGroup || d.isChannel ? <Users className="w-4 h-4" /> : d.title.charAt(0).toUpperCase()}
                      </div>
                      {d.unreadCount > 0 && (
                        <span className="absolute -top-1 -end-1 bg-[#007AFF] text-white font-bold text-[9px] w-4 h-4 rounded-full flex items-center justify-center shadow-xs">
                          {d.unreadCount > 99 ? '99+' : d.unreadCount}
                        </span>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <h4 className="text-xs font-bold text-[#111827] dark:text-white truncate">{d.title}</h4>
                        {d.date && (
                          <span className="text-[10px] text-[#94A3B8] font-mono shrink-0">
                            {new Date(d.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8] truncate leading-tight">
                        {d.lastMessage || (d.username ? `@${d.username}` : (isRtl ? 'بدء محادثة' : 'New chat'))}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Active Chat Stream */}
        <div className="flex-1 flex flex-col bg-white dark:bg-[#11151D] min-w-0">
          {selectedPeer ? (
            <>
              {/* Chat Peer Header */}
              <div className="px-4 py-2.5 border-b border-black/[.06] dark:border-white/[.07] bg-[#FAFAFC] dark:bg-[#0E121A] flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-[#007AFF]/10 text-[#007AFF] flex items-center justify-center font-bold text-xs shrink-0">
                    {selectedPeer.isGroup || selectedPeer.isChannel ? <Users className="w-4 h-4" /> : selectedPeer.title.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-xs font-bold text-[#111827] dark:text-white truncate">
                      {selectedPeer.title}
                    </h3>
                    <p className="text-[10px] text-[#94A3B8] font-mono truncate">
                      {selectedPeer.username ? `@${selectedPeer.username}` : `Peer ID: ${selectedPeer.id}`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-[11px] font-mono text-[#64748B] dark:text-[#94A3B8]">
                  <span className="w-2 h-2 rounded-full bg-[#34C759]" />
                  <span>{selectedAccount?.phone}</span>
                </div>
              </div>

              {/* Chat Messages Stream */}
              <div className="flex-1 p-4 overflow-y-auto space-y-2.5 bg-[#F6F8FB]/50 dark:bg-[#10141C]">
                {loadingMessages ? (
                  <div className="flex items-center justify-center h-full text-xs text-[#94A3B8] gap-2">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#007AFF]" />
                    <span>{isRtl ? 'جاري تحميل الرسائل...' : 'Loading messages...'}</span>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-[#94A3B8] text-xs gap-1.5">
                    <MessageSquare className="w-6 h-6 opacity-40" />
                    <span>{isRtl ? 'لا توجد رسائل سابقة في هذه المحادثة' : 'No previous messages'}</span>
                  </div>
                ) : (
                  messages.map((m) => {
                    const isOut = m.out;
                    return (
                      <div key={m.id} className={`flex ${isOut ? 'justify-end' : 'justify-start'}`}>
                        <div
                          className={`max-w-[75%] rounded-xl px-3 py-2 text-xs shadow-xs ${
                            isOut
                              ? 'bg-[#007AFF] text-white rounded-ee-none'
                              : 'bg-white dark:bg-[#171D28] border border-black/[.06] dark:border-white/[.07] text-[#111827] dark:text-white rounded-es-none'
                          }`}
                        >
                          <p className="whitespace-pre-wrap leading-relaxed break-words">{m.text}</p>
                          <div className={`flex items-center justify-end gap-1 mt-1 text-[9px] font-mono ${isOut ? 'text-white/80' : 'text-[#94A3B8]'}`}>
                            <span>
                              {new Date(m.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {isOut && <CheckCheck className="w-3 h-3" />}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input Bar */}
              <form
                onSubmit={handleSendMessage}
                className="p-2.5 border-t border-black/[.06] dark:border-white/[.07] bg-white dark:bg-[#11151D] flex items-center gap-2 shrink-0"
              >
                <input
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder={isRtl ? 'اكتب ردك المباشر واضغط Enter...' : 'Type direct reply and press Enter...'}
                  className="flex-1 bg-[#F6F8FB] dark:bg-[#171D28] border border-black/[.08] dark:border-white/10 rounded-xl px-3 py-2 text-xs text-[#111827] dark:text-white placeholder-[#94A3B8] focus:outline-none focus:border-[#007AFF]"
                />
                <button
                  type="submit"
                  disabled={!replyText.trim() || isSending}
                  className="h-8 px-4 rounded-xl bg-[#007AFF] hover:bg-[#0062CC] text-white text-xs font-bold flex items-center gap-1.5 transition active:scale-95 disabled:opacity-50 cursor-pointer shadow-sm"
                >
                  {isSending ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <>
                      <span>{isRtl ? 'إرسال' : 'Send'}</span>
                      <Send className="w-3.5 h-3.5 rtl:rotate-180" />
                    </>
                  )}
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-[#94A3B8]">
              <div className="w-12 h-12 rounded-xl bg-black/[.03] dark:bg-white/5 border border-black/[.05] dark:border-white/[.05] flex items-center justify-center mb-3">
                <MessageSquare className="w-6 h-6 text-[#94A3B8]" />
              </div>
              <h4 className="text-xs font-bold text-[#111827] dark:text-white mb-1">
                {isRtl ? 'اختر محادثة من القائمة للبدء' : 'Select a conversation to start'}
              </h4>
              <p className="text-[11px] text-[#94A3B8] max-w-xs">
                {isRtl
                  ? 'يمكنك متابعة الردود وإجراء المحادثات المشفرة مباشرة مع العملاء.'
                  : 'Manage real-time MTProto encrypted conversations directly.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
