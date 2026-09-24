'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Users,
  Send,
  DollarSign,
  AlertTriangle,
  Play,
  Pause,
  RefreshCw,
  Search,
  CheckCircle2,
  Ban,
  UserCheck,
  CreditCard,
  Cpu,
  Layers,
  Edit,
  ArrowRight,
  ArrowLeft,
  X,
  Server,
  Zap,
} from 'lucide-react';
import { Language } from '../../lib/translations';
import {
  getAdminOverview,
  getAdminTenants,
  updateAdminTenantStatus,
  updateAdminTenantPlan,
  impersonateTenant,
  triggerAdminCircuitBreaker,
  getAdminQueues,
  retryAdminFailedJobs,
} from '../../lib/api';
import { useToast } from '../ui/ToastContext';
import { PendingPaymentsTable } from './PendingPaymentsTable';
import { Badge } from '../ui/Badge';

interface AdminDashboardTabProps {
  lang: Language;
}

export function AdminDashboardTab({ lang }: AdminDashboardTabProps) {
  const isRtl = lang === 'ar';
  const toast = useToast();

  const [activeSubTab, setActiveSubTab] = useState<'tenants' | 'payments' | 'queues'>('tenants');
  const [overview, setOverview] = useState<any | null>(null);
  const [tenants, setTenants] = useState<any[]>([]);
  const [queueStatus, setQueueStatus] = useState<any | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [tierFilter, setTierFilter] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);

  // Edit Quota Modal
  const [editingTenant, setEditingTenant] = useState<any | null>(null);
  const [editTier, setEditTier] = useState('PRO');
  const [editMessagesLimit, setEditMessagesLimit] = useState(30000);
  const [editAccountsLimit, setEditAccountsLimit] = useState(25);
  const [editExtendDays, setEditExtendDays] = useState(30);

  useEffect(() => {
    loadData();
  }, [tierFilter]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [overviewData, tenantsData, queuesData] = await Promise.all([
        getAdminOverview(),
        getAdminTenants(searchTerm, tierFilter),
        getAdminQueues(),
      ]);
      setOverview(overviewData);
      setTenants(tenantsData || []);
      setQueueStatus(queuesData);
    } catch (err: any) {
      toast.error('Failed to load admin data', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleCircuitBreaker = async () => {
    const isHalted = overview?.isEmergencyHalted;
    const confirmMsg = isHalted
      ? isRtl ? 'هل تريد استئناف عمليات تيليجرام لجميع العملاء؟' : 'Resume Telegram operations for all tenants?'
      : isRtl ? '⚠️ تحذير فائق الخطورة: هل تريد تفعيل إيقاف الطوارئ الشامل وإيقاف كافة حملات العملاء فوراً؟' : '⚠️ WARNING: Activate global emergency circuit breaker and pause all tenant campaigns?';

    if (!confirm(confirmMsg)) return;

    try {
      const res = await triggerAdminCircuitBreaker(!isHalted);
      toast.info(res.message);
      loadData();
    } catch (err: any) {
      toast.error('Circuit breaker action failed', err.message);
    }
  };

  const handleToggleStatus = async (tenantId: string, currentActive: boolean) => {
    try {
      await updateAdminTenantStatus(tenantId, !currentActive);
      toast.success(
        currentActive
          ? isRtl ? 'تم تجميد حساب المستأجر بنجاح' : 'Tenant suspended'
          : isRtl ? 'تم تنشيط حساب المستأجر بنجاح' : 'Tenant activated'
      );
      loadData();
    } catch (err: any) {
      toast.error('Failed to update status', err.message);
    }
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTenant) return;

    try {
      await updateAdminTenantPlan(editingTenant.id, {
        subscriptionTier: editTier,
        quotaMessagesLimit: editMessagesLimit,
        quotaAccountsLimit: editAccountsLimit,
        extendDays: editExtendDays,
      });
      toast.success(isRtl ? 'تم تحديث خطة وحصص المستأجر بنجاح!' : 'Tenant quota & plan updated!');
      setEditingTenant(null);
      loadData();
    } catch (err: any) {
      toast.error('Plan update failed', err.message);
    }
  };

  const handleImpersonate = async (tenantId: string, email: string) => {
    if (!confirm(isRtl ? `تسجيل الدخول كعميل إلى حساب ${email}؟` : `Login as client to ${email}?`)) return;

    try {
      const res = await impersonateTenant(tenantId);
      localStorage.setItem('tg_token', res.accessToken);
      localStorage.setItem('tg_user', JSON.stringify(res.user));
      toast.success(isRtl ? `تم تقمص حساب ${email}` : `Impersonating ${email}`);
      window.location.reload();
    } catch (err: any) {
      toast.error('Impersonation failed', err.message);
    }
  };

  const handleRetryFailedJobs = async () => {
    try {
      const res = await retryAdminFailedJobs();
      toast.success(
        isRtl ? `تمت إعادة جدولة ${res.retriedCount} مهمة فاشلة بنجاح!` : `Retried ${res.retriedCount} failed jobs!`,
      );
      loadData();
    } catch (err: any) {
      toast.error('Retry failed', err.message);
    }
  };

  return (
    <div className="flex flex-col gap-3.5 w-full text-start select-none animate-[fadeIn_0.2s_ease-out]">
      {/* 1. TOP STATS CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
        <div className="p-3.5 rounded-xl border border-black/[.06] dark:border-white/[.07] bg-white dark:bg-[#11151D] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#64748B] dark:text-[#94A3B8] text-[11px] font-bold">
            <span>{isRtl ? 'إجمالي المستأجرين' : 'Total Tenants'}</span>
            <Users className="w-3.5 h-3.5 text-[#007AFF]" />
          </div>
          <div className="text-xl font-black font-mono text-[#111827] dark:text-white mt-2">
            {(overview?.totalTenants || 0).toLocaleString()}
          </div>
        </div>

        <div className="p-3.5 rounded-xl border border-black/[.06] dark:border-white/[.07] bg-white dark:bg-[#11151D] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#64748B] dark:text-[#94A3B8] text-[11px] font-bold">
            <span>{isRtl ? 'الحسابات النشطة' : 'Active Accounts'}</span>
            <Send className="w-3.5 h-3.5 text-[#007AFF]" />
          </div>
          <div className="text-xl font-black font-mono text-[#007AFF] mt-2">
            {(overview?.activeAccounts || 0).toLocaleString()}
          </div>
        </div>

        <div className="p-3.5 rounded-xl border border-black/[.06] dark:border-white/[.07] bg-white dark:bg-[#11151D] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#64748B] dark:text-[#94A3B8] text-[11px] font-bold">
            <span>{isRtl ? 'الرسائل المرسلة' : 'Delivered Msgs'}</span>
            <Zap className="w-3.5 h-3.5 text-[#34C759]" />
          </div>
          <div className="text-xl font-black font-mono text-[#34C759] mt-2">
            {(overview?.totalSentPlatform || 0).toLocaleString()}
          </div>
        </div>

        <div className="p-3.5 rounded-xl border border-black/[.06] dark:border-white/[.07] bg-white dark:bg-[#11151D] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#64748B] dark:text-[#94A3B8] text-[11px] font-bold">
            <span>{isRtl ? 'إجمالي الإيرادات' : 'Platform Revenue'}</span>
            <DollarSign className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="text-xl font-black font-mono text-amber-500 mt-2">
            ${(overview?.totalRevenue || 0).toLocaleString()}
          </div>
        </div>
      </div>

      {/* 2. GLOBAL EMERGENCY CIRCUIT BREAKER STRIP */}
      <div
        className={`p-3.5 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs ${
          overview?.isEmergencyHalted
            ? 'bg-rose-500/10 border-rose-500/30'
            : 'bg-white dark:bg-[#11151D] border-black/[.06] dark:border-white/[.07]'
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
              overview?.isEmergencyHalted
                ? 'bg-rose-500 text-white'
                : 'bg-amber-500/10 text-amber-500'
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold text-[#111827] dark:text-white">
                {isRtl ? 'مفتاح طوارئ تيليجرام الشامل (Circuit Breaker)' : 'Global Telegram Circuit Breaker'}
              </h3>
              <Badge variant={overview?.isEmergencyHalted ? 'error' : 'success'}>
                {overview?.isEmergencyHalted ? (isRtl ? 'مفعل • كل شيء متوقف' : 'ACTIVE • HALTED') : (isRtl ? 'طبيعي' : 'NORMAL')}
              </Badge>
            </div>
            <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8] mt-0.5 max-w-2xl">
              {overview?.isEmergencyHalted
                ? (isRtl ? 'تم إيقاف كافة طوابير وحملات الإرسال لجميع العملاء لحماية الأرقام.' : 'All tenant campaigns and queues are strictly paused.')
                : (isRtl ? 'إيقاف كافة عمليات الإرسال عبر المنصة فوراً في ثانية واحدة عند رصد حملات حظر عامة.' : 'Instantly halt all execution platform-wide within 1 second if Telegram sweeps occur.')}
            </p>
          </div>
        </div>

        <button
          onClick={handleToggleCircuitBreaker}
          className={`h-8 px-3.5 rounded-lg font-bold text-xs shadow-xs transition cursor-pointer shrink-0 ${
            overview?.isEmergencyHalted
              ? 'bg-[#34C759] hover:bg-[#2EB04F] text-white'
              : 'bg-rose-600 hover:bg-rose-500 text-white'
          }`}
        >
          {overview?.isEmergencyHalted
            ? (isRtl ? '✅ استئناف العمليات' : 'Resume Normal Operations')
            : (isRtl ? '🚨 تفعيل إيقاف الطوارئ' : 'Trigger Emergency Halt')}
        </button>
      </div>

      {/* 3. SUB-TABS NAVIGATION */}
      <div className="flex items-center gap-1.5 border-b border-black/[.06] dark:border-white/[.07] pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveSubTab('tenants')}
          className={`h-8 px-3 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
            activeSubTab === 'tenants'
              ? 'bg-[#007AFF] text-white shadow-xs'
              : 'border border-black/[.08] dark:border-white/10 hover:bg-black/[.04] dark:hover:bg-white/5 text-[#64748B] dark:text-[#94A3B8]'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>{isRtl ? 'إدارة المستأجرين والحصص' : 'Tenants & Quotas'}</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/10 dark:bg-white/10 text-inherit font-mono">
            {tenants.length}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('payments')}
          className={`h-8 px-3 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer relative ${
            activeSubTab === 'payments'
              ? 'bg-[#007AFF] text-white shadow-xs'
              : 'border border-black/[.08] dark:border-white/10 hover:bg-black/[.04] dark:hover:bg-white/5 text-[#64748B] dark:text-[#94A3B8]'
          }`}
        >
          <CreditCard className="w-3.5 h-3.5" />
          <span>{isRtl ? 'مركز اعتماد التحويلات' : 'Payment Approvals'}</span>
          {(overview?.pendingReceipts || 0) > 0 && (
            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-rose-500 text-white font-mono animate-pulse">
              {overview.pendingReceipts}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveSubTab('queues')}
          className={`h-8 px-3 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
            activeSubTab === 'queues'
              ? 'bg-[#007AFF] text-white shadow-xs'
              : 'border border-black/[.08] dark:border-white/10 hover:bg-black/[.04] dark:hover:bg-white/5 text-[#64748B] dark:text-[#94A3B8]'
          }`}
        >
          <Cpu className="w-3.5 h-3.5" />
          <span>{isRtl ? 'رادار طوابير BullMQ' : 'BullMQ Queue Radar'}</span>
        </button>
      </div>

      {/* 4. SUB-TAB CONTENT */}

      {/* Subtab 1: Tenants & Quotas */}
      {activeSubTab === 'tenants' && (
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-3.5 h-3.5 text-[#94A3B8] absolute top-2.5 start-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={isRtl ? 'بحث بالاسم أو البريد...' : 'Search tenants...'}
                className="w-full h-8 ps-8 pe-3 rounded-lg bg-[#F6F8FB] dark:bg-[#171D28] border border-black/[.08] dark:border-white/10 text-xs text-[#111827] dark:text-white placeholder-[#94A3B8] focus:border-[#007AFF] outline-none"
              />
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              {['ALL', 'STARTER', 'PRO', 'ENTERPRISE'].map((tier) => (
                <button
                  key={tier}
                  onClick={() => setTierFilter(tier)}
                  className={`h-7 px-2.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    tierFilter === tier
                      ? 'bg-[#007AFF] text-white shadow-xs'
                      : 'border border-black/[.08] dark:border-white/10 hover:bg-black/[.04] dark:hover:bg-white/5 text-[#64748B] dark:text-[#94A3B8]'
                  }`}
                >
                  {tier}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-black/[.06] dark:border-white/[.07] bg-white dark:bg-[#11151D] overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-start font-mono">
                <thead className="bg-[#FAFAFC] dark:bg-[#0E121A] text-[#64748B] dark:text-[#94A3B8] font-bold border-b border-black/[.06] dark:border-white/[.07]">
                  <tr>
                    <th className="py-2.5 px-3.5 text-start">{isRtl ? 'المستأجر' : 'Tenant'}</th>
                    <th className="py-2.5 px-3.5 text-start">{isRtl ? 'الباقة' : 'Tier'}</th>
                    <th className="py-2.5 px-3.5 text-start">{isRtl ? 'استهلاك الرسائل' : 'Messages Quota'}</th>
                    <th className="py-2.5 px-3.5 text-start">{isRtl ? 'الحسابات' : 'Accounts'}</th>
                    <th className="py-2.5 px-3.5 text-start">{isRtl ? 'الحالة' : 'Status'}</th>
                    <th className="py-2.5 px-3.5 text-end">{isRtl ? 'الإجراءات' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/[.03] dark:divide-white/[.03] text-[#111827] dark:text-white">
                  {tenants.map((t) => (
                    <tr key={t.id} className="hover:bg-black/[.02] dark:hover:bg-white/[.02] transition">
                      <td className="py-2.5 px-3.5">
                        <div className="font-bold text-xs">{t.name || 'User'}</div>
                        <div className="text-[10px] text-[#94A3B8]">{t.email}</div>
                      </td>
                      <td className="py-2.5 px-3.5">
                        <Badge variant="primary">
                          {t.subscriptionTier || 'STARTER'}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3.5">
                        <div className="font-bold text-[11px]">
                          {(t.quotaMessagesUsed || 0).toLocaleString()} / {(t.quotaMessagesLimit || 1000).toLocaleString()}
                        </div>
                        <div className="w-24 h-1 bg-black/[.06] dark:bg-white/10 rounded-full overflow-hidden mt-1">
                          <div
                            className="h-full bg-[#007AFF] rounded-full"
                            style={{
                              width: `${Math.min(100, Math.round(((t.quotaMessagesUsed || 0) / (t.quotaMessagesLimit || 1000)) * 100))}%`,
                            }}
                          />
                        </div>
                      </td>
                      <td className="py-2.5 px-3.5 font-bold text-[#64748B] dark:text-[#94A3B8]">
                        {t.stats?.accounts || 0} / {t.quotaAccountsLimit || 5}
                      </td>
                      <td className="py-2.5 px-3.5">
                        <Badge variant={t.isActive ? 'success' : 'error'}>
                          {t.isActive ? (isRtl ? 'نشط' : 'Active') : (isRtl ? 'مجمد' : 'Suspended')}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3.5 text-end">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleImpersonate(t.id, t.email)}
                            className="h-6 px-2 rounded-md bg-[#007AFF]/10 hover:bg-[#007AFF]/20 text-[#007AFF] text-[10px] font-bold transition cursor-pointer flex items-center gap-1"
                            title="Login as Client"
                          >
                            <UserCheck className="w-2.5 h-2.5" />
                            <span>{isRtl ? 'تقمص' : 'Impersonate'}</span>
                          </button>

                          <button
                            onClick={() => {
                              setEditingTenant(t);
                              setEditTier(t.subscriptionTier || 'PRO');
                              setEditMessagesLimit(t.quotaMessagesLimit || 30000);
                              setEditAccountsLimit(t.quotaAccountsLimit || 25);
                            }}
                            className="p-1 rounded-md text-[#64748B] dark:text-[#94A3B8] hover:text-[#111827] dark:hover:text-white hover:bg-black/[.04] dark:hover:bg-white/5 transition cursor-pointer"
                            title="Edit Quotas"
                          >
                            <Edit className="w-3 h-3" />
                          </button>

                          <button
                            onClick={() => handleToggleStatus(t.id, t.isActive)}
                            className={`p-1 rounded-md transition cursor-pointer ${
                              t.isActive ? 'text-[#64748B] hover:text-rose-500' : 'text-[#34C759] hover:text-[#2EB04F]'
                            }`}
                            title={t.isActive ? 'Suspend' : 'Activate'}
                          >
                            {t.isActive ? <Ban className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Subtab 2: Payment Approvals */}
      {activeSubTab === 'payments' && (
        <PendingPaymentsTable lang={lang} onPaymentUpdated={loadData} />
      )}

      {/* Subtab 3: BullMQ Queue Radar */}
      {activeSubTab === 'queues' && (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <div>
              <h4 className="text-xs font-bold text-[#111827] dark:text-white flex items-center gap-1.5">
                <Server className="w-3.5 h-3.5 text-[#007AFF]" />
                <span>{isRtl ? 'رادار مراقبة طوابير BullMQ الموزعة' : 'BullMQ Distributed Queues Radar'}</span>
              </h4>
              <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8] mt-0.5">
                {isRtl ? 'تتبع فوري لكافة مهام الحملات والإضافة والكشط مع خيار إعادة المحاولة للمهام الفاشلة.' : 'Live telemetry for background job workers with one-click failed task retry.'}
              </p>
            </div>

            <button
              onClick={handleRetryFailedJobs}
              className="h-8 px-3 rounded-lg bg-[#007AFF] hover:bg-[#0062CC] text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              <span>{isRtl ? 'إعادة تشغيل المهام الفاشلة' : 'Retry Failed Jobs'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Campaigns Queue */}
            <div className="p-3.5 rounded-xl border border-black/[.06] dark:border-white/[.07] bg-white dark:bg-[#11151D] shadow-xs space-y-3 font-mono">
              <div className="flex justify-between items-center border-b border-black/[.04] dark:border-white/[.04] pb-2">
                <h5 className="font-bold text-xs text-[#111827] dark:text-white">Campaigns</h5>
                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-[#34C759]/10 text-[#34C759]">
                  Active
                </span>
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-[#64748B] dark:text-[#94A3B8]">
                  <span>Waiting:</span>
                  <span className="font-bold text-[#111827] dark:text-white">{queueStatus?.counts?.campaigns?.waiting || 0}</span>
                </div>
                <div className="flex justify-between text-[#64748B] dark:text-[#94A3B8]">
                  <span>Active:</span>
                  <span className="font-bold text-[#007AFF]">{queueStatus?.counts?.campaigns?.active || 0}</span>
                </div>
                <div className="flex justify-between text-[#64748B] dark:text-[#94A3B8]">
                  <span>Completed:</span>
                  <span className="font-bold text-[#34C759]">{queueStatus?.counts?.campaigns?.completed || 0}</span>
                </div>
                <div className="flex justify-between text-[#64748B] dark:text-[#94A3B8]">
                  <span>Failed:</span>
                  <span className="font-bold text-rose-500">{queueStatus?.counts?.campaigns?.failed || 0}</span>
                </div>
              </div>
            </div>

            {/* Adder Queue */}
            <div className="p-3.5 rounded-xl border border-black/[.06] dark:border-white/[.07] bg-white dark:bg-[#11151D] shadow-xs space-y-3 font-mono">
              <div className="flex justify-between items-center border-b border-black/[.04] dark:border-white/[.04] pb-2">
                <h5 className="font-bold text-xs text-[#111827] dark:text-white">Adder</h5>
                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-[#34C759]/10 text-[#34C759]">
                  Active
                </span>
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-[#64748B] dark:text-[#94A3B8]">
                  <span>Waiting:</span>
                  <span className="font-bold text-[#111827] dark:text-white">{queueStatus?.counts?.adder?.waiting || 0}</span>
                </div>
                <div className="flex justify-between text-[#64748B] dark:text-[#94A3B8]">
                  <span>Active:</span>
                  <span className="font-bold text-[#007AFF]">{queueStatus?.counts?.adder?.active || 0}</span>
                </div>
                <div className="flex justify-between text-[#64748B] dark:text-[#94A3B8]">
                  <span>Completed:</span>
                  <span className="font-bold text-[#34C759]">{queueStatus?.counts?.adder?.completed || 0}</span>
                </div>
                <div className="flex justify-between text-[#64748B] dark:text-[#94A3B8]">
                  <span>Failed:</span>
                  <span className="font-bold text-rose-500">{queueStatus?.counts?.adder?.failed || 0}</span>
                </div>
              </div>
            </div>

            {/* Scraper Queue */}
            <div className="p-3.5 rounded-xl border border-black/[.06] dark:border-white/[.07] bg-white dark:bg-[#11151D] shadow-xs space-y-3 font-mono">
              <div className="flex justify-between items-center border-b border-black/[.04] dark:border-white/[.04] pb-2">
                <h5 className="font-bold text-xs text-[#111827] dark:text-white">Scraper</h5>
                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-[#34C759]/10 text-[#34C759]">
                  Active
                </span>
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-[#64748B] dark:text-[#94A3B8]">
                  <span>Waiting:</span>
                  <span className="font-bold text-[#111827] dark:text-white">{queueStatus?.counts?.scraper?.waiting || 0}</span>
                </div>
                <div className="flex justify-between text-[#64748B] dark:text-[#94A3B8]">
                  <span>Active:</span>
                  <span className="font-bold text-[#007AFF]">{queueStatus?.counts?.scraper?.active || 0}</span>
                </div>
                <div className="flex justify-between text-[#64748B] dark:text-[#94A3B8]">
                  <span>Completed:</span>
                  <span className="font-bold text-[#34C759]">{queueStatus?.counts?.scraper?.completed || 0}</span>
                </div>
                <div className="flex justify-between text-[#64748B] dark:text-[#94A3B8]">
                  <span>Failed:</span>
                  <span className="font-bold text-rose-500">{queueStatus?.counts?.scraper?.failed || 0}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Quotas Modal */}
      {editingTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#11151D] border border-black/[.08] dark:border-white/10 p-4 shadow-2xl text-start">
            <div className="flex items-center justify-between pb-2 border-b border-black/[.06] dark:border-white/[.07] mb-3">
              <h4 className="text-xs font-bold text-[#111827] dark:text-white">
                {isRtl ? `تعديل باقة وحصص: ${editingTenant.name || editingTenant.email}` : `Edit Quota: ${editingTenant.email}`}
              </h4>
              <button onClick={() => setEditingTenant(null)} className="p-1 text-[#94A3B8] hover:text-[#111827] dark:hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePlan} className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-[#64748B] dark:text-[#94A3B8] mb-1">
                  {isRtl ? 'باقة الاشتراك:' : 'Subscription Tier:'}
                </label>
                <select
                  value={editTier}
                  onChange={(e) => setEditTier(e.target.value)}
                  className="w-full h-8 px-2.5 rounded-lg bg-[#F6F8FB] dark:bg-[#171D28] border border-black/[.08] dark:border-white/10 text-xs text-[#111827] dark:text-white font-bold outline-none"
                >
                  <option value="STARTER">STARTER</option>
                  <option value="PRO">PRO</option>
                  <option value="ENTERPRISE">ENTERPRISE</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-[#64748B] dark:text-[#94A3B8] mb-1">
                    {isRtl ? 'حد الرسائل:' : 'Messages Limit:'}
                  </label>
                  <input
                    type="number"
                    value={editMessagesLimit}
                    onChange={(e) => setEditMessagesLimit(Number(e.target.value))}
                    className="w-full h-8 px-2.5 rounded-lg bg-[#F6F8FB] dark:bg-[#171D28] border border-black/[.08] dark:border-white/10 text-xs text-[#111827] dark:text-white font-bold font-mono outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#64748B] dark:text-[#94A3B8] mb-1">
                    {isRtl ? 'حد الحسابات:' : 'Accounts Limit:'}
                  </label>
                  <input
                    type="number"
                    value={editAccountsLimit}
                    onChange={(e) => setEditAccountsLimit(Number(e.target.value))}
                    className="w-full h-8 px-2.5 rounded-lg bg-[#F6F8FB] dark:bg-[#171D28] border border-black/[.08] dark:border-white/10 text-xs text-[#111827] dark:text-white font-bold font-mono outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#64748B] dark:text-[#94A3B8] mb-1">
                  {isRtl ? 'تمديد الاشتراك (أيام):' : 'Extend (Days):'}
                </label>
                <input
                  type="number"
                  value={editExtendDays}
                  onChange={(e) => setEditExtendDays(Number(e.target.value))}
                  className="w-full h-8 px-2.5 rounded-lg bg-[#F6F8FB] dark:bg-[#171D28] border border-black/[.08] dark:border-white/10 text-xs text-[#111827] dark:text-white font-bold font-mono outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-black/[.04] dark:border-white/[.04]">
                <button
                  type="button"
                  onClick={() => setEditingTenant(null)}
                  className="h-8 px-3 rounded-lg border border-black/[.08] dark:border-white/10 text-[#64748B] dark:text-[#94A3B8] text-xs font-bold"
                >
                  {isRtl ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="h-8 px-4 rounded-lg bg-[#007AFF] hover:bg-[#0062CC] text-white text-xs font-bold transition shadow-xs cursor-pointer"
                >
                  {isRtl ? 'حفظ التعديلات' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
