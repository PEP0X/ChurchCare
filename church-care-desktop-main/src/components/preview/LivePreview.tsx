import React, { useState } from "react";
import { CaseStudyData } from "../../types/schema";
import { ZoomIn, ZoomOut, Maximize2, FileText, ChevronRight, ChevronLeft } from "lucide-react";
import { getTemplatePageImage } from "../../utils/templateImages";

// Designated ID Card Bounding Boxes in percent of A4 (595.28 x 841.89 points)
// Husband: Rect(320, 135, 545, 275) -> left: 320/595.28 = 53.75%, top: 135/841.89 = 16.03%, width: 225/595.28 = 37.8%, height: 140/841.89 = 16.63%
// Wife: Rect(50, 135, 275, 275) -> left: 50/595.28 = 8.40%, top: 135/841.89 = 16.03%, width: 225/595.28 = 37.8%, height: 140/841.89 = 16.63%

interface LivePreviewProps {
  activePage: number;
  onPageChange: (page: number) => void;
  data: CaseStudyData;
  onOpenHusbandCropper?: () => void;
  onOpenWifeCropper?: () => void;
}

export const LivePreview: React.FC<LivePreviewProps> = ({
  activePage,
  onPageChange,
  data,
  onOpenHusbandCropper,
  onOpenWifeCropper
}) => {
  const [scale, setScale] = useState<number>(1.0);

  // Template images 1-6
  const getTemplateSrc = (page: number) => getTemplatePageImage(page);

  return (
    <div
      dir="rtl"
      className="flex flex-col h-full bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl"
    >
      {/* Viewport Top Bar */}
      <div className="px-4 py-3 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-amber-400" />
          <span className="text-sm font-bold text-white font-['IBM_Plex_Sans_Arabic']">
            المعاينة الحية الفورية (WYSIWYG)
          </span>
          <span className="text-xs text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
            صفحة {activePage} من 6
          </span>
        </div>

        {/* Page Navigators & Zoom Toolbar */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700">
            <button
              type="button"
              disabled={activePage <= 1}
              onClick={() => onPageChange(activePage - 1)}
              className="p-1 text-slate-300 hover:text-white disabled:opacity-30"
              title="الصفحة السابقة"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <span className="px-2 text-xs font-mono text-slate-200">
              {activePage} / 6
            </span>
            <button
              type="button"
              disabled={activePage >= 6}
              onClick={() => onPageChange(activePage + 1)}
              className="p-1 text-slate-300 hover:text-white disabled:opacity-30"
              title="الصفحة التالية"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>

          <div className="h-4 w-px bg-slate-700" />

          {/* Zoom controls */}
          <div className="flex items-center gap-1 bg-slate-800 rounded-lg p-0.5 border border-slate-700">
            <button
              type="button"
              onClick={() => setScale((s) => Math.max(0.6, s - 0.15))}
              className="p-1 text-slate-300 hover:text-white"
              title="تصغير"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="px-2 text-xs font-mono text-slate-200">
              {Math.round(scale * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setScale((s) => Math.min(1.8, s + 0.15))}
              className="p-1 text-slate-300 hover:text-white"
              title="تكبير"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setScale(1.0)}
              className="p-1 text-slate-400 hover:text-white"
              title="الحجم الافتراضي"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Document Viewport Area */}
      <div className="flex-1 overflow-auto p-6 flex justify-center items-start bg-slate-950/70">
        <div
          className="relative bg-white shadow-2xl transition-transform duration-150 origin-top rounded-sm"
          style={{
            width: "595px",
            minHeight: "842px",
            transform: `scale(${scale})`,
            marginBottom: `${(scale - 1) * 842}px`
          }}
        >
          {/* Base Template Image */}
          <img
            src={getTemplateSrc(activePage)}
            alt={`Page ${activePage}`}
            className="w-full h-auto block select-none pointer-events-none"
          />

          {/* Interactive Stamped Overlays for Page 1 */}
          {activePage === 1 && (
            <div className="absolute inset-0 font-['IBM_Plex_Sans_Arabic'] text-slate-900 pointer-events-auto">
              {/* Husband ID Box: Rect(320, 135, 545, 275) */}
              <div
                onClick={onOpenHusbandCropper}
                className="absolute cursor-pointer border-2 border-transparent hover:border-amber-500 rounded bg-white/90 overflow-hidden flex items-center justify-center transition-all group"
                style={{
                  left: "53.75%",
                  top: "16.03%",
                  width: "37.8%",
                  height: "16.63%"
                }}
              >
                {data.husband_id_image ? (
                  <img
                    src={data.husband_id_image}
                    alt="Husband ID"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="text-[11px] text-slate-400 font-medium group-hover:text-amber-600 text-center p-2">
                    انقر هنا لإدراج صورة بطاقة الزوج
                  </div>
                )}
              </div>

              {/* Wife ID Box: Rect(50, 135, 275, 275) */}
              <div
                onClick={onOpenWifeCropper}
                className="absolute cursor-pointer border-2 border-transparent hover:border-amber-500 rounded bg-white/90 overflow-hidden flex items-center justify-center transition-all group"
                style={{
                  left: "8.40%",
                  top: "16.03%",
                  width: "37.8%",
                  height: "16.63%"
                }}
              >
                {data.wife_id_image ? (
                  <img
                    src={data.wife_id_image}
                    alt="Wife ID"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="text-[11px] text-slate-400 font-medium group-hover:text-amber-600 text-center p-2">
                    انقر هنا لإدراج صورة بطاقة الزوجة
                  </div>
                )}
              </div>

              {/* Text Field Overlays Page 1 */}
              <div
                className="absolute text-xs font-semibold text-slate-800"
                style={{ left: "68%", top: "20.4%" }}
              >
                {data.page1.study_date}
              </div>
              <div
                className="absolute text-xs font-bold text-slate-900"
                style={{ left: "26%", top: "10.4%" }}
              >
                {data.page1.church_study_id}
              </div>
              <div
                className="absolute text-xs font-medium text-slate-800"
                style={{ right: "18%", top: "69.4%" }}
              >
                {data.page1.area}
              </div>
              <div
                className="absolute text-xs font-medium text-slate-800"
                style={{ right: "23%", top: "75.7%" }}
              >
                {data.page1.responsible_priest}
              </div>
              <div
                className="absolute text-xs font-mono font-bold text-slate-800"
                style={{ right: "40%", top: "81.4%" }}
              >
                {data.page1.cathedral_care_id}
              </div>
              <div
                className="absolute text-xs font-mono font-bold text-slate-800"
                style={{ right: "42%", top: "87.7%" }}
              >
                {data.page1.church_membership_id}
              </div>
            </div>
          )}

          {/* Reactive Overlays for Page 2 */}
          {activePage === 2 && (
            <div className="absolute inset-0 font-['IBM_Plex_Sans_Arabic'] text-[11px] text-slate-900">
              {/* Husband details */}
              <div className="absolute font-semibold" style={{ right: "18%", top: "17.8%" }}>
                {data.page2.husband.name}
              </div>
              <div className="absolute" style={{ right: "18%", top: "20.9%" }}>
                {data.page2.husband.nickname}
              </div>
              <div className="absolute font-mono font-bold" style={{ right: "18%", top: "24.1%" }}>
                {data.page2.husband.national_id}
              </div>
              <div className="absolute" style={{ right: "18%", top: "28.0%" }}>
                {data.page2.husband.job}
              </div>
              <div className="absolute" style={{ right: "18%", top: "31.5%" }}>
                {data.page2.husband.salary}
              </div>
              <div className="absolute font-mono" style={{ right: "18%", top: "34.9%" }}>
                {data.page2.husband.phone}
              </div>

              {/* Wife details */}
              <div className="absolute font-semibold" style={{ right: "59%", top: "17.8%" }}>
                {data.page2.wife.name}
              </div>
              <div className="absolute font-mono font-bold" style={{ right: "59%", top: "24.1%" }}>
                {data.page2.wife.national_id}
              </div>
              <div className="absolute font-mono" style={{ right: "59%", top: "34.9%" }}>
                {data.page2.wife.phone}
              </div>

              {/* Housing & Ration */}
              <div className="absolute" style={{ right: "16%", top: "47.0%" }}>
                {data.page2.address.street}
              </div>
              <div className="absolute" style={{ right: "40%", top: "47.0%" }}>
                {data.page2.address.building_no}
              </div>
              <div className="absolute" style={{ right: "16%", top: "52.0%" }}>
                {data.page2.address.governorate}
              </div>
              <div className="absolute" style={{ right: "48%", top: "52.0%" }}>
                {data.page2.address.area}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
