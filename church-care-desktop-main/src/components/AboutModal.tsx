import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { 
  ShieldCheck, 
  KeyRound, 
  Cpu, 
  Building2, 
  Copy, 
  Check, 
  X, 
  HeartHandshake,
  Award,
  Sparkles,
  Lock,
  RotateCw
} from 'lucide-react';
import { isChurchNameLocked } from '../utils/churchLicense';
import { checkForAppUpdates, UpdateCheckResult } from '../services/updaterService';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientName?: string;
  onOpenActivation?: () => void;
  onOpenUpdateModal?: (info: UpdateCheckResult) => void;
}

interface LicenseStatusResult {
  is_licensed: boolean;
  client_name: string | null;
  serial_key: string | null;
  hwid: string;
  message: string;
}

export const AboutModal: React.FC<AboutModalProps> = ({
  isOpen,
  onClose,
  clientName: initialClientName = '',
  onOpenUpdateModal
}) => {
  const [clientName, setClientName] = useState<string>(initialClientName);
  const [serialKey, setSerialKey] = useState<string>('');
  const [hwid, setHwid] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<string>('الترخيص سارٍ ومفعّل مدى الحياة');
  const [isLicensed, setIsLicensed] = useState<boolean>(true);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState<boolean>(false);
  const [updateCheckStatus, setUpdateCheckStatus] = useState<string | null>(null);

  // Load active license details upon modal open
  useEffect(() => {
    if (!isOpen) return;

    invoke<LicenseStatusResult>('check_license_status')
      .then((status) => {
        setIsLicensed(status.is_licensed);
        if (status.client_name) setClientName(status.client_name);
        if (status.serial_key) setSerialKey(status.serial_key);
        if (status.hwid) setHwid(status.hwid);
        if (status.message) setStatusMessage(status.message);
      })
      .catch((err) => {
        console.error('Failed to query local license:', err);
      });

    invoke<string>('get_device_hwid')
      .then((id) => {
        if (id) setHwid(id);
      })
      .catch(() => {});
  }, [isOpen]);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const maskedSerial = serialKey
    ? serialKey.length > 10
      ? `${serialKey.slice(0, 6)}••••-••••-${serialKey.slice(-4)}`
      : '••••••••••••••••'
    : 'CCARE-••••-••••-••••';

  const handleManualCheckUpdate = async () => {
    setIsCheckingUpdate(true);
    setUpdateCheckStatus(null);
    try {
      const res = await checkForAppUpdates();
      if (res.available) {
        if (onOpenUpdateModal) {
          onClose();
          onOpenUpdateModal(res);
        } else {
          setUpdateCheckStatus(`يوجد تحديث جديد (v${res.version})!`);
        }
      } else if (res.error) {
        setUpdateCheckStatus(res.error);
      } else {
        setUpdateCheckStatus('أنت تعمل بأحدث إصدار رسمي متوفر ✓');
      }
    } catch (e: any) {
      setUpdateCheckStatus('تعذر التحقق من التحديثات حالياً');
    } finally {
      setIsCheckingUpdate(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 select-none animate-in fade-in duration-300">
      {/* Soft Ambient Light */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-500/10 rounded-full blur-[120px] pointer-events-none -z-10" />
      <div className="absolute top-1/3 right-1/3 w-64 h-64 bg-emerald-500/10 rounded-full blur-[90px] pointer-events-none -z-10" />

      {/* Main Modal Box */}
      <div 
        className="relative w-full max-w-xl bg-slate-900/95 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden text-right animate-in fade-in zoom-in-95 duration-300 flex flex-col max-h-[92vh]"
        dir="rtl"
      >
        {/* Header Strip */}
        <div className="bg-gradient-to-r from-amber-500/15 via-slate-900 to-amber-500/10 p-5 sm:p-6 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center text-slate-950 font-bold shadow-lg shadow-amber-500/20 ring-1 ring-amber-300/40 shrink-0">
              <HeartHandshake className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-wide font-['IBM_Plex_Sans_Arabic']">
                  حول البرنامج وبيانات الترخيص
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  2026
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono">
                  v1.2.1
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                خدمة أخوة الرب - خدمة القلب المتسع (ChurchCare Desktop)
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800/80 transition-colors cursor-pointer"
            title="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1 text-xs">
          
          {/* Official License Status Banner */}
          <div className="p-4 rounded-2xl bg-gradient-to-l from-emerald-950/60 via-slate-950/80 to-slate-950 border border-emerald-500/40 shadow-inner flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0 shadow-sm">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-emerald-300 text-sm">
                    {isLicensed ? 'الترخيص سارٍ ومفعّل رسمياً' : 'الترخيص غير مفعل'}
                  </span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                </div>
                <div className="text-[11px] text-slate-400 truncate mt-0.5">
                  {statusMessage}
                </div>
              </div>
            </div>

            <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-700/50 px-2.5 py-1 rounded-lg shrink-0">
              <Award className="w-3 h-3 text-emerald-400" />
              <span>مدى الحياة</span>
            </span>
          </div>

          {/* License Credentials Grid */}
          <div className="grid grid-cols-1 gap-2.5">
            
            {/* 1. Licensed Client Name */}
            <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 shrink-0">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[11px] font-medium text-slate-400 block">
                      الجهة المرخص لها (Licensed To):
                    </span>
                    <span className="text-sm font-bold text-white block truncate">
                      {clientName || 'كنيسة / خادم معتمد'}
                    </span>
                  </div>
                </div>

                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border shrink-0 ${
                  isChurchNameLocked(clientName)
                    ? 'text-amber-300 bg-amber-950/50 border-amber-800/50'
                    : 'text-indigo-300 bg-indigo-950/50 border-indigo-800/40'
                }`}>
                  {isChurchNameLocked(clientName) ? 'كنيسة معتمدة' : 'ترخيص عام'}
                </span>
              </div>

              {isChurchNameLocked(clientName) ? (
                <div className="text-[11px] text-amber-300/90 bg-amber-500/10 border border-amber-500/25 px-2.5 py-1.5 rounded-xl font-medium flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>ترخيص مخصص لكنيسة: تم اعتماد اسم الكنيسة في جميع استمارات ووثائق البرنامج تلقائياً.</span>
                </div>
              ) : (
                <div className="text-[11px] text-sky-300/90 bg-sky-500/10 border border-sky-500/25 px-2.5 py-1.5 rounded-xl font-medium flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  <span>ترخيص عام / مطرانية: يتيح حرية اختيار وتحديد أي كنيسة بالإيبارشية داخل استمارات ووثائق البرنامج.</span>
                </div>
              )}
            </div>

            {/* 2. Serial Key */}
            <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 shrink-0">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-[11px] font-medium text-slate-400 block">
                    كود السيريال (Serial Key):
                  </span>
                  <span className="text-xs font-mono font-bold text-amber-300 tracking-wider block" dir="ltr">
                    {maskedSerial}
                  </span>
                </div>
              </div>
            </div>

            {/* 3. Hardware ID (HWID) */}
            <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 shrink-0">
                  <Cpu className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-[11px] font-medium text-slate-400 block">
                    معرف عتاد الجهاز (Machine HWID):
                  </span>
                  <span className="text-xs font-mono font-bold text-purple-300 tracking-wider block" dir="ltr">
                    {hwid || 'جاري استخراج المعرف...'}
                  </span>
                </div>
              </div>

              {hwid && (
                <button
                  type="button"
                  onClick={() => copyToClipboard(hwid, 'hwid')}
                  className="flex items-center gap-1 text-[11px] px-2 py-1 bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg border border-slate-700 transition cursor-pointer shrink-0"
                  title="نسخ معرف عتاد الجهاز للدعم الفني"
                >
                  {copiedField === 'hwid' ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span className="text-emerald-300 text-[10px]">تم</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span className="text-[10px]">نسخ</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {/* 4. Software Version & Update Checker */}
            <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 shrink-0">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[11px] font-medium text-slate-400 block">
                    إصدار البرنامج (Version):
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-200 block" dir="ltr">
                    v1.1.0 (Auto-Update Enabled)
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {updateCheckStatus && (
                  <span className="text-[10px] text-amber-300 font-medium px-2 py-0.5 rounded bg-slate-900 border border-slate-700">
                    {updateCheckStatus}
                  </span>
                )}
                <button
                  type="button"
                  disabled={isCheckingUpdate}
                  onClick={handleManualCheckUpdate}
                  className="flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-sky-300 hover:text-sky-200 border border-sky-500/40 hover:border-sky-400 transition-all cursor-pointer disabled:opacity-50"
                  title="التحقق من وجود تحديث جديد عبر خوادم GitHub Releases"
                >
                  <RotateCw className={`w-3.5 h-3.5 ${isCheckingUpdate ? 'animate-spin' : ''}`} />
                  <span>{isCheckingUpdate ? 'جارٍ الفحص...' : 'فحص التحديثات'}</span>
                </button>
              </div>
            </div>

          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-950/80 border-t border-slate-800/80 flex items-center justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 rounded-xl text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 transition cursor-pointer shadow-sm"
          >
            إغلاق
          </button>
        </div>

      </div>
    </div>
  );
};
