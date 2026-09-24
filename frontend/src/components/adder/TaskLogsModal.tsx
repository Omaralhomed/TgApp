'use client';

import React, { useState, useEffect } from 'react';
import { CheckCircle2, AlertCircle, Clock, ShieldAlert, Users, X, RefreshCw } from 'lucide-react';
import { translations, Language } from '../../lib/translations';
import { Badge } from '../ui/Badge';
import { getAddTaskDetails } from '../../lib/api';

interface TaskLogsModalProps {
  taskId: string | null;
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
}

export function TaskLogsModal({
  taskId,
  isOpen,
  onClose,
  lang,
}: TaskLogsModalProps) {
  const isRtl = lang === 'ar';
  const [task, setTask] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const t = translations[lang];

  useEffect(() => {
    if (taskId && isOpen) {
      setIsLoading(true);
      getAddTaskDetails(taskId)
        .then((data) => setTask(data))
        .catch(() => {})
        .finally(() => setIsLoading(false));
    }
  }, [taskId, isOpen]);

  if (!isOpen || !taskId) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div
        dir={isRtl ? 'rtl' : 'ltr'}
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative w-full max-w-2xl rounded-2xl border border-black/[.08] dark:border-white/10 bg-white dark:bg-[#10151E] shadow-2xl overflow-hidden flex flex-col animate-[fadeInScale_0.2s_ease-out]">
          
          {/* Header */}
          <div className="px-5 py-3 border-b border-black/[.06] dark:border-white/[.07] bg-[#FAFAFC] dark:bg-[#0E121A] flex items-center justify-between shrink-0">
            <div className="min-w-0">
              <h2 className="text-xs font-bold text-[#111827] dark:text-white truncate">
                {task?.name || (isRtl ? 'سجل عمليات الإضافة' : 'Task Event Logs')}
              </h2>
              <p className="text-[10px] text-[#94A3B8] font-mono truncate">
                {isRtl ? 'الهدف:' : 'Target:'} {task?.targetGroup || taskId}
              </p>
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
              <div className="py-10 text-center text-xs text-[#94A3B8] flex flex-col items-center gap-1.5">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#007AFF]" />
                <span>{isRtl ? 'جاري تحميل السجلات والنتائج...' : 'Loading task activity logs...'}</span>
              </div>
            ) : task ? (
              <>
                {/* 4 Metrics Grid */}
                <div className="grid grid-cols-4 gap-2 text-center font-mono">
                  <div className="p-2.5 rounded-xl bg-[#F6F8FB] dark:bg-[#171D28] border border-black/[.04] dark:border-white/[.05]">
                    <span className="text-[10px] text-[#94A3B8] block">{isRtl ? 'تمت الإضافة' : 'Added'}</span>
                    <span className="text-sm font-bold text-[#34C759] mt-0.5 block">{task.addedCount}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#F6F8FB] dark:bg-[#171D28] border border-black/[.04] dark:border-white/[.05]">
                    <span className="text-[10px] text-[#94A3B8] block">{isRtl ? 'خصوصية' : 'Privacy'}</span>
                    <span className="text-sm font-bold text-amber-500 mt-0.5 block">{task.privacyRestrictedCount || 0}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#F6F8FB] dark:bg-[#171D28] border border-black/[.04] dark:border-white/[.05]">
                    <span className="text-[10px] text-[#94A3B8] block">{isRtl ? 'عضو مسبقاً' : 'Existing'}</span>
                    <span className="text-sm font-bold text-[#007AFF] mt-0.5 block">{task.alreadyMemberCount || 0}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#F6F8FB] dark:bg-[#171D28] border border-black/[.04] dark:border-white/[.05]">
                    <span className="text-[10px] text-[#94A3B8] block">{isRtl ? 'فشل' : 'Failed'}</span>
                    <span className="text-sm font-bold text-rose-500 mt-0.5 block">{task.failedCount}</span>
                  </div>
                </div>

                {/* Event Logs Stream */}
                <div className="space-y-1.5 pt-1">
                  <span className="text-[11px] font-bold text-[#94A3B8] block">{isRtl ? 'سجل العمليات اللحظي' : 'Live Execution Logs'}</span>
                  <div className="space-y-1 max-h-64 overflow-y-auto font-mono text-[11px]">
                    {task.logs && task.logs.length > 0 ? (
                      task.logs.map((log: any) => (
                        <div
                          key={log.id}
                          className="p-2 rounded-lg bg-[#F6F8FB] dark:bg-[#171D28] border border-black/[.03] dark:border-white/[.04] flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            {log.status === 'SUCCESS' ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-[#34C759] shrink-0" />
                            ) : log.status === 'PRIVACY_RESTRICTED' ? (
                              <ShieldAlert className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                            ) : (
                              <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                            )}
                            <span className="font-bold text-[#111827] dark:text-white truncate">
                              {log.targetUsername ? `@${log.targetUsername}` : log.targetUserId}
                            </span>
                            {log.account && (
                              <span className="text-[10px] text-[#94A3B8]">
                                (via {log.account.phone})
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[10px] text-[#94A3B8]">
                              {new Date(log.addedAt).toLocaleTimeString()}
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="py-8 text-center text-xs text-[#94A3B8]">
                        {isRtl ? 'لا توجد سجلات بعد' : 'No logs recorded yet.'}
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </>
  );
}
