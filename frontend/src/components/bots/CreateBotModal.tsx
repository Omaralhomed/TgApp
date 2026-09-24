'use client';

import React, { useState } from 'react';
import { Bot, Key, Sparkles, X, Plus, Trash2 } from 'lucide-react';
import { Language } from '../../lib/translations';
import { connectBot } from '../../lib/api';
import { useToast } from '../ui/ToastContext';

interface CreateBotModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
  onSuccess: () => void;
}

export function CreateBotModal({ isOpen, onClose, lang, onSuccess }: CreateBotModalProps) {
  const isRtl = lang === 'ar';
  const toast = useToast();

  const [token, setToken] = useState('');
  const [welcomeMessage, setWelcomeMessage] = useState(
    isRtl
      ? 'أهلاً ومرحباً بك في البوت الرسمي! 🌟\nيسعدنا تواصلك معنا، اختر من القائمة بالأسفل للبدء:'
      : 'Welcome to our Official Bot! 🌟\nWe are excited to assist you. Choose an option below to get started:',
  );
  const [button1Text, setButton1Text] = useState(isRtl ? '🌐 زيارة موقعنا' : '🌐 Visit Website');
  const [button1Url, setButton1Url] = useState('https://google.com');
  const [button2Text, setButton2Text] = useState(isRtl ? '💬 محادثة الدعم' : '💬 Contact Support');
  const [button2Url, setButton2Url] = useState('https://t.me/telegram');

  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim()) {
      toast.error(isRtl ? 'يرجى إدخال توكن البوت' : 'Please provide a bot token');
      return;
    }

    setIsLoading(true);

    const defaultButtons = [];
    if (button1Text && button1Url) {
      defaultButtons.push([{ text: button1Text, url: button1Url }]);
    }
    if (button2Text && button2Url) {
      defaultButtons.push([{ text: button2Text, url: button2Url }]);
    }

    try {
      const bot = await connectBot({
        token: token.trim(),
        welcomeMessage: welcomeMessage.trim(),
        autoReplyRules: {
          defaultButtons,
          keywords: [
            {
              trigger: 'مساعدة',
              response: isRtl ? 'كيف يمكننا خدمتك اليوم؟' : 'How can we help you today?',
            },
          ],
        },
      });

      toast.success(
        isRtl ? 'تم ربط البوت بنجاح!' : 'Bot Connected Successfully!',
        `@${bot.username || bot.firstName}`,
      );
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(
        isRtl ? 'فشل التحقق من توكن البوت' : 'Bot Verification Failed',
        err.response?.data?.message || err.message,
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div
        dir={isRtl ? 'rtl' : 'ltr'}
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative w-full max-w-lg rounded-2xl border border-black/[.08] dark:border-white/10 bg-white dark:bg-[#10151E] shadow-2xl overflow-hidden animate-[fadeInScale_0.2s_ease-out]">
          
          {/* Header */}
          <div className="px-5 py-3 border-b border-black/[.06] dark:border-white/[.07] bg-[#FAFAFC] dark:bg-[#0E121A] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#007AFF] flex items-center justify-center text-white shrink-0">
                <Bot className="w-3.5 h-3.5" />
              </div>
              <div>
                <h2 className="text-xs font-bold text-[#111827] dark:text-white">
                  {isRtl ? 'ربط بوت تيليجرام رسمي' : 'Connect Official Bot'}
                </h2>
                <p className="text-[10px] text-[#94A3B8]">
                  {isRtl ? 'باستخدام التوكن الصادر من @BotFather' : 'Using BotFather HTTP API Token'}
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

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-5 space-y-3.5 text-xs text-start">
            {/* Token */}
            <div>
              <label className="font-bold text-[#111827] dark:text-slate-300 block mb-1">
                {isRtl ? 'توكن البوت (API Token من @BotFather)' : 'Bot API Token (from @BotFather)'}
              </label>
              <div className="relative">
                <Key className="w-3.5 h-3.5 text-[#94A3B8] absolute top-2.5 start-2.5" />
                <input
                  type="text"
                  required
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="1234567890:ABCdefGhIJKlmNoPQRsTUVwxyZ..."
                  className="w-full ps-8 pe-3 py-2 bg-[#F6F8FB] dark:bg-[#171D28] border border-black/[.08] dark:border-white/10 rounded-xl text-xs font-mono text-[#111827] dark:text-white placeholder-[#94A3B8] focus:outline-none focus:border-[#007AFF]"
                />
              </div>
            </div>

            {/* Welcome Message */}
            <div>
              <label className="font-bold text-[#111827] dark:text-slate-300 block mb-1">
                {isRtl ? 'رسالة الترحيب التلقائية (/start)' : 'Auto Welcome Message (/start)'}
              </label>
              <textarea
                rows={3}
                value={welcomeMessage}
                onChange={(e) => setWelcomeMessage(e.target.value)}
                className="w-full p-2.5 bg-[#F6F8FB] dark:bg-[#171D28] border border-black/[.08] dark:border-white/10 rounded-xl text-xs text-[#111827] dark:text-white placeholder-[#94A3B8] focus:outline-none focus:border-[#007AFF]"
              />
            </div>

            {/* Default Inline Buttons */}
            <div className="p-3 rounded-xl bg-[#F6F8FB] dark:bg-[#171D28] border border-black/[.04] dark:border-white/[.05] space-y-2">
              <span className="font-bold text-[#111827] dark:text-white text-[11px] block">
                {isRtl ? 'الأزرار التفاعلية المرفقة مع الترحيب' : 'Attached Welcome Buttons'}
              </span>

              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={button1Text}
                  onChange={(e) => setButton1Text(e.target.value)}
                  placeholder={isRtl ? 'نص الزر 1' : 'Button 1 Text'}
                  className="px-2.5 py-1.5 bg-white dark:bg-[#11151D] border border-black/[.06] dark:border-white/[.07] rounded-lg text-xs text-[#111827] dark:text-white focus:outline-none focus:border-[#007AFF]"
                />
                <input
                  type="text"
                  value={button1Url}
                  onChange={(e) => setButton1Url(e.target.value)}
                  placeholder="https://..."
                  className="px-2.5 py-1.5 bg-white dark:bg-[#11151D] border border-black/[.06] dark:border-white/[.07] rounded-lg text-xs text-[#111827] dark:text-white font-mono focus:outline-none focus:border-[#007AFF]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={button2Text}
                  onChange={(e) => setButton2Text(e.target.value)}
                  placeholder={isRtl ? 'نص الزر 2' : 'Button 2 Text'}
                  className="px-2.5 py-1.5 bg-white dark:bg-[#11151D] border border-black/[.06] dark:border-white/[.07] rounded-lg text-xs text-[#111827] dark:text-white focus:outline-none focus:border-[#007AFF]"
                />
                <input
                  type="text"
                  value={button2Url}
                  onChange={(e) => setButton2Url(e.target.value)}
                  placeholder="https://..."
                  className="px-2.5 py-1.5 bg-white dark:bg-[#11151D] border border-black/[.06] dark:border-white/[.07] rounded-lg text-xs text-[#111827] dark:text-white font-mono focus:outline-none focus:border-[#007AFF]"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="pt-2 flex items-center justify-end gap-2 border-t border-black/[.06] dark:border-white/[.07]">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 rounded-lg border border-black/[.08] dark:border-white/10 text-xs font-semibold text-[#64748B] hover:text-[#111827] dark:hover:text-white transition cursor-pointer"
              >
                {isRtl ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="submit"
                disabled={isLoading || !token.trim()}
                className="px-4 py-1.5 rounded-lg bg-[#007AFF] hover:bg-[#0062CC] text-white text-xs font-bold flex items-center gap-1.5 transition active:scale-95 disabled:opacity-50 cursor-pointer shadow-sm"
              >
                <Bot className="w-3.5 h-3.5" />
                <span>{isLoading ? (isRtl ? 'جاري التحقق...' : 'Verifying...') : (isRtl ? 'ربط وتفعيل' : 'Connect Bot')}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
