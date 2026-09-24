'use client';

import React, { useState } from 'react';
import {
  UserPlus,
  Play,
  Pause,
  Trash2,
  ExternalLink,
  Plus,
  Users,
  Zap,
  Clock,
  CheckCircle2,
  GitBranch,
  Split,
  ZoomIn,
  ZoomOut,
  Send,
  Sparkles,
  ShieldAlert,
  ListFilter,
} from 'lucide-react';
import { translations, Language } from '../../lib/translations';
import { DataTable, Column } from '../ui/DataTable';
import { Badge } from '../ui/Badge';
import { CreateAddTaskModal } from './CreateAddTaskModal';
import { TaskLogsModal } from './TaskLogsModal';
import { startAddTask, pauseAddTask, deleteAddTask } from '../../lib/api';
import { useToast } from '../ui/ToastContext';

interface AddMembersTabProps {
  tasks: any[];
  groups: any[];
  isLoading: boolean;
  onRefresh: () => void;
  lang: Language;
}

export function AddMembersTab({
  tasks,
  groups,
  isLoading,
  onRefresh,
  lang,
}: AddMembersTabProps) {
  const isRtl = lang === 'ar';
  const [viewMode, setViewMode] = useState<'tasks' | 'canvas'>('tasks');
  const [zoomLevel, setZoomLevel] = useState(100);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const toast = useToast();
  const t = translations[lang];

  const runningTasksCount = tasks.filter((t) => t.status === 'RUNNING').length;
  const totalAddedAll = tasks.reduce((acc, t) => acc + (t.addedCount || 0), 0);

  const handleStart = async (id: string) => {
    try {
      toast.info(isRtl ? 'جاري بدء مهمة إضافة الأعضاء...' : 'Starting member addition task...');
      await startAddTask(id);
      toast.success(isRtl ? 'تم تشغيل المهمة بنجاح!' : 'Task started in background!');
      onRefresh();
    } catch (err: any) {
      toast.error(isRtl ? 'فشل بدء المهمة' : 'Failed to start task', err.response?.data?.message || err.message);
    }
  };

  const handlePause = async (id: string) => {
    try {
      await pauseAddTask(id);
      toast.info(isRtl ? 'تم إيقاف المهمة مؤقتاً' : 'Task paused.');
      onRefresh();
    } catch (err: any) {
      toast.error(isRtl ? 'فشل إيقاف المهمة' : 'Failed to pause task', err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t.confirmDelete)) return;
    try {
      await deleteAddTask(id);
      toast.success(isRtl ? 'تم حذف المهمة' : 'Task deleted.');
      onRefresh();
    } catch (err: any) {
      toast.error(isRtl ? 'فشل حذف المهمة' : 'Failed to delete task', err.message);
    }
  };

  const columns: Column<any>[] = [
    {
      key: 'name',
      header: isRtl ? 'اسم المهمة / الهدف' : 'Task / Target',
      sortable: true,
      render: (item) => (
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#007AFF]/10 text-[#007AFF] flex items-center justify-center font-bold text-xs shrink-0">
            <UserPlus className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-[#111827] dark:text-white text-xs truncate">{item.name}</p>
            <p className="text-[10px] text-[#94A3B8] font-mono truncate">
              {isRtl ? 'الهدف:' : 'Target:'} {item.targetGroup}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      header: isRtl ? 'الحالة' : 'Status',
      sortable: true,
      render: (item) => {
        const variant =
          item.status === 'RUNNING'
            ? 'primary'
            : item.status === 'COMPLETED'
            ? 'success'
            : item.status === 'PAUSED'
            ? 'warning'
            : 'neutral';
        return <Badge variant={variant}>{item.status}</Badge>;
      },
    },
    {
      key: 'progress',
      header: isRtl ? 'نسبة الإنجاز' : 'Progress',
      sortable: true,
      render: (item) => {
        const total = item.totalTargets || 1;
        const pct = Math.min(100, Math.round(((item.addedCount + item.failedCount) / total) * 100));
        return (
          <div className="w-32 flex flex-col gap-1">
            <div className="flex justify-between text-[10px] font-mono">
              <span className="font-bold text-[#007AFF]">{pct}%</span>
              <span className="text-[#94A3B8]">
                {item.addedCount} / {item.totalTargets}
              </span>
            </div>
            <div className="h-1.5 w-full bg-black/[.06] dark:bg-white/[.08] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#007AFF] rounded-full transition-all duration-300"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      },
    },
    {
      key: 'stats',
      header: isRtl ? 'النتائج (تم الإضافة / قيود الخصوصية / فشل)' : 'Results (Added / Privacy / Failed)',
      render: (item) => (
        <div className="flex items-center gap-1.5 text-xs font-mono">
          <span className="text-[#34C759] font-bold">✓ {item.addedCount}</span>
          <span className="text-[#94A3B8]">/</span>
          <span className="text-amber-500 font-bold">🛡️ {item.privacyRestrictedCount || 0}</span>
          <span className="text-[#94A3B8]">/</span>
          <span className="text-rose-500 font-bold">✗ {item.failedCount}</span>
        </div>
      ),
    },
    {
      key: 'actions',
      header: isRtl ? 'إجراءات' : 'Actions',
      className: 'text-end',
      render: (item) => (
        <div className="flex items-center justify-end gap-1">
          {item.status === 'RUNNING' ? (
            <button
              onClick={() => handlePause(item.id)}
              className="p-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 transition cursor-pointer"
              title={isRtl ? 'إيقاف مؤقت' : 'Pause'}
            >
              <Pause className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              onClick={() => handleStart(item.id)}
              className="p-1.5 rounded-lg bg-[#007AFF] hover:bg-[#0062CC] text-white transition shadow-sm cursor-pointer"
              title={isRtl ? 'تشغيل المهمة' : 'Start'}
            >
              <Play className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            onClick={() => setSelectedTaskId(item.id)}
            className="p-1.5 rounded-lg border border-black/[.06] dark:border-white/[.07] hover:bg-black/[.04] dark:hover:bg-white/5 text-[#64748B] hover:text-[#111827] dark:hover:text-white transition cursor-pointer"
            title={isRtl ? 'سجل العمليات' : 'View Logs'}
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => handleDelete(item.id)}
            className="p-1.5 rounded-lg border border-black/[.06] dark:border-white/[.07] hover:bg-rose-500/10 text-[#64748B] hover:text-rose-500 transition cursor-pointer"
            title={t.delete}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-3.5 w-full text-start select-none animate-[fadeIn_0.2s_ease-out]">
      
      {/* ── Top Header & Summary ────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-white dark:bg-[#11151D] border border-black/[.06] dark:border-white/[.07] shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-[#111827] dark:text-white">
              {isRtl ? 'أتمتة إضافة ونقل الأعضاء' : 'Member Adder Automation'}
            </h2>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#007AFF]/10 text-[#007AFF]">
              {tasks.length} {isRtl ? 'مهمة' : 'Tasks'}
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-[#64748B] dark:text-[#94A3B8] mt-1 font-mono">
            <span className="text-[#007AFF] font-bold">● {runningTasksCount} {isRtl ? 'نشطة الآن' : 'Running'}</span>
            <span className="text-[#34C759] font-bold">✓ {totalAddedAll.toLocaleString()} {isRtl ? 'عضو مضاف' : 'Total Added'}</span>
          </div>
        </div>

        {/* Action Controls & View Switcher */}
        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0 flex-wrap">
          <div className="flex items-center gap-1 p-0.5 bg-[#F6F8FB] dark:bg-[#171D28] rounded-lg border border-black/[.05] dark:border-white/[.05] text-xs">
            <button
              onClick={() => setViewMode('tasks')}
              className={`px-2.5 py-1 font-bold rounded-md transition cursor-pointer ${
                viewMode === 'tasks'
                  ? 'bg-[#007AFF] text-white shadow-sm'
                  : 'text-[#64748B] dark:text-[#94A3B8] hover:text-[#111827] dark:hover:text-white'
              }`}
            >
              {isRtl ? 'قائمة المهام' : 'Task Queue'}
            </button>
            <button
              onClick={() => setViewMode('canvas')}
              className={`px-2.5 py-1 font-bold rounded-md transition cursor-pointer ${
                viewMode === 'canvas'
                  ? 'bg-[#007AFF] text-white shadow-sm'
                  : 'text-[#64748B] dark:text-[#94A3B8] hover:text-[#111827] dark:hover:text-white'
              }`}
            >
              {isRtl ? 'مخطط الرحلات الآلية' : 'Flow Builder'}
            </button>
          </div>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="h-8 px-3 rounded-lg bg-[#007AFF] hover:bg-[#0062CC] text-white text-xs font-bold flex items-center gap-1.5 transition shadow-sm shadow-[#007AFF]/20 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{isRtl ? 'إنشاء مهمة إضافة' : 'New Add Task'}</span>
          </button>
        </div>
      </div>

      {/* ── 1. Tasks Queue View ────────────────────────── */}
      {viewMode === 'tasks' && (
        <DataTable
          columns={columns}
          data={tasks}
          keyExtractor={(item) => item.id}
          isLoading={isLoading}
          searchPlaceholder={isRtl ? 'بحث في مهام الإضافة...' : 'Search add tasks...'}
          selectable
          selectedKeys={selectedKeys}
          onSelectionChange={setSelectedKeys}
          emptyTitle={isRtl ? 'لا توجد مهام إضافة بعد' : 'No adder tasks yet'}
          emptySubtitle={isRtl ? 'أنشئ أول مهمة لنقل العملاء المستهدفين إلى مجموعتك في تليجرام تلقائياً وبأمان.' : 'Create an automated task to safely invite leads into your Telegram group.'}
          emptyAction={
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="h-8 px-3 rounded-lg bg-[#007AFF] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isRtl ? 'إنشاء مهمة جديدة' : 'Create Task'}</span>
            </button>
          }
        />
      )}

      {/* ── 2. Visual Workflow Canvas View ────────────────────────── */}
      {viewMode === 'canvas' && (
        <div className="w-full rounded-xl border border-black/[.06] dark:border-white/[.07] bg-white dark:bg-[#11151D] shadow-sm overflow-hidden flex flex-col">
          {/* Canvas Toolbar */}
          <div className="p-3 border-b border-black/[.06] dark:border-white/[.07] flex items-center justify-between bg-[#FAFAFC] dark:bg-[#0E121A]">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#007AFF]/10 text-[#007AFF] flex items-center justify-center">
                <GitBranch className="w-3.5 h-3.5" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-[#111827] dark:text-white">
                  {isRtl ? 'مخطط رحلة الترحيب والتفاعل التلقائي' : 'Smart Welcome & Funnel Journey'}
                </h3>
                <span className="text-[10px] text-[#34C759] font-mono flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#34C759] animate-pulse" />
                  Live Automation Pipeline
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setZoomLevel((z) => Math.max(50, z - 10))}
                className="p-1 rounded-md border border-black/[.08] dark:border-white/10 hover:bg-black/[.04] dark:hover:bg-white/5 text-[#64748B] text-xs cursor-pointer"
              >
                <ZoomOut className="w-3 h-3" />
              </button>
              <span className="text-[10px] font-mono px-1.5 text-[#94A3B8]">{zoomLevel}%</span>
              <button
                onClick={() => setZoomLevel((z) => Math.min(150, z + 10))}
                className="p-1 rounded-md border border-black/[.08] dark:border-white/10 hover:bg-black/[.04] dark:hover:bg-white/5 text-[#64748B] text-xs cursor-pointer"
              >
                <ZoomIn className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Node Canvas Area */}
          <div className="p-6 overflow-auto flex flex-col items-center justify-start space-y-4 bg-[#F6F8FB]/40 dark:bg-[#10141C]">
            {/* Node 1: Trigger */}
            <div className="w-full max-w-sm p-3 rounded-xl bg-white dark:bg-[#171D28] border border-[#007AFF]/30 shadow-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-bold uppercase tracking-wider text-[#007AFF] bg-[#007AFF]/10 px-1.5 py-0.5 rounded">
                  Trigger
                </span>
                <span className="w-2 h-2 rounded-full bg-[#34C759]" />
              </div>
              <h4 className="text-xs font-bold text-[#111827] dark:text-white flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-[#007AFF]" />
                {isRtl ? 'انضمام عضو جديد للقناة أو المجموعة' : 'New Member Joins'}
              </h4>
              <p className="text-[10px] text-[#94A3B8]">
                {isRtl ? 'يتم الرصد التلقائي عبر خوادم MTProto.' : 'Real-time MTProto event stream.'}
              </p>
            </div>

            <div className="w-0.5 h-4 bg-black/[.1] dark:bg-white/10" />

            {/* Node 2: Action */}
            <div className="w-full max-w-sm p-3 rounded-xl bg-white dark:bg-[#171D28] border border-black/[.06] dark:border-white/[.07] shadow-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-bold uppercase tracking-wider text-indigo-500 bg-indigo-500/10 px-1.5 py-0.5 rounded">
                  Action
                </span>
                <Clock className="w-3 h-3 text-[#94A3B8]" />
              </div>
              <h4 className="text-xs font-bold text-[#111827] dark:text-white flex items-center gap-1.5">
                <Send className="w-3.5 h-3.5 text-indigo-500 rtl:rotate-180" />
                {isRtl ? 'إرسال رسالة ترحيبية خاصة' : 'Send Welcome Message'}
              </h4>
              <p className="text-[10px] text-[#94A3B8]">
                {isRtl ? 'رسالة مخصصة مع رابط العرض الحصري.' : 'Direct personalized message.'}
              </p>
            </div>

            <div className="w-0.5 h-4 bg-black/[.1] dark:bg-white/10" />

            {/* Node 3: Condition */}
            <div className="w-full max-w-sm p-3 rounded-xl bg-white dark:bg-[#171D28] border border-black/[.06] dark:border-white/[.07] shadow-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-bold uppercase tracking-wider text-purple-500 bg-purple-500/10 px-1.5 py-0.5 rounded">
                  Condition
                </span>
                <Split className="w-3 h-3 text-purple-500" />
              </div>
              <h4 className="text-xs font-bold text-[#111827] dark:text-white">
                {isRtl ? 'هل تم فتح وقراءة الرسالة؟' : 'Message Read & Clicked?'}
              </h4>
            </div>

            {/* Branching Yes / No Nodes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-md">
              <div className="p-2.5 rounded-lg bg-[#34C759]/10 border border-[#34C759]/20 space-y-1">
                <span className="text-[9px] font-bold text-[#16A34A] dark:text-[#34C759]">
                  ✓ {isRtl ? 'نعم (تفاعل)' : 'YES (Engaged)'}
                </span>
                <p className="text-xs font-bold text-[#111827] dark:text-white">
                  {isRtl ? 'إرسال رابط قناة الـ VIP' : 'Invite to VIP Channel'}
                </p>
              </div>

              <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 space-y-1">
                <span className="text-[9px] font-bold text-rose-600 dark:text-rose-400">
                  ✗ {isRtl ? 'لا (متابعة بعد 48 ساعة)' : 'NO (Followup 48h)'}
                </span>
                <p className="text-xs font-bold text-[#111827] dark:text-white">
                  {isRtl ? 'إرسال تذكير لطيف بالمميزات' : 'Send Reminder'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Task Modal */}
      <CreateAddTaskModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={onRefresh}
        groups={groups}
        lang={lang}
      />

      {/* Task Logs Modal */}
      <TaskLogsModal
        taskId={selectedTaskId}
        isOpen={!!selectedTaskId}
        onClose={() => setSelectedTaskId(null)}
        lang={lang}
      />
    </div>
  );
}
