'use client';

import React, { useState } from 'react';
import {
  LayoutDashboard,
  Users,
  Send,
  Layers,
  Bot,
  Server,
  Activity,
  Settings,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  Check,
  Zap,
  Radio,
  ShieldAlert,
  CreditCard,
  MessageSquare,
  Copy,
} from 'lucide-react';
import { clsx } from 'clsx';
import { translations, Language } from '../../lib/translations';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
  lang: Language;
  wsConnected: boolean;
  user?: any;
  accountsCount?: number;
  activeCampaignsCount?: number;
}

export function Sidebar({
  activeTab,
  setActiveTab,
  collapsed,
  setCollapsed,
  lang,
  wsConnected,
  user,
  accountsCount,
  activeCampaignsCount,
}: SidebarProps) {
  const isRtl = lang === 'ar';
  const t = translations[lang];
  const [showOrgMenu, setShowOrgMenu] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState('EMT Enterprise');

  const orgs = [
    { id: '1', name: 'EMT Enterprise', plan: 'Enterprise' },
    { id: '2', name: 'Growth Marketing (EMT)', plan: 'Scale' },
  ];

  const navSections = [
    {
      title: isRtl ? 'الرئيسية' : 'General',
      items: [
        {
          id: 'overview',
          label: t.navOverview,
          icon: LayoutDashboard,
          badge: null,
        },
        {
          id: 'accounts',
          label: t.navAccounts,
          icon: Users,
          badge: accountsCount !== undefined ? `${accountsCount}` : undefined,
        },
        {
          id: 'campaigns',
          label: t.navCampaigns,
          icon: Send,
          badge: activeCampaignsCount && activeCampaignsCount > 0 ? `${activeCampaignsCount}` : undefined,
        },
        {
          id: 'inbox',
          label: isRtl ? 'صندوق الوارد' : 'Inbox',
          icon: MessageSquare,
          badge: 'Live',
        },
      ],
    },
    {
      title: isRtl ? 'أدوات التوسع' : 'Growth Tools',
      items: [
        {
          id: 'contacts',
          label: t.navContacts,
          icon: Layers,
          badge: null,
        },
        {
          id: 'automation',
          label: t.navAutomation,
          icon: Bot,
          badge: null,
        },
        {
          id: 'cloner',
          label: isRtl ? 'مستنسخ القنوات' : 'Cloner',
          icon: Copy,
          badge: 'PRO',
        },
        {
          id: 'bots',
          label: isRtl ? 'البوتات الرسمية' : 'Official Bots',
          icon: Radio,
          badge: isRtl ? 'جديد' : 'NEW',
        },
        {
          id: 'proxies',
          label: t.navProxies,
          icon: Server,
          badge: null,
        },
      ],
    },
    {
      title: isRtl ? 'النظام' : 'System',
      items: [
        {
          id: 'activity',
          label: t.navActivity,
          icon: Activity,
          badge: null,
        },
        {
          id: 'system',
          label: t.navSystem,
          icon: Settings,
          badge: null,
        },
        {
          id: 'billing',
          label: t.navBilling,
          icon: CreditCard,
          badge: null,
        },
      ],
    },
    ...(user && (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN' || user.role === 'OWNER')
      ? [
          {
            title: isRtl ? 'الإدارة' : 'Admin',
            items: [
              {
                id: 'admin',
                label: isRtl ? 'غرفة القيادة' : 'Admin Center',
                icon: ShieldAlert,
                badge: isRtl ? 'أدمن' : 'ADMIN',
              },
            ],
          },
        ]
      : []),
  ];

  return (
    <aside
      className={clsx(
        'hidden lg:flex flex-col h-screen sticky top-0 z-30 select-none text-start transition-all duration-200 shrink-0',
        'bg-white dark:bg-[#0D111A] border-e border-black/[.06] dark:border-white/[.07]',
        collapsed ? 'w-14' : 'w-60'
      )}
    >
      {/* ── Brand / Workspace Header ──────────────────────────── */}
      <div className="h-14 px-3 border-b border-black/[.05] dark:border-white/[.06] flex items-center justify-between shrink-0 relative">
        {!collapsed ? (
          <div className="relative w-full">
            <button
              onClick={() => setShowOrgMenu(!showOrgMenu)}
              className="w-full flex items-center justify-between p-1 rounded-lg hover:bg-black/[.03] dark:hover:bg-white/[.04] transition text-start cursor-pointer group"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-[#007AFF] flex items-center justify-center text-white font-bold text-xs shadow-sm shrink-0">
                  <Send className="w-3.5 h-3.5 rtl:rotate-180" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-[#111827] dark:text-white truncate leading-tight">
                    {user?.orgName || selectedOrg}
                  </p>
                  <p className="text-[10px] text-[#94A3B8] font-medium truncate">
                    Enterprise
                  </p>
                </div>
              </div>
              <ChevronsUpDown className="w-3 h-3 text-[#94A3B8] shrink-0 ms-1" />
            </button>

            {/* Dropdown */}
            {showOrgMenu && (
              <div className="absolute top-full start-0 end-0 mt-1 p-1 rounded-xl bg-white dark:bg-[#171D28] border border-black/[.08] dark:border-white/10 shadow-lg z-50 text-start">
                {orgs.map((org) => (
                  <button
                    key={org.id}
                    onClick={() => {
                      setSelectedOrg(org.name);
                      setShowOrgMenu(false);
                    }}
                    className="w-full flex items-center justify-between p-1.5 rounded-lg text-xs hover:bg-[#F6F8FB] dark:hover:bg-white/5 transition text-start"
                  >
                    <div>
                      <p className="font-semibold text-[#111827] dark:text-white">{org.name}</p>
                      <p className="text-[10px] text-[#94A3B8]">{org.plan}</p>
                    </div>
                    {selectedOrg === org.name && <Check className="w-3.5 h-3.5 text-[#007AFF] shrink-0" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div
            onClick={() => setCollapsed(false)}
            className="w-7 h-7 rounded-lg bg-[#007AFF] flex items-center justify-center text-white mx-auto cursor-pointer shadow-sm hover:scale-105 transition-transform"
            title="Expand"
          >
            <Send className="w-3.5 h-3.5 rtl:rotate-180" />
          </div>
        )}

        {/* Toggle Collapse */}
        {!collapsed && (
          <button
            onClick={() => setCollapsed(true)}
            className="p-1 rounded-md text-[#94A3B8] hover:text-[#111827] dark:hover:text-white hover:bg-black/[.04] dark:hover:bg-white/5 transition cursor-pointer shrink-0 ms-1"
            title={isRtl ? 'تصغير' : 'Collapse'}
            aria-label="Collapse"
          >
            {isRtl ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>

      {/* ── Navigation Sections ───────────────────────────────── */}
      <div className="flex-1 py-2 px-2 space-y-3 overflow-y-auto no-scrollbar">
        {navSections.map((section, idx) => (
          <div key={idx} className="space-y-0.5">
            {!collapsed && (
              <div className="px-2 py-1 text-[9.5px] font-bold text-[#94A3B8] uppercase tracking-wider">
                {section.title}
              </div>
            )}

            {section.items.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={clsx(
                    'w-full flex items-center rounded-lg text-xs font-semibold transition-all duration-100 cursor-pointer group relative',
                    collapsed ? 'p-2 justify-center' : 'px-2.5 py-1.5 justify-between',
                    isActive
                      ? 'bg-[#007AFF] text-white font-bold shadow-xs'
                      : 'text-[#64748B] dark:text-[#94A3B8] hover:text-[#111827] dark:hover:text-white hover:bg-black/[.04] dark:hover:bg-white/[0.05]'
                  )}
                  title={collapsed ? item.label : undefined}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Icon
                      className={clsx(
                        'w-3.5 h-3.5 shrink-0',
                        isActive
                          ? 'text-white'
                          : 'text-[#94A3B8] group-hover:text-[#111827] dark:group-hover:text-white'
                      )}
                    />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </div>

                  {!collapsed && item.badge && (
                    <span
                      className={clsx(
                        'text-[9.5px] px-1.5 py-0.2 rounded font-mono font-bold',
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-black/[.05] dark:bg-white/10 text-[#64748B] dark:text-[#94A3B8]'
                      )}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* ── Footer Status ─────────────────────────────────────── */}
      <div className="p-2.5 border-t border-black/[.05] dark:border-white/[.06] shrink-0">
        {!collapsed ? (
          <div className="flex items-center justify-between px-1.5 text-xs text-[#94A3B8]">
            <div className="flex items-center gap-1.5 min-w-0">
              <span
                className={clsx(
                  'w-1.5 h-1.5 rounded-full shrink-0',
                  wsConnected ? 'bg-[#34C759] animate-pulse' : 'bg-rose-500'
                )}
              />
              <span className="text-[10px] font-medium truncate">
                {wsConnected
                  ? isRtl ? 'متصل • 12ms' : 'Online • 12ms'
                  : isRtl ? 'غير متصل' : 'Offline'}
              </span>
            </div>
            <span className="text-[9.5px] font-mono text-[#94A3B8]">v2.8</span>
          </div>
        ) : (
          <div className="flex justify-center py-0.5">
            <span
              className={clsx(
                'w-1.5 h-1.5 rounded-full',
                wsConnected ? 'bg-[#34C759] animate-pulse' : 'bg-rose-500'
              )}
              title={wsConnected ? 'Connected' : 'Disconnected'}
            />
          </div>
        )}
      </div>
    </aside>
  );
}
