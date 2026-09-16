import React from "react";
import { CaseStudyData } from "../../types/schema";
import { parseEgyptianNationalId } from "../../hooks/useNationalId";
import { User, Phone, Briefcase, DollarSign, Home, Award, AlertCircle, CheckCircle2 } from "lucide-react";

interface Page2FormProps {
  data: CaseStudyData;
  onChange: (updated: Partial<CaseStudyData>) => void;
}

const GOV_PROGRAM_OPTIONS = [
  "بلا",
  "معاش تكافل وكرامة",
  "معاش تضامن اجتماعي",
  "صندوق تحيا مصر",
  "مصر بلا مرض",
  "خدمات متكاملة"
];

export const Page2Form: React.FC<Page2FormProps> = ({ data, onChange }) => {
  const p2 = data.page2;

  const updateHusband = (field: string, val: any) => {
    const newHusband = { ...p2.husband, [field]: val };
    const updates: Partial<CaseStudyData> = {
      page2: {
        ...p2,
        husband: newHusband
      }
    };
    if (field === "name") {
      const currentHead = data.page6?.family_head?.trim();
      const prevHusband = p2.husband?.name?.trim();
      const prevWife = p2.wife?.name?.trim();
      if (!currentHead || currentHead === prevHusband || currentHead === prevWife) {
        updates.page6 = {
          ...data.page6,
          family_head: val ? String(val).trim() : (p2.wife?.name?.trim() || "")
        };
      }
    }
    onChange(updates);
  };

  const updateWife = (field: string, val: any) => {
    const newWife = { ...p2.wife, [field]: val };
    const updates: Partial<CaseStudyData> = {
      page2: {
        ...p2,
        wife: newWife
      }
    };
    if (field === "name") {
      const currentHead = data.page6?.family_head?.trim();
      const husbandName = p2.husband?.name?.trim();
      const prevWife = p2.wife?.name?.trim();
      if (!husbandName && (!currentHead || currentHead === prevWife)) {
        updates.page6 = {
          ...data.page6,
          family_head: val ? String(val).trim() : ""
        };
      }
    }
    onChange(updates);
  };

  const updateAddress = (field: string, val: any) => {
    onChange({
      page2: {
        ...p2,
        address: { ...p2.address, [field]: val }
      }
    });
  };

  const updateGov = (field: string, val: any) => {
    onChange({
      page2: {
        ...p2,
        gov_programs: { ...p2.gov_programs, [field]: val }
      }
    });
  };

  const husbandNidInfo = parseEgyptianNationalId(p2.husband.national_id);
  const wifeNidInfo = parseEgyptianNationalId(p2.wife.national_id);

  return (
    <div dir="rtl" className="space-y-6 font-['IBM_Plex_Sans_Arabic']">
      <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <User className="w-5 h-5 text-amber-400" />
          الصفحة الثانية: بيانات الأسرة (الزوج والزوجة) والسكن والبرامج الحكومية
        </h2>
      </div>

      {/* Husband & Wife Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Husband Section */}
        <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 space-y-3">
          <div className="text-sm font-bold text-amber-400 pb-2 border-b border-slate-800 flex items-center justify-between">
            <span>بيانات الزوج</span>
            <span className="text-xs font-normal text-slate-400">العمود الأيمن</span>
          </div>

          <div>
            <label className="text-xs text-slate-300 font-medium flex items-center justify-between">
              <span>الاسم رباعي:</span>
              <span className="text-[10px] text-sky-400 font-medium">
                يرتبط كرَب للأسرة برقم البحث (#{data.page1.church_study_id || "784/2026"})
              </span>
            </label>
            <input
              type="text"
              placeholder="مثال: مينا حنا الله جرجس"
              value={p2.husband.name}
              onChange={(e) => updateHusband("name", e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-amber-500 mt-1"
            />
          </div>

          <div>
            <label className="text-xs text-slate-300 font-medium">اسم الشهرة:</label>
            <input
              type="text"
              value={p2.husband.nickname}
              onChange={(e) => updateHusband("nickname", e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-amber-500 mt-1"
            />
          </div>

          <div>
            <label className="text-xs text-slate-300 font-medium flex items-center justify-between">
              <span>الرقم القومي (14 رقم):</span>
              {husbandNidInfo.isValid ? (
                <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-mono">
                  <CheckCircle2 className="w-3 h-3" />
                  {husbandNidInfo.governorate} | {husbandNidInfo.age} سنة
                </span>
              ) : p2.husband.national_id ? (
                <span className="text-[10px] text-rose-400 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  رقم غير مكتمل
                </span>
              ) : null}
            </label>
            <input
              type="text"
              maxLength={14}
              placeholder="28501011401234"
              value={p2.husband.national_id}
              onChange={(e) => updateHusband("national_id", e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white font-mono focus:outline-none focus:border-amber-500 mt-1"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-slate-300 font-medium">الوظيفة:</label>
              <input
                type="text"
                value={p2.husband.job}
                onChange={(e) => updateHusband("job", e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-amber-500 mt-1"
              />
            </div>
            <div>
              <label className="text-xs text-slate-300 font-medium">المرتب:</label>
              <input
                type="text"
                value={p2.husband.salary}
                onChange={(e) => updateHusband("salary", e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-amber-500 mt-1"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-300 font-medium">تليفون / موبايل:</label>
            <input
              type="text"
              value={p2.husband.phone}
              onChange={(e) => updateHusband("phone", e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white font-mono focus:outline-none focus:border-amber-500 mt-1"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-slate-300 font-medium">أب الاعتراف:</label>
              <input
                type="text"
                value={p2.husband.confession_father}
                onChange={(e) => updateHusband("confession_father", e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-amber-500 mt-1"
              />
            </div>
            <div>
              <label className="text-xs text-slate-300 font-medium">الرقم التأميني:</label>
              <input
                type="text"
                value={p2.husband.insurance_no}
                onChange={(e) => updateHusband("insurance_no", e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-amber-500 mt-1"
              />
            </div>
          </div>
        </div>

        {/* Wife Section */}
        <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 space-y-3">
          <div className="text-sm font-bold text-amber-400 pb-2 border-b border-slate-800 flex items-center justify-between">
            <span>بيانات الزوجة</span>
            <span className="text-xs font-normal text-slate-400">العمود الأيسر</span>
          </div>

          <div>
            <label className="text-xs text-slate-300 font-medium flex items-center justify-between">
              <span>الاسم رباعي:</span>
              <span className="text-[10px] text-purple-400 font-medium">
                {p2.husband.name ? "الزوجة" : "يرتبط كرَب للأسرة (لعدم وجود زوج)"}
              </span>
            </label>
            <input
              type="text"
              placeholder="مثال: مريم بطرس رزق الله"
              value={p2.wife.name}
              onChange={(e) => updateWife("name", e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-amber-500 mt-1"
            />
          </div>

          <div>
            <label className="text-xs text-slate-300 font-medium">اسم الشهرة:</label>
            <input
              type="text"
              value={p2.wife.nickname}
              onChange={(e) => updateWife("nickname", e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-amber-500 mt-1"
            />
          </div>

          <div>
            <label className="text-xs text-slate-300 font-medium flex items-center justify-between">
              <span>الرقم القومي (14 رقم):</span>
              {wifeNidInfo.isValid ? (
                <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-mono">
                  <CheckCircle2 className="w-3 h-3" />
                  {wifeNidInfo.governorate} | {wifeNidInfo.age} سنة
                </span>
              ) : p2.wife.national_id ? (
                <span className="text-[10px] text-rose-400 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  رقم غير مكتمل
                </span>
              ) : null}
            </label>
            <input
              type="text"
              maxLength={14}
              placeholder="29001011405678"
              value={p2.wife.national_id}
              onChange={(e) => updateWife("national_id", e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white font-mono focus:outline-none focus:border-amber-500 mt-1"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-slate-300 font-medium">الوظيفة:</label>
              <input
                type="text"
                value={p2.wife.job}
                onChange={(e) => updateWife("job", e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-amber-500 mt-1"
              />
            </div>
            <div>
              <label className="text-xs text-slate-300 font-medium">المرتب:</label>
              <input
                type="text"
                value={p2.wife.salary}
                onChange={(e) => updateWife("salary", e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-amber-500 mt-1"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-300 font-medium">تليفون / موبايل:</label>
            <input
              type="text"
              value={p2.wife.phone}
              onChange={(e) => updateWife("phone", e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white font-mono focus:outline-none focus:border-amber-500 mt-1"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-slate-300 font-medium">أب الاعتراف:</label>
              <input
                type="text"
                value={p2.wife.confession_father}
                onChange={(e) => updateWife("confession_father", e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-amber-500 mt-1"
              />
            </div>
            <div>
              <label className="text-xs text-slate-300 font-medium">الرقم التأميني:</label>
              <input
                type="text"
                value={p2.wife.insurance_no}
                onChange={(e) => updateWife("insurance_no", e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-amber-500 mt-1"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Housing & Address */}
      <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 space-y-3">
        <div className="text-sm font-bold text-amber-400 pb-2 border-b border-slate-800 flex items-center gap-2">
          <Home className="w-4 h-4" />
          <span>السكن والعنوان</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="md:col-span-2">
            <label className="text-xs text-slate-300 font-medium">الشارع:</label>
            <input
              type="text"
              value={p2.address.street}
              onChange={(e) => updateAddress("street", e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-amber-500 mt-1"
            />
          </div>
          <div>
            <label className="text-xs text-slate-300 font-medium">رقم العقار:</label>
            <input
              type="text"
              value={p2.address.building_no}
              onChange={(e) => updateAddress("building_no", e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-amber-500 mt-1"
            />
          </div>
          <div>
            <label className="text-xs text-slate-300 font-medium">المحافظة:</label>
            <input
              type="text"
              value={p2.address.governorate}
              onChange={(e) => updateAddress("governorate", e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-amber-500 mt-1"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-slate-300 font-medium">المنطقة:</label>
            <input
              type="text"
              value={p2.address.area}
              onChange={(e) => updateAddress("area", e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-amber-500 mt-1"
            />
          </div>
          <div>
            <label className="text-xs text-slate-300 font-medium">علامة مميزة:</label>
            <input
              type="text"
              value={p2.address.landmark}
              onChange={(e) => updateAddress("landmark", e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-amber-500 mt-1"
            />
          </div>
          <div>
            <label className="text-xs text-slate-300 font-medium">نوع السكن:</label>
            <input
              type="text"
              placeholder="تمليك / إيجار قديم / جديد"
              value={p2.address.housing_type}
              onChange={(e) => updateAddress("housing_type", e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-amber-500 mt-1"
            />
          </div>
        </div>
      </div>

      {/* Ration Card & Government Programs */}
      <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 space-y-3">
        <div className="text-sm font-bold text-amber-400 pb-2 border-b border-slate-800 flex items-center gap-2">
          <Award className="w-4 h-4" />
          <span>التموين والبرامج الحكومية</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="text-xs text-slate-300 font-medium">بطاقة تموين:</label>
            <select
              value={p2.gov_programs.has_ration_card}
              onChange={(e) => updateGov("has_ration_card", e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-amber-500 mt-1"
            >
              <option value="نعم">نعم</option>
              <option value="لا">لا</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-300 font-medium">عدد الأفراد بالبطاقة:</label>
            <input
              type="number"
              value={p2.gov_programs.ration_members_count}
              onChange={(e) => updateGov("ration_members_count", e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-amber-500 mt-1"
            />
          </div>
          <div>
            <label className="text-xs text-slate-300 font-medium">برنامج حكومي (1):</label>
            <select
              value={p2.gov_programs.program_1 || "بلا"}
              onChange={(e) => updateGov("program_1", e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-amber-500 mt-1 cursor-pointer"
            >
              {GOV_PROGRAM_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
              {p2.gov_programs.program_1 && !GOV_PROGRAM_OPTIONS.includes(p2.gov_programs.program_1) && (
                <option value={p2.gov_programs.program_1}>{p2.gov_programs.program_1}</option>
              )}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-300 font-medium">برنامج حكومي (2):</label>
            <select
              value={p2.gov_programs.program_2 || "بلا"}
              onChange={(e) => updateGov("program_2", e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-amber-500 mt-1 cursor-pointer"
            >
              {GOV_PROGRAM_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
              {p2.gov_programs.program_2 && !GOV_PROGRAM_OPTIONS.includes(p2.gov_programs.program_2) && (
                <option value={p2.gov_programs.program_2}>{p2.gov_programs.program_2}</option>
              )}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};
