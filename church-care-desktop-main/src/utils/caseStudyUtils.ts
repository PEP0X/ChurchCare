import { CaseStudyData } from "../types/schema";

/**
 * Returns the effective Head of Household name (اسم رب الأسرة):
 * 1. Checks Husband's name (اسم الزوج).
 * 2. If absent or empty, falls back to Wife's name (اسم الزوجة).
 * 3. If absent, falls back to Page 6 family head (page6.family_head).
 * 4. Otherwise returns empty string.
 */
export function getHeadOfHouseholdName(data?: Partial<CaseStudyData> | null): string {
  if (!data) return "";
  const husbandName = data.page2?.husband?.name?.trim();
  if (husbandName) return husbandName;

  const wifeName = data.page2?.wife?.name?.trim();
  if (wifeName) return wifeName;

  const familyHead = data.page6?.family_head?.trim();
  if (familyHead) return familyHead;

  return "";
}

/**
 * Returns the source type of the head of household:
 * - "husband": From husband name
 * - "wife": From wife name (when husband is absent)
 * - "manual": Explicitly entered in Page 6
 * - "none": Unspecified
 */
export function getHeadOfHouseholdSource(
  data?: Partial<CaseStudyData> | null
): "husband" | "wife" | "manual" | "none" {
  if (!data) return "none";
  if (data.page2?.husband?.name?.trim()) return "husband";
  if (data.page2?.wife?.name?.trim()) return "wife";
  if (data.page6?.family_head?.trim()) return "manual";
  return "none";
}

/**
 * Returns the human-readable case study title with study ID and linked head of household.
 * e.g. "دراسة حالة #784/2026 - مينا حنا الله جرجس"
 */
export function getCaseStudyDisplayName(data?: Partial<CaseStudyData> | null): string {
  const studyId = data?.page1?.church_study_id?.trim() || "784/2026";
  const headName = getHeadOfHouseholdName(data);
  return headName ? `دراسة حالة #${studyId} - ${headName}` : `دراسة حالة #${studyId}`;
}

/**
 * Formats a clean, safe filename for exporting or saving the case study.
 * Removes forbidden path characters (/ \ : * ? " < > |).
 */
export function getCaseStudyFileName(
  data: Partial<CaseStudyData> | null | undefined,
  ext: "pdf" | "care" | "json" = "pdf"
): string {
  const rawStudyId = data?.page1?.church_study_id?.trim() || "784-2026";
  const cleanStudyId = rawStudyId.replace(/[\/\\:*?"<>|]/g, "_");

  const headName = getHeadOfHouseholdName(data) || "حالة";
  const cleanHeadName = headName.replace(/[\/\\:*?"<>|]/g, "_");

  const prefix = ext === "pdf" ? "بحث_أخوة_الرب" : "بحث_اخوة_الرب";
  return `${prefix}_${cleanStudyId}_${cleanHeadName}.${ext}`;
}
