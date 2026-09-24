import { CaseStudyData } from "../types/schema";
import { isHusbandAbsent } from "./caseStudyUtils";

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
 * Field bindings for Middle Table (مصادر الدخل الأساسية / الإضافية) micro-project items
 */
export const MIDDLE_TABLE_PROJECT_BINDINGS = [
  "الدخل الشهري - فرشة",
  "الدخل الشهري - تروسيكل",
  "الدخل الشهري - انابيب بوتوجاز",
  "الدخل الشهري - تاكسي",
  "الدخل الشهري - كشك",
  "الدخل الشهري - محل",
  "الدخل الشهري - تجارة",
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
 * Retrieves the pension amount from the Middle Table of Page 4
 */
export function calculateMiddleTablePension(rootData: any): number {
  if (!rootData) return 0;
  return parseNumericValue(
    rootData["الدخل الشهري - معاش"] ??
    rootData?.page4?.pension ??
    rootData?.page4?.income?.pension
  );
}

/**
 * Retrieves the relatives aid amount from the Middle Table of Page 4
 */
export function calculateMiddleTableRelativesAid(rootData: any): number {
  if (!rootData) return 0;
  return parseNumericValue(rootData["الدخل الشهري - مساعدات احد الافراد"]);
}

/**
 * Calculates husband salary from Page 2
 */
export function calculateHusbandSalary(rootData: any): number {
  if (!rootData) return 0;
  return parseNumericValue(rootData?.page2?.husband?.salary);
}

/**
 * Calculates wife salary from Page 2
 */
export function calculateWifeSalary(rootData: any): number {
  if (!rootData) return 0;
  return parseNumericValue(rootData?.page2?.wife?.salary);
}

/**
 * Calculates the combined base salary from Page 2 (Husband + Wife)
 */
export function calculatePage2Salaries(rootData: any): number {
  if (!rootData) return 0;
  return calculateHusbandSalary(rootData) + calculateWifeSalary(rootData);
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
 * 2. Husband salary -> `page4.income.base_salary` (المرتب الأساسي)
 *    (or Wife salary if husband is deceased/absent)
 * 3. Wife salary + Middle table micro-projects -> `page4.income.side_project` (المصدر الإضافي الأول)
 * 4. Middle table relatives aid + pension -> `page4.income.relatives_aid` (المصدر الإضافي الثاني)
 * 5. Instant zeroing/clearing when any source field is erased (prevents stuck leftover digits like "2")
 * 6. Total Monthly Income (`page4.income.total_income`)
 * 7. Total Monthly Expenses (`page4.expenses.total_expenses`)
 *
 * @param p4 Current Page 4 data
 * @param rootData Optional root case study data for cross-page values
 * @param triggeredBinding Optional field binding that triggered the calculation (allows manual override on Page 4)
 */
export function recalculatePage4Totals(
  p4: CaseStudyData["page4"],
  rootData?: Partial<CaseStudyData>,
  triggeredBinding?: string
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

  // Sync to church_aid in income table (unless user is currently editing church_aid directly)
  if (triggeredBinding !== "page4.income.church_aid") {
    currentIncome.church_aid = totalChurchAidNum > 0 ? String(totalChurchAidNum) : "";
  }

  // 2. Cross-Page Salary and Middle Table Synchronization
  if (rootData) {
    const husbandSalary = calculateHusbandSalary(rootData);
    const wifeSalary = calculateWifeSalary(rootData);
    const pensionVal = calculateMiddleTablePension(rootData);
    const relativesAid = calculateMiddleTableRelativesAid(rootData);
    const microProjectsSum = calculateMiddleTableProjectsSum(rootData);
    const husbandAbsent = isHusbandAbsent(rootData?.page2?.husband);

    // 1) المرتب الأساسي (base_salary):
    // مرتب الزوج
    const primarySalary = husbandAbsent && husbandSalary === 0 ? 0 : husbandSalary;

    if (triggeredBinding !== "page4.income.base_salary") {
      const hasBaseSources = Boolean(rootData?.page2?.husband && "salary" in rootData.page2.husband);

      if (primarySalary > 0) {
        currentIncome.base_salary = String(primarySalary);
      } else if (hasBaseSources) {
        currentIncome.base_salary = "";
      }
    }

    // 2) المصدر الإضافي الأول (side_project):
    // مشروعات الجدول الأوسط + المعاش ("المعاش يتضاف في المصدر الاضافي الاول")
    if (triggeredBinding !== "page4.income.side_project") {
      const combinedProjectsAndPension = microProjectsSum + pensionVal;
      const hasSideSources =
        MIDDLE_TABLE_PROJECT_BINDINGS.some((key) => key in rootData) ||
        "الدخل الشهري - معاش" in rootData ||
        Boolean(rootData?.page4?.pension) ||
        Boolean(rootData?.page4?.income?.pension);

      if (combinedProjectsAndPension > 0) {
        currentIncome.side_project = String(combinedProjectsAndPension);
      } else if (hasSideSources) {
        currentIncome.side_project = "";
      }
    }

    // 3) المصدر الإضافي الثاني (relatives_aid):
    // مرتب الزوجة + مساعدات أحد الأفراد
    if (triggeredBinding !== "page4.income.relatives_aid") {
      const combinedRelatives = wifeSalary + relativesAid;

      const hasRelativesSource =
        Boolean(rootData?.page2?.wife && "salary" in rootData.page2.wife) ||
        "الدخل الشهري - مساعدات احد الافراد" in rootData;

      if (combinedRelatives > 0) {
        currentIncome.relatives_aid = String(combinedRelatives);
      } else if (hasRelativesSource) {
        currentIncome.relatives_aid = "";
      }
    }
  }

  // 3. Table 2: Total Monthly Income
  const incChurch = parseNumericValue(currentIncome.church_aid || totalChurchAidNum);
  const incMedical = parseNumericValue(currentIncome.medical_aid);
  const incStudy = parseNumericValue(currentIncome.study_aid);
  const incSalary = parseNumericValue(currentIncome.base_salary);
  const incProject = parseNumericValue(currentIncome.side_project);
  const incRelatives = parseNumericValue(currentIncome.relatives_aid);

  const totalIncomeNum = incChurch + incMedical + incStudy + incSalary + incProject + incRelatives;
  currentIncome.total_income = totalIncomeNum > 0 ? formatCurrencyValue(totalIncomeNum) : "";

  // 4. Table 3: Total Monthly Expenses
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
