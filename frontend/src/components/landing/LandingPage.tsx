'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Shield, Zap, Bot, Users, ArrowRight, ArrowLeft,
  ChevronDown, Globe2, Check, Star, MessageCircle, BarChart3,
  Timer, RefreshCcw, BadgeCheck, Play, Target, Filter, Send,
  TrendingUp, Layers, Eye, Award, Clock, Activity, Sun, Moon,
} from 'lucide-react';
import { Language } from '../../lib/translations';

// ─────────────────────────────────────────────────────────
// Types & Hooks
// ─────────────────────────────────────────────────────────
interface LandingPageProps {
  lang: Language;
  onSetLang: (lang: Language) => void;
  onOpenAuth: (mode?: 'LOGIN' | 'REGISTER') => void;
}

function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setInView(true); obs.disconnect(); } },
      { threshold }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, inView };
}

function useScrolled() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 16);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);
  return scrolled;
}

function useCountUp(target: number, start: boolean, duration = 1400) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!start) return;
    let t0: number | null = null;
    const step = (ts: number) => {
      if (!t0) t0 = ts;
      const p = Math.min((ts - t0) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(ease * target));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, start, duration]);
  return val;
}

// ─────────────────────────────────────────────────────────
// Compact UI Primitives
// ─────────────────────────────────────────────────────────
function Pill({ children, color = 'blue' }: { children: React.ReactNode; color?: 'blue' | 'green' | 'cyan' | 'violet' }) {
  const styles = {
    blue: 'bg-[#007AFF]/10 text-[#007AFF] border-[#007AFF]/20',
    green: 'bg-[#34C759]/10 text-[#16A34A] dark:text-[#34C759] border-[#34C759]/20',
    cyan: 'bg-[#22D3EE]/10 text-[#0891B2] dark:text-[#22D3EE] border-[#22D3EE]/20',
    violet: 'bg-[#635BFF]/10 text-[#635BFF] border-[#635BFF]/20',
  }[color];
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${styles}`}>
      {children}
    </span>
  );
}

function BtnPrimary({ children, onClick, icon, size = 'md' }: {
  children: React.ReactNode; onClick?: () => void; icon?: React.ReactNode; size?: 'sm' | 'md' | 'lg';
}) {
  const sz = {
    sm: 'h-8 px-3.5 text-xs rounded-lg',
    md: 'h-10 px-5 text-sm rounded-xl',
    lg: 'h-12 px-7 text-base rounded-xl font-bold',
  }[size];
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 bg-[#007AFF] hover:bg-[#0062CC] text-white font-semibold shadow-md shadow-[#007AFF]/20 transition-all active:scale-[.98] cursor-pointer ${sz}`}
    >
      {children}
      {icon}
    </button>
  );
}

function BtnGhost({ children, onClick, size = 'md' }: {
  children: React.ReactNode; onClick?: () => void; size?: 'sm' | 'md' | 'lg';
}) {
  const sz = {
    sm: 'h-8 px-3.5 text-xs rounded-lg',
    md: 'h-10 px-5 text-sm rounded-xl',
    lg: 'h-12 px-6 text-base rounded-xl font-semibold',
  }[size];
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 bg-black/[.04] dark:bg-white/[.06] hover:bg-black/[.08] dark:hover:bg-white/[.1] text-[#111827] dark:text-white border border-black/[.06] dark:border-white/[.08] transition-all active:scale-[.98] cursor-pointer ${sz}`}
    >
      {children}
    </button>
  );
}

function SectionHead({ pill, title, sub, center = true }: {
  pill?: React.ReactNode; title: string; sub?: string; center?: boolean;
}) {
  return (
    <div className={`mb-8 ${center ? 'text-center' : ''}`}>
      {pill && <div className="mb-2.5">{pill}</div>}
      <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-[#111827] dark:text-white">
        {title}
      </h2>
      {sub && (
        <p className="mt-2 text-sm sm:text-base text-[#64748B] dark:text-[#94A3B8] max-w-xl mx-auto">
          {sub}
        </p>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────
export function LandingPage({ lang, onSetLang, onOpenAuth }: LandingPageProps) {
  const isRtl = lang === 'ar';
  const Arr = isRtl ? ArrowLeft : ArrowRight;
  const scrolled = useScrolled();
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('yearly');
  const [activeFaq, setActiveFaq] = useState<number | null>(0);
  const [activeTab, setActiveTab] = useState(0);
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const dark = document.documentElement.classList.contains('dark');
      setIsDark(dark);
    }
  }, []);

  const toggleTheme = () => {
    if (typeof window !== 'undefined') {
      const root = document.documentElement;
      if (root.classList.contains('dark')) {
        root.classList.remove('dark');
        setIsDark(false);
        localStorage.setItem('tg_theme', 'light');
      } else {
        root.classList.add('dark');
        setIsDark(true);
        localStorage.setItem('tg_theme', 'dark');
      }
    }
  };

  const { ref: statsRef, inView: statsIn } = useInView(0.2);
  const n1 = useCountUp(12800, statsIn, 1400);
  const n2 = useCountUp(94, statsIn, 1200);
  const n3 = useCountUp(3200, statsIn, 1600);

  // ── Data ──────────────────────────────────────────────
  const tabs = [
    {
      icon: Users,
      labelAr: 'استخراج العملاء',
      labelEn: 'Lead Scraping',
      titleAr: 'استخرج أعضاء المجموعات المنافسة بدقة',
      titleEn: 'Extract Targeted Leads from Groups',
      descAr: 'حدد أي مجموعة واستخرج أعضاءها النشطين مع فلترة المتصلين والاشتراكات المميزة وتجاوز الحسابات المهملة.',
      descEn: 'Target groups and extract active leads with online filters and automatic skip for inactive accounts.',
      chips: [
        isRtl ? '500 عضو/دقيقة' : '500/min',
        isRtl ? 'فلترة المتصلين' : 'Online filter',
        isRtl ? 'دقة 99.1%' : '99.1% accuracy',
      ],
      log: [
        { msg: isRtl ? 'Ahmed K. — متصل الآن' : 'Ahmed K. — Online', tag: isRtl ? 'نشط' : 'Active' },
        { msg: isRtl ? 'Sara M. — مشترك مميز' : 'Sara M. — Premium', tag: isRtl ? 'مميز' : 'VIP' },
        { msg: isRtl ? 'Omar B. — نشط اليوم' : 'Omar B. — Today', tag: isRtl ? 'نشط' : 'Active' },
      ],
    },
    {
      icon: Send,
      labelAr: 'الحملات التسويقية',
      labelEn: 'Campaigns',
      titleAr: 'حملات تسويقية آلية تعمل على مدار الساعة',
      titleEn: 'Automated 24/7 Bulk Campaigns',
      descAr: 'أطلق الحملة من خوادمنا السحابية بدون الحاجة لإبقاء جهازك مفتوحاً، مع تنويع النصوص لتفادي القيود.',
      descEn: 'Cloud-based campaigns running 24/7 without needing your PC on, featuring automatic text spinning.',
      chips: [
        isRtl ? '150K+ رسالة/يوم' : '150K+/day',
        isRtl ? 'توزيع ذكي للأحمال' : 'Smart load balance',
        isRtl ? '99.4% تسليم' : '99.4% delivery',
      ],
      log: [
        { msg: isRtl ? 'إرسال: عرض الجمعة لـ Ahmed' : 'Sent: Friday offer to Ahmed', tag: isRtl ? 'تم' : 'Done' },
        { msg: isRtl ? 'تأخير عشوائي آمن (3.2 ثانية)' : 'Smart delay (3.2s)', tag: isRtl ? 'انتظار' : 'Delay' },
        { msg: isRtl ? 'تبديل تلقائي للحساب #2' : 'Rotate to account #2', tag: isRtl ? 'تدوير' : 'Rotate' },
      ],
    },
    {
      icon: Bot,
      labelAr: 'البوتات الرسمية',
      labelEn: 'Official Bots',
      titleAr: 'بث رسائل فورية وتفاعلية لمئات الآلاف',
      titleEn: 'Instant Broadcasts with Official Bots',
      descAr: 'أدر بوتات تيليجرام الرسمية وأرسل رسائل تفاعلية بأزرار وقوائم فوراً بدون أي قيود أو أرقام هواتف.',
      descEn: 'Manage official Telegram bots and broadcast interactive rich messages with zero risk of bans.',
      chips: [
        isRtl ? 'مشتركون بلا حدود' : 'Unlimited users',
        isRtl ? 'أزرار وقوائم تفاعلية' : 'Interactive buttons',
        isRtl ? 'بث فوري < ثانيتين' : '<2s broadcast',
      ],
      log: [
        { msg: isRtl ? 'بث لـ 48,320 مشترك' : 'Broadcast to 48,320', tag: 'Live' },
        { msg: isRtl ? 'معدل فتح: 34.2%' : 'Open rate: 34.2%', tag: isRtl ? 'إحصاء' : 'Stat' },
        { msg: isRtl ? 'تفاعل سريع: 8,941 نقرة' : 'Clicks: 8,941', tag: isRtl ? 'تفاعل' : 'Clicks' },
      ],
    },
  ];

  const plans = [
    {
      id: 'starter',
      nameAr: 'Starter', nameEn: 'Starter',
      descAr: 'للمبتدئين والمشاريع الصغيرة', descEn: 'For individuals & small teams',
      priceMonthly: 29, priceYearly: 22,
      featuresAr: ['5 حسابات تيليجرام نشطة', '5,000 رسالة / شهر', 'استخراج 10,000 جهة اتصال', 'إدارة بوت رسمي 1', 'بروكسي مخصص مشفر', 'دعم فني'],
      featuresEn: ['5 active accounts', '5,000 msgs/month', '10K leads extraction', '1 official bot', 'Encrypted proxy', 'Standard support'],
    },
    {
      id: 'pro',
      nameAr: 'Pro', nameEn: 'Pro',
      descAr: 'للوكالات والمسوقين المحترفين', descEn: 'For power marketers & agencies',
      priceMonthly: 79, priceYearly: 59,
      isPopular: true,
      featuresAr: ['25 حساباً متزامناً', '30,000 رسالة / شهر', 'استخراج غير محدود مع فلترة المتصلين', '5 بوتات رسمية بأزرار تفاعلية', 'ذكاء اصطناعي لتنويع الرسائل', 'صندوق وارد موحد 24/7'],
      featuresEn: ['25 accounts', '30,000 msgs/month', 'Unlimited scraping + online filter', '5 interactive bots', 'AI text variations', 'Unified inbox 24/7'],
    },
    {
      id: 'enterprise',
      nameAr: 'Enterprise', nameEn: 'Enterprise',
      descAr: 'للشركات وحجم العمل الكبير', descEn: 'For large teams & enterprises',
      priceMonthly: 199, priceYearly: 149,
      featuresAr: ['حسابات غير محدودة', '150,000 رسالة / شهر', 'خادم معزول وعمال طوابير مخصصون', 'بوتات غير محدودة وبث فوري', 'مدير حساب مخصص', 'SLA 99.9%'],
      featuresEn: ['Unlimited accounts', '150K msgs/month', 'Dedicated isolated server', 'Unlimited bots + broadcast', 'Dedicated account manager', '99.9% SLA'],
    },
  ];

  const faqs = [
    {
      qAr: 'كيف تضمن المنصة حماية الحسابات من التوقف؟',
      qEn: 'How does the platform protect accounts from bans?',
      aAr: 'نستخدم بصمات أجهزة رسمية فريدة وبروكسيات معزولة وتأخيرات زمنية ذكية تحاكي السلوك الإنساني الطبيعي.',
      aEn: 'We use official device fingerprints, isolated proxies, and randomized smart delays mimicking human behavior.',
    },
    {
      qAr: 'هل أحتاج لإبقاء جهازي قيد التشغيل؟',
      qEn: 'Does my computer need to stay on?',
      aAr: 'لا، جميع العمليات والحملات تدار سحابياً 24/7 على خوادمنا.',
      aEn: 'No, all campaigns run entirely in the cloud 24/7 on our servers.',
    },
    {
      qAr: 'ما الفرق بين الحسابات الشخصية والبوتات الرسمية؟',
      qEn: 'What is the difference between accounts and official bots?',
      aAr: 'الحسابات للتنقيب والمراسلة المباشرة، والبوتات الرسمية للبث الفوري التفاعلي لمشتركيك بدون أي قيود.',
      aEn: 'Accounts are for lead outreach; official bots are for instant broadcast to your subscribers with interactive buttons.',
    },
  ];

  return (
    <div
      dir={isRtl ? 'rtl' : 'ltr'}
      className="min-h-screen bg-[#F6F8FB] dark:bg-[#080B11] text-[#111827] dark:text-[#F8FAFC] font-sans antialiased transition-colors duration-200"
      style={{ fontFamily: isRtl ? "'Cairo', sans-serif" : "'Inter', sans-serif" }}
    >
      {/* ── Compact Top Navigation ──────────────────────────────── */}
      <header className="sticky top-0 z-50 px-4 sm:px-6 pt-2 pb-1">
        <nav className={`max-w-[1120px] mx-auto flex items-center justify-between gap-3 px-4 h-14 rounded-xl transition-all ${
          scrolled
            ? 'bg-white/95 dark:bg-[#10151E]/95 backdrop-blur-md border border-black/[.08] dark:border-white/[.08] shadow-sm'
            : 'bg-white/70 dark:bg-[#10151E]/70 backdrop-blur-sm border border-black/[.04] dark:border-white/[.05]'
        }`}>
          {/* Brand */}
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#007AFF] flex items-center justify-center text-white shadow-sm">
              <svg viewBox="0 0 40 40" className="w-4 h-4 fill-white" xmlns="http://www.w3.org/2000/svg">
                <path d="M20 3.333A16.667 16.667 0 1 0 36.667 20 16.685 16.685 0 0 0 20 3.333Zm8.22 11.334-2.734 12.893c-.2.9-.733 1.12-1.487.7l-4.12-3.04-1.986 1.913c-.22.22-.407.407-.833.407l.3-4.22 7.66-6.92c.333-.3-.073-.46-.513-.16l-9.46 5.953-4.073-1.273c-.887-.28-.9-.887.187-1.313l15.9-6.134c.74-.267 1.387.18 1.16 1.194Z"/>
              </svg>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-black text-sm tracking-tight text-[#111827] dark:text-white">
                Telexa<span className="text-[#007AFF]"> Cloud</span>
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-[#007AFF]/10 text-[#007AFF] border border-[#007AFF]/20">
                by EMT
              </span>
            </div>
          </div>

          {/* Links */}
          <div className="hidden md:flex items-center gap-1 text-xs font-semibold text-[#64748B] dark:text-[#94A3B8]">
            <a href="#features" className="px-3 py-1.5 rounded-lg hover:text-[#111827] dark:hover:text-white hover:bg-black/[.04] dark:hover:bg-white/[.06] transition">{isRtl ? 'الميزات' : 'Features'}</a>
            <a href="#pricing" className="px-3 py-1.5 rounded-lg hover:text-[#111827] dark:hover:text-white hover:bg-black/[.04] dark:hover:bg-white/[.06] transition">{isRtl ? 'الأسعار' : 'Pricing'}</a>
            <a href="#faq" className="px-3 py-1.5 rounded-lg hover:text-[#111827] dark:hover:text-white hover:bg-black/[.04] dark:hover:bg-white/[.06] transition">{isRtl ? 'الأسئلة' : 'FAQ'}</a>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1.5">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="h-8 w-8 rounded-lg text-[#64748B] dark:text-[#94A3B8] hover:text-[#111827] dark:hover:text-white border border-black/[.06] dark:border-white/[.08] hover:bg-black/[.04] dark:hover:bg-white/[.06] transition flex items-center justify-center cursor-pointer"
              title={isDark ? (isRtl ? 'الوضع المضيء' : 'Light Mode') : (isRtl ? 'الوضع الليلي' : 'Dark Mode')}
              aria-label="Toggle Theme"
            >
              {isDark ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-[#635BFF]" />}
            </button>
            {/* Language Switch */}
            <button
              onClick={() => onSetLang(lang === 'ar' ? 'en' : 'ar')}
              className="h-8 px-2.5 rounded-lg text-xs font-semibold text-[#64748B] dark:text-[#94A3B8] hover:text-[#111827] dark:hover:text-white border border-black/[.06] dark:border-white/[.08] hover:bg-black/[.04] dark:hover:bg-white/[.06] transition flex items-center gap-1 cursor-pointer"
            >
              <Globe2 className="w-3 h-3" />
              {lang === 'ar' ? 'EN' : 'عر'}
            </button>
            {/* Sign in */}
            <button
              onClick={() => onOpenAuth('LOGIN')}
              className="h-8 px-3 rounded-lg text-xs font-semibold text-[#64748B] dark:text-[#94A3B8] hover:text-[#111827] dark:hover:text-white transition cursor-pointer"
            >
              {isRtl ? 'الدخول' : 'Sign In'}
            </button>
            {/* Register */}
            <BtnPrimary size="sm" onClick={() => onOpenAuth('REGISTER')}>
              {isRtl ? 'ابدأ مجاناً' : 'Get Started'}
            </BtnPrimary>
          </div>
        </nav>
      </header>

      {/* ── Compact Hero Section ─────────────────────────────────── */}
      <section className="max-w-[1000px] mx-auto px-4 sm:px-6 pt-10 sm:pt-14 pb-12 sm:pb-16 text-center">
        <div className="inline-flex mb-4">
          <Pill color="blue">
            <Shield className="w-3 h-3" />
            {isRtl ? 'أتمتة وحملات تيليجرام السحابية' : 'Cloud Telegram Marketing Platform'}
          </Pill>
        </div>

        <h1 className="text-3xl sm:text-5xl lg:text-[54px] font-black leading-[1.12] tracking-tight text-[#111827] dark:text-white max-w-3xl mx-auto">
          {isRtl ? (
            <>
              أطلق حملاتك <span className="text-[#007AFF]">التسويقية</span> على تيليجرام <span className="text-[#635BFF]">بأعلى كفاءة</span>
            </>
          ) : (
            <>
              Scale Your <span className="text-[#007AFF]">Telegram</span> Campaigns <span className="text-[#635BFF]">Without Limits</span>
            </>
          )}
        </h1>

        <p className="mt-4 text-sm sm:text-base text-[#64748B] dark:text-[#94A3B8] max-w-xl mx-auto leading-relaxed">
          {isRtl
            ? 'منصة سحابية متكاملة لاستخراج العملاء، إرسال الحملات الموجهة، وإدارة البوتات الرسمية بأمان تام.'
            : 'Complete cloud platform for lead scraping, targeted automated messaging, and official bot broadcasts.'}
        </p>

        {/* CTA Buttons */}
        <div className="mt-7 flex flex-wrap gap-3 justify-center items-center">
          <BtnPrimary size="md" onClick={() => onOpenAuth('REGISTER')} icon={<Arr className="w-4 h-4" />}>
            {isRtl ? 'ابدأ تجربتك المجانية' : 'Start Free Trial'}
          </BtnPrimary>
          <BtnGhost size="md" onClick={() => onOpenAuth('LOGIN')}>
            <Play className="w-3.5 h-3.5 text-[#007AFF]" />
            {isRtl ? 'دخول النظام' : 'Open Dashboard'}
          </BtnGhost>
        </div>

        {/* Quick Micro Badges */}
        <div className="mt-6 flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs text-[#64748B] dark:text-[#94A3B8]">
          <div className="flex items-center gap-1.5"><BadgeCheck className="w-3.5 h-3.5 text-[#34C759]" /> {isRtl ? 'بدون بطاقة ائتمان' : 'No credit card needed'}</div>
          <div className="flex items-center gap-1.5"><Timer className="w-3.5 h-3.5 text-[#34C759]" /> {isRtl ? 'إعداد في دقيقتين' : 'Setup in 2 mins'}</div>
          <div className="flex items-center gap-1.5"><RefreshCcw className="w-3.5 h-3.5 text-[#34C759]" /> {isRtl ? 'إلغاء بأي وقت' : 'Cancel anytime'}</div>
        </div>
      </section>

      {/* ── Compact Key Stats Bar ───────────────────────────────── */}
      <section className="border-y border-black/[.05] dark:border-white/[.05] bg-white/60 dark:bg-[#10151E]/60 py-6">
        <div ref={statsRef} className="max-w-[1000px] mx-auto px-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          {[
            { val: n1, sfx: '+', labelAr: 'حساب مدار', labelEn: 'Managed Accounts', col: 'text-[#007AFF]' },
            { val: n2, sfx: 'M+', labelAr: 'رسالة مرسلة', labelEn: 'Messages Sent', col: 'text-[#635BFF]' },
            { val: n3, sfx: '+', labelAr: 'مسوق نشط', labelEn: 'Active Marketers', col: 'text-[#22D3EE]' },
            { val: 0, sfx: '%', labelAr: 'معدل الحظر', labelEn: 'Ban Rate', col: 'text-[#34C759]', fixed: '0' },
          ].map((s, i) => (
            <div key={i}>
              <div className={`text-2xl sm:text-3xl font-black ${s.col}`}>
                {s.fixed ?? s.val.toLocaleString()}{s.sfx}
              </div>
              <div className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-0.5">{isRtl ? s.labelAr : s.labelEn}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Compact Core Features ───────────────────────────────── */}
      <section id="features" className="max-w-[1000px] mx-auto px-4 sm:px-6 py-14 sm:py-18">
        <SectionHead
          pill={<Pill color="blue"><Zap className="w-3 h-3" />{isRtl ? 'الميزات الأساسية' : 'Core Features'}</Pill>}
          title={isRtl ? 'كل ما تحتاجه للنمو على تيليجرام' : 'Everything You Need to Scale'}
        />

        {/* Tab switch */}
        <div className="flex justify-center gap-1.5 mb-6 p-1 bg-white dark:bg-[#10151E] border border-black/[.06] dark:border-white/[.08] rounded-xl max-w-md mx-auto">
          {tabs.map((t, i) => {
            const Icon = t.icon;
            const active = activeTab === i;
            return (
              <button
                key={i}
                onClick={() => setActiveTab(i)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  active ? 'bg-[#007AFF] text-white shadow-sm' : 'text-[#64748B] dark:text-[#94A3B8] hover:text-[#111827] dark:hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{isRtl ? t.labelAr : t.labelEn}</span>
              </button>
            );
          })}
        </div>

        {/* Active Tab Panel */}
        <div className="p-6 rounded-2xl bg-white dark:bg-[#10151E] border border-black/[.06] dark:border-white/[.08] grid sm:grid-cols-2 gap-6 items-center">
          <div>
            <h3 className="text-xl font-bold text-[#111827] dark:text-white mb-2">
              {isRtl ? tabs[activeTab].titleAr : tabs[activeTab].titleEn}
            </h3>
            <p className="text-sm text-[#64748B] dark:text-[#94A3B8] leading-relaxed mb-4">
              {isRtl ? tabs[activeTab].descAr : tabs[activeTab].descEn}
            </p>
            <div className="flex flex-wrap gap-2">
              {tabs[activeTab].chips.map((chip, idx) => (
                <span key={idx} className="px-2.5 py-1 rounded-lg bg-[#F6F8FB] dark:bg-[#171D28] text-xs font-semibold text-[#111827] dark:text-[#F8FAFC] border border-black/[.04] dark:border-white/[.06]">
                  ✓ {chip}
                </span>
              ))}
            </div>
          </div>

          {/* Mini Live Preview */}
          <div className="p-4 rounded-xl bg-[#F6F8FB] dark:bg-[#171D28] border border-black/[.05] dark:border-white/[.06] space-y-2.5 font-mono text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-black/[.05] dark:border-white/[.05] text-[11px] text-[#94A3B8]">
              <span>LIVE LOG</span>
              <span className="text-[#34C759] font-bold">● ACTIVE</span>
            </div>
            {tabs[activeTab].log.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between gap-2 text-xs">
                <span className="text-[#64748B] dark:text-[#94A3B8] truncate">{item.msg}</span>
                <span className="shrink-0 px-2 py-0.5 rounded bg-[#007AFF]/10 text-[#007AFF] text-[10px] font-bold">
                  {item.tag}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Compact Pricing Section ─────────────────────────────── */}
      <section id="pricing" className="border-t border-black/[.05] dark:border-white/[.05] bg-white/40 dark:bg-[#10151E]/40 py-14 sm:py-18">
        <div className="max-w-[1000px] mx-auto px-4 sm:px-6">
          <SectionHead
            pill={<Pill color="blue"><TrendingUp className="w-3 h-3" />{isRtl ? 'الأسعار' : 'Pricing'}</Pill>}
            title={isRtl ? 'باقات تناسب جميع الأحجام' : 'Simple Transparent Pricing'}
          />

          {/* Toggle */}
          <div className="flex justify-center mb-8">
            <div className="p-1 rounded-xl bg-white dark:bg-[#10151E] border border-black/[.06] dark:border-white/[.08] flex gap-1 text-xs">
              {(['monthly', 'yearly'] as const).map((b) => (
                <button
                  key={b}
                  onClick={() => setBilling(b)}
                  className={`px-4 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                    billing === b ? 'bg-[#007AFF] text-white shadow-sm' : 'text-[#64748B] dark:text-[#94A3B8]'
                  }`}
                >
                  {b === 'monthly' ? (isRtl ? 'شهري' : 'Monthly') : (isRtl ? 'سنوي (وفر 25%)' : 'Yearly (Save 25%)')}
                </button>
              ))}
            </div>
          </div>

          {/* Cards Grid */}
          <div className="grid sm:grid-cols-3 gap-4 items-stretch">
            {plans.map((p) => {
              const price = billing === 'monthly' ? p.priceMonthly : p.priceYearly;
              const pop = !!p.isPopular;
              return (
                <div
                  key={p.id}
                  className={`relative flex flex-col justify-between p-5 rounded-2xl transition ${
                    pop
                      ? 'bg-[#007AFF] text-white shadow-lg shadow-[#007AFF]/25 -mt-1 sm:-mt-2'
                      : 'bg-white dark:bg-[#10151E] border border-black/[.06] dark:border-white/[.08]'
                  }`}
                >
                  {pop && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-white text-[#007AFF] text-[10px] font-black uppercase shadow-sm">
                      ★ {isRtl ? 'الأكثر طلباً' : 'Most Popular'}
                    </span>
                  )}

                  <div>
                    <h3 className={`text-lg font-black ${pop ? 'text-white' : 'text-[#111827] dark:text-white'}`}>
                      {isRtl ? p.nameAr : p.nameEn}
                    </h3>
                    <p className={`text-xs mt-0.5 mb-4 ${pop ? 'text-white/80' : 'text-[#64748B] dark:text-[#94A3B8]'}`}>
                      {isRtl ? p.descAr : p.descEn}
                    </p>

                    <div className="flex items-baseline gap-1 mb-5">
                      <span className="text-3xl font-black">${price}</span>
                      <span className={`text-xs ${pop ? 'text-white/70' : 'text-[#94A3B8]'}`}>/{isRtl ? 'شهر' : 'mo'}</span>
                    </div>

                    <ul className="space-y-2 mb-6 text-xs">
                      {(isRtl ? p.featuresAr : p.featuresEn).map((f, idx) => (
                        <li key={idx} className={`flex items-start gap-2 ${pop ? 'text-white/90' : 'text-[#64748B] dark:text-[#94A3B8]'}`}>
                          <Check className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${pop ? 'text-white' : 'text-[#007AFF]'}`} />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <button
                    onClick={() => onOpenAuth('REGISTER')}
                    className={`w-full py-2.5 rounded-xl text-xs font-bold transition active:scale-[.98] cursor-pointer ${
                      pop
                        ? 'bg-white text-[#007AFF] hover:bg-slate-100 shadow-sm'
                        : 'bg-[#007AFF] text-white hover:bg-[#0062CC]'
                    }`}
                  >
                    {isRtl ? 'ابدأ الآن' : 'Get Started'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Compact FAQ Section ─────────────────────────────────── */}
      <section id="faq" className="max-w-[720px] mx-auto px-4 sm:px-6 py-14">
        <SectionHead
          pill={<Pill color="cyan"><MessageCircle className="w-3 h-3" />{isRtl ? 'الأسئلة الشائعة' : 'FAQ'}</Pill>}
          title={isRtl ? 'أسئلة يتكرر طرحها' : 'Frequently Asked Questions'}
        />

        <div className="space-y-2">
          {faqs.map((faq, i) => (
            <div key={i} className="rounded-xl border border-black/[.06] dark:border-white/[.07] bg-white dark:bg-[#10151E] overflow-hidden">
              <button
                onClick={() => setActiveFaq(activeFaq === i ? null : i)}
                className="w-full px-5 py-3.5 flex items-center justify-between gap-3 text-start hover:bg-black/[.02] dark:hover:bg-white/[.03] transition cursor-pointer"
              >
                <span className="font-bold text-sm text-[#111827] dark:text-white">
                  {isRtl ? faq.qAr : faq.qEn}
                </span>
                <ChevronDown className={`w-4 h-4 text-[#94A3B8] shrink-0 transition-transform ${activeFaq === i ? 'rotate-180 text-[#007AFF]' : ''}`} />
              </button>
              {activeFaq === i && (
                <div className="px-5 pb-4 text-xs text-[#64748B] dark:text-[#94A3B8] leading-relaxed border-t border-black/[.04] dark:border-white/[.04] pt-3">
                  {isRtl ? faq.aAr : faq.aEn}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── Compact CTA Banner ──────────────────────────────────── */}
      <section className="max-w-[1000px] mx-auto px-4 pb-14">
        <div className="rounded-2xl bg-[#007AFF] text-white p-7 sm:p-10 text-center shadow-lg shadow-[#007AFF]/20">
          <h2 className="text-2xl sm:text-3xl font-black mb-2">
            {isRtl ? 'جاهز لتنمية أعمالك على تيليجرام؟' : 'Ready to Grow on Telegram?'}
          </h2>
          <p className="text-white/80 text-xs sm:text-sm max-w-md mx-auto mb-6">
            {isRtl ? 'انضم لآلاف المسوقين والوكالات وابدأ حملاتك باحترافية اليوم.' : 'Join thousands of marketers running automated campaigns seamlessly.'}
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <button
              onClick={() => onOpenAuth('REGISTER')}
              className="h-10 px-6 rounded-xl bg-white text-[#007AFF] font-bold text-sm hover:bg-slate-100 transition active:scale-95 cursor-pointer shadow-sm"
            >
              {isRtl ? 'ابدأ تجربتك المجانية' : 'Start Free Trial'}
            </button>
            <button
              onClick={() => onOpenAuth('LOGIN')}
              className="h-10 px-6 rounded-xl border border-white/30 hover:bg-white/10 text-white font-semibold text-sm transition cursor-pointer"
            >
              {isRtl ? 'تسجيل الدخول' : 'Sign In'}
            </button>
          </div>
        </div>
      </section>

      {/* ── Compact 1-Row Footer ────────────────────────────────── */}
      <footer className="border-t border-black/[.05] dark:border-white/[.05] bg-white dark:bg-[#10151E] py-4 text-xs">
        <div className="max-w-[1000px] mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-[#64748B] dark:text-[#94A3B8]">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#111827] dark:text-white">Telexa Cloud</span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#007AFF]/10 text-[#007AFF] border border-[#007AFF]/20">by EMT</span>
            <span>© {new Date().getFullYear()} EMT (emt.lt). {isRtl ? 'جميع الحقوق محفوظة' : 'All rights reserved.'}</span>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <a href="#features" className="hover:text-[#111827] dark:hover:text-white transition">{isRtl ? 'الميزات' : 'Features'}</a>
            <a href="#pricing" className="hover:text-[#111827] dark:hover:text-white transition">{isRtl ? 'الأسعار' : 'Pricing'}</a>
            <a href="#faq" className="hover:text-[#111827] dark:hover:text-white transition">{isRtl ? 'الأسئلة' : 'FAQ'}</a>
            <button onClick={() => onOpenAuth('LOGIN')} className="hover:text-[#007AFF] transition cursor-pointer">{isRtl ? 'الدخول' : 'Sign In'}</button>
          </div>
        </div>
      </footer>
    </div>
  );
}
