import React from "react";
import { CaseStudyData } from "../../types/schema";
import { CheckSquare, Clock, ShieldCheck, PenTool } from "lucide-react";

interface Page5FormProps {
  data: CaseStudyData;
  onChange: (updated: Partial<CaseStudyData>) => void;
}

export const Page5Form: React.FC<Page5FormProps> = ({ data, onChange }) => {
  const p5 = data.page5;

  const updateField = (field: string, val: any) => {
    onChange({
      page5: {
        ...p5,
        [field]: val
      }
    });
  };

  const updateMember = (index: number, val: string) => {
    const updated = [...p5.committee_members] as [string, string, string];
    updated[index] = val;
    onChange({
      page5: {
        ...p5,
        committee_members: updated
      }
    });
  };

  return (
    <div dir="rtl" className="space-y-6 font-['IBM_Plex_Sans_Arabic']">
      <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <CheckSquare className="w-5 h-5 text-amber-400" />
          الصفحة الخامسة: قرارات اللجنة وأعضاء اللجنة المسؤولة
        </h2>
      </div>

      <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 space-y-4">
        <div>
          <label className="text-xs text-slate-300 font-medium flex items-center gap-1.5 mb-1.5">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            المدة المحددة لخدمة الأسرة:
          </label>
          <input
            type="text"
            placeholder="سنة كاملة تجدد في أول سبتمبر 2027"
            value={p5.duration}
            onChange={(e) => updateField("duration", e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
          />
        </div>

        <div>
          <label className="text-xs text-slate-300 font-medium flex items-center gap-1.5 mb-1.5">
            سبب دخول الأسرة الخدمة:
          </label>
          <textarea
            rows={2}
            placeholder="ضعف دخل الزوج بسبب العجز الصحي ووجود طالبين في مراحل الشهادات..."
            value={p5.entry_reason}
            onChange={(e) => updateField("entry_reason", e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-amber-500"
          />
        </div>

        <div>
          <label className="text-xs text-slate-300 font-medium flex items-center gap-1.5 mb-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            يتم نزول الأسرة مساعدة بمبلغ (ج.م):
          </label>
          <input
            type="text"
            placeholder="2000"
            value={p5.approved_amount}
            onChange={(e) => updateField("approved_amount", e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-amber-500 font-bold"
          />
        </div>

        <div>
          <label className="text-xs text-slate-300 font-medium flex items-center gap-1.5 mb-1.5">
            ملاحظات أخرى وتوصيات المتابعة:
          </label>
          <textarea
            rows={3}
            placeholder="صرف روشتة علاجية شهرية ومتابعة البحث سنوياً..."
            value={p5.notes}
            onChange={(e) => updateField("notes", e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-amber-500"
          />
        </div>

        {/* Committee Members */}
        <div className="pt-2 border-t border-slate-800 space-y-3">
          <label className="text-xs font-semibold text-amber-400 flex items-center gap-1.5">
            <PenTool className="w-3.5 h-3.5" />
            أسماء أعضاء اللجنة الثلاثة:
          </label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <span className="text-[11px] text-slate-400">العضو الأول:</span>
              <input
                type="text"
                placeholder="د. سامح منير"
                value={p5.committee_members[0]}
                onChange={(e) => updateMember(0, e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-amber-500 mt-1"
              />
            </div>
            <div>
              <span className="text-[11px] text-slate-400">العضو الثاني:</span>
              <input
                type="text"
                placeholder="أ. ميخائيل وديع"
                value={p5.committee_members[1]}
                onChange={(e) => updateMember(1, e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-amber-500 mt-1"
              />
            </div>
            <div>
              <span className="text-[11px] text-slate-400">العضو الثالث:</span>
              <input
                type="text"
                placeholder="م. رامي فايز"
                value={p5.committee_members[2]}
                onChange={(e) => updateMember(2, e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-amber-500 mt-1"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
