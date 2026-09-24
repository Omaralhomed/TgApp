'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Activity,
  Terminal as TerminalIcon,
  Trash2,
  Copy,
  Filter,
  CheckCircle2,
  AlertCircle,
  Info,
  Clock,
  Radio,
  Pause,
  Play,
  Shield,
  Download,
  Share2,
  RefreshCw,
} from 'lucide-react';
import { translations, Language } from '../../lib/translations';
import { DataTable, Column } from '../ui/DataTable';
import { Badge } from '../ui/Badge';
import { getAuditLogs } from '../../lib/api';
import { useToast } from '../ui/ToastContext';

export interface LogEntry {
  id?: string;
  timestamp: string;
  type: 'INFO' | 'SUCCESS' | 'WARN' | 'ERROR';
  message: string;
  meta?: any;
}

interface ActivityTabProps {
  logs: LogEntry[];
  onClearLogs: () => void;
  wsConnected: boolean;
  lang: Language;
}

export function ActivityTab({
  logs,
  onClearLogs,
  wsConnected,
  lang,
}: ActivityTabProps) {
  const isRtl = lang === 'ar';
  const [filterType, setFilterType] = useState<string>('ALL');
  const [isPaused, setIsPaused] = useState(false);
  const [activeView, setActiveView] = useState<'stream' | 'audit'>('stream');
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [isLoadingAudit, setIsLoadingAudit] = useState(false);
  const logEndRef = useRef<HTMLDivElement>(null);
  const toast = useToast();
  const t = translations[lang];

  useEffect(() => {
    if (!isPaused && activeView === 'stream') {
      logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, isPaused, activeView]);

  useEffect(() => {
    if (activeView === 'audit') {
      setIsLoadingAudit(true);
      getAuditLogs(50)
        .then((data) => setAuditLogs(data || []))
        .catch(() => {})
        .finally(() => setIsLoadingAudit(false));
    }
  }, [activeView]);

  const filteredLogs = logs.filter((log) => {
    if (filterType === 'ALL') return true;
    return log.type === filterType;
  });

  const handleCopyLogs = () => {
    const text = filteredLogs
      .map((l) => `[${l.timestamp}] [${l.type}] ${l.message}`)
      .join('\n');
    navigator.clipboard.writeText(text);
    toast.success(isRtl ? 'تم نسخ سجلات النشاط إلى الحافظة' : 'Console logs copied to clipboard!');
  };

  const handleDownloadLogs = () => {
    const text = filteredLogs
      .map((l) => `[${l.timestamp}] [${l.type}] ${l.message}`)
      .join('\n');
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `tgcloud-activity-${Date.now()}.log`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success(isRtl ? 'تم تحميل ملف السجلات بنجاح' : 'Log file downloaded!');
  };

  const auditColumns: Column<any>[] = [
    {
      key: 'action',
      header: isRtl ? 'الحدث / العملية' : 'Action / Event',
      sortable: true,
      render: (item) => (
        <span className="font-mono text-xs font-bold text-[#007AFF]">
          {item.action}
        </span>
      ),
    },
    {
      key: 'entity',
      header: isRtl ? 'الكيان المستهدف' : 'Target Entity',
      render: (item) => (
        <span className="text-xs text-[#111827] dark:text-white">
          {item.entity} {item.entityId ? `(#${item.entityId.substring(0, 8)})` : ''}
        </span>
      ),
    },
    {
      key: 'user',
      header: isRtl ? 'المنفّذ' : 'Operator',
      render: (item) => (
        <span className="text-xs text-[#64748B] dark:text-[#94A3B8]">
          {item.user ? item.user.email : (isRtl ? 'نظام السيرفر الآلي' : 'System Engine')}
        </span>
      ),
    },
    {
      key: 'ip',
      header: isRtl ? 'عنوان IP' : 'IP Address',
      render: (item) => (
        <span className="font-mono text-xs text-[#64748B] dark:text-[#94A3B8]">
          {item.ipAddress || 'Internal'}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: isRtl ? 'التوقيت' : 'Timestamp',
      sortable: true,
      render: (item) => (
        <span className="font-mono text-xs text-[#64748B] dark:text-[#94A3B8]">
          {new Date(item.createdAt).toLocaleString()}
        </span>
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
              {isRtl ? 'سجل النشاط الحي والمراقبة' : 'Live Activity & Telemetry'}
            </h2>
            <span className="flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-full bg-[#34C759]/10 text-[#34C759] font-bold">
              <span className={`w-1.5 h-1.5 rounded-full ${wsConnected ? 'bg-[#34C759] animate-pulse' : 'bg-rose-500'}`} />
              {wsConnected ? 'WebSocket Live' : 'Offline'}
            </span>
          </div>
          <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-0.5 font-mono">
            {filteredLogs.length} {isRtl ? 'أحداث مسجلة' : 'Stream Events Captured'}
          </p>
        </div>

        {/* Switcher & Actions */}
        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0 flex-wrap">
          <div className="flex items-center gap-1 p-0.5 bg-[#F6F8FB] dark:bg-[#171D28] rounded-lg border border-black/[.05] dark:border-white/[.05] text-xs">
            <button
              onClick={() => setActiveView('stream')}
              className={`px-2.5 py-1 font-bold rounded-md transition cursor-pointer flex items-center gap-1.5 ${
                activeView === 'stream'
                  ? 'bg-[#007AFF] text-white shadow-sm'
                  : 'text-[#64748B] dark:text-[#94A3B8] hover:text-[#111827] dark:hover:text-white'
              }`}
            >
              <TerminalIcon className="w-3.5 h-3.5" />
              <span>{isRtl ? 'الطرفية اللحظية' : 'Live Stream'}</span>
            </button>
            <button
              onClick={() => setActiveView('audit')}
              className={`px-2.5 py-1 font-bold rounded-md transition cursor-pointer flex items-center gap-1.5 ${
                activeView === 'audit'
                  ? 'bg-[#007AFF] text-white shadow-sm'
                  : 'text-[#64748B] dark:text-[#94A3B8] hover:text-[#111827] dark:hover:text-white'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>{isRtl ? 'سجل التدقيق (Audit)' : 'Audit Trail'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── 1. Live Terminal Stream View ────────────────────────── */}
      {activeView === 'stream' && (
        <div className="rounded-xl border border-black/[.06] dark:border-white/[.07] bg-white dark:bg-[#11151D] shadow-sm overflow-hidden flex flex-col h-[calc(100vh-13rem)]">
          {/* Console Toolbar */}
          <div className="px-4 py-2.5 border-b border-black/[.06] dark:border-white/[.07] bg-[#FAFAFC] dark:bg-[#0E121A] flex flex-wrap items-center justify-between gap-2.5 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-[#111827] dark:text-white">
                MTProto Live Telemetry
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              {/* Level Filter */}
              <div className="flex items-center gap-1 bg-[#F6F8FB] dark:bg-[#171D28] px-2 py-1 rounded-lg border border-black/[.06] dark:border-white/[.07]">
                <Filter className="w-3 h-3 text-[#94A3B8]" />
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="bg-transparent text-[#111827] dark:text-white text-xs font-bold focus:outline-none cursor-pointer"
                >
                  <option value="ALL" className="bg-white dark:bg-[#171D28]">{isRtl ? 'كافة المستويات' : 'All Levels'}</option>
                  <option value="INFO" className="bg-white dark:bg-[#171D28]">INFO</option>
                  <option value="SUCCESS" className="bg-white dark:bg-[#171D28]">SUCCESS</option>
                  <option value="WARN" className="bg-white dark:bg-[#171D28]">WARN</option>
                  <option value="ERROR" className="bg-white dark:bg-[#171D28]">ERROR</option>
                </select>
              </div>

              {/* Pause / Play */}
              <button
                onClick={() => setIsPaused(!isPaused)}
                className="p-1.5 rounded-lg border border-black/[.08] dark:border-white/10 hover:bg-black/[.04] dark:hover:bg-white/5 text-[#64748B] hover:text-[#111827] dark:hover:text-white transition cursor-pointer"
                title={isPaused ? 'Resume auto-scroll' : 'Pause auto-scroll'}
              >
                {isPaused ? <Play className="w-3.5 h-3.5 text-[#007AFF]" /> : <Pause className="w-3.5 h-3.5" />}
              </button>

              {/* Copy */}
              <button
                onClick={handleCopyLogs}
                className="p-1.5 rounded-lg border border-black/[.08] dark:border-white/10 hover:bg-black/[.04] dark:hover:bg-white/5 text-[#64748B] hover:text-[#111827] dark:hover:text-white transition cursor-pointer"
                title={isRtl ? 'نسخ السجل' : 'Copy'}
              >
                <Copy className="w-3.5 h-3.5" />
              </button>

              {/* Download */}
              <button
                onClick={handleDownloadLogs}
                className="p-1.5 rounded-lg border border-black/[.08] dark:border-white/10 hover:bg-black/[.04] dark:hover:bg-white/5 text-[#64748B] hover:text-[#111827] dark:hover:text-white transition cursor-pointer"
                title={isRtl ? 'تنزيل ملف السجل' : 'Download Log'}
              >
                <Download className="w-3.5 h-3.5" />
              </button>

              {/* Clear */}
              <button
                onClick={onClearLogs}
                className="p-1.5 rounded-lg border border-black/[.08] dark:border-white/10 hover:bg-rose-500/10 text-[#64748B] hover:text-rose-500 transition cursor-pointer"
                title={isRtl ? 'مسح السجلات' : 'Clear Logs'}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Terminal Logs Stream Body */}
          <div className="flex-1 p-3.5 overflow-y-auto font-mono text-xs space-y-1.5 bg-[#F6F8FB]/50 dark:bg-[#0A0D14] select-text">
            {filteredLogs.length === 0 ? (
              <div className="h-full flex items-center justify-center text-[#94A3B8] text-xs">
                {isRtl ? 'في انتظار ورود أحداث وتنبيهات السوكيت...' : 'Awaiting MTProto WebSocket telemetry events...'}
              </div>
            ) : (
              filteredLogs.map((log, idx) => {
                const badgeStyle =
                  log.type === 'SUCCESS'
                    ? 'text-[#34C759] bg-[#34C759]/10'
                    : log.type === 'WARN'
                    ? 'text-amber-500 bg-amber-500/10'
                    : log.type === 'ERROR'
                    ? 'text-rose-500 bg-rose-500/10'
                    : 'text-[#007AFF] bg-[#007AFF]/10';

                return (
                  <div key={idx} className="flex items-start gap-2 py-0.5 hover:bg-black/[.02] dark:hover:bg-white/[.02] rounded px-1">
                    <span className="text-[#94A3B8] shrink-0 text-[10px]">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                    <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase shrink-0 ${badgeStyle}`}>
                      {log.type}
                    </span>
                    <span className="text-[#111827] dark:text-slate-200 break-all flex-1 text-[11px] leading-relaxed">
                      {log.message}
                    </span>
                  </div>
                );
              })
            )}
            <div ref={logEndRef} />
          </div>
        </div>
      )}

      {/* ── 2. Audit Trail View ────────────────────────── */}
      {activeView === 'audit' && (
        <DataTable
          columns={auditColumns}
          data={auditLogs}
          keyExtractor={(item) => item.id}
          isLoading={isLoadingAudit}
          searchPlaceholder={isRtl ? 'بحث في سجلات العمليات...' : 'Search audit records...'}
          emptyTitle={isRtl ? 'لا توجد سجلات تدقيق بعد' : 'No audit records found'}
          emptySubtitle={isRtl ? 'يتم توثيق جميع تسجيلات الدخول والعمليات الإدارية هنا.' : 'User logins, campaign triggers, and administrative actions will be logged here.'}
        />
      )}
    </div>
  );
}
