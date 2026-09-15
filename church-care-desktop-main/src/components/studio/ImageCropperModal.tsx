import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  RotateCw,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Sun,
  Contrast,
  Check,
  X,
  Upload,
  Sparkles,
  Unlock,
  CreditCard,
  FileText,
  RefreshCw,
  ArrowLeftRight
} from "lucide-react";

export type CropMode = "id_card" | "certificate" | "free";
export type CropOrientation = "landscape" | "portrait";

// Standard ISO/IEC 7810 ID-1 Aspect Ratio (85.60mm / 53.98mm)
export const ID_CARD_ASPECT_RATIO = 85.6 / 53.98; // ~1.58577
// Standard ISO 216 A4 Document Aspect Ratio (210mm / 297mm)
export const CERTIFICATE_ASPECT_RATIO = 210 / 297; // ~0.70707

interface ImageCropperModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (croppedBase64: string) => void;
  initialImage?: string;
  title?: string;
  defaultMode?: CropMode;
}

export const ImageCropperModal: React.FC<ImageCropperModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialImage,
  title = "استوديو معالجة واقتصاص المستندات والبطاقات",
  defaultMode = "id_card"
}) => {
  const [imageSrc, setImageSrc] = useState<string | null>(initialImage || null);
  const [cropMode, setCropMode] = useState<CropMode>(defaultMode);
  const [orientation, setOrientation] = useState<CropOrientation>(
    defaultMode === "certificate" ? "portrait" : "landscape"
  );

  const [rotation, setRotation] = useState<number>(0);
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Visual Enhancements
  const [brightness, setBrightness] = useState<number>(100); // 50 to 150
  const [contrast, setContrast] = useState<number>(100); // 50 to 200
  const [grayscale, setGrayscale] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const imageObjRef = useRef<HTMLImageElement | null>(null);
  const isPickingRef = useRef<boolean>(false);

  // Synchronize state whenever modal opens, closes, or props change
  useEffect(() => {
    if (isOpen) {
      const mode = defaultMode || "id_card";
      setCropMode(mode);
      setOrientation(mode === "certificate" ? "portrait" : "landscape");
      setImageSrc(initialImage || null);
      setRotation(0);
      setZoom(1);
      setPan({ x: 0, y: 0 });
      setBrightness(100);
      setContrast(100);
      setGrayscale(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } else {
      // Completely reset on close so no ghost image lingers
      setImageSrc(null);
      imageObjRef.current = null;
      setRotation(0);
      setZoom(1);
      setPan({ x: 0, y: 0 });
    }
  }, [isOpen, initialImage, defaultMode]);

  useEffect(() => {
    if (!imageSrc) {
      imageObjRef.current = null;
      return;
    }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = imageSrc;
    img.onload = () => {
      imageObjRef.current = img;
      renderCanvas();
    };
  }, [imageSrc]);

  // Unified File Picker: Native Windows Dialog (single instance) with Web fallback
  const handlePickFile = async () => {
    if (isPickingRef.current) return;
    isPickingRef.current = true;

    try {
      const isTauri =
        typeof window !== "undefined" &&
        ("__TAURI_INTERNALS__" in window || "__TAURI__" in window);

      if (isTauri) {
        try {
          const { open } = await import("@tauri-apps/plugin-dialog");
          const { invoke } = await import("@tauri-apps/api/core");

          const selected = await open({
            multiple: false,
            filters: [
              {
                name: "Images",
                extensions: ["png", "jpg", "jpeg", "webp", "bmp"]
              }
            ]
          });

          // If user cancelled, exit immediately without opening second dialog
          if (!selected) {
            return;
          }

          const filePath = typeof selected === "string" ? selected : (selected as any).path;
          if (!filePath) return;

          // Read image natively through Rust backend (bypasses all scope restrictions)
          const dataUrl = await invoke<string>("read_image_data_url", { path: filePath });
          if (dataUrl) {
            setImageSrc(dataUrl);
            setRotation(0);
            setZoom(1);
            setPan({ x: 0, y: 0 });
            setBrightness(100);
            setContrast(100);
            setGrayscale(false);
          }
          return;
        } catch (tauriErr) {
          console.error("Tauri native file picker error:", tauriErr);
          return;
        }
      }

      // Web Browser Fallback (only in pure browser development mode)
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
        fileInputRef.current.click();
      }
    } finally {
      isPickingRef.current = false;
    }
  };

  // Handle Drag & Drop / File Select
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setImageSrc(event.target?.result as string);
        setRotation(0);
        setZoom(1);
        setPan({ x: 0, y: 0 });
        setBrightness(100);
        setContrast(100);
        setGrayscale(false);
      };
      reader.readAsDataURL(file);
    }
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setImageSrc(event.target?.result as string);
        setRotation(0);
        setZoom(1);
        setPan({ x: 0, y: 0 });
        setBrightness(100);
        setContrast(100);
        setGrayscale(false);
      };
      reader.readAsDataURL(file);
    }
  };

  // Calculate target export canvas dimensions based on mode & orientation
  const getTargetDimensions = useCallback(() => {
    if (cropMode === "id_card") {
      // Standard ID Card (ISO 7810 ID-1: 85.60 x 53.98 mm)
      if (orientation === "landscape") {
        return { width: 856, height: 540 };
      } else {
        return { width: 540, height: 856 };
      }
    } else if (cropMode === "certificate") {
      // Standard A4 Document / Certificate (210 x 297 mm)
      if (orientation === "portrait") {
        return { width: 700, height: 990 };
      } else {
        return { width: 990, height: 700 };
      }
    } else {
      // Freeform / Image Natural Aspect
      const img = imageObjRef.current;
      if (img && img.width > 0 && img.height > 0) {
        const isSideways = rotation % 180 !== 0;
        const naturalW = isSideways ? img.height : img.width;
        const naturalH = isSideways ? img.width : img.height;
        const maxDim = 880;
        if (naturalW >= naturalH) {
          return { width: maxDim, height: Math.max(300, Math.round((maxDim * naturalH) / naturalW)) };
        } else {
          return { width: Math.max(300, Math.round((maxDim * naturalW) / naturalH)), height: maxDim };
        }
      }
      return { width: 800, height: 600 };
    }
  }, [cropMode, orientation, rotation]);

  // Render Canvas with Filters & Transformations
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imageObjRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { width: targetWidth, height: targetHeight } = getTargetDimensions();

    canvas.width = targetWidth;
    canvas.height = targetHeight;

    ctx.clearRect(0, 0, targetWidth, targetHeight);

    // Apply Filter Matrix
    ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) ${grayscale ? "grayscale(100%)" : ""}`;

    ctx.save();
    // Center transformation
    ctx.translate(targetWidth / 2 + pan.x, targetHeight / 2 + pan.y);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(zoom, zoom);

    // Draw image centered
    const isSideways = rotation % 180 !== 0;
    const drawWidth = isSideways ? img.height : img.width;
    const drawHeight = isSideways ? img.width : img.height;

    // Fit image to canvas aspect
    const scaleFactor = Math.max(targetWidth / drawWidth, targetHeight / drawHeight);
    const w = img.width * scaleFactor;
    const h = img.height * scaleFactor;

    ctx.drawImage(img, -w / 2, -h / 2, w, h);
    ctx.restore();
  }, [brightness, contrast, grayscale, rotation, zoom, pan, getTargetDimensions]);

  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  // Pan controls
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Mouse wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.08 : -0.08;
    setZoom((prev) => Math.max(0.2, Math.min(4, +(prev + delta).toFixed(2))));
  };

  // Rotation controls
  const rotateClockwise = () => setRotation((prev) => (prev + 90) % 360);
  const rotateCounterClockwise = () => setRotation((prev) => (prev - 90 + 360) % 360);
  const rotate180 = () => setRotation((prev) => (prev + 180) % 360);

  // Orientation toggle (أفقي / رأسي)
  const toggleOrientation = () => {
    setOrientation((prev) => (prev === "landscape" ? "portrait" : "landscape"));
  };

  // Reset adjustments
  const handleReset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setRotation(0);
    setBrightness(100);
    setContrast(100);
    setGrayscale(false);
  };

  // Save / Export
  const handleApply = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // 0.92 provides crisp documents with lightweight Base64 string (~150-250KB)
    const base64 = canvas.toDataURL("image/jpeg", 0.92);
    onSave(base64);
    onClose();
  };

  if (!isOpen) return null;

  const getActiveIcon = () => {
    if (cropMode === "id_card") return <CreditCard className="w-5 h-5 text-amber-400" />;
    if (cropMode === "certificate") return <FileText className="w-5 h-5 text-sky-400" />;
    return <Unlock className="w-5 h-5 text-emerald-400" />;
  };

  const getActiveSubtitle = () => {
    if (cropMode === "id_card") {
      return orientation === "landscape"
        ? "أبعاد بطاقة الرقم القومي المصرية القياسية (بالعرض 85.6 × 54 مم)"
        : "أبعاد بطاقة الرقم القومي (رأسي 54 × 85.6 مم)";
    }
    if (cropMode === "certificate") {
      return orientation === "portrait"
        ? "أبعاد شهادة الميلاد والوثائق الرسمية A4 القياسية (بالطول 210 × 297 مم)"
        : "أبعاد شهادة الميلاد والوثائق A4 (بالعرض 297 × 210 مم)";
    }
    return "اقتصاص حر مرن حسب أبعاد الصورة الطبيعية";
  };

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200"
    >
      <div className="bg-slate-900 border border-slate-700 w-full max-w-5xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-slate-800 border border-slate-700">
              {getActiveIcon()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white font-['IBM_Plex_Sans_Arabic']">
                  {title}
                </h3>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  {cropMode === "id_card" ? "بطاقة رقم قومي" : cropMode === "certificate" ? "شهادة ميلاد" : "اقتصاص حر"}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {getActiveSubtitle()}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="إغلاق النافذة"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Mode Presets Bar */}
        <div className="px-6 py-2.5 bg-slate-950/70 border-b border-slate-800/80 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-400 ml-1">نمط الاقتصاص:</span>

            {/* Mode: ID Card */}
            <button
              type="button"
              onClick={() => {
                setCropMode("id_card");
                setOrientation("landscape");
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                cropMode === "id_card"
                  ? "bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm"
                  : "bg-slate-800/80 text-slate-300 border-slate-700 hover:text-white hover:bg-slate-700"
              }`}
            >
              <CreditCard className="w-3.5 h-3.5 text-amber-400" />
              <span>بطاقة شخصية (بالعرض 85.6 × 54)</span>
            </button>

            {/* Mode: Certificate */}
            <button
              type="button"
              onClick={() => {
                setCropMode("certificate");
                setOrientation("portrait");
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                cropMode === "certificate"
                  ? "bg-sky-500/20 text-sky-300 border-sky-500/50 shadow-sm"
                  : "bg-slate-800/80 text-slate-300 border-slate-700 hover:text-white hover:bg-slate-700"
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-sky-400" />
              <span>شهادة ميلاد (بالطول A4)</span>
            </button>

            {/* Mode: Freeform */}
            <button
              type="button"
              onClick={() => setCropMode("free")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                cropMode === "free"
                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-sm"
                  : "bg-slate-800/80 text-slate-300 border-slate-700 hover:text-white hover:bg-slate-700"
              }`}
            >
              <Unlock className="w-3.5 h-3.5 text-emerald-400" />
              <span>قص حر</span>
            </button>
          </div>

          {/* Orientation Swap */}
          {cropMode !== "free" && (
            <button
              type="button"
              onClick={toggleOrientation}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-all cursor-pointer"
              title="تبديل الاتجاه بين أفقي ورأسي"
            >
              <ArrowLeftRight className="w-3.5 h-3.5 text-slate-400" />
              <span>الاتجاه: {orientation === "landscape" ? "أفقي (عرض)" : "رأسي (طول)"}</span>
            </button>
          )}
        </div>

        {/* Studio Workspace */}
        <div className="flex-1 overflow-y-auto p-5 grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Main Canvas Viewport (2 Cols) */}
          <div
            className="lg:col-span-2 flex flex-col items-center justify-center bg-slate-950 border border-slate-800 rounded-2xl p-3 min-h-[380px] max-h-[550px] relative overflow-hidden select-none"
            onWheel={handleWheel}
          >
            {!imageSrc ? (
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={handlePickFile}
                className="w-full h-full min-h-[320px] border-2 border-dashed border-slate-700 hover:border-amber-500/60 bg-slate-900/40 hover:bg-slate-900/70 rounded-2xl flex flex-col items-center justify-center gap-3 cursor-pointer transition-all p-8 text-center group"
              >
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 group-hover:scale-110 group-hover:bg-amber-500/20 transition-all shadow-lg shadow-amber-500/10">
                  <Upload className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <div className="text-slate-100 font-bold text-sm font-['IBM_Plex_Sans_Arabic']">
                    اسحب صورة {cropMode === "id_card" ? "البطاقة" : "الشهادة أو المستند"} هنا أو انقر لاختيار ملف
                  </div>
                  <div className="text-slate-400 text-xs">
                    يدعم جميع صيغ الصور عالية الدقة (JPG, PNG, WebP)
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePickFile();
                  }}
                  className="mt-1 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-amber-500/25 active:scale-95 transition-all cursor-pointer font-['IBM_Plex_Sans_Arabic']"
                >
                  <Upload className="w-4 h-4" />
                  استعراض واختيار صورة (Browse)
                </button>
              </div>
            ) : (
              <div
                className="relative cursor-grab active:cursor-grabbing flex items-center justify-center w-full h-full"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              >
                <canvas
                  ref={canvasRef}
                  className="max-w-full max-h-[460px] object-contain rounded-lg shadow-2xl border-2 border-amber-500/50"
                />

                {/* Floating Metrics Badge */}
                <div className="absolute bottom-2 left-2 bg-black/75 backdrop-blur-md px-3 py-1 rounded-lg text-[11px] text-amber-300 font-mono flex items-center gap-2 border border-slate-700">
                  <span>{Math.round(zoom * 100)}%</span>
                  <span className="text-slate-500">•</span>
                  <span>{rotation}°</span>
                  <span className="text-slate-500">•</span>
                  <span className="text-slate-300 font-sans">
                    {cropMode === "id_card" ? "85.6 × 54" : cropMode === "certificate" ? "A4 210 × 297" : "حر"}
                  </span>
                </div>

                {/* Mouse wheel helper tip */}
                <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded text-[10px] text-slate-400 pointer-events-none">
                  عجلة الماوس للتكبير • السحب للتحريك
                </div>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {/* Controls & Adjustment Panel (1 Col) */}
          <div className="flex flex-col gap-3.5 bg-slate-900/70 border border-slate-800 p-4 rounded-2xl">
            <div className="text-xs font-bold text-slate-200 flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                أدوات التحرير والمعالجة
              </span>
              <button
                type="button"
                onClick={handleReset}
                className="text-[11px] text-slate-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer transition-colors"
                title="إعادة ضبط كافة الإعدادات والتكبير"
              >
                <RefreshCw className="w-3 h-3" />
                إعادة ضبط
              </button>
            </div>

            {/* Rotation Controls */}
            <div className="space-y-1.5">
              <label className="text-xs text-slate-300 font-medium flex items-center gap-1">
                <RotateCw className="w-3.5 h-3.5 text-slate-400" />
                التدوير والقلب
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={rotateCounterClockwise}
                  className="flex items-center justify-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition-all cursor-pointer"
                  title="تدوير 90 درجة لليسار"
                >
                  <RotateCcw className="w-3 h-3" />
                  90° يسار
                </button>
                <button
                  type="button"
                  onClick={rotateClockwise}
                  className="flex items-center justify-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition-all cursor-pointer"
                  title="تدوير 90 درجة لليمين"
                >
                  <RotateCw className="w-3 h-3" />
                  90° يمين
                </button>
                <button
                  type="button"
                  onClick={rotate180}
                  className="flex items-center justify-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition-all cursor-pointer"
                  title="قلب 180 درجة"
                >
                  <ArrowLeftRight className="w-3 h-3" />
                  قلب 180°
                </button>
              </div>
            </div>

            {/* Zoom Slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-slate-300">
                <span className="flex items-center gap-1">
                  <ZoomIn className="w-3.5 h-3.5 text-slate-400" />
                  التكبير والتحجيم
                </span>
                <span className="font-mono text-amber-400 font-bold">{zoom.toFixed(2)}x</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setZoom((prev) => Math.max(0.2, +(prev - 0.1).toFixed(2)))}
                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                  title="تصغير"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <input
                  type="range"
                  min="0.2"
                  max="4"
                  step="0.05"
                  value={zoom}
                  onChange={(e) => setZoom(parseFloat(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer h-1.5 bg-slate-700 rounded-lg"
                />
                <button
                  type="button"
                  onClick={() => setZoom((prev) => Math.min(4, +(prev + 0.1).toFixed(2)))}
                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                  title="تكبير"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Brightness Adjustment */}
            <div className="space-y-1.5 pt-0.5">
              <div className="flex justify-between text-xs text-slate-300">
                <span className="flex items-center gap-1">
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  السطوع (الإضاءة)
                </span>
                <span className="font-mono text-slate-400">{brightness}%</span>
              </div>
              <input
                type="range"
                min="50"
                max="150"
                value={brightness}
                onChange={(e) => setBrightness(parseInt(e.target.value, 10))}
                className="w-full accent-amber-500 cursor-pointer h-1.5 bg-slate-700 rounded-lg"
              />
            </div>

            {/* Contrast Adjustment */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-slate-300">
                <span className="flex items-center gap-1">
                  <Contrast className="w-3.5 h-3.5 text-blue-400" />
                  التباين والوضوح
                </span>
                <span className="font-mono text-slate-400">{contrast}%</span>
              </div>
              <input
                type="range"
                min="50"
                max="200"
                value={contrast}
                onChange={(e) => setContrast(parseInt(e.target.value, 10))}
                className="w-full accent-amber-500 cursor-pointer h-1.5 bg-slate-700 rounded-lg"
              />
            </div>

            {/* Grayscale Boost */}
            <div className="pt-0.5">
              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer bg-slate-800/70 hover:bg-slate-800 p-2.5 rounded-xl border border-slate-700 select-none transition-colors">
                <input
                  type="checkbox"
                  checked={grayscale}
                  onChange={(e) => setGrayscale(e.target.checked)}
                  className="rounded text-amber-500 focus:ring-amber-500 accent-amber-500 w-4 h-4 cursor-pointer"
                />
                <span className="font-medium">تصفية أبيض وأسود (مُعزّز للطباعة والتوثيق)</span>
              </label>
            </div>

            {/* Replace Image Button */}
            {imageSrc && (
              <div className="pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={handlePickFile}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 hover:border-amber-500/40 transition-all cursor-pointer shadow-sm active:scale-95 font-['IBM_Plex_Sans_Arabic']"
                >
                  <Upload className="w-3.5 h-3.5 text-amber-400" />
                  استبدال / اختيار صورة أخرى (Browse)
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-3.5 border-t border-slate-800 flex items-center justify-between bg-slate-900/90">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            إلغاء
          </button>
          <button
            type="button"
            disabled={!imageSrc}
            onClick={handleApply}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold text-slate-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-amber-500/20 active:scale-95 transition-all cursor-pointer font-['IBM_Plex_Sans_Arabic']"
          >
            <Check className="w-4 h-4" />
            تطبيق وحفظ في البحث
          </button>
        </div>
      </div>
    </div>
  );
};
