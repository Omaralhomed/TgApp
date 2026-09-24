'use client';

import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Download,
  Trash2,
  X,
  RefreshCw,
  CheckCircle2,
  Bot,
  User,
} from 'lucide-react';
import { translations, Language } from '../../lib/translations';
import { DataTable, Column } from '../ui/DataTable';
import { Badge } from '../ui/Badge';
import { getGroupMembers, deleteMember } from '../../lib/api';
import { useToast } from '../ui/ToastContext';

interface GroupDetailsModalProps {
  groupId: string | null;
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
}

export function GroupDetailsModal({
  groupId,
  isOpen,
  onClose,
  lang,
}: GroupDetailsModalProps) {
  const isRtl = lang === 'ar';
  const [members, setMembers] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [activeOnly, setActiveOnly] = useState(false);
  const [hasUsernameOnly, setHasUsernameOnly] = useState(false);
  const [excludeBots, setExcludeBots] = useState(true);
  const [search, setSearch] = useState('');

  const toast = useToast();
  const t = translations[lang];

  const fetchMembers = async () => {
    if (!groupId) return;
    try {
      setIsLoading(true);
      const res = await getGroupMembers(groupId, {
        activeOnly,
        hasUsernameOnly,
        excludeBots,
        search,
        limit: 100,
      });
      setMembers(res.members || []);
      setTotal(res.total || 0);
    } catch (err: any) {
      toast.error(isRtl ? 'تعذر تحميل الأعضاء' : 'Failed to load group members', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && groupId) {
      fetchMembers();
    }
  }, [isOpen, groupId, activeOnly, hasUsernameOnly, excludeBots, search]);

  if (!isOpen || !groupId) return null;

  const handleDelete = async (memberId: string) => {
    try {
      await deleteMember(memberId);
      toast.success(isRtl ? 'تم حذف العضو من القائمة' : 'Member removed.');
      fetchMembers();
    } catch (err: any) {
      toast.error(isRtl ? 'فشل حذف العضو' : 'Failed to remove', err.message);
    }
  };

  const handleExportCSV = () => {
    if (members.length === 0) return;
    const header = 'ID,Username,FirstName,LastName,Phone,Status,IsBot\n';
    const rows = members
      .map(
        (m) =>
          `"${m.telegramId}","${m.username || ''}","${m.firstName || ''}","${
            m.lastName || ''
          }","${m.phone || ''}","${m.status || ''}","${m.isBot}"`,
      )
      .join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `leads_${groupId}_${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success(isRtl ? 'تم تصدير ملف CSV بنجاح' : 'CSV Exported Successfully!');
  };

  const columns: Column<any>[] = [
    {
      key: 'user',
      header: isRtl ? 'الاسم / المعرف' : 'Name / Username',
      render: (item) => (
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#007AFF]/10 text-[#007AFF] flex items-center justify-center font-bold text-xs shrink-0">
            {item.firstName ? item.firstName[0].toUpperCase() : 'U'}
          </div>
          <div className="min-w-0">
            <p className="font-bold text-[#111827] dark:text-white text-xs truncate">
              {item.firstName || ''} {item.lastName || ''}
            </p>
            <p className="text-[10px] text-[#007AFF] font-mono truncate">
              {item.username ? `@${item.username}` : `ID: ${item.telegramId}`}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      header: isRtl ? 'آخر نشاط' : 'Activity',
      render: (item) => (
        <span className="text-xs text-[#94A3B8] font-mono">{item.status || 'Active Recently'}</span>
      ),
    },
    {
      key: 'isBot',
      header: isRtl ? 'النوع' : 'Type',
      render: (item) => (
        <Badge variant={item.isBot ? 'warning' : 'success'}>
          {item.isBot ? 'BOT' : 'USER'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'text-end',
      render: (item) => (
        <button
          onClick={() => handleDelete(item.id)}
          className="p-1.5 rounded-lg border border-black/[.06] dark:border-white/[.07] hover:bg-rose-500/10 text-[#64748B] hover:text-rose-500 transition cursor-pointer"
          title={isRtl ? 'حذف' : 'Remove'}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      ),
    },
  ];

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
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-[#007AFF] flex items-center justify-center text-white shrink-0">
                <Users className="w-3.5 h-3.5" />
              </div>
              <div>
                <h2 className="text-xs font-bold text-[#111827] dark:text-white">
                  {isRtl ? 'استعراض أعضاء القائمة' : 'Audience Leads Explorer'}
                </h2>
                <p className="text-[10px] text-[#94A3B8] font-mono">
                  {total} {isRtl ? 'جهة اتصال موثقة' : 'Verified Leads'}
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

          {/* Filters Bar */}
          <div className="px-5 py-2 border-b border-black/[.04] dark:border-white/[.04] bg-[#F6F8FB] dark:bg-[#171D28] flex items-center justify-between gap-3 text-xs shrink-0 flex-wrap">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-1.5 cursor-pointer text-[#111827] dark:text-slate-300 font-semibold text-xs">
                <input
                  type="checkbox"
                  checked={excludeBots}
                  onChange={(e) => setExcludeBots(e.target.checked)}
                  className="rounded accent-[#007AFF] cursor-pointer"
                />
                <span>{isRtl ? 'استبعاد البوتات' : 'Exclude Bots'}</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer text-[#111827] dark:text-slate-300 font-semibold text-xs">
                <input
                  type="checkbox"
                  checked={hasUsernameOnly}
                  onChange={(e) => setHasUsernameOnly(e.target.checked)}
                  className="rounded accent-[#007AFF] cursor-pointer"
                />
                <span>{isRtl ? 'أصحاب المعرفات فقط' : 'Has Username Only'}</span>
              </label>
            </div>

            <div className="relative w-48">
              <Search className="w-3 h-3 absolute start-2 top-2 text-[#94A3B8]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={isRtl ? 'بحث في الأعضاء...' : 'Filter members...'}
                className="w-full ps-7 pe-2.5 py-1 bg-white dark:bg-[#11151D] border border-black/[.08] dark:border-white/10 rounded-md text-xs text-[#111827] dark:text-white placeholder-[#94A3B8] focus:outline-none focus:border-[#007AFF]"
              />
            </div>
          </div>

          {/* Members Table */}
          <div className="flex-1 overflow-hidden p-4">
            <DataTable
              columns={columns}
              data={members}
              keyExtractor={(item) => item.id}
              isLoading={isLoading}
              emptyTitle={isRtl ? 'لا يوجد أعضاء في هذه القائمة' : 'No members found'}
              emptySubtitle=""
            />
          </div>
        </div>
      </div>
    </>
  );
}
