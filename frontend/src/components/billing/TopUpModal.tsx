'use client';

import React, { useState } from 'react';
import { X, Zap, Check, ArrowRight, ShieldCheck } from 'lucide-react';
import { Language } from '../../lib/translations';

interface TopUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
  onSelectPackage: (pkg: {
    id: string;
    name: string;
    nameAr: string;
    price: number;
    messages: number;
    accounts: number;
  }) => void;
}

export function TopUpModal({
  isOpen,
  onClose,
  lang,
  onSelectPackage,
}: TopUpModalProps) {
  const isRtl = lang === 'ar';
  const [selectedPackId, setSelectedPackId] = useState<string>('TOPUP_10K');

  if (!isOpen) return null;

  const packages = [
    {
      id: 'TOPUP_5K',
      name: '5,000 Messages',
      nameAr: 'شحن 5,000 رسالة',
      messages: 5000,
      price: 15,
      rate: '$3.00 / 1K',
      badge: null,
    },
    {
      id: 'TOPUP_10K',
      name: '10,000 Messages',
      nameAr: 'شحن 10,000 رسالة',
      messages: 10000,
      price: 25,
      rate: '$2.50 / 1K',
      badge: isRtl ? 'الأكثر طلباً' : 'Popular',
      popular: true,
    },
    {
      id: 'TOPUP_25K',
      name: '25,000 Messages',
      nameAr: 'شحن 25,000 رسالة',
      messages: 25000,
      price: 55,
      rate: '$2.20 / 1K',
      badge: isRtl ? 'خصم 25%' : '25% OFF',
    },
    {
      id: 'TOPUP_50K',
      name: '50,000 Messages',
      nameAr: 'شحن 50,000 رسالة',
      messages: 50000,
      price: 99,
      rate: '$1.98 / 1K',
      badge: isRtl ? 'أفضل قيمة' : 'Best Value',
    },
  ];

  const currentPack = packages.find((p) => p.id === selectedPackId) || packages[1];

  const handleConfirm = () => {
    onSelectPackage({
      id: currentPack.id,
      name: currentPack.name,
      nameAr: currentPack.nameAr,
      price: currentPack.price,
      messages: currentPack.messages,
      accounts: 0,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs animate-[fadeIn_0.15s_ease-out]">
      <div
        className="relative w-full max-w-lg bg-white dark:bg-[#11151D] border border-black/[.08] dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-start"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-black/[.06] dark:border-white/[.07] flex items-center justify-between bg-[#FAFAFC] dark:bg-[#0E121A]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
              <Zap className="w-4 h-4 fill-amber-500 text-amber-500" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#111827] dark:text-white">
                {isRtl ? 'شحن رصيد رسائل إضافي' : 'Instant Message Top-Up'}
              </h2>
              <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                {isRtl
                  ? 'رصيد إضافي فوري دون الحاجة لتغيير باقتك الحالية'
                  : 'Add extra message credits directly to your quota'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#94A3B8] hover:text-[#111827] dark:hover:text-white hover:bg-black/[.04] dark:hover:bg-white/5 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {packages.map((pkg) => {
              const isSelected = selectedPackId === pkg.id;
              return (
                <div
                  key={pkg.id}
                  onClick={() => setSelectedPackId(pkg.id)}
                  className={`relative p-3 rounded-xl border transition cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'border-[#007AFF] bg-[#007AFF]/[0.04] shadow-xs'
                      : 'border-black/[.06] dark:border-white/[.07] bg-[#F6F8FB] dark:bg-[#171D28] hover:border-black/20 dark:hover:border-white/20'
                  }`}
                >
                  {pkg.badge && (
                    <span className="absolute -top-2 end-2.5 px-2 py-0.2 rounded-full text-[9px] font-bold bg-[#007AFF] text-white">
                      {pkg.badge}
                    </span>
                  )}
                  <div>
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs font-bold text-[#111827] dark:text-white">
                        {isRtl ? pkg.nameAr : pkg.name}
                      </span>
                      {isSelected && (
                        <div className="w-4 h-4 rounded-full bg-[#007AFF] text-white flex items-center justify-center">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                      )}
                    </div>
                    <div className="text-lg font-black font-mono text-[#111827] dark:text-white my-0.5">
                      +{pkg.messages.toLocaleString()}
                      <span className="text-[10px] font-normal text-[#94A3B8] mx-1">
                        {isRtl ? 'رسالة' : 'msgs'}
                      </span>
                    </div>
                  </div>
                  <div className="pt-2 mt-1 border-t border-black/[.04] dark:border-white/[.04] flex items-center justify-between text-xs font-mono">
                    <span className="font-bold text-[#007AFF]">${pkg.price} USD</span>
                    <span className="text-[10px] text-[#94A3B8]">{pkg.rate}</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="p-2.5 rounded-xl bg-[#F6F8FB] dark:bg-[#171D28] border border-black/[.06] dark:border-white/[.07] text-[11px] text-[#64748B] dark:text-[#94A3B8] flex items-center gap-2">
            <ShieldCheck className="w-3.5 h-3.5 text-[#34C759] shrink-0" />
            <span>
              {isRtl
                ? 'الرصيد المشحون لا تنتهي صلاحيته طالما كان الحساب نشطاً.'
                : 'Top-up credits do not expire as long as your account is active.'}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 bg-[#FAFAFC] dark:bg-[#0E121A] border-t border-black/[.06] dark:border-white/[.07] flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="h-8 px-3 rounded-lg border border-black/[.08] dark:border-white/10 hover:bg-black/[.04] dark:hover:bg-white/5 text-xs text-[#64748B] dark:text-[#94A3B8] font-bold transition cursor-pointer"
          >
            {isRtl ? 'إلغاء' : 'Cancel'}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="h-8 px-4 rounded-lg bg-[#007AFF] hover:bg-[#0062CC] text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-sm shadow-[#007AFF]/20"
          >
            <span>{isRtl ? `متابعة الدفع ($${currentPack.price})` : `Proceed to Pay ($${currentPack.price})`}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
