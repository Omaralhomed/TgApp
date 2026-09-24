'use client';

import React, { useState, useEffect } from 'react';
import {
  Send,
  CheckCircle2,
  AlertCircle,
  Clock,
  RotateCcw,
  Activity,
  User,
  Shield,
  X,
} from 'lucide-react';
import { translations, Language } from '../../lib/translations';
import { Badge } from '../ui/Badge';
import { getCampaignDetails } from '../../lib/api';

interface CampaignDetailsModalProps {
  campaignId: string | null;
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
}

export function CampaignDetailsModal({
  campaignId,
  isOpen,
  onClose,
  lang,
}: CampaignDetailsModalProps) {
  const isRtl = lang === 'ar';
  const [details, setDetails] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const t = translations[lang];

  useEffect(() => {
    if (campaignId && isOpen) {
      setIsLoading(true);
      getCampaignDetails(campaignId)
        .then((data) => setDetails(data))
        .catch(() => {})
        .finally(() => setIsLoading(false));
    }
  }, [campaignId, isOpen]);

  if (!isOpen || !campaignId) return null;

  const total = details?.totalTargets || 1;
  const progress = details ? Math.min(100, Math.round(((details.sentCount + (details.failedCount || 0)) / total) * 100)) : 0;

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div
        dir={isRtl ? 'rtl' : 'ltr'}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative w-full max-w-lg rounded-2xl border border-black/[.08] dark:border-white/10 bg-white dark:bg-[#10151E] shadow-2xl overflow-hidden animate-[fadeInScale_0.2s_ease-out]">
          
          {/* Header */}
          <div className="px-5 pt-4 pb-3 flex items-center justify-between border-b border-black/[.05] dark:border-white/[.05]">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-[#007AFF] flex items-center justify-center text-white shrink-0">
                <Send className="w-3.5 h-3.5 rtl:rotate-180" />
              </div>
              <div className="min-w-0">
                <h2 className="text-sm font-bold text-[#111827] dark:text-white truncate">
                  {details?.name || (isRtl ? 'تفاصيل الحملة' : 'Campaign Diagnostics')}
                </h2>
                <p className="text-[10px] text-[#94A3B8] font-mono truncate">ID: {campaignId}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-[#94A3B8] hover:text-[#111827] dark:hover:text-white transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="p-5 space-y-3.5 text-xs text-[#111827] dark:text-white">
            {isLoading ? (
              <div className="py-8 text-center text-xs text-[#94A3B8]">{isRtl ? 'جاري تحميل بيانات وسجلات الحملة...' : 'Loading campaign diagnostics...'}</div>
            ) : details ? (
              <>
                {/* 4 Stats Grid */}
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div className="p-2.5 rounded-xl bg-[#F6F8FB] dark:bg-[#171D28] border border-black/[.04] dark:border-white/[.05]">
                    <span className="text-[10px] text-[#94A3B8] block">{isRtl ? 'الحالة' : 'Status'}</span>
                    <span className="mt-1 block">
                      <Badge variant={details.status === 'RUNNING' ? 'primary' : details.status === 'COMPLETED' ? 'success' : details.status === 'PAUSED' ? 'warning' : 'neutral'}>
                        {details.status}
                      </Badge>
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#F6F8FB] dark:bg-[#171D28] border border-black/[.04] dark:border-white/[.05]">
                    <span className="text-[10px] text-[#94A3B8] block">{isRtl ? 'تم الإرسال' : 'Sent'}</span>
                    <span className="text-sm font-bold font-mono text-[#34C759] mt-1 block">{details.sentCount}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#F6F8FB] dark:bg-[#171D28] border border-black/[.04] dark:border-white/[.05]">
                    <span className="text-[10px] text-[#94A3B8] block">{isRtl ? 'فشل' : 'Failed'}</span>
                    <span className="text-sm font-bold font-mono text-rose-500 mt-1 block">{details.failedCount}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#F6F8FB] dark:bg-[#171D28] border border-black/[.04] dark:border-white/[.05]">
                    <span className="text-[10px] text-[#94A3B8] block">{isRtl ? 'الإنجاز' : 'Progress'}</span>
                    <span className="text-sm font-bold font-mono text-[#007AFF] mt-1 block">{progress}%</span>
                  </div>
                </div>

                {/* Message Template */}
                <div className="p-3 rounded-xl bg-[#F6F8FB] dark:bg-[#171D28] border border-black/[.04] dark:border-white/[.05] space-y-1">
                  <span className="text-[10px] font-bold text-[#94A3B8] block">{isRtl ? 'قالب الرسالة المعتمد:' : 'Message Template:'}</span>
                  <p className="font-mono text-xs text-[#111827] dark:text-white break-words p-2 rounded-lg bg-white dark:bg-[#11151D] border border-black/[.04] dark:border-white/[.05]">
                    {details.messageTemplate}
                  </p>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] text-[#94A3B8] font-mono">
                    <span>{isRtl ? 'التقدم الإجمالي' : 'Total Progress'}</span>
                    <span>{details.sentCount} / {details.totalTargets}</span>
                  </div>
                  <div className="h-2 rounded-full bg-black/[.06] dark:bg-white/[.08] overflow-hidden">
                    <div className="h-full bg-[#007AFF] rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
                  </div>
                </div>

                {/* Recent Events / Runs */}
                {details.runs && details.runs.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[11px] font-bold text-[#94A3B8] block">{isRtl ? 'سجلات الإرسال الحديثة' : 'Execution Log'}</span>
                    <div className="space-y-1 max-h-32 overflow-y-auto font-mono text-[11px]">
                      {details.runs.map((run: any) => (
                        <div key={run.id} className="p-2 rounded-lg bg-[#F6F8FB] dark:bg-[#171D28] border border-black/[.03] dark:border-white/[.04] flex items-center justify-between">
                          <span className="text-[#94A3B8]">{new Date(run.createdAt).toLocaleTimeString()}</span>
                          <span className="text-[#34C759] font-bold">✓ {run.successCount} {isRtl ? 'رسالة ناجحة' : 'sent'}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="py-6 text-center text-xs text-[#94A3B8]">{isRtl ? 'لا توجد بيانات' : 'No data'}</div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
