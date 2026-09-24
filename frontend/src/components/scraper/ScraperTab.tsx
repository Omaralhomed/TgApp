'use client';

import React, { useState } from 'react';
import {
  Users,
  Search,
  Upload,
  Download,
  Trash2,
  ExternalLink,
  Plus,
  Zap,
  Filter,
  CheckCircle2,
  FolderOpen,
  ArrowDownToLine,
  RefreshCw,
  Database,
} from 'lucide-react';
import { translations, Language } from '../../lib/translations';
import { DataTable, Column } from '../ui/DataTable';
import { Badge } from '../ui/Badge';
import { GroupDetailsModal } from './GroupDetailsModal';
import { ImportLeadsModal } from './ImportLeadsModal';
import { scrapeGroup, deleteGroup, exportGroupMembersCsv, downloadCsvFile } from '../../lib/api';
import { useToast } from '../ui/ToastContext';

interface ScraperTabProps {
  groups: any[];
  accounts: any[];
  isLoading: boolean;
  onRefresh: () => void;
  lang: Language;
}

export function ScraperTab({
  groups,
  accounts,
  isLoading,
  onRefresh,
  lang,
}: ScraperTabProps) {
  const isRtl = lang === 'ar';
  const [targetInput, setTargetInput] = useState('');
  const [accountId, setAccountId] = useState('');
  const [maxLimit, setMaxLimit] = useState(2000);
  const [isScraping, setIsScraping] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());

  const toast = useToast();
  const t = translations[lang];

  const activeAccounts = accounts.filter((a) => a.status === 'ACTIVE');
  const totalAudienceCount = groups.reduce(
    (acc, g) => acc + (g.memberCount || g._count?.members || 0),
    0,
  );

  const handleStartScrape = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetInput.trim()) {
      toast.error(isRtl ? 'يرجى إدخال رابط أو معرف المجموعة المستهدفة' : 'Please enter target group');
      return;
    }
    if (!accountId) {
      toast.error(isRtl ? 'يرجى اختيار حساب تليجرام نشط للإستخراج' : 'Please select active account');
      return;
    }

    try {
      setIsScraping(true);
      toast.info(isRtl ? 'جاري استخراج الأعضاء والبيانات في الخلفية...' : 'Starting MTProto extraction...');
      const res = await scrapeGroup({
        accountId,
        groupTarget: targetInput.trim(),
        limit: Number(maxLimit),
      });

      toast.success(
        isRtl ? 'اكتمل الاستخراج بنجاح!' : 'Scrape Completed!',
        isRtl ? `تم حفظ ${res.savedCount || res.totalSaved} جهة اتصال.` : `Extracted ${res.savedCount || res.totalSaved} leads.`
      );
      setTargetInput('');
      onRefresh();
    } catch (err: any) {
      toast.error(isRtl ? 'فشل الاستخراج' : 'Extraction Failed', err.response?.data?.message || err.message);
    } finally {
      setIsScraping(false);
    }
  };

  const handleDeleteGroup = async (id: string) => {
    if (!confirm(t.confirmDelete)) return;
    try {
      await deleteGroup(id);
      toast.success(isRtl ? 'تم حذف القائمة وجهات الاتصال' : 'Group removed.');
      onRefresh();
    } catch (err: any) {
      toast.error(isRtl ? 'فشل حذف القائمة' : 'Failed to delete group', err.message);
    }
  };

  const handleExportCsv = async (groupId: string, title: string) => {
    try {
      const res = await exportGroupMembersCsv(groupId);
      if (res?.csvContent) {
        downloadCsvFile(res.csvContent, `${title.replace(/[^a-zA-Z0-9_\u0600-\u06FF]/g, '_')}_leads.csv`);
        toast.success(isRtl ? 'تم تصدير الأعضاء بنجاح' : 'Leads exported successfully');
      }
    } catch {
      toast.error(isRtl ? 'فشل تصدير الأعضاء' : 'Failed to export');
    }
  };

  const columns: Column<any>[] = [
    {
      key: 'title',
      header: isRtl ? 'اسم القائمة / المجموعة' : 'Lead List / Group',
      sortable: true,
      render: (item) => (
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#007AFF]/10 text-[#007AFF] flex items-center justify-center font-bold text-xs shrink-0">
            <Users className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-[#111827] dark:text-white text-xs truncate">{item.title}</p>
            <p className="text-[10px] text-[#94A3B8] font-mono truncate">
              {item.username ? `@${item.username}` : `ID: ${item.chatId || item.id?.slice(0, 8)}`}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'members',
      header: isRtl ? 'عدد جهات الاتصال' : 'Total Leads',
      sortable: true,
      render: (item) => (
        <span className="font-mono font-bold text-xs text-[#007AFF]">
          {(item.memberCount || item._count?.members || 0).toLocaleString()} {isRtl ? 'عضو' : 'leads'}
        </span>
      ),
    },
    {
      key: 'source',
      header: isRtl ? 'المصدر' : 'Source',
      render: (item) => (
        <Badge variant="neutral">
          {item.username ? (isRtl ? 'مجموعة تليجرام' : 'Telegram Group') : (isRtl ? 'استيراد مخصص' : 'Custom Import')}
        </Badge>
      ),
    },
    {
      key: 'scrapedAt',
      header: isRtl ? 'تاريخ الاستخراج' : 'Extracted Date',
      sortable: true,
      render: (item) => (
        <span className="text-xs text-[#94A3B8] font-mono">
          {item.scrapedAt ? new Date(item.scrapedAt).toLocaleDateString() : new Date().toLocaleDateString()}
        </span>
      ),
    },
    {
      key: 'actions',
      header: isRtl ? 'إجراءات' : 'Actions',
      className: 'text-end',
      render: (item) => (
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={() => handleExportCsv(item.id, item.title)}
            className="p-1.5 rounded-lg border border-black/[.06] dark:border-white/[.07] hover:bg-[#007AFF]/10 text-[#64748B] hover:text-[#007AFF] transition cursor-pointer"
            title={isRtl ? 'تصدير كملف CSV' : 'Export CSV'}
          >
            <Download className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setSelectedGroupId(item.id)}
            className="p-1.5 rounded-lg border border-black/[.06] dark:border-white/[.07] hover:bg-black/[.04] dark:hover:bg-white/5 text-[#64748B] hover:text-[#111827] dark:hover:text-white transition cursor-pointer"
            title={isRtl ? 'استعراض الأعضاء' : 'Explore Leads'}
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => handleDeleteGroup(item.id)}
            className="p-1.5 rounded-lg border border-black/[.06] dark:border-white/[.07] hover:bg-rose-500/10 text-[#64748B] hover:text-rose-500 transition cursor-pointer"
            title={t.delete}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-3.5 w-full text-start select-none animate-[fadeIn_0.2s_ease-out]">
      
      {/* ── Top Header & Summary ────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-white dark:bg-[#11151D] border border-black/[.06] dark:border-white/[.07] shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-[#111827] dark:text-white">
              {isRtl ? 'إدارة واستخراج جهات الاتصال' : 'Contacts & Lead Lists'}
            </h2>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#007AFF]/10 text-[#007AFF]">
              {groups.length} {isRtl ? 'قائمة' : 'Lists'}
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-[#64748B] dark:text-[#94A3B8] mt-1 font-mono">
            <span className="text-[#34C759] font-bold">● {totalAudienceCount.toLocaleString()} {isRtl ? 'إجمالي العملاء المستخرجين' : 'Total Leads'}</span>
            <span>📱 {activeAccounts.length} {isRtl ? 'حسابات جاهزة للاستخراج' : 'Ready accounts'}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="h-8 px-3 rounded-lg border border-black/[.08] dark:border-white/10 hover:bg-black/[.04] dark:hover:bg-white/5 text-[#111827] dark:text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5 text-[#007AFF]" />
            <span>{isRtl ? 'استيراد جهات اتصال' : 'Import Leads'}</span>
          </button>
        </div>
      </div>

      {/* ── Compact Instant Extraction Bar ────────────────────────── */}
      <div className="p-3.5 rounded-xl bg-white dark:bg-[#11151D] border border-black/[.06] dark:border-white/[.07] shadow-sm">
        <form onSubmit={handleStartScrape} className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
          <div className="sm:col-span-5">
            <label className="text-xs font-bold text-[#111827] dark:text-white block mb-1">
              {isRtl ? 'معرف أو رابط المجموعة المستهدفة' : 'Target Telegram Group / Link'}
            </label>
            <input
              type="text"
              required
              value={targetInput}
              onChange={(e) => setTargetInput(e.target.value)}
              placeholder={isRtl ? 'مثال: @community_group أو رابط الدعوة' : 'e.g. @tech_community or invite link'}
              className="w-full px-3 py-1.5 bg-[#F6F8FB] dark:bg-[#171D28] border border-black/[.08] dark:border-white/10 rounded-lg text-xs text-[#111827] dark:text-white placeholder-[#94A3B8] focus:outline-none focus:border-[#007AFF]"
            />
          </div>

          <div className="sm:col-span-4">
            <label className="text-xs font-bold text-[#111827] dark:text-white block mb-1">
              {isRtl ? 'حساب التنفيذ' : 'Executor Account'}
            </label>
            <select
              required
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className="w-full px-3 py-1.5 bg-[#F6F8FB] dark:bg-[#171D28] border border-black/[.08] dark:border-white/10 rounded-lg text-xs text-[#111827] dark:text-white focus:outline-none focus:border-[#007AFF] cursor-pointer"
            >
              <option value="">{isRtl ? '-- اختر حساب نشط --' : '-- Select Account --'}</option>
              {activeAccounts.map((acc) => (
                <option key={acc.id} value={acc.id} className="bg-white dark:bg-[#171D28] text-[#111827] dark:text-white">
                  {acc.phone} {acc.firstName ? `(${acc.firstName})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-3">
            <button
              type="submit"
              disabled={isScraping || activeAccounts.length === 0}
              className="w-full h-8 px-3 rounded-lg bg-[#007AFF] hover:bg-[#0062CC] text-white text-xs font-bold flex items-center justify-center gap-1.5 transition active:scale-95 disabled:opacity-50 cursor-pointer shadow-sm shadow-[#007AFF]/20"
            >
              {isScraping ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>{isRtl ? 'جاري الاستخراج...' : 'Extracting...'}</span>
                </>
              ) : (
                <>
                  <Zap className="w-3.5 h-3.5" />
                  <span>{isRtl ? 'بدء الاستخراج الفوري' : 'Start Scrape'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* ── Extracted Groups Table ────────────────────────── */}
      <DataTable
        columns={columns}
        data={groups}
        keyExtractor={(item) => item.id}
        isLoading={isLoading}
        searchPlaceholder={isRtl ? 'بحث في القوائم والمجموعات...' : 'Search lists...'}
        selectable
        selectedKeys={selectedKeys}
        onSelectionChange={setSelectedKeys}
        emptyTitle={isRtl ? 'لا توجد قوائم جهات اتصال بعد' : 'No lead lists yet'}
        emptySubtitle={isRtl ? 'قم باستخراج الأعضاء من مجموعات تليجرام أو استيراد قوائمك الخاصة لبدء الحملات.' : 'Extract members from Telegram groups or import CSV leads to build audiences.'}
        emptyAction={
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="h-8 px-3 rounded-lg bg-[#007AFF] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>{isRtl ? 'استيراد جهات اتصال' : 'Import Leads'}</span>
          </button>
        }
      />

      {/* Group Members Explorer Modal */}
      <GroupDetailsModal
        groupId={selectedGroupId}
        isOpen={!!selectedGroupId}
        onClose={() => setSelectedGroupId(null)}
        lang={lang}
      />

      {/* Custom Leads Import Modal */}
      <ImportLeadsModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={onRefresh}
        lang={lang}
      />
    </div>
  );
}
