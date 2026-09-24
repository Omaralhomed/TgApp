'use client';

import React, { useState, useEffect } from 'react';
import {
  Copy,
  Radio,
  Plus,
  Trash2,
  Play,
  Square,
  Sparkles,
  RefreshCw,
  Layers,
  ArrowRight,
  Send,
  Zap,
  CheckCircle2,
  AlertCircle,
  Smartphone,
  ExternalLink,
} from 'lucide-react';
import { translations, Language } from '../../lib/translations';
import {
  cloneChannelHistory,
  startChannelMirror,
  stopChannelMirror,
  getActiveMirrors,
  ChannelReplacementRule,
} from '../../lib/api';
import { useSocket } from '../../hooks/useSocket';
import { useToast } from '../ui/ToastContext';
import { Badge } from '../ui/Badge';

interface TelegramAccountOption {
  id: string;
  phone: string;
  firstName?: string | null;
  status: string;
}

interface ChannelClonerTabProps {
  accounts: TelegramAccountOption[];
  lang: Language;
}

export function ChannelClonerTab({ accounts, lang }: ChannelClonerTabProps) {
  const isRtl = lang === 'ar';
  const t = translations[lang];
  const toast = useToast();

  const activeAccounts = accounts.filter((a) => a.status === 'ACTIVE');
  const [activeMode, setActiveMode] = useState<'HISTORY' | 'MIRROR'>('HISTORY');

  const [sourceChannel, setSourceChannel] = useState('');
  const [targetChannel, setTargetChannel] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState(activeAccounts[0]?.id || '');
  const [limit, setLimit] = useState(25);
  const [watermark, setWatermark] = useState('');
  const [replacements, setReplacements] = useState<ChannelReplacementRule[]>([
    { from: '', to: '' },
  ]);

  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number; percentage: number } | null>(null);
  const [activeMirrorsList, setActiveMirrorsList] = useState<any[]>([]);

  const { socket } = useSocket();

  useEffect(() => {
    loadActiveMirrors();
  }, []);

  useEffect(() => {
    if (activeAccounts.length > 0 && !selectedAccountId) {
      setSelectedAccountId(activeAccounts[0].id);
    }
  }, [activeAccounts, selectedAccountId]);

  // WebSocket listeners
  useEffect(() => {
    if (!socket) return;

    const handleProgress = (data: { current: number; total: number; percentage: number }) => {
      setProgress(data);
    };

    const handleNewMirroredPost = (data: any) => {
      setActiveMirrorsList((prev) =>
        prev.map((m) => (m.id === data.mirrorId ? { ...m, mirroredCount: data.mirroredCount } : m)),
      );
    };

    socket.on('cloner:progress', handleProgress);
    socket.on('cloner:new_mirrored_post', handleNewMirroredPost);

    return () => {
      socket.off('cloner:progress', handleProgress);
      socket.off('cloner:new_mirrored_post', handleNewMirroredPost);
    };
  }, [socket]);

  const loadActiveMirrors = async () => {
    try {
      const data = await getActiveMirrors();
      setActiveMirrorsList(data || []);
    } catch {}
  };

  const handleAddReplacement = () => {
    setReplacements([...replacements, { from: '', to: '' }]);
  };

  const handleRemoveReplacement = (index: number) => {
    setReplacements(replacements.filter((_, i) => i !== index));
  };

  const handleReplacementChange = (index: number, field: 'from' | 'to', value: string) => {
    const updated = [...replacements];
    updated[index][field] = value;
    setReplacements(updated);
  };

  const handleStartCloneHistory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourceChannel.trim() || !targetChannel.trim()) {
      toast.error(isRtl ? 'يرجى إدخال القناة المصدر والقناة الهدف' : 'Source and target channels are required');
      return;
    }

    setIsLoading(true);
    setProgress({ current: 0, total: limit, percentage: 0 });

    const validReplacements = replacements.filter((r) => r.from.trim().length > 0);

    try {
      toast.info(isRtl ? 'جاري بدء استنساخ منشورات القناة...' : 'Starting history cloning...');
      const res = await cloneChannelHistory({
        sourceChannel: sourceChannel.trim(),
        targetChannel: targetChannel.trim(),
        limit,
        replacements: validReplacements,
        accountId: selectedAccountId || undefined,
        watermark: watermark.trim() || undefined,
      });

      toast.success(
        isRtl ? 'تم الاستنساخ بنجاح!' : 'Clone Completed!',
        isRtl ? `تم استنساخ ${res.clonedCount} منشور بنجاح إلى ${res.target}!` : `Cloned ${res.clonedCount} posts to ${res.target}`
      );
    } catch (err: any) {
      toast.error(isRtl ? 'فشل الاستنساخ' : 'Cloning Failed', err.response?.data?.message || err.message);
    } finally {
      setIsLoading(false);
      setProgress(null);
    }
  };

  const handleStartMirror = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourceChannel.trim() || !targetChannel.trim()) {
      toast.error(isRtl ? 'يرجى إدخال القناة المصدر والقناة الهدف' : 'Source and target channels are required');
      return;
    }

    setIsLoading(true);
    const validReplacements = replacements.filter((r) => r.from.trim().length > 0);

    try {
      await startChannelMirror({
        sourceChannel: sourceChannel.trim(),
        targetChannel: targetChannel.trim(),
        replacements: validReplacements,
        accountId: selectedAccountId || undefined,
        watermark: watermark.trim() || undefined,
      });

      toast.success(
        isRtl ? 'تم تشغيل المرآة اللحظية بنجاح!' : 'Live Mirroring Activated!',
        isRtl ? 'سيتم نسخ وتعديل كل منشور جديد فور نشره.' : 'New posts will be mirrored in real-time.'
      );
      loadActiveMirrors();
    } catch (err: any) {
      toast.error(isRtl ? 'فشل تشغيل المرآة' : 'Mirror Failed', err.response?.data?.message || err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStopMirror = async (mirrorId: string) => {
    try {
      await stopChannelMirror(mirrorId);
      loadActiveMirrors();
      toast.info(isRtl ? 'تم إيقاف خدمة المرآة اللحظية' : 'Live mirror stopped.');
    } catch (err: any) {
      toast.error(isRtl ? 'فشل إيقاف المرآة' : 'Failed to stop mirror', err.message);
    }
  };

  return (
    <div className="flex flex-col gap-3.5 w-full text-start select-none animate-[fadeIn_0.2s_ease-out]">
      
      {/* ── Top Summary & Mode Switcher ────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-white dark:bg-[#11151D] border border-black/[.06] dark:border-white/[.07] shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-[#111827] dark:text-white">
              {isRtl ? 'مستنسخ القنوات والمرآة اللحظية' : 'Channel Cloner & Live Mirror'}
            </h2>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#007AFF]/10 text-[#007AFF]">
              PRO
            </span>
          </div>
          <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-0.5">
            {isRtl
              ? 'استنساخ محتوى القنوات والمجموعات مع الاستبدال الذكي للروابط والمعرفات فورياً.'
              : 'Clone channels and broadcast real-time updates with automatic link & text replacement.'}
          </p>
        </div>

        {/* Mode Switcher */}
        <div className="flex items-center gap-1 p-0.5 bg-[#F6F8FB] dark:bg-[#171D28] rounded-lg border border-black/[.05] dark:border-white/[.05] text-xs self-start sm:self-auto shrink-0">
          <button
            onClick={() => setActiveMode('HISTORY')}
            className={`px-3 py-1 font-bold rounded-md transition cursor-pointer flex items-center gap-1.5 ${
              activeMode === 'HISTORY'
                ? 'bg-[#007AFF] text-white shadow-sm'
                : 'text-[#64748B] dark:text-[#94A3B8] hover:text-[#111827] dark:hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>{isRtl ? 'استنساخ الأرشيف' : 'History Clone'}</span>
          </button>
          <button
            onClick={() => setActiveMode('MIRROR')}
            className={`px-3 py-1 font-bold rounded-md transition cursor-pointer flex items-center gap-1.5 ${
              activeMode === 'MIRROR'
                ? 'bg-[#007AFF] text-white shadow-sm'
                : 'text-[#64748B] dark:text-[#94A3B8] hover:text-[#111827] dark:hover:text-white'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>{isRtl ? 'المرآة اللحظية' : 'Live Mirror'}</span>
            {activeMirrorsList.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-[#34C759] animate-pulse" />
            )}
          </button>
        </div>
      </div>

      {/* ── Active Live Mirrors Bar (If Any) ────────────────────────── */}
      {activeMirrorsList.length > 0 && (
        <div className="p-3.5 rounded-xl bg-white dark:bg-[#11151D] border border-black/[.06] dark:border-white/[.07] shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-[#111827] dark:text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#34C759] animate-pulse" />
              {isRtl ? 'خدمات النقل اللحظي النشطة حالياً' : 'Active Live Mirror Pipelines'} ({activeMirrorsList.length})
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {activeMirrorsList.map((m) => (
              <div
                key={m.id}
                className="p-2.5 rounded-lg bg-[#F6F8FB] dark:bg-[#171D28] border border-black/[.04] dark:border-white/[.05] flex items-center justify-between text-xs font-mono"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 font-bold truncate text-[#111827] dark:text-white">
                    <span className="text-[#007AFF]">{m.sourceChannel}</span>
                    <ArrowRight className="w-3 h-3 text-[#94A3B8] rtl:rotate-180" />
                    <span className="text-[#34C759]">{m.targetChannel}</span>
                  </div>
                  <p className="text-[10px] text-[#94A3B8] mt-0.5">
                    {isRtl ? 'تم تحويل' : 'Transferred'}: {m.mirroredCount} {isRtl ? 'منشور' : 'posts'}
                  </p>
                </div>
                <button
                  onClick={() => handleStopMirror(m.id)}
                  className="px-2.5 py-1 rounded-md bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 text-[11px] font-bold transition cursor-pointer shrink-0"
                >
                  {isRtl ? 'إيقاف' : 'Stop'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Main Form Workspace ────────────────────────── */}
      <div className="p-4 rounded-xl bg-white dark:bg-[#11151D] border border-black/[.06] dark:border-white/[.07] shadow-sm space-y-4">
        <form onSubmit={activeMode === 'HISTORY' ? handleStartCloneHistory : handleStartMirror} className="space-y-3.5">
          
          {/* Channel Target Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-[#111827] dark:text-white block mb-1">
                {isRtl ? 'القناة المصدر (Source Channel)' : 'Source Channel / Link'}
              </label>
              <input
                type="text"
                required
                value={sourceChannel}
                onChange={(e) => setSourceChannel(e.target.value)}
                placeholder={isRtl ? 'مثال: @competitor_channel أو رابط القناة' : '@competitor_channel or link'}
                className="w-full px-3 py-2 bg-[#F6F8FB] dark:bg-[#171D28] border border-black/[.08] dark:border-white/10 rounded-xl text-xs text-[#111827] dark:text-white placeholder-[#94A3B8] focus:outline-none focus:border-[#007AFF]"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-[#111827] dark:text-white block mb-1">
                {isRtl ? 'القناة الوجهة (Destination Channel)' : 'Destination Channel'}
              </label>
              <input
                type="text"
                required
                value={targetChannel}
                onChange={(e) => setTargetChannel(e.target.value)}
                placeholder={isRtl ? 'مثال: @my_channel أو معرف القناة الخاصة' : '@my_channel or link'}
                className="w-full px-3 py-2 bg-[#F6F8FB] dark:bg-[#171D28] border border-black/[.08] dark:border-white/10 rounded-xl text-xs text-[#111827] dark:text-white placeholder-[#94A3B8] focus:outline-none focus:border-[#007AFF]"
              />
            </div>
          </div>

          {/* Account & Limit / Watermark */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-bold text-[#111827] dark:text-white block mb-1">
                {isRtl ? 'الحساب المنفذ' : 'Executor Account'}
              </label>
              <select
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                className="w-full px-3 py-2 bg-[#F6F8FB] dark:bg-[#171D28] border border-black/[.08] dark:border-white/10 rounded-xl text-xs text-[#111827] dark:text-white focus:outline-none focus:border-[#007AFF] cursor-pointer"
              >
                {activeAccounts.map((acc) => (
                  <option key={acc.id} value={acc.id} className="bg-white dark:bg-[#171D28] text-[#111827] dark:text-white">
                    {acc.phone} {acc.firstName ? `(${acc.firstName})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {activeMode === 'HISTORY' ? (
              <div>
                <label className="text-xs font-bold text-[#111827] dark:text-white block mb-1">
                  {isRtl ? 'عدد المنشورات السابقة' : 'Posts Limit'}
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={limit}
                  onChange={(e) => setLimit(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-[#F6F8FB] dark:bg-[#171D28] border border-black/[.08] dark:border-white/10 rounded-xl text-xs font-mono text-[#111827] dark:text-white focus:outline-none focus:border-[#007AFF]"
                />
              </div>
            ) : (
              <div>
                <label className="text-xs font-bold text-[#111827] dark:text-white block mb-1">
                  {isRtl ? 'التوقيع والعلامة المائية' : 'Appended Watermark'}
                </label>
                <input
                  type="text"
                  value={watermark}
                  onChange={(e) => setWatermark(e.target.value)}
                  placeholder={isRtl ? 'مثال: اشترك في قناتنا @my_vip' : 'e.g. Join @my_channel'}
                  className="w-full px-3 py-2 bg-[#F6F8FB] dark:bg-[#171D28] border border-black/[.08] dark:border-white/10 rounded-xl text-xs text-[#111827] dark:text-white placeholder-[#94A3B8] focus:outline-none focus:border-[#007AFF]"
                />
              </div>
            )}

            <div>
              <label className="text-xs font-bold text-[#111827] dark:text-white block mb-1">
                {isRtl ? 'توقيع المنشورات' : 'Custom Footer'}
              </label>
              <input
                type="text"
                value={watermark}
                onChange={(e) => setWatermark(e.target.value)}
                placeholder={isRtl ? 'تذييل اختياري لكل منشور...' : 'Optional footer...'}
                className="w-full px-3 py-2 bg-[#F6F8FB] dark:bg-[#171D28] border border-black/[.08] dark:border-white/10 rounded-xl text-xs text-[#111827] dark:text-white placeholder-[#94A3B8] focus:outline-none focus:border-[#007AFF]"
              />
            </div>
          </div>

          {/* Replacement Rules */}
          <div className="pt-2 space-y-2 border-t border-black/[.04] dark:border-white/[.04]">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-[#111827] dark:text-white flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#007AFF]" />
                  <span>{isRtl ? 'قواعد الاستبدال التلقائي للروابط والنصوص' : 'Auto-Replacement Rules'}</span>
                </h4>
                <p className="text-[10px] text-[#94A3B8]">
                  {isRtl ? 'استبدل روابط المنافس ومعرفاته بروابطك قبل إعادة النشر' : 'Replace competitor links with your links before reposting'}
                </p>
              </div>

              <button
                type="button"
                onClick={handleAddReplacement}
                className="h-7 px-2.5 rounded-lg border border-black/[.08] dark:border-white/10 hover:bg-black/[.04] dark:hover:bg-white/5 text-xs font-bold text-[#007AFF] flex items-center gap-1 transition cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>{isRtl ? 'إضافة قاعدة' : 'Add Rule'}</span>
              </button>
            </div>

            <div className="space-y-2">
              {replacements.map((rule, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder={isRtl ? 'ابحث عن: (مثال: @oldbrand أو رابط)' : 'Find: (e.g. @oldbrand)'}
                    value={rule.from}
                    onChange={(e) => handleReplacementChange(idx, 'from', e.target.value)}
                    className="flex-1 px-3 py-1.5 bg-[#F6F8FB] dark:bg-[#171D28] border border-black/[.08] dark:border-white/10 rounded-lg text-xs text-[#111827] dark:text-white placeholder-[#94A3B8] focus:outline-none focus:border-[#007AFF]"
                  />
                  <span className="text-[#94A3B8] text-xs">➔</span>
                  <input
                    type="text"
                    placeholder={isRtl ? 'استبدل بـ: (مثال: @mybrand أو رابطك)' : 'Replace with: (e.g. @mybrand)'}
                    value={rule.to}
                    onChange={(e) => handleReplacementChange(idx, 'to', e.target.value)}
                    className="flex-1 px-3 py-1.5 bg-[#F6F8FB] dark:bg-[#171D28] border border-black/[.08] dark:border-white/10 rounded-lg text-xs text-[#111827] dark:text-white placeholder-[#94A3B8] focus:outline-none focus:border-[#007AFF]"
                  />
                  {replacements.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveReplacement(idx)}
                      className="p-1.5 rounded-lg text-[#94A3B8] hover:text-rose-500 transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Progress Bar (If Cloning) */}
          {progress && (
            <div className="p-3 rounded-xl bg-[#F6F8FB] dark:bg-[#171D28] border border-black/[.04] dark:border-white/[.05] space-y-1">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-[#007AFF] font-bold">{progress.percentage}%</span>
                <span className="text-[#94A3B8]">{progress.current} / {progress.total}</span>
              </div>
              <div className="h-1.5 w-full bg-black/[.06] dark:bg-white/[.08] rounded-full overflow-hidden">
                <div className="h-full bg-[#007AFF] rounded-full transition-all duration-300" style={{ width: `${progress.percentage}%` }} />
              </div>
            </div>
          )}

          {/* Action Trigger Button */}
          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={isLoading || !sourceChannel.trim() || !targetChannel.trim()}
              className="h-9 px-5 rounded-xl bg-[#007AFF] hover:bg-[#0062CC] text-white text-xs font-bold flex items-center gap-1.5 transition active:scale-95 disabled:opacity-50 cursor-pointer shadow-sm shadow-[#007AFF]/25"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>{isRtl ? 'جاري المعالجة والنسخ...' : 'Processing...'}</span>
                </>
              ) : activeMode === 'HISTORY' ? (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>{isRtl ? 'بدء استنساخ المنشورات الآن' : 'Start Clone History'}</span>
                </>
              ) : (
                <>
                  <Radio className="w-3.5 h-3.5" />
                  <span>{isRtl ? 'تفعيل المرآة اللحظية المباشرة' : 'Activate Live Mirror'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
