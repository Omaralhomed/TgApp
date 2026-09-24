'use client';

import React, { useState } from 'react';
import {
  Send,
  Plus,
  Play,
  Pause,
  Trash2,
  ExternalLink,
  Users,
  CheckCircle2,
  Clock,
  Sparkles,
  Search,
  Filter,
  Layers,
} from 'lucide-react';
import { translations, Language } from '../../lib/translations';
import { DataTable, Column } from '../ui/DataTable';
import { Badge } from '../ui/Badge';
import { CampaignWizardModal } from './CampaignWizardModal';
import { CampaignDetailsModal } from './CampaignDetailsModal';
import { startCampaign, pauseCampaign, deleteCampaign } from '../../lib/api';
import { useToast } from '../ui/ToastContext';

interface CampaignsTabProps {
  campaigns: any[];
  groups: any[];
  accounts: any[];
  isLoading: boolean;
  onRefresh: () => void;
  lang: Language;
}

export function CampaignsTab({
  campaigns,
  groups,
  accounts,
  isLoading,
  onRefresh,
  lang,
}: CampaignsTabProps) {
  const isRtl = lang === 'ar';
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const toast = useToast();
  const t = translations[lang];

  const handleStart = async (id: string) => {
    try {
      toast.info(isRtl ? 'جاري بدء الحملة...' : 'Starting campaign...');
      await startCampaign(id);
      toast.success(isRtl ? 'تم إطلاق الحملة في الخلفية!' : 'Campaign broadcast started!');
      onRefresh();
    } catch (err: any) {
      toast.error(isRtl ? 'فشل إطلاق الحملة' : 'Failed to start campaign', err.response?.data?.message || err.message);
    }
  };

  const handlePause = async (id: string) => {
    try {
      await pauseCampaign(id);
      toast.info(isRtl ? 'تم إيقاف الحملة مؤقتاً' : 'Campaign paused.');
      onRefresh();
    } catch (err: any) {
      toast.error(isRtl ? 'فشل إيقاف الحملة' : 'Failed to pause campaign', err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t.confirmDelete)) return;
    try {
      await deleteCampaign(id);
      toast.success(isRtl ? 'تم حذف الحملة' : 'Campaign deleted.');
      onRefresh();
    } catch (err: any) {
      toast.error(isRtl ? 'فشل حذف الحملة' : 'Failed to delete campaign', err.message);
    }
  };

  const filteredCampaigns = campaigns.filter((c) => {
    if (statusFilter === 'ALL') return true;
    return c.status === statusFilter;
  });

  const runningCount = campaigns.filter(c => c.status === 'RUNNING').length;
  const completedCount = campaigns.filter(c => c.status === 'COMPLETED').length;
  const totalSentAll = campaigns.reduce((acc, c) => acc + (c.sentCount || 0), 0);

  const columns: Column<any>[] = [
    {
      key: 'name',
      header: isRtl ? 'اسم الحملة / الجمهور' : 'Campaign / Audience',
      sortable: true,
      render: (item) => (
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#007AFF]/10 text-[#007AFF] flex items-center justify-center font-bold text-xs shrink-0">
            <Send className="w-3.5 h-3.5 rtl:rotate-180" />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-[#111827] dark:text-white text-xs truncate">{item.name}</p>
            <p className="text-[10px] text-[#94A3B8] truncate">
              {item.group ? item.group.title : (isRtl ? 'جميع جهات الاتصال' : 'All Leads')}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      header: isRtl ? 'الحالة' : 'Status',
      sortable: true,
      render: (item) => {
        const variant =
          item.status === 'RUNNING'
            ? 'primary'
            : item.status === 'COMPLETED'
            ? 'success'
            : item.status === 'PAUSED'
            ? 'warning'
            : 'neutral';
        return <Badge variant={variant}>{item.status}</Badge>;
      },
    },
    {
      key: 'progress',
      header: isRtl ? 'نسبة الإنجاز' : 'Progress',
      sortable: true,
      render: (item) => {
        const total = item.totalTargets || 1;
        const pct = Math.min(100, Math.round(((item.sentCount + (item.failedCount || 0)) / total) * 100));
        return (
          <div className="w-32 flex flex-col gap-1">
            <div className="flex justify-between text-[10px] font-mono">
              <span className="font-bold text-[#007AFF]">{pct}%</span>
              <span className="text-[#94A3B8]">{item.sentCount} / {item.totalTargets}</span>
            </div>
            <div className="h-1.5 w-full bg-black/[.06] dark:bg-white/[.08] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#007AFF] rounded-full transition-all duration-300"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      },
    },
    {
      key: 'delays',
      header: isRtl ? 'التأخير الآمن' : 'Delays',
      render: (item) => (
        <span className="text-xs font-mono text-[#94A3B8]">
          {item.delayMinSeconds}s - {item.delayMaxSeconds}s
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: isRtl ? 'تاريخ الإطلاق' : 'Created',
      sortable: true,
      render: (item) => (
        <span className="text-xs text-[#94A3B8] font-mono">
          {new Date(item.createdAt).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: 'actions',
      header: isRtl ? 'إجراءات' : 'Actions',
      className: 'text-end',
      render: (item) => (
        <div className="flex items-center justify-end gap-1">
          {item.status === 'RUNNING' ? (
            <button
              onClick={() => handlePause(item.id)}
              className="p-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 transition cursor-pointer"
              title={isRtl ? 'إيقاف مؤقت' : 'Pause'}
            >
              <Pause className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              onClick={() => handleStart(item.id)}
              className="p-1.5 rounded-lg bg-[#007AFF] hover:bg-[#0062CC] text-white transition shadow-sm cursor-pointer"
              title={isRtl ? 'تشغيل الحملة' : 'Start'}
            >
              <Play className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            onClick={() => setSelectedCampaignId(item.id)}
            className="p-1.5 rounded-lg border border-black/[.06] dark:border-white/[.07] hover:bg-black/[.04] dark:hover:bg-white/5 text-[#64748B] hover:text-[#111827] dark:hover:text-white transition cursor-pointer"
            title={isRtl ? 'التفاصيل والسجل' : 'Diagnostics'}
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => handleDelete(item.id)}
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
      
      {/* ── Top Header & Summary Pills ────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-white dark:bg-[#11151D] border border-black/[.06] dark:border-white/[.07] shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-[#111827] dark:text-white">{isRtl ? 'الحملات التسويقية الآلية' : 'Marketing Campaigns'}</h2>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#007AFF]/10 text-[#007AFF]">
              {campaigns.length} {isRtl ? 'حملة' : 'Campaigns'}
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-[#64748B] dark:text-[#94A3B8] mt-1 font-mono">
            <span className="text-[#007AFF] font-bold">● {runningCount} {isRtl ? 'نشطة الآن' : 'Running'}</span>
            <span className="text-[#34C759] font-bold">● {completedCount} {isRtl ? 'مكتملة' : 'Completed'}</span>
            <span>📤 {totalSentAll.toLocaleString()} {isRtl ? 'إجمالي الرسائل' : 'Total Sent'}</span>
          </div>
        </div>

        {/* Action Buttons & Filters */}
        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0 flex-wrap">
          {/* Status Filter */}
          <div className="flex items-center gap-1 p-0.5 bg-[#F6F8FB] dark:bg-[#171D28] rounded-lg border border-black/[.05] dark:border-white/[.05] text-xs">
            {['ALL', 'RUNNING', 'COMPLETED', 'PAUSED'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-2.5 py-1 font-bold rounded-md transition cursor-pointer ${
                  statusFilter === status
                    ? 'bg-[#007AFF] text-white shadow-sm'
                    : 'text-[#64748B] dark:text-[#94A3B8] hover:text-[#111827] dark:hover:text-white'
                }`}
              >
                {status === 'ALL'
                  ? (isRtl ? 'الكل' : 'All')
                  : status === 'RUNNING'
                  ? (isRtl ? 'نشطة' : 'Running')
                  : status === 'COMPLETED'
                  ? (isRtl ? 'مكتملة' : 'Done')
                  : (isRtl ? 'متوقفة' : 'Paused')}
              </button>
            ))}
          </div>

          <button
            onClick={() => setIsWizardOpen(true)}
            className="h-8 px-3 rounded-lg bg-[#007AFF] hover:bg-[#0062CC] text-white text-xs font-bold flex items-center gap-1.5 transition shadow-sm shadow-[#007AFF]/20 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{isRtl ? 'إنشاء حملة جديدة' : 'New Campaign'}</span>
          </button>
        </div>
      </div>

      {/* ── Data Table ────────────────────────────────────────── */}
      <DataTable
        columns={columns}
        data={filteredCampaigns}
        keyExtractor={(item) => item.id}
        isLoading={isLoading}
        searchPlaceholder={isRtl ? 'بحث باسم الحملة أو الجمهور...' : 'Search campaigns...'}
        selectable
        selectedKeys={selectedKeys}
        onSelectionChange={setSelectedKeys}
        emptyTitle={isRtl ? 'لا توجد حملات تسويقية بعد' : 'No campaigns yet'}
        emptySubtitle={isRtl ? 'أطلق أول حملة تسويقية لاستخراج العملاء وبدء الإرسال التلقائي.' : 'Create your first campaign to start automated broadcasts.'}
        emptyAction={
          <button
            onClick={() => setIsWizardOpen(true)}
            className="h-9 px-4 rounded-xl bg-[#007AFF] text-white font-bold text-xs flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{isRtl ? 'إنشاء حملة جديدة' : 'Create Campaign'}</span>
          </button>
        }
      />

      {/* Campaign Wizard Modal */}
      <CampaignWizardModal
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        onSuccess={onRefresh}
        groups={groups}
        accounts={accounts}
        lang={lang}
      />

      {/* Campaign Diagnostics Modal */}
      <CampaignDetailsModal
        campaignId={selectedCampaignId}
        isOpen={!!selectedCampaignId}
        onClose={() => setSelectedCampaignId(null)}
        lang={lang}
      />
    </div>
  );
}
