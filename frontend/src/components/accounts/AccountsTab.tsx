'use client';

import React, { useState } from 'react';
import {
  Users,
  UserPlus,
  Activity,
  Trash2,
  ExternalLink,
  ShieldCheck,
  Server,
  Zap,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Send,
} from 'lucide-react';
import { translations, Language } from '../../lib/translations';
import { DataTable, Column } from '../ui/DataTable';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { AddAccountModal } from './AddAccountModal';
import { AccountDetailsDrawer } from './AccountDetailsDrawer';
import { checkAccount, deleteAccount, syncAllHealth } from '../../lib/api';
import { useToast } from '../ui/ToastContext';

interface AccountsTabProps {
  accounts: any[];
  proxies: any[];
  isLoading: boolean;
  onRefresh: () => void;
  lang: Language;
}

export function AccountsTab({
  accounts,
  proxies,
  isLoading,
  onRefresh,
  lang,
}: AccountsTabProps) {
  const isRtl = lang === 'ar';
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<any | null>(null);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [isSyncing, setIsSyncing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const toast = useToast();
  const t = translations[lang];

  const handleHealthCheck = async (id: string) => {
    try {
      toast.info(isRtl ? 'جاري فحص اتصال الحساب...' : 'Checking account health...');
      const res = await checkAccount(id);
      toast.success(isRtl ? `حالة الحساب: ${res.status}` : `Health: ${res.status}`);
      onRefresh();
    } catch (err: any) {
      toast.error(isRtl ? 'فشل فحص الحالة' : 'Health check failed', err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t.confirmDelete)) return;
    try {
      await deleteAccount(id);
      toast.success(t.toastSuccess);
      onRefresh();
    } catch (err: any) {
      toast.error(isRtl ? 'فشل حذف الحساب' : 'Failed to delete account', err.message);
    }
  };

  const handleBulkSync = async () => {
    try {
      setIsSyncing(true);
      toast.info(isRtl ? 'جاري فحص جميع الحسابات...' : 'Evaluating all MTProto sessions...');
      const res = await syncAllHealth();
      toast.success(isRtl ? `تم فحص ${res.synced} حساب بنجاح!` : `Evaluated ${res.synced} accounts!`);
      onRefresh();
    } catch (err: any) {
      toast.error(isRtl ? 'فشل المزامنة' : 'Health sync failed', err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const filteredAccounts = accounts.filter((acc) => {
    if (statusFilter === 'ALL') return true;
    return acc.status === statusFilter;
  });

  // Quick stats
  const activeCount = accounts.filter(a => a.status === 'ACTIVE').length;
  const floodCount = accounts.filter(a => a.status === 'FLOOD_WAIT').length;
  const totalSentToday = accounts.reduce((sum, a) => sum + (a.sentToday || 0), 0);

  const columns: Column<any>[] = [
    {
      key: 'phone',
      header: isRtl ? 'الحساب / الهاتف' : 'Account / Phone',
      sortable: true,
      render: (item) => (
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#007AFF]/10 text-[#007AFF] flex items-center justify-center font-bold text-xs shrink-0">
            {item.firstName ? item.firstName[0] : 'T'}
          </div>
          <div className="min-w-0">
            <p className="font-bold text-[#111827] dark:text-white text-xs truncate font-mono">{item.phone}</p>
            <p className="text-[10px] text-[#94A3B8] truncate">
              {item.firstName || 'Telegram User'} {item.username ? `(@${item.username})` : ''}
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
          item.status === 'ACTIVE'
            ? 'success'
            : item.status === 'FLOOD_WAIT'
            ? 'warning'
            : 'error';
        return <Badge variant={variant}>{item.status}</Badge>;
      },
    },
    {
      key: 'healthScore',
      header: isRtl ? 'الصحة' : 'Health',
      sortable: true,
      render: (item) => {
        const score = item.healthScore ?? 100;
        const color = score >= 80 ? 'text-[#34C759]' : score >= 50 ? 'text-amber-500' : 'text-rose-500';
        return (
          <div className="flex items-center gap-1.5 font-mono text-xs">
            <span className={`font-bold ${color}`}>{score}%</span>
            <span className="text-[10px] text-[#94A3B8] font-sans">({item.tier || 'T1'})</span>
          </div>
        );
      },
    },
    {
      key: 'sentToday',
      header: isRtl ? 'مرسل اليوم / الحد' : 'Sent / Limit',
      sortable: true,
      render: (item) => (
        <div className="text-xs font-mono">
          <span className="font-bold text-[#111827] dark:text-white">{item.sentToday || 0}</span>
          <span className="text-[#94A3B8]"> / {item.dailyLimit || 40}</span>
        </div>
      ),
    },
    {
      key: 'proxy',
      header: isRtl ? 'البروكسي' : 'Proxy',
      render: (item) =>
        item.proxy ? (
          <div className="flex items-center gap-1 text-xs text-[#111827] dark:text-[#F8FAFC] font-mono">
            <Server className="w-3 h-3 text-[#007AFF] shrink-0" />
            <span className="truncate max-w-[110px]">
              {item.proxy.host}:{item.proxy.port}
            </span>
          </div>
        ) : (
          <span className="text-[#94A3B8] text-xs">—</span>
        ),
    },
    {
      key: 'actions',
      header: isRtl ? 'إجراءات' : 'Actions',
      className: 'text-end',
      render: (item) => (
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={() => setSelectedAccount(item)}
            className="p-1.5 rounded-lg border border-black/[.06] dark:border-white/[.07] hover:bg-black/[.04] dark:hover:bg-white/5 text-[#64748B] hover:text-[#111827] dark:hover:text-white transition cursor-pointer"
            title={t.viewDetails}
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => handleHealthCheck(item.id)}
            className="p-1.5 rounded-lg border border-black/[.06] dark:border-white/[.07] hover:bg-[#34C759]/10 text-[#64748B] hover:text-[#34C759] transition cursor-pointer"
            title={t.reCheckHealth}
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
      
      {/* ── Top Header & Summary Pills ────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-white dark:bg-[#11151D] border border-black/[.06] dark:border-white/[.07] shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-[#111827] dark:text-white">{isRtl ? 'إدارة حسابات تيليجرام' : 'Telegram Accounts'}</h2>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#007AFF]/10 text-[#007AFF]">
              {accounts.length} {isRtl ? 'حساب' : 'Accounts'}
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-[#64748B] dark:text-[#94A3B8] mt-1 font-mono">
            <span className="text-[#34C759] font-bold">● {activeCount} {isRtl ? 'نشط' : 'Active'}</span>
            {floodCount > 0 && <span className="text-amber-500 font-bold">● {floodCount} {isRtl ? 'تهدئة' : 'Cooldown'}</span>}
            <span>📤 {totalSentToday.toLocaleString()} {isRtl ? 'مُرسل اليوم' : 'Sent Today'}</span>
          </div>
        </div>

        {/* Action Buttons & Filters */}
        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0 flex-wrap">
          {/* Status Filter */}
          <div className="flex items-center gap-1 p-0.5 bg-[#F6F8FB] dark:bg-[#171D28] rounded-lg border border-black/[.05] dark:border-white/[.05] text-xs">
            {['ALL', 'ACTIVE', 'FLOOD_WAIT'].map((status) => (
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
                  : status === 'ACTIVE'
                  ? (isRtl ? 'نشط' : 'Active')
                  : (isRtl ? 'تهدئة' : 'Cooldown')}
              </button>
            ))}
          </div>

          <button
            onClick={handleBulkSync}
            disabled={isSyncing}
            className="h-8 px-2.5 rounded-lg border border-black/[.08] dark:border-white/[.09] bg-[#F6F8FB] dark:bg-[#171D28] hover:bg-black/[.04] dark:hover:bg-white/[.06] text-[#111827] dark:text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-[#007AFF]' : ''}`} />
            <span>{isRtl ? 'فحص الكل' : 'Sync All'}</span>
          </button>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="h-8 px-3 rounded-lg bg-[#007AFF] hover:bg-[#0062CC] text-white text-xs font-bold flex items-center gap-1.5 transition shadow-sm shadow-[#007AFF]/20 cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>{isRtl ? 'ربط حساب جديد' : 'Connect Account'}</span>
          </button>
        </div>
      </div>

      {/* ── Data Table ────────────────────────────────────────── */}
      <DataTable
        columns={columns}
        data={filteredAccounts}
        keyExtractor={(item) => item.id}
        isLoading={isLoading}
        searchPlaceholder={isRtl ? 'بحث برقم الهاتف أو الاسم...' : 'Search phone, name...'}
        selectable
        selectedKeys={selectedKeys}
        onSelectionChange={setSelectedKeys}
        emptyTitle={isRtl ? 'لا توجد حسابات متصلة حالياً' : 'No accounts connected'}
        emptySubtitle={isRtl ? 'قم بربط أول حساب تيليجرام لبدء إرسال الحملات.' : 'Connect your first phone number to start automating campaigns.'}
        emptyAction={
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="h-9 px-4 rounded-xl bg-[#007AFF] text-white font-bold text-xs flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>{isRtl ? 'ربط حساب جديد' : 'Connect Account'}</span>
          </button>
        }
      />

      {/* Add Account Modal */}
      <AddAccountModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={onRefresh}
        proxies={proxies}
        lang={lang}
      />

      {/* Account Details Diagnostic Drawer */}
      <AccountDetailsDrawer
        account={selectedAccount}
        isOpen={!!selectedAccount}
        onClose={() => setSelectedAccount(null)}
        onUpdated={onRefresh}
        proxies={proxies}
        lang={lang}
      />
    </div>
  );
}
