'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  CreditCard,
  Copy,
  Check,
  UploadCloud,
  FileCheck,
  AlertCircle,
  Clock,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  QrCode,
  Sparkles,
} from 'lucide-react';
import { Language } from '../../lib/translations';
import {
  getBillingMethods,
  createBillingOrder,
  submitBillingReceipt,
  uploadReceiptFile,
} from '../../lib/api';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
  preSelectedPlan?: {
    id: string;
    name: string;
    nameAr: string;
    price: number;
    messages: number;
    accounts: number;
  } | null;
  onSuccess?: () => void;
}

export function PaymentModal({
  isOpen,
  onClose,
  lang,
  preSelectedPlan,
  onSuccess,
}: PaymentModalProps) {
  const isRtl = lang === 'ar';
  const [methods, setMethods] = useState<any[]>([]);
  const [selectedMethodId, setSelectedMethodId] = useState<string>('CRYPTO_USDT');
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [order, setOrder] = useState<any | null>(null);

  // Form states
  const [txId, setTxId] = useState('');
  const [notes, setNotes] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const plan = preSelectedPlan || {
    id: 'PRO',
    name: 'Professional Plan',
    nameAr: 'باقة المحترفين',
    price: 79,
    messages: 30000,
    accounts: 25,
  };

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setError(null);
      setTxId('');
      setNotes('');
      setFile(null);
      setPreviewUrl(null);
      setOrder(null);
      getBillingMethods()
        .then((data) => {
          if (Array.isArray(data) && data.length > 0) {
            setMethods(data);
            setSelectedMethodId(data[0].id);
          }
        })
        .catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const currentMethod = methods.find((m) => m.id === selectedMethodId) || methods[0];

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setFile(selected);
      if (selected.type.startsWith('image/')) {
        setPreviewUrl(URL.createObjectURL(selected));
      } else {
        setPreviewUrl(null);
      }
    }
  };

  const handleProceedToProof = async () => {
    setLoading(true);
    setError(null);
    try {
      const newOrder = await createBillingOrder({
        planRequested: plan.id,
        durationMonths: 1,
        paymentMethod: selectedMethodId,
        amountPaid: plan.price,
        currency: 'USD',
      });
      setOrder(newOrder);
      setStep(2);
    } catch (err: any) {
      setError(err?.response?.data?.message || (isRtl ? 'حدث خطأ أثناء إنشاء الطلب' : 'Failed to create order'));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitProof = async () => {
    if (!order) return;
    if (!txId.trim()) {
      setError(isRtl ? 'يرجى إدخال رقم المعاملة أو كود التحويل (TxID / Ref)' : 'Please enter transaction reference / TxID');
      return;
    }
    if (!file && !previewUrl) {
      setError(isRtl ? 'يرجى إرفاق صورة إيصال التحويل البنكي أو السكرين شوت' : 'Please upload transfer receipt image');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let uploadedImageUrl = '';
      if (file) {
        const uploadRes = await uploadReceiptFile(file);
        uploadedImageUrl = uploadRes.url;
      }

      await submitBillingReceipt({
        orderId: order.id,
        transactionReference: txId.trim(),
        receiptImageUrl: uploadedImageUrl,
        userNotes: notes.trim(),
      });

      setStep(3);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(err?.response?.data?.message || (isRtl ? 'فشل إرسال الإيصال. يرجى المحاولة ثانية' : 'Failed to submit proof'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs animate-[fadeIn_0.15s_ease-out]">
      <div
        className="relative w-full max-w-xl bg-white dark:bg-[#11151D] border border-black/[.08] dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-start"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-black/[.06] dark:border-white/[.07] flex items-center justify-between bg-[#FAFAFC] dark:bg-[#0E121A]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#007AFF]/10 text-[#007AFF] flex items-center justify-center shrink-0">
              <CreditCard className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-[#111827] dark:text-white">
                  {isRtl ? 'سداد وتفعيل الاشتراك' : 'Manual Payment & Activation'}
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#007AFF]/10 text-[#007AFF]">
                  {isRtl ? plan.nameAr : plan.name} (${plan.price})
                </span>
              </div>
              <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                {isRtl
                  ? 'اختر طريقة التحويل ثم ارفع صورة الإيصال للاعتماد الفوري'
                  : 'Select payment method, transfer funds, and upload receipt'}
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

        {/* Stepper */}
        <div className="px-4 py-2 bg-[#F6F8FB] dark:bg-[#151A24] border-b border-black/[.04] dark:border-white/[.04] flex items-center justify-between text-[11px]">
          <div className={`flex items-center gap-1.5 font-bold ${step >= 1 ? 'text-[#007AFF]' : 'text-[#94A3B8]'}`}>
            <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] ${step >= 1 ? 'bg-[#007AFF] text-white' : 'bg-black/[.06] dark:bg-white/10 text-[#94A3B8]'}`}>1</span>
            <span>{isRtl ? '1. تفاصيل التحويل' : '1. Transfer Info'}</span>
          </div>
          <div className="h-px flex-1 mx-3 bg-black/[.06] dark:bg-white/10" />
          <div className={`flex items-center gap-1.5 font-bold ${step >= 2 ? 'text-[#007AFF]' : 'text-[#94A3B8]'}`}>
            <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] ${step >= 2 ? 'bg-[#007AFF] text-white' : 'bg-black/[.06] dark:bg-white/10 text-[#94A3B8]'}`}>2</span>
            <span>{isRtl ? '2. إرفاق الإيصال' : '2. Attach Receipt'}</span>
          </div>
          <div className="h-px flex-1 mx-3 bg-black/[.06] dark:bg-white/10" />
          <div className={`flex items-center gap-1.5 font-bold ${step === 3 ? 'text-[#34C759]' : 'text-[#94A3B8]'}`}>
            <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] ${step === 3 ? 'bg-[#34C759] text-white' : 'bg-black/[.06] dark:bg-white/10 text-[#94A3B8]'}`}>3</span>
            <span>{isRtl ? '3. المراجعة' : '3. Review'}</span>
          </div>
        </div>

        {/* Body */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1">
          {error && (
            <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* STEP 1 */}
          {step === 1 && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-[#111827] dark:text-white mb-1.5">
                  {isRtl ? 'اختر وسيلة الدفع:' : 'Select Payment Method:'}
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {methods.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setSelectedMethodId(m.id)}
                      className={`p-2.5 rounded-xl border text-start transition cursor-pointer flex flex-col justify-between ${
                        selectedMethodId === m.id
                          ? 'border-[#007AFF] bg-[#007AFF]/[0.05]'
                          : 'border-black/[.06] dark:border-white/[.07] bg-[#F6F8FB] dark:bg-[#171D28] hover:border-black/20 dark:hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="font-bold text-xs text-[#111827] dark:text-white">
                          {isRtl ? m.nameAr : m.name}
                        </span>
                        {selectedMethodId === m.id && (
                          <div className="w-3.5 h-3.5 rounded-full bg-[#007AFF] flex items-center justify-center text-white">
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                          </div>
                        )}
                      </div>
                      {m.badge && (
                        <span className="text-[10px] text-[#007AFF] font-medium mt-0.5">
                          {m.badge}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Deposit Card Details */}
              {currentMethod && (
                <div className="p-3.5 rounded-xl bg-[#F6F8FB] dark:bg-[#171D28] border border-black/[.06] dark:border-white/[.07] space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-black/[.06] dark:border-white/[.07]">
                    <div>
                      <span className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                        {isRtl ? 'المبلغ المطلوب:' : 'Amount Due:'}
                      </span>
                      <div className="text-xl font-black font-mono text-[#111827] dark:text-white flex items-baseline gap-1">
                        ${plan.price}
                        <span className="text-xs text-[#94A3B8] font-normal">USD</span>
                      </div>
                    </div>
                    <div className="text-end">
                      <span className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                        {isRtl ? 'الشبكة / النوع:' : 'Network:'}
                      </span>
                      <div className="text-xs font-bold text-[#007AFF] font-mono">
                        {currentMethod.network || currentMethod.type}
                      </div>
                    </div>
                  </div>

                  {/* Address & Copy */}
                  <div>
                    <label className="block text-[11px] font-bold text-[#64748B] dark:text-[#94A3B8] mb-1">
                      {isRtl ? 'عنوان المحفظة / الحساب:' : 'Deposit Address / Account:'}
                    </label>
                    <div className="flex items-center gap-1.5 p-1.5 rounded-lg bg-white dark:bg-[#11151D] border border-black/[.08] dark:border-white/10">
                      <input
                        readOnly
                        value={currentMethod.address}
                        className="bg-transparent text-[#111827] dark:text-white font-mono text-xs flex-1 px-2 outline-none select-all"
                      />
                      <button
                        type="button"
                        onClick={() => handleCopy(currentMethod.address)}
                        className="h-7 px-2.5 rounded-md bg-[#007AFF]/10 hover:bg-[#007AFF]/20 text-[#007AFF] text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                      >
                        {isCopied ? (
                          <>
                            <Check className="w-3 h-3 text-[#34C759]" />
                            <span className="text-[#34C759]">{isRtl ? 'تم النسخ' : 'Copied'}</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>{isRtl ? 'نسخ' : 'Copy'}</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* QR & Instructions */}
                  <div className="flex items-center gap-3 p-2.5 rounded-lg bg-white dark:bg-[#11151D] border border-black/[.04] dark:border-white/[.04]">
                    <div className="w-14 h-14 rounded-lg bg-white p-1 shrink-0 flex items-center justify-center border border-black/[.06]">
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(currentMethod.address)}`}
                        alt="Deposit QR"
                        className="w-full h-full object-contain"
                        loading="lazy"
                      />
                    </div>
                    <div className="text-xs space-y-0.5">
                      <div className="font-bold flex items-center gap-1 text-[#111827] dark:text-white">
                        <QrCode className="w-3.5 h-3.5 text-[#007AFF]" />
                        {isRtl ? 'امسح رمز الاستجابة السريع' : 'Scan QR Code'}
                      </div>
                      <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8] leading-tight">
                        {isRtl ? currentMethod.instructionsAr : currentMethod.instructions}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <div className="space-y-3">
              <div className="p-2.5 rounded-xl bg-[#007AFF]/10 border border-[#007AFF]/20 text-[#007AFF] text-xs flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>
                  {isRtl
                    ? `رقم الطلب المسجل: #${order?.id?.slice(0, 8)}. يرجى إرفاق إيصال التحويل.`
                    : `Order recorded (#${order?.id?.slice(0, 8)}). Please attach transfer proof.`}
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#111827] dark:text-white mb-1">
                  {isRtl ? 'رقم المعاملة / كود التحويل (TxID / Ref) *' : 'Transaction Ref / TxID *'}
                </label>
                <input
                  type="text"
                  value={txId}
                  onChange={(e) => setTxId(e.target.value)}
                  placeholder={isRtl ? 'مثال: 0x8f... أو رقم الحوالة' : 'e.g. 0x8f... or Bank Ref #'}
                  className="w-full h-9 px-3 rounded-xl bg-[#F6F8FB] dark:bg-[#171D28] border border-black/[.08] dark:border-white/10 text-xs text-[#111827] dark:text-white font-mono focus:border-[#007AFF] outline-none"
                />
              </div>

              {/* Upload Dropzone */}
              <div>
                <label className="block text-xs font-bold text-[#111827] dark:text-white mb-1">
                  {isRtl ? 'صورة الإيصال أو التحويل *' : 'Receipt Screenshot *'}
                </label>
                <label className="border border-dashed border-black/20 dark:border-white/20 hover:border-[#007AFF] rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition bg-[#F6F8FB] dark:bg-[#171D28]">
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,application/pdf"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  {previewUrl ? (
                    <div className="flex flex-col items-center gap-1.5">
                      <img
                        src={previewUrl}
                        alt="Receipt preview"
                        className="max-h-32 rounded-lg object-contain border border-black/[.08] dark:border-white/10"
                      />
                      <span className="text-[10px] text-[#007AFF] font-bold">
                        {isRtl ? 'انقر لتغيير الصورة' : 'Click to replace'}
                      </span>
                    </div>
                  ) : file ? (
                    <div className="flex items-center gap-2 text-[#34C759] text-xs font-bold">
                      <FileCheck className="w-4 h-4" />
                      <span>{file.name}</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center text-center gap-1">
                      <UploadCloud className="w-6 h-6 text-[#007AFF]" />
                      <div className="text-xs font-bold text-[#111827] dark:text-white">
                        {isRtl ? 'اسحب الصورة هنا أو اضغط للاختيار' : 'Upload receipt file or screenshot'}
                      </div>
                      <div className="text-[10px] text-[#94A3B8]">
                        PNG, JPG, PDF (max 10MB)
                      </div>
                    </div>
                  )}
                </label>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#111827] dark:text-white mb-1">
                  {isRtl ? 'ملاحظات إضافية (اختياري)' : 'Additional Notes (Optional)'}
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={isRtl ? 'اسم المحول أو تفاصيل أخرى...' : 'Sender name or extra details...'}
                  className="w-full px-3 py-2 rounded-xl bg-[#F6F8FB] dark:bg-[#171D28] border border-black/[.08] dark:border-white/10 text-xs text-[#111827] dark:text-white focus:border-[#007AFF] outline-none resize-none"
                />
              </div>
            </div>
          )}

          {/* STEP 3 */}
          {step === 3 && (
            <div className="py-4 flex flex-col items-center text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-[#34C759]/10 text-[#34C759] flex items-center justify-center">
                <FileCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#111827] dark:text-white">
                  {isRtl ? 'تم استلام الإيصال بنجاح!' : 'Receipt Submitted!'}
                </h3>
                <p className="text-xs text-[#64748B] dark:text-[#94A3B8] max-w-sm mt-0.5">
                  {isRtl
                    ? 'طلبك الآن قيد المراجعة والاعتماد الفوري. سيتم تفعيل حصتك خلال دقائق.'
                    : 'Your order is pending review. Quota will be credited within minutes.'}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-[#F6F8FB] dark:bg-[#171D28] border border-black/[.06] dark:border-white/[.07] w-full max-w-xs text-xs space-y-1.5 font-mono text-start">
                <div className="flex justify-between text-[#64748B] dark:text-[#94A3B8]">
                  <span>{isRtl ? 'الطلب:' : 'Order:'}</span>
                  <span className="font-bold text-[#111827] dark:text-white">#{order?.id?.slice(0, 8)}</span>
                </div>
                <div className="flex justify-between text-[#64748B] dark:text-[#94A3B8]">
                  <span>{isRtl ? 'المبلغ:' : 'Amount:'}</span>
                  <span className="font-bold text-[#007AFF]">${plan.price} USD</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 bg-[#FAFAFC] dark:bg-[#0E121A] border-t border-black/[.06] dark:border-white/[.07] flex items-center justify-between">
          {step === 1 && (
            <>
              <button
                type="button"
                onClick={onClose}
                className="h-8 px-3 rounded-lg border border-black/[.08] dark:border-white/10 hover:bg-black/[.04] dark:hover:bg-white/5 text-xs text-[#64748B] dark:text-[#94A3B8] font-bold transition cursor-pointer"
              >
                {isRtl ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleProceedToProof}
                disabled={loading}
                className="h-8 px-3.5 rounded-lg bg-[#007AFF] hover:bg-[#0062CC] text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <span>{isRtl ? 'جاري التحميل...' : 'Loading...'}</span>
                ) : (
                  <>
                    <span>{isRtl ? 'قمت بالتحويل، إرفاق الإيصال' : 'Transferred, Attach Proof'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </>
          )}

          {step === 2 && (
            <>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="h-8 px-3 rounded-lg border border-black/[.08] dark:border-white/10 hover:bg-black/[.04] dark:hover:bg-white/5 text-xs text-[#64748B] dark:text-[#94A3B8] font-bold flex items-center gap-1 transition cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>{isRtl ? 'رجوع' : 'Back'}</span>
              </button>
              <button
                type="button"
                onClick={handleSubmitProof}
                disabled={loading}
                className="h-8 px-3.5 rounded-lg bg-[#34C759] hover:bg-[#2EB04F] text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <span>{isRtl ? 'جاري الإرسال...' : 'Submitting...'}</span>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{isRtl ? 'إرسال الإيصال للاعتماد' : 'Submit for Review'}</span>
                  </>
                )}
              </button>
            </>
          )}

          {step === 3 && (
            <button
              type="button"
              onClick={onClose}
              className="w-full h-8 rounded-lg bg-[#007AFF] hover:bg-[#0062CC] text-white font-bold text-xs transition cursor-pointer"
            >
              {isRtl ? 'إغلاق ومتابعة' : 'Close'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
