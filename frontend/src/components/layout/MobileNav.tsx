'use client';

import React from 'react';
import {
  LayoutDashboard,
  Users,
  Send,
  Layers,
  Bot,
  Server,
  Activity,
  Settings,
  Radio,
  ShieldCheck,
  CreditCard,
  X,
} from 'lucide-react';
import { clsx } from 'clsx';
import { translations, Language } from '../../lib/translations';

interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  lang: Language;
  wsConnected: boolean;
  user?: any;
}

export function MobileNav({
  isOpen,
  onClose,
  activeTab,
  setActiveTab,
  lang,
  wsConnected,
  user,
}: MobileNavProps) {
  const t = translations[lang];

  const allNavItems = [
    { id: 'overview', label: t.navOverview, icon: LayoutDashboard },
    { id: 'accounts', label: t.navAccounts, icon: Users },
    { id: 'campaigns', label: t.navCampaigns, icon: Send },
    { id: 'contacts', label: t.navContacts, icon: Layers },
    { id: 'automation', label: t.navAutomation, icon: Bot },
    { id: 'bots', label: lang === 'ar' ? 'البوتات الرسمية' : 'Official Bots', icon: Radio },
    { id: 'proxies', label: t.navProxies, icon: Server },
    { id: 'activity', label: t.navActivity, icon: Activity },
    { id: 'system', label: t.navSystem, icon: Settings },
    { id: 'billing', label: t.navBilling, icon: CreditCard },
    ...((user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN' || user?.role === 'OWNER')
      ? [{ id: 'admin', label: lang === 'ar' ? 'لوحة القيادة (الأدمن)' : 'Admin Center', icon: ShieldCheck }]
      : []),
  ];

  // Bottom 4 primary thumb tabs
  const bottomBarItems = [
    { id: 'overview', label: t.navOverview, icon: LayoutDashboard },
    { id: 'accounts', label: t.navAccounts, icon: Users },
    { id: 'campaigns', label: t.navCampaigns, icon: Send },
    { id: 'activity', label: t.navActivity, icon: Activity },
  ];

  return (
    <>
      {/* Slide-over Drawer for Mobile */}
      {isOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          {/* Backdrop */}
          <div
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
          />

          {/* Drawer Content */}
          <div className="relative w-72 max-w-[80vw] bg-white dark:bg-[#090D16] border-e border-slate-200 dark:border-white/[0.08] h-full flex flex-col z-10 shadow-xl animate-slide-up text-start">
            <div className="h-16 px-4 border-b border-slate-200 dark:border-white/[0.08] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-brand-primary flex items-center justify-center text-white shadow-sm">
                  <Send className="w-4 h-4 rtl:rotate-180" />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-sm text-slate-900 dark:text-white">TgCloud</span>
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300">
                    Pro
                  </span>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-white/10 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Links */}
            <div className="flex-1 py-4 px-3 space-y-1 overflow-y-auto no-scrollbar">
              {allNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      onClose();
                    }}
                    className={clsx(
                      'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer',
                      isActive
                        ? 'bg-brand-primary text-white shadow-sm shadow-brand-primary/25 font-bold'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.05]'
                    )}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Status Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-white/[0.08] flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-2">
                <span
                  className={clsx(
                    'w-2 h-2 rounded-full',
                    wsConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
                  )}
                />
                <span className="font-medium">{wsConnected ? (lang === 'ar' ? 'متصل' : 'Online') : (lang === 'ar' ? 'غير متصل' : 'Offline')}</span>
              </div>
              <span className="text-[10px] font-mono text-slate-400">v2.8</span>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation Bar for Mobile (<640px) */}
      <nav className="sm:hidden fixed bottom-0 inset-x-0 h-16 bg-white/90 dark:bg-[#090D16]/90 backdrop-blur-xl border-t border-slate-200 dark:border-white/[0.08] z-30 flex items-center justify-around px-2">
        {bottomBarItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={clsx(
                'flex flex-col items-center justify-center gap-1 flex-1 py-1 rounded-xl transition cursor-pointer',
                isActive ? 'text-brand-primary font-bold' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              )}
            >
              <Icon className={clsx('w-4 h-4 transition-transform', isActive && 'scale-110')} />
              <span className="text-[10px] truncate max-w-[65px]">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
}
