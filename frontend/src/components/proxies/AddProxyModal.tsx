'use client';

import React, { useState } from 'react';
import { Server, Plus, Upload, X } from 'lucide-react';
import { translations, Language } from '../../lib/translations';
import { addProxy, addBulkProxies } from '../../lib/api';
import { useToast } from '../ui/ToastContext';

interface AddProxyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  lang: Language;
}

export function AddProxyModal({
  isOpen,
  onClose,
  onSuccess,
  lang,
}: AddProxyModalProps) {
  const isRtl = lang === 'ar';
  const [mode, setMode] = useState<'single' | 'bulk'>('single');
  const [host, setHost] = useState('');
  const [port, setPort] = useState('');
  const [protocol, setProtocol] = useState('socks5');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [bulkText, setBulkText] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const toast = useToast();
  const t = translations[lang];

  if (!isOpen) return null;

  const handleSubmitSingle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!host.trim() || !port.trim()) {
      toast.error(isRtl ? 'يرجى إدخال عنوان الخادم والمنفذ' : 'Host and port are required');
      return;
    }

    try {
      setIsLoading(true);
      await addProxy({
        host: host.trim(),
        port: Number(port),
        protocol,
        username: username.trim() || undefined,
        password: password.trim() || undefined,
      });

      toast.success(isRtl ? 'تمت إضافة البروكسي بنجاح!' : 'Proxy Added Successfully!');
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(isRtl ? 'فشل إضافة البروكسي' : 'Failed to add proxy', err.response?.data?.message || err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitBulk = async (e: React.FormEvent) => {
    e.preventDefault();
    const lines = bulkText.split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) {
      toast.error(isRtl ? 'يرجى إدخال سطر بروكسي واحد على الأقل' : 'Please enter at least one proxy line');
      return;
    }

    const items = lines.map((line) => {
      const parts = line.split(':');
      return {
        host: parts[0]?.trim(),
        port: Number(parts[1]?.trim()),
        username: parts[2]?.trim() || undefined,
        password: parts[3]?.trim() || undefined,
        protocol: 'socks5',
      };
    }).filter((p) => p.host && p.port);

    try {
      setIsLoading(true);
      const res = await addBulkProxies(items);
      toast.success(
        isRtl ? 'تم استيراد البروكسيات بنجاح!' : 'Bulk Proxies Imported!',
        isRtl ? `تمت إضافة ${res.count} بروكسي.` : `Added ${res.count} proxies.`
      );
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(isRtl ? 'فشل الاستيراد' : 'Bulk import failed', err.response?.data?.message || err.message);
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
                <Server className="w-3.5 h-3.5" />
              </div>
              <div>
                <h2 className="text-xs font-bold text-[#111827] dark:text-white">
                  {isRtl ? 'إضافة بروكسي حماية جديد' : 'Add Protection Proxy'}
                </h2>
                <p className="text-[10px] text-[#94A3B8]">
                  {isRtl ? 'بروتوكول SOCKS5 / HTTP المخصص' : 'Custom SOCKS5 / HTTP Proxy'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-[#94A3B8] hover:text-[#111827] dark:hover:text-white transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Mode Switcher */}
          <div className="px-5 pt-3 pb-1 border-b border-black/[.04] dark:border-white/[.04] bg-[#F6F8FB] dark:bg-[#171D28] flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setMode('single')}
              className={`flex-1 py-1 rounded-md text-xs font-bold transition cursor-pointer ${
                mode === 'single'
                  ? 'bg-white dark:bg-[#11151D] text-[#007AFF] shadow-xs'
                  : 'text-[#64748B] dark:text-[#94A3B8] hover:text-[#111827] dark:hover:text-white'
              }`}
            >
              {isRtl ? 'بروكسي فردي' : 'Single Proxy'}
            </button>
            <button
              type="button"
              onClick={() => setMode('bulk')}
              className={`flex-1 py-1 rounded-md text-xs font-bold transition cursor-pointer ${
                mode === 'bulk'
                  ? 'bg-white dark:bg-[#11151D] text-[#007AFF] shadow-xs'
                  : 'text-[#64748B] dark:text-[#94A3B8] hover:text-[#111827] dark:hover:text-white'
              }`}
            >
              {isRtl ? 'استيراد جماعي (Bulk)' : 'Bulk Import'}
            </button>
          </div>

          {/* Form */}
          <div className="p-5">
            {mode === 'single' ? (
              <form onSubmit={handleSubmitSingle} className="space-y-3 text-xs text-start">
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <label className="font-bold text-[#111827] dark:text-slate-300 block mb-1">
                      {isRtl ? 'عنوان الخادم (Host/IP)' : 'Host / IP'}
                    </label>
                    <input
                      type="text"
                      required
                      value={host}
                      onChange={(e) => setHost(e.target.value)}
                      placeholder="127.0.0.1 or proxy.org"
                      className="w-full px-3 py-2 bg-[#F6F8FB] dark:bg-[#171D28] border border-black/[.08] dark:border-white/10 rounded-xl font-mono text-xs text-[#111827] dark:text-white placeholder-[#94A3B8] focus:outline-none focus:border-[#007AFF]"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-[#111827] dark:text-slate-300 block mb-1">
                      {isRtl ? 'المنفذ' : 'Port'}
                    </label>
                    <input
                      type="number"
                      required
                      value={port}
                      onChange={(e) => setPort(e.target.value)}
                      placeholder="1080"
                      className="w-full px-3 py-2 bg-[#F6F8FB] dark:bg-[#171D28] border border-black/[.08] dark:border-white/10 rounded-xl font-mono text-xs text-[#111827] dark:text-white placeholder-[#94A3B8] focus:outline-none focus:border-[#007AFF]"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-bold text-[#111827] dark:text-slate-300 block mb-1">
                    {isRtl ? 'البروتوكول' : 'Protocol'}
                  </label>
                  <select
                    value={protocol}
                    onChange={(e) => setProtocol(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F6F8FB] dark:bg-[#171D28] border border-black/[.08] dark:border-white/10 rounded-xl text-xs text-[#111827] dark:text-white focus:outline-none focus:border-[#007AFF] cursor-pointer"
                  >
                    <option value="socks5">SOCKS5 (موصى به لـ MTProto)</option>
                    <option value="http">HTTP / HTTPS</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="font-bold text-[#111827] dark:text-slate-300 block mb-1">
                      {isRtl ? 'اسم المستخدم (اختياري)' : 'Username (Optional)'}
                    </label>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="user"
                      className="w-full px-3 py-2 bg-[#F6F8FB] dark:bg-[#171D28] border border-black/[.08] dark:border-white/10 rounded-xl text-xs text-[#111827] dark:text-white placeholder-[#94A3B8] focus:outline-none focus:border-[#007AFF]"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-[#111827] dark:text-slate-300 block mb-1">
                      {isRtl ? 'كلمة المرور (اختياري)' : 'Password (Optional)'}
                    </label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="pass"
                      className="w-full px-3 py-2 bg-[#F6F8FB] dark:bg-[#171D28] border border-black/[.08] dark:border-white/10 rounded-xl text-xs text-[#111827] dark:text-white placeholder-[#94A3B8] focus:outline-none focus:border-[#007AFF]"
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
                    disabled={isLoading || !host.trim() || !port.trim()}
                    className="px-4 py-1.5 rounded-lg bg-[#007AFF] hover:bg-[#0062CC] text-white text-xs font-bold flex items-center gap-1.5 transition active:scale-95 disabled:opacity-50 cursor-pointer shadow-sm"
                  >
                    <Server className="w-3.5 h-3.5" />
                    <span>{isLoading ? (isRtl ? 'جاري الحفظ...' : 'Saving...') : (isRtl ? 'حفظ البروكسي' : 'Add Proxy')}</span>
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleSubmitBulk} className="space-y-3 text-xs text-start">
                <div>
                  <label className="font-bold text-[#111827] dark:text-slate-300 block mb-1">
                    {isRtl ? 'قائمة البروكسيات (سطر لكل بروكسي)' : 'Proxy List (One per line)'}
                  </label>
                  <textarea
                    rows={7}
                    required
                    value={bulkText}
                    onChange={(e) => setBulkText(e.target.value)}
                    placeholder={`192.168.1.1:1080:user:pass\n10.0.0.1:8080`}
                    className="w-full p-2.5 bg-[#F6F8FB] dark:bg-[#171D28] border border-black/[.08] dark:border-white/10 rounded-xl font-mono text-xs text-[#111827] dark:text-white placeholder-[#94A3B8] focus:outline-none focus:border-[#007AFF]"
                  />
                  <p className="text-[10px] text-[#94A3B8] mt-1 font-mono">
                    {isRtl ? 'التنسيق: host:port:user:pass أو host:port' : 'Format: host:port:user:pass or host:port'}
                  </p>
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
                    disabled={isLoading || !bulkText.trim()}
                    className="px-4 py-1.5 rounded-lg bg-[#007AFF] hover:bg-[#0062CC] text-white text-xs font-bold flex items-center gap-1.5 transition active:scale-95 disabled:opacity-50 cursor-pointer shadow-sm"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>{isLoading ? (isRtl ? 'جاري الاستيراد...' : 'Importing...') : (isRtl ? 'استيراد الكل' : 'Import All')}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
