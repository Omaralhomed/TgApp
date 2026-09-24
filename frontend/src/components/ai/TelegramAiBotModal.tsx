'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Bot,
  Send,
  X,
  Sparkles,
  ShieldCheck,
  TrendingUp,
  Play,
  Pause,
  RefreshCw,
  Copy,
  Check,
  CheckCheck,
  Zap,
  ChevronRight,
  ChevronLeft,
  Users,
  CreditCard,
  Sliders,
  Terminal,
} from 'lucide-react';
import { Language } from '../../lib/translations';
import { executeAiBotAction, generateAiSpintax } from '../../lib/api';
import { useToast } from '../ui/ToastContext';

interface TelegramAiBotModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
  onNavigate: (tab: string) => void;
  activeCampaigns?: any[];
}

interface ChatMessage {
  id: string;
  sender: 'bot' | 'user';
  text: string;
  timestamp: string;
  buttons?: Array<{ label: string; actionId: string; payload?: any; isPrimary?: boolean }>;
  card?: {
    type: 'status' | 'health' | 'spintax';
    title: string;
    data: any;
  };
}

export function TelegramAiBotModal({
  isOpen,
  onClose,
  lang,
  onNavigate,
  activeCampaigns = [],
}: TelegramAiBotModalProps) {
  const isRtl = lang === 'ar';
  const toast = useToast();
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const [inputMessage, setInputMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // Spintax Generator Form State (when active)
  const [showSpintaxForm, setShowSpintaxForm] = useState(false);
  const [spintaxNiche, setSpintaxNiche] = useState('تجارة إلكترونية ودورات تدريبية');
  const [spintaxTone, setSpintaxTone] = useState<'urgency' | 'professional' | 'casual' | 'vip'>('urgency');

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-welcome',
      sender: 'bot',
      text: isRtl
        ? 'مرحباً بك في بوت العمليات التنفيذي السريع (TeleFlow Copilot)! ⚡\n\nأنا هنا لمساعدتك على إدارة مهامك التسويقية، وتوليد نصوص إعلانية خالية من الحظر، وفحص سلامة الحسابات بنقرة واحدة.'
        : 'Welcome to TeleFlow Operations Copilot! ⚡\n\nI can execute your campaign commands, craft anti-ban spintax variations, and monitor account health with rapid inline clicks.',
      timestamp: '10:00',
      buttons: [
        { label: isRtl ? '📊 تقرير الحالة والأرقام' : '📊 System Status', actionId: 'STATUS', isPrimary: true },
        { label: isRtl ? '🛡️ فحص صحة الحسابات' : '🛡️ Account Health', actionId: 'HEALTH' },
        { label: isRtl ? '✍️ توليد Spintax ذكي' : '✍️ Generate Spintax', actionId: 'SPINTAX' },
        { label: isRtl ? '🚀 إنشاء حملة جديدة' : '🚀 Launch Campaign', actionId: 'NAV_CAMPAIGN' },
        { label: isRtl ? '👥 كشط أعضاء نشطين' : '👥 Scrape Leads', actionId: 'NAV_SCRAPE' },
      ],
    },
  ]);

  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isProcessing]);

  if (!isOpen) return null;

  const handleButtonClick = async (actionId: string, payload?: any) => {
    const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (actionId === 'NAV_CAMPAIGN') {
      onNavigate('campaigns');
      onClose();
      return;
    }
    if (actionId === 'NAV_SCRAPE') {
      onNavigate('contacts');
      onClose();
      return;
    }
    if (actionId === 'NAV_PROXIES') {
      onNavigate('proxies');
      onClose();
      return;
    }

    if (actionId === 'SPINTAX') {
      setShowSpintaxForm(true);
      setMessages((prev) => [
        ...prev,
        {
          id: `usr-${Date.now()}`,
          sender: 'user',
          text: isRtl ? '✍️ أريد توليد نص تسويقي Spintax مضاد للحظر' : '✍️ Generate Anti-Ban Spintax',
          timestamp: timeNow,
        },
      ]);
      return;
    }

    if (actionId === 'STATUS') {
      setIsProcessing(true);
      setMessages((prev) => [
        ...prev,
        {
          id: `usr-${Date.now()}`,
          sender: 'user',
          text: isRtl ? '📊 فحص حالة المنصة وأرقام اليوم' : '📊 Check System Status',
          timestamp: timeNow,
        },
      ]);

      try {
        const res = await executeAiBotAction({ action: 'QUICK_STATUS' });
        setMessages((prev) => [
          ...prev,
          {
            id: `bot-${Date.now()}`,
            sender: 'bot',
            text: res.messageAr || 'تم جلب تقرير الحالة بنجاح.',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            card: {
              type: 'status',
              title: isRtl ? 'مؤشرات الأداء اللحظية' : 'Live Metrics',
              data: res.data,
            },
            buttons: [
              { label: isRtl ? '🚀 إنشاء حملة' : '🚀 Launch Campaign', actionId: 'NAV_CAMPAIGN', isPrimary: true },
              { label: isRtl ? '🛡️ فحص صحة الحسابات' : '🛡️ Health Check', actionId: 'HEALTH' },
            ],
          },
        ]);
      } catch (err: any) {
        toast.error('Failed to fetch status', err.message);
      } finally {
        setIsProcessing(false);
      }
      return;
    }

    if (actionId === 'HEALTH') {
      setIsProcessing(true);
      setMessages((prev) => [
        ...prev,
        {
          id: `usr-${Date.now()}`,
          sender: 'user',
          text: isRtl ? '🛡️ فحص صحة حسابات التيليجرام ومخاطر الحظر' : '🛡️ Check Telegram Account Health',
          timestamp: timeNow,
        },
      ]);

      try {
        const res = await executeAiBotAction({ action: 'CHECK_HEALTH' });
        setMessages((prev) => [
          ...prev,
          {
            id: `bot-${Date.now()}`,
            sender: 'bot',
            text: res.messageAr || 'تم فحص سلامة الحسابات.',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            card: {
              type: 'health',
              title: isRtl ? 'تقرير سلامة الحسابات' : 'Account Safety Report',
              data: res.data,
            },
            buttons: [
              { label: isRtl ? '⚡ فحص البروكسيات' : '⚡ Check Proxies', actionId: 'NAV_PROXIES' },
              { label: isRtl ? '✍️ توليد Spintax' : '✍️ Generate Spintax', actionId: 'SPINTAX' },
            ],
          },
        ]);
      } catch (err: any) {
        toast.error('Health check failed', err.message);
      } finally {
        setIsProcessing(false);
      }
      return;
    }

    if (actionId === 'PAUSE_CAMPAIGN' && payload?.campaignId) {
      setIsProcessing(true);
      try {
        await executeAiBotAction({ action: 'PAUSE_CAMPAIGN', payload: { campaignId: payload.campaignId } });
        toast.info('Campaign paused');
        setMessages((prev) => [
          ...prev,
          {
            id: `bot-${Date.now()}`,
            sender: 'bot',
            text: isRtl ? '⏸️ تم إيقاف الحملة مؤقتاً بنجاح.' : '⏸️ Campaign paused successfully.',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            buttons: [
              { label: isRtl ? '▶️ استئناف الحملة' : '▶️ Resume', actionId: 'RESUME_CAMPAIGN', payload: { campaignId: payload.campaignId }, isPrimary: true },
            ],
          },
        ]);
      } catch (err: any) {
        toast.error('Action failed', err.message);
      } finally {
        setIsProcessing(false);
      }
      return;
    }

    if (actionId === 'RESUME_CAMPAIGN' && payload?.campaignId) {
      setIsProcessing(true);
      try {
        await executeAiBotAction({ action: 'RESUME_CAMPAIGN', payload: { campaignId: payload.campaignId } });
        toast.success('Campaign resumed');
        setMessages((prev) => [
          ...prev,
          {
            id: `bot-${Date.now()}`,
            sender: 'bot',
            text: isRtl ? '▶️ تم استئناف إرسال الحملة من نقطة التوقف.' : '▶️ Campaign resumed from checkpoint.',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
      } catch (err: any) {
        toast.error('Action failed', err.message);
      } finally {
        setIsProcessing(false);
      }
      return;
    }
  };

  const handleGenerateSpintax = async () => {
    setIsProcessing(true);
    setShowSpintaxForm(false);
    const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    try {
      const res = await generateAiSpintax({
        niche: spintaxNiche,
        tone: spintaxTone,
        productName: isRtl ? 'العرض الذهبي الحصري' : 'Exclusive VIP Pass',
      });

      setMessages((prev) => [
        ...prev,
        {
          id: `bot-${Date.now()}`,
          sender: 'bot',
          text: isRtl
            ? `✨ إليك قالب Spintax التسويقي ونماذج حقيقية مختلفة تماماً لكل رسالة، مما يحمي حساباتك من الحظر:`
            : `✨ Here is your dynamic Spintax template with high-converting randomized variations:`,
          timestamp: timeNow,
          card: {
            type: 'spintax',
            title: isRtl ? 'قالب الإرسال ونماذج المعاينة' : 'Spintax Pattern & Variations',
            data: res,
          },
          buttons: [
            { label: isRtl ? '🚀 استخدم النص في حملة جديدة' : '🚀 Launch With This Copy', actionId: 'NAV_CAMPAIGN', isPrimary: true },
            { label: isRtl ? '🔄 توليد بديل بنبرة أخرى' : '🔄 Generate Another Tone', actionId: 'SPINTAX' },
          ],
        },
      ]);
    } catch (err: any) {
      toast.error('Spintax generation failed', err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || isProcessing) return;

    const query = inputMessage.trim().toLowerCase();
    const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    setMessages((prev) => [
      ...prev,
      {
        id: `usr-${Date.now()}`,
        sender: 'user',
        text: inputMessage,
        timestamp: timeNow,
      },
    ]);
    setInputMessage('');

    if (query.includes('حالة') || query.includes('status') || query === '/status') {
      handleButtonClick('STATUS');
    } else if (query.includes('صحة') || query.includes('حظر') || query.includes('health') || query === '/health') {
      handleButtonClick('HEALTH');
    } else if (query.includes('نص') || query.includes('spintax') || query === '/spintax') {
      handleButtonClick('SPINTAX');
    } else if (query.includes('حملة') || query.includes('campaign') || query === '/campaign') {
      handleButtonClick('NAV_CAMPAIGN');
    } else {
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            id: `bot-${Date.now()}`,
            sender: 'bot',
            text: isRtl
              ? `أهلاً بك! يمكنك النقر مباشرة على أي زر تنفيذي بالأسفل لإنجاز طلبك في أسرع وقت:`
              : `Hello! You can click any of the action buttons below to execute your command:`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            buttons: [
              { label: isRtl ? '📊 تقرير الحالة' : '📊 System Status', actionId: 'STATUS', isPrimary: true },
              { label: isRtl ? '🛡️ فحص صحة الحسابات' : '🛡️ Account Health', actionId: 'HEALTH' },
              { label: isRtl ? '✍️ توليد Spintax' : '✍️ Generate Spintax', actionId: 'SPINTAX' },
              { label: isRtl ? '🚀 إنشاء حملة' : '🚀 Launch Campaign', actionId: 'NAV_CAMPAIGN' },
            ],
          },
        ]);
      }, 500);
    }
  };

  const handleCopyText = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    toast.success(isRtl ? 'تم نسخ النص إلى الحافظة' : 'Copied to clipboard');
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-2xl h-[650px] max-h-[90vh] rounded-3xl bg-[#0e1621] border border-cyan-500/30 shadow-2xl flex flex-col overflow-hidden text-slate-100 font-sans relative">
        {/* 1. TELEGRAM HEADER */}
        <div className="h-16 px-4 sm:px-6 bg-[#17212b] border-b border-slate-800/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-md">
                <Bot className="w-5 h-5" />
              </div>
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-[#17212b] rounded-full animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm sm:text-base text-white">TeleFlow Copilot</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-400 font-semibold border border-cyan-500/30">
                  bot
                </span>
              </div>
              <p className="text-[11px] text-cyan-400 font-medium">
                {isRtl ? 'متصل الآن • منفذ العمليات الذكي' : 'online • intelligent operations bot'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 2. CHAT SCROLL AREA */}
        <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4 bg-[#0e1621]/90">
          {messages.map((msg) => {
            const isBot = msg.sender === 'bot';
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isBot ? 'items-start' : 'items-end'} animate-fade-in`}
              >
                <div
                  className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-4 text-xs sm:text-sm shadow-md relative ${
                    isBot
                      ? 'bg-[#182533] text-slate-100 rounded-tl-none border border-slate-700/50'
                      : 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-tr-none'
                  }`}
                >
                  <p className="whitespace-pre-line leading-relaxed">{msg.text}</p>

                  {/* Render Data Card if present */}
                  {msg.card && msg.card.type === 'status' && (
                    <div className="mt-3 p-3 rounded-xl bg-slate-950/60 border border-slate-700/60 text-xs space-y-2">
                      <div className="flex justify-between font-bold text-cyan-400 pb-1 border-b border-slate-800">
                        <span>{msg.card.title}</span>
                        <span className="uppercase text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/10">
                          {msg.card.data.tier}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div>
                          <span className="text-slate-400">الحسابات النشطة: </span>
                          <span className="font-bold text-emerald-400">{msg.card.data.activeAccountsCount}</span>
                        </div>
                        <div>
                          <span className="text-slate-400">الحملات الجارية: </span>
                          <span className="font-bold text-cyan-400">{msg.card.data.runningCampaignsCount}</span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-slate-400">استهلاك الرسائل: </span>
                          <span className="font-bold text-white">
                            {msg.card.data.quotaUsed.toLocaleString()} / {msg.card.data.quotaLimit.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {msg.card && msg.card.type === 'health' && (
                    <div className="mt-3 p-3 rounded-xl bg-slate-950/60 border border-slate-700/60 text-xs space-y-2">
                      <div className="flex justify-between font-bold text-emerald-400 pb-1 border-b border-slate-800">
                        <span>{msg.card.title}</span>
                        <span>{msg.card.data.total} حسابات</span>
                      </div>
                      <div className="space-y-1 text-[11px]">
                        <div className="flex justify-between">
                          <span className="text-slate-400">جاهزة وسليمة (Active):</span>
                          <span className="font-bold text-emerald-400">{msg.card.data.active}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">في وضع التهدئة (FloodWait):</span>
                          <span className="font-bold text-amber-400">{msg.card.data.flood}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">بحاجة لإعادة تسجيل:</span>
                          <span className="font-bold text-rose-400">{msg.card.data.errors}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {msg.card && msg.card.type === 'spintax' && (
                    <div className="mt-3 space-y-2 text-xs">
                      <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-700/80 font-mono text-[11px] text-cyan-300 relative group">
                        <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">
                          قالب الـ Spintax الأساسي:
                        </div>
                        <div className="max-h-24 overflow-y-auto pr-6">{msg.card.data.template}</div>
                        <button
                          onClick={() => handleCopyText(msg.card!.data.template, 999)}
                          className="absolute top-2 left-2 p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                          title="Copy Template"
                        >
                          {copiedIndex === 999 ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>

                      <div className="text-[11px] font-semibold text-slate-400 pt-1">
                        عينات الرسائل المولدة آلياً (لكل عميل رسالة فريدة):
                      </div>
                      {msg.card.data.previews.slice(0, 2).map((sample: string, sIdx: number) => (
                        <div
                          key={sIdx}
                          className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 text-[11px] text-slate-300 relative"
                        >
                          <p>{sample}</p>
                          <button
                            onClick={() => handleCopyText(sample, sIdx)}
                            className="mt-1 text-[10px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                          >
                            {copiedIndex === sIdx ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            <span>نسخ النموذج</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Timestamp & Delivered Ticks */}
                  <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-slate-400">
                    <span>{msg.timestamp}</span>
                    {isBot ? <Check className="w-3 h-3 text-cyan-400" /> : <CheckCheck className="w-3.5 h-3.5 text-white" />}
                  </div>
                </div>

                {/* INLINE BUTTONS (TELEGRAM STYLE) */}
                {msg.buttons && msg.buttons.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2 max-w-[85%] sm:max-w-[75%]">
                    {msg.buttons.map((btn, bIdx) => (
                      <button
                        key={bIdx}
                        onClick={() => handleButtonClick(btn.actionId, btn.payload)}
                        className={`text-xs font-semibold px-3 py-1.5 rounded-xl border transition-all active:scale-95 flex items-center gap-1.5 shadow-sm ${
                          btn.isPrimary
                            ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 hover:bg-cyan-500/30'
                            : 'bg-[#182533] text-slate-300 border-slate-700/60 hover:bg-[#202f40] hover:text-white'
                        }`}
                      >
                        <span>{btn.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {/* Active Campaigns Quick Control Strip */}
          {activeCampaigns.length > 0 && (
            <div className="p-3 rounded-2xl bg-slate-900/90 border border-amber-500/30 text-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-amber-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                  <span>حملة قيد الإرسال الآن: {activeCampaigns[0].name}</span>
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  {activeCampaigns[0].sentCount || 0} / {activeCampaigns[0].totalTargets || 0}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleButtonClick('PAUSE_CAMPAIGN', { campaignId: activeCampaigns[0].id })}
                  className="px-3 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 text-xs font-semibold flex items-center gap-1"
                >
                  <Pause className="w-3.5 h-3.5" />
                  <span>إيقاف مؤقت</span>
                </button>
                <button
                  onClick={() => onNavigate('campaigns')}
                  className="px-3 py-1 rounded-lg bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold"
                >
                  فتح لوحة الحملة
                </button>
              </div>
            </div>
          )}

          {/* Spintax Quick Generator Input Popup */}
          {showSpintaxForm && (
            <div className="p-4 rounded-2xl bg-[#182533] border border-cyan-500/40 text-xs space-y-3 animate-scale-in">
              <div className="flex justify-between items-center">
                <h4 className="font-bold text-white flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  <span>إعدادات توليد Spintax مضاد للحظر</span>
                </h4>
                <button onClick={() => setShowSpintaxForm(false)} className="text-slate-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div>
                <label className="text-[11px] text-slate-400 mb-1 block">مجال أو فئة منتجك:</label>
                <input
                  type="text"
                  value={spintaxNiche}
                  onChange={(e) => setSpintaxNiche(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white"
                  placeholder="مثال: عقارات، دورات تدريبية، تداول، متجر ملابس..."
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 mb-1 block">نبرة الخطاب الإعلاني:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSpintaxTone('urgency')}
                    className={`py-1.5 px-2 rounded-lg text-xs font-semibold border ${
                      spintaxTone === 'urgency' ? 'bg-cyan-500 text-white border-cyan-400' : 'bg-slate-900 border-slate-700 text-slate-300'
                    }`}
                  >
                    ⚡ حماس وعرض محدود
                  </button>
                  <button
                    type="button"
                    onClick={() => setSpintaxTone('vip')}
                    className={`py-1.5 px-2 rounded-lg text-xs font-semibold border ${
                      spintaxTone === 'vip' ? 'bg-cyan-500 text-white border-cyan-400' : 'bg-slate-900 border-slate-700 text-slate-300'
                    }`}
                  >
                    💎 كبار العملاء والنخبة
                  </button>
                  <button
                    type="button"
                    onClick={() => setSpintaxTone('professional')}
                    className={`py-1.5 px-2 rounded-lg text-xs font-semibold border ${
                      spintaxTone === 'professional' ? 'bg-cyan-500 text-white border-cyan-400' : 'bg-slate-900 border-slate-700 text-slate-300'
                    }`}
                  >
                    👔 رسمي ومؤسسي
                  </button>
                  <button
                    type="button"
                    onClick={() => setSpintaxTone('casual')}
                    className={`py-1.5 px-2 rounded-lg text-xs font-semibold border ${
                      spintaxTone === 'casual' ? 'bg-cyan-500 text-white border-cyan-400' : 'bg-slate-900 border-slate-700 text-slate-300'
                    }`}
                  >
                    👋 ودي ومباشر
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={handleGenerateSpintax}
                className="w-full py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs shadow-md transition"
              >
                توليد القالب والنماذج الفورية الآن ✨
              </button>
            </div>
          )}

          {isProcessing && (
            <div className="flex items-center gap-2 text-xs text-cyan-400 font-medium">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>جاري المعالجة والتنفيذ...</span>
            </div>
          )}

          <div ref={chatBottomRef} />
        </div>

        {/* 3. INPUT BAR */}
        <form onSubmit={handleSendMessage} className="p-3 bg-[#17212b] border-t border-slate-800/80 flex items-center gap-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder={isRtl ? 'اكتب أمرك أو انقر على الأزرار أعلاه (/status, /health, /spintax)...' : 'Type a command or click inline buttons (/status, /health)...'}
            className="flex-1 px-4 py-2.5 rounded-xl bg-[#0e1621] border border-slate-700 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition"
          />
          <button
            type="submit"
            disabled={!inputMessage.trim() || isProcessing}
            className="p-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-white disabled:opacity-50 disabled:cursor-not-allowed transition shadow-md active:scale-95"
            title="Send"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
