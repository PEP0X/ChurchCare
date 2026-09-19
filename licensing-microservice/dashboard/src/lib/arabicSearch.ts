/**
 * محرك البحث والتطبيع الذكي للنصوص العربية (Arabic Search Normalization)
 * يدعم إزالة التشكيل، وتوحيد الألف والياء والتاء المربوطة،
 * والبحث متعدد الكلمات المستقل عن الترتيب (Multi-token Order-agnostic Match).
 */

/**
 * إزالة التشكيل والتطويل وتوحيد الحروف العربية المتشابهة
 */
export function normalizeArabic(text: string | null | undefined): string {
  if (!text) return '';

  return (
    text
      // 1. تحويل الحروف الإنجليزية إلى lowercase
      .toLowerCase()
      // 2. إزالة التشكيل بالكامل (فتحة، ضمة، كسرة، تنوين، شدة، سكون، ألف خنجرية)
      .replace(/[\u064B-\u065F\u0670]/g, '')
      // 3. إزالة التطويل (الكشيدة)
      .replace(/\u0640/g, '')
      // 4. توحيد جميع أشكال الألف (أ، إ، آ، ٱ) إلى ألف مجردة (ا)
      .replace(/[أإآٱ]/g, 'ا')
      // 5. توحيد الألف المقصورة (ى) والياء إلى ي
      .replace(/[ى]/g, 'ي')
      // 6. توحيد التاء المربوطة (ة) والهاء إلى هـ لضمان مطابقة الكلمات بغض النظر عن كتابتها
      .replace(/[ة]/g, 'ه')
      // 7. توحيد همزات الياء والواو
      .replace(/[ئ]/g, 'ي')
      .replace(/[ؤ]/g, 'و')
      // 8. تحويل الفواصل والشُرط إلى مسافات لتسهيل تقسيم الكلمات
      .replace(/[-_–—/,،؛.:\\]/g, ' ')
      // 9. دمج المسافات المتكررة وحذف المسافات الطرفية
      .replace(/\s+/g, ' ')
      .trim()
  );
}

/**
 * معالجة بدائل الأسماء الكنسية الشائعة لتسهيل العثور على الكنائس
 * (مثال: مارجرجس / مار جرجس، ابوسيفين / ابي سيفين)
 */
function expandVariants(token: string): string[] {
  const variants = [token];

  // مارجرجس <-> مار جرجس
  if (token === 'مارجرجس') variants.push('مار جرجس');
  else if (token === 'مار جرجس') variants.push('مارجرجس');

  // ابوسيفين <-> ابي سيفين <-> ابا سيفين
  if (token.startsWith('ابو') || token.startsWith('ابي') || token.startsWith('ابا')) {
    const rest = token.replace(/^(ابو|ابي|ابا)\s*/, '');
    variants.push('ابو ' + rest, 'ابي ' + rest, 'ابا ' + rest, 'ابوسيفين');
  }

  // الانبا <-> انبا
  if (token.startsWith('الانبا')) {
    variants.push(token.replace(/^الانبا/, 'انبا'));
  } else if (token.startsWith('انبا')) {
    variants.push('ال' + token);
  }

  // أبانوب <-> ابانوب
  if (token === 'ابانوب' || token === 'أبانوب') {
    variants.push('ابانوب', 'ابانوب');
  }

  return variants;
}

/**
 * التحقق مما إذا كان النص الهدف يحتوي على جميع كلمات البحث بغض النظر عن ترتيبها
 * ومراعاة إزالة "الـ" التعريفية إذا لزم الأمر
 */
export function arabicSearchMatch(
  target: string | null | undefined,
  searchQuery: string | null | undefined
): boolean {
  if (!searchQuery || !searchQuery.trim()) return true;
  if (!target || !target.trim()) return false;

  const normalizedTarget = normalizeArabic(target);
  const normalizedQuery = normalizeArabic(searchQuery);

  if (!normalizedQuery) return true;

  // تقسيم جملة البحث إلى كلمات مستقلة
  const tokens = normalizedQuery.split(' ').filter(Boolean);
  if (tokens.length === 0) return true;

  // يجب أن تتطابق كل كلمة من كلمات البحث في النص الهدف
  return tokens.every((rawToken) => {
    // 1. فحص الكلمة المباشرة
    if (normalizedTarget.includes(rawToken)) return true;

    // 2. فحص المتغيرات الشائعة (مار جرجس، إلخ)
    const variants = expandVariants(rawToken);
    for (const v of variants) {
      if (normalizedTarget.includes(v)) return true;
    }

    // 3. فحص إزالة "الـ" التعريف إذا كانت الكلمة تبدأ بـ "ال"
    if (rawToken.startsWith('ال') && rawToken.length > 3) {
      const withoutAl = rawToken.slice(2);
      if (normalizedTarget.includes(withoutAl)) return true;
    }

    // 4. فحص إضافة "الـ" إذا لم تكن موجودة
    if (!rawToken.startsWith('ال') && rawToken.length >= 3) {
      const withAl = 'ال' + rawToken;
      if (normalizedTarget.includes(withAl)) return true;
    }

    return false;
  });
}
