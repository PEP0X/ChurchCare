import React from "react";
import { Upload, Edit3, Image as ImageIcon } from "lucide-react";

interface DropZoneProps {
  label: string;
  sublabel?: string;
  image?: string;
  onOpenEditor: () => void;
  onDropImage: (file: File) => void;
  className?: string;
}

export const DropZone: React.FC<DropZoneProps> = ({
  label,
  sublabel = "85.6 × 53.98 مم",
  image,
  onOpenEditor,
  onDropImage,
  className = ""
}) => {
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      onDropImage(file);
    }
  };

  return (
    <div
      dir="rtl"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={`relative group border-2 border-dashed rounded-xl overflow-hidden transition-all duration-200 ${
        image
          ? "border-amber-500/40 bg-slate-900/60 shadow-lg shadow-amber-500/5"
          : "border-slate-700 hover:border-amber-500/60 bg-slate-900/30 hover:bg-slate-900/60"
      } ${className}`}
      style={{ aspectRatio: "85.6 / 53.98" }}
    >
      {image ? (
        <div className="w-full h-full relative flex items-center justify-center p-1">
          <img
            src={image}
            alt={label}
            className="w-full h-full object-contain rounded-lg shadow"
          />
          {/* Hover Action Overlay */}
          <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-xs opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-3 text-center">
            <span className="text-white text-xs font-semibold">{label}</span>
            <button
              type="button"
              onClick={onOpenEditor}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md transition-transform transform hover:scale-105"
            >
              <Edit3 className="w-3.5 h-3.5" />
              تعديل واقتصاص
            </button>
          </div>
        </div>
      ) : (
        <div
          onClick={onOpenEditor}
          className="w-full h-full flex flex-col items-center justify-center gap-2 p-4 cursor-pointer text-center"
        >
          <div className="p-2.5 rounded-full bg-slate-800 text-amber-400 group-hover:scale-110 transition-transform">
            <Upload className="w-5 h-5" />
          </div>
          <div className="font-semibold text-xs text-slate-200 group-hover:text-amber-300 transition-colors">
            {label}
          </div>
          <div className="text-[10px] text-slate-400 font-mono">
            {sublabel}
          </div>
        </div>
      )}
    </div>
  );
};
