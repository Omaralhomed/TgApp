'use client';

import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  Circle,
  ArrowRight,
  ArrowLeft,
  Smartphone,
  Shield,
  Users,
  Send,
  Sparkles,
  X,
  ChevronDown,
  ChevronUp,
  Award,
} from 'lucide-react';
import { Language } from '../../lib/translations';

interface OnboardingWizardProps {
  lang: Language;
  stats: {
    totalAccounts: number;
    activeAccounts: number;
    totalLeads: number;
    totalCampaigns: number;
  };
  onNavigate: (tab: string) => void;
}

export function OnboardingWizard({ lang, stats, onNavigate }: OnboardingWizardProps) {
  const isRtl = lang === 'ar';
  const ArrowIcon = isRtl ? ArrowLeft : ArrowRight;

  const [dismissed, setDismissed] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isDismissed = localStorage.getItem('tg_onboarding_dismissed') === 'true';
      setDismissed(isDismissed);
    }
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    if (typeof window !== 'undefined') {
      localStorage.setItem('tg_onboarding_dismissed', 'true');
    }
  };

  // Steps definition based on real data
  const steps = [
    {
      id: 'account',
      titleAr: 'ربط أول رقم وحساب تيليجرام',
      titleEn: 'Connect First Telegram Account',
      descAr: 'اربط رقم هاتفك مع تدوير البصمة الرسمية للأجهزة لمنع الحظر.',
      descEn: 'Connect your phone number with official deterministic device profiles.',
      completed: stats.totalAccounts > 0,
      targetTab: 'accounts',
      icon: Smartphone,
      actionAr: 'إضافة رقم',
      actionEn: 'Add Account',
    },
    {
      id: 'proxy',
      titleAr: 'تأمين الاتصال ببروكسي SOCKS5',
      titleEn: 'Configure SOCKS5 Proxy',
      descAr: 'افحص واضبط بروكسي مشفر لعزل حساباتك جغرافياً وحمايتها.',
      descEn: 'Test and attach encrypted proxies directly to Telegram DC-2.',
      completed: false, // Will be marked checked if user has added proxies or clicks to verify
      targetTab: 'proxies',
      icon: Shield,
      actionAr: 'إدارة البروكسيات',
      actionEn: 'Setup Proxies',
    },
    {
      id: 'scraper',
      titleAr: 'كشط أعضاء مهتمين من المجموعات',
      titleEn: 'Scrape High-Intent Target Leads',
      descAr: 'استخرج أعضاء حقيقيين ونشطين من مجموعات منافسيك بضغطة زر.',
      descEn: 'Extract real, active leads from relevant competitor groups.',
      completed: stats.totalLeads > 0,
      targetTab: 'contacts',
      icon: Users,
      actionAr: 'كشط الأعضاء',
      actionEn: 'Scrape Leads',
    },
    {
      id: 'campaign',
      titleAr: 'إطلاق أول حملة تسويقية ناجحة',
      titleEn: 'Launch Your First Broadcast Campaign',
      descAr: 'اكتب نصك الإعلاني بالـ Spintax وأطلق الإرسال بأمان عبر الطوابير.',
      descEn: 'Craft spintax copy and trigger automated background execution.',
      completed: stats.totalCampaigns > 0,
      targetTab: 'campaigns',
      icon: Send,
      actionAr: 'إنشاء حملة',
      actionEn: 'New Campaign',
    },
  ];

  const completedCount = steps.filter((s) => s.completed).length;
  const progressPercent = Math.round((completedCount / steps.length) * 100);

  // If user completed all steps or dismissed, don't show unless expanded
  if (dismissed) return null;

  return (
    <div className="mb-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900/95 to-slate-950 border border-brand-primary/30 p-5 sm:p-6 shadow-xl relative overflow-hidden backdrop-blur-xl">
      {/* Subtle Cosmic Background Glow */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-brand-primary/10 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* Header bar */}
      <div className="flex items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-primary/10 border border-brand-primary/30 text-brand-primary flex items-center justify-center shadow-sm">
            {progressPercent === 100 ? (
              <Award className="w-5 h-5 text-emerald-400" />
            ) : (
              <Sparkles className="w-5 h-5" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-bold text-white">
                {isRtl ? 'دليل التأهيل السريع للنمو الفيروسي' : 'Fast-Track Onboarding Checklist'}
              </h3>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-brand-primary/20 text-brand-primary border border-brand-primary/30">
                {completedCount} / {steps.length} {isRtl ? 'مكتمل' : 'Completed'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {isRtl
                ? 'أكمل هذه الخطوات الأربع البسيطة لبدء إرسال رسائلك التسويقية في أقل من 3 دقائق.'
                : 'Follow these 4 simple steps to launch your first zero-ban campaign in under 3 minutes.'}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title={collapsed ? 'Expand' : 'Collapse'}
          >
            {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
          <button
            onClick={handleDismiss}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
            title="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden mb-5">
        <div
          className="h-full bg-gradient-to-r from-brand-primary to-cyan-400 rounded-full transition-all duration-500"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Checklist Grid */}
      {!collapsed && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 pt-1">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div
                key={step.id}
                className={`p-4 rounded-xl border transition-all duration-200 flex flex-col justify-between ${
                  step.completed
                    ? 'bg-slate-900/40 border-emerald-500/30 text-slate-300'
                    : 'bg-slate-900/80 border-slate-800 hover:border-brand-primary/50 text-white'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        step.completed
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-brand-primary/10 text-brand-primary border border-brand-primary/20'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>

                    {step.completed ? (
                      <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>{isRtl ? 'تم الإنجاز' : 'Done'}</span>
                      </span>
                    ) : (
                      <span className="text-[11px] font-semibold text-slate-500">
                        {isRtl ? `خطوة ${index + 1}` : `Step ${index + 1}`}
                      </span>
                    )}
                  </div>

                  <h4 className="text-xs sm:text-sm font-bold text-white mb-1">
                    {isRtl ? step.titleAr : step.titleEn}
                  </h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed mb-3">
                    {isRtl ? step.descAr : step.descEn}
                  </p>
                </div>

                <button
                  onClick={() => onNavigate(step.targetTab)}
                  className={`w-full py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition active:scale-95 ${
                    step.completed
                      ? 'bg-slate-800/80 hover:bg-slate-800 text-slate-300'
                      : 'bg-brand-primary hover:bg-brand-primary-hover text-white shadow-sm shadow-brand-primary/20'
                  }`}
                >
                  <span>{isRtl ? step.actionAr : step.actionEn}</span>
                  <ArrowIcon className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
