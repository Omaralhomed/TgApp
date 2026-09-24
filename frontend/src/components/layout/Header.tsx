'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Menu,
  Sun,
  Moon,
  Plus,
  LogOut,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Globe2,
} from 'lucide-react';
import { translations, Language } from '../../lib/translations';
import { logoutUser } from '../../lib/api';

interface HeaderProps {
  activeTab: string;
  lang: Language;
  setLang: (lang: Language) => void;
  onOpenCommandPalette: () => void;
  onOpenMobileDrawer: () => void;
  onQuickAction: () => void;
  user: any;
  setUser: (u: any) => void;
  openAuthModal: () => void;
  wsConnected?: boolean;
}

export function Header({
  activeTab,
  lang,
  setLang,
  onOpenCommandPalette,
  onOpenMobileDrawer,
  onQuickAction,
  user,
  setUser,
  openAuthModal,
  wsConnected = true,
}: HeaderProps) {
  const isRtl = lang === 'ar';
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const t = translations[lang];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isDark = document.documentElement.classList.contains('dark');
      setIsDarkMode(isDark);
    }
  }, []);

  const toggleTheme = () => {
    if (typeof window !== 'undefined') {
      const root = document.documentElement;
      if (root.classList.contains('dark')) {
        root.classList.remove('dark');
        setIsDarkMode(false);
        localStorage.setItem('tg_theme', 'light');
      } else {
        root.classList.add('dark');
        setIsDarkMode(true);
        localStorage.setItem('tg_theme', 'dark');
      }
    }
  };

  const handleLogout = () => {
    logoutUser();
    setUser(null);
    setShowUserMenu(false);
  };

  const getTabInfo = (tab: string) => {
    switch (tab) {
      case 'overview':
        return { title: t.navOverview, category: isRtl ? 'الرئيسية' : 'General' };
      case 'accounts':
        return { title: t.navAccounts, category: isRtl ? 'الرئيسية' : 'General' };
      case 'campaigns':
        return { title: t.navCampaigns, category: isRtl ? 'الرئيسية' : 'General' };
      case 'contacts':
        return { title: t.navContacts, category: isRtl ? 'التوسع' : 'Growth' };
      case 'automation':
        return { title: t.navAutomation, category: isRtl ? 'التوسع' : 'Growth' };
      case 'bots':
        return { title: isRtl ? 'البوتات الرسمية' : 'Official Bots', category: isRtl ? 'التوسع' : 'Growth' };
      case 'proxies':
        return { title: t.navProxies, category: isRtl ? 'التوسع' : 'Growth' };
      case 'activity':
        return { title: t.navActivity, category: isRtl ? 'النظام' : 'System' };
      case 'system':
        return { title: t.navSystem, category: isRtl ? 'النظام' : 'System' };
      case 'billing':
        return { title: t.navBilling, category: isRtl ? 'الفوترة' : 'Billing' };
      case 'admin':
        return { title: isRtl ? 'غرفة القيادة' : 'Admin Center', category: isRtl ? 'الإدارة' : 'Admin' };
      default:
        return { title: t.navOverview, category: isRtl ? 'الرئيسية' : 'General' };
    }
  };

  const tabInfo = getTabInfo(activeTab);

  return (
    <header className="h-14 border-b border-black/[.06] dark:border-white/[.07] bg-white/80 dark:bg-[#0D111A]/90 backdrop-blur-md px-3 sm:px-5 flex items-center justify-between gap-3 sticky top-0 z-20 select-none">
      {/* ── Left: Mobile Menu & Breadcrumbs ───────────────────── */}
      <div className="flex items-center gap-2 min-w-0">
        <button
          onClick={onOpenMobileDrawer}
          className="lg:hidden p-1.5 rounded-lg border border-black/[.08] dark:border-white/10 text-[#64748B] hover:bg-black/[.04] dark:hover:bg-white/5 transition shrink-0"
          aria-label="Open Navigation"
        >
          <Menu className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-1.5 text-xs min-w-0">
          <span className="text-[#94A3B8] font-medium hidden sm:inline truncate">
            {tabInfo.category}
          </span>
          <span className="hidden sm:inline text-[#94A3B8]">
            {isRtl ? <ChevronLeft className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          </span>
          <span className="font-bold text-[#111827] dark:text-white truncate">
            {tabInfo.title}
          </span>
        </div>
      </div>

      {/* ── Center: Search Omnibar ────────────────────────────── */}
      <div className="flex-1 max-w-xs hidden md:block">
        <button
          onClick={onOpenCommandPalette}
          className="w-full h-8 flex items-center justify-between px-2.5 rounded-lg border border-black/[.06] dark:border-white/[.07] bg-[#F6F8FB] dark:bg-[#171D28] hover:border-[#007AFF]/40 text-xs text-[#94A3B8] hover:text-[#111827] dark:hover:text-white transition cursor-pointer"
        >
          <div className="flex items-center gap-1.5 truncate">
            <Search className="w-3.5 h-3.5 text-[#94A3B8]" />
            <span className="truncate">{t.searchPlaceholder}</span>
          </div>
          <kbd className="px-1 py-0.2 rounded bg-white dark:bg-white/10 border border-black/[.06] dark:border-white/10 text-[10px] font-mono text-[#94A3B8] shrink-0">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* ── Right: Action Controls ────────────────────────────── */}
      <div className="flex items-center gap-1.5 shrink-0">
        {/* Quick Action Button */}
        <button
          onClick={onQuickAction}
          className="h-8 px-2.5 sm:px-3 rounded-lg bg-[#007AFF] hover:bg-[#0062CC] text-white text-xs font-bold flex items-center gap-1 shadow-sm transition active:scale-95 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">
            {activeTab === 'campaigns' ? t.createCampaign : (isRtl ? 'حملة جديدة' : 'New Campaign')}
          </span>
        </button>

        {/* Theme Toggle (Light / Dark) */}
        <button
          onClick={toggleTheme}
          className="h-8 w-8 rounded-lg text-[#64748B] dark:text-[#94A3B8] hover:text-[#111827] dark:hover:text-white hover:bg-black/[.04] dark:hover:bg-white/5 transition flex items-center justify-center cursor-pointer"
          title={isDarkMode ? (isRtl ? 'الوضع المضيء' : 'Light Mode') : (isRtl ? 'الوضع الليلي' : 'Dark Mode')}
          aria-label="Toggle Theme"
        >
          {isDarkMode ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-[#635BFF]" />}
        </button>

        {/* Language Switch */}
        <button
          onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
          className="h-8 px-2 rounded-lg border border-black/[.07] dark:border-white/[.08] text-xs font-bold text-[#64748B] dark:text-[#94A3B8] hover:text-[#111827] dark:hover:text-white hover:bg-black/[.04] dark:hover:bg-white/5 transition flex items-center gap-1 cursor-pointer"
        >
          <Globe2 className="w-3 h-3" />
          <span>{lang === 'ar' ? 'EN' : 'عر'}</span>
        </button>

        {/* User Quota Bar */}
        {user && (
          <div className="hidden xl:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-[#F6F8FB] dark:bg-[#171D28] border border-black/[.05] dark:border-white/[.06] text-[11px]">
            <span className="text-[#94A3B8]">{isRtl ? 'الرصيد:' : 'Quota:'}</span>
            <span className="font-bold font-mono text-[#111827] dark:text-white">
              {(user.quotaMessagesUsed || 0).toLocaleString()} / {(user.quotaMessagesLimit || 1000).toLocaleString()}
            </span>
          </div>
        )}

        {/* User Menu */}
        <div className="relative shrink-0" ref={userMenuRef}>
          <button
            onClick={() => (user ? setShowUserMenu(!showUserMenu) : openAuthModal())}
            className="flex items-center gap-1.5 p-1 rounded-lg hover:bg-black/[.04] dark:hover:bg-white/5 transition cursor-pointer"
          >
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-[#007AFF] to-[#635BFF] text-white flex items-center justify-center font-bold text-xs shadow-xs shrink-0">
              {user ? (user.name ? user.name[0].toUpperCase() : user.email[0].toUpperCase()) : 'U'}
            </div>
            <span className="text-xs font-semibold text-[#111827] dark:text-white hidden md:inline truncate max-w-[80px]">
              {user?.name || (isRtl ? 'المستخدم' : 'User')}
            </span>
            <ChevronDown className="w-3 h-3 text-[#94A3B8]" />
          </button>

          {/* User Menu Dropdown */}
          {showUserMenu && user && (
            <div className="absolute top-full end-0 mt-1.5 w-48 rounded-xl bg-white dark:bg-[#171D28] border border-black/[.08] dark:border-white/10 shadow-lg p-1 z-50 text-start animate-[fadeInScale_0.15s_ease-out]">
              <div className="px-2.5 py-2 border-b border-black/[.05] dark:border-white/[.06]">
                <p className="text-xs font-bold text-[#111827] dark:text-white truncate">{user.name || user.email}</p>
                <p className="text-[10px] text-[#94A3B8] font-mono truncate">{user.email}</p>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-rose-500 hover:bg-rose-500/10 rounded-lg transition mt-1 cursor-pointer font-semibold"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>{isRtl ? 'تسجيل الخروج' : 'Sign Out'}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
