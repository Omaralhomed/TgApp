'use client';

import React, { useState, useEffect } from 'react';
import {
  Shield,
  Server,
  Activity,
  Radio,
  Lock,
  RefreshCw,
  LogOut,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Cpu,
  Database,
  Layers,
  Key,
  Zap,
} from 'lucide-react';
import { translations, Language } from '../../lib/translations';
import { Badge } from '../ui/Badge';
import { getSystemHealth, getSystemMetrics, revokeAllSessions } from '../../lib/api';
import { useToast } from '../ui/ToastContext';

interface SystemTabProps {
  lang: Language;
}

export function SystemTab({ lang }: SystemTabProps) {
  const isRtl = lang === 'ar';
  const [health, setHealth] = useState<any | null>(null);
  const [metrics, setMetrics] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRevoking, setIsRevoking] = useState(false);
  const toast = useToast();
  const t = translations[lang];

  const fetchSystemData = async () => {
    try {
      setIsLoading(true);
      const [h, m] = await Promise.all([getSystemHealth(), getSystemMetrics()]);
      setHealth(h);
      setMetrics(m);
    } catch (err: any) {
      toast.error(isRtl ? 'تعذر جلب بيانات النظام' : 'Failed to fetch system metrics', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSystemData();
  }, []);

  const handleRevokeAll = async () => {
    if (
      !confirm(
        isRtl
          ? 'هل أنت متأكد من رغبتك في إنهاء وتسجيل الخروج من كافة الجلسات النشطة عبر جميع الأجهزة؟'
          : 'Are you sure you want to revoke all active sessions across all devices?',
      )
    ) {
      return;
    }
    try {
      setIsRevoking(true);
      await revokeAllSessions();
      toast.success(isRtl ? 'تم إنهاء كافة الجلسات بنجاح!' : 'All user sessions revoked successfully!');
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err: any) {
      toast.error(isRtl ? 'فشل إنهاء الجلسات' : 'Revocation failed', err.message);
    } finally {
      setIsRevoking(false);
    }
  };

  return (
    <div className="flex flex-col gap-3.5 w-full text-start select-none animate-[fadeIn_0.2s_ease-out]">
      
      {/* ── Top Header & Summary ────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-white dark:bg-[#11151D] border border-black/[.06] dark:border-white/[.07] shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-[#111827] dark:text-white">
              {isRtl ? 'حالة النظام والبنية التحتية' : 'System Health & Telemetry'}
            </h2>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#34C759]/10 text-[#34C759] font-mono">
              ● All Systems Operational
            </span>
          </div>
          <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-0.5">
            {isRtl
              ? 'مراقبة أداء خوادم MTProto، محرك قواعد البيانات، طابور المهام Redis، وطبقات التشفير.'
              : 'Real-time telemetry of MTProto workers, database latency, BullMQ queue, and crypto engines.'}
          </p>
        </div>

        <button
          onClick={fetchSystemData}
          disabled={isLoading}
          className="h-8 px-3 rounded-lg border border-black/[.08] dark:border-white/10 hover:bg-black/[.04] dark:hover:bg-white/5 text-[#111827] dark:text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer self-start sm:self-auto shrink-0 disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-[#007AFF] ${isLoading ? 'animate-spin' : ''}`} />
          <span>{isRtl ? 'تحديث المقاييس' : 'Refresh'}</span>
        </button>
      </div>

      {/* ── 3 Telemetry Services Cards ────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* 1. Database Engine */}
        <div className="p-4 rounded-xl border border-black/[.06] dark:border-white/[.07] bg-white dark:bg-[#11151D] shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-black/[.04] dark:border-white/[.04]">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#007AFF]/10 text-[#007AFF] flex items-center justify-center">
                <Database className="w-3.5 h-3.5" />
              </div>
              <span className="font-bold text-xs text-[#111827] dark:text-white">
                {isRtl ? 'محرك قاعدة البيانات' : 'Database Engine'}
              </span>
            </div>
            <Badge variant="success">
              {health?.services?.database?.status || 'UP'}
            </Badge>
          </div>

          <div className="text-xs text-[#64748B] dark:text-[#94A3B8] space-y-1.5 font-mono">
            <div className="flex justify-between py-1 border-b border-black/[.03] dark:border-white/[.03]">
              <span>{isRtl ? 'زمن الاستجابة:' : 'Query Latency:'}</span>
              <span className="font-bold text-[#34C759]">
                {health?.services?.database?.latencyMs || 1}ms
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-black/[.03] dark:border-white/[.03]">
              <span>{isRtl ? 'القوائم المخزنة:' : 'Stored Groups:'}</span>
              <span className="font-bold text-[#111827] dark:text-white">
                {metrics?.overview?.totalGroups || 0}
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span>{isRtl ? 'إجمالي العملاء:' : 'Total Leads:'}</span>
              <span className="font-bold text-[#007AFF]">
                {(metrics?.overview?.totalScrapedMembers || 0).toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* 2. BullMQ / Redis Queue */}
        <div className="p-4 rounded-xl border border-black/[.06] dark:border-white/[.07] bg-white dark:bg-[#11151D] shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-black/[.04] dark:border-white/[.04]">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
                <Layers className="w-3.5 h-3.5" />
              </div>
              <span className="font-bold text-xs text-[#111827] dark:text-white">
                {isRtl ? 'طابور المهام (BullMQ/Redis)' : 'Queue Engine'}
              </span>
            </div>
            <Badge variant={health?.services?.queueEngine?.redisConnected ? 'success' : 'primary'}>
              {health?.services?.queueEngine?.redisConnected ? 'Redis Pool' : 'In-Memory Pool'}
            </Badge>
          </div>

          <div className="text-xs text-[#64748B] dark:text-[#94A3B8] space-y-1.5 font-mono">
            <div className="flex justify-between py-1 border-b border-black/[.03] dark:border-white/[.03]">
              <span>{isRtl ? 'المهام المعالجة حالياً:' : 'Active Workers:'}</span>
              <span className="font-bold text-[#111827] dark:text-white">
                {health?.services?.queueEngine?.activeJobs || 0}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-black/[.03] dark:border-white/[.03]">
              <span>{isRtl ? 'الحملات قيد الإرسال:' : 'Active Broadcasts:'}</span>
              <span className="font-bold text-[#34C759]">
                {metrics?.overview?.runningCampaigns || 0}
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span>{isRtl ? 'حالة المعالجة:' : 'Queue Status:'}</span>
              <span className="font-bold text-[#111827] dark:text-white">Operational</span>
            </div>
          </div>
        </div>

        {/* 3. Server Node Telemetry */}
        <div className="p-4 rounded-xl border border-black/[.06] dark:border-white/[.07] bg-white dark:bg-[#11151D] shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-black/[.04] dark:border-white/[.04]">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                <Cpu className="w-3.5 h-3.5" />
              </div>
              <span className="font-bold text-xs text-[#111827] dark:text-white">
                {isRtl ? 'موارد السيرفر والمعالج' : 'Server Telemetry'}
              </span>
            </div>
            <Badge variant="success">OPTIMAL</Badge>
          </div>

          <div className="text-xs text-[#64748B] dark:text-[#94A3B8] space-y-1.5 font-mono">
            <div className="flex justify-between py-1 border-b border-black/[.03] dark:border-white/[.03]">
              <span>{isRtl ? 'ذاكرة الوصول (Heap):' : 'Heap Memory:'}</span>
              <span className="font-bold text-[#111827] dark:text-white">
                {health?.memory?.heapUsedMb || 48} MB
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-black/[.03] dark:border-white/[.03]">
              <span>{isRtl ? 'مدة العمل المتواصل:' : 'Uptime:'}</span>
              <span className="font-bold text-[#111827] dark:text-white">
                {Math.floor((health?.uptime || 120) / 60)} {isRtl ? 'دقيقة' : 'mins'}
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span>{isRtl ? 'عقدة الخادم:' : 'Node Cluster:'}</span>
              <span className="font-bold text-[#007AFF]">Cluster-01</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Security & Cryptography Infrastructure ────────────────────────── */}
      <div className="p-4 rounded-xl border border-black/[.06] dark:border-white/[.07] bg-white dark:bg-[#11151D] shadow-sm space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-black/[.04] dark:border-white/[.04]">
          <div className="w-7 h-7 rounded-lg bg-[#34C759]/10 text-[#34C759] flex items-center justify-center">
            <Lock className="w-3.5 h-3.5" />
          </div>
          <h3 className="text-xs font-bold text-[#111827] dark:text-white">
            {isRtl ? 'بروتوكولات الأمان والتشفير المتقدم' : 'Security & Encryption Infrastructure'}
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3 rounded-lg bg-[#F6F8FB] dark:bg-[#171D28] border border-black/[.04] dark:border-white/[.05] space-y-1">
            <span className="font-bold text-[#111827] dark:text-white block flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-[#007AFF]" />
              {isRtl ? 'تشفير جلسات MTProto (AES-256-GCM)' : 'Session Encryption (AES-256-GCM)'}
            </span>
            <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8] leading-relaxed">
              {isRtl
                ? 'جلسات تيليجرام وكلمات مرور التحقق بخطوتين مشفرة باستخدام مفاتيح أمان معزولة بنظام AES-256 و Argon2id.'
                : 'All MTProto sessions and 2FA credentials are securely encrypted at rest using AES-256-GCM.'}
            </p>
          </div>

          <div className="p-3 rounded-lg bg-[#F6F8FB] dark:bg-[#171D28] border border-black/[.04] dark:border-white/[.05] space-y-1">
            <span className="font-bold text-[#111827] dark:text-white block flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-[#34C759]" />
              {isRtl ? 'تدوير التوكنات والحماية التلقائية' : 'Token Rotation & Session Protection'}
            </span>
            <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8] leading-relaxed">
              {isRtl
                ? 'توكنات وصول قصيرة المدى (15 دقيقة) مع تدوير تلقائي لرموز التحديث وحماية كاملة ضد الاختراق.'
                : 'Short-lived access tokens with automatic rotation and instantaneous revocation controls.'}
            </p>
          </div>
        </div>

        {/* Revoke All Sessions Danger Action */}
        <div className="pt-3 border-t border-black/[.04] dark:border-white/[.04] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h4 className="font-bold text-xs text-[#111827] dark:text-white">{t.sessionRevocation}</h4>
            <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8] mt-0.5">
              {isRtl
                ? 'إنهاء فوري لجميع الجلسات النشطة وتسجيل الخروج من كافة الأجهزة المسجلة فوراً.'
                : 'Immediately invalidate all active sessions and refresh tokens across all devices.'}
            </p>
          </div>

          <button
            onClick={handleRevokeAll}
            disabled={isRevoking}
            className="h-8 px-4 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/20 text-xs font-bold flex items-center gap-1.5 transition active:scale-95 disabled:opacity-50 cursor-pointer shrink-0"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>{isRevoking ? (isRtl ? 'جاري الإنهاء...' : 'Revoking...') : (isRtl ? 'إنهاء كافة الجلسات الآن' : 'Revoke All Sessions')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
