'use client';

import React, { useState } from 'react';
import { Send, X, Shield, Plus, Trash2, Bot, Sparkles, CheckCircle2 } from 'lucide-react';
import { Language } from '../../lib/translations';
import { createBotBroadcast } from '../../lib/api';
import { useToast } from '../ui/ToastContext';

interface BotBroadcastModalProps {
  isOpen: boolean;
  onClose: () => void;
  bot: any;
  lang: Language;
  onSuccess: () => void;
}

export function BotBroadcastModal({ isOpen, onClose, bot, lang, onSuccess }: BotBroadcastModalProps) {
  const isRtl = lang === 'ar';
  const toast = useToast();

  const [messageText, setMessageText] = useState(
    isRtl
      ? '🔥 <b>إعلان حصري لجميع مشتركينا الكرام!</b>\n\nنقدم لكم أقوى العروض والخصومات لهذا الأسبوع.'
      : '🔥 <b>Exclusive Announcement!</b>\n\nCheck out our limited-time special offer.',
  );
  const [buttons, setButtons] = useState<Array<{ text: string; url: string }>>([
    { text: isRtl ? '🔗 رابط العرض المباشر' : '🔗 Claim Offer', url: 'https://example.com' },
  ]);
  const [isSending, setIsSending] = useState(false);

  if (!isOpen || !bot) return null;

  const handleAddButton = () => {
    if (buttons.length < 5) {
      setButtons([...buttons, { text: '', url: '' }]);
    }
  };

  const handleRemoveButton = (index: number) => {
    setButtons(buttons.filter((_, i) => i !== index));
  };

  const handleButtonChange = (index: number, field: 'text' | 'url', val: string) => {
    const updated = [...buttons];
    updated[index][field] = val;
    setButtons(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim()) {
      toast.error(isRtl ? 'يرجى كتابة نص الرسالة' : 'Please provide message text');
      return;
    }

    setIsSending(true);

    const inlineKeyboard = buttons
      .filter((b) => b.text.trim() && b.url.trim())
      .map((b) => [{ text: b.text.trim(), url: b.url.trim() }]);

    try {
      await createBotBroadcast(bot.id, {
        messageText: messageText.trim(),
        buttons: inlineKeyboard.length > 0 ? inlineKeyboard : undefined,
      });

      toast.success(
        isRtl ? 'تم إطلاق البث الجماعي بنجاح!' : 'Broadcast Triggered Successfully!',
        isRtl ? `جاري الإرسال لـ ${bot.subscriberCount || 0} مشترك في الخلفية` : `Delivering to ${bot.subscriberCount || 0} subscribers`,
      );
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(isRtl ? 'فشل إرسال البث' : 'Broadcast failed', err.response?.data?.message || err.message);
    } finally {
      setIsSending(false);
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
                <Send className="w-3.5 h-3.5 rtl:rotate-180" />
              </div>
              <div>
                <h2 className="text-xs font-bold text-[#111827] dark:text-white">
                  {isRtl ? 'إرسال بث فوري للمشتركين' : 'Official Bot Broadcast'}
                </h2>
                <p className="text-[10px] text-[#94A3B8] font-mono">
                  @{bot.username || bot.firstName} ({bot.subscriberCount || 0} {isRtl ? 'مشترك' : 'leads'})
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
            {/* Message Text */}
            <div>
              <label className="font-bold text-[#111827] dark:text-slate-300 block mb-1">
                {isRtl ? 'نص الرسالة (يدعم HTML مثل <b>نص عريض</b>)' : 'Message Content (HTML Supported)'}
              </label>
              <textarea
                rows={4}
                required
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                className="w-full p-2.5 bg-[#F6F8FB] dark:bg-[#171D28] border border-black/[.08] dark:border-white/10 rounded-xl text-xs text-[#111827] dark:text-white placeholder-[#94A3B8] focus:outline-none focus:border-[#007AFF]"
              />
            </div>

            {/* Buttons Builder */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-bold text-[#111827] dark:text-slate-300 text-xs">
                  {isRtl ? 'الأزرار التفاعلية المرفقة (Inline Buttons)' : 'Attached Inline Buttons'}
                </span>
                {buttons.length < 4 && (
                  <button
                    type="button"
                    onClick={handleAddButton}
                    className="text-[11px] font-bold text-[#007AFF] hover:underline cursor-pointer"
                  >
                    + {isRtl ? 'إضافة زر' : 'Add Button'}
                  </button>
                )}
              </div>

              <div className="space-y-2">
                {buttons.map((btn, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder={isRtl ? 'نص الزر' : 'Button Text'}
                      value={btn.text}
                      onChange={(e) => handleButtonChange(idx, 'text', e.target.value)}
                      className="w-1/3 px-2.5 py-1.5 bg-[#F6F8FB] dark:bg-[#171D28] border border-black/[.08] dark:border-white/10 rounded-lg text-xs text-[#111827] dark:text-white focus:outline-none focus:border-[#007AFF]"
                    />
                    <input
                      type="text"
                      placeholder="https://..."
                      value={btn.url}
                      onChange={(e) => handleButtonChange(idx, 'url', e.target.value)}
                      className="flex-1 px-2.5 py-1.5 bg-[#F6F8FB] dark:bg-[#171D28] border border-black/[.08] dark:border-white/10 rounded-lg text-xs font-mono text-[#111827] dark:text-white focus:outline-none focus:border-[#007AFF]"
                    />
                    {buttons.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveButton(idx)}
                        className="p-1 rounded text-[#94A3B8] hover:text-rose-500 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
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
                disabled={isSending || !messageText.trim()}
                className="px-4 py-1.5 rounded-lg bg-[#007AFF] hover:bg-[#0062CC] text-white text-xs font-bold flex items-center gap-1.5 transition active:scale-95 disabled:opacity-50 cursor-pointer shadow-sm"
              >
                <Send className="w-3.5 h-3.5 rtl:rotate-180" />
                <span>{isSending ? (isRtl ? 'جاري الإرسال...' : 'Sending...') : (isRtl ? 'إطلاق البث الآن' : 'Broadcast Now')}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
