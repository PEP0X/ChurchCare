import React, { useState, useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { ShieldCheck, KeyRound, CheckCircle2, AlertTriangle, Loader2, ClipboardPaste, X } from 'lucide-react';

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
  const inputRef = useRef<HTMLInputElement>(null);
  const prevIsOpenRef = useRef<boolean>(false);
  const prevReasonRef = useRef<string | null | undefined>(undefined);

  // Reset state and handle revocation reason ONLY when modal opens or reason changes
  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      setSuccessMsg(null);
      setIsLoading(false);
      setIsClosing(false);
      setSerialInput('');
      setErrorMsg(reason || null);
      prevReasonRef.current = reason;
      // Automatically focus the input for immediate typing or pasting
      setTimeout(() => {
        inputRef.current?.focus();
      }, 150);
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

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = serialInput.trim().toUpperCase();
    if (!clean) {
      setErrorMsg('يرجى إدخال كود السيريال الخاص بك.');
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

  return (
    <div className="fixed inset-0 z-[99999] bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-4 select-none transition-opacity duration-500 animate-in fade-in">
      {/* Ambient background glow effects */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/15 rounded-full blur-[120px] pointer-events-none -z-10 animate-pulse" />
      <div className="absolute top-1/3 left-1/3 w-64 h-64 bg-purple-500/10 rounded-full blur-[90px] pointer-events-none -z-10" />

      <div className={`relative w-full max-w-lg bg-slate-900/95 border border-slate-700/70 rounded-3xl shadow-2xl overflow-hidden text-right transition-all duration-400 transform ${
        isClosing 
          ? 'opacity-0 scale-95 translate-y-4' 
          : 'animate-in fade-in zoom-in-95 slide-in-from-bottom-4 duration-500'
      }`}>
        
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-950/80 via-slate-900 to-indigo-950/80 p-6 border-b border-slate-800/80 relative">
          <div className="flex items-center gap-4">
            <div className="w-13 h-13 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-inner shadow-indigo-500/10">
              <ShieldCheck className="w-7 h-7 animate-in zoom-in duration-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-wide font-['IBM_Plex_Sans_Arabic']">تفعيل برنامج خدمة القلب المتسع</h2>
              <p className="text-xs text-indigo-300/70 mt-0.5 font-medium">نظام التراخيص المعتمد المقفل بالعتاد (Hardware-Locked)</p>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5">

          {/* Serial Input Form */}
          <form onSubmit={handleActivate} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                أدخل كود السيريال الجديد (Serial Key):
              </label>
              <div className="relative flex items-center">
                <input
                  ref={inputRef}
                  type="text"
                  value={serialInput}
                  onChange={(e) => {
                    setSerialInput(e.target.value.toUpperCase());
                    if (errorMsg) setErrorMsg(null);
                  }}
                  placeholder="CCARE-XXXX-XXXX-XXXX"
                  disabled={isLoading || !!successMsg}
                  className="w-full bg-slate-950 border border-slate-700 focus:border-indigo-500 rounded-xl px-10 py-3 text-white placeholder-slate-600 font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-center transition text-sm sm:text-base"
                  dir="ltr"
                />
                <KeyRound className="w-4 h-4 text-slate-500 absolute left-3 top-3.5 pointer-events-none" />

                <div className="absolute right-2.5 flex items-center gap-1">
                  {serialInput && !isLoading && !successMsg && (
                    <button
                      type="button"
                      onClick={() => setSerialInput('')}
                      className="p-1 text-slate-400 hover:text-white rounded-md hover:bg-slate-800 transition cursor-pointer"
                      title="مسح الكود"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                  {!serialInput && !isLoading && !successMsg && (
                    <button
                      type="button"
                      onClick={handlePaste}
                      className="flex items-center gap-1 text-[11px] px-2 py-1 bg-slate-800 hover:bg-slate-700 text-indigo-300 rounded-lg border border-slate-700 transition cursor-pointer font-sans"
                      title="لصق من الحافظة"
                    >
                      <ClipboardPaste className="w-3.5 h-3.5" />
                      <span>لصق</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Error Message */}
            {errorMsg && (
              <div className="bg-rose-950/50 border border-rose-700/60 rounded-2xl p-3.5 flex items-start gap-3 text-rose-200 text-xs shadow-lg shadow-rose-950/30 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="p-1 rounded-lg bg-rose-900/60 border border-rose-700/50 shrink-0 mt-0.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-300" />
                </div>
                <div className="space-y-0.5">
                  <span className="font-bold text-rose-300 block">تنبيه الترخيص:</span>
                  <span className="leading-relaxed block opacity-90">{errorMsg}</span>
                </div>
              </div>
            )}

            {/* Success Message */}
            {successMsg && (
              <div className="bg-emerald-950/60 border border-emerald-600/50 rounded-2xl p-3.5 flex items-center gap-3 text-emerald-200 text-xs shadow-lg shadow-emerald-950/40 animate-in fade-in zoom-in-95 duration-400">
                <div className="p-1 rounded-lg bg-emerald-900/60 border border-emerald-600/50 shrink-0">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 animate-bounce" />
                </div>
                <span className="font-bold text-sm leading-relaxed">{successMsg}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || !!successMsg || !serialInput.trim()}
              className="w-full bg-gradient-to-r from-indigo-600 via-indigo-500 to-indigo-600 hover:from-indigo-500 hover:to-indigo-400 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-600 text-white font-bold py-3.5 px-4 rounded-2xl shadow-xl shadow-indigo-600/25 disabled:shadow-none transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-2.5 text-sm cursor-pointer disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span className="font-medium">جاري التحقق والتفعيل أونلاين...</span>
                </>
              ) : successMsg ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                  <span className="font-bold">تم التفعيل بنجاح!</span>
                </>
              ) : (
                <>
                  <KeyRound className="w-4 h-4 text-indigo-200" />
                  <span>تفعيل البرنامج الآن</span>
                </>
              )}
            </button>
          </form>

        </div>

        {/* Footer info */}
        <div className="bg-slate-950/60 p-4 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-500">
          <span>التفعيل يتطلب اتصالاً لمرة واحدة فقط بالإنترنت</span>
          <span>إصدار آمن 2026</span>
        </div>

      </div>
    </div>
  );
};
