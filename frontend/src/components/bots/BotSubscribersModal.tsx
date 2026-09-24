'use client';

import React, { useState, useEffect } from 'react';
import { Users, X, Download, Search, RefreshCw } from 'lucide-react';
import { Language } from '../../lib/translations';
import { getBotSubscribers } from '../../lib/api';
import { useToast } from '../ui/ToastContext';
import { Badge } from '../ui/Badge';

interface BotSubscribersModalProps {
  isOpen: boolean;
  onClose: () => void;
  bot: any;
  lang: Language;
}

export function BotSubscribersModal({ isOpen, onClose, bot, lang }: BotSubscribersModalProps) {
  const isRtl = lang === 'ar';
  const toast = useToast();

  const [subscribers, setSubscribers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isOpen && bot) {
      loadSubscribers();
    }
  }, [isOpen, bot]);

  const loadSubscribers = async () => {
    setIsLoading(true);
    try {
      const data = await getBotSubscribers(bot.id);
      setSubscribers(data || []);
    } catch (err: any) {
      toast.error(isRtl ? 'تعذر تحميل المشتركين' : 'Failed to load subscribers', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen || !bot) return null;

  const filtered = subscribers.filter((s) => {
    const term = searchTerm.toLowerCase();
    const name = `${s.firstName || ''} ${s.lastName || ''}`.toLowerCase();
    const username = (s.username || '').toLowerCase();
    const id = (s.telegramUserId || '').toLowerCase();
    return name.includes(term) || username.includes(term) || id.includes(term);
  });

  const handleExportCSV = () => {
    if (filtered.length === 0) {
      toast.info(isRtl ? 'لا توجد بيانات للتصدير' : 'No data to export');
      return;
    }

    const headers = ['Telegram User ID', 'First Name', 'Last Name', 'Username', 'Is Blocked', 'Joined At', 'Last Active'];
    const rows = filtered.map((s) => [
      s.telegramUserId,
      `"${s.firstName || ''}"`,
      `"${s.lastName || ''}"`,
      `"${s.username || ''}"`,
      s.isBlocked ? 'Yes' : 'No',
      new Date(s.createdAt).toISOString(),
      new Date(s.lastInteractionAt).toISOString(),
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `bot_${bot.username || bot.id}_subscribers.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success(isRtl ? 'تم تصدير ملف المشتركين بنجاح!' : 'Exported subscribers CSV successfully!');
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div
        dir={isRtl ? 'rtl' : 'ltr'}
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative w-full max-w-3xl h-[80vh] rounded-2xl border border-black/[.08] dark:border-white/10 bg-white dark:bg-[#10151E] shadow-2xl overflow-hidden flex flex-col animate-[fadeInScale_0.2s_ease-out]">
          
          {/* Header */}
          <div className="px-5 py-3 border-b border-black/[.06] dark:border-white/[.07] bg-[#FAFAFC] dark:bg-[#0E121A] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#007AFF] flex items-center justify-center text-white shrink-0">
                <Users className="w-3.5 h-3.5" />
              </div>
              <div>
                <h2 className="text-xs font-bold text-[#111827] dark:text-white">
                  {isRtl ? 'قائمة المشتركين وقاعدة العملاء' : 'Bot Subscribers & Leads'}
                </h2>
                <p className="text-[10px] text-[#94A3B8] font-mono">
                  @{bot.username || bot.firstName} ({subscribers.length} {isRtl ? 'مشترك' : 'leads'})
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleExportCSV}
                className="h-7 px-2.5 rounded-lg border border-black/[.08] dark:border-white/10 hover:bg-black/[.04] dark:hover:bg-white/5 text-xs font-bold text-[#111827] dark:text-white flex items-center gap-1.5 transition cursor-pointer"
              >
                <Download className="w-3 h-3 text-[#007AFF]" />
                <span>{isRtl ? 'تصدير CSV' : 'Export CSV'}</span>
              </button>

              <button
                onClick={onClose}
                className="p-1 rounded-lg text-[#94A3B8] hover:text-[#111827] dark:hover:text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Search bar */}
          <div className="p-3 border-b border-black/[.04] dark:border-white/[.04] bg-[#F6F8FB] dark:bg-[#171D28] shrink-0">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute start-2.5 top-2.5 text-[#94A3B8]" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={isRtl ? 'بحث بالاسم، المعرف (@username)، أو رقم الـ ID...' : 'Search by name, @username, or numeric ID...'}
                className="w-full ps-8 pe-3 py-1.5 bg-white dark:bg-[#11151D] border border-black/[.08] dark:border-white/10 rounded-lg text-xs text-[#111827] dark:text-white placeholder-[#94A3B8] focus:outline-none focus:border-[#007AFF]"
              />
            </div>
          </div>

          {/* Table */}
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="h-full flex items-center justify-center text-xs text-[#94A3B8] gap-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#007AFF]" />
                <span>{isRtl ? 'جاري تحميل المشتركين...' : 'Loading subscribers...'}</span>
              </div>
            ) : filtered.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 text-[#94A3B8] text-xs">
                <Users className="w-8 h-8 opacity-30 mb-2" />
                <p>{isRtl ? 'لا يوجد مشتركون مطابقون للبحث.' : 'No subscribers found.'}</p>
              </div>
            ) : (
              <table className="w-full text-xs text-start">
                <thead className="bg-[#FAFAFC] dark:bg-[#0E121A] text-[#64748B] dark:text-[#94A3B8] font-bold border-b border-black/[.06] dark:border-white/[.07] sticky top-0">
                  <tr>
                    <th className="py-2.5 px-4 text-start">{isRtl ? 'المشترك' : 'Subscriber'}</th>
                    <th className="py-2.5 px-4 text-start">{isRtl ? 'معرف تيليجرام' : 'Telegram ID'}</th>
                    <th className="py-2.5 px-4 text-start">{isRtl ? 'الحالة' : 'Status'}</th>
                    <th className="py-2.5 px-4 text-start">{isRtl ? 'تاريخ الاشتراك' : 'Joined'}</th>
                    <th className="py-2.5 px-4 text-start">{isRtl ? 'آخر تفاعل' : 'Last Active'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/[.03] dark:divide-white/[.03] text-[#111827] dark:text-white">
                  {filtered.map((sub) => (
                    <tr key={sub.id} className="hover:bg-black/[.02] dark:hover:bg-white/[.02] transition">
                      <td className="py-2.5 px-4">
                        <div className="font-bold text-xs">
                          {sub.firstName || ''} {sub.lastName || ''}
                        </div>
                        {sub.username && <span className="text-[10px] text-[#007AFF] font-mono">@{sub.username}</span>}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-[11px] text-[#94A3B8]">{sub.telegramUserId}</td>
                      <td className="py-2.5 px-4">
                        <Badge variant={sub.isBlocked ? 'error' : 'success'}>
                          {sub.isBlocked ? (isRtl ? 'محظور' : 'Blocked') : (isRtl ? 'نشط' : 'Active')}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-4 font-mono text-[10px] text-[#94A3B8]">
                        {new Date(sub.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-[10px] text-[#94A3B8]">
                        {new Date(sub.lastInteractionAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
