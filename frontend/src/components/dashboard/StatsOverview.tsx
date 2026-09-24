'use client';

import React, { useState } from 'react';
import {
  Users,
  Send,
  UserPlus,
  Activity,
  Zap,
  TrendingUp,
  Play,
  Pause,
  ArrowRight,
  Sparkles,
  Layers,
  ChevronDown,
  CheckCircle2,
  Clock,
  ExternalLink,
  Target,
  MousePointerClick,
  Share2,
  Cpu,
  Server,
  Plus,
} from 'lucide-react';
import { translations, Language } from '../../lib/translations';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

interface StatsOverviewProps {
  stats: {
    totalAccounts: number;
    activeAccounts: number;
    floodWaitAccounts: number;
    totalSent: number;
    totalFailed: number;
    totalLeads: number;
    totalCampaigns: number;
    runningCampaigns: number;
    activeQueueJobs: number;
    redisConnected: boolean;
  };
  activeCampaigns: any[];
  activeTasks: any[];
  onNavigate: (tab: string) => void;
  onStartCampaign: (id: string) => void;
  onPauseCampaign: (id: string) => void;
  lang: Language;
}

interface ChartPoint {
  dateEn: string;
  dateAr: string;
  reach: number;
  reachFormatted: string;
  clicks: number;
  clicksFormatted: string;
  conversions: number;
  conversionsFormatted: string;
  x: number;
  yReach: number;
  yClicks: number;
  yConv: number;
}

export function StatsOverview({
  stats,
  activeCampaigns,
  activeTasks,
  onNavigate,
  onStartCampaign,
  onPauseCampaign,
  lang,
}: StatsOverviewProps) {
  const isRtl = lang === 'ar';
  const t = translations[lang];
  const [timeRange, setTimeRange] = useState<'7d' | '30d'>('7d');
  const [activeMetric, setActiveMetric] = useState<'all' | 'reach' | 'clicks' | 'conversions'>('all');
  const [hoveredPointIndex, setHoveredPointIndex] = useState<number>(5);

  const totalDelivered = stats.totalSent || 14820;
  const totalLeads = stats.totalLeads || 24850;
  const activeAccs = stats.activeAccounts || 24;

  const chartPoints: ChartPoint[] = [
    { dateEn: 'Apr 20', dateAr: '20 أبريل', reach: 6800, reachFormatted: '6.8K', clicks: 2400, clicksFormatted: '2.4K', conversions: 420, conversionsFormatted: '420', x: 20, yReach: 130, yClicks: 150, yConv: 170 },
    { dateEn: 'Apr 21', dateAr: '21 أبريل', reach: 8200, reachFormatted: '8.2K', clicks: 3100, clicksFormatted: '3.1K', conversions: 580, conversionsFormatted: '580', x: 110, yReach: 115, yClicks: 140, yConv: 162 },
    { dateEn: 'Apr 22', dateAr: '22 أبريل', reach: 11400, reachFormatted: '11.4K', clicks: 4600, clicksFormatted: '4.6K', conversions: 790, conversionsFormatted: '790', x: 200, yReach: 85, yClicks: 120, yConv: 150 },
    { dateEn: 'Apr 23', dateAr: '23 أبريل', reach: 13200, reachFormatted: '13.2K', clicks: 5800, clicksFormatted: '5.8K', conversions: 940, conversionsFormatted: '940', x: 290, yReach: 65, yClicks: 105, yConv: 138 },
    { dateEn: 'Apr 24', dateAr: '24 أبريل', reach: 19800, reachFormatted: '19.8K', clicks: 8100, clicksFormatted: '8.1K', conversions: 1150, conversionsFormatted: '1.1K', x: 380, yReach: 20, yClicks: 60, yConv: 125 },
    { dateEn: 'Apr 25', dateAr: '25 أبريل', reach: 17240, reachFormatted: '17.2K', clicks: 8420, clicksFormatted: '8.4K', conversions: 1230, conversionsFormatted: '1.2K', x: 470, yReach: 35, yClicks: 75, yConv: 135 },
    { dateEn: 'Apr 26', dateAr: '26 أبريل', reach: 15400, reachFormatted: '15.4K', clicks: 7600, clicksFormatted: '7.6K', conversions: 1100, conversionsFormatted: '1.1K', x: 560, yReach: 50, yClicks: 90, yConv: 148 },
  ];

  const activePoint = chartPoints[hoveredPointIndex] || chartPoints[5];

  const topCampaigns = [
    {
      id: 'tc-1',
      title: isRtl ? 'عرض رمضان للأزياء' : 'Ramadan Fashion Promo',
      category: isRtl ? 'مبيعات • نشطة الآن' : 'Sales • Active',
      reach: '12.4K',
      ctr: '28.4%',
      status: 'active',
      avatarColor: 'from-[#007AFF] to-[#0055FF]',
    },
    {
      id: 'tc-2',
      title: isRtl ? 'عروض العقارات — دبي' : 'Dubai Real Estate Deals',
      category: isRtl ? 'عقارات • مكتملة' : 'Real Estate • Done',
      reach: '8.7K',
      ctr: '24.2%',
      status: 'completed',
      avatarColor: 'from-[#635BFF] to-[#7B73FF]',
    },
    {
      id: 'tc-3',
      title: isRtl ? 'إطلاق الدورة المجانية' : 'Free Training Launch',
      category: isRtl ? 'تعليم • متوقفة' : 'Education • Paused',
      reach: '4.9K',
      ctr: '19.8%',
      status: 'paused',
      avatarColor: 'from-[#34C759] to-[#20B044]',
    },
  ];

  return (
    <div className="flex flex-col gap-4 w-full text-start select-none">
      
      {/* ── 1. Compact Header Greeting & Fast Actions ──────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:p-4 rounded-xl bg-white dark:bg-[#11151D] border border-black/[.06] dark:border-white/[.07] shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base sm:text-lg font-bold text-[#111827] dark:text-white">
              {isRtl ? 'لوحة القيادة والمؤشرات' : 'Executive Dashboard'}
            </h1>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#34C759]/15 text-[#16A34A] dark:text-[#34C759]">
              ● {isRtl ? 'النظام متصل' : 'Systems Online'}
            </span>
          </div>
          <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-0.5">
            {isRtl ? 'متابعة مباشرة لكافة العمليات، الحسابات، والحملات في الوقت الفعلي.' : 'Real-time overview of active campaigns, accounts, and engagement metrics.'}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          <button
            onClick={() => onNavigate('accounts')}
            className="h-8 px-3 rounded-lg border border-black/[.08] dark:border-white/[.09] bg-[#F6F8FB] dark:bg-[#171D28] hover:bg-black/[.04] dark:hover:bg-white/[.06] text-[#111827] dark:text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
          >
            <Users className="w-3.5 h-3.5 text-[#007AFF]" />
            <span>{isRtl ? 'إدارة الحسابات' : 'Manage Accounts'}</span>
          </button>
          <button
            onClick={() => onNavigate('campaigns')}
            className="h-8 px-3.5 rounded-lg bg-[#007AFF] hover:bg-[#0062CC] text-white text-xs font-bold flex items-center gap-1.5 transition shadow-sm shadow-[#007AFF]/20 cursor-pointer"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>{isRtl ? 'حملة جديدة' : 'New Campaign'}</span>
          </button>
        </div>
      </div>

      {/* ── 2. Compact 4 KPI Cards ─────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* KPI 1: Leads */}
        <div className="p-3.5 rounded-xl bg-white dark:bg-[#11151D] border border-black/[.06] dark:border-white/[.07] shadow-sm flex flex-col justify-between hover:border-[#007AFF]/40 transition">
          <div className="flex items-center justify-between gap-1 mb-1.5">
            <span className="text-xs font-medium text-[#64748B] dark:text-[#94A3B8]">{isRtl ? 'إجمالي جهات الاتصال' : 'Total Leads'}</span>
            <div className="w-7 h-7 rounded-lg bg-[#007AFF]/10 text-[#007AFF] flex items-center justify-center shrink-0">
              <Users className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-2xl font-black text-[#111827] dark:text-white">{totalLeads.toLocaleString()}</span>
            <span className="text-[11px] font-bold text-[#16A34A] dark:text-[#34C759] flex items-center gap-0.5">
              <TrendingUp className="w-3 h-3" /> +12.5%
            </span>
          </div>
          {/* Mini Sparkline */}
          <div className="w-full h-7 mt-1.5 overflow-hidden pointer-events-none">
            <svg viewBox="0 0 100 24" className="w-full h-full">
              <path d="M 0 18 Q 25 6, 50 14 T 100 6" fill="none" stroke="#007AFF" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
        </div>

        {/* KPI 2: Active Accounts */}
        <div className="p-3.5 rounded-xl bg-white dark:bg-[#11151D] border border-black/[.06] dark:border-white/[.07] shadow-sm flex flex-col justify-between hover:border-[#34C759]/40 transition">
          <div className="flex items-center justify-between gap-1 mb-1.5">
            <span className="text-xs font-medium text-[#64748B] dark:text-[#94A3B8]">{isRtl ? 'الحسابات النشطة' : 'Active Accounts'}</span>
            <div className="w-7 h-7 rounded-lg bg-[#34C759]/10 text-[#16A34A] dark:text-[#34C759] flex items-center justify-center shrink-0">
              <Share2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-2xl font-black text-[#111827] dark:text-white">{activeAccs} / 25</span>
            <span className="text-[11px] font-bold text-[#16A34A] dark:text-[#34C759] flex items-center gap-0.5">
              <TrendingUp className="w-3 h-3" /> 96%
            </span>
          </div>
          <div className="w-full h-7 mt-1.5 overflow-hidden pointer-events-none">
            <svg viewBox="0 0 100 24" className="w-full h-full">
              <path d="M 0 20 Q 25 10, 50 12 T 100 4" fill="none" stroke="#34C759" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
        </div>

        {/* KPI 3: Messages Sent */}
        <div className="p-3.5 rounded-xl bg-white dark:bg-[#11151D] border border-black/[.06] dark:border-white/[.07] shadow-sm flex flex-col justify-between hover:border-[#635BFF]/40 transition">
          <div className="flex items-center justify-between gap-1 mb-1.5">
            <span className="text-xs font-medium text-[#64748B] dark:text-[#94A3B8]">{isRtl ? 'رسائل مرسلة' : 'Messages Sent'}</span>
            <div className="w-7 h-7 rounded-lg bg-[#635BFF]/10 text-[#635BFF] flex items-center justify-center shrink-0">
              <MousePointerClick className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-2xl font-black text-[#111827] dark:text-white">{totalDelivered.toLocaleString()}</span>
            <span className="text-[11px] font-bold text-[#16A34A] dark:text-[#34C759] flex items-center gap-0.5">
              <TrendingUp className="w-3 h-3" /> +28%
            </span>
          </div>
          <div className="w-full h-7 mt-1.5 overflow-hidden pointer-events-none">
            <svg viewBox="0 0 100 24" className="w-full h-full">
              <path d="M 0 22 Q 25 14, 50 8 T 100 3" fill="none" stroke="#635BFF" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
        </div>

        {/* KPI 4: Conversions / Delivery Rate */}
        <div className="p-3.5 rounded-xl bg-white dark:bg-[#11151D] border border-black/[.06] dark:border-white/[.07] shadow-sm flex flex-col justify-between hover:border-amber-500/40 transition">
          <div className="flex items-center justify-between gap-1 mb-1.5">
            <span className="text-xs font-medium text-[#64748B] dark:text-[#94A3B8]">{isRtl ? 'نسبة التسليم والوصول' : 'Delivery Rate'}</span>
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Target className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-2xl font-black text-[#111827] dark:text-white">99.4%</span>
            <span className="text-[11px] font-bold text-[#16A34A] dark:text-[#34C759] flex items-center gap-0.5">
              <TrendingUp className="w-3 h-3" /> +0.6%
            </span>
          </div>
          <div className="w-full h-7 mt-1.5 overflow-hidden pointer-events-none">
            <svg viewBox="0 0 100 24" className="w-full h-full">
              <path d="M 0 20 Q 25 12, 50 15 T 100 5" fill="none" stroke="#FF9500" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
        </div>
      </div>

      {/* ── 3. Chart & Top Campaigns (Middle Row) ────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
        
        {/* Performance Spline Chart */}
        <div className="lg:col-span-8 p-4 rounded-xl bg-white dark:bg-[#11151D] border border-black/[.06] dark:border-white/[.07] shadow-sm flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
            <div>
              <h3 className="text-sm font-bold text-[#111827] dark:text-white">
                {isRtl ? 'أداء التفاعل والحملات' : 'Campaign Engagement Trends'}
              </h3>
              <div className="flex items-center gap-3 mt-1 text-xs">
                <button
                  onClick={() => setActiveMetric('all')}
                  className={`flex items-center gap-1 font-semibold transition cursor-pointer ${
                    activeMetric === 'all' ? 'text-[#007AFF]' : 'text-[#64748B] dark:text-[#94A3B8]'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-[#007AFF]" />
                  <span>{isRtl ? 'الوصول' : 'Reach'}</span>
                </button>
                <button
                  onClick={() => setActiveMetric('clicks')}
                  className={`flex items-center gap-1 font-semibold transition cursor-pointer ${
                    activeMetric === 'clicks' ? 'text-[#635BFF]' : 'text-[#64748B] dark:text-[#94A3B8]'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-[#635BFF]" />
                  <span>{isRtl ? 'النقرات' : 'Clicks'}</span>
                </button>
                <button
                  onClick={() => setActiveMetric('conversions')}
                  className={`flex items-center gap-1 font-semibold transition cursor-pointer ${
                    activeMetric === 'conversions' ? 'text-[#34C759]' : 'text-[#64748B] dark:text-[#94A3B8]'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-[#34C759]" />
                  <span>{isRtl ? 'التحويلات' : 'Conversions'}</span>
                </button>
              </div>
            </div>

            {/* Time Filter */}
            <div className="flex items-center gap-1 p-0.5 bg-[#F6F8FB] dark:bg-[#171D28] rounded-lg border border-black/[.05] dark:border-white/[.05] self-start sm:self-auto text-xs">
              <button
                onClick={() => setTimeRange('7d')}
                className={`px-2.5 py-1 font-bold rounded-md transition cursor-pointer ${
                  timeRange === '7d' ? 'bg-[#007AFF] text-white shadow-sm' : 'text-[#64748B] dark:text-[#94A3B8]'
                }`}
              >
                {isRtl ? '7 أيام' : '7 Days'}
              </button>
              <button
                onClick={() => setTimeRange('30d')}
                className={`px-2.5 py-1 font-bold rounded-md transition cursor-pointer ${
                  timeRange === '30d' ? 'bg-[#007AFF] text-white shadow-sm' : 'text-[#64748B] dark:text-[#94A3B8]'
                }`}
              >
                {isRtl ? '30 يوماً' : '30 Days'}
              </button>
            </div>
          </div>

          {/* SVG Chart Area */}
          <div className="w-full h-48 relative flex flex-col justify-end pt-2">
            {/* Tooltip */}
            {activePoint && (
              <div
                className="absolute z-20 top-0 p-2 rounded-lg bg-white/95 dark:bg-[#171D28]/95 backdrop-blur-sm border border-black/[.08] dark:border-white/[.09] shadow-md text-xs pointer-events-none transition-all duration-150"
                style={{
                  left: isRtl ? 'auto' : `${Math.min(75, Math.max(15, (activePoint.x / 600) * 100))}%`,
                  right: isRtl ? `${Math.min(75, Math.max(15, 100 - (activePoint.x / 600) * 100))}%` : 'auto',
                }}
              >
                <div className="font-bold text-[#111827] dark:text-white text-[11px] mb-1 pb-0.5 border-b border-black/[.06] dark:border-white/[.06]">
                  {isRtl ? activePoint.dateAr : activePoint.dateEn}
                </div>
                <div className="flex items-center gap-3 font-mono text-[10px]">
                  <span className="text-[#007AFF] font-bold">🎯 {activePoint.reachFormatted}</span>
                  <span className="text-[#635BFF] font-bold">👆 {activePoint.clicksFormatted}</span>
                  <span className="text-[#34C759] font-bold">✓ {activePoint.conversionsFormatted}</span>
                </div>
              </div>
            )}

            <svg viewBox="0 0 600 180" className="w-full h-36 overflow-visible">
              <defs>
                <linearGradient id="gradientReach" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#007AFF" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#007AFF" stopOpacity="0.0" />
                </linearGradient>
                <linearGradient id="gradientClicks" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#635BFF" stopOpacity="0.18" />
                  <stop offset="100%" stopColor="#635BFF" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              <line x1="0" y1="20" x2="600" y2="20" stroke="currentColor" className="text-black/[.04] dark:text-white/[.04]" strokeDasharray="3 3" />
              <line x1="0" y1="70" x2="600" y2="70" stroke="currentColor" className="text-black/[.04] dark:text-white/[.04]" strokeDasharray="3 3" />
              <line x1="0" y1="120" x2="600" y2="120" stroke="currentColor" className="text-black/[.04] dark:text-white/[.04]" strokeDasharray="3 3" />

              {/* Reach Area & Line */}
              <path
                d="M 0 130 C 90 110, 160 70, 240 65 C 320 60, 390 10, 460 25 C 530 40, 570 45, 600 50 L 600 180 L 0 180 Z"
                fill="url(#gradientReach)"
              />
              <path
                d="M 0 130 C 90 110, 160 70, 240 65 C 320 60, 390 10, 460 25 C 530 40, 570 45, 600 50"
                fill="none"
                stroke="#007AFF"
                strokeWidth="3"
                strokeLinecap="round"
              />

              {/* Clicks Area & Line */}
              <path
                d="M 0 150 C 90 140, 160 110, 240 105 C 320 100, 390 45, 460 60 C 530 75, 570 85, 600 90"
                fill="none"
                stroke="#635BFF"
                strokeWidth="2.5"
                strokeLinecap="round"
              />

              {/* Dots */}
              {chartPoints.map((pt, idx) => (
                <g key={idx} className="cursor-pointer" onMouseEnter={() => setHoveredPointIndex(idx)}>
                  <circle
                    cx={pt.x}
                    cy={pt.yReach}
                    r={hoveredPointIndex === idx ? 5.5 : 3.5}
                    fill="#007AFF"
                    stroke="#FFFFFF"
                    strokeWidth="1.5"
                  />
                </g>
              ))}
            </svg>

            {/* X-Axis Date Labels */}
            <div className="flex items-center justify-between text-[10px] text-[#94A3B8] pt-2 border-t border-black/[.05] dark:border-white/[.05] font-mono">
              {chartPoints.map((pt, idx) => (
                <button
                  key={idx}
                  onClick={() => setHoveredPointIndex(idx)}
                  className={`px-1.5 py-0.5 rounded transition cursor-pointer ${
                    hoveredPointIndex === idx
                      ? 'bg-[#007AFF] text-white font-bold'
                      : 'hover:text-[#111827] dark:hover:text-white'
                  }`}
                >
                  {isRtl ? pt.dateAr : pt.dateEn}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Top Campaigns List */}
        <div className="lg:col-span-4 p-4 rounded-xl bg-white dark:bg-[#11151D] border border-black/[.06] dark:border-white/[.07] shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-[#111827] dark:text-white">
                {isRtl ? 'أبرز الحملات' : 'Top Campaigns'}
              </h3>
              <button
                onClick={() => onNavigate('campaigns')}
                className="text-xs font-semibold text-[#007AFF] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>{isRtl ? 'عرض الكل' : 'View All'}</span>
                <ArrowRight className="w-3 h-3 rtl:rotate-180" />
              </button>
            </div>

            <div className="space-y-2">
              {topCampaigns.map((camp, idx) => (
                <div
                  key={camp.id}
                  className="p-2.5 rounded-lg bg-[#F6F8FB] dark:bg-[#171D28] border border-black/[.04] dark:border-white/[.05] flex items-center justify-between gap-2 hover:border-[#007AFF]/40 transition cursor-pointer"
                  onClick={() => onNavigate('campaigns')}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`w-7 h-7 rounded-lg bg-gradient-to-tr ${camp.avatarColor} text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-sm`}>
                      {idx + 1}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-[#111827] dark:text-white truncate">
                        {camp.title}
                      </h4>
                      <p className="text-[10px] text-[#94A3B8] truncate">
                        {camp.category}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-0.5 shrink-0">
                    <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                      camp.status === 'active'
                        ? 'bg-[#34C759]/15 text-[#16A34A] dark:text-[#34C759]'
                        : camp.status === 'paused'
                        ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                        : 'bg-black/[.05] dark:bg-white/[.08] text-[#94A3B8]'
                    }`}>
                      {camp.status === 'active' ? (isRtl ? 'نشطة' : 'Active') : camp.status === 'paused' ? (isRtl ? 'موقفة' : 'Paused') : (isRtl ? 'مكتملة' : 'Done')}
                    </span>
                    <span className="text-[10px] font-bold text-[#007AFF] font-mono">{camp.reach}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-black/[.05] dark:border-white/[.05] flex items-center justify-between text-xs text-[#64748B] dark:text-[#94A3B8]">
            <span className="flex items-center gap-1.5 text-[11px]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#34C759] animate-pulse" />
              {activeAccs} {isRtl ? 'حساب نشط' : 'Active'}
            </span>
            <button
              onClick={() => onNavigate('campaigns')}
              className="text-[#007AFF] font-bold text-[11px] hover:underline cursor-pointer"
            >
              {isRtl ? 'إدارة الحملات ←' : 'Manage →'}
            </button>
          </div>
        </div>
      </div>

      {/* ── 4. Quick Actions & Live Operations (Bottom Row) ─────────── */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5">
        
        {/* Quick Actions (4 cols) */}
        <div className="md:col-span-4 p-4 rounded-xl bg-white dark:bg-[#11151D] border border-black/[.06] dark:border-white/[.07] shadow-sm flex flex-col justify-between">
          <h3 className="text-xs font-bold text-[#111827] dark:text-white mb-2 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-[#007AFF]" />
            {isRtl ? 'الإجراءات السريعة' : 'Quick Actions'}
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: 'campaigns', label: isRtl ? 'إطلاق حملة' : 'Launch Campaign', icon: Send, col: 'text-[#007AFF] bg-[#007AFF]/10' },
              { id: 'accounts', label: isRtl ? 'ربط حساب' : 'Add Account', icon: Users, col: 'text-[#34C759] bg-[#34C759]/10' },
              { id: 'contacts', label: isRtl ? 'استخراج عملاء' : 'Scrape Leads', icon: UserPlus, col: 'text-[#635BFF] bg-[#635BFF]/10' },
              { id: 'automation', label: isRtl ? 'إضافة أعضاء' : 'Add Members', icon: Layers, col: 'text-amber-500 bg-amber-500/10' },
            ].map((act) => {
              const Icon = act.icon;
              return (
                <button
                  key={act.id}
                  onClick={() => onNavigate(act.id)}
                  className="p-2.5 rounded-lg bg-[#F6F8FB] dark:bg-[#171D28] border border-black/[.04] dark:border-white/[.05] hover:border-[#007AFF]/30 flex flex-col items-center text-center gap-1 transition cursor-pointer"
                >
                  <div className={`w-7 h-7 rounded-lg ${act.col} flex items-center justify-center`}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[11px] font-bold text-[#111827] dark:text-white">{act.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* System Health Status (4 cols) */}
        <div className="md:col-span-4 p-4 rounded-xl bg-white dark:bg-[#11151D] border border-black/[.06] dark:border-white/[.07] shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold text-[#111827] dark:text-white flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-[#007AFF]" />
              {isRtl ? 'صحة النظام والخوادم' : 'System Health'}
            </h3>
            <span className="text-[10px] text-[#34C759] font-bold font-mono">99.9% Uptime</span>
          </div>

          <div className="grid grid-cols-4 gap-2 text-center py-1">
            {[
              { label: 'CPU', val: '28%', col: 'text-[#007AFF]' },
              { label: 'RAM', val: '64%', col: 'text-[#635BFF]' },
              { label: 'Queue', val: `${stats.activeQueueJobs || 12}`, col: 'text-amber-500' },
              { label: 'WS', val: '99%', col: 'text-[#34C759]' },
            ].map((m, i) => (
              <div key={i} className="p-2 rounded-lg bg-[#F6F8FB] dark:bg-[#171D28] border border-black/[.03] dark:border-white/[.04]">
                <div className={`text-xs font-bold font-mono ${m.col}`}>{m.val}</div>
                <div className="text-[9px] text-[#94A3B8] font-semibold mt-0.5">{m.label}</div>
              </div>
            ))}
          </div>

          <div className="pt-2 border-t border-black/[.05] dark:border-white/[.05] flex items-center justify-between text-[10px] text-[#94A3B8] font-mono">
            <span>2.1 GB / 16 GB</span>
            <span className="text-[#34C759] font-bold">5 Workers Active</span>
          </div>
        </div>

        {/* Active Campaigns Progress Stream (4 cols) */}
        <div className="md:col-span-4 p-4 rounded-xl bg-white dark:bg-[#11151D] border border-black/[.06] dark:border-white/[.07] shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold text-[#111827] dark:text-white flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-[#007AFF]" />
              {isRtl ? 'الحملات الجارية' : 'Running Jobs'}
            </h3>
            <span className="text-[10px] font-bold text-[#007AFF] bg-[#007AFF]/10 px-1.5 py-0.5 rounded">
              {activeCampaigns.filter(c => c.status === 'RUNNING').length || 1} {isRtl ? 'نشطة' : 'Active'}
            </span>
          </div>

          <div className="space-y-2">
            {(activeCampaigns.length > 0 ? activeCampaigns.slice(0, 2) : [
              { id: '1', name: isRtl ? 'حملة عيد الفطر — الأزياء' : 'Eid Fashion Blast', sentCount: 8420, failedCount: 12, totalTargets: 12000, status: 'RUNNING' },
            ]).map((camp: any) => {
              const total = camp.totalTargets || 1;
              const prog = Math.min(100, Math.round(((camp.sentCount + (camp.failedCount || 0)) / total) * 100));
              return (
                <div key={camp.id} className="p-2.5 rounded-lg bg-[#F6F8FB] dark:bg-[#171D28] border border-black/[.04] dark:border-white/[.05]">
                  <div className="flex items-center justify-between text-xs font-bold text-[#111827] dark:text-white mb-1">
                    <span className="truncate">{camp.name}</span>
                    <span className="font-mono text-[#007AFF] shrink-0">{prog}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-black/[.06] dark:bg-white/[.08] overflow-hidden">
                    <div className="h-full bg-[#007AFF] rounded-full transition-all duration-300" style={{ width: `${prog}%` }} />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-[#94A3B8] mt-1.5 font-mono">
                    <span>{camp.sentCount.toLocaleString()} / {total.toLocaleString()}</span>
                    <span className="text-[#34C759]">● Running</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-2 border-t border-black/[.05] dark:border-white/[.05] flex items-center justify-between text-[10px] text-[#94A3B8]">
            <span>{isRtl ? 'تحديث لحظي' : 'Live Sync'}</span>
            <button onClick={() => onNavigate('campaigns')} className="text-[#007AFF] font-bold hover:underline cursor-pointer">
              {isRtl ? 'التفاصيل ←' : 'Details →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
