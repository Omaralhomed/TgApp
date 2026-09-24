'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  CreditCard,
  Zap,
  Sparkles,
  ShieldCheck,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Receipt,
  Eye,
  Check,
  Download,
  Users,
  MessageSquare,
} from 'lucide-react';
import { Language } from '../../lib/translations';
import { getBillingOverview, getBillingPlans, exportBillingInvoicesCsv, downloadCsvFile } from '../../lib/api';
import { PaymentModal } from './PaymentModal';
import { TopUpModal } from './TopUpModal';
import { Badge } from '../ui/Badge';

interface BillingTabProps {
  lang: Language;
}

export function BillingTab({ lang }: BillingTabProps) {
  const isRtl = lang === 'ar';
  const [data, setData] = useState<any | null>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modals
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isTopUpModalOpen, setIsTopUpModalOpen] = useState(false);
  const [selectedPlanForPayment, setSelectedPlanForPayment] = useState<any | null>(null);
  const [selectedReceiptPreview, setSelectedReceiptPreview] = useState<string | null>(null);

  const fetchOverview = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);
    try {
      const [overviewData, plansData] = await Promise.all([
        getBillingOverview(),
        getBillingPlans().catch(() => ({ plans: [] })),
      ]);
      setData(overviewData);
      if (plansData?.plans) setPlans(plansData.plans);
    } catch (err) {
      console.error('Failed to fetch billing data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  const handleOpenUpgrade = (plan: any) => {
    setSelectedPlanForPayment({
      id: plan.id,
      name: plan.name,
      nameAr: plan.nameAr,
      price: plan.priceMonthly,
      messages: plan.quotaMessagesLimit,
      accounts: plan.quotaAccountsLimit,
    });
    setIsPaymentModalOpen(true);
  };

  const handleTopUpSelected = (pkg: any) => {
    setSelectedPlanForPayment(pkg);
    setIsPaymentModalOpen(true);
  };

  const handleExportInvoicesCsv = async () => {
    try {
      const res = await exportBillingInvoicesCsv();
      if (res?.csvContent) {
        downloadCsvFile(res.csvContent, res.filename || 'billing_invoices.csv');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const user = data?.user;
  const orders = data?.orders || [];

  return (
    <div className="flex flex-col gap-3.5 w-full text-start select-none animate-[fadeIn_0.2s_ease-out]">
      
      {/* ── Top Header & Summary ────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-white dark:bg-[#11151D] border border-black/[.06] dark:border-white/[.07] shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-[#111827] dark:text-white">
              {isRtl ? 'مركز الفوترة وإدارة الاشتراكات' : 'Billing & Subscriptions'}
            </h2>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#007AFF]/10 text-[#007AFF] font-mono">
              {user?.subscriptionTier || 'PRO'} PLAN
            </span>
          </div>
          <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-0.5">
            {isRtl
              ? 'متابعة استهلاك الحصص، ترقية الباقات، شحن الرسائل الإضافية، وسجل الإيصالات.'
              : 'Monitor quota usage, upgrade plans, buy extra message credits, and track receipts.'}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0 flex-wrap">
          <button
            onClick={() => setIsTopUpModalOpen(true)}
            className="h-8 px-3 rounded-lg border border-black/[.08] dark:border-white/10 hover:bg-black/[.04] dark:hover:bg-white/5 text-[#111827] dark:text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
          >
            <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
            <span>{isRtl ? 'شحن رصيد رسائل' : 'Top Up'}</span>
          </button>

          <button
            onClick={() => {
              const pro = plans.find((p) => p.id === 'PRO') || {
                id: 'PRO',
                name: 'Professional Plan',
                nameAr: 'باقة المحترفين',
                priceMonthly: 79,
                quotaMessagesLimit: 30000,
                quotaAccountsLimit: 25,
              };
              handleOpenUpgrade(pro);
            }}
            className="h-8 px-3 rounded-lg bg-[#007AFF] hover:bg-[#0062CC] text-white text-xs font-bold flex items-center gap-1.5 transition shadow-sm shadow-[#007AFF]/20 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isRtl ? 'ترقية الخطة' : 'Upgrade Plan'}</span>
          </button>

          <button
            onClick={() => fetchOverview(true)}
            disabled={refreshing}
            className="p-1.5 rounded-lg border border-black/[.06] dark:border-white/[.07] hover:bg-black/[.04] dark:hover:bg-white/5 text-[#64748B] hover:text-[#111827] dark:hover:text-white transition cursor-pointer"
            title={isRtl ? 'تحديث' : 'Refresh'}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-[#007AFF]' : ''}`} />
          </button>
        </div>
      </div>

      {/* ── 3 Quota & Plan Status Cards ────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* 1. Current Plan */}
        <div className="p-3.5 rounded-xl border border-black/[.06] dark:border-white/[.07] bg-white dark:bg-[#11151D] shadow-xs flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between pb-1.5 border-b border-black/[.04] dark:border-white/[.04]">
            <span className="text-[11px] font-bold text-[#64748B] dark:text-[#94A3B8]">
              {isRtl ? 'الخطة الحالية' : 'Current Plan'}
            </span>
            <Badge variant="primary">{user?.subscriptionTier || 'PRO'}</Badge>
          </div>

          <div>
            <h3 className="text-base font-black text-[#111827] dark:text-white">
              {user?.subscriptionTier === 'ENTERPRISE'
                ? isRtl ? 'باقة الشركات VIP' : 'Enterprise VIP'
                : user?.subscriptionTier === 'PRO'
                ? isRtl ? 'باقة المحترفين PRO' : 'Professional PRO'
                : isRtl ? 'الباقة المبتدئة' : 'Starter Tier'}
            </h3>
            <p className="text-[10px] text-[#94A3B8] font-mono mt-0.5">
              {user?.subscriptionExpiresAt
                ? `${isRtl ? 'صالحة حتى:' : 'Expires:'} ${new Date(user.subscriptionExpiresAt).toLocaleDateString()}`
                : (isRtl ? 'اشتراك نشط ومفعل' : 'Active Account')}
            </p>
          </div>

          <div className="pt-2 border-t border-black/[.04] dark:border-white/[.04] flex items-center justify-between text-[11px]">
            <span className="text-[#34C759] font-bold flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              {isRtl ? 'الحساب مفعل' : 'Active'}
            </span>
            <button
              onClick={() => setIsTopUpModalOpen(true)}
              className="text-[#007AFF] font-bold hover:underline cursor-pointer"
            >
              {isRtl ? 'شحن رصيد' : 'Top up'}
            </button>
          </div>
        </div>

        {/* 2. Message Quota */}
        <div className="p-3.5 rounded-xl border border-black/[.06] dark:border-white/[.07] bg-white dark:bg-[#11151D] shadow-xs flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between pb-1.5 border-b border-black/[.04] dark:border-white/[.04]">
            <span className="text-[11px] font-bold text-[#64748B] dark:text-[#94A3B8]">
              {isRtl ? 'استهلاك الرسائل' : 'Message Quota'}
            </span>
            <span className="text-xs font-mono font-bold text-[#007AFF]">
              {data?.percentUsed ?? 0}%
            </span>
          </div>

          <div>
            <div className="flex items-baseline gap-1.5 font-mono">
              <span className="text-lg font-black text-[#111827] dark:text-white">
                {(user?.quotaMessagesUsed || 0).toLocaleString()}
              </span>
              <span className="text-xs text-[#94A3B8]">
                / {(user?.quotaMessagesLimit || 30000).toLocaleString()} {isRtl ? 'رسالة' : 'msgs'}
              </span>
            </div>

            <div className="w-full h-1.5 rounded-full bg-black/[.06] dark:bg-white/[.08] mt-2 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  (data?.percentUsed || 0) > 85 ? 'bg-rose-500' : 'bg-[#007AFF]'
                }`}
                style={{ width: `${Math.min(100, data?.percentUsed || 0)}%` }}
              />
            </div>
          </div>

          <div className="pt-2 border-t border-black/[.04] dark:border-white/[.04] flex items-center justify-between text-[11px] font-mono text-[#64748B] dark:text-[#94A3B8]">
            <span>{isRtl ? 'الرصيد المتبقي:' : 'Remaining:'}</span>
            <span className="font-bold text-[#111827] dark:text-white">
              {(data?.remainingMessages || 0).toLocaleString()}
            </span>
          </div>
        </div>

        {/* 3. Telegram Accounts Quota */}
        <div className="p-3.5 rounded-xl border border-black/[.06] dark:border-white/[.07] bg-white dark:bg-[#11151D] shadow-xs flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between pb-1.5 border-b border-black/[.04] dark:border-white/[.04]">
            <span className="text-[11px] font-bold text-[#64748B] dark:text-[#94A3B8]">
              {isRtl ? 'الحسابات المتصلة' : 'Connected Accounts'}
            </span>
            <span className="text-xs font-mono font-bold text-[#34C759]">
              {data?.activeAccountsCount || 0} / {user?.quotaAccountsLimit || 25}
            </span>
          </div>

          <div>
            <div className="text-lg font-black font-mono text-[#111827] dark:text-white">
              {data?.activeAccountsCount || 0}
              <span className="text-xs text-[#94A3B8] font-normal mx-1">
                {isRtl ? 'حساب نشط' : 'active'}
              </span>
            </div>
            <p className="text-[10px] text-[#94A3B8] mt-0.5">
              {isRtl ? `الحد الأقصى لخطة ${user?.subscriptionTier || 'PRO'}: حتى ${user?.quotaAccountsLimit || 25} حساب` : `Capacity limit: up to ${user?.quotaAccountsLimit || 25} accounts`}
            </p>
          </div>

          <div className="pt-2 border-t border-black/[.04] dark:border-white/[.04] flex items-center justify-between text-[11px]">
            <span className="text-[#64748B] dark:text-[#94A3B8]">{isRtl ? 'عزل الـ IP:' : 'IP Isolation:'}</span>
            <span className="font-bold text-[#34C759] font-mono">
              ● {isRtl ? 'مفعل ومحمي' : 'Active SOCKS5'}
            </span>
          </div>
        </div>
      </div>

      {/* ── Plans Comparison Grid ────────────────────────── */}
      <div className="space-y-2 pt-1">
        <h3 className="text-xs font-bold text-[#111827] dark:text-white">
          {isRtl ? 'باقات الاشتراك الشهرية المتاحة' : 'Available Subscription Plans'}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {plans.map((p) => {
            const isCurrent = user?.subscriptionTier === p.id;
            return (
              <div
                key={p.id}
                className={`relative rounded-xl p-4 border flex flex-col justify-between transition-all ${
                  p.isPopular
                    ? 'border-[#007AFF] bg-[#007AFF]/[0.03] shadow-xs'
                    : 'border-black/[.06] dark:border-white/[.07] bg-white dark:bg-[#11151D]'
                }`}
              >
                {p.isPopular && (
                  <span className="absolute -top-2.5 end-4 px-2 py-0.5 rounded-full text-[9px] font-bold bg-[#007AFF] text-white shadow-xs">
                    {isRtl ? 'الأكثر طلباً' : 'Popular'}
                  </span>
                )}

                <div className="space-y-3">
                  <div className="flex items-baseline justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-[#111827] dark:text-white">
                        {isRtl ? p.nameAr : p.name}
                      </h4>
                      <div className="mt-1 flex items-baseline gap-1 font-mono">
                        <span className="text-xl font-black text-[#111827] dark:text-white">${p.priceMonthly}</span>
                        <span className="text-[10px] text-[#94A3B8]">/ {isRtl ? 'شهر' : 'mo'}</span>
                      </div>
                    </div>
                  </div>

                  <ul className="space-y-1.5 text-xs text-[#64748B] dark:text-[#94A3B8]">
                    {(isRtl ? p.featuresAr : p.features)?.map((feat: string, idx: number) => (
                      <li key={idx} className="flex items-center gap-1.5 text-[11px]">
                        <Check className="w-3 h-3 text-[#34C759] shrink-0" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-3 mt-3 border-t border-black/[.04] dark:border-white/[.04]">
                  <button
                    disabled={isCurrent}
                    onClick={() => handleOpenUpgrade(p)}
                    className={`w-full h-8 rounded-lg font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1.5 ${
                      isCurrent
                        ? 'bg-black/[.04] dark:bg-white/5 text-[#94A3B8] cursor-not-allowed'
                        : p.isPopular
                        ? 'bg-[#007AFF] hover:bg-[#0062CC] text-white shadow-xs'
                        : 'border border-black/[.08] dark:border-white/10 hover:bg-black/[.04] dark:hover:bg-white/5 text-[#111827] dark:text-white'
                    }`}
                  >
                    {isCurrent ? (
                      <span>{isRtl ? 'باقتك الحالية' : 'Current Plan'}</span>
                    ) : (
                      <>
                        <Sparkles className="w-3 h-3" />
                        <span>{isRtl ? 'اختيار وترقية' : 'Select Plan'}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Transactions & Receipts Table ────────────────────────── */}
      <div className="space-y-2 pt-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-[#007AFF]" />
            <h3 className="text-xs font-bold text-[#111827] dark:text-white">
              {isRtl ? 'سجل المعاملات والمدفوعات' : 'Transaction History & Receipts'}
            </h3>
          </div>
          <button
            onClick={handleExportInvoicesCsv}
            disabled={orders.length === 0}
            className="h-7 px-2.5 rounded-lg border border-black/[.08] dark:border-white/10 hover:bg-black/[.04] dark:hover:bg-white/5 text-[#111827] dark:text-white text-xs font-bold flex items-center gap-1 transition cursor-pointer disabled:opacity-40"
          >
            <Download className="w-3 h-3 text-[#007AFF]" />
            <span>{isRtl ? 'تصدير CSV' : 'Export CSV'}</span>
          </button>
        </div>

        <div className="rounded-xl border border-black/[.06] dark:border-white/[.07] bg-white dark:bg-[#11151D] overflow-hidden shadow-sm">
          {orders.length === 0 ? (
            <div className="py-8 text-center text-xs text-[#94A3B8]">
              {isRtl ? 'لا توجد معاملات سابقة بعد' : 'No transaction records found'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-start text-xs font-mono">
                <thead>
                  <tr className="border-b border-black/[.06] dark:border-white/[.07] bg-[#FAFAFC] dark:bg-[#0E121A] text-[#64748B] dark:text-[#94A3B8] font-bold">
                    <th className="px-4 py-2.5 text-start">{isRtl ? 'رقم الطلب' : 'Order ID'}</th>
                    <th className="px-4 py-2.5 text-start">{isRtl ? 'الباقة / الشحنة' : 'Plan'}</th>
                    <th className="px-4 py-2.5 text-start">{isRtl ? 'المبلغ' : 'Amount'}</th>
                    <th className="px-4 py-2.5 text-start">{isRtl ? 'الوسيلة' : 'Method'}</th>
                    <th className="px-4 py-2.5 text-start">{isRtl ? 'الإيصال' : 'Receipt'}</th>
                    <th className="px-4 py-2.5 text-start">{isRtl ? 'الحالة' : 'Status'}</th>
                    <th className="px-4 py-2.5 text-start">{isRtl ? 'التاريخ' : 'Date'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/[.03] dark:divide-white/[.03] text-[#111827] dark:text-white">
                  {orders.map((ord: any) => (
                    <tr key={ord.id} className="hover:bg-black/[.02] dark:hover:bg-white/[.02] transition">
                      <td className="px-4 py-2.5 font-bold">#{ord.id.slice(0, 8)}</td>
                      <td className="px-4 py-2.5">{ord.planRequested}</td>
                      <td className="px-4 py-2.5 font-bold text-[#007AFF]">${ord.amountPaid} {ord.currency}</td>
                      <td className="px-4 py-2.5 text-[#64748B] dark:text-[#94A3B8]">{ord.paymentMethod}</td>
                      <td className="px-4 py-2.5">
                        {ord.receiptImageUrl ? (
                          <button
                            type="button"
                            onClick={() => setSelectedReceiptPreview(ord.receiptImageUrl)}
                            className="text-[#007AFF] hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <Eye className="w-3 h-3" />
                            <span>{isRtl ? 'عرض' : 'View'}</span>
                          </button>
                        ) : (
                          <span className="text-[#94A3B8]">-</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge variant={ord.status === 'APPROVED' ? 'success' : ord.status === 'REJECTED' ? 'error' : 'warning'}>
                          {ord.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-2.5 text-[#94A3B8] text-[10px]">
                        {new Date(ord.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal: Receipt Preview Modal */}
      {selectedReceiptPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedReceiptPreview(null)}>
          <div className="relative max-w-lg w-full bg-white dark:bg-[#10151E] border border-black/[.08] dark:border-white/10 rounded-2xl p-4 overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between pb-2 border-b border-black/[.06] dark:border-white/[.07] mb-3">
              <span className="text-xs font-bold text-[#111827] dark:text-white">
                {isRtl ? 'صورة إيصال التحويل' : 'Payment Receipt Preview'}
              </span>
              <button
                onClick={() => setSelectedReceiptPreview(null)}
                className="p-1 rounded-lg text-[#94A3B8] hover:text-[#111827] dark:hover:text-white"
              >
                <XCircle className="w-4 h-4" />
              </button>
            </div>
            <div className="max-h-[65vh] overflow-auto rounded-xl border border-black/[.06] dark:border-white/[.07]">
              <img
                src={selectedReceiptPreview}
                alt="Receipt Preview"
                className="max-w-full h-auto object-contain"
              />
            </div>
          </div>
        </div>
      )}

      {/* Modal: Direct Transfer Gateway */}
      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        lang={lang}
        preSelectedPlan={selectedPlanForPayment}
        onSuccess={() => fetchOverview(true)}
      />

      {/* Modal: Quick Top-Up Modal */}
      <TopUpModal
        isOpen={isTopUpModalOpen}
        onClose={() => setIsTopUpModalOpen(false)}
        lang={lang}
        onSelectPackage={handleTopUpSelected}
      />
    </div>
  );
}
