'use client';

import React, { useState } from 'react';
import {
  Send,
  Users,
  Clock,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Zap,
  Play,
  RefreshCw,
  X,
  Check,
  Smartphone,
  Layers,
} from 'lucide-react';
import { translations, Language } from '../../lib/translations';
import { createCampaign, testSpintax, startCampaign } from '../../lib/api';
import { useToast } from '../ui/ToastContext';

interface CampaignWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  groups: any[];
  accounts: any[];
  lang: Language;
}

export function CampaignWizardModal({
  isOpen,
  onClose,
  onSuccess,
  groups,
  accounts,
  lang,
}: CampaignWizardModalProps) {
  const isRtl = lang === 'ar';
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [name, setName] = useState('');
  const [groupId, setGroupId] = useState('');
  const [messageTemplate, setMessageTemplate] = useState(
    '{مرحبا|أهلاً|السلام عليكم} {firstName}، يسعدنا تقديم هذا العرض الخاص لك!',
  );
  const [delayMinSeconds, setDelayMinSeconds] = useState(15);
  const [delayMaxSeconds, setDelayMaxSeconds] = useState(45);
  const [previewSample, setPreviewSample] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toast = useToast();
  const t = translations[lang];

  if (!isOpen) return null;

  const selectedGroup = groups.find((g) => g.id === groupId);
  const totalTargets = selectedGroup ? selectedGroup.memberCount || selectedGroup._count?.members || 0 : 0;
  const activeAccountsCount = accounts.filter((a) => a.status === 'ACTIVE').length;

  const handleRandomizePreview = async () => {
    try {
      const res = await testSpintax(messageTemplate, {
        firstName: isRtl ? 'أحمد' : 'Alex',
        username: 'tg_user',
      });
      if (res.variations && res.variations.length > 0) {
        setPreviewSample(res.variations[Math.floor(Math.random() * res.variations.length)]);
      }
    } catch {
      setPreviewSample(messageTemplate);
    }
  };

  const insertVariable = (variable: string) => {
    setMessageTemplate((prev) => `${prev} ${variable}`);
  };

  const handleLaunchCampaign = async () => {
    if (!name.trim()) {
      toast.error(isRtl ? 'يرجى إدخال اسم الحملة' : 'Campaign name is required');
      return;
    }
    if (!groupId) {
      toast.error(isRtl ? 'يرجى اختيار مجموعة الجمهور المستهدف' : 'Please select target audience');
      return;
    }
    if (!messageTemplate.trim()) {
      toast.error(isRtl ? 'نص الرسالة لا يمكن أن يكون فارغاً' : 'Message template cannot be empty');
      return;
    }

    try {
      setIsSubmitting(true);
      toast.info(isRtl ? 'جاري إنشاء الحملة...' : 'Creating campaign...');
      const created = await createCampaign({
        name: name.trim(),
        groupId,
        messageTemplate: messageTemplate.trim(),
        delayMinSeconds: Number(delayMinSeconds),
        delayMaxSeconds: Number(delayMaxSeconds),
      });

      await startCampaign(created.id);
      toast.success(isRtl ? 'تم إطلاق الحملة بنجاح!' : 'Campaign Broadcast Started!');
      onSuccess();
      handleClose();
    } catch (err: any) {
      toast.error(isRtl ? 'فشل إطلاق الحملة' : 'Failed to launch', err.response?.data?.message || err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setStep(1);
    setName('');
    setGroupId('');
    onClose();
  };

  const stepsList = [
    { s: 1, label: isRtl ? 'الجمهور' : 'Audience' },
    { s: 2, label: isRtl ? 'الرسالة' : 'Message' },
    { s: 3, label: isRtl ? 'التوقيت' : 'Delays' },
    { s: 4, label: isRtl ? 'المراجعة' : 'Review' },
  ];

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={handleClose} />

      <div
        dir={isRtl ? 'rtl' : 'ltr'}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative w-full max-w-lg rounded-2xl border border-black/[.08] dark:border-white/10 bg-white dark:bg-[#10151E] shadow-2xl overflow-hidden animate-[fadeInScale_0.2s_ease-out]">
          
          {/* Header */}
          <div className="px-5 pt-4 pb-3 flex items-center justify-between border-b border-black/[.05] dark:border-white/[.05]">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#007AFF] flex items-center justify-center text-white">
                <Send className="w-3.5 h-3.5 rtl:rotate-180" />
              </div>
              <h2 className="text-sm font-bold text-[#111827] dark:text-white">
                {isRtl ? 'معالج إطلاق الحملات التسويقية' : 'Campaign Launch Wizard'}
              </h2>
            </div>
            <button
              onClick={handleClose}
              className="p-1 rounded-lg text-[#94A3B8] hover:text-[#111827] dark:hover:text-white transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Stepper Bar */}
          <div className="px-5 pt-3 pb-1 border-b border-black/[.04] dark:border-white/[.04] bg-[#F6F8FB] dark:bg-[#171D28]">
            <div className="flex items-center justify-between">
              {stepsList.map((item) => (
                <div
                  key={item.s}
                  onClick={() => step > item.s && setStep(item.s as any)}
                  className={`flex items-center gap-1.5 text-xs font-bold transition select-none ${
                    step === item.s
                      ? 'text-[#007AFF]'
                      : step > item.s
                      ? 'text-[#34C759] cursor-pointer'
                      : 'text-[#94A3B8] opacity-60'
                  }`}
                >
                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      step === item.s
                        ? 'bg-[#007AFF] text-white'
                        : step > item.s
                        ? 'bg-[#34C759] text-white'
                        : 'bg-black/[.06] dark:bg-white/10 text-[#94A3B8]'
                    }`}
                  >
                    {step > item.s ? '✓' : item.s}
                  </span>
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Body Content */}
          <div className="p-5">
            {/* Step 1: Name & Audience Group */}
            {step === 1 && (
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-[#111827] dark:text-slate-300 block mb-1">
                    {isRtl ? 'اسم الحملة' : 'Campaign Name'}
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={isRtl ? 'مثال: حملة عروض نهاية الأسبوع' : 'e.g. Weekend Flash Sale'}
                    required
                    autoFocus
                    className="w-full px-3 py-2 bg-[#F6F8FB] dark:bg-[#171D28] border border-black/[.08] dark:border-white/10 rounded-xl text-xs text-[#111827] dark:text-white placeholder-[#94A3B8] focus:outline-none focus:border-[#007AFF]"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-[#111827] dark:text-slate-300 block mb-1">
                    {isRtl ? 'اختر مجموعة الجمهور المستهدف' : 'Target Audience Group'}
                  </label>
                  <select
                    value={groupId}
                    onChange={(e) => setGroupId(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F6F8FB] dark:bg-[#171D28] border border-black/[.08] dark:border-white/10 rounded-xl text-xs text-[#111827] dark:text-white focus:outline-none focus:border-[#007AFF] cursor-pointer"
                  >
                    <option value="">{isRtl ? '-- اختر قائمة مستخرجة --' : '-- Select Scraped Audience --'}</option>
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.title} ({g.memberCount || g._count?.members || 0} {isRtl ? 'عضو' : 'leads'})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="p-3 rounded-xl bg-[#F6F8FB] dark:bg-[#171D28] border border-black/[.04] dark:border-white/[.05] text-xs flex items-center justify-between font-mono">
                  <span className="text-[#94A3B8]">{isRtl ? 'الحسابات النشطة المتاحة:' : 'Active Accounts:'}</span>
                  <span className="font-bold text-[#34C759]">● {activeAccountsCount} {isRtl ? 'حساب متصل' : 'Ready'}</span>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    onClick={() => {
                      if (!name.trim() || !groupId) {
                        toast.error(isRtl ? 'يرجى إدخال الاسم والجمهور' : 'Enter name and audience');
                        return;
                      }
                      setStep(2);
                    }}
                    className="px-4 py-2 rounded-xl bg-[#007AFF] hover:bg-[#0062CC] text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-sm"
                  >
                    <span>{isRtl ? 'التالي: نص الرسالة' : 'Next: Message'}</span>
                    <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Message & Spintax */}
            {step === 2 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#111827] dark:text-slate-300">
                    {isRtl ? 'قالب الرسالة (يدعم Spintax)' : 'Message Template (Spintax)'}
                  </label>
                  <div className="flex gap-1">
                    {['{firstName}', '{username}'].map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => insertVariable(tag)}
                        className="px-2 py-0.5 rounded bg-[#007AFF]/10 text-[#007AFF] text-[10px] font-mono font-bold hover:bg-[#007AFF]/20 transition cursor-pointer"
                      >
                        +{tag}
                      </button>
                    ))}
                  </div>
                </div>

                <textarea
                  rows={4}
                  value={messageTemplate}
                  onChange={(e) => setMessageTemplate(e.target.value)}
                  className="w-full p-2.5 bg-[#F6F8FB] dark:bg-[#171D28] border border-black/[.08] dark:border-white/10 rounded-xl text-xs text-[#111827] dark:text-white focus:outline-none focus:border-[#007AFF]"
                />

                {/* Spintax Test Preview */}
                <div className="p-2.5 rounded-xl bg-[#F6F8FB] dark:bg-[#171D28] border border-black/[.04] dark:border-white/[.05] text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold text-[#94A3B8]">{isRtl ? 'معاينة تنويع النص:' : 'Sample Variation:'}</span>
                    <button
                      type="button"
                      onClick={handleRandomizePreview}
                      className="text-[10px] font-bold text-[#007AFF] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>{isRtl ? 'توليد نموذج آخر' : 'Re-spin'}</span>
                    </button>
                  </div>
                  <p className="font-mono text-xs text-[#111827] dark:text-white bg-white dark:bg-[#11151D] p-2 rounded-lg border border-black/[.04] dark:border-white/[.05]">
                    {previewSample || messageTemplate}
                  </p>
                </div>

                <div className="pt-2 flex items-center justify-between">
                  <button
                    onClick={() => setStep(1)}
                    className="px-3 py-2 rounded-xl border border-black/[.08] dark:border-white/10 text-xs font-semibold text-[#64748B] hover:text-[#111827] dark:hover:text-white transition cursor-pointer"
                  >
                    {isRtl ? 'رجوع' : 'Back'}
                  </button>
                  <button
                    onClick={() => setStep(3)}
                    className="px-4 py-2 rounded-xl bg-[#007AFF] hover:bg-[#0062CC] text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-sm"
                  >
                    <span>{isRtl ? 'التالي: فترات الأمان' : 'Next: Delays'}</span>
                    <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Delays & Throttle Policy */}
            {step === 3 && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-[#111827] dark:text-slate-300 block mb-1">
                      {isRtl ? 'الحد الأدنى للتأخير (ثواني)' : 'Min Delay (sec)'}
                    </label>
                    <input
                      type="number"
                      min={5}
                      max={120}
                      value={delayMinSeconds}
                      onChange={(e) => setDelayMinSeconds(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-[#F6F8FB] dark:bg-[#171D28] border border-black/[.08] dark:border-white/10 rounded-xl text-xs font-mono text-[#111827] dark:text-white focus:outline-none focus:border-[#007AFF]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-[#111827] dark:text-slate-300 block mb-1">
                      {isRtl ? 'الحد الأقصى للتأخير (ثواني)' : 'Max Delay (sec)'}
                    </label>
                    <input
                      type="number"
                      min={10}
                      max={300}
                      value={delayMaxSeconds}
                      onChange={(e) => setDelayMaxSeconds(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-[#F6F8FB] dark:bg-[#171D28] border border-black/[.08] dark:border-white/10 rounded-xl text-xs font-mono text-[#111827] dark:text-white focus:outline-none focus:border-[#007AFF]"
                    />
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-[#34C759]/10 border border-[#34C759]/20 text-[11px] text-[#16A34A] dark:text-[#34C759]">
                  ✓ {isRtl ? 'نظام الحماية الآلي يوزع الإرسال بين الحسابات مع فواصل عشوائية تحاكي السلوك البشري.' : 'Smart throttling rotates across accounts with randomized human-like delays.'}
                </div>

                <div className="pt-2 flex items-center justify-between">
                  <button
                    onClick={() => setStep(2)}
                    className="px-3 py-2 rounded-xl border border-black/[.08] dark:border-white/10 text-xs font-semibold text-[#64748B] hover:text-[#111827] dark:hover:text-white transition cursor-pointer"
                  >
                    {isRtl ? 'رجوع' : 'Back'}
                  </button>
                  <button
                    onClick={() => setStep(4)}
                    className="px-4 py-2 rounded-xl bg-[#007AFF] hover:bg-[#0062CC] text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-sm"
                  >
                    <span>{isRtl ? 'التالي: المراجعة والإطلاق' : 'Next: Review'}</span>
                    <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
                  </button>
                </div>
              </div>
            )}

            {/* Step 4: Final Review & Launch */}
            {step === 4 && (
              <div className="space-y-3">
                <div className="p-3.5 rounded-xl bg-[#F6F8FB] dark:bg-[#171D28] border border-black/[.04] dark:border-white/[.05] space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-black/[.04] dark:border-white/[.05]">
                    <span className="text-[#94A3B8]">{isRtl ? 'اسم الحملة:' : 'Campaign:'}</span>
                    <span className="font-bold text-[#111827] dark:text-white">{name}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-black/[.04] dark:border-white/[.05]">
                    <span className="text-[#94A3B8]">{isRtl ? 'الجمهور المستهدف:' : 'Audience:'}</span>
                    <span className="font-bold font-mono text-[#007AFF]">{selectedGroup?.title} ({totalTargets} {isRtl ? 'عضو' : 'leads'})</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-[#94A3B8]">{isRtl ? 'الفواصل الزمنية:' : 'Delays:'}</span>
                    <span className="font-mono text-[#111827] dark:text-white">{delayMinSeconds}s - {delayMaxSeconds}s</span>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between">
                  <button
                    onClick={() => setStep(3)}
                    className="px-3 py-2 rounded-xl border border-black/[.08] dark:border-white/10 text-xs font-semibold text-[#64748B] hover:text-[#111827] dark:hover:text-white transition cursor-pointer"
                  >
                    {isRtl ? 'رجوع' : 'Back'}
                  </button>
                  <button
                    onClick={handleLaunchCampaign}
                    disabled={isSubmitting}
                    className="px-5 py-2.5 rounded-xl bg-[#007AFF] hover:bg-[#0062CC] text-white text-xs font-bold flex items-center gap-1.5 transition active:scale-95 disabled:opacity-50 cursor-pointer shadow-md shadow-[#007AFF]/25"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>{isSubmitting ? (isRtl ? 'جاري الإطلاق...' : 'Launching...') : (isRtl ? 'إطلاق الحملة الآن 🚀' : 'Launch Campaign 🚀')}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
