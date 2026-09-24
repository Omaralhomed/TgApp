'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
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
} from 'lucide-react';
import {
  cloneChannelHistory,
  startChannelMirror,
  stopChannelMirror,
  getActiveMirrors,
  ChannelReplacementRule,
} from '../../lib/api';
import { useSocket } from '../../hooks/useSocket';
import { useToast } from '../ui/ToastContext';

interface TelegramAccountOption {
  id: string;
  phone: string;
  firstName?: string | null;
  status: string;
}

interface ChannelClonerModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: TelegramAccountOption[];
  lang?: 'ar' | 'en';
}

export const ChannelClonerModal: React.FC<ChannelClonerModalProps> = ({
  isOpen,
  onClose,
  accounts,
  lang = 'ar',
}) => {
  const isRtl = lang === 'ar';
  const activeAccounts = accounts.filter((a) => a.status === 'ACTIVE');
  const [activeTab, setActiveTab] = useState<'HISTORY' | 'MIRROR'>('HISTORY');

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
  const toast = useToast();
  const { socket } = useSocket();

  useEffect(() => {
    if (isOpen) {
      loadActiveMirrors();
    }
  }, [isOpen]);

  useEffect(() => {
    if (activeAccounts.length > 0 && !selectedAccountId) {
      setSelectedAccountId(activeAccounts[0].id);
    }
  }, [activeAccounts, selectedAccountId]);

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
        isRtl ? 'تم تفعيل المرآة اللحظية بنجاح!' : 'Live Mirroring Activated!',
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

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div
        dir={isRtl ? 'rtl' : 'ltr'}
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative w-full max-w-2xl max-h-[85vh] rounded-2xl border border-black/[.08] dark:border-white/10 bg-white dark:bg-[#10151E] shadow-2xl overflow-hidden flex flex-col animate-[fadeInScale_0.2s_ease-out]">
          
          {/* Header */}
          <div className="px-5 py-3 border-b border-black/[.06] dark:border-white/[.07] bg-[#FAFAFC] dark:bg-[#0E121A] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#007AFF] flex items-center justify-center text-white shrink-0">
                <Copy className="w-3.5 h-3.5" />
              </div>
              <div>
                <h2 className="text-xs font-bold text-[#111827] dark:text-white">
                  {isRtl ? 'مستنسخ القنوات اللحظي' : 'Channel Cloner & Mirror'}
                </h2>
                <p className="text-[10px] text-[#94A3B8]">
                  {isRtl ? 'استنساخ المحتوى مع الاستبدال الذكي للروابط' : 'Auto-replace links and mirror posts'}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1 rounded-lg text-[#94A3B8] hover:text-[#111827] dark:hover:text-white transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Mode Switcher */}
          <div className="px-5 pt-2.5 pb-1 border-b border-black/[.04] dark:border-white/[.04] bg-[#F6F8FB] dark:bg-[#171D28] flex items-center gap-2 shrink-0">
            <button
              onClick={() => setActiveTab('HISTORY')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'HISTORY'
                  ? 'bg-[#007AFF] text-white shadow-xs'
                  : 'text-[#64748B] dark:text-[#94A3B8] hover:text-[#111827] dark:hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>{isRtl ? 'استنساخ الأرشيف' : 'History Clone'}</span>
            </button>
            <button
              onClick={() => setActiveTab('MIRROR')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'MIRROR'
                  ? 'bg-[#007AFF] text-white shadow-xs'
                  : 'text-[#64748B] dark:text-[#94A3B8] hover:text-[#111827] dark:hover:text-white'
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              <span>{isRtl ? 'المرآة اللحظية' : 'Live Mirror'}</span>
              {activeMirrorsList.length > 0 && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#34C759] animate-pulse" />
              )}
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
            {/* Active Mirrors Section */}
            {activeTab === 'MIRROR' && activeMirrorsList.length > 0 && (
              <div className="p-3 rounded-xl bg-[#F6F8FB] dark:bg-[#171D28] border border-black/[.04] dark:border-white/[.05] space-y-2">
                <span className="font-bold text-[#111827] dark:text-white block text-[11px]">
                  {isRtl ? 'جلسات النقل اللحظي النشطة' : 'Active Mirrors'} ({activeMirrorsList.length})
                </span>
                <div className="space-y-1.5">
                  {activeMirrorsList.map((m) => (
                    <div
                      key={m.id}
                      className="p-2 rounded-lg bg-white dark:bg-[#11151D] border border-black/[.04] dark:border-white/[.05] flex items-center justify-between font-mono"
                    >
                      <div className="min-w-0 text-[11px]">
                        <span className="text-[#007AFF] font-bold">{m.sourceChannel}</span>
                        <span className="mx-1 text-[#94A3B8]">➔</span>
                        <span className="text-[#34C759] font-bold">{m.targetChannel}</span>
                      </div>
                      <button
                        onClick={() => handleStopMirror(m.id)}
                        className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-500 text-[10px] font-bold hover:bg-rose-500/20 transition cursor-pointer"
                      >
                        {isRtl ? 'إيقاف' : 'Stop'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Form */}
            <form onSubmit={activeTab === 'HISTORY' ? handleStartCloneHistory : handleStartMirror} className="space-y-3.5 text-start">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-[#111827] dark:text-slate-300 block mb-1">
                    {isRtl ? 'القناة المصدر' : 'Source Channel'}
                  </label>
                  <input
                    type="text"
                    required
                    value={sourceChannel}
                    onChange={(e) => setSourceChannel(e.target.value)}
                    placeholder={isRtl ? 'مثال: @competitor_channel' : '@competitor_channel'}
                    className="w-full px-3 py-2 bg-[#F6F8FB] dark:bg-[#171D28] border border-black/[.08] dark:border-white/10 rounded-xl text-xs text-[#111827] dark:text-white placeholder-[#94A3B8] focus:outline-none focus:border-[#007AFF]"
                  />
                </div>

                <div>
                  <label className="font-bold text-[#111827] dark:text-slate-300 block mb-1">
                    {isRtl ? 'القناة الوجهة' : 'Destination Channel'}
                  </label>
                  <input
                    type="text"
                    required
                    value={targetChannel}
                    onChange={(e) => setTargetChannel(e.target.value)}
                    placeholder={isRtl ? 'مثال: @my_channel' : '@my_channel'}
                    className="w-full px-3 py-2 bg-[#F6F8FB] dark:bg-[#171D28] border border-black/[.08] dark:border-white/10 rounded-xl text-xs text-[#111827] dark:text-white placeholder-[#94A3B8] focus:outline-none focus:border-[#007AFF]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-[#111827] dark:text-slate-300 block mb-1">
                    {isRtl ? 'الحساب المنفذ' : 'Account'}
                  </label>
                  <select
                    value={selectedAccountId}
                    onChange={(e) => setSelectedAccountId(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F6F8FB] dark:bg-[#171D28] border border-black/[.08] dark:border-white/10 rounded-xl text-xs text-[#111827] dark:text-white focus:outline-none focus:border-[#007AFF] cursor-pointer"
                  >
                    {activeAccounts.map((acc) => (
                      <option key={acc.id} value={acc.id} className="bg-white dark:bg-[#171D28]">
                        {acc.phone} {acc.firstName ? `(${acc.firstName})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {activeTab === 'HISTORY' ? (
                  <div>
                    <label className="font-bold text-[#111827] dark:text-slate-300 block mb-1">
                      {isRtl ? 'عدد المنشورات' : 'Posts Limit'}
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
                    <label className="font-bold text-[#111827] dark:text-slate-300 block mb-1">
                      {isRtl ? 'العلامة المائية' : 'Watermark'}
                    </label>
                    <input
                      type="text"
                      value={watermark}
                      onChange={(e) => setWatermark(e.target.value)}
                      placeholder={isRtl ? 'مثال: اشترك في قناتنا @my_channel' : 'e.g. Join @my_channel'}
                      className="w-full px-3 py-2 bg-[#F6F8FB] dark:bg-[#171D28] border border-black/[.08] dark:border-white/10 rounded-xl text-xs text-[#111827] dark:text-white placeholder-[#94A3B8] focus:outline-none focus:border-[#007AFF]"
                    />
                  </div>
                )}
              </div>

              {/* Replacements */}
              <div className="space-y-2 pt-1 border-t border-black/[.04] dark:border-white/[.04]">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#111827] dark:text-slate-300 text-xs">
                    {isRtl ? 'قواعد استبدال النصوص والروابط' : 'Replacement Rules'}
                  </span>
                  <button
                    type="button"
                    onClick={handleAddReplacement}
                    className="text-[11px] font-bold text-[#007AFF] hover:underline cursor-pointer"
                  >
                    + {isRtl ? 'إضافة قاعدة' : 'Add Rule'}
                  </button>
                </div>

                <div className="space-y-2">
                  {replacements.map((rule, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder={isRtl ? 'ابحث عن: @old' : 'Find: @old'}
                        value={rule.from}
                        onChange={(e) => handleReplacementChange(idx, 'from', e.target.value)}
                        className="flex-1 px-3 py-1.5 bg-[#F6F8FB] dark:bg-[#171D28] border border-black/[.08] dark:border-white/10 rounded-lg text-xs text-[#111827] dark:text-white placeholder-[#94A3B8] focus:outline-none focus:border-[#007AFF]"
                      />
                      <span className="text-[#94A3B8] text-xs">➔</span>
                      <input
                        type="text"
                        placeholder={isRtl ? 'استبدل بـ: @new' : 'Replace: @new'}
                        value={rule.to}
                        onChange={(e) => handleReplacementChange(idx, 'to', e.target.value)}
                        className="flex-1 px-3 py-1.5 bg-[#F6F8FB] dark:bg-[#171D28] border border-black/[.08] dark:border-white/10 rounded-lg text-xs text-[#111827] dark:text-white placeholder-[#94A3B8] focus:outline-none focus:border-[#007AFF]"
                      />
                      {replacements.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveReplacement(idx)}
                          className="p-1 rounded text-[#94A3B8] hover:text-rose-500 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={isLoading || !sourceChannel.trim() || !targetChannel.trim()}
                  className="px-4 py-2 rounded-xl bg-[#007AFF] hover:bg-[#0062CC] text-white text-xs font-bold flex items-center gap-1.5 transition active:scale-95 disabled:opacity-50 cursor-pointer shadow-sm"
                >
                  {isLoading ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span>
                    {isLoading
                      ? isRtl ? 'جاري المعالجة...' : 'Processing...'
                      : activeTab === 'HISTORY'
                      ? isRtl ? 'بدء استنساخ الأرشيف' : 'Start Clone'
                      : isRtl ? 'تفعيل المرآة اللحظية' : 'Activate Mirror'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
};
