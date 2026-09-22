import { CaseStudyData, HusbandStatus } from "../types/schema";

export const HUSBAND_STATUS_LABELS: Record<HusbandStatus, string> = {
  present: "متواجد (على قيد الحياة)",
  deceased: "متوفي",
  abandoned: "تارك المنزل",
  apostate: "خارج الحظيرة",
  separated: "منفصل / طلاق",
  traveler: "مسافر / غائب",
  prisoner: "سجين / محبوس",
  other: "أخرى"
};

export const WIFE_STATUS_LABELS: Record<HusbandStatus, string> = {
  present: "متواجدة (على قيد الحياة)",
  deceased: "متوفية",
  abandoned: "تاركة المنزل",
  apostate: "خارج الحظيرة",
  separated: "منفصلة / طلاق",
  traveler: "مسافرة / غائبة",
  prisoner: "سجينة / محبوسة",
  other: "أخرى"
};

/**
 * Checks if the husband is considered absent or non-provider (متوفي، تارك المنزل، خارج الحظيرة، إلخ).
 * In all these cases, the wife legally and practically becomes the Head of Household if she is present.
 */
export function isHusbandAbsent(husband?: CaseStudyData["page2"]["husband"] | null): boolean {
  if (!husband) return false;
  if (husband.status && husband.status !== "present") {
    return true;
  }
  // Check legacy text keywords in husband name if status is not explicitly set
  const name = (husband.name || "").trim().toLowerCase();
  if (
    name.includes("متوفي") ||
    name.includes("المرحوم") ||
    name.includes("تارك المنزل") ||
    name.includes("خارج الحظيرة") ||
    name.includes("مرتد") ||
    name.includes("منفصل") ||
    name.includes("مطلق") ||
    name.includes("سجين")
  ) {
    return true;
  }
  return false;
}

/**
 * Checks if the wife is considered absent, deceased, or non-provider (متوفية، تاركة المنزل، إلخ).
 */
export function isWifeAbsent(wife?: CaseStudyData["page2"]["wife"] | null): boolean {
  if (!wife) return false;
  if (wife.status && wife.status !== "present") {
    return true;
  }
  const name = (wife.name || "").trim().toLowerCase();
  if (
    name.includes("متوفي") ||
    name.includes("متوفية") ||
    name.includes("المرحومة") ||
    name.includes("تاركة المنزل") ||
    name.includes("تارك المنزل") ||
    name.includes("خارج الحظيرة") ||
    name.includes("مرتدة") ||
    name.includes("منفصلة") ||
    name.includes("مطلقة") ||
    name.includes("سجينة")
  ) {
    return true;
  }
  return false;
}

/**
 * Returns the Arabic human-readable label of the husband's status.
 */
export function getHusbandStatusLabel(husband?: CaseStudyData["page2"]["husband"] | null): string {
  if (!husband) return "";
  const name = (husband.name || "").trim();

  if (husband.status === "other" && husband.custom_status?.trim()) {
    return husband.custom_status.trim();
  }

  // If status is explicitly set to an absent status, return its label
  if (husband.status && husband.status !== "present" && HUSBAND_STATUS_LABELS[husband.status]) {
    return HUSBAND_STATUS_LABELS[husband.status];
  }

  // If name contains absent keywords, that takes priority over default "present"
  if (name.includes("متوفي") || name.includes("المرحوم")) return "متوفي";
  if (name.includes("تارك")) return "تارك المنزل";
  if (name.includes("خارج الحظيرة") || name.includes("مرتد")) return "خارج الحظيرة";
  if (name.includes("منفصل") || name.includes("مطلق")) return "منفصل / طلاق";
  if (name.includes("سجين")) return "سجين / محبوس";
  if (name.includes("مسافر")) return "مسافر / غائب";

  if (husband.status === "present") {
    return HUSBAND_STATUS_LABELS.present;
  }

  return "متواجد (على قيد الحياة)";
}

/**
 * Returns the Arabic human-readable label of the wife's status.
 */
export function getWifeStatusLabel(wife?: CaseStudyData["page2"]["wife"] | null): string {
  if (!wife) return "";
  const name = (wife.name || "").trim();

  if (wife.status === "other" && wife.custom_status?.trim()) {
    return wife.custom_status.trim();
  }

  // If status is explicitly set to an absent status, return its label
  if (wife.status && wife.status !== "present" && WIFE_STATUS_LABELS[wife.status]) {
    return WIFE_STATUS_LABELS[wife.status];
  }

  // If name contains absent keywords, that takes priority over default "present"
  if (name.includes("متوفية") || name.includes("متوفي") || name.includes("المرحومة")) return "متوفية";
  if (name.includes("تارك")) return "تاركة المنزل";
  if (name.includes("خارج الحظيرة") || name.includes("مرتد")) return "خارج الحظيرة";
  if (name.includes("منفصل") || name.includes("مطلق")) return "منفصلة / طلاق";
  if (name.includes("سجين")) return "سجينة / محبوسة";
  if (name.includes("مسافر")) return "مسافرة / غائبة";

  if (wife.status === "present") {
    return WIFE_STATUS_LABELS.present;
  }

  return "متواجدة (على قيد الحياة)";
}

/**
 * Formats the husband's name for visual canvas or PDF printouts.
 * If status is not present, prints the name with status appended e.g. "سمير جرجس (متوفي)"
 * Or if no name is entered, prints the status itself e.g. "متوفي" or "تارك المنزل".
 */
export function getEffectiveHusbandDisplayName(husband?: CaseStudyData["page2"]["husband"] | null): string {
  if (!husband) return "";
  const rawName = (husband.name || "").trim();
  const absent = isHusbandAbsent(husband);

  if (!absent) {
    return rawName;
  }

  const statusLabel = getHusbandStatusLabel(husband);
  if (!rawName) {
    return statusLabel;
  }

  // If status is already mentioned in raw name, don't duplicate it
  if (rawName.includes(statusLabel) || rawName.includes("متوفي") || rawName.includes("المرحوم")) {
    return rawName;
  }

  return `${rawName} (${statusLabel})`;
}

/**
 * Formats the wife's name for visual canvas or PDF printouts.
 * If status is not present, prints the name with status appended e.g. "مريم فؤاد (متوفية)"
 * Or if no name is entered, prints the status itself e.g. "متوفية" or "تاركة المنزل".
 */
export function getEffectiveWifeDisplayName(wife?: CaseStudyData["page2"]["wife"] | null): string {
  if (!wife) return "";
  const rawName = (wife.name || "").trim();
  const absent = isWifeAbsent(wife);

  if (!absent) {
    return rawName;
  }

  const statusLabel = getWifeStatusLabel(wife);
  if (!rawName) {
    return statusLabel;
  }

  // If status is already mentioned in raw name, don't duplicate it
  if (rawName.includes(statusLabel) || rawName.includes("متوفي") || rawName.includes("متوفية") || rawName.includes("المرحومة")) {
    return rawName;
  }

  return `${rawName} (${statusLabel})`;
}

/**
 * Returns the effective Head of Household name (اسم رب الأسرة):
 * 1. If Husband is absent/deceased and Wife is present:
 *    - Wife is Head of Household.
 * 2. If Wife is absent/deceased and Husband is present:
 *    - Husband is Head of Household.
 * 3. If Husband is present:
 *    - Returns Husband's name.
 * 4. If Husband is empty or absent, falls back to Wife's name.
 * 5. Otherwise falls back to Page 6 family head.
 */
export function getHeadOfHouseholdName(data?: Partial<CaseStudyData> | null): string {
  if (!data) return "";
  const husband = data.page2?.husband;
  const wife = data.page2?.wife;
  const wifeName = wife?.name?.trim() || "";
  const husbandName = husband?.name?.trim() || "";

  const husbandDead = isHusbandAbsent(husband);
  const wifeDead = isWifeAbsent(wife);

  // If husband is absent/dead and wife is present -> Wife is Head of Household!
  if (husbandDead && !wifeDead && wifeName) {
    return wifeName;
  }

  // If wife is dead/absent and husband is alive/present -> Husband is Head of Household!
  if (wifeDead && !husbandDead && husbandName) {
    return husbandName;
  }

  // If husband is present and has name
  if (!husbandDead && husbandName) {
    return husbandName;
  }

  // If wife is present and has name
  if (!wifeDead && wifeName) {
    return wifeName;
  }

  // Fallback to whichever spouse has a name entered
  if (husbandName) return husbandName;
  if (wifeName) return wifeName;
  if (data.page6?.family_head?.trim()) return data.page6.family_head.trim();

  return "";
}

/**
 * Returns the source type and reason of the head of household:
 * - "husband": From husband name
 * - "wife": From wife name (because husband is absent or deceased or abandoned or empty)
 * - "manual": Explicitly entered in Page 6
 * - "none": Unspecified
 */
export function getHeadOfHouseholdSource(
  data?: Partial<CaseStudyData> | null
): "husband" | "wife" | "manual" | "none" {
  if (!data) return "none";
  const husband = data.page2?.husband;
  const wife = data.page2?.wife;
  const wifeName = wife?.name?.trim();
  const husbandName = husband?.name?.trim();

  const husbandDead = isHusbandAbsent(husband);
  const wifeDead = isWifeAbsent(wife);

  if (husbandDead && !wifeDead) {
    if (wifeName) return "wife";
    if (data.page6?.family_head?.trim()) return "manual";
    return husbandName ? "husband" : "none";
  }

  if (!husbandDead && husbandName) return "husband";
  if (!wifeDead && wifeName) return "wife";
  if (husbandName) return "husband";
  if (wifeName) return "wife";
  if (data.page6?.family_head?.trim()) return "manual";
  return "none";
}

/**
 * Returns rich contextual information about why the head of household is chosen.
 * Useful for UI badges and tooltips across Page 1, Page 2, and Page 6.
 */
export function getHeadOfHouseholdInfo(data?: Partial<CaseStudyData> | null): {
  headName: string;
  source: "husband" | "wife" | "manual" | "none";
  reasonLabel: string;
  isWifeLeading: boolean;
  husbandStatusLabel: string;
  wifeStatusLabel: string;
} {
  const headName = getHeadOfHouseholdName(data);
  const source = getHeadOfHouseholdSource(data);
  const husband = data?.page2?.husband;
  const wife = data?.page2?.wife;
  const hAbsent = isHusbandAbsent(husband);
  const wAbsent = isWifeAbsent(wife);
  const hStatusLabel = getHusbandStatusLabel(husband);
  const wStatusLabel = getWifeStatusLabel(wife);

  let reasonLabel = "اسم الزوج (الصفحة 2)";
  let isWifeLeading = false;

  if (source === "wife") {
    isWifeLeading = true;
    if (hAbsent) {
      reasonLabel = `اسم الزوجة (الزوج: ${hStatusLabel})`;
    } else {
      reasonLabel = "اسم الزوجة (لعدم وجود زوج)";
    }
  } else if (source === "husband") {
    if (wAbsent) {
      reasonLabel = `اسم الزوج (الزوجة: ${wStatusLabel})`;
    } else {
      reasonLabel = "اسم الزوج (الصفحة 2)";
    }
  } else if (source === "manual") {
    reasonLabel = "مسجل يدوياً بالصفحة 6";
  } else if (source === "none") {
    reasonLabel = "يرتبط تلقائياً من الصفحة 2";
  }

  return {
    headName,
    source,
    reasonLabel,
    isWifeLeading,
    husbandStatusLabel: hStatusLabel,
    wifeStatusLabel: wStatusLabel
  };
}

/**
 * Returns the human-readable case study title with study ID and linked head of household.
 * e.g. "دراسة حالة #784/2026 - مينا حنا الله جرجس"
 */
export function getCaseStudyDisplayName(data?: Partial<CaseStudyData> | null): string {
  const studyId = data?.page1?.church_study_id?.trim();
  const headName = getHeadOfHouseholdName(data);
  if (studyId && headName) return `دراسة حالة #${studyId} - ${headName}`;
  if (studyId) return `دراسة حالة #${studyId}`;
  if (headName) return `دراسة حالة - ${headName}`;
  return "دراسة حالة جديدة";
}

/**
 * Formats a clean, safe filename for exporting or saving the case study.
 * Removes forbidden path characters (/ \ : * ? " < > |).
 */
export function getCaseStudyFileName(
  data: Partial<CaseStudyData> | null | undefined,
  ext: "pdf" | "care" | "json" = "pdf"
): string {
  const rawStudyId = data?.page1?.church_study_id?.trim();
  const headName = getHeadOfHouseholdName(data);
  const cleanStudyId = rawStudyId ? rawStudyId.replace(/[\/\\:*?"<>|]/g, "_") : "";
  const cleanHeadName = headName ? headName.replace(/[\/\\:*?"<>|]/g, "_") : "";

  const prefix = ext === "pdf" ? "بحث_أخوة_الرب" : "بحث_اخوة_الرب";
  const parts = [prefix, cleanStudyId, cleanHeadName].filter(Boolean);
  return `${parts.join("_")}.${ext}`;
}
