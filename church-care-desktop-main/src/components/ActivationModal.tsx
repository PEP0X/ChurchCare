import React, { useState, useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { ShieldCheck, KeyRound, CheckCircle2, AlertTriangle, Loader2, ClipboardPaste, X, Copy, Check, Cpu } from 'lucide-react';

interface ActivationModalProps {
  isOpen: boolean;
  reason?: string | null;
  onActivated: (clientName: string) => void;
}

interface LicenseStatus {
  is_licensed: boolean;
  client_name: string | null;
  serial_key: string | null;
  hwid: string;
  message: string;
}

export const ActivationModal: React.FC<ActivationModalProps> = ({ isOpen, reason, onActivated }) => {
  const [serialInput, setSerialInput] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isClosing, setIsClosing] = useState<boolean>(false);
  const [deviceHwid, setDeviceHwid] = useState<string>('');
  const [copiedHwid, setCopiedHwid] = useState<boolean>(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const prevIsOpenRef = useRef<boolean>(false);
  const prevReasonRef = useRef<string | null | undefined>(undefined);

  // Fetch device HWID for display and ease of support
  useEffect(() => {
    invoke<string>('get_device_hwid')
      .then(hwid => setDeviceHwid(hwid))
      .catch(() => {});
  }, []);

  // Reset state and handle revocation reason ONLY when modal opens or reason changes
  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      setSuccessMsg(null);
      setIsLoading(false);
      setIsClosing(false);
      setSerialInput('');
      setErrorMsg(reason || null);
      prevReasonRef.current = reason;
      setTimeout(() => {
        inputRef.current?.focus();
      }, 200);
    } else if (isOpen && reason && reason !== prevReasonRef.current) {
      setErrorMsg(reason);
      prevReasonRef.current = reason;
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen, reason]);

  if (!isOpen) return null;

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setSerialInput(text.trim().toUpperCase());
        setErrorMsg(null);
      }
    } catch {
      // Clipboard access not available
    }
  };

  const handleCopyHwid = () => {
    if (deviceHwid) {
      navigator.clipboard.writeText(deviceHwid);
      setCopiedHwid(true);
      setTimeout(() => setCopiedHwid(false), 2000);
    }
  };

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = serialInput.trim().toUpperCase();
    if (!clean) {
      setErrorMsg('يرجى إدخال كود السيريال الخاص بك للمتابعة.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await invoke<LicenseStatus>('activate_license_online', { serial: clean });
      if (res.is_licensed) {
        setSuccessMsg(res.message);
        setTimeout(() => {
          setIsClosing(true);
          setTimeout(() => {
            onActivated(res.client_name || 'العميل');
            setSuccessMsg(null);
            setSerialInput('');
            setErrorMsg(null);
            setIsClosing(false);
          }, 350);
        }, 1100);
      } else {
        setErrorMsg(res.message);
      }
    } catch (err: any) {
      const errStr = typeof err === 'string' ? err : err?.message || JSON.stringify(err);
      setErrorMsg(errStr);
    } finally {
      setIsLoading(false);
    }
  };

  const isFormValid = serialInput.trim().length >= 10;

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-[99999] bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-4 sm:p-6 select-none font-['IBM_Plex_Sans_Arabic']"
    >
      {/* Background Subtle Tech Pattern (No muddy slop) */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: 'radial-gradient(#6366f1 1px, transparent 1px)',
          backgroundSize: '24px 24px'
        }}
      />

      {/* Main Activation Card */}
      <div 
        className={`relative w-full max-w-xl bg-slate-900/98 border border-slate-700/80 ring-1 ring-white/10 rounded-3xl sm:rounded-4xl shadow-2xl overflow-hidden text-right transition-all duration-300 transform ${
          isClosing 
            ? 'opacity-0 scale-95 translate-y-4' 
            : 'animate-in fade-in zoom-in-95 duration-300'
        }`}
      >
        {/* Top Crisp Security Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950/50 to-slate-900 p-6 sm:p-7 border-b border-slate-800 relative">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-indigo-500/15 border border-indigo-400/30 flex items-center justify-center text-indigo-400 shrink-0 shadow-lg shadow-indigo-500/10">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[11px] font-bold border border-indigo-500/30 mb-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                حماية رقمية معتمدة
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-wide">
                تفعيل برنامج خدمة القلب المتسع
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                نظام التراخيص المقفل بالعتاد (Hardware-Locked Security)
              </p>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-8 space-y-6">

          {/* Device HWID Card */}
          {deviceHwid && (
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3.5 sm:p-4 flex items-center justify-between gap-3 shadow-inner">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-indigo-400 shrink-0">
                  <Cpu className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] text-slate-400 font-medium">بصمة هذا الجهاز (HWID):</div>
                  <div className="font-mono text-xs sm:text-sm font-bold text-indigo-300 tracking-wider truncate select-all" dir="ltr">
                    {deviceHwid}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCopyHwid}
                className="shrink-0 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                title="نسخ بصمة الجهاز لمشاركتها مع إدارة التراخيص"
              >
                {copiedHwid ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-300 font-bold">تم النسخ</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-400" />
                    <span>نسخ البصمة</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Serial Input Form */}
          <form onSubmit={handleActivate} className="space-y-5">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs sm:text-sm font-bold text-slate-200">
                  كود السيريال الخاص بك (Serial Key):
                </label>
                <span className="text-[11px] text-slate-400 font-mono" dir="ltr">
                  CCARE-XXXX-XXXX-XXXX
                </span>
              </div>

              <div className="relative flex items-center">
                <input
                  ref={inputRef}
                  type="text"
                  value={serialInput}
                  onChange={(e) => {
                    setSerialInput(e.target.value.toUpperCase());
                    if (errorMsg) setErrorMsg(null);
                  }}
                  placeholder="CCARE-••••-••••-••••"
                  disabled={isLoading || !!successMsg}
                  className="w-full bg-slate-950 border-2 border-slate-700 focus:border-indigo-500 rounded-2xl py-3.5 px-12 text-white placeholder:text-slate-600 font-mono tracking-widest text-center text-base sm:text-lg focus:outline-none focus:ring-4 focus:ring-indigo-500/20 shadow-inner transition font-bold"
                  dir="ltr"
                />

                <KeyRound className="w-5 h-5 text-slate-500 absolute left-4 top-4 pointer-events-none" />

                <div className="absolute right-3 flex items-center gap-1.5">
                  {serialInput && !isLoading && !successMsg && (
                    <button
                      type="button"
                      onClick={() => setSerialInput('')}
                      className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition cursor-pointer"
                      title="مسح الكود"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                  {!serialInput && !isLoading && !successMsg && (
                    <button
                      type="button"
                      onClick={handlePaste}
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-indigo-300 hover:text-white rounded-xl border border-slate-700 transition cursor-pointer font-bold shadow-sm"
                      title="لصق الكود من الحافظة"
                    >
                      <ClipboardPaste className="w-3.5 h-3.5 text-indigo-400" />
                      <span>لصق</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Error Message (High-contrast, bold, clear) */}
            {errorMsg && (
              <div className="bg-rose-950/80 border-2 border-rose-500/80 rounded-2xl p-4 flex items-start gap-3.5 text-white shadow-xl shadow-rose-950/40 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="p-1.5 rounded-xl bg-rose-900/80 border border-rose-500/60 shrink-0 mt-0.5">
                  <AlertTriangle className="w-5 h-5 text-rose-200" />
                </div>
                <div className="space-y-1">
                  <span className="font-extrabold text-sm text-rose-200 block">تنبيه الترخيص:</span>
                  <p className="text-xs sm:text-sm leading-relaxed text-rose-100 font-medium">{errorMsg}</p>
                </div>
              </div>
            )}

            {/* Success Message */}
            {successMsg && (
              <div className="bg-emerald-950/80 border-2 border-emerald-500/80 rounded-2xl p-4 flex items-center gap-3.5 text-white shadow-xl shadow-emerald-950/40 animate-in fade-in zoom-in-95 duration-300">
                <div className="p-1.5 rounded-xl bg-emerald-900/80 border border-emerald-500/60 shrink-0">
                  <CheckCircle2 className="w-5 h-5 text-emerald-200" />
                </div>
                <div>
                  <span className="font-extrabold text-sm text-emerald-200 block">تم التفعيل بنجاح!</span>
                  <p className="text-xs sm:text-sm text-emerald-100 font-medium">{successMsg}</p>
                </div>
              </div>
            )}

            {/* Action Submit Button (Crystal clear text in ALL states) */}
            <button
              type="submit"
              disabled={isLoading || !!successMsg || !isFormValid}
              className={`w-full py-4 px-6 rounded-2xl font-black text-base tracking-wide transition-all duration-200 flex items-center justify-center gap-3 shadow-xl ${
                isLoading
                  ? 'bg-indigo-600 text-white cursor-wait opacity-90'
                  : successMsg
                  ? 'bg-emerald-600 text-white cursor-default'
                  : isFormValid
                  ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-500 hover:from-blue-500 hover:to-indigo-400 text-white shadow-indigo-600/30 cursor-pointer active:scale-[0.99] border border-indigo-400/30 ring-2 ring-indigo-500/20'
                  : 'bg-slate-800/90 text-slate-300 border border-slate-700/80 cursor-not-allowed shadow-none'
              }`}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin text-white" />
                  <span className="font-bold text-white text-base">جاري التحقق والتفعيل المشفر أونلاين...</span>
                </>
              ) : successMsg ? (
                <>
                  <CheckCircle2 className="w-5 h-5 text-white" />
                  <span className="font-black text-white text-base">تم التفعيل بنجاح • جاري الفتح...</span>
                </>
              ) : (
                <>
                  <KeyRound className={`w-5 h-5 ${isFormValid ? 'text-indigo-200' : 'text-slate-400'}`} />
                  <span className={isFormValid ? 'text-white' : 'text-slate-300 font-bold'}>
                    تفعيل البرنامج الآن
                  </span>
                </>
              )}
            </button>

            {!isFormValid && !errorMsg && (
              <p className="text-center text-[11px] text-slate-400 font-medium">
                💡 أدخل السيريال الخاص بك للضغط على زر التفعيل
              </p>
            )}
          </form>

        </div>

        {/* Footer info */}
        <div className="bg-slate-950/90 px-6 py-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-400">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>يتطلب التفعيل اتصالاً لمرة واحدة فقط بالإنترنت</span>
          </div>
          <span className="text-[11px] text-slate-500 font-mono">ChurchCare Security v2026</span>
        </div>

      </div>
    </div>
  );
};
