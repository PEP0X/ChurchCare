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

/**
 * Checks if the husband is considered absent or non-provider (متوفي، تارك المنزل، خارج الحظيرة، إلخ).
 * In all these cases, the wife legally and practically becomes the Head of Household.
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
 * Returns the Arabic human-readable label of the husband's status.
 */
export function getHusbandStatusLabel(husband?: CaseStudyData["page2"]["husband"] | null): string {
  if (!husband) return "";
  if (husband.status === "other" && husband.custom_status?.trim()) {
    return husband.custom_status.trim();
  }
  if (husband.status && HUSBAND_STATUS_LABELS[husband.status]) {
    return HUSBAND_STATUS_LABELS[husband.status];
  }
  const name = (husband.name || "").trim();
  if (name.includes("متوفي")) return "متوفي";
  if (name.includes("تارك")) return "تارك المنزل";
  if (name.includes("خارج الحظيرة") || name.includes("مرتد")) return "خارج الحظيرة";
  if (name.includes("منفصل") || name.includes("مطلق")) return "منفصل / طلاق";
  if (name.includes("سجين")) return "سجين / محبوس";
  if (name.includes("مسافر")) return "مسافر / غائب";

  return "متواجد (على قيد الحياة)";
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
 * Returns the effective Head of Household name (اسم رب الأسرة):
 * 1. If Husband is absent/deceased/abandoned/apostate:
 *    - Falls back primarily to Wife's name (الزوجة هي رب الأسرة).
 *    - If Wife's name is not yet entered, checks Page 6 family head (page6.family_head).
 *    - Otherwise returns husband name or empty string.
 * 2. If Husband is present:
 *    - Returns Husband's name.
 *    - If absent or empty, falls back to Wife's name.
 *    - If absent, falls back to Page 6 family head.
 */
export function getHeadOfHouseholdName(data?: Partial<CaseStudyData> | null): string {
  if (!data) return "";
  const husband = data.page2?.husband;
  const wifeName = data.page2?.wife?.name?.trim() || "";
  const husbandName = husband?.name?.trim() || "";

  // If husband is dead, abandoned, apostate, or absent -> Wife is Head of Household!
  if (isHusbandAbsent(husband)) {
    if (wifeName) return wifeName;
    if (data.page6?.family_head?.trim()) return data.page6.family_head.trim();
    return husbandName;
  }

  // Normal case: Husband is present
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
  const wifeName = data.page2?.wife?.name?.trim();
  const husbandName = husband?.name?.trim();

  if (isHusbandAbsent(husband)) {
    if (wifeName) return "wife";
    if (data.page6?.family_head?.trim()) return "manual";
    return husbandName ? "husband" : "none";
  }

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
} {
  const headName = getHeadOfHouseholdName(data);
  const source = getHeadOfHouseholdSource(data);
  const husband = data?.page2?.husband;
  const absent = isHusbandAbsent(husband);
  const statusLabel = getHusbandStatusLabel(husband);

  let reasonLabel = "اسم الزوج (الصفحة 2)";
  let isWifeLeading = false;

  if (source === "wife") {
    isWifeLeading = true;
    if (absent) {
      reasonLabel = `اسم الزوجة (الزوج: ${statusLabel})`;
    } else {
      reasonLabel = "اسم الزوجة (لعدم وجود زوج)";
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
    husbandStatusLabel: statusLabel
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
