import React from "react";
import { CaseStudyData, ChurchAidItem } from "../../types/schema";
import { DollarSign, Plus, Trash2, Calculator, TrendingDown, CheckCircle2, Sparkles } from "lucide-react";
import {
  recalculatePage4Totals,
  calculateBudgetBalance,
  calculatePage2Salaries,
  calculateMiddleTableProjectsSum,
  calculateMiddleTableRelativesAid,
  formatCurrencyValue
} from "../../utils/page4Calculations";

interface Page4FormProps {
  data: CaseStudyData;
  onChange: (updated: Partial<CaseStudyData>) => void;
}

export const Page4Form: React.FC<Page4FormProps> = ({ data, onChange }) => {
  const p4 = data.page4;
  const page2Salaries = calculatePage2Salaries(data);
  const projectsSum = calculateMiddleTableProjectsSum(data);
  const relativesAid = calculateMiddleTableRelativesAid(data);
  const budgetInfo = calculateBudgetBalance(p4);

  const addAid = () => {
    if (p4.church_aid.length >= 8) return;
    const item: ChurchAidItem = {
      id: Date.now().toString(),
      church_name: "",
      value: 0,
      purpose: ""
    };
    const updatedP4 = recalculatePage4Totals(
      {
        ...p4,
        church_aid: [...p4.church_aid, item]
      },
      data
    );
    onChange({ page4: updatedP4 });
  };

  const updateAid = (index: number, field: keyof ChurchAidItem, val: any) => {
    const updated = [...p4.church_aid];
    updated[index] = { ...updated[index], [field]: val };
    const updatedP4 = recalculatePage4Totals(
      {
        ...p4,
        church_aid: updated
      },
      data
    );
    onChange({ page4: updatedP4 });
  };

  const removeAid = (index: number) => {
    const updatedP4 = recalculatePage4Totals(
      {
        ...p4,
        church_aid: p4.church_aid.filter((_, i) => i !== index)
      },
      data
    );
    onChange({ page4: updatedP4 });
  };

  const updateIncome = (field: string, val: any) => {
    const updatedP4 = recalculatePage4Totals(
      {
        ...p4,
        income: { ...p4.income, [field]: val }
      },
      data
    );
    onChange({ page4: updatedP4 });
  };

  const updateExpense = (field: string, val: any) => {
    const updatedP4 = recalculatePage4Totals(
      {
        ...p4,
        expenses: { ...p4.expenses, [field]: val }
      },
      data
    );
    onChange({ page4: updatedP4 });
  };

  return (
    <div dir="rtl" className="space-y-6 font-['IBM_Plex_Sans_Arabic']">
      <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-amber-400" />
          الصفحة الرابعة: مساعدات الكنائس والهيئات، ومصفوفة الدخل والمصروفات
        </h2>
      </div>

      {/* Church Assistance Table */}
      <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <span className="text-sm font-bold text-amber-400">
            مساعدات وشهريات الكنائس والهيئات الأخرى ({p4.church_aid.length} من 8)
          </span>
          <button
            type="button"
            onClick={addAid}
            disabled={p4.church_aid.length >= 8}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs disabled:opacity-40"
          >
            <Plus className="w-3.5 h-3.5" />
            إضافة كنيسة / هيئة
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="text-slate-400 border-b border-slate-800">
                <th className="p-2">اسم الكنيسة أو الهيئة</th>
                <th className="p-2 w-28">القيمة (ج.م)</th>
                <th className="p-2">الغرض</th>
                <th className="p-2 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {p4.church_aid.map((a, idx) => (
                <tr key={a.id || idx} className="border-b border-slate-800/60">
                  <td className="p-1.5">
                    <input
                      type="text"
                      placeholder="اسم الكنيسة..."
                      value={a.church_name}
                      onChange={(e) => updateAid(idx, "church_name", e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white"
                    />
                  </td>
                  <td className="p-1.5">
                    <input
                      type="number"
                      placeholder="0"
                      value={a.value}
                      onChange={(e) => updateAid(idx, "value", parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white font-mono"
                    />
                  </td>
                  <td className="p-1.5">
                    <input
                      type="text"
                      placeholder="مساعدة إعاشة / علاج..."
                      value={a.purpose}
                      onChange={(e) => updateAid(idx, "purpose", e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white"
                    />
                  </td>
                  <td className="p-1.5 text-center">
                    <button
                      type="button"
                      onClick={() => removeAid(idx)}
                      className="p-1 text-slate-400 hover:text-rose-400"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="text-amber-300 font-bold bg-slate-800/40">
                <td className="p-2 flex items-center gap-1.5">
                  <Calculator className="w-3.5 h-3.5" />
                  <span>إجمالي قيمة المساعدات:</span>
                </td>
                <td className="p-2 font-mono text-sm">{p4.total_church_aid || 0} ج.م</td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Income vs Expense Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Income */}
        <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 space-y-3">
          <div className="text-sm font-bold text-emerald-400 pb-2 border-b border-slate-800 flex items-center justify-between">
            <span>إجمالي الدخل الشهري للأسرة</span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-300">مساعدات وشهريات الكنائس:</span>
              <input
                type="text"
                value={p4.income.church_aid}
                onChange={(e) => updateIncome("church_aid", e.target.value)}
                className="w-28 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white text-left font-mono"
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-300">مساعدات علاجية:</span>
              <input
                type="text"
                value={p4.income.medical_aid}
                onChange={(e) => updateIncome("medical_aid", e.target.value)}
                className="w-28 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white text-left font-mono"
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-300">مساعدات خلال الدراسة:</span>
              <input
                type="text"
                value={p4.income.study_aid}
                onChange={(e) => updateIncome("study_aid", e.target.value)}
                className="w-28 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white text-left font-mono"
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-slate-300">المرتب الأساسي:</span>
                {page2Salaries > 0 && (
                  <button
                    type="button"
                    onClick={() => updateIncome("base_salary", String(page2Salaries))}
                    className="text-[10px] text-amber-400 hover:text-amber-300 text-right cursor-pointer"
                    title="استيراد مجموع مرتبات الزوج والزوجة من صفحة 2"
                  >
                    ⚡ استخدام مرتبات ص2 ({page2Salaries} ج.م)
                  </button>
                )}
              </div>
              <input
                type="text"
                value={p4.income.base_salary}
                onChange={(e) => updateIncome("base_salary", e.target.value)}
                placeholder={page2Salaries > 0 ? String(page2Salaries) : ""}
                className="w-28 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white text-left font-mono"
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-slate-300">المصدر الإضافي (المشروع):</span>
                {projectsSum > 0 && (
                  <span className="text-[10px] text-emerald-400 text-right font-medium">
                    ∑ المشروعات: {projectsSum} ج.م
                  </span>
                )}
              </div>
              <input
                type="text"
                value={p4.income.side_project}
                onChange={(e) => updateIncome("side_project", e.target.value)}
                placeholder={projectsSum > 0 ? String(projectsSum) : ""}
                className="w-28 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white text-left font-mono"
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-slate-300">المصدر الإضافي (أحد الأقارب):</span>
                {relativesAid > 0 && (
                  <span className="text-[10px] text-emerald-400 text-right font-medium">
                    مساعدات الأفراد: {relativesAid} ج.م
                  </span>
                )}
              </div>
              <input
                type="text"
                value={p4.income.relatives_aid}
                onChange={(e) => updateIncome("relatives_aid", e.target.value)}
                placeholder={relativesAid > 0 ? String(relativesAid) : ""}
                className="w-28 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white text-left font-mono"
              />
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-slate-700 font-bold">
              <span className="text-emerald-400 flex items-center gap-1.5">
                <Calculator className="w-3.5 h-3.5" />
                <span>الإجمالي العام للدخل (تلقائي):</span>
              </span>
              <input
                type="text"
                readOnly
                placeholder="0 ج.م"
                value={p4.income.total_income}
                className="w-32 bg-slate-800/90 border border-emerald-500/50 rounded px-2.5 py-1 text-emerald-300 text-left font-mono font-bold cursor-default"
                title="محسوب تلقائياً من مجموع بنود الدخل"
              />
            </div>
          </div>
        </div>

        {/* Expenses */}
        <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 space-y-3">
          <div className="text-sm font-bold text-rose-400 pb-2 border-b border-slate-800 flex items-center justify-between">
            <span>إجمالي المصروفات الشهرية</span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-300">مصروفات إعاشة أساسية:</span>
              <input
                type="text"
                value={p4.expenses.living_basics}
                onChange={(e) => updateExpense("living_basics", e.target.value)}
                className="w-28 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white text-left font-mono"
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-300">كهرباء ومياه وغاز:</span>
              <input
                type="text"
                value={p4.expenses.utilities}
                onChange={(e) => updateExpense("utilities", e.target.value)}
                className="w-28 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white text-left font-mono"
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-300">تليفون وموبايل:</span>
              <input
                type="text"
                value={p4.expenses.phone}
                onChange={(e) => updateExpense("phone", e.target.value)}
                className="w-28 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white text-left font-mono"
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-300">إيجار السكن:</span>
              <input
                type="text"
                value={p4.expenses.rent}
                onChange={(e) => updateExpense("rent", e.target.value)}
                className="w-28 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white text-left font-mono"
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-300">علاج وأدوية:</span>
              <input
                type="text"
                value={p4.expenses.medical}
                onChange={(e) => updateExpense("medical", e.target.value)}
                className="w-28 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white text-left font-mono"
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-300">دراسة ومصاريف تعليم:</span>
              <input
                type="text"
                value={p4.expenses.education}
                onChange={(e) => updateExpense("education", e.target.value)}
                className="w-28 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white text-left font-mono"
              />
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-slate-700 font-bold">
              <span className="text-rose-400 flex items-center gap-1.5">
                <Calculator className="w-3.5 h-3.5" />
                <span>الإجمالي العام للمصروفات (تلقائي):</span>
              </span>
              <input
                type="text"
                readOnly
                placeholder="0 ج.م"
                value={p4.expenses.total_expenses}
                className="w-32 bg-slate-800/90 border border-rose-500/50 rounded px-2.5 py-1 text-rose-300 text-left font-mono font-bold cursor-default"
                title="محسوب تلقائياً من مجموع بنود المصروفات"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Smart Budget Gap & Deficit Analysis Card */}
      <div
        className={`p-4 rounded-xl border transition-all ${
          budgetInfo.isDeficit
            ? "bg-rose-950/40 border-rose-600/60 text-rose-100"
            : budgetInfo.isSurplus
            ? "bg-emerald-950/40 border-emerald-600/60 text-emerald-100"
            : "bg-slate-900/60 border-slate-800 text-slate-300"
        }`}
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div
              className={`p-2 rounded-xl border mt-0.5 shrink-0 ${
                budgetInfo.isDeficit
                  ? "bg-rose-600/20 border-rose-500/40 text-rose-400"
                  : budgetInfo.isSurplus
                  ? "bg-emerald-600/20 border-emerald-500/40 text-emerald-400"
                  : "bg-slate-800 border-slate-700 text-slate-400"
              }`}
            >
              {budgetInfo.isDeficit ? (
                <TrendingDown className="w-5 h-5" />
              ) : budgetInfo.isSurplus ? (
                <CheckCircle2 className="w-5 h-5" />
              ) : (
                <Sparkles className="w-5 h-5" />
              )}
            </div>

            <div>
              <div className="flex items-center gap-2 font-bold text-sm">
                {budgetInfo.isDeficit ? (
                  <>
                    <span className="text-rose-300">عجز الميزانية الشهري للأسرة:</span>
                    <span className="text-base font-extrabold text-white bg-rose-600/70 px-2.5 py-0.5 rounded-lg border border-rose-400 font-mono">
                      {budgetInfo.deficitFormatted}
                    </span>
                  </>
                ) : budgetInfo.isSurplus ? (
                  <>
                    <span className="text-emerald-300">فائض الميزانية الشهرية:</span>
                    <span className="text-base font-extrabold text-white bg-emerald-600/70 px-2.5 py-0.5 rounded-lg border border-emerald-400 font-mono">
                      {budgetInfo.surplusFormatted}
                    </span>
                  </>
                ) : (
                  <span className="text-slate-200">تحليل الميزانية الشهرية التلقائي</span>
                )}
              </div>

              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                {budgetInfo.isDeficit
                  ? `إجمالي المصروفات (${formatCurrencyValue(budgetInfo.totalExpensesNum)}) أكبر من إجمالي الدخل (${formatCurrencyValue(budgetInfo.totalIncomeNum)}). تحتاج الأسرة لمساعدة شهرية لتغطية هذه الفجوة.`
                  : budgetInfo.isSurplus
                  ? `إجمالي الدخل (${formatCurrencyValue(budgetInfo.totalIncomeNum)}) يغطي بنود المصروفات المسجلة (${formatCurrencyValue(budgetInfo.totalExpensesNum)}).`
                  : "أدخل بنود الدخل والمصروفات بالجدولين أعلاه لاحتساب الفجوة والعجز تلقائياً."}
              </p>
            </div>
          </div>

          {budgetInfo.isDeficit && (
            <button
              type="button"
              onClick={() => {
                const deficitText = budgetInfo.deficitFormatted;
                const reasonText = `تغطية عجز الميزانية الشهري للأسرة بمقدار ${deficitText}.`;
                const updatedP5 = {
                  ...data.page5,
                  approved_amount: budgetInfo.deficitNum,
                  entry_reason: data.page5?.entry_reason
                    ? (data.page5.entry_reason.includes("عجز")
                        ? data.page5.entry_reason
                        : `${data.page5.entry_reason}\n• ${reasonText}`)
                    : reasonText
                };
                onChange({ page5: updatedP5 });
              }}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white font-bold text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer active:scale-95 shrink-0"
              title="ترحيل قيمة العجز كقيمة مقترحة للمساعدة الشهرية في الصفحة 5"
            >
              <Sparkles className="w-4 h-4" />
              <span>ترحيل العجز لقرار اللجنة (ص5)</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
