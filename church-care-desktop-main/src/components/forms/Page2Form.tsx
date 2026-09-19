import React, { useState } from "react";
import { CaseStudyData, HusbandStatus } from "../../types/schema";
import { parseEgyptianNationalId } from "../../hooks/useNationalId";
import {
  User,
  Phone,
  Briefcase,
  DollarSign,
  Home,
  Award,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  Wand2,
  Sparkles,
  HeartHandshake
} from "lucide-react";
import {
  isHusbandAbsent,
  getHusbandStatusLabel,
  getHeadOfHouseholdName,
  HUSBAND_STATUS_LABELS
} from "../../utils/caseStudyUtils";

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

const HUSBAND_STATUS_OPTIONS: { id: HusbandStatus; label: string; icon: string; desc: string }[] = [
  { id: "present", label: "متواجد", icon: "🟢", desc: "على قيد الحياة ويعول الأسرة" },
  { id: "deceased", label: "متوفي", icon: "⚰️", desc: "الزوجة هي رب الأسرة" },
  { id: "abandoned", label: "تارك المنزل", icon: "🚪", desc: "ساب الزوجة والأولاد" },
  { id: "apostate", label: "خارج الحظيرة", icon: "⚠️", desc: "ترك الدين ومرتد" },
  { id: "separated", label: "منفصل / طلاق", icon: "⚖️", desc: "انفصال عائلي" },
  { id: "traveler", label: "مسافر / غائب", icon: "✈️", desc: "غير متواجد" },
  { id: "prisoner", label: "سجين", icon: "🔒", desc: "محبوس" },
  { id: "other", label: "أخرى...", icon: "✍️", desc: "تحديد حالة خاصة" }
];

export const Page2Form: React.FC<Page2FormProps> = ({ data, onChange }) => {
  const p2 = data.page2;
  const [smartAppliedNote, setSmartAppliedNote] = useState<string | null>(null);

  const currentStatus: HusbandStatus = p2.husband?.status || "present";
  const isAbsent = isHusbandAbsent(p2.husband);
  const husbandStatusLabel = getHusbandStatusLabel(p2.husband);

  const updateHusband = (field: string, val: any) => {
    const newHusband = { ...p2.husband, [field]: val };
    const updates: Partial<CaseStudyData> = {
      page2: {
        ...p2,
        husband: newHusband
      }
    };

    // If changing name, status, or custom_status, re-calculate and propagate head of household
    if (field === "name" || field === "status" || field === "custom_status") {
      const syntheticData: Partial<CaseStudyData> = {
        ...data,
        page2: {
          ...p2,
          husband: newHusband
        }
      };
      const calculatedHead = getHeadOfHouseholdName(syntheticData);
      const currentHead = data.page6?.family_head?.trim();
      const prevHusband = p2.husband?.name?.trim();
      const prevWife = p2.wife?.name?.trim();

      if (!currentHead || currentHead === prevHusband || currentHead === prevWife || calculatedHead) {
        updates.page6 = {
          ...data.page6,
          family_head: calculatedHead
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
      const syntheticData: Partial<CaseStudyData> = {
        ...data,
        page2: {
          ...p2,
          wife: newWife
        }
      };
      const calculatedHead = getHeadOfHouseholdName(syntheticData);
      const currentHead = data.page6?.family_head?.trim();
      const husbandName = p2.husband?.name?.trim();
      const prevWife = p2.wife?.name?.trim();

      // If husband is absent or no husband name, wife becomes head of household immediately
      if (isAbsent || !husbandName) {
        if (!currentHead || currentHead === prevWife || currentHead === husbandName) {
          updates.page6 = {
            ...data.page6,
            family_head: calculatedHead
          };
        }
      }
    }
    onChange(updates);
  };

  // Smart 1-click action: Apply recommendations to Page 3 & Page 5 based on selected husband status
  const handleApplySmartPresets = () => {
    const updates: Partial<CaseStudyData> = {};
    const st = p2.husband.status;

    if (st === "abandoned") {
      // Page 3: set abandoned parent
      const p3 = data.page3 || ({} as any);
      updates.page3 = {
        ...p3,
        medical_conditions: {
          ...p3.medical_conditions,
          abandoned_parent: "الأب تارك المنزل والأسرة دون عائل أو رعاية"
        }
      };
      // Page 5: entry reason
      const p5 = data.page5 || ({} as any);
      if (!p5.entry_reason?.trim()) {
        updates.page5 = {
          ...p5,
          entry_reason: "ترك الزوج للمنزل والأسرة دون عائل، والزوجة هي العائل الوحيد للأبناء."
        };
      }
      setSmartAppliedNote("تم تعبئة خانة الأب تارك المنزل بصفحة 3 واقتراح سبب الخدمة بصفحة 5!");
    } else if (st === "deceased") {
      const p5 = data.page5 || ({} as any);
      if (!p5.entry_reason?.trim()) {
        updates.page5 = {
          ...p5,
          entry_reason: "وفاة عائل الأسرة (الزوج)، والزوجة أرملة تعول الأبناء بمفردها."
        };
      }
      setSmartAppliedNote("تم اقتراح سبب دخول الخدمة (وفاة عائل الأسرة) بصفحة 5 بنجاح!");
    } else if (st === "apostate") {
      const p5 = data.page5 || ({} as any);
      if (!p5.entry_reason?.trim()) {
        updates.page5 = {
          ...p5,
          entry_reason: "خروج الزوج عن الحظيرة وترك الأسرة، والزوجة تعول الأبناء بمفردها."
        };
      }
      setSmartAppliedNote("تم تسجيل سبب الخدمة بصفحة 5 بنجاح!");
    } else if (st === "separated") {
      const p5 = data.page5 || ({} as any);
      if (!p5.entry_reason?.trim()) {
        updates.page5 = {
          ...p5,
          entry_reason: "انفصال الزوجين والزوجة تعول الأسرة بمفردها."
        };
      }
      setSmartAppliedNote("تم تسجيل سبب الخدمة بصفحة 5 بنجاح!");
    } else if (st === "prisoner") {
      const p5 = data.page5 || ({} as any);
      if (!p5.entry_reason?.trim()) {
        updates.page5 = {
          ...p5,
          entry_reason: "حبس الزوج العائل والزوجة تعول الأسرة بمفردها."
        };
      }
      setSmartAppliedNote("تم تسجيل سبب الخدمة بصفحة 5 بنجاح!");
    } else if (st === "traveler") {
      const p5 = data.page5 || ({} as any);
      if (!p5.entry_reason?.trim()) {
        updates.page5 = {
          ...p5,
          entry_reason: "سفر / غياب الزوج وانقطاع الدخل والزوجة تدير الأسرة بمفردها."
        };
      }
      setSmartAppliedNote("تم تسجيل سبب الخدمة بصفحة 5 بنجاح!");
    }

    if (Object.keys(updates).length > 0) {
      onChange(updates);
    }
    setTimeout(() => setSmartAppliedNote(null), 4500);
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
        <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 space-y-4">
          <div className="text-sm font-bold text-amber-400 pb-2 border-b border-slate-800 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <span>بيانات الزوج</span>
              {isAbsent && (
                <span className="text-xs font-normal text-amber-300 bg-amber-500/20 border border-amber-500/30 px-2 py-0.5 rounded-full">
                  {husbandStatusLabel}
                </span>
              )}
            </span>
            <span className="text-xs font-normal text-slate-400">العمود الأيمن</span>
          </div>

          {/* Smart Status Selector */}
          <div className="space-y-2 bg-slate-950/40 p-3 rounded-xl border border-slate-800">
            <label className="text-xs text-slate-300 font-semibold flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-amber-400">
                <HeartHandshake className="w-3.5 h-3.5" />
                <span>الوضع العائلي وحالة الزوج:</span>
              </span>
              {isAbsent ? (
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
                  الزوجة هي رب الأسرة تلقائياً
                </span>
              ) : (
                <span className="text-[10px] text-slate-400">
                  الزوج هو رب الأسرة الافتراضي
                </span>
              )}
            </label>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-1">
              {HUSBAND_STATUS_OPTIONS.map((opt) => {
                const isSelected = currentStatus === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => updateHusband("status", opt.id)}
                    className={`flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${isSelected
                        ? opt.id === "present"
                          ? "bg-emerald-500/20 text-emerald-300 border-emerald-500 shadow-sm"
                          : "bg-amber-500/25 text-amber-200 border-amber-500 shadow-sm"
                        : "bg-slate-800/80 hover:bg-slate-800 text-slate-300 border-slate-700/60"
                      }`}
                    title={opt.desc}
                  >
                    <span>{opt.icon}</span>
                    <span className="truncate">{opt.label}</span>
                  </button>
                );
              })}
            </div>

            {currentStatus === "other" && (
              <div className="pt-2">
                <input
                  type="text"
                  placeholder="اكتب الوضع الخاص للزوج (مثال: عاجز كلياً طريح الفراش / مفقود)..."
                  value={p2.husband.custom_status || ""}
                  onChange={(e) => updateHusband("custom_status", e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>
            )}
          </div>

          {/* Dynamic Smart Alert Banner for Absent/Special Statuses */}
          {isAbsent && (
            <div className="bg-amber-950/40 border border-amber-600/40 rounded-xl p-3 space-y-2">
              <div className="flex items-start gap-2 text-xs text-amber-200 leading-relaxed">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">معالجة ذكية: </span>
                  <span>
                    نظراً لأن الزوج ({husbandStatusLabel})، تم اعتماد الزوجة
                    {p2.wife.name ? ` (${p2.wife.name})` : " (المسجلة بالعمود الأيسر)"}
                    تلقائياً كـ <strong className="text-amber-300">رب للأسرة</strong> ومستلمة للمساعدات الشهرية
                    في صفحة 6 وسجلات الصرف وعنوان البحث.
                  </span>
                </div>
              </div>

              {/* Quick smart applicator button */}
              {currentStatus !== "other" && (
                <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-amber-600/20">
                  <button
                    type="button"
                    onClick={handleApplySmartPresets}
                    className="text-[11px] bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-2.5 py-1 rounded-md flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="تعبئة الخانات المرتبطة بهذه الحالة تلقائياً في صفحة 3 وصفحة 5"
                  >
                    <Wand2 className="w-3 h-3" />
                    <span>تطبيق تلقائي في صفحة 3 وصفحة 5</span>
                  </button>
                  {smartAppliedNote && (
                    <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-medium animate-pulse">
                      <CheckCircle2 className="w-3 h-3" />
                      {smartAppliedNote}
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Husband Name Input */}
          <div>
            <label className="text-xs text-slate-300 font-medium flex items-center justify-between">
              <span>
                {currentStatus === "deceased"
                  ? "اسم الزوج المتوفي (اختياري - يظهر بالاستمارة):"
                  : currentStatus === "abandoned"
                    ? "اسم الزوج تارك المنزل (اختياري):"
                    : currentStatus === "apostate"
                      ? "اسم الزوج خارج الحظيرة (اختياري):"
                      : currentStatus === "separated"
                        ? "اسم الزوج المنفصل (اختياري):"
                        : currentStatus === "traveler"
                          ? "اسم الزوج المسافر / الغائب (اختياري):"
                          : currentStatus === "prisoner"
                            ? "اسم الزوج المسجون (اختياري):"
                            : "الاسم رباعي (كما بالبطاقة):"}
              </span>
              <span className="text-[10px] text-sky-400 font-medium">
                {isAbsent
                  ? `(صفته بالطباعة: ${husbandStatusLabel})`
                  : `يرتبط كرَب للأسرة (#${data.page1.church_study_id || ""})`}
              </span>
            </label>
            <input
              type="text"
              placeholder={
                currentStatus === "deceased"
                  ? "مثال: سمير فهيم عبد المسيح (أو اتركه فارغاً)"
                  : currentStatus === "abandoned"
                    ? "اسم الزوج تارك المنزل أو تركه فارغاً"
                    : "مثال: الاسم رباعي كما بالبطاقة"
              }
              value={p2.husband.name}
              onChange={(e) => updateHusband("name", e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-amber-500 mt-1"
            />
          </div>

          <div>
            <label className="text-xs text-slate-300 font-medium flex items-center justify-between">
              <span>اسم الشهرة:</span>
              {isAbsent && <span className="text-[10px] text-slate-400">(اختياري)</span>}
            </label>
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
              ) : isAbsent ? (
                <span className="text-[10px] text-slate-400">(اختياري للزوج غير المتواجد)</span>
              ) : null}
            </label>
            <input
              type="text"
              maxLength={14}
              placeholder={isAbsent ? "الرقم القومي إن توفر" : "28501011401234"}
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
                placeholder={isAbsent ? "غير مطلوب" : "عامل باليومية"}
                value={p2.husband.job}
                onChange={(e) => updateHusband("job", e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-amber-500 mt-1"
              />
            </div>
            <div>
              <label className="text-xs text-slate-300 font-medium">
                {currentStatus === "deceased"
                  ? "معاش الزوج إن وجد:"
                  : isAbsent
                    ? "أي نفقة/دخل يرسله:"
                    : "المرتب:"}
              </label>
              <input
                type="text"
                placeholder={isAbsent ? "0" : "2500"}
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
              placeholder={isAbsent ? "اختياري" : "01234567890"}
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
                placeholder={isAbsent ? "اختياري" : "أبونا..."}
                value={p2.husband.confession_father}
                onChange={(e) => updateHusband("confession_father", e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-amber-500 mt-1"
              />
            </div>
            <div>
              <label className="text-xs text-slate-300 font-medium">الرقم التأميني:</label>
              <input
                type="text"
                placeholder={currentStatus === "deceased" ? "رقم ملف المعاش إن وجد" : "اختياري"}
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
            <span className="flex items-center gap-1.5">
              <span>بيانات الزوجة</span>
              {isAbsent && (
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-emerald-400" />
                  رب الأسرة المستلمة
                </span>
              )}
            </span>
            <span className="text-xs font-normal text-slate-400">العمود الأيسر</span>
          </div>

          <div>
            <label className="text-xs text-slate-300 font-medium flex items-center justify-between">
              <span>الاسم رباعي:</span>
              <span className={`text-[10px] font-medium ${isAbsent ? "text-emerald-400 font-bold" : p2.husband.name ? "text-purple-400" : "text-emerald-400"}`}>
                {isAbsent
                  ? `رب الأسرة المستلمة (الزوج: ${husbandStatusLabel})`
                  : p2.husband.name
                    ? "الزوجة"
                    : "يرتبط كرَب للأسرة (لعدم وجود زوج)"}
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
