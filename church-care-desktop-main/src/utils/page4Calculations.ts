import { CaseStudyData } from "../types/schema";

/**
 * Parses numeric inputs safely, supporting:
 * - Direct numbers
 * - Strings with Latin digits (0-9)
 * - Strings with Eastern Arabic-Indic digits (٠-٩)
 * - Currency suffixes like "ج.م", commas, whitespace
 */
export function parseNumericValue(val: any): number {
  if (val === null || val === undefined) return 0;
  if (typeof val === "number") return isNaN(val) ? 0 : val;

  let str = String(val).trim();
  if (!str) return 0;

  // Convert Eastern Arabic numerals (٠-٩) to Western (0-9)
  const arabicDigits = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
  for (let i = 0; i < 10; i++) {
    str = str.split(arabicDigits[i]).join(String(i));
  }

  // Remove common currency markers, commas, or extra characters
  str = str.replace(/[^\d.-]/g, "");
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}

/**
 * Formats a sum number for display in total fields
 */
export function formatCurrencyValue(num: number): string {
  if (!num || num <= 0) return "";
  return `${Math.round(num)} ج.م`;
}

/**
 * Automatically recalculates all three tables on Page 4:
 * 1. Church Aid Total (`page4.total_church_aid`) and syncs to `page4.income.church_aid`
 * 2. Total Monthly Income (`page4.income.total_income`)
 * 3. Total Monthly Expenses (`page4.expenses.total_expenses`)
 */
export function recalculatePage4Totals(p4: CaseStudyData["page4"]): CaseStudyData["page4"] {
  if (!p4) return p4;

  const currentAid = Array.isArray(p4.church_aid) ? p4.church_aid : [];
  const currentIncome = p4.income ? { ...p4.income } : {
    church_aid: "",
    medical_aid: "",
    study_aid: "",
    base_salary: "",
    side_project: "",
    relatives_aid: "",
    total_income: ""
  };
  const currentExpenses = p4.expenses ? { ...p4.expenses } : {
    living_basics: "",
    utilities: "",
    phone: "",
    rent: "",
    medical: "",
    education: "",
    total_expenses: ""
  };

  // 1. Table 1: Church Aid Total
  const totalChurchAidNum = currentAid.reduce((acc, item) => {
    return acc + parseNumericValue(item?.value);
  }, 0);

  // Sync to church_aid in income table
  if (totalChurchAidNum > 0 || !currentIncome.church_aid) {
    currentIncome.church_aid = totalChurchAidNum > 0 ? String(totalChurchAidNum) : "";
  }

  // 2. Table 2: Total Monthly Income
  const incChurch = parseNumericValue(currentIncome.church_aid || totalChurchAidNum);
  const incMedical = parseNumericValue(currentIncome.medical_aid);
  const incStudy = parseNumericValue(currentIncome.study_aid);
  const incSalary = parseNumericValue(currentIncome.base_salary);
  const incProject = parseNumericValue(currentIncome.side_project);
  const incRelatives = parseNumericValue(currentIncome.relatives_aid);

  const totalIncomeNum = incChurch + incMedical + incStudy + incSalary + incProject + incRelatives;
  currentIncome.total_income = totalIncomeNum > 0 ? formatCurrencyValue(totalIncomeNum) : "";

  // 3. Table 3: Total Monthly Expenses
  const expLiving = parseNumericValue(currentExpenses.living_basics);
  const expUtilities = parseNumericValue(currentExpenses.utilities);
  const expPhone = parseNumericValue(currentExpenses.phone);
  const expRent = parseNumericValue(currentExpenses.rent);
  const expMedical = parseNumericValue(currentExpenses.medical);
  const expEducation = parseNumericValue(currentExpenses.education);

  const totalExpensesNum = expLiving + expUtilities + expPhone + expRent + expMedical + expEducation;
  currentExpenses.total_expenses = totalExpensesNum > 0 ? formatCurrencyValue(totalExpensesNum) : "";

  return {
    ...p4,
    church_aid: currentAid,
    total_church_aid: totalChurchAidNum > 0 ? totalChurchAidNum : "",
    income: currentIncome,
    expenses: currentExpenses
  };
}
