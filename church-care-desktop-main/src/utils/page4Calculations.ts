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
 * Field bindings for Middle Table (مصادر الدخل الأساسية / الإضافية) project items
 */
export const MIDDLE_TABLE_PROJECT_BINDINGS = [
  "الدخل الشهري - فرشة",
  "الدخل الشهري - تروسيكل",
  "الدخل الشهري - انابيب بوتوجاز",
  "الدخل الشهري - تاكسي",
  "الدخل الشهري - كشك",
  "الدخل الشهري - محل",
  "الدخل الشهري - تجارة",
  "الدخل الشهري - معاش",
  "الدخل الشهري - مكنة خياطة وتطريز",
  "الدخل الشهري - ثلاجة مشروبات",
  "الدخل الشهري - تربية طيور"
];

/**
 * Calculates the total sum of all micro-projects entered in the Middle Table of Page 4
 */
export function calculateMiddleTableProjectsSum(rootData: any): number {
  if (!rootData) return 0;
  return MIDDLE_TABLE_PROJECT_BINDINGS.reduce((sum, key) => {
    return sum + parseNumericValue(rootData[key]);
  }, 0);
}

/**
 * Retrieves the relatives aid amount from the Middle Table of Page 4
 */
export function calculateMiddleTableRelativesAid(rootData: any): number {
  if (!rootData) return 0;
  return parseNumericValue(rootData["الدخل الشهري - مساعدات احد الافراد"]);
}

/**
 * Calculates the combined base salary from Page 2 (Husband + Wife)
 */
export function calculatePage2Salaries(rootData: any): number {
  if (!rootData) return 0;
  const husbandSalary = parseNumericValue(rootData?.page2?.husband?.salary);
  const wifeSalary = parseNumericValue(rootData?.page2?.wife?.salary);
  return husbandSalary + wifeSalary;
}

export interface BudgetBalanceInfo {
  totalIncomeNum: number;
  totalExpensesNum: number;
  deficitNum: number;
  surplusNum: number;
  isDeficit: boolean;
  isSurplus: boolean;
  isBalanced: boolean;
  deficitFormatted: string;
  surplusFormatted: string;
}

/**
 * Calculates the Monthly Budget Balance / Deficit / Gap between Expenses and Income
 * - Deficit: Expenses > Income (Family needs assistance to bridge gap)
 * - Surplus: Income > Expenses
 */
export function calculateBudgetBalance(p4?: CaseStudyData["page4"] | null): BudgetBalanceInfo {
  if (!p4) {
    return {
      totalIncomeNum: 0,
      totalExpensesNum: 0,
      deficitNum: 0,
      surplusNum: 0,
      isDeficit: false,
      isSurplus: false,
      isBalanced: true,
      deficitFormatted: "",
      surplusFormatted: ""
    };
  }

  const inc = p4.income || ({} as any);
  const exp = p4.expenses || ({} as any);

  const incChurch = parseNumericValue(inc.church_aid || p4.total_church_aid);
  const incMedical = parseNumericValue(inc.medical_aid);
  const incStudy = parseNumericValue(inc.study_aid);
  const incSalary = parseNumericValue(inc.base_salary);
  const incProject = parseNumericValue(inc.side_project);
  const incRelatives = parseNumericValue(inc.relatives_aid);

  const totalIncomeNum = incChurch + incMedical + incStudy + incSalary + incProject + incRelatives;

  const expLiving = parseNumericValue(exp.living_basics);
  const expUtilities = parseNumericValue(exp.utilities);
  const expPhone = parseNumericValue(exp.phone);
  const expRent = parseNumericValue(exp.rent);
  const expMedical = parseNumericValue(exp.medical);
  const expEducation = parseNumericValue(exp.education);

  const totalExpensesNum = expLiving + expUtilities + expPhone + expRent + expMedical + expEducation;

  const diff = totalExpensesNum - totalIncomeNum;
  const isDeficit = diff > 0 && totalExpensesNum > 0;
  const isSurplus = diff < 0 && totalIncomeNum > 0;
  const isBalanced = diff === 0 || (totalIncomeNum === 0 && totalExpensesNum === 0);

  const deficitNum = isDeficit ? diff : 0;
  const surplusNum = isSurplus ? Math.abs(diff) : 0;

  return {
    totalIncomeNum,
    totalExpensesNum,
    deficitNum,
    surplusNum,
    isDeficit,
    isSurplus,
    isBalanced,
    deficitFormatted: formatCurrencyValue(deficitNum),
    surplusFormatted: formatCurrencyValue(surplusNum)
  };
}

/**
 * Automatically recalculates all three tables on Page 4:
 * 1. Church Aid Total (`page4.total_church_aid`) and syncs to `page4.income.church_aid`
 * 2. Point 1: Aggregates middle table projects into `page4.income.side_project`
 * 3. Point 1: Aggregates middle table relatives aid into `page4.income.relatives_aid`
 * 4. Point 2: Auto-syncs Page 2 salaries (Husband + Wife) into `page4.income.base_salary`
 * 5. Total Monthly Income (`page4.income.total_income`)
 * 6. Total Monthly Expenses (`page4.expenses.total_expenses`)
 */
export function recalculatePage4Totals(
  p4: CaseStudyData["page4"],
  rootData?: Partial<CaseStudyData>
): CaseStudyData["page4"] {
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

  // 2. Point 1: Auto-aggregate Middle Table Projects into side_project
  if (rootData) {
    const projectsSum = calculateMiddleTableProjectsSum(rootData);
    if (projectsSum > 0) {
      currentIncome.side_project = String(projectsSum);
    }

    const relativesAid = calculateMiddleTableRelativesAid(rootData);
    if (relativesAid > 0) {
      currentIncome.relatives_aid = String(relativesAid);
    }

    // 3. Point 2: Auto-sync Page 2 salaries into base_salary
    const page2Salaries = calculatePage2Salaries(rootData);
    if (page2Salaries > 0 && (!currentIncome.base_salary || parseNumericValue(currentIncome.base_salary) === 0)) {
      currentIncome.base_salary = String(page2Salaries);
    }
  }

  // 4. Table 2: Total Monthly Income
  const incChurch = parseNumericValue(currentIncome.church_aid || totalChurchAidNum);
  const incMedical = parseNumericValue(currentIncome.medical_aid);
  const incStudy = parseNumericValue(currentIncome.study_aid);
  const incSalary = parseNumericValue(currentIncome.base_salary);
  const incProject = parseNumericValue(currentIncome.side_project);
  const incRelatives = parseNumericValue(currentIncome.relatives_aid);

  const totalIncomeNum = incChurch + incMedical + incStudy + incSalary + incProject + incRelatives;
  currentIncome.total_income = totalIncomeNum > 0 ? formatCurrencyValue(totalIncomeNum) : "";

  // 5. Table 3: Total Monthly Expenses
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
