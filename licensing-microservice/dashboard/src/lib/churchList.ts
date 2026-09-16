import type { License } from './types';

/**
 * القائمة المعتمدة لكنائس الإيبارشية كقاعدة بيانات أولية
 */
export const DEFAULT_CHURCHES: string[] = [
  "كنيسة السيدة العذراء والرسولين بطرس وبولس المرج الجديدة",
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

export interface ParsedLicenseInfo {
  churchName: string;
  userName: string;
  extraNotes: string;
  deviceInfo: string;
}

/**
 * تحليل بيانات الترخيص لاستخراج اسم الكنيسة واسم المستخدم وبيانات الجهاز بدقة
 */
export function parseLicenseInfo(lic: License): ParsedLicenseInfo {
  const churchName = lic.client_name?.trim() || 'كنيسة عامة';
  const rawNotes = lic.notes?.trim() || '';

  let userName = '';
  let extraNotes = '';
  let deviceInfo = '';

  if (rawNotes.includes('| Activated on ')) {
    const parts = rawNotes.split('| Activated on ');
    const beforePart = parts[0].trim();
    deviceInfo = 'Activated on ' + parts[1].trim();

    if (beforePart.startsWith('Activated on ')) {
      deviceInfo = beforePart;
      userName = '—';
    } else if (beforePart) {
      if (beforePart.includes(' - ')) {
        const sub = beforePart.split(' - ');
        userName = sub[0].trim();
        extraNotes = sub.slice(1).join(' - ').trim();
      } else {
        userName = beforePart;
      }
    } else {
      userName = '—';
    }
  } else if (rawNotes.startsWith('Activated on ')) {
    deviceInfo = rawNotes;
    userName = '—';
  } else if (rawNotes) {
    if (rawNotes.includes(' - ')) {
      const sub = rawNotes.split(' - ');
      userName = sub[0].trim();
      extraNotes = sub.slice(1).join(' - ').trim();
    } else {
      userName = rawNotes;
    }
  } else {
    userName = '—';
  }

  return {
    churchName,
    userName: userName || '—',
    extraNotes,
    deviceInfo
  };
}

/**
 * دمج كنائس النظام والتراخيص الحالية مع إزالة التكرار
 */
export function getUniqueChurches(licenses: License[]): string[] {
  const churchSet = new Set<string>();

  // 1. إضافة الكنائس الافتراضية
  for (const c of DEFAULT_CHURCHES) {
    if (c.trim()) churchSet.add(c.trim());
  }

  // 2. إضافة أي كنائس مسجلة في قاعدة البيانات
  if (Array.isArray(licenses)) {
    for (const lic of licenses) {
      if (lic.client_name && lic.client_name.trim()) {
        churchSet.add(lic.client_name.trim());
      }
    }
  }

  return Array.from(churchSet).sort((a, b) => a.localeCompare(b, 'ar'));
}

/**
 * استخراج الكنائس المسجلة فعلياً مع عدد السيريالات لكل كنيسة
 */
export function getRegisteredChurchesStats(licenses: License[]): { church: string; count: number }[] {
  const map = new Map<string, number>();
  if (Array.isArray(licenses)) {
    for (const lic of licenses) {
      const name = lic.client_name?.trim() || 'كنيسة عامة';
      map.set(name, (map.get(name) || 0) + 1);
    }
  }

  return Array.from(map.entries())
    .map(([church, count]) => ({ church, count }))
    .sort((a, b) => b.count - a.count);
}

/**
 * تصدير جدول التراخيص إلى ملف Sheet (CSV) يدعم الحروف العربية في Excel
 */
export function exportLicensesToCsv(licenses: License[]) {
  if (!Array.isArray(licenses) || licenses.length === 0) {
    alert('لا توجد بيانات تراخيص لتصديرها.');
    return;
  }

  const headers = [
    'السيريال (Serial Key)',
    'اسم الكنيسة (Church Name)',
    'اسم المستخدم / المسؤول (User Name)',
    'الحالة (Status)',
    'بصمة العتاد (HWID)',
    'تاريخ التفعيل (Activated At)',
    'تاريخ الإنشاء (Created At)',
    'ملاحظات وبيانات إضافية (Notes)'
  ];

  const rows = licenses.map(lic => {
    const info = parseLicenseInfo(lic);
    const statusText = lic.status === 'active' ? 'مفعّل' : lic.status === 'revoked' ? 'ملغي' : 'غير مفعّل';
    const hwidText = lic.hwid || 'غير مرتبط بجهاز';
    const activatedAtText = lic.activated_at ? new Date(lic.activated_at).toLocaleString('ar-EG') : '—';
    const createdAtText = lic.created_at ? new Date(lic.created_at).toLocaleString('ar-EG') : '—';
    const notesText = [info.extraNotes, info.deviceInfo].filter(Boolean).join(' | ') || (lic.notes || '—');

    return [
      `"${lic.serial_key}"`,
      `"${info.churchName.replace(/"/g, '""')}"`,
      `"${info.userName.replace(/"/g, '""')}"`,
      `"${statusText}"`,
      `"${hwidText}"`,
      `"${activatedAtText}"`,
      `"${createdAtText}"`,
      `"${notesText.replace(/"/g, '""')}"`
    ].join(',');
  });

  // UTF-8 BOM (\uFEFF) لضمان قراءة Excel للحروف العربية بدقة
  const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  const dateStr = new Date().toISOString().slice(0, 10);
  link.setAttribute('download', `ChurchCare_Licensing_Sheet_${dateStr}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
