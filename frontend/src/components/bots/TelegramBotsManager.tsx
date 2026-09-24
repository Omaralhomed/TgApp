'use client';

import React, { useState, useEffect } from 'react';
import {
  Bot,
  Plus,
  Send,
  Users,
  Shield,
  Trash2,
  RefreshCw,
  ExternalLink,
  MessageSquare,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  Radio,
} from 'lucide-react';
import { Language } from '../../lib/translations';
import { getBots, deleteBot } from '../../lib/api';
import { useToast } from '../ui/ToastContext';
import { CreateBotModal } from './CreateBotModal';
import { BotBroadcastModal } from './BotBroadcastModal';
import { BotSubscribersModal } from './BotSubscribersModal';
import { Badge } from '../ui/Badge';

interface TelegramBotsManagerProps {
  lang: Language;
}

export function TelegramBotsManager({ lang }: TelegramBotsManagerProps) {
  const isRtl = lang === 'ar';
  const toast = useToast();

  const [bots, setBots] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [activeBroadcastBot, setActiveBroadcastBot] = useState<any | null>(null);
  const [activeSubscribersBot, setActiveSubscribersBot] = useState<any | null>(null);

  useEffect(() => {
    loadBots();
  }, []);

  const loadBots = async () => {
    setIsLoading(true);
    try {
      const data = await getBots();
      setBots(data || []);
    } catch (err: any) {
      toast.error(isRtl ? 'تعذر تحميل البوتات' : 'Failed to load bots', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteBot = async (id: string, name: string) => {
    if (!confirm(isRtl ? `هل أنت متأكد من حذف البوت "${name}"؟` : `Delete bot "${name}"?`)) return;

    try {
      await deleteBot(id);
      toast.success(isRtl ? 'تم حذف البوت بنجاح' : 'Bot deleted successfully');
      loadBots();
    } catch (err: any) {
      toast.error(isRtl ? 'فشل حذف البوت' : 'Failed to delete bot', err.message);
    }
  };

  const totalSubscribersAll = bots.reduce(
    (acc, b) => acc + (b._count?.subscribers || b.subscriberCount || 0),
    0,
  );

  return (
    <div className="flex flex-col gap-3.5 w-full text-start select-none animate-[fadeIn_0.2s_ease-out]">
      
      {/* ── Top Header & Summary ────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-white dark:bg-[#11151D] border border-black/[.06] dark:border-white/[.07] shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-[#111827] dark:text-white">
              {isRtl ? 'منظومة بوتات تيليجرام الرسمية' : 'Official Telegram Bot Suite'}
            </h2>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#34C759]/10 text-[#34C759]">
              0% Ban Risk
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-[#64748B] dark:text-[#94A3B8] mt-1 font-mono">
            <span className="text-[#007AFF] font-bold">● {bots.length} {isRtl ? 'بوت متصل' : 'Connected'}</span>
            <span className="text-[#34C759] font-bold">👥 {totalSubscribersAll.toLocaleString()} {isRtl ? 'مشترك مجمع' : 'Total Leads'}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={loadBots}
            disabled={isLoading}
            className="p-1.5 rounded-lg border border-black/[.06] dark:border-white/[.07] hover:bg-black/[.04] dark:hover:bg-white/5 text-[#64748B] hover:text-[#111827] dark:hover:text-white transition cursor-pointer disabled:opacity-50"
            title={isRtl ? 'تحديث' : 'Refresh'}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-[#007AFF]' : ''}`} />
          </button>

          <button
            onClick={() => setIsCreateOpen(true)}
            className="h-8 px-3 rounded-lg bg-[#007AFF] hover:bg-[#0062CC] text-white text-xs font-bold flex items-center gap-1.5 transition shadow-sm shadow-[#007AFF]/20 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{isRtl ? 'ربط بوت جديد' : 'Connect Bot'}</span>
          </button>
        </div>
      </div>

      {/* ── Connected Bots Grid ────────────────────────── */}
      {isLoading ? (
        <div className="py-16 text-center text-xs text-[#94A3B8] flex flex-col items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-[#007AFF]" />
          <span>{isRtl ? 'جاري تحميل البوتات الرسمية...' : 'Loading official bots...'}</span>
        </div>
      ) : bots.length === 0 ? (
        <div className="p-8 rounded-xl border border-black/[.06] dark:border-white/[.07] bg-white dark:bg-[#11151D] text-center flex flex-col items-center justify-center shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-[#007AFF]/10 text-[#007AFF] flex items-center justify-center mb-3">
            <Bot className="w-6 h-6" />
          </div>
          <h3 className="text-xs font-bold text-[#111827] dark:text-white mb-1">
            {isRtl ? 'لا توجد بوتات رسمية مربوطة بعد' : 'No Official Bots Connected Yet'}
          </h3>
          <p className="text-[11px] text-[#94A3B8] max-w-sm mb-4">
            {isRtl
              ? 'اربط أول بوت رسمي خلال 30 ثانية باستخدام التوكن من BotFather لبدء جمع المشتركين وإرسال البث الجماعي بأمان تام.'
              : 'Connect your BotFather bot to capture leads automatically and send ban-proof broadcasts.'}
          </p>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="h-8 px-4 rounded-lg bg-[#007AFF] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{isRtl ? 'ربط بوت رسمي الآن' : 'Connect Bot Now'}</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {bots.map((bot) => (
            <div
              key={bot.id}
              className="rounded-xl border border-black/[.06] dark:border-white/[.07] bg-white dark:bg-[#11151D] p-3.5 flex flex-col justify-between shadow-xs hover:border-[#007AFF]/40 transition"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-[#007AFF]/10 text-[#007AFF] flex items-center justify-center font-bold text-xs shrink-0">
                      <Bot className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-xs text-[#111827] dark:text-white truncate">
                        {bot.firstName || 'Telegram Bot'}
                      </h4>
                      <a
                        href={`https://t.me/${bot.username}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-[#007AFF] hover:underline font-mono flex items-center gap-1 truncate"
                      >
                        <span>@{bot.username || bot.botId}</span>
                        <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                      </a>
                    </div>
                  </div>

                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#34C759]/10 text-[#34C759] shrink-0 font-mono">
                    ● {isRtl ? 'نشط' : 'Active'}
                  </span>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-2 gap-2 p-2.5 rounded-lg bg-[#F6F8FB] dark:bg-[#171D28] border border-black/[.04] dark:border-white/[.05] mb-3 text-xs font-mono">
                  <div>
                    <span className="text-[10px] text-[#94A3B8] block">{isRtl ? 'المشتركون:' : 'Subscribers:'}</span>
                    <span className="text-sm font-bold text-[#007AFF]">
                      {(bot._count?.subscribers || bot.subscriberCount || 0).toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#94A3B8] block">{isRtl ? 'حملات البث:' : 'Broadcasts:'}</span>
                    <span className="text-sm font-bold text-[#34C759]">
                      {(bot._count?.broadcasts || 0).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Welcome Message Preview */}
                <div className="text-[11px] text-[#64748B] dark:text-[#94A3B8] line-clamp-2 italic mb-3 bg-[#F6F8FB]/60 dark:bg-[#171D28]/60 p-2 rounded-lg border border-black/[.03] dark:border-white/[.03]">
                  &ldquo;{bot.welcomeMessage || (isRtl ? 'مرحباً بك في البوت الرسمي!' : 'Welcome to official bot!')}&rdquo;
                </div>
              </div>

              {/* Actions */}
              <div className="pt-2 border-t border-black/[.04] dark:border-white/[.04] flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 flex-1">
                  <button
                    onClick={() => setActiveBroadcastBot(bot)}
                    className="flex-1 h-7 px-2.5 rounded-lg bg-[#007AFF] hover:bg-[#0062CC] text-white font-bold text-xs flex items-center justify-center gap-1 transition shadow-xs cursor-pointer"
                  >
                    <Send className="w-3 h-3 rtl:rotate-180" />
                    <span>{isRtl ? 'بث فوري' : 'Broadcast'}</span>
                  </button>

                  <button
                    onClick={() => setActiveSubscribersBot(bot)}
                    className="h-7 px-2.5 rounded-lg border border-black/[.08] dark:border-white/10 hover:bg-black/[.04] dark:hover:bg-white/5 text-[#111827] dark:text-white font-semibold text-xs flex items-center justify-center gap-1 transition cursor-pointer"
                  >
                    <Users className="w-3 h-3 text-[#007AFF]" />
                    <span>{isRtl ? 'المشتركين' : 'Leads'}</span>
                  </button>
                </div>

                <button
                  onClick={() => handleDeleteBot(bot.id, bot.firstName || bot.username)}
                  className="p-1.5 rounded-lg text-[#94A3B8] hover:text-rose-500 hover:bg-rose-500/10 transition cursor-pointer"
                  title={isRtl ? 'حذف البوت' : 'Delete'}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Active Modals */}
      <CreateBotModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        lang={lang}
        onSuccess={loadBots}
      />

      <BotBroadcastModal
        isOpen={!!activeBroadcastBot}
        onClose={() => setActiveBroadcastBot(null)}
        bot={activeBroadcastBot}
        lang={lang}
        onSuccess={loadBots}
      />

      <BotSubscribersModal
        isOpen={!!activeSubscribersBot}
        onClose={() => setActiveSubscribersBot(null)}
        bot={activeSubscribersBot}
        lang={lang}
      />
    </div>
  );
}
