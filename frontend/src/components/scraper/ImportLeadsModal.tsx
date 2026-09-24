'use client';

import React, { useState } from 'react';
import { Upload, X, CheckCircle2 } from 'lucide-react';
import { translations, Language } from '../../lib/translations';
import { importLeads } from '../../lib/api';
import { useToast } from '../ui/ToastContext';

interface ImportLeadsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  lang: Language;
}

export function ImportLeadsModal({
  isOpen,
  onClose,
  onSuccess,
  lang,
}: ImportLeadsModalProps) {
  const isRtl = lang === 'ar';
  const [title, setTitle] = useState('');
  const [rawText, setRawText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const toast = useToast();
  const t = translations[lang];

  if (!isOpen) return null;

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    const lines = rawText
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    if (lines.length === 0) {
      toast.error(isRtl ? 'يرجى إدخال معرف واحد على الأقل' : 'Please enter at least one lead');
      return;
    }

    const members = lines.map((line) => {
      const parts = line.split(',');
      if (parts.length > 1) {
        return {
          username: parts[0]?.replace(/^@/, '').trim(),
          firstName: parts[1]?.trim(),
          phone: parts[2]?.trim(),
        };
      }
      return {
        username: line.replace(/^@/, '').trim(),
      };
    });

    try {
      setIsLoading(true);
      toast.info(isRtl ? `جاري استيراد ${members.length} جهة اتصال...` : `Importing ${members.length} leads...`);
      const res = await importLeads({
        title: title.trim() || (isRtl ? `قائمة مستوردة (${new Date().toLocaleDateString()})` : `Imported List (${new Date().toLocaleDateString()})`),
        members,
      });
      toast.success(
        isRtl ? 'تم الاستيراد بنجاح!' : 'Leads Imported!',
        isRtl ? `تم حفظ ${res.totalSaved} جهة اتصال.` : `Saved ${res.totalSaved} members.`
      );
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(isRtl ? 'فشل الاستيراد' : 'Import failed', err.response?.data?.message || err.message);
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
        <div className="relative w-full max-w-md rounded-2xl border border-black/[.08] dark:border-white/10 bg-white dark:bg-[#10151E] shadow-2xl overflow-hidden animate-[fadeInScale_0.2s_ease-out]">
          
          {/* Header */}
          <div className="px-5 py-3 border-b border-black/[.06] dark:border-white/[.07] bg-[#FAFAFC] dark:bg-[#0E121A] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#007AFF] flex items-center justify-center text-white shrink-0">
                <Upload className="w-3.5 h-3.5" />
              </div>
              <h2 className="text-xs font-bold text-[#111827] dark:text-white">
                {isRtl ? 'استيراد جهات اتصال مخصصة' : 'Import Custom Leads'}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-[#94A3B8] hover:text-[#111827] dark:hover:text-white transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleImport} className="p-5 space-y-3.5 text-xs text-start">
            <div>
              <label className="font-bold text-[#111827] dark:text-slate-300 block mb-1">
                {isRtl ? 'اسم القائمة' : 'Lead List Name'}
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={isRtl ? 'مثال: عملاء عقارات دبي' : 'e.g. VIP Investors'}
                className="w-full px-3 py-2 bg-[#F6F8FB] dark:bg-[#171D28] border border-black/[.08] dark:border-white/10 rounded-xl text-xs text-[#111827] dark:text-white placeholder-[#94A3B8] focus:outline-none focus:border-[#007AFF]"
              />
            </div>

            <div>
              <label className="font-bold text-[#111827] dark:text-slate-300 block mb-1">
                {isRtl ? 'المعرفات أو أسطر CSV (معرف في كل سطر)' : 'Usernames or CSV Lines'}
              </label>
              <textarea
                rows={6}
                required
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder={`@crypto_trader\n@business_man,Ahmed\n@investor_pro`}
                className="w-full p-2.5 bg-[#F6F8FB] dark:bg-[#171D28] border border-black/[.08] dark:border-white/10 rounded-xl font-mono text-xs text-[#111827] dark:text-white placeholder-[#94A3B8] focus:outline-none focus:border-[#007AFF]"
              />
              <p className="text-[10px] text-[#94A3B8] mt-1">
                {isRtl ? 'التنسيق: @username أو username,firstName,phone' : 'Format: @username or username,firstName,phone'}
              </p>
            </div>

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
                disabled={isLoading || !rawText.trim()}
                className="px-4 py-1.5 rounded-lg bg-[#007AFF] hover:bg-[#0062CC] text-white text-xs font-bold flex items-center gap-1.5 transition active:scale-95 disabled:opacity-50 cursor-pointer shadow-sm"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>{isLoading ? (isRtl ? 'جاري الاستيراد...' : 'Importing...') : (isRtl ? 'حفظ واستيراد' : 'Import Leads')}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
