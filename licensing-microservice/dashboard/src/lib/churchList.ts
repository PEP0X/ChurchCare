import type { License, ChurchServiceItem } from './types';

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

/**
 * الخدمات الكنسية المدعومة في نظام ChurchCare
 */
export const CHURCH_SERVICES: ChurchServiceItem[] = [
  {
    id: 'visitation',
    name: 'خدمة الافتقاد ورعاية الأسر',
    icon: '🏠',
    description: 'متابعة بيانات المخدومين وافتقاد المنازل وتدوين الزيارات والاحتياجات',
    badgeClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
  },
  {
    id: 'sundayschool',
    name: 'مدارس الأحد والتربية الكنسية',
    icon: '📖',
    description: 'تسجيل الحضور والغياب، المناهج، مسابقات وحفظ آيات الفصول',
    badgeClass: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30'
  },
  {
    id: 'idcards',
    name: 'استخراج الكارنيهات والبيانات',
    icon: '🪪',
    description: 'تصميم وطباعة كارنيهات العضوية الذكية بتقنية الباركود وQR Code',
    badgeClass: 'bg-sky-500/15 text-sky-300 border-sky-500/30'
  },
  {
    id: 'deacons',
    name: 'الشمامسة والألحان والطقوس',
    icon: '⛪',
    description: 'رتب الشمامسة وحضور القداسات والمناسبات الكنسية والمواليد',
    badgeClass: 'bg-amber-500/15 text-amber-300 border-amber-500/30'
  },
  {
    id: 'treasury',
    name: 'الخزينة والاشتراكات والتبرعات',
    icon: '💰',
    description: 'إيصالات التبرع، الصناديق الشهرية، وإدارة السندات والعهدة',
    badgeClass: 'bg-purple-500/15 text-purple-300 border-purple-500/30'
  },
  {
    id: 'youth',
    name: 'اجتماعات الشباب وإعداد الخدام',
    icon: '🌟',
    description: 'متابعة الأسر الجامعية، كورسات إعداد الخدام، والمؤتمرات',
    badgeClass: 'bg-rose-500/15 text-rose-300 border-rose-500/30'
  },
  {
    id: 'scouts',
    name: 'الكشافة والمرشدات والأنشطة',
    icon: '🏕️',
    description: 'سجلات الفرق الكشفية والتدريبات والمخيمات الصيفية والبطولات',
    badgeClass: 'bg-teal-500/15 text-teal-300 border-teal-500/30'
  },
  {
    id: 'secretariat',
    name: 'أمانة الخدمة والسكرتارية العامة',
    icon: '📋',
    description: 'إدارة شاملة، إصدار الخطابات الرسمية، تصاريح ومواعيد الكنيسة',
    badgeClass: 'bg-blue-500/15 text-blue-300 border-blue-500/30'
  }
];

export interface ParsedLicenseInfo {
  churchName: string;
  userName: string;
  role: string;
  phone: string;
  services: string[];
  extraNotes: string;
  deviceInfo: string;
}

/**
 * تحليل بيانات الترخيص لاستخراج اسم الكنيسة واسم الخادم والدور ورقم الهاتف والخدمات بدقة
 */
export function parseLicenseInfo(lic: License): ParsedLicenseInfo {
  const churchName = lic.client_name?.trim() || 'كنيسة عامة';
  let rawNotes = lic.notes?.trim() || '';

  let userName = '';
  let role = '';
  let phone = '';
  let extraNotes = '';
  let deviceInfo = '';
  const services: string[] = [];

  // 1. استخراج قسم الخدمات [خدمات: ...]
  const servicesMatch = rawNotes.match(/\[خدمات:\s*([^\]]+)\]/i) || rawNotes.match(/\[services:\s*([^\]]+)\]/i);
  if (servicesMatch) {
    const servicesStr = servicesMatch[1];
    servicesStr.split(/[,،]/).map(s => s.trim()).filter(Boolean).forEach(s => {
      if (!services.includes(s)) services.push(s);
    });
    rawNotes = rawNotes.replace(servicesMatch[0], '').trim();
  }

  // 2. استخراج الدور [الدور: ...]
  const roleMatch = rawNotes.match(/\[الدور:\s*([^\]]+)\]/i);
  if (roleMatch) {
    role = roleMatch[1].trim();
    rawNotes = rawNotes.replace(roleMatch[0], '').trim();
  }

  // 3. استخراج الهاتف [هاتف: ...]
  const phoneMatch = rawNotes.match(/\[هاتف:\s*([^\]]+)\]/i);
  if (phoneMatch) {
    phone = phoneMatch[1].trim();
    rawNotes = rawNotes.replace(phoneMatch[0], '').trim();
  }

  // 4. معالجة معلومات الجهاز
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

  // فحص إضافي للدور أو الهاتف في extraNotes إن لم يكونا محددين بـ tags
  if (!role) {
    if (extraNotes.includes('كاهن')) role = 'كاهن';
    else if (extraNotes.includes('أمين خدمة') || extraNotes.includes('امين خدمة')) role = 'أمين خدمة';
    else if (extraNotes.includes('Data Entry') || extraNotes.includes('مدخل بيانات')) role = 'مدخل بيانات';
  }

  if (!phone) {
    const phoneInNotes = (extraNotes || rawNotes).match(/01[0125]\d{8}/);
    if (phoneInNotes) {
      phone = phoneInNotes[0];
    }
  }

  return {
    churchName,
    userName: userName || '—',
    role,
    phone,
    services,
    extraNotes: extraNotes.replace(/^\|\s*|\s*\|$/g, '').trim(),
    deviceInfo
  };
}

/**
 * دمج كنائس النظام والتراخيص الحالية مع إزالة التكرار
 */
export function getUniqueChurches(licenses: License[]): string[] {
  const churchSet = new Set<string>();

  for (const c of DEFAULT_CHURCHES) {
    if (c.trim()) churchSet.add(c.trim());
  }

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
    'اسم الخادم / المسؤول (Servant Name)',
    'الدور / الوظيفة (Role)',
    'رقم الهاتف (Phone)',
    'الخدمات المشمولة (Services)',
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
    const servicesText = info.services.length > 0 ? info.services.join(' ، ') : 'شامل عام';
    const notesText = [info.extraNotes, info.deviceInfo].filter(Boolean).join(' | ') || (lic.notes || '—');

    return [
      `"${lic.serial_key}"`,
      `"${info.churchName.replace(/"/g, '""')}"`,
      `"${info.userName.replace(/"/g, '""')}"`,
      `"${(info.role || '—').replace(/"/g, '""')}"`,
      `"${(info.phone || '—').replace(/"/g, '""')}"`,
      `"${servicesText.replace(/"/g, '""')}"`,
      `"${statusText}"`,
      `"${hwidText}"`,
      `"${activatedAtText}"`,
      `"${createdAtText}"`,
      `"${notesText.replace(/"/g, '""')}"`
    ].join(',');
  });

  // UTF-8 BOM (\uFEFF)
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
