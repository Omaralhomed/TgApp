'use client';

import React, { useState } from 'react';
import { UserPlus, X, Sparkles } from 'lucide-react';
import { translations, Language } from '../../lib/translations';
import { createAddTask } from '../../lib/api';
import { useToast } from '../ui/ToastContext';

interface CreateAddTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  groups: any[];
  lang: Language;
}

export function CreateAddTaskModal({
  isOpen,
  onClose,
  onSuccess,
  groups,
  lang,
}: CreateAddTaskModalProps) {
  const isRtl = lang === 'ar';
  const [name, setName] = useState('');
  const [sourceGroupId, setSourceGroupId] = useState('');
  const [targetGroup, setTargetGroup] = useState('');
  const [delayMinSeconds, setDelayMinSeconds] = useState(20);
  const [delayMaxSeconds, setDelayMaxSeconds] = useState(50);
  const [isLoading, setIsLoading] = useState(false);

  const toast = useToast();
  const t = translations[lang];

  if (!isOpen) return null;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !targetGroup.trim()) {
      toast.error(isRtl ? 'يرجى إدخال اسم المهمة والمجموعة المستهدفة' : 'Task name and destination group are required');
      return;
    }

    try {
      setIsLoading(true);
      toast.info(isRtl ? 'جاري إنشاء مهمة الإضافة...' : 'Creating member adder task...');
      await createAddTask({
        name: name.trim(),
        sourceGroupId: sourceGroupId || undefined,
        targetGroup: targetGroup.trim(),
        delayMinSeconds: Number(delayMinSeconds),
        delayMaxSeconds: Number(delayMaxSeconds),
      });

      toast.success(isRtl ? 'تم إنشاء المهمة بنجاح!' : 'Task Created Successfully!');
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(isRtl ? 'فشل إنشاء المهمة' : 'Failed to create task', err.response?.data?.message || err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div
        dir={isRtl ? 'rtl' : 'ltr'}
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative w-full max-w-md rounded-2xl border border-black/[.08] dark:border-white/10 bg-white dark:bg-[#10151E] shadow-2xl overflow-hidden animate-[fadeInScale_0.2s_ease-out]">
          
          {/* Header */}
          <div className="px-5 py-3 border-b border-black/[.06] dark:border-white/[.07] bg-[#FAFAFC] dark:bg-[#0E121A] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#007AFF] flex items-center justify-center text-white shrink-0">
                <UserPlus className="w-3.5 h-3.5" />
              </div>
              <h2 className="text-xs font-bold text-[#111827] dark:text-white">
                {isRtl ? 'إنشاء مهمة إضافة أعضاء جديدة' : 'New Member Adder Task'}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-[#94A3B8] hover:text-[#111827] dark:hover:text-white transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleCreate} className="p-5 space-y-3.5 text-xs text-start">
            <div>
              <label className="font-bold text-[#111827] dark:text-slate-300 block mb-1">
                {isRtl ? 'اسم المهمة' : 'Task Name'}
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={isRtl ? 'مثال: نقل المهتمين بالتقنية' : 'e.g. Daily Growth - Tech Group'}
                className="w-full px-3 py-2 bg-[#F6F8FB] dark:bg-[#171D28] border border-black/[.08] dark:border-white/10 rounded-xl text-xs text-[#111827] dark:text-white placeholder-[#94A3B8] focus:outline-none focus:border-[#007AFF]"
              />
            </div>

            <div>
              <label className="font-bold text-[#111827] dark:text-slate-300 block mb-1">
                {isRtl ? 'قائمة المصدر (الجمهور المستخرج)' : 'Source Audience Leads'}
              </label>
              <select
                value={sourceGroupId}
                onChange={(e) => setSourceGroupId(e.target.value)}
                className="w-full px-3 py-2 bg-[#F6F8FB] dark:bg-[#171D28] border border-black/[.08] dark:border-white/10 rounded-xl text-xs text-[#111827] dark:text-white focus:outline-none focus:border-[#007AFF] cursor-pointer"
              >
                <option value="">{isRtl ? '-- كافة جهات الاتصال المستخرجة --' : '-- All Extracted Leads --'}</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id} className="bg-white dark:bg-[#171D28]">
                    {g.title} ({g.memberCount || g._count?.members || 0} {isRtl ? 'عضو' : 'leads'})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-bold text-[#111827] dark:text-slate-300 block mb-1">
                {isRtl ? 'المجموعة المستهدفة (الوجهة)' : 'Target Telegram Group'}
              </label>
              <input
                type="text"
                required
                value={targetGroup}
                onChange={(e) => setTargetGroup(e.target.value)}
                placeholder={isRtl ? 'معرف المجموعة مثل @mygroup أو رابط الدعوة' : '@mygroup or invite link'}
                className="w-full px-3 py-2 bg-[#F6F8FB] dark:bg-[#171D28] border border-black/[.08] dark:border-white/10 rounded-xl text-xs text-[#111827] dark:text-white placeholder-[#94A3B8] focus:outline-none focus:border-[#007AFF]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-[11px] text-[#94A3B8] block mb-1">
                  {isRtl ? 'الحد الأدنى للتأخير (ثواني)' : 'Min Delay (sec)'}
                </span>
                <input
                  type="number"
                  min="10"
                  max="120"
                  value={delayMinSeconds}
                  onChange={(e) => setDelayMinSeconds(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-[#F6F8FB] dark:bg-[#171D28] border border-black/[.08] dark:border-white/10 rounded-xl text-xs font-mono text-[#111827] dark:text-white"
                />
              </div>
              <div>
                <span className="text-[11px] text-[#94A3B8] block mb-1">
                  {isRtl ? 'الحد الأقصى للتأخير (ثواني)' : 'Max Delay (sec)'}
                </span>
                <input
                  type="number"
                  min="20"
                  max="240"
                  value={delayMaxSeconds}
                  onChange={(e) => setDelayMaxSeconds(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-[#F6F8FB] dark:bg-[#171D28] border border-black/[.08] dark:border-white/10 rounded-xl text-xs font-mono text-[#111827] dark:text-white"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-black/[.06] dark:border-white/[.07]">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 rounded-lg border border-black/[.08] dark:border-white/10 text-xs font-semibold text-[#64748B] hover:text-[#111827] dark:hover:text-white transition cursor-pointer"
              >
                {isRtl ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="submit"
                disabled={isLoading || !name.trim() || !targetGroup.trim()}
                className="px-4 py-1.5 rounded-lg bg-[#007AFF] hover:bg-[#0062CC] text-white text-xs font-bold flex items-center gap-1.5 transition active:scale-95 disabled:opacity-50 cursor-pointer shadow-sm"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>{isLoading ? (isRtl ? 'جاري الإنشاء...' : 'Creating...') : (isRtl ? 'إنشاء وتشغيل' : 'Create Task')}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
