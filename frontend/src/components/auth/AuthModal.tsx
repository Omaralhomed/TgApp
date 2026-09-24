'use client';

import React, { useState, useEffect } from 'react';
import {
  Lock, Mail, User, LogIn, UserPlus, Eye, EyeOff,
  Crown, Shield, Star, Users, X, Check,
} from 'lucide-react';
import { Language } from '../../lib/translations';
import { loginUser, registerUser } from '../../lib/api';
import { useToast } from '../ui/ToastContext';

interface AuthModalProps {
  lang: Language;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: any) => void;
  initialMode?: 'LOGIN' | 'REGISTER';
}

const DEMO_ROLES = [
  { role: 'OWNER', label: 'Super Admin', labelAr: 'سوبر ادمن', email: 'admin@telegram-saas.com', pass: 'AdminPass2026!', icon: Crown, col: 'text-amber-500 bg-amber-500/10 border-amber-500/30' },
  { role: 'ADMIN', label: 'Admin', labelAr: 'مدير', email: 'admin2@telegram-saas.com', pass: 'AdminPass2026!', icon: Shield, col: 'text-purple-500 bg-purple-500/10 border-purple-500/30' },
  { role: 'MEMBER', label: 'Pro User', labelAr: 'برو', email: 'member@telegram-saas.com', pass: 'UserPass2026!', icon: Star, col: 'text-blue-500 bg-blue-500/10 border-blue-500/30' },
  { role: 'VIEWER', label: 'Free', labelAr: 'مجاني', email: 'viewer@telegram-saas.com', pass: 'UserPass2026!', icon: Users, col: 'text-slate-500 bg-slate-500/10 border-slate-500/30' },
];

export function AuthModal({
  lang,
  isOpen,
  onClose,
  onSuccess,
  initialMode = 'LOGIN',
}: AuthModalProps) {
  const isRtl = lang === 'ar';
  const [mode, setMode] = useState<'LOGIN' | 'REGISTER'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [orgName, setOrgName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (isOpen && initialMode) setMode(initialMode);
  }, [isOpen, initialMode]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (isOpen) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (mode === 'LOGIN') {
        const res = await loginUser({ email: email.trim(), password });
        toast.success(isRtl ? 'تم تسجيل الدخول بنجاح' : 'Welcome back!', res.user?.name || res.user?.email);
        onSuccess(res.user);
      } else {
        const res = await registerUser({
          email: email.trim(),
          password,
          name: name.trim() || undefined,
          orgName: orgName.trim() || undefined,
        });
        toast.success(isRtl ? 'تم إنشاء الحساب بنجاح' : 'Account Created!', isRtl ? 'مساحة العمل جاهزة' : 'Workspace ready');
        onSuccess(res.user);
      }
      onClose();
    } catch (err: any) {
      toast.error(isRtl ? 'خطأ في المصادقة' : 'Authentication failed', err.response?.data?.message || err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const applyDemo = (acc: typeof DEMO_ROLES[0]) => {
    setEmail(acc.email);
    setPassword(acc.pass);
    setMode('LOGIN');
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={onClose} />

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
                {mode === 'LOGIN' ? <LogIn className="w-3.5 h-3.5" /> : <UserPlus className="w-3.5 h-3.5" />}
              </div>
              <h2 className="text-sm font-bold text-[#111827] dark:text-white">
                {mode === 'LOGIN' ? (isRtl ? 'تسجيل الدخول' : 'Sign In') : (isRtl ? 'إنشاء حساب جديد' : 'Create Account')}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-[#94A3B8] hover:text-[#111827] dark:hover:text-white transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Mode Switcher */}
          <div className="px-5 pt-3">
            <div className="flex p-1 rounded-xl bg-[#F6F8FB] dark:bg-[#171D28] border border-black/[.04] dark:border-white/5 text-xs">
              {(['LOGIN', 'REGISTER'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={`flex-1 py-1.5 font-bold rounded-lg transition cursor-pointer ${
                    mode === m
                      ? 'bg-[#007AFF] text-white shadow-sm'
                      : 'text-[#64748B] dark:text-[#94A3B8] hover:text-[#111827] dark:hover:text-white'
                  }`}
                >
                  {m === 'LOGIN' ? (isRtl ? 'تسجيل الدخول' : 'Sign In') : (isRtl ? 'حساب جديد' : 'Register')}
                </button>
              ))}
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-5 space-y-3">
            {mode === 'REGISTER' && (
              <>
                <div>
                  <div className="relative">
                    <User className="w-3.5 h-3.5 text-[#94A3B8] absolute start-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={isRtl ? 'الاسم' : 'Full Name'}
                      className="w-full ps-8 pe-3 py-2 bg-[#F6F8FB] dark:bg-[#171D28] border border-black/[.08] dark:border-white/10 rounded-xl text-xs text-[#111827] dark:text-white placeholder-[#94A3B8] focus:outline-none focus:border-[#007AFF]"
                    />
                  </div>
                </div>
                <div>
                  <div className="relative">
                    <Users className="w-3.5 h-3.5 text-[#94A3B8] absolute start-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={orgName}
                      onChange={(e) => setOrgName(e.target.value)}
                      placeholder={isRtl ? 'اسم المنظمة / الفريق' : 'Team / Org Name'}
                      className="w-full ps-8 pe-3 py-2 bg-[#F6F8FB] dark:bg-[#171D28] border border-black/[.08] dark:border-white/10 rounded-xl text-xs text-[#111827] dark:text-white placeholder-[#94A3B8] focus:outline-none focus:border-[#007AFF]"
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <div className="relative">
                <Mail className="w-3.5 h-3.5 text-[#94A3B8] absolute start-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={isRtl ? 'البريد الإلكتروني' : 'Email Address'}
                  className="w-full ps-8 pe-3 py-2 bg-[#F6F8FB] dark:bg-[#171D28] border border-black/[.08] dark:border-white/10 rounded-xl text-xs text-[#111827] dark:text-white placeholder-[#94A3B8] focus:outline-none focus:border-[#007AFF]"
                  autoComplete="email"
                />
              </div>
            </div>

            <div>
              <div className="relative">
                <Lock className="w-3.5 h-3.5 text-[#94A3B8] absolute start-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={isRtl ? 'كلمة المرور' : 'Password'}
                  className="w-full ps-8 pe-8 py-2 bg-[#F6F8FB] dark:bg-[#171D28] border border-black/[.08] dark:border-white/10 rounded-xl text-xs text-[#111827] dark:text-white placeholder-[#94A3B8] focus:outline-none focus:border-[#007AFF]"
                  autoComplete={mode === 'LOGIN' ? 'current-password' : 'new-password'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute end-2.5 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#111827] dark:hover:text-white transition"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 rounded-xl bg-[#007AFF] hover:bg-[#0062CC] text-white text-xs font-bold transition active:scale-[.98] disabled:opacity-50 cursor-pointer shadow-sm"
            >
              {isLoading ? (isRtl ? 'جاري التحقق...' : 'Loading…') : (mode === 'LOGIN' ? (isRtl ? 'دخول' : 'Sign In') : (isRtl ? 'إنشاء الحساب' : 'Create Account'))}
            </button>
          </form>

          {/* Compact Demo Accounts Selector */}
          <div className="px-5 pb-4 pt-1 border-t border-black/[.05] dark:border-white/[.05]">
            <div className="text-[11px] font-semibold text-[#64748B] dark:text-[#94A3B8] mb-2 flex items-center justify-between">
              <span>{isRtl ? 'تجربة سريعة:' : 'Quick Demo Accounts:'}</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {DEMO_ROLES.map((r) => {
                const Icon = r.icon;
                const isSelected = email === r.email;
                return (
                  <button
                    key={r.role}
                    type="button"
                    onClick={() => applyDemo(r)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-medium transition cursor-pointer ${
                      isSelected
                        ? 'border-[#007AFF] bg-[#007AFF]/10 text-[#007AFF] font-bold'
                        : 'border-black/[.06] dark:border-white/[.07] bg-[#F6F8FB] dark:bg-[#171D28] text-[#64748B] dark:text-[#94A3B8] hover:border-[#007AFF]/40'
                    }`}
                  >
                    <Icon className="w-3 h-3 shrink-0" />
                    <span className="truncate">{isRtl ? r.labelAr : r.label}</span>
                    {isSelected && <Check className="w-3 h-3 ms-auto text-[#007AFF]" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
