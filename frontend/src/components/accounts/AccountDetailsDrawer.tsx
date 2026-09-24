'use client';

import React, { useState } from 'react';
import {
  X,
  Shield,
  Activity,
  Server,
  Send,
  Lock,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  Save,
} from 'lucide-react';
import { translations, Language } from '../../lib/translations';
import { Badge } from '../ui/Badge';
import { updateAccount, checkAccount } from '../../lib/api';
import { useToast } from '../ui/ToastContext';

interface AccountDetailsDrawerProps {
  account: any;
  isOpen: boolean;
  onClose: () => void;
  onUpdated: () => void;
  proxies: any[];
  lang: Language;
}

export function AccountDetailsDrawer({
  account,
  isOpen,
  onClose,
  onUpdated,
  proxies,
  lang,
}: AccountDetailsDrawerProps) {
  const isRtl = lang === 'ar';
  const [activeTab, setActiveTab] = useState<'overview' | 'health' | 'proxy' | 'security'>('overview');
  const [dailyLimit, setDailyLimit] = useState(account?.dailyLimit || 40);
  const [warmupMode, setWarmupMode] = useState(account?.warmupMode ?? true);
  const [proxyId, setProxyId] = useState(account?.proxyId || '');
  const [isSaving, setIsSaving] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const toast = useToast();
  const t = translations[lang];

  if (!isOpen || !account) return null;

  const handleSaveSettings = async () => {
    try {
      setIsSaving(true);
      await updateAccount(account.id, {
        dailyLimit: Number(dailyLimit),
        warmupMode,
        proxyId: proxyId || null,
      });
      toast.success(isRtl ? 'تم حفظ التعديلات' : 'Settings saved successfully');
      onUpdated();
    } catch (err: any) {
      toast.error(isRtl ? 'فشل حفظ التعديلات' : 'Failed to save', err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleHealthTest = async () => {
    try {
      setIsChecking(true);
      toast.info(isRtl ? 'جاري فحص الاتصال...' : 'Testing MTProto session...');
      await checkAccount(account.id);
      toast.success(isRtl ? 'اتصال الحساب سليم وموثق' : 'Account test passed!');
      onUpdated();
    } catch (err: any) {
      toast.error(isRtl ? 'فشل فحص الحساب' : 'Health test failed', err.message);
    } finally {
      setIsChecking(false);
    }
  };

  const tabs = [
    { id: 'overview', label: isRtl ? 'نظرة عامة' : 'Overview', icon: Smartphone },
    { id: 'health', label: isRtl ? 'الصحة والحدود' : 'Health & Quota', icon: Activity },
    { id: 'proxy', label: isRtl ? 'البروكسي' : 'Proxy', icon: Server },
    { id: 'security', label: isRtl ? 'الأمان والجلسة' : 'Security', icon: Shield },
  ];

  return (
    <div className="fixed inset-0 z-50 flex justify-end select-none">
      {/* Backdrop */}
      <div onClick={onClose} className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-[fadeIn_0.15s_ease-out]" />

      {/* Drawer Panel */}
      <div className="relative w-full max-w-md bg-white dark:bg-[#11151D] border-s border-black/[.08] dark:border-white/10 h-full flex flex-col z-10 shadow-2xl animate-[slideIn_0.2s_ease-out] text-start">
        
        {/* Header */}
        <div className="p-4 border-b border-black/[.05] dark:border-white/[.06] flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-[#007AFF]/10 text-[#007AFF] flex items-center justify-center font-bold text-xs shrink-0">
              {account.firstName ? account.firstName[0] : 'T'}
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-[#111827] dark:text-white font-mono truncate">{account.phone}</h3>
              <p className="text-[10px] text-[#94A3B8] truncate">
                {account.firstName || 'Telegram Account'} {account.username ? `(@${account.username})` : ''}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#94A3B8] hover:text-[#111827] dark:hover:text-white hover:bg-black/[.04] dark:hover:bg-white/5 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 px-3 border-b border-black/[.05] dark:border-white/[.06] bg-[#F6F8FB] dark:bg-[#171D28] text-xs">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-1.5 px-3 py-2.5 font-bold transition border-b-2 cursor-pointer ${
                  isActive
                    ? 'border-[#007AFF] text-[#007AFF]'
                    : 'border-transparent text-[#64748B] dark:text-[#94A3B8] hover:text-[#111827] dark:hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Body Content */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3.5 text-xs text-[#111827] dark:text-white">
          
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-3 rounded-xl border border-black/[.06] dark:border-white/[.07] bg-[#F6F8FB] dark:bg-[#171D28]">
                  <span className="text-[#94A3B8] text-[10px] block">{isRtl ? 'حالة الحساب' : 'Status'}</span>
                  <span className="mt-1 block">
                    <Badge variant={account.status === 'ACTIVE' ? 'success' : account.status === 'FLOOD_WAIT' ? 'warning' : 'error'}>
                      {account.status}
                    </Badge>
                  </span>
                </div>
                <div className="p-3 rounded-xl border border-black/[.06] dark:border-white/[.07] bg-[#F6F8FB] dark:bg-[#171D28]">
                  <span className="text-[#94A3B8] text-[10px] block">{isRtl ? 'مؤشر الصحة' : 'Health Score'}</span>
                  <span className="font-bold text-sm text-[#34C759] mt-1 block font-mono">
                    {account.healthScore ?? 100}% ({account.tier || 'TIER_1'})
                  </span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl border border-black/[.06] dark:border-white/[.07] bg-[#F6F8FB] dark:bg-[#171D28] space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-black/[.04] dark:border-white/[.05]">
                  <span className="text-[#94A3B8]">{isRtl ? 'مرسل اليوم:' : 'Sent Today:'}</span>
                  <span className="font-bold font-mono text-[#111827] dark:text-white">{account.sentToday || 0} / {account.dailyLimit || 40}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-black/[.04] dark:border-white/[.05]">
                  <span className="text-[#94A3B8]">{isRtl ? 'إجمالي الرسائل الناجحة:' : 'Total Sent:'}</span>
                  <span className="font-bold font-mono text-[#34C759]">{account.totalSent || 0}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-black/[.04] dark:border-white/[.05]">
                  <span className="text-[#94A3B8]">{isRtl ? 'الرسائل الفاشلة:' : 'Failed:'}</span>
                  <span className="font-bold font-mono text-rose-500">{account.totalFailed || 0}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-[#94A3B8]">{isRtl ? 'تاريخ الربط:' : 'Added Date:'}</span>
                  <span className="font-mono text-[#111827] dark:text-white">{new Date(account.createdAt).toLocaleDateString()}</span>
                </div>
              </div>

              <button
                onClick={handleHealthTest}
                disabled={isChecking}
                className="w-full py-2.5 rounded-xl border border-black/[.08] dark:border-white/10 hover:bg-[#34C759]/10 text-xs font-bold text-[#111827] dark:text-white flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <Activity className="w-3.5 h-3.5 text-[#34C759]" />
                <span>{isChecking ? (isRtl ? 'جاري الفحص...' : 'Testing...') : (isRtl ? 'إعادة فحص الاتصال' : 'Test MTProto Health')}</span>
              </button>
            </div>
          )}

          {/* Health & Quota Tab */}
          {activeTab === 'health' && (
            <div className="space-y-3">
              <div className="p-3.5 rounded-xl border border-black/[.06] dark:border-white/[.07] bg-[#F6F8FB] dark:bg-[#171D28] space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-[#111827] dark:text-white">{isRtl ? 'الحد اليومي للرسائل' : 'Daily Message Limit'}</label>
                  <span className="font-bold font-mono text-[#007AFF]">{dailyLimit} / {isRtl ? 'يوم' : 'day'}</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="150"
                  step="5"
                  value={dailyLimit}
                  onChange={(e) => setDailyLimit(Number(e.target.value))}
                  className="w-full accent-[#007AFF] cursor-pointer"
                />
              </div>

              <div className="p-3.5 rounded-xl border border-black/[.06] dark:border-white/[.07] bg-[#F6F8FB] dark:bg-[#171D28] flex items-center justify-between">
                <div>
                  <p className="font-bold text-[#111827] dark:text-white">{isRtl ? 'نظام الإحماء الآلي' : 'Auto Warmup Mode'}</p>
                  <p className="text-[10px] text-[#94A3B8]">{isRtl ? 'تدرج آمن لرفع معدل الإرسال' : 'Gradually scale limits safely'}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setWarmupMode(!warmupMode)}
                  className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer ${
                    warmupMode ? 'bg-[#34C759]' : 'bg-black/[.15] dark:bg-white/20'
                  }`}
                >
                  <span className={`w-3.5 h-3.5 bg-white rounded-full absolute top-0.5 transition-transform ${warmupMode ? 'start-5.5' : 'start-1'}`} />
                </button>
              </div>

              <button
                onClick={handleSaveSettings}
                disabled={isSaving}
                className="w-full py-2.5 rounded-xl bg-[#007AFF] hover:bg-[#0062CC] text-white text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer shadow-sm"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSaving ? (isRtl ? 'جاري الحفظ...' : 'Saving...') : (isRtl ? 'حفظ التعديلات' : 'Save Changes')}</span>
              </button>
            </div>
          )}

          {/* Proxy Tab */}
          {activeTab === 'proxy' && (
            <div className="space-y-3">
              <div className="p-3.5 rounded-xl border border-black/[.06] dark:border-white/[.07] bg-[#F6F8FB] dark:bg-[#171D28] space-y-2">
                <label className="text-xs font-bold text-[#111827] dark:text-white block">{isRtl ? 'البروكسي المعين لهذا الحساب' : 'Assigned Proxy'}</label>
                <select
                  value={proxyId}
                  onChange={(e) => setProxyId(e.target.value)}
                  className="w-full p-2 bg-white dark:bg-[#11151D] border border-black/[.08] dark:border-white/10 rounded-lg text-xs font-mono text-[#111827] dark:text-white focus:outline-none focus:border-[#007AFF] cursor-pointer"
                >
                  <option value="">{isRtl ? 'اتصال مباشر (بدون بروكسي)' : 'Direct connection (No proxy)'}</option>
                  {proxies.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.protocol}://{p.host}:{p.port} ({p.status})
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleSaveSettings}
                disabled={isSaving}
                className="w-full py-2.5 rounded-xl bg-[#007AFF] hover:bg-[#0062CC] text-white text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer shadow-sm"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSaving ? (isRtl ? 'جاري الحفظ...' : 'Saving...') : (isRtl ? 'تحديث البروكسي' : 'Update Proxy')}</span>
              </button>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <div className="space-y-3">
              <div className="p-3.5 rounded-xl border border-black/[.06] dark:border-white/[.07] bg-[#F6F8FB] dark:bg-[#171D28] space-y-1.5">
                <p className="font-bold text-[#111827] dark:text-white">{isRtl ? 'تشفير الجلسة' : 'Session Encryption'}</p>
                <p className="text-[11px] text-[#94A3B8] leading-relaxed">
                  {isRtl ? 'جلسة MTProto مشفرة محلياً بمفتاح AES-256 فريد ومعزول في خوادم النظام.' : 'MTProto session is hardware-encrypted with isolated credentials.'}
                </p>
                <div className="p-2 rounded-lg bg-white dark:bg-[#11151D] border border-black/[.06] dark:border-white/[.07] font-mono text-[10px] text-[#94A3B8] break-all">
                  {account.sessionStringEncrypted
                    ? `${account.sessionStringEncrypted.substring(0, 32)}••••••••••••`
                    : 'Encrypted hardware session pool'}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
