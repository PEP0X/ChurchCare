/**
 * التحقق من أرقام الهواتف المحمولة في جمهورية مصر العربية وتنسيقها
 * الشبكات: 010 (Vodafone), 011 (Etisalat), 012 (Orange), 015 (WE)
 */

export interface PhoneValidationResult {
  isValid: boolean;
  normalized: string;
  carrier?: string;
  error?: string;
}

export function validateEgyptPhone(rawPhone: string | null | undefined): PhoneValidationResult {
  if (!rawPhone || !rawPhone.trim()) {
    return {
      isValid: false,
      normalized: '',
      error: 'يرجى إدخال رقم هاتف الخادم'
    };
  }

  // إزالة أي مسافات، أقواس، أو شُرط
  let cleaned = rawPhone.replace(/[\s\-_()]/g, '').trim();

  // تحويل الأرقام العربية الهندية (٠١٢٣٤٥٦٧٨٩) إلى أرقام لاتينية إن وجدت
  cleaned = cleaned.replace(/[٠-٩]/g, (d) => (d.charCodeAt(0) - 1632).toString());

  // إزالة كود الدولة (+20 أو 0020 أو 20)
  if (cleaned.startsWith('+20')) {
    cleaned = cleaned.slice(3);
  } else if (cleaned.startsWith('0020')) {
    cleaned = cleaned.slice(4);
  } else if (cleaned.startsWith('20') && cleaned.length === 12) {
    cleaned = cleaned.slice(2);
  }

  // إذا كان الرقم 10 أرقام ويبدأ بـ 10 أو 11 أو 12 أو 15، نضيف الصفر في البداية
  if (cleaned.length === 10 && /^[1][0125]/.test(cleaned)) {
    cleaned = '0' + cleaned;
  }

  // التحقق من الصيغة القياسية: 11 رقماً تبدأ بـ 010 أو 011 أو 012 أو 015
  const regex = /^01[0125]\d{8}$/;

  if (!regex.test(cleaned)) {
    if (cleaned.length < 11) {
      return {
        isValid: false,
        normalized: cleaned,
        error: `رقم الهاتف غير مكتمل (${cleaned.length} من 11 رقماً). يجب أن يبدأ بـ 010 أو 011 أو 012 أو 015`
      };
    } else if (cleaned.length > 11) {
      return {
        isValid: false,
        normalized: cleaned,
        error: `رقم الهاتف أطول من اللازم (${cleaned.length} رقماً). أرقام مصر تتكون من 11 رقماً فقط`
      };
    } else {
      return {
        isValid: false,
        normalized: cleaned,
        error: 'كود الشبكة غير صحيح. يجب أن يبدأ بـ 010 (فودافون)، 011 (اتصالات)، 012 (أورنج)، أو 015 (وي)'
      };
    }
  }

  // تحديد اسم الشبكة
  let carrier = '';
  if (cleaned.startsWith('010')) carrier = 'فودافون (Vodafone)';
  else if (cleaned.startsWith('011')) carrier = 'اتصالات (e&)';
  else if (cleaned.startsWith('012')) carrier = 'أورنج (Orange)';
  else if (cleaned.startsWith('015')) carrier = 'وي (WE)';

  return {
    isValid: true,
    normalized: cleaned,
    carrier
  };
}
