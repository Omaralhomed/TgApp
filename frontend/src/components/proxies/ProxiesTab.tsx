'use client';

import React, { useState } from 'react';
import {
  Server,
  Plus,
  Activity,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Clock,
  RefreshCw,
  Zap,
  ShieldCheck,
} from 'lucide-react';
import { translations, Language } from '../../lib/translations';
import { DataTable, Column } from '../ui/DataTable';
import { Badge } from '../ui/Badge';
import { AddProxyModal } from './AddProxyModal';
import { testProxy, testAllProxies, deleteProxy, autoDistributeProxies } from '../../lib/api';
import { useToast } from '../ui/ToastContext';

interface ProxiesTabProps {
  proxies: any[];
  isLoading: boolean;
  onRefresh: () => void;
  lang: Language;
}

export function ProxiesTab({
  proxies,
  isLoading,
  onRefresh,
  lang,
}: ProxiesTabProps) {
  const isRtl = lang === 'ar';
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isTestingAll, setIsTestingAll] = useState(false);
  const [isDistributing, setIsDistributing] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const toast = useToast();
  const t = translations[lang];

  const handleAutoDistribute = async () => {
    try {
      setIsDistributing(true);
      toast.info(isRtl ? 'جاري توزيع الحسابات تلقائياً...' : 'Auto-distributing accounts...');
      const res = await autoDistributeProxies();
      toast.success(res.message || (isRtl ? 'تم توزيع الحسابات بنجاح' : 'Accounts distributed successfully'));
      onRefresh();
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || (isRtl ? 'فشل التوزيع' : 'Auto-distribution failed'));
    } finally {
      setIsDistributing(false);
    }
  };

  const handleTestProxy = async (id: string) => {
    try {
      toast.info(isRtl ? 'جاري فحص سرعة الاستجابة...' : 'Pinging proxy socket...');
      const res = await testProxy(id);
      if (res.success) {
        toast.success(isRtl ? `متصل بنجاح: ${res.latency}ms` : `Connected in ${res.latency}ms`);
      } else {
        toast.error(isRtl ? 'فشل الاتصال بالبروكسي' : 'Proxy test failed', res.error);
      }
      onRefresh();
    } catch (err: any) {
      toast.error(isRtl ? 'خطأ أثناء الفحص' : 'Proxy check error', err.message);
    }
  };

  const handleTestAll = async () => {
    try {
      setIsTestingAll(true);
      toast.info(isRtl ? 'جاري فحص جميع البروكسيات بالتوازي...' : 'Testing all proxies in parallel...');
      const res = await testAllProxies();
      toast.success(isRtl ? `تم فحص ${res.total} بروكسي!` : `Tested ${res.total} proxies!`);
      onRefresh();
    } catch (err: any) {
      toast.error(isRtl ? 'فشل الفحص' : 'Test all failed', err.message);
    } finally {
      setIsTestingAll(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t.confirmDelete)) return;
    try {
      await deleteProxy(id);
      toast.success(isRtl ? 'تم حذف البروكسي' : 'Proxy removed');
      onRefresh();
    } catch (err: any) {
      toast.error(isRtl ? 'فشل حذف البروكسي' : 'Failed to delete proxy', err.message);
    }
  };

  const onlineCount = proxies.filter((p) => p.isActive).length;

  const columns: Column<any>[] = [
    {
      key: 'host',
      header: isRtl ? 'عنوان الخادم والمنفذ' : 'Proxy Connection',
      sortable: true,
      render: (item) => (
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#007AFF]/10 text-[#007AFF] flex items-center justify-center font-bold text-xs shrink-0">
            <Server className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <p className="font-mono font-bold text-[#111827] dark:text-white text-xs truncate">
              {item.host}:{item.port}
            </p>
            <p className="text-[10px] text-[#94A3B8] uppercase font-mono truncate">
              {item.protocol} {item.username ? `(${item.username})` : ''}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'latency',
      header: isRtl ? 'سرعة الاستجابة' : 'Ping / Latency',
      sortable: true,
      render: (item) => {
        const latency = item.responseTimeMs || 0;
        const color =
          latency === 0
            ? 'text-[#94A3B8]'
            : latency < 350
            ? 'text-[#34C759]'
            : latency < 800
            ? 'text-amber-500'
            : 'text-rose-500';
        return (
          <div className="flex items-center gap-1.5 font-mono text-xs">
            <Clock className={`w-3.5 h-3.5 ${color}`} />
            <span className={`font-bold ${color}`}>{latency > 0 ? `${latency}ms` : (isRtl ? 'غير مفحوص' : 'Untested')}</span>
          </div>
        );
      },
    },
    {
      key: 'status',
      header: isRtl ? 'الحالة' : 'Status',
      render: (item) => (
        <Badge variant={item.isActive ? 'success' : 'error'}>
          {item.isActive ? 'ONLINE' : 'FAILED'}
        </Badge>
      ),
    },
    {
      key: 'accounts',
      header: isRtl ? 'الحسابات المربوطة' : 'Bound Accounts',
      render: (item) => (
        <span className="font-mono text-xs text-[#111827] dark:text-white font-bold">
          {item._count?.accounts || item.accounts?.length || 0} {isRtl ? 'حساب' : 'accounts'}
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
            onClick={() => handleTestProxy(item.id)}
            className="p-1.5 rounded-lg border border-black/[.06] dark:border-white/[.07] hover:bg-[#007AFF]/10 text-[#64748B] hover:text-[#007AFF] transition cursor-pointer"
            title={isRtl ? 'فحص سرعة الاستجابة' : 'Ping Latency'}
          >
            <Activity className="w-3.5 h-3.5" />
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
      
      {/* ── Top Header & Summary ────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-white dark:bg-[#11151D] border border-black/[.06] dark:border-white/[.07] shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-[#111827] dark:text-white">
              {isRtl ? 'إدارة البروكسيات وشبكات الحماية' : 'Proxies & Network Pool'}
            </h2>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#007AFF]/10 text-[#007AFF]">
              {proxies.length} {isRtl ? 'بروكسي' : 'Proxies'}
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-[#64748B] dark:text-[#94A3B8] mt-1 font-mono">
            <span className="text-[#34C759] font-bold">● {onlineCount} {isRtl ? 'متصل وجاهز' : 'Online'}</span>
            <span className="text-amber-500 font-bold">🛡️ SOCKS5 / MTProto</span>
          </div>
        </div>

        {/* Actions Bar */}
        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0 flex-wrap">
          <button
            onClick={handleAutoDistribute}
            disabled={isDistributing || proxies.length === 0}
            className="h-8 px-3 rounded-lg border border-black/[.08] dark:border-white/10 hover:bg-black/[.04] dark:hover:bg-white/5 text-[#111827] dark:text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
          >
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <span>{isDistributing ? (isRtl ? 'جاري التوزيع...' : 'Distributing...') : (isRtl ? 'توزيع ذكي على الحسابات' : 'Auto-Distribute')}</span>
          </button>

          <button
            onClick={handleTestAll}
            disabled={isTestingAll || proxies.length === 0}
            className="h-8 px-3 rounded-lg border border-black/[.08] dark:border-white/10 hover:bg-black/[.04] dark:hover:bg-white/5 text-[#111827] dark:text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#007AFF] ${isTestingAll ? 'animate-spin' : ''}`} />
            <span>{isTestingAll ? (isRtl ? 'جاري الفحص...' : 'Testing...') : (isRtl ? 'فحص جميع البروكسيات' : 'Test All')}</span>
          </button>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="h-8 px-3 rounded-lg bg-[#007AFF] hover:bg-[#0062CC] text-white text-xs font-bold flex items-center gap-1.5 transition shadow-sm shadow-[#007AFF]/20 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{isRtl ? 'إضافة بروكسي' : 'Add Proxy'}</span>
          </button>
        </div>
      </div>

      {/* ── Proxies DataTable ────────────────────────── */}
      <DataTable
        columns={columns}
        data={proxies}
        keyExtractor={(item) => item.id}
        isLoading={isLoading}
        searchPlaceholder={isRtl ? 'بحث بعنوان الخادم أو المنفذ...' : 'Search proxies by host or port...'}
        selectable
        selectedKeys={selectedKeys}
        onSelectionChange={setSelectedKeys}
        emptyTitle={isRtl ? 'لا توجد بروكسيات مضافة بعد' : 'No proxies configured'}
        emptySubtitle={isRtl ? 'أضف بروكسيات SOCKS5 أو HTTP لعزل جلسات الاتصال وحماية حسابات تليجرام.' : 'Add SOCKS5 or HTTP proxies to isolate MTProto connection sessions.'}
        emptyAction={
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="h-8 px-3 rounded-lg bg-[#007AFF] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{isRtl ? 'إضافة بروكسي جديد' : 'Add Proxy'}</span>
          </button>
        }
      />

      {/* Add Proxy Modal */}
      <AddProxyModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={onRefresh}
        lang={lang}
      />
    </div>
  );
}
