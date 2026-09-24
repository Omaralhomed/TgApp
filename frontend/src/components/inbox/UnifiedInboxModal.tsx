'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  MessageSquare,
  Send,
  RefreshCw,
  Search,
  Check,
  CheckCheck,
  Smartphone,
  Users,
} from 'lucide-react';
import { getAccountDialogs, getDialogMessages, sendDirectReply } from '../../lib/api';
import { useSocket } from '../../hooks/useSocket';

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

interface UnifiedInboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: TelegramAccountOption[];
  lang?: 'ar' | 'en';
}

export const UnifiedInboxModal: React.FC<UnifiedInboxModalProps> = ({
  isOpen,
  onClose,
  accounts,
  lang = 'ar',
}) => {
  const isRtl = lang === 'ar';
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

  useEffect(() => {
    if (!isOpen || !selectedAccountId) return;
    loadDialogs(selectedAccountId);
  }, [isOpen, selectedAccountId]);

  useEffect(() => {
    if (!isOpen || !selectedAccountId || !selectedPeer) return;
    loadMessages(selectedAccountId, selectedPeer.id);
  }, [isOpen, selectedAccountId, selectedPeer]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
      console.error(err);
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
      console.error(err);
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
      console.error(err);
    } finally {
      setIsSending(false);
    }
  };

  if (!isOpen) return null;

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

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div
        dir={isRtl ? 'rtl' : 'ltr'}
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative w-full max-w-5xl h-[82vh] rounded-2xl border border-black/[.08] dark:border-white/10 bg-white dark:bg-[#10151E] shadow-2xl overflow-hidden flex flex-col animate-[fadeInScale_0.2s_ease-out]">
          
          {/* Header */}
          <div className="px-5 py-3 border-b border-black/[.06] dark:border-white/[.07] bg-[#FAFAFC] dark:bg-[#0E121A] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-[#007AFF] flex items-center justify-center text-white shrink-0">
                <MessageSquare className="w-3.5 h-3.5" />
              </div>
              <div>
                <h2 className="text-xs font-bold text-[#111827] dark:text-white">
                  {isRtl ? 'صندوق الوارد الموحد' : 'Unified MTProto Inbox'}
                </h2>
                <p className="text-[10px] text-[#94A3B8]">
                  {isRtl ? 'إدارة واستقبال الرسائل المباشرة فورياً' : 'Real-time Telegram direct messaging'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-white dark:bg-[#171D28] border border-black/[.08] dark:border-white/10 rounded-lg px-2 py-1 text-xs">
                <Smartphone className="w-3 h-3 text-[#007AFF]" />
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
                    <option value="">{isRtl ? 'لا توجد حسابات' : 'No accounts'}</option>
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
                className="p-1.5 rounded-lg border border-black/[.06] dark:border-white/[.07] hover:bg-black/[.04] dark:hover:bg-white/5 text-[#64748B] hover:text-[#111827] dark:hover:text-white transition cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingDialogs ? 'animate-spin text-[#007AFF]' : ''}`} />
              </button>

              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-[#94A3B8] hover:text-[#111827] dark:hover:text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Body Split View */}
          <div className="flex-1 flex overflow-hidden min-h-0">
            {/* Left Pane: Dialogs */}
            <div className="w-72 sm:w-80 border-e border-black/[.06] dark:border-white/[.07] bg-[#FAFAFC] dark:bg-[#0E121A] flex flex-col shrink-0">
              <div className="p-2.5 border-b border-black/[.06] dark:border-white/[.07] space-y-1.5">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute start-2.5 top-2.5 text-[#94A3B8]" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={isRtl ? 'بحث في المحادثات...' : 'Search chats...'}
                    className="w-full ps-8 pe-3 py-1.5 bg-white dark:bg-[#171D28] border border-black/[.08] dark:border-white/10 rounded-lg text-xs text-[#111827] dark:text-white placeholder-[#94A3B8] focus:outline-none focus:border-[#007AFF]"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto divide-y divide-black/[.03] dark:divide-white/[.03]">
                {loadingDialogs ? (
                  <div className="py-10 text-center text-xs text-[#94A3B8] flex flex-col items-center gap-1.5">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#007AFF]" />
                    <span>{isRtl ? 'جاري المزامنة...' : 'Syncing...'}</span>
                  </div>
                ) : filteredDialogs.length === 0 ? (
                  <div className="py-10 text-center text-xs text-[#94A3B8]">
                    {isRtl ? 'لا توجد محادثات' : 'No chats found'}
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
                        <div className="relative shrink-0">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#007AFF]/20 to-indigo-500/20 text-[#007AFF] dark:text-white flex items-center justify-center font-bold text-xs">
                            {d.isGroup || d.isChannel ? <Users className="w-3.5 h-3.5" /> : d.title.charAt(0).toUpperCase()}
                          </div>
                          {d.unreadCount > 0 && (
                            <span className="absolute -top-1 -end-1 bg-[#007AFF] text-white font-bold text-[9px] w-4 h-4 rounded-full flex items-center justify-center">
                              {d.unreadCount}
                            </span>
                          )}
                        </div>

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

            {/* Right Pane: Active Chat */}
            <div className="flex-1 flex flex-col bg-white dark:bg-[#11151D] min-w-0">
              {selectedPeer ? (
                <>
                  <div className="px-4 py-2 border-b border-black/[.06] dark:border-white/[.07] bg-[#FAFAFC] dark:bg-[#0E121A] flex items-center justify-between shrink-0">
                    <div className="min-w-0">
                      <h3 className="text-xs font-bold text-[#111827] dark:text-white truncate">
                        {selectedPeer.title}
                      </h3>
                      <p className="text-[10px] text-[#94A3B8] font-mono truncate">
                        {selectedPeer.username ? `@${selectedPeer.username}` : `Peer: ${selectedPeer.id}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] font-mono text-[#64748B] dark:text-[#94A3B8]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#34C759]" />
                      <span>{selectedAccount?.phone}</span>
                    </div>
                  </div>

                  <div className="flex-1 p-3.5 overflow-y-auto space-y-2 bg-[#F6F8FB]/50 dark:bg-[#10141C]">
                    {loadingMessages ? (
                      <div className="flex items-center justify-center h-full text-xs text-[#94A3B8] gap-1.5">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#007AFF]" />
                        <span>{isRtl ? 'جاري التحميل...' : 'Loading...'}</span>
                      </div>
                    ) : messages.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-[#94A3B8] text-xs">
                        <span>{isRtl ? 'لا توجد رسائل بعد' : 'No messages'}</span>
                      </div>
                    ) : (
                      messages.map((m) => {
                        const isOut = m.out;
                        return (
                          <div key={m.id} className={`flex ${isOut ? 'justify-end' : 'justify-start'}`}>
                            <div
                              className={`max-w-[75%] rounded-xl px-3 py-2 text-xs ${
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

                  <form
                    onSubmit={handleSendMessage}
                    className="p-2.5 border-t border-black/[.06] dark:border-white/[.07] bg-white dark:bg-[#11151D] flex items-center gap-2 shrink-0"
                  >
                    <input
                      type="text"
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder={isRtl ? 'اكتب ردك واضغط Enter...' : 'Type reply...'}
                      className="flex-1 bg-[#F6F8FB] dark:bg-[#171D28] border border-black/[.08] dark:border-white/10 rounded-xl px-3 py-2 text-xs text-[#111827] dark:text-white placeholder-[#94A3B8] focus:outline-none focus:border-[#007AFF]"
                    />
                    <button
                      type="submit"
                      disabled={!replyText.trim() || isSending}
                      className="h-8 px-4 rounded-xl bg-[#007AFF] hover:bg-[#0062CC] text-white text-xs font-bold flex items-center gap-1.5 transition disabled:opacity-50 cursor-pointer shadow-sm"
                    >
                      {isSending ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5 rtl:rotate-180" />}
                    </button>
                  </form>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center p-6 text-center text-xs text-[#94A3B8]">
                  {isRtl ? 'اختر محادثة من القائمة' : 'Select a conversation'}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
