import React, { useState } from "react";
import {
  Sparkles,
  Download,
  RotateCw,
  CheckCircle2,
  AlertTriangle,
  X,
  ArrowRight,
  ShieldCheck
} from "lucide-react";
import {
  UpdateCheckResult,
  UpdateDownloadProgress,
  downloadAndInstallAppUpdate,
  relaunchApp
} from "../services/updaterService";

interface UpdateNotificationModalProps {
  updateInfo: UpdateCheckResult;
  onClose: () => void;
}

export const UpdateNotificationModal: React.FC<UpdateNotificationModalProps> = ({
  updateInfo,
  onClose
}) => {
  const [downloadProgress, setDownloadProgress] = useState<UpdateDownloadProgress | null>(null);
  const [isInstalling, setIsInstalling] = useState(false);
  const [isReadyToRestart, setIsReadyToRestart] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const formatBytes = (bytes: number): string => {
    if (!bytes || bytes <= 0) return "0 MB";
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const handleStartUpdate = async () => {
    setErrorMessage(null);
    setIsInstalling(true);

    const res = await downloadAndInstallAppUpdate(
      updateInfo.updateHandle,
      (progress) => {
        setDownloadProgress(progress);
        if (progress.status === "done") {
          setIsReadyToRestart(true);
        } else if (progress.status === "error") {
          setErrorMessage(progress.error || "حدث خطأ أثناء تنزيل التحديث.");
        }
      }
    );

    if (res.success) {
      setIsReadyToRestart(true);
    } else if (res.error) {
      setErrorMessage(res.error);
    }
  };

  const handleRestart = async () => {
    await relaunchApp();
  };

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in font-['IBM_Plex_Sans_Arabic']"
    >
      <div className="relative w-full max-w-lg bg-gradient-to-b from-slate-900 via-slate-900/98 to-slate-950 border border-slate-700/80 rounded-2xl shadow-2xl shadow-slate-950/60 overflow-hidden text-right">
        
        {/* Top Decorative Header Accent */}
        <div className="h-1.5 w-full bg-gradient-to-r from-amber-500 via-emerald-400 to-sky-500" />

        {/* Close Button (disabled while downloading) */}
        {!isInstalling || isReadyToRestart || errorMessage ? (
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 left-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        ) : null}

        <div className="p-6 space-y-5">
          {/* Header */}
          <div className="flex items-start gap-3.5">
            <div className="p-3 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 shrink-0">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">تحديث جديد متوفر للتطبيق!</h3>
                <span className="text-xs font-mono font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  v{updateInfo.version || "جديد"}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                الإصدار الحالي: <span className="font-mono text-slate-300">v{updateInfo.currentVersion}</span> • تم النشر عبر خوادم التحديث الرسمية
              </p>
            </div>
          </div>

          {/* Release Notes Card */}
          <div className="bg-slate-950/60 border border-slate-800/90 rounded-xl p-3.5 space-y-2 max-h-48 overflow-y-auto scrollbar-thin">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>ما الجديد في هذا الإصدار:</span>
            </div>
            <div className="text-xs text-slate-300 whitespace-pre-line leading-relaxed pr-1 font-sans">
              {updateInfo.body}
            </div>
          </div>

          {/* Download & Progress Section */}
          {isInstalling && (
            <div className="space-y-2 bg-slate-950/40 p-3.5 rounded-xl border border-slate-800">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-slate-300 flex items-center gap-1.5">
                  {isReadyToRestart ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span className="text-emerald-300">اكتمل تنزيل التحديث بنجاح!</span>
                    </>
                  ) : (
                    <>
                      <RotateCw className="w-4 h-4 text-amber-400 animate-spin" />
                      <span>جارٍ تنزيل وتثبيت التحديث...</span>
                    </>
                  )}
                </span>
                <span className="font-mono text-amber-400">
                  {downloadProgress ? `${downloadProgress.percentage}%` : "0%"}
                </span>
              </div>

              {/* Progress Bar Track */}
              <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 transition-all duration-300 ease-out"
                  style={{ width: `${downloadProgress?.percentage || 0}%` }}
                />
              </div>

              {/* Size details */}
              {downloadProgress && downloadProgress.totalBytes > 0 && (
                <div className="flex justify-between text-[11px] font-mono text-slate-400">
                  <span>المحمل: {formatBytes(downloadProgress.downloadedBytes)}</span>
                  <span>الإجمالي: {formatBytes(downloadProgress.totalBytes)}</span>
                </div>
              )}
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="flex items-start gap-2 bg-rose-950/50 border border-rose-600/50 rounded-xl p-3 text-xs text-rose-200">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">تعذر إكمال التحديث: </span>
                <span>{errorMessage}</span>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-2">
            {!isInstalling ? (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-transparent transition-all cursor-pointer"
                >
                  تذكيري لاحقاً
                </button>
                <button
                  type="button"
                  onClick={handleStartUpdate}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/25 transition-all cursor-pointer active:scale-95"
                >
                  <Download className="w-4 h-4" />
                  <span>تحديث وتثبيت الآن</span>
                </button>
              </>
            ) : isReadyToRestart ? (
              <button
                type="button"
                onClick={handleRestart}
                className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-extrabold text-sm shadow-lg shadow-emerald-500/25 transition-all cursor-pointer active:scale-98 animate-pulse"
              >
                <RotateCw className="w-4 h-4" />
                <span>إعادة التشغيل الآن لتطبيق التحديث (v{updateInfo.version})</span>
              </button>
            ) : errorMessage ? (
              <button
                type="button"
                onClick={handleStartUpdate}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition-all cursor-pointer"
              >
                <RotateCw className="w-4 h-4" />
                <span>إعادة المحاولة</span>
              </button>
            ) : (
              <span className="text-xs text-slate-400 animate-pulse">
                يرجى الانتظار حتى اكتمال التنزيل...
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
