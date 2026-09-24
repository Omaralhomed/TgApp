'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Terminal, Trash2, Search } from 'lucide-react';
import { Language, translations } from '../../lib/translations';
import { TerminalLog } from '../../hooks/useSocket';
import { Button } from '../ui/Button';

interface LiveTerminalProps {
  lang: Language;
  logs: TerminalLog[];
  isConnected: boolean;
  onClearLogs: () => void;
}

export const LiveTerminal: React.FC<LiveTerminalProps> = ({
  lang,
  logs,
  isConnected,
  onClearLogs,
}) => {
  const t = translations[lang];
  const isRtl = lang === 'ar';

  const [filter, setFilter] = useState<'ALL' | 'SUCCESS' | 'ERROR' | 'WARN' | 'INFO'>('ALL');
  const [search, setSearch] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const filteredLogs = logs.filter((log) => {
    if (filter !== 'ALL' && log.type !== filter) return false;
    if (search && !log.message.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const getLevelBadge = (type: string) => {
    switch (type) {
      case 'SUCCESS':
        return (
          <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400">
            OK
          </span>
        );
      case 'ERROR':
        return (
          <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400">
            ERR
          </span>
        );
      case 'WARN':
        return (
          <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400">
            WRN
          </span>
        );
      default:
        return (
          <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-apple-blue">
            INF
          </span>
        );
    }
  };

  const getLogColor = (type: string) => {
    switch (type) {
      case 'SUCCESS':
        return 'text-emerald-700 dark:text-emerald-300 font-medium';
      case 'ERROR':
        return 'text-rose-700 dark:text-rose-300 font-medium';
      case 'WARN':
        return 'text-amber-700 dark:text-amber-300 font-medium';
      default:
        return 'text-slate-800 dark:text-slate-200';
    }
  };

  return (
    <div className="rounded-apple-lg bg-surface border border-border shadow-sm overflow-hidden flex flex-col h-[560px] animate-fade-in">
      {/* Chrome Header */}
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-surface-hover/80 border-b border-border">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-apple-blue" />
          <h3 className="text-xs font-bold font-mono text-slate-800 dark:text-slate-200">
            {t.terminal}
          </h3>
          <span className="text-[10px] px-1.5 py-0.2 rounded bg-surface border border-border text-slate-500 font-mono">
            {filteredLogs.length}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={onClearLogs}
            variant="ghost"
            size="xs"
            className="text-slate-500 hover:text-slate-900"
            leftIcon={<Trash2 className="w-3 h-3" />}
          >
            {t.clearLogs}
          </Button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-2 bg-surface border-b border-border/80 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          {(['ALL', 'SUCCESS', 'ERROR', 'WARN', 'INFO'] as const).map((lvl) => (
            <button
              key={lvl}
              onClick={() => setFilter(lvl)}
              className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono transition-all tap-active ${
                filter === lvl
                  ? 'bg-apple-blue text-white shadow-xs'
                  : 'bg-surface-hover text-slate-500 hover:text-slate-900'
              }`}
            >
              {lvl}
            </button>
          ))}
        </div>

        <div className="relative w-36 sm:w-44">
          <Search className="w-3 h-3 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Filter..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-7 pr-2 py-1 text-xs bg-surface-hover border border-border rounded text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-apple-blue font-mono"
          />
        </div>
      </div>

      {/* Terminal Monospace Stream */}
      <div className="flex-1 overflow-y-auto p-3 font-mono text-[11px] space-y-1 bg-surface-subtle no-scrollbar">
        {filteredLogs.length === 0 ? (
          <div className="text-center py-20 text-slate-400 text-xs font-sans">
            Waiting for live telemetry stream...
          </div>
        ) : (
          filteredLogs.map((log, i) => (
            <div
              key={`${log.timestamp}-${i}`}
              className="flex items-start gap-2 hover:bg-surface-hover/60 p-1 rounded transition-colors"
            >
              <span className="text-slate-400 shrink-0 text-[10px]">
                {new Date(log.timestamp).toLocaleTimeString()}
              </span>
              <span className="shrink-0">{getLevelBadge(log.type)}</span>
              <span className={`break-all leading-snug ${getLogColor(log.type)}`}>
                {log.message}
              </span>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
};
