import React from "react";
import { CaseStudyData, AidLedgerEntry } from "../../types/schema";
import { BookOpen, Plus, Trash2, Calendar, UserCheck } from "lucide-react";
import { getHeadOfHouseholdName } from "../../utils/caseStudyUtils";

interface Page6FormProps {
  data: CaseStudyData;
  onChange: (updated: Partial<CaseStudyData>) => void;
}

export const Page6Form: React.FC<Page6FormProps> = ({ data, onChange }) => {
  const p6 = data.page6;
  const linkedHeadName = getHeadOfHouseholdName(data);

  const updateHeader = (field: string, val: string) => {
    onChange({
      page6: {
        ...p6,
        [field]: val
      }
    });
  };

  const addLedgerRow = () => {
    if (p6.aid_ledger.length >= 20) return;
    const newRow: AidLedgerEntry = {
      id: Date.now().toString(),
      aid_type: "",
      amount: "",
      entity: "خزينة الكنيسة",
      date: new Date().toISOString().slice(0, 10).replace(/-/g, "/"),
      recipient_signature: p6.family_head || linkedHeadName || ""
    };
    onChange({
      page6: {
        ...p6,
        aid_ledger: [...p6.aid_ledger, newRow]
      }
    });
  };

  const updateLedgerRow = (index: number, field: keyof AidLedgerEntry, val: any) => {
    const updated = [...p6.aid_ledger];
    updated[index] = { ...updated[index], [field]: val };
    onChange({
      page6: { ...p6, aid_ledger: updated }
    });
  };

  const removeLedgerRow = (index: number) => {
    onChange({
      page6: {
        ...p6,
        aid_ledger: p6.aid_ledger.filter((_, i) => i !== index)
      }
    });
  };

  const updateSignature = (index: number, val: string) => {
    const updated = [...p6.signatures] as [string, string, string];
    updated[index] = val;
    onChange({
      page6: { ...p6, signatures: updated }
    });
  };

  return (
    <div dir="rtl" className="space-y-6 font-['IBM_Plex_Sans_Arabic']">
      <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-amber-400" />
          الصفحة السادسة: سجل المساعدات الدورية (20 سطراً) وتوقيعات الاستلام
        </h2>
      </div>

      {/* Header Info */}
      <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <div className="flex items-center justify-between">
            <label className="text-xs text-slate-300 font-medium">اسم رب الأسرة المستلم:</label>
            {linkedHeadName && p6.family_head !== linkedHeadName && (
              <button
                type="button"
                onClick={() => updateHeader("family_head", linkedHeadName)}
                className="text-[10px] text-amber-400 hover:text-amber-300 hover:underline cursor-pointer"
                title="استرجاع الاسم المرتبط برقم البحث (الزوج أو الزوجة)"
              >
                استرجاع الاسم المرتبط ({linkedHeadName})
              </button>
            )}
          </div>
          <input
            type="text"
            placeholder={linkedHeadName || "اسم رب الأسرة (يُجلب تلقائياً من الزوج/الزوجة)"}
            value={p6.family_head}
            onChange={(e) => updateHeader("family_head", e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white mt-1"
          />
        </div>
        <div>
          <label className="text-xs text-slate-300 font-medium">رقم الأسرة بكشوفات الكنيسة:</label>
          <input
            type="text"
            value={p6.church_records_id}
            onChange={(e) => updateHeader("church_records_id", e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white font-mono mt-1"
          />
        </div>
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="text-xs text-slate-300 font-medium">الفترة من تاريخ:</label>
            <input
              type="text"
              placeholder="2026/09/01"
              value={p6.from_date}
              onChange={(e) => updateHeader("from_date", e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white font-mono mt-1"
            />
          </div>
          <div className="flex-1">
            <label className="text-xs text-slate-300 font-medium">إلى تاريخ:</label>
            <input
              type="text"
              placeholder="2027/08/31"
              value={p6.to_date}
              onChange={(e) => updateHeader("to_date", e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white font-mono mt-1"
            />
          </div>
        </div>
      </div>

      {/* Ledger Table (20 rows) */}
      <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <span className="text-sm font-bold text-amber-400">
            سجل المساعدات المنصرفة ({p6.aid_ledger.length} من 20)
          </span>
          <button
            type="button"
            onClick={addLedgerRow}
            disabled={p6.aid_ledger.length >= 20}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs disabled:opacity-40"
          >
            <Plus className="w-3.5 h-3.5" />
            إضافة عملية صرف
          </button>
        </div>

        <div className="overflow-x-auto max-h-[360px] overflow-y-auto">
          <table className="w-full text-right text-xs">
            <thead className="sticky top-0 bg-slate-900 z-10">
              <tr className="text-slate-400 border-b border-slate-800">
                <th className="p-2 w-8">م</th>
                <th className="p-2">نوع المساعدة</th>
                <th className="p-2 w-28">المبلغ المدفوع</th>
                <th className="p-2">جهة المساعدة</th>
                <th className="p-2 w-28">التاريخ</th>
                <th className="p-2">توقيع المستلم</th>
                <th className="p-2 w-8"></th>
              </tr>
            </thead>
            <tbody>
              {p6.aid_ledger.map((row, idx) => (
                <tr key={row.id || idx} className="border-b border-slate-800/60">
                  <td className="p-1.5 text-center font-mono text-slate-400">{idx + 1}</td>
                  <td className="p-1.5">
                    <input
                      type="text"
                      placeholder="مساعدة شهرية / علاج"
                      value={row.aid_type}
                      onChange={(e) => updateLedgerRow(idx, "aid_type", e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white"
                    />
                  </td>
                  <td className="p-1.5">
                    <input
                      type="text"
                      placeholder="2000"
                      value={row.amount}
                      onChange={(e) => updateLedgerRow(idx, "amount", e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white font-mono"
                    />
                  </td>
                  <td className="p-1.5">
                    <input
                      type="text"
                      placeholder="خزينة الكنيسة"
                      value={row.entity}
                      onChange={(e) => updateLedgerRow(idx, "entity", e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white"
                    />
                  </td>
                  <td className="p-1.5">
                    <input
                      type="text"
                      placeholder="2026/09/05"
                      value={row.date}
                      onChange={(e) => updateLedgerRow(idx, "date", e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white font-mono"
                    />
                  </td>
                  <td className="p-1.5">
                    <input
                      type="text"
                      placeholder="توقيع المستلم"
                      value={row.recipient_signature}
                      onChange={(e) => updateLedgerRow(idx, "recipient_signature", e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white"
                    />
                  </td>
                  <td className="p-1.5 text-center">
                    <button
                      type="button"
                      onClick={() => removeLedgerRow(idx)}
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

      {/* Committee Signatures */}
      <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 space-y-3">
        <span className="text-xs font-semibold text-amber-400 flex items-center gap-1.5">
          <UserCheck className="w-3.5 h-3.5" />
          توقيعات اللجنة المسؤولة:
        </span>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            type="text"
            placeholder="توقيع كاهن الرعاية"
            value={p6.signatures[0]}
            onChange={(e) => updateSignature(0, e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-white"
          />
          <input
            type="text"
            placeholder="توقيع أمين الخدمة"
            value={p6.signatures[1]}
            onChange={(e) => updateSignature(1, e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-white"
          />
          <input
            type="text"
            placeholder="توقيع أمين الصندوق"
            value={p6.signatures[2]}
            onChange={(e) => updateSignature(2, e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-white"
          />
        </div>
      </div>
    </div>
  );
};
