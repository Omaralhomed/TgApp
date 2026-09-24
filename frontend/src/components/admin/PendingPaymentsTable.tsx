'use client';

import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  XCircle,
  Eye,
  RefreshCw,
  Search,
  Filter,
  DollarSign,
  Calendar,
  CreditCard,
  X,
  Check,
} from 'lucide-react';
import { Language } from '../../lib/translations';
import { getAdminPayments, approveAdminPayment, rejectAdminPayment } from '../../lib/api';
import { useToast } from '../ui/ToastContext';
import { Badge } from '../ui/Badge';

interface PendingPaymentsTableProps {
  lang: Language;
  onPaymentUpdated?: () => void;
}

export function PendingPaymentsTable({ lang, onPaymentUpdated }: PendingPaymentsTableProps) {
  const isRtl = lang === 'ar';
  const toast = useToast();

  const [receipts, setReceipts] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('PENDING');
  const [isLoading, setIsLoading] = useState(true);

  // Selected receipt image modal
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Reject modal state
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    loadReceipts();
  }, [statusFilter]);

  const loadReceipts = async () => {
    setIsLoading(true);
    try {
      const data = await getAdminPayments(statusFilter);
      setReceipts(data || []);
    } catch (err: any) {
      toast.error('Failed to load receipts', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (id: string, userEmail: string, plan: string) => {
    if (!confirm(isRtl ? `تأكيد اعتماد الدفع وترقية حساب ${userEmail} إلى ${plan}؟` : `Approve payment and upgrade ${userEmail} to ${plan}?`)) return;

    setIsProcessing(true);
    try {
      await approveAdminPayment(id);
      toast.success(
        isRtl ? 'تم اعتماد الدفع وتفعيل الباقة بنجاح!' : 'Payment Approved & Plan Upgraded!',
        userEmail,
      );
      loadReceipts();
      if (onPaymentUpdated) onPaymentUpdated();
    } catch (err: any) {
      toast.error('Approval failed', err.response?.data?.message || err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectId) return;

    setIsProcessing(true);
    try {
      await rejectAdminPayment(rejectId, rejectReason.trim() || undefined);
      toast.info(isRtl ? 'تم رفض الإيصال وتنبيه العميل' : 'Receipt rejected and client notified');
      setRejectId(null);
      setRejectReason('');
      loadReceipts();
      if (onPaymentUpdated) onPaymentUpdated();
    } catch (err: any) {
      toast.error('Rejection failed', err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-3 text-start">
      {/* Top Filter and Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-1.5 flex-wrap">
          {['PENDING', 'APPROVED', 'REJECTED', 'ALL'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`h-7 px-2.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                statusFilter === s
                  ? 'bg-[#007AFF] text-white shadow-xs'
                  : 'border border-black/[.08] dark:border-white/10 hover:bg-black/[.04] dark:hover:bg-white/5 text-[#64748B] dark:text-[#94A3B8]'
              }`}
            >
              {s === 'PENDING'
                ? isRtl ? '⏳ بانتظار الاعتماد' : 'Pending'
                : s === 'APPROVED'
                ? isRtl ? '✅ معتمدة' : 'Approved'
                : s === 'REJECTED'
                ? isRtl ? '❌ مرفوضة' : 'Rejected'
                : isRtl ? 'الكل' : 'All'}
            </button>
          ))}
        </div>

        <button
          onClick={loadReceipts}
          className="p-1.5 rounded-lg border border-black/[.08] dark:border-white/10 hover:bg-black/[.04] dark:hover:bg-white/5 text-[#64748B] dark:text-[#94A3B8] transition cursor-pointer self-start sm:self-auto"
          title="Refresh"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-[#007AFF]' : ''}`} />
        </button>
      </div>

      {/* Receipts Table */}
      <div className="rounded-xl border border-black/[.06] dark:border-white/[.07] bg-white dark:bg-[#11151D] overflow-hidden shadow-xs">
        {isLoading ? (
          <div className="p-8 text-center text-xs text-[#94A3B8] flex items-center justify-center gap-2">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#007AFF]" />
            <span>{isRtl ? 'جاري تحميل الإيصالات...' : 'Loading receipts...'}</span>
          </div>
        ) : receipts.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#94A3B8]">
            {isRtl ? 'لا توجد طلبات دفع في هذه الحالة حالياً.' : 'No payment requests found for this filter.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-start font-mono">
              <thead className="bg-[#FAFAFC] dark:bg-[#0E121A] text-[#64748B] dark:text-[#94A3B8] font-bold border-b border-black/[.06] dark:border-white/[.07]">
                <tr>
                  <th className="py-2 px-3.5 text-start">{isRtl ? 'العميل' : 'Tenant'}</th>
                  <th className="py-2 px-3.5 text-start">{isRtl ? 'الباقة' : 'Plan'}</th>
                  <th className="py-2 px-3.5 text-start">{isRtl ? 'المبلغ' : 'Amount'}</th>
                  <th className="py-2 px-3.5 text-start">{isRtl ? 'الوسيلة' : 'Gateway'}</th>
                  <th className="py-2 px-3.5 text-start">{isRtl ? 'رقم الحوالة' : 'Reference'}</th>
                  <th className="py-2 px-3.5 text-start">{isRtl ? 'الإيصال' : 'Receipt'}</th>
                  <th className="py-2 px-3.5 text-start">{isRtl ? 'الحالة' : 'Status'}</th>
                  <th className="py-2 px-3.5 text-end">{isRtl ? 'الإجراء' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[.03] dark:divide-white/[.03] text-[#111827] dark:text-white">
                {receipts.map((r) => (
                  <tr key={r.id} className="hover:bg-black/[.02] dark:hover:bg-white/[.02] transition">
                    <td className="py-2 px-3.5">
                      <div className="font-bold text-xs">{r.user?.name || 'User'}</div>
                      <div className="text-[10px] text-[#94A3B8]">{r.user?.email}</div>
                    </td>
                    <td className="py-2 px-3.5">
                      <span className="font-bold text-[11px] px-1.5 py-0.5 rounded bg-[#007AFF]/10 text-[#007AFF]">
                        {r.planRequested} ({r.durationMonths || 1}{isRtl ? 'ش' : 'm'})
                      </span>
                    </td>
                    <td className="py-2 px-3.5 font-bold text-[#007AFF]">
                      ${r.amountPaid} {r.currency || 'USD'}
                    </td>
                    <td className="py-2 px-3.5 text-[#64748B] dark:text-[#94A3B8] text-[11px]">
                      {r.paymentMethod}
                    </td>
                    <td className="py-2 px-3.5 text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                      {r.transactionReference || '-'}
                    </td>
                    <td className="py-2 px-3.5">
                      {r.receiptImageUrl ? (
                        <button
                          onClick={() => setPreviewImage(r.receiptImageUrl)}
                          className="flex items-center gap-1 text-[11px] text-[#007AFF] hover:underline font-bold cursor-pointer"
                        >
                          <Eye className="w-3 h-3" />
                          <span>{isRtl ? 'معاينة' : 'View'}</span>
                        </button>
                      ) : (
                        <span className="text-[#94A3B8]">-</span>
                      )}
                    </td>
                    <td className="py-2 px-3.5">
                      <Badge variant={r.status === 'APPROVED' ? 'success' : r.status === 'REJECTED' ? 'error' : 'warning'}>
                        {r.status}
                      </Badge>
                    </td>
                    <td className="py-2 px-3.5 text-end">
                      {r.status === 'PENDING' ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleApprove(r.id, r.user?.email, r.planRequested)}
                            disabled={isProcessing}
                            className="h-6 px-2 rounded-md bg-[#34C759] hover:bg-[#2EB04F] text-white font-bold text-[10px] transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
                          >
                            <Check className="w-2.5 h-2.5" />
                            <span>{isRtl ? 'موافقة' : 'Approve'}</span>
                          </button>
                          <button
                            onClick={() => {
                              setRejectId(r.id);
                              setRejectReason('');
                            }}
                            disabled={isProcessing}
                            className="h-6 px-2 rounded-md bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/20 font-bold text-[10px] transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
                          >
                            <X className="w-2.5 h-2.5" />
                            <span>{isRtl ? 'رفض' : 'Reject'}</span>
                          </button>
                        </div>
                      ) : (
                        <span className="text-[10px] text-[#94A3B8]">
                          {r.reviewedAt ? new Date(r.reviewedAt).toLocaleDateString() : '-'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Image Preview Modal */}
      {previewImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs" onClick={() => setPreviewImage(null)}>
          <div className="relative max-w-lg w-full bg-white dark:bg-[#11151D] border border-black/[.08] dark:border-white/10 rounded-2xl p-3 overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between pb-2 border-b border-black/[.06] dark:border-white/[.07] mb-2">
              <span className="text-xs font-bold text-[#111827] dark:text-white">
                {isRtl ? 'معاينة إيصال الدفع' : 'Payment Receipt Preview'}
              </span>
              <button
                onClick={() => setPreviewImage(null)}
                className="p-1 rounded-lg text-[#94A3B8] hover:text-[#111827] dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="max-h-[70vh] overflow-auto rounded-xl border border-black/[.06] dark:border-white/[.07]">
              <img
                src={previewImage}
                alt="Payment Receipt"
                className="max-w-full h-auto object-contain"
              />
            </div>
          </div>
        </div>
      )}

      {/* Rejection Reason Modal */}
      {rejectId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-[#11151D] border border-black/[.08] dark:border-white/10 p-4 shadow-2xl text-start">
            <h4 className="text-sm font-bold text-[#111827] dark:text-white mb-1">
              {isRtl ? 'رفض إيصال الدفع' : 'Reject Payment Receipt'}
            </h4>
            <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mb-3">
              {isRtl
                ? 'يرجى كتابة سبب الرفض لتوضيحه للعميل في الإشعار:'
                : 'Provide a reason to notify the client:'}
            </p>

            <textarea
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder={isRtl ? 'اكتب سبب الرفض هنا...' : 'Reason for rejection...'}
              className="w-full p-2.5 rounded-xl bg-[#F6F8FB] dark:bg-[#171D28] border border-black/[.08] dark:border-white/10 text-xs text-[#111827] dark:text-white focus:border-rose-500 outline-none mb-3 resize-none"
            />

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRejectId(null)}
                className="h-8 px-3 rounded-lg border border-black/[.08] dark:border-white/10 text-xs text-[#64748B] dark:text-[#94A3B8] font-bold"
              >
                {isRtl ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                disabled={isProcessing}
                className="h-8 px-3.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition disabled:opacity-50"
              >
                {isRtl ? 'تأكيد الرفض' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
