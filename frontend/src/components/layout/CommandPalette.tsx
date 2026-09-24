'use client';

import React, { useState, useEffect } from 'react';
import {
  Search,
  Zap,
  Users,
  Send,
  UserPlus,
  Shield,
  Activity,
  Layers,
  Server,
  X,
  ArrowRight,
} from 'lucide-react';
import { translations, Language } from '../../lib/translations';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
  onNavigate: (tab: string) => void;
  onTriggerAction: (action: string) => void;
}

export function CommandPalette({
  isOpen,
  onClose,
  lang,
  onNavigate,
  onTriggerAction,
}: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const t = translations[lang];

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const navItems = [
    { id: 'overview', label: t.navOverview, icon: Layers },
    { id: 'accounts', label: t.navAccounts, icon: Users },
    { id: 'campaigns', label: t.navCampaigns, icon: Send },
    { id: 'contacts', label: t.navContacts, icon: Layers },
    { id: 'automation', label: t.navAutomation, icon: UserPlus },
    { id: 'proxies', label: t.navProxies, icon: Server },
    { id: 'activity', label: t.navActivity, icon: Activity },
    { id: 'system', label: t.navSystem, icon: Shield },
  ];

  const quickActions = [
    { id: 'action_add_account', label: t.connectAccount, icon: Zap, tab: 'accounts' },
    { id: 'action_create_campaign', label: t.createCampaign, icon: Send, tab: 'campaigns' },
    { id: 'action_scrape_group', label: t.scrapeGroup, icon: Users, tab: 'contacts' },
    { id: 'action_create_add_task', label: t.createAddTask, icon: UserPlus, tab: 'automation' },
    { id: 'action_add_proxy', label: t.addProxy, icon: Server, tab: 'proxies' },
    { id: 'action_sync_health', label: t.syncAllHealth, icon: Activity, tab: 'accounts' },
  ];

  const filteredNav = navItems.filter((i) =>
    i.label.toLowerCase().includes(query.toLowerCase()),
  );
  const filteredActions = quickActions.filter((a) =>
    a.label.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-20 p-4 select-none text-start">
      {/* Backdrop */}
      <div onClick={onClose} className="fixed inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Palette Box */}
      <div className="relative w-full max-w-xl rounded-modal bg-app-surface border border-app-border shadow-soft-xl overflow-hidden z-10 animate-scale-in">
        <div className="p-4 border-b border-app-border flex items-center gap-3">
          <Search className="w-5 h-5 text-brand-primary ms-1 shrink-0" />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.searchPlaceholder}
            className="flex-1 bg-transparent border-none text-sm text-app-text placeholder:text-app-muted/60 focus:outline-none"
          />
          <button onClick={onClose} className="text-app-muted hover:text-app-text p-1 rounded-btn hover:bg-app-subtle transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="max-h-80 overflow-y-auto p-2 space-y-3">
          {/* Quick Actions */}
          {filteredActions.length > 0 && (
            <div>
              <p className="text-[11px] font-bold text-app-muted uppercase tracking-wider px-2.5 py-1">
                {t.quickActions}
              </p>
              <div className="space-y-1">
                {filteredActions.map((action) => {
                  const Icon = action.icon;
                  return (
                    <button
                      key={action.id}
                      onClick={() => {
                        onTriggerAction(action.id);
                        onClose();
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-btn text-xs text-app-text hover:bg-brand-primary/10 hover:text-brand-primary transition group cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className="w-4 h-4 text-brand-primary group-hover:scale-110 transition" />
                        <span className="font-semibold">{action.label}</span>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition rtl:rotate-180" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Navigation */}
          {filteredNav.length > 0 && (
            <div>
              <p className="text-[11px] font-bold text-app-muted uppercase tracking-wider px-2.5 py-1">
                {t.navigation}
              </p>
              <div className="space-y-1">
                {filteredNav.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        onNavigate(item.id);
                        onClose();
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-btn text-xs text-app-text hover:bg-app-subtle transition group cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className="w-4 h-4 text-app-muted group-hover:text-app-text transition" />
                        <span className="font-semibold">{item.label}</span>
                      </div>
                      <span className="text-[10px] text-app-muted uppercase font-mono">Jump</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {filteredNav.length === 0 && filteredActions.length === 0 && (
            <div className="py-8 text-center text-xs text-app-muted">
              {t.noResultsFound}
            </div>
          )}
        </div>

        <div className="px-4 py-2.5 bg-app-subtle/50 border-t border-app-border text-[11px] text-app-muted flex items-center justify-between">
          <span>{t.pressEscToClose}</span>
          <span className="font-mono">⌘K / Ctrl+K</span>
        </div>
      </div>
    </div>
  );
}
