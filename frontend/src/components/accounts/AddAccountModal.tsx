'use client';

import React, { useState } from 'react';
import {
  Smartphone,
  KeyRound,
  ShieldCheck,
  Zap,
  Lock,
  Server,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Check,
  X,
} from 'lucide-react';
import { translations, Language } from '../../lib/translations';
import { initiateAuth, verifyAuth } from '../../lib/api';
import { useToast } from '../ui/ToastContext';

interface AddAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  proxies: any[];
  lang: Language;
}

export function AddAccountModal({
  isOpen,
  onClose,
  onSuccess,
  proxies,
  lang,
}: AddAccountModalProps) {
  const isRtl = lang === 'ar';
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [phone, setPhone] = useState('');
  const [proxyId, setProxyId] = useState('');
  const [code, setCode] = useState('');
  const [password2FA, setPassword2FA] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const toast = useToast();
  const t = translations[lang];

  const resetForm = () => {
    setStep(1);
    setPhone('');
    setCode('');
    setPassword2FA('');
    setIsLoading(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) {
      toast.error(isRtl ? 'يرجى إدخال رقم الهاتف' : 'Please enter a valid phone number');
      return;
    }

    try {
      setIsLoading(true);
      toast.info(isRtl ? 'جاري الاتصال بخوادم تيليجرام...' : 'Connecting to Telegram MTProto...');
      const res = await initiateAuth({
        phone: phone.trim(),
        proxyId: proxyId || undefined,
      });

      if (res.isCodeSent) {
        toast.success(isRtl ? 'تم إرسال رمز التحقق لتطبيق تيليجرام' : 'Verification code sent to your Telegram app!');
        setStep(2);
      }
    } catch (err: any) {
      toast.error(isRtl ? 'فشل إرسال الرمز' : 'Failed to send verification code', err.response?.data?.message || err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) {
      toast.error(isRtl ? 'يرجى إدخال رمز التحقق' : 'Please enter the verification code');
      return;
    }

    try {
      setIsLoading(true);
      toast.info(isRtl ? 'جاري التحقق...' : 'Verifying with Telegram...');
      const res = await verifyAuth({
        phone: phone.trim(),
        code: code.trim(),
        password2FA: password2FA.trim() || undefined,
      });

      if (res.requires2FA) {
        toast.info(isRtl ? 'مطلوب رمز التحقق بخطوتين (2FA)' : '2FA Password Required');
        setStep(3);
        return;
      }

      toast.success(isRtl ? 'تم ربط الحساب بنجاح!' : 'Account Connected Successfully!');
      onSuccess();
      handleClose();
    } catch (err: any) {
      if (err.response?.data?.requires2FA) {
        setStep(3);
      } else {
        toast.error(isRtl ? 'فشل التحقق من الرمز' : 'Verification failed', err.response?.data?.message || err.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={handleClose} />

      <div
        dir={isRtl ? 'rtl' : 'ltr'}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative w-full max-w-sm rounded-2xl border border-black/[.08] dark:border-white/10 bg-white dark:bg-[#10151E] shadow-2xl overflow-hidden animate-[fadeInScale_0.2s_ease-out]">
          
          {/* Header */}
          <div className="px-5 pt-4 pb-3 flex items-center justify-between border-b border-black/[.05] dark:border-white/[.05]">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#007AFF] flex items-center justify-center text-white">
                <Smartphone className="w-3.5 h-3.5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-[#111827] dark:text-white">
                  {isRtl ? 'ربط حساب تيليجرام' : 'Connect Telegram Account'}
                </h2>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-1 rounded-lg text-[#94A3B8] hover:text-[#111827] dark:hover:text-white transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Step Indicator */}
          <div className="px-5 pt-3">
            <div className="flex items-center gap-1.5">
              {[1, 2, 3].map((s) => (
                <div
                  key={s}
                  className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                    step === s ? 'bg-[#007AFF]' : step > s ? 'bg-[#34C759]' : 'bg-black/[.06] dark:bg-white/10'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Step 1: Phone & Optional Proxy */}
          {step === 1 && (
            <form onSubmit={handleSendCode} className="p-5 space-y-3">
              <div>
                <label className="text-xs font-bold text-[#111827] dark:text-slate-300 block mb-1">
                  {isRtl ? 'رقم الهاتف مع مفتاح الدولة' : 'Phone Number'}
                </label>
                <div className="relative">
                  <Smartphone className="w-3.5 h-3.5 text-[#94A3B8] absolute start-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+966 50 123 4567 / +1 415 555 2671"
                    required
                    autoFocus
                    className="w-full ps-8 pe-3 py-2 bg-[#F6F8FB] dark:bg-[#171D28] border border-black/[.08] dark:border-white/10 rounded-xl text-xs font-mono text-[#111827] dark:text-white placeholder-[#94A3B8] focus:outline-none focus:border-[#007AFF]"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-[#111827] dark:text-slate-300 block mb-1">
                  {isRtl ? 'البروكسي المخصص (اختياري)' : 'Dedicated Proxy (Optional)'}
                </label>
                <div className="relative">
                  <Server className="w-3.5 h-3.5 text-[#94A3B8] absolute start-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <select
                    value={proxyId}
                    onChange={(e) => setProxyId(e.target.value)}
                    className="w-full ps-8 pe-3 py-2 bg-[#F6F8FB] dark:bg-[#171D28] border border-black/[.08] dark:border-white/10 rounded-xl text-xs text-[#111827] dark:text-white focus:outline-none focus:border-[#007AFF] cursor-pointer font-mono"
                  >
                    <option value="">{isRtl ? 'اتصال مباشر بدون بروكسي' : 'Direct connection (No proxy)'}</option>
                    {proxies.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.protocol}://{p.host}:{p.port} ({p.status})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 rounded-xl bg-[#007AFF] hover:bg-[#0062CC] text-white text-xs font-bold flex items-center justify-center gap-1.5 transition active:scale-[.98] disabled:opacity-50 cursor-pointer shadow-sm"
                >
                  {isLoading ? (
                    <span>{isRtl ? 'جاري الاتصال...' : 'Connecting...'}</span>
                  ) : (
                    <>
                      <span>{isRtl ? 'إرسال رمز التحقق' : 'Send Code'}</span>
                      <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* Step 2: Verification Code */}
          {step === 2 && (
            <form onSubmit={handleVerifyCode} className="p-5 space-y-3">
              <div className="p-2.5 rounded-lg bg-[#34C759]/10 border border-[#34C759]/20 text-[11px] text-[#16A34A] dark:text-[#34C759]">
                {isRtl ? 'تم إرسال رمز التحقق إلى تطبيق تيليجرام على' : 'Code sent to Telegram app on'} <strong className="font-mono">{phone}</strong>
              </div>

              <div>
                <label className="text-xs font-bold text-[#111827] dark:text-slate-300 block mb-1">
                  {isRtl ? 'رمز التحقق (5 أرقام)' : 'Verification Code'}
                </label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="12345"
                  required
                  autoFocus
                  className="w-full py-2.5 bg-[#F6F8FB] dark:bg-[#171D28] border border-black/[.08] dark:border-white/10 rounded-xl text-center text-lg font-mono tracking-widest text-[#111827] dark:text-white focus:outline-none focus:border-[#007AFF]"
                />
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-3 py-2 rounded-xl border border-black/[.08] dark:border-white/10 text-xs font-semibold text-[#64748B] hover:text-[#111827] dark:hover:text-white transition cursor-pointer"
                >
                  {isRtl ? 'رجوع' : 'Back'}
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 py-2 rounded-xl bg-[#007AFF] hover:bg-[#0062CC] text-white text-xs font-bold flex items-center justify-center gap-1.5 transition active:scale-[.98] disabled:opacity-50 cursor-pointer shadow-sm"
                >
                  {isLoading ? <span>{isRtl ? 'جاري التحقق...' : 'Verifying...'}</span> : <span>{isRtl ? 'تأكيد الحساب' : 'Verify & Connect'}</span>}
                </button>
              </div>
            </form>
          )}

          {/* Step 3: 2FA Password */}
          {step === 3 && (
            <form onSubmit={handleVerifyCode} className="p-5 space-y-3">
              <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-600 dark:text-amber-400">
                {isRtl ? 'هذا الحساب محمي بكلمة مرور التحقق بخطوتين (2FA)' : 'This account is protected with Two-Step Verification (2FA)'}
              </div>

              <div>
                <label className="text-xs font-bold text-[#111827] dark:text-slate-300 block mb-1">
                  {isRtl ? 'كلمة مرور تيليجرام السحابية' : '2FA Cloud Password'}
                </label>
                <div className="relative">
                  <Lock className="w-3.5 h-3.5 text-[#94A3B8] absolute start-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="password"
                    value={password2FA}
                    onChange={(e) => setPassword2FA(e.target.value)}
                    placeholder="••••••••••••"
                    required
                    autoFocus
                    className="w-full ps-8 pe-3 py-2 bg-[#F6F8FB] dark:bg-[#171D28] border border-black/[.08] dark:border-white/10 rounded-xl text-xs text-[#111827] dark:text-white placeholder-[#94A3B8] focus:outline-none focus:border-[#007AFF]"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-3 py-2 rounded-xl border border-black/[.08] dark:border-white/10 text-xs font-semibold text-[#64748B] hover:text-[#111827] dark:hover:text-white transition cursor-pointer"
                >
                  {isRtl ? 'رجوع' : 'Back'}
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 py-2 rounded-xl bg-[#007AFF] hover:bg-[#0062CC] text-white text-xs font-bold flex items-center justify-center gap-1.5 transition active:scale-[.98] disabled:opacity-50 cursor-pointer shadow-sm"
                >
                  {isLoading ? <span>{isRtl ? 'جاري التحقق...' : 'Verifying...'}</span> : <span>{isRtl ? 'إتمام الربط' : 'Complete Setup'}</span>}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
