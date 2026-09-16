/**
 * Church Licensing Utility
 * 
 * Rules:
 * 1. If the license is issued to a name starting with "كنيسة" (e.g. "كنيسة مارمينا",
 *    "كنيسة الشهيد العظيم مارجرجس"):
 *    - The church name is LOCKED across the entire system.
 *    - Page 1 dropdown is locked to this church and cannot be changed.
 *    - Extra pages (ID cards, birth certificates, etc.) and PDF exports automatically
 *      bear this church name.
 * 2. If the license is issued to any name NOT starting with "كنيسة" (e.g. "مطرانية شبين القناطر",
 *    "إيبارشية بنها", "Admin", or a developer name):
 *    - The church selection remains completely free and unlocked, allowing the user
 *      to select any church from the diocese list.
 */

/**
 * Determines whether a client name qualifies as a church-locked license.
 */
export function isChurchNameLocked(clientName?: string | null): boolean {
  if (!clientName) return false;
  const trimmed = clientName.trim();
  // Check if it starts with "كنيسة" followed by space or at end of string
  return /^كنيسة(\s|$)/u.test(trimmed);
}

/**
 * Returns the locked church name if the license is bound to a church, or null if flexible.
 */
export function getLockedChurchName(clientName?: string | null): string | null {
  if (!isChurchNameLocked(clientName)) return null;
  return clientName!.trim();
}

/**
 * Standard list of diocesan churches for fallback or general licenses
 */
export const DIOCESAN_CHURCHES: string[] = [
  "كنيسة السيدة العذراء والقديس يوسف النجار - الخصوص",
  "كنيسة السيدة العذراء والرسولين بطرس وبولس - الخصوص",
  "كنيسة البابا أثناسيوس الرسول والانبا بيشوى - الخصوص",
  "كنيسة السيدة العذراء والقديس ابي سيفين - الخصوص",
  "كنيسة الانبا كاراس والانبا ابرام - الخصوص",
  "كنيسة السيدة العذراء والشهيد العظيم أبانوب - الخصوص",
  "كنيسة السيدة العذراء والانبا موسي - الخصوص",
  "كنيسة السيدة العذراء والملاك ميخائيل - الخصوص",
  "كنيسة الشهيد العظيم مارمينا والبابا كيرلس السادس - الخصوص",
  "كنيسة الشهيد العظيم مارجرجس والبابا ديسقوروس - الخصوص",
  "كنيسة السيدة العذراء والقديس ماريوحنا الحبيب - الخصوص",
  "مذبح الاميرين تادرس- ارض عيشة - الخصوص",
  "كنيسة الشهيد العظيم مارجرجس - قها",
  "كنيسة الشهيد العظيم مارجرجس - طوخ",
  "كنيسة القديسة الشهيدة دميانه - ميت كنانة",
  "كنيسة الشهيد العظيم مارجرجس - بلتان",
  "كنيسة الشهيد العظيم مارمينا العجايبى - ساحل دجوى",
  "كنيسة السيدة العذراء والقديس العظيم ابي سيفين - دجوى",
  "كنيسة رئيس الملائكة الجليل ميخائيل - القلزم",
  "كنيسة السيدة العذراء والقديس مارمرقس الرسول - كفر شبين",
  "كنيسة الشهيد العظيم مارجرجس - منيه شبين",
  "كنيسة البابا كيرلس السادس - الحصافة",
  "كنيسة رئيس الملائكة الجليل ميخائيل - القشيش",
  "كنيسة السيدة العذراء والقديس ابي سيفين - السلمانية",
  "كنيسة الشهيد العظيم مارجرجس والانبا كاراس - نوى",
  "كنيسة السيدة العذراء - مساكن ابو زعبل",
  "كنيسة الشهيد العظيم مارجرجس - ابو زعبل",
  "كنيسة السيدة العذراء ورئيس الملائكة الجليل ميخائيل - العكرشة",
  "كنيسة السيدة العذراء والبابا بطرس خاتم الشهداء - الخانكة",
  "كنيسة الشهيد العظيم مارمينا والبابا كيرلس السادس - الجبل الاصفر",
  "كنيسة السيدة العذراء والقديس ابانوب - القلج",
  "كنيسة الشهيد العظيم ابي سيفين والقديسة دميانة - القلج",
  "كنيسة السيدة العذراء والامير تادرس - القلج",
  "كنيسة السيدة العذراء والانبا بيشوى - المنية"
];
