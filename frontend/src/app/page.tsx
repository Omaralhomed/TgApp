'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { Language, translations } from '../lib/translations';
import { ToastProvider, useToast } from '../components/ui/ToastContext';
import { Sidebar } from '../components/layout/Sidebar';
import { Header } from '../components/layout/Header';
import { MobileNav } from '../components/layout/MobileNav';
import { CommandPalette } from '../components/layout/CommandPalette';
import { AuthModal } from '../components/auth/AuthModal';
import { AmbientBackground } from '../components/layout/AmbientBackground';

import { StatsOverview } from '../components/dashboard/StatsOverview';
import { AccountsTab } from '../components/accounts/AccountsTab';
import { CampaignsTab } from '../components/campaigns/CampaignsTab';
import { ScraperTab } from '../components/scraper/ScraperTab';
import { AddMembersTab } from '../components/adder/AddMembersTab';
import { ProxiesTab } from '../components/proxies/ProxiesTab';
import { ActivityTab, LogEntry } from '../components/activity/ActivityTab';
import { SystemTab } from '../components/system/SystemTab';
import { LandingPage } from '../components/landing/LandingPage';
import { TelegramAiBotModal } from '../components/ai/TelegramAiBotModal';
import { TelegramBotsManager } from '../components/bots/TelegramBotsManager';
import { AdminDashboardTab } from '../components/admin/AdminDashboardTab';
import { BillingTab } from '../components/billing/BillingTab';
import { UnifiedInboxModal } from '../components/inbox/UnifiedInboxModal';
import { InboxTab } from '../components/inbox/InboxTab';
import { ChannelClonerModal } from '../components/campaigns/ChannelClonerModal';
import { ChannelClonerTab } from '../components/campaigns/ChannelClonerTab';
import { Bot, Sparkles } from 'lucide-react';

import {
  getAccounts,
  getCampaigns,
  getGroups,
  getAddTasks,
  getProxies,
  getSystemMetrics,
  getProfile,
  startCampaign,
  pauseCampaign,
  API_BASE_URL,
} from '../lib/api';

function AppContent() {
  const [lang, setLang] = useState<Language>('ar');
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
  const [authChecked, setAuthChecked] = useState(false);
  const [isAiBotOpen, setIsAiBotOpen] = useState(false);
  const [isInboxOpen, setIsInboxOpen] = useState(false);
  const [isClonerOpen, setIsClonerOpen] = useState(false);
  const [user, setUser] = useState<any | null>(null);

  // Data States
  const [accounts, setAccounts] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [proxies, setProxies] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Real-time WebSocket State
  const [wsConnected, setWsConnected] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);

  const toast = useToast();

  // Load active user session from storage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedUser = localStorage.getItem('tg_user');
      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser));
        } catch {}
      }
      getProfile()
        .then((p) => {
          if (p) setUser(p);
        })
        .catch(() => {})
        .finally(() => {
          setAuthChecked(true);
        });
    } else {
      setAuthChecked(true);
    }
  }, []);

  // Initialize Theme, Material Style (Glass vs Solid), Accent, and RTL/LTR Direction
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const root = document.documentElement;
      
      // Theme Mode
      const storedTheme = localStorage.getItem('tg_theme') || 'dark';
      if (storedTheme === 'dark') {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }

      // Material Style (Glass vs Solid)
      const storedMaterial = localStorage.getItem('tg_material_style') || 'glass';
      if (storedMaterial === 'glass') {
        root.classList.add('glass-theme');
        root.classList.remove('solid-theme');
      } else {
        root.classList.add('solid-theme');
        root.classList.remove('glass-theme');
      }

      // Accent Color
      const storedAccent = localStorage.getItem('tg_accent');
      if (storedAccent) {
        root.style.setProperty('--brand-primary', storedAccent);
      }

      // Direction & Language
      root.dir = lang === 'ar' ? 'rtl' : 'ltr';
      root.lang = lang;
    }
  }, [lang]);

  // Connect WebSocket & Listen to real-time events
  useEffect(() => {
    const s = io(API_BASE_URL, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
    });

    s.on('connect', () => {
      setWsConnected(true);
    });

    s.on('disconnect', () => {
      setWsConnected(false);
    });

    // Real-time terminal log stream
    s.on('terminal_log', (log: LogEntry) => {
      setLogs((prev) => [...prev.slice(-300), log]);
    });

    // Real-time campaign progress updates
    s.on('campaign_global_update', (update: any) => {
      setCampaigns((prev) =>
        prev.map((c) => (c.id === update.campaignId ? { ...c, ...update } : c)),
      );
    });

    // Real-time task progress updates
    s.on('task_global_update', (update: any) => {
      setTasks((prev) =>
        prev.map((t) => (t.id === update.taskId ? { ...t, ...update } : t)),
      );
    });

    // Real-time account status updates
    s.on('account_status_update', (update: any) => {
      setAccounts((prev) =>
        prev.map((a) => (a.id === update.accountId ? { ...a, ...update } : a)),
      );
    });

    // Real-time payment approval notifications
    s.on('payment:approved', (data: any) => {
      toast.success(
        lang === 'ar' ? 'تمت ترقية باقتك واعتماد الدفع!' : 'Payment Approved & Activated!',
        data.message,
      );
      getProfile()
        .then((updatedUser) => {
          if (updatedUser) setUser(updatedUser);
        })
        .catch(() => {});
    });

    setSocket(s);

    return () => {
      s.disconnect();
    };
  }, []);

  // Fetch all dashboard data
  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [accs, camps, grps, tsks, prxs, mtr] = await Promise.all([
        getAccounts().catch(() => []),
        getCampaigns().catch(() => []),
        getGroups().catch(() => []),
        getAddTasks().catch(() => []),
        getProxies().catch(() => []),
        getSystemMetrics().catch(() => null),
      ]);

      setAccounts(accs || []);
      setCampaigns(camps || []);
      setGroups(grps || []);
      setTasks(tsks || []);
      setProxies(prxs || []);
      setMetrics(mtr);
    } catch (err: any) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Command Palette Quick Action Trigger
  const handleTriggerAction = (actionId: string) => {
    switch (actionId) {
      case 'action_add_account':
        setActiveTab('accounts');
        break;
      case 'action_create_campaign':
        setActiveTab('campaigns');
        break;
      case 'action_scrape_group':
        setActiveTab('contacts');
        break;
      case 'action_create_add_task':
        setActiveTab('automation');
        break;
      case 'action_add_proxy':
        setActiveTab('proxies');
        break;
      case 'action_sync_health':
        setActiveTab('accounts');
        break;
    }
  };

  const handleStartCampaign = async (id: string) => {
    try {
      await startCampaign(id);
      toast.success('Broadcast campaign started in background!');
      fetchData();
    } catch (err: any) {
      toast.error('Failed to start campaign', err.message);
    }
  };

  const handlePauseCampaign = async (id: string) => {
    try {
      await pauseCampaign(id);
      toast.info('Campaign paused.');
      fetchData();
    } catch (err: any) {
      toast.error('Failed to pause campaign', err.message);
    }
  };

  // Calculated Stats
  const activeAccountsCount = accounts.filter((a) => a.status === 'ACTIVE').length;
  const floodWaitAccountsCount = accounts.filter((a) => a.status === 'FLOOD_WAIT').length;
  const totalDelivered = accounts.reduce((acc, a) => acc + (a.totalSent || a.sentToday || 0), 0);
  const totalFailed = accounts.reduce((acc, a) => acc + (a.totalFailed || 0), 0);
  const totalLeadsCount = groups.reduce(
    (acc, g) => acc + (g.memberCount || g._count?.members || 0),
    0,
  );

  const stats = {
    totalAccounts: accounts.length,
    activeAccounts: activeAccountsCount,
    floodWaitAccounts: floodWaitAccountsCount,
    totalSent: totalDelivered,
    totalFailed: totalFailed,
    totalLeads: totalLeadsCount,
    totalCampaigns: campaigns.length,
    runningCampaigns: campaigns.filter((c) => c.status === 'RUNNING').length,
    activeQueueJobs: metrics?.queue?.activeInMemoryJobs || 0,
    redisConnected: metrics?.queue?.redisConnected ?? false,
  };

  // ─── Loading Splash: while session is being verified ───────────────────────
  if (!authChecked) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-6 font-sans">
        {/* Pulsing logo / brand mark */}
        <div className="relative flex items-center justify-center">
          <span className="absolute w-24 h-24 rounded-full bg-cyan-500/20 animate-ping" />
          <span className="absolute w-16 h-16 rounded-full bg-cyan-500/30 animate-ping animation-delay-150" />
          <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-2xl shadow-cyan-500/40">
            <svg viewBox="0 0 40 40" className="w-9 h-9 fill-white" xmlns="http://www.w3.org/2000/svg">
              <path d="M20 3.333A16.667 16.667 0 1 0 36.667 20 16.685 16.685 0 0 0 20 3.333Zm8.22 11.334-2.734 12.893c-.2.9-.733 1.12-1.487.7l-4.12-3.04-1.986 1.913c-.22.22-.407.407-.833.407l.3-4.22 7.66-6.92c.333-.3-.073-.46-.513-.16l-9.46 5.953-4.073-1.273c-.887-.28-.9-.887.187-1.313l15.9-6.134c.74-.267 1.387.18 1.16 1.194Z"/>
            </svg>
          </div>
        </div>
        {/* Brand name */}
        <div className="text-center">
          <h1 className="text-2xl font-extrabold text-white tracking-tight">TgCloud OS</h1>
          <p className="text-sm text-slate-400 mt-1 font-medium">Verifying your session…</p>
        </div>
        {/* Progress bar */}
        <div className="w-48 h-1 rounded-full bg-slate-800 overflow-hidden">
          <div className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 animate-[progress_1.5s_ease-in-out_infinite]" style={{width:'60%'}} />
        </div>
      </div>
    );
  }

  // ─── Unauthenticated: show public landing + auth modal ──────────────────────
  if (authChecked && !user) {
    return (
      <div className="min-h-screen bg-[#F6F8FB] dark:bg-[#080B11] text-[#111827] dark:text-[#F8FAFC] font-sans transition-colors duration-300">
        <LandingPage
          lang={lang}
          onSetLang={setLang}
          onOpenAuth={(mode) => {
            setAuthModalMode(mode || 'LOGIN');
            setIsAuthModalOpen(true);
          }}
        />
        <AuthModal
          lang={lang}
          isOpen={isAuthModalOpen}
          initialMode={authModalMode}
          onClose={() => setIsAuthModalOpen(false)}
          onSuccess={(loggedUser) => {
            setUser(loggedUser);
            setIsAuthModalOpen(false);
          }}
        />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-app-bg text-app-text selection:bg-brand-primary selection:text-white font-sans overflow-x-hidden transition-colors duration-300 relative">
      {/* Aesthetic Ambient Aura & Cosmic Background */}
      <AmbientBackground />

      {/* Desktop & Laptop Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
        lang={lang}
        wsConnected={wsConnected}
        user={user}
        accountsCount={accounts.length}
        activeCampaignsCount={campaigns.filter((c) => c.status === 'RUNNING').length}
      />

      {/* Mobile Drawer & Bottom Navigation */}
      <MobileNav
        isOpen={isMobileDrawerOpen}
        onClose={() => setIsMobileDrawerOpen(false)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        lang={lang}
        wsConnected={wsConnected}
        user={user}
      />

      {/* Main Content Layout Container */}
      <div className="flex-1 flex flex-col min-w-0 pb-20 sm:pb-8">
        {/* Top Header */}
        <Header
          activeTab={activeTab}
          lang={lang}
          setLang={setLang}
          onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
          onOpenMobileDrawer={() => setIsMobileDrawerOpen(true)}
          onQuickAction={() => {
            if (activeTab === 'campaigns') {
              // triggers campaign modal
            } else {
              setActiveTab('accounts');
            }
          }}
          user={user}
          setUser={setUser}
          openAuthModal={() => setIsAuthModalOpen(true)}
          wsConnected={wsConnected}
        />

        {/* Tab Content Wrapper with Responsive Margins & Space-Efficient Padding */}
        <main className="flex-1 p-3 sm:p-5 lg:p-6 max-w-[1600px] w-full mx-auto">
          {activeTab === 'overview' && (
            <StatsOverview
              stats={stats}
              activeCampaigns={campaigns.filter((c) => c.status === 'RUNNING' || c.status === 'PAUSED')}
              activeTasks={tasks.filter((t) => t.status === 'RUNNING' || t.status === 'PAUSED')}
              onNavigate={setActiveTab}
              onStartCampaign={handleStartCampaign}
              onPauseCampaign={handlePauseCampaign}
              lang={lang}
            />
          )}

          {activeTab === 'accounts' && (
            <AccountsTab
              accounts={accounts}
              proxies={proxies}
              isLoading={isLoading}
              onRefresh={fetchData}
              lang={lang}
            />
          )}

          {activeTab === 'campaigns' && (
            <CampaignsTab
              campaigns={campaigns}
              groups={groups}
              accounts={accounts}
              isLoading={isLoading}
              onRefresh={fetchData}
              lang={lang}
            />
          )}

          {activeTab === 'inbox' && (
            <InboxTab
              accounts={accounts}
              lang={lang}
            />
          )}

          {activeTab === 'contacts' && (
            <ScraperTab
              groups={groups}
              accounts={accounts}
              isLoading={isLoading}
              onRefresh={fetchData}
              lang={lang}
            />
          )}

          {activeTab === 'automation' && (
            <AddMembersTab
              tasks={tasks}
              groups={groups}
              isLoading={isLoading}
              onRefresh={fetchData}
              lang={lang}
            />
          )}

          {activeTab === 'cloner' && (
            <ChannelClonerTab
              accounts={accounts}
              lang={lang}
            />
          )}

          {activeTab === 'bots' && <TelegramBotsManager lang={lang} />}

          {activeTab === 'proxies' && (
            <ProxiesTab
              proxies={proxies}
              isLoading={isLoading}
              onRefresh={fetchData}
              lang={lang}
            />
          )}

          {activeTab === 'activity' && (
            <ActivityTab
              logs={logs}
              onClearLogs={() => setLogs([])}
              wsConnected={wsConnected}
              lang={lang}
            />
          )}

          {activeTab === 'system' && <SystemTab lang={lang} />}

          {activeTab === 'billing' && <BillingTab lang={lang} />}

          {activeTab === 'admin' && <AdminDashboardTab lang={lang} />}
        </main>
      </div>

      {/* Global Command Palette (Ctrl+K) */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        lang={lang}
        onNavigate={setActiveTab}
        onTriggerAction={handleTriggerAction}
      />

      {/* Floating Telegram AI Operations Bot Launcher */}
      <button
        onClick={() => setIsAiBotOpen(true)}
        className="fixed bottom-6 end-6 z-40 p-3 sm:px-4 sm:py-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-xl shadow-cyan-500/25 flex items-center gap-2 group transition-all duration-300 active:scale-95 cursor-pointer"
        title={lang === 'ar' ? 'مساعد العمليات الذكي' : 'Operations Copilot'}
      >
        <div className="relative">
          <Bot className="w-5 h-5 group-hover:rotate-12 transition-transform" />
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 border-2 border-slate-900 rounded-full animate-ping" />
        </div>
        <span className="text-xs font-bold hidden sm:inline">
          {lang === 'ar' ? 'مساعد العمليات' : 'Copilot Bot'}
        </span>
      </button>

      {/* Telegram AI Operations Bot Modal */}
      <TelegramAiBotModal
        isOpen={isAiBotOpen}
        onClose={() => setIsAiBotOpen(false)}
        lang={lang}
        onNavigate={setActiveTab}
        activeCampaigns={campaigns.filter((c) => c.status === 'RUNNING')}
      />

      {/* Authentication Modal */}
      <AuthModal
        lang={lang}
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={(loggedUser) => setUser(loggedUser)}
      />

      {/* Unified MTProto Inbox Modal (Quick Action) */}
      <UnifiedInboxModal
        isOpen={isInboxOpen}
        onClose={() => setIsInboxOpen(false)}
        accounts={accounts}
        lang={lang}
      />

      {/* Real-Time Channel Cloner Modal (Quick Action) */}
      <ChannelClonerModal
        isOpen={isClonerOpen}
        onClose={() => setIsClonerOpen(false)}
        accounts={accounts}
        lang={lang}
      />
    </div>
  );
}

export default function Home() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
}
