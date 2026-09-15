import React from "react";
import { CaseStudyData } from "../../types/schema";
import { DropZone } from "../studio/DropZone";
import { Calendar, Hash, MapPin, User, FileBadge } from "lucide-react";

interface Page1FormProps {
  data: CaseStudyData;
  onChange: (updated: Partial<CaseStudyData>) => void;
  onOpenHusbandCropper: () => void;
  onOpenWifeCropper: () => void;
}

export const Page1Form: React.FC<Page1FormProps> = ({
  data,
  onChange,
  onOpenHusbandCropper,
  onOpenWifeCropper
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
          <p className="text-xs text-slate-400 mt-1">
            كنيسة الشهيد العظيم أبي سيفين والقديسة دميانة - القلج
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
