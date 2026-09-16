import React from "react";
import { CaseStudyData } from "../../types/schema";
import { DropZone } from "../studio/DropZone";
import { Calendar, Hash, MapPin, User, FileBadge, Lock, Building2 } from "lucide-react";
import { DIOCESAN_CHURCHES } from "../../utils/churchLicense";

interface Page1FormProps {
  data: CaseStudyData;
  onChange: (updated: Partial<CaseStudyData>) => void;
  onOpenHusbandCropper: () => void;
  onOpenWifeCropper: () => void;
  lockedChurchName?: string | null;
}

export const Page1Form: React.FC<Page1FormProps> = ({
  data,
  onChange,
  onOpenHusbandCropper,
  onOpenWifeCropper,
  lockedChurchName = null
}) => {
  const updateP1 = (field: string, val: string) => {
    onChange({
      page1: {
        ...data.page1,
        [field]: val
      }
    });
  };

  const handleHusbandFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      onChange({ husband_id_image: e.target?.result as string });
    };
    reader.readAsDataURL(file);
  };

  const handleWifeFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      onChange({ wife_id_image: e.target?.result as string });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div dir="rtl" className="space-y-6 font-['IBM_Plex_Sans_Arabic']">
      {/* Header Info Banner */}
      <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <FileBadge className="w-5 h-5 text-amber-400" />
            الصفحة الأولى: البيانات الأساسية وبطاقات الرقم القومي
          </h2>
          <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
            {lockedChurchName ? (
              <>
                <Lock className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-amber-300 font-bold">{lockedChurchName}</span>
                <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30">
                  ثابت بالترخيص
                </span>
              </>
            ) : (
              <span>{data.page1.church_name || "إيبارشية شبين القناطر وتوابعها"}</span>
            )}
          </p>
        </div>
      </div>

      {/* National ID Studio Interactive Dropzones */}
      <div className="space-y-3">
        <label className="text-xs font-semibold text-amber-400 flex items-center gap-1.5">
          <span>بطاقات الرقم القومي (تظهر تلقائياً في خانات الصفحة 1)</span>
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <span className="text-xs text-slate-300 font-medium">صورة بطاقة الزوج:</span>
            <DropZone
              label="بطاقة الزوج"
              sublabel="الخانة اليمنى Rect(320, 135, 545, 275)"
              image={data.husband_id_image}
              onOpenEditor={onOpenHusbandCropper}
              onDropImage={handleHusbandFile}
            />
          </div>

          <div className="space-y-1.5">
            <span className="text-xs text-slate-300 font-medium">صورة بطاقة الزوجة:</span>
            <DropZone
              label="بطاقة الزوجة"
              sublabel="الخانة اليسرى Rect(50, 135, 275, 275)"
              image={data.wife_id_image}
              onOpenEditor={onOpenWifeCropper}
              onDropImage={handleWifeFile}
            />
          </div>
        </div>
      </div>

      {/* Identification Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
        {/* Church Selection or Locked Church */}
        <div className="md:col-span-2">
          <label className="text-xs text-slate-300 font-medium flex items-center justify-between mb-1.5">
            <span className="flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-amber-400" />
              <span>الكنيسة:</span>
            </span>
            {lockedChurchName && (
              <span className="text-[10px] text-amber-400 font-bold flex items-center gap-1">
                <Lock className="w-3 h-3" />
                <span>معتمدة تلقائياً بناءً على ترخيص البرنامج</span>
              </span>
            )}
          </label>
          {lockedChurchName ? (
            <div className="w-full bg-slate-800/90 border border-amber-500/60 rounded-lg px-3 py-2 text-sm text-amber-200 font-bold flex items-center justify-between shadow-inner">
              <span className="truncate">{lockedChurchName}</span>
              <span className="text-xs bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded border border-amber-500/30 shrink-0">
                كنيسة معتمدة
              </span>
            </div>
          ) : (
            <select
              value={data.page1.church_name || ""}
              onChange={(e) => updateP1("church_name", e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 focus:border-amber-500 rounded-lg px-3 py-2 text-sm text-white focus:outline-none cursor-pointer"
            >
              <option value="">-- اختر الكنيسة --</option>
              {DIOCESAN_CHURCHES.map((c, i) => (
                <option key={i} value={c}>
                  {c}
                </option>
              ))}
            </select>
          )}
        </div>

        <div>
          <label className="text-xs text-slate-300 font-medium flex items-center gap-1.5 mb-1.5">
            <Calendar className="w-3.5 h-3.5 text-amber-400" />
            تاريخ بحث الحالة:
          </label>
          <input
            type="text"
            placeholder="مثال: 2026/09/04"
            value={data.page1.study_date}
            onChange={(e) => updateP1("study_date", e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 focus:border-amber-500 rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
          />
        </div>

        <div>
          <label className="text-xs text-slate-300 font-medium flex items-center gap-1.5 mb-1.5">
            <Hash className="w-3.5 h-3.5 text-amber-400" />
            رقم البحث بالكنيسة:
          </label>
          <input
            type="text"
            placeholder="مثال: 784/2026"
            value={data.page1.church_study_id}
            onChange={(e) => updateP1("church_study_id", e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 focus:border-amber-500 rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
          />
        </div>

        <div>
          <label className="text-xs text-slate-300 font-medium flex items-center gap-1.5 mb-1.5">
            <MapPin className="w-3.5 h-3.5 text-amber-400" />
            المنطقة:
          </label>
          <input
            type="text"
            placeholder="مثال: القلج - الخانكة"
            value={data.page1.area}
            onChange={(e) => updateP1("area", e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 focus:border-amber-500 rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
          />
        </div>

        <div>
          <label className="text-xs text-slate-300 font-medium flex items-center gap-1.5 mb-1.5">
            <User className="w-3.5 h-3.5 text-amber-400" />
            اسم الكاهن المسؤول:
          </label>
          <input
            type="text"
            placeholder="مثال: القمص بيشوي حليم"
            value={data.page1.responsible_priest}
            onChange={(e) => updateP1("responsible_priest", e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 focus:border-amber-500 rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
          />
        </div>

        <div>
          <label className="text-xs text-slate-300 font-medium flex items-center gap-1.5 mb-1.5">
            <Hash className="w-3.5 h-3.5 text-slate-400" />
            رقم بحث الحالة ببرنامج إدارة الرعاية (الكاتدرائية):
          </label>
          <input
            type="text"
            placeholder="مثال: CAT-9042"
            value={data.page1.cathedral_care_id}
            onChange={(e) => updateP1("cathedral_care_id", e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 focus:border-amber-500 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none"
          />
        </div>

        <div>
          <label className="text-xs text-slate-300 font-medium flex items-center gap-1.5 mb-1.5">
            <Hash className="w-3.5 h-3.5 text-slate-400" />
            رقم الأسرة بقاعدة البيانات ببرنامج العضوية الكنسية:
          </label>
          <input
            type="text"
            placeholder="مثال: MEM-1104"
            value={data.page1.church_membership_id}
            onChange={(e) => updateP1("church_membership_id", e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 focus:border-amber-500 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none"
          />
        </div>
      </div>
    </div>
  );
};
