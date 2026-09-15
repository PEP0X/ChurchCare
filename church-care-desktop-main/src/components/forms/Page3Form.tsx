import React from "react";
import { CaseStudyData, FamilyMember, OtherResident } from "../../types/schema";
import { Users, Plus, Trash2, HeartPulse, Home } from "lucide-react";

interface Page3FormProps {
  data: CaseStudyData;
  onChange: (updated: Partial<CaseStudyData>) => void;
}

export const Page3Form: React.FC<Page3FormProps> = ({ data, onChange }) => {
  const p3 = data.page3;

  const addFamilyMember = () => {
    if (p3.family_members.length >= 8) return;
    const newMember: FamilyMember = {
      id: Date.now().toString(),
      name: "",
      national_id: "",
      social_status: "",
      education_job: "",
      income: "",
      confession_father: ""
    };
    onChange({
      page3: {
        ...p3,
        family_members: [...p3.family_members, newMember]
      }
    });
  };

  const updateFamilyMember = (index: number, field: keyof FamilyMember, val: any) => {
    const updated = [...p3.family_members];
    updated[index] = { ...updated[index], [field]: val };
    onChange({
      page3: { ...p3, family_members: updated }
    });
  };

  const removeFamilyMember = (index: number) => {
    onChange({
      page3: {
        ...p3,
        family_members: p3.family_members.filter((_, i) => i !== index)
      }
    });
  };

  const updateMed = (field: string, val: string) => {
    onChange({
      page3: {
        ...p3,
        medical_conditions: {
          ...p3.medical_conditions,
          [field]: val
        }
      }
    });
  };

  return (
    <div dir="rtl" className="space-y-6 font-['IBM_Plex_Sans_Arabic']">
      <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <Users className="w-5 h-5 text-amber-400" />
          الصفحة الثالثة: أفراد العائلة، وصف السكن، والحالات المرضية والاجتماعية
        </h2>
      </div>

      {/* Family Members Table (Up to 8) */}
      <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <span className="text-sm font-bold text-amber-400">
            جدول أفراد العائلة (الأبناء) - {p3.family_members.length} من 8
          </span>
          <button
            type="button"
            onClick={addFamilyMember}
            disabled={p3.family_members.length >= 8}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs disabled:opacity-40"
          >
            <Plus className="w-3.5 h-3.5" />
            إضافة فرد
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="text-slate-400 border-b border-slate-800">
                <th className="p-2">الاسم</th>
                <th className="p-2">الرقم القومي</th>
                <th className="p-2">الحالة</th>
                <th className="p-2">الدراسة / الوظيفة</th>
                <th className="p-2">الدخل</th>
                <th className="p-2">أب الاعتراف</th>
                <th className="p-2 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {p3.family_members.map((m, idx) => (
                <tr key={m.id || idx} className="border-b border-slate-800/60">
                  <td className="p-1.5">
                    <input
                      type="text"
                      value={m.name}
                      placeholder="اسم الفرد"
                      onChange={(e) => updateFamilyMember(idx, "name", e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white"
                    />
                  </td>
                  <td className="p-1.5">
                    <input
                      type="text"
                      maxLength={14}
                      placeholder="الرقم القومي"
                      value={m.national_id}
                      onChange={(e) => updateFamilyMember(idx, "national_id", e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white font-mono"
                    />
                  </td>
                  <td className="p-1.5">
                    <input
                      type="text"
                      placeholder="أعزب"
                      value={m.social_status}
                      onChange={(e) => updateFamilyMember(idx, "social_status", e.target.value)}
                      className="w-20 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white"
                    />
                  </td>
                  <td className="p-1.5">
                    <input
                      type="text"
                      placeholder="الصف..."
                      value={m.education_job}
                      onChange={(e) => updateFamilyMember(idx, "education_job", e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white"
                    />
                  </td>
                  <td className="p-1.5">
                    <input
                      type="text"
                      placeholder="0"
                      value={m.income}
                      onChange={(e) => updateFamilyMember(idx, "income", e.target.value)}
                      className="w-16 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white"
                    />
                  </td>
                  <td className="p-1.5">
                    <input
                      type="text"
                      placeholder="أبونا..."
                      value={m.confession_father}
                      onChange={(e) => updateFamilyMember(idx, "confession_father", e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white"
                    />
                  </td>
                  <td className="p-1.5 text-center">
                    <button
                      type="button"
                      onClick={() => removeFamilyMember(idx)}
                      className="p-1 text-slate-400 hover:text-rose-400"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Housing Description */}
      <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 space-y-2">
        <label className="text-xs text-slate-300 font-medium flex items-center gap-1.5">
          <Home className="w-3.5 h-3.5 text-amber-400" />
          وصف السكن ومحتوياته والأجهزة الكهربائية:
        </label>
        <textarea
          rows={2}
          value={p3.housing_description}
          placeholder="شقة غرفتين وصالة وحمام ومطبخ، غسالة عادية، ثلاجة 10 قدم..."
          onChange={(e) => onChange({ page3: { ...p3, housing_description: e.target.value } })}
          className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-amber-500"
        />
      </div>

      {/* Medical & Social Conditions */}
      <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 space-y-3">
        <div className="text-sm font-bold text-amber-400 pb-2 border-b border-slate-800 flex items-center gap-2">
          <HeartPulse className="w-4 h-4" />
          <span>الحالات المرضية والاجتماعية والظروف الخاصة</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-slate-300 font-medium">1. أمراض مزمنة وعلاج على نفقة الدولة:</label>
            <input
              type="text"
              value={p3.medical_conditions.diseases}
              onChange={(e) => updateMed("diseases", e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-white mt-1"
            />
          </div>
          <div>
            <label className="text-xs text-slate-300 font-medium">2. صحة نفسية / إدمان:</label>
            <input
              type="text"
              value={p3.medical_conditions.mental_addiction}
              onChange={(e) => updateMed("mental_addiction", e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-white mt-1"
            />
          </div>
          <div>
            <label className="text-xs text-slate-300 font-medium">3. إعاقة:</label>
            <input
              type="text"
              value={p3.medical_conditions.disability}
              onChange={(e) => updateMed("disability", e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-white mt-1"
            />
          </div>
          <div>
            <label className="text-xs text-slate-300 font-medium">4. أب أو أم تاركة المنزل:</label>
            <input
              type="text"
              value={p3.medical_conditions.abandoned_parent}
              onChange={(e) => updateMed("abandoned_parent", e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-white mt-1"
            />
          </div>
        </div>

        <div>
          <label className="text-xs text-slate-300 font-medium">ظروف أخرى:</label>
          <input
            type="text"
            value={p3.medical_conditions.other_circumstances}
            onChange={(e) => updateMed("other_circumstances", e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-white mt-1"
          />
        </div>
      </div>
    </div>
  );
};
