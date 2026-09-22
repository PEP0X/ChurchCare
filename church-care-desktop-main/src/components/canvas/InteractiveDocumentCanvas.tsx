import React, { useRef } from 'react';
import { CaseStudyData } from '../../types/schema';
import { parseEgyptianNationalId } from '../../hooks/useNationalId';
import { DocumentLayout, FieldConfig } from '../../types/layout';
import { DEFAULT_DOCUMENT_LAYOUT } from '../../config/defaultDocumentLayout';
import { getTemplatePageImage } from '../../utils/templateImages';
import { recalculatePage4Totals, calculatePage2Salaries } from '../../utils/page4Calculations';
import {
  Upload,
  Edit3,
  Trash2,
  CreditCard,
  FileSpreadsheet,
  CopyPlus,
  RotateCw,
  ChevronDown,
  Check,
  AlertCircle
} from 'lucide-react';
import {
  getHeadOfHouseholdName,
  getEffectiveHusbandDisplayName,
  isHusbandAbsent,
  getHusbandStatusLabel,
  getEffectiveWifeDisplayName,
  isWifeAbsent,
  getWifeStatusLabel
} from '../../utils/caseStudyUtils';

interface InteractiveDocumentCanvasProps {
  page: number;
  data: CaseStudyData;
  onChange: (updated: Partial<CaseStudyData>) => void;
  onOpenCropper?: (binding: string, title: string, mode?: "id_card" | "certificate" | "free") => void;
  onOpenHusbandCropper?: () => void;
  onOpenWifeCropper?: () => void;
  onDeletePage?: (extraPageIndex: number) => void;
  scale: number;
  layout?: DocumentLayout;
  highlightedFieldId?: string | null;
  lockedChurchName?: string | null;
}

const BINDING_ALIASES: Record<string, string[]> = {
  "page6.head_name": ["page6.family_head", "page2.husband.name", "page2.wife.name"],
  "page6.family_head": ["page6.head_name", "page2.husband.name", "page2.wife.name"],
  "page6.church_id": ["page6.church_records_id", "page1.church_study_id"],
  "page6.church_records_id": ["page6.church_id", "page1.church_study_id"],
  "page6.care_id": ["page6.cathedral_care_id", "page1.cathedral_care_id"],
  "page6.cathedral_care_id": ["page6.care_id", "page1.cathedral_care_id"],
  "page6.member_id": ["page6.church_membership_id", "page1.church_membership_id"],
  "page6.church_membership_id": ["page6.member_id", "page1.church_membership_id"],
  "page5.other_notes": ["page5.notes"],
  "page5.notes": ["page5.other_notes"],
  "page4.total_church_aid": ["page4.church_aid.Total", "page4.church_aid_total"],
  "page4.church_aid.Total": ["page4.total_church_aid", "page4.church_aid_total"],
  "page4.church_aid_total": ["page4.total_church_aid", "page4.church_aid.Total"],
  "page4.church_aid_total_notes": ["page4.church_aid.purpose"],
  "page4.church_aid.purpose": ["page4.church_aid_total_notes"],
  "الدخل الشهري - معاش": ["page4.income.pension", "page4.pension"],
  "page4.income.pension": ["الدخل الشهري - معاش", "page4.pension"],
  "page4.pension": ["الدخل الشهري - معاش", "page4.income.pension"],
  "page3.family_members_notes": ["Page3.comment1"],
  "Page3.comment1": ["page3.family_members_notes"],
  "page3.other_members_notes": ["Page3.comment2"],
  "Page3.comment2": ["page3.other_members_notes"],
  "page3.medical_conditions.continuous_treatment": ["Page3.medicine", "page3.medicine"],
  "Page3.medicine": ["page3.medical_conditions.continuous_treatment", "page3.medicine"],
  "page2.gov_programs.has_ration_card": ["custom.select_6228"],
  "custom.select_6228": ["page2.gov_programs.has_ration_card"],
  "page2.housing_type": ["Page2.live", "page2.address.housing_type"],
  "Page2.live": ["page2.housing_type", "page2.address.housing_type"],
  "page2.emergency_contacts[0].name": ["Page2.name1"],
  "Page2.name1": ["page2.emergency_contacts[0].name"],
  "page2.emergency_contacts[0].phone": ["Page2.number1"],
  "Page2.number1": ["page2.emergency_contacts[0].phone"],
  "page2.emergency_contacts[1].name": ["Page2.name2"],
  "Page2.name2": ["page2.emergency_contacts[1].name"],
  "page2.emergency_contacts[1].phone": ["Page2.number2"],
  "Page2.number2": ["page2.emergency_contacts[1].phone"],
  "page2.emergency_contacts[2].name": ["Page2.name3"],
  "Page2.name3": ["page2.emergency_contacts[2].name"],
  "page2.emergency_contacts[2].phone": ["Page2.number3"],
  "Page2.number3": ["page2.emergency_contacts[2].phone"],
  "page2.emergency_contacts[3].name": ["Page2.name4"],
  "Page2.name4": ["page2.emergency_contacts[3].name"],
  "page2.emergency_contacts[3].phone": ["Page2.number4"],
  "Page2.number4": ["page2.emergency_contacts[3].phone"],
  "page2.address.housing_notes": ["page2.address.notes"],
  "page2.address.notes": ["page2.address.housing_notes"],
  "page1.church_name": ["Page1.churchName"],
  "husband_id_image": ["page1.husband_id_image"],
  "page1.husband_id_image": ["husband_id_image"],
  "husband_id_back_image": ["page1.husband_id_back_image"],
  "page1.husband_id_back_image": ["husband_id_back_image"],
  "wife_id_image": ["page1.wife_id_image"],
  "page1.wife_id_image": ["wife_id_image"],
  "wife_id_back_image": ["page1.wife_id_back_image"],
  "page1.wife_id_back_image": ["wife_id_back_image"]
};

// Utility: Retrieve value by path like "page2.husband.name" or "page3.family_members[0].name"
function getValueByPath(obj: any, path: string): any {
  if (!path || !obj) return '';

  // Direct root key check (e.g. Arabic strings like "الدخل الشهري - معاش" or image bindings)
  if (obj[path] !== undefined && obj[path] !== '') return obj[path];

  // Specific Page 4 pension fallback check
  if (path === 'الدخل الشهري - معاش' || path === 'page4.income.pension' || path === 'page4.pension') {
    if (obj['الدخل الشهري - معاش'] !== undefined && obj['الدخل الشهري - معاش'] !== '') return obj['الدخل الشهري - معاش'];
    if (obj?.page4?.income?.pension !== undefined && obj?.page4?.income?.pension !== '') return obj.page4.income.pension;
    if (obj?.page4?.pension !== undefined && obj?.page4?.pension !== '') return obj.page4.pension;
  }

  const getRaw = (target: any, p: string) => {
    const parts = p.replace(/\[(\w+)\]/g, '.$1').split('.');
    let current = target;
    for (const part of parts) {
      if (current == null) return '';
      current = current[part];
    }
    return current ?? '';
  };

  // Special intelligent handling for family head in page 6
  if (path === 'page6.family_head' || path === 'page6.head_name') {
    const rawHead = getRaw(obj, 'page6.family_head') || getRaw(obj, 'page6.head_name');
    if (rawHead) return rawHead;
    const computedHead = getHeadOfHouseholdName(obj);
    if (computedHead) return computedHead;
  }

  const directVal = getRaw(obj, path);
  if (directVal !== '' && directVal !== undefined) return directVal;

  // Check aliases
  const alts = BINDING_ALIASES[path];
  if (alts) {
    for (const alt of alts) {
      const altVal = getRaw(obj, alt);
      if (altVal !== '' && altVal !== undefined) return altVal;
    }
  }

  // Check Date decomposition
  if (path === 'page1.day' || path === 'page1.month' || path === 'page1.year') {
    const studyDate = String(obj?.page1?.study_date || '').trim();
    if (studyDate) {
      const parts = studyDate.replace(/-/g, '/').split('/');
      if (parts.length === 3) {
        const [p0, p1, p2] = parts;
        const [y, m, d] = p0.length === 4 ? [p0, p1, p2] : [p2, p1, p0];
        if (path === 'page1.day') return d;
        if (path === 'page1.month') return m;
        if (path === 'page1.year') return y;
      }
    }
  }

  if (path.startsWith('page6.from_date_')) {
    const fromDate = String(obj?.page6?.from_date || '').trim();
    if (fromDate) {
      const parts = fromDate.replace(/-/g, '/').split('/');
      if (parts.length === 3) {
        const [p0, p1, p2] = parts;
        const [y, m, d] = p0.length === 4 ? [p0, p1, p2] : [p2, p1, p0];
        if (path === 'page6.from_date_day') return d;
        if (path === 'page6.from_date_month') return m;
        if (path === 'page6.from_date_year') return y;
      }
    }
  }

  if (path.startsWith('page6.to_date_')) {
    const toDate = String(obj?.page6?.to_date || '').trim();
    if (toDate) {
      const parts = toDate.replace(/-/g, '/').split('/');
      if (parts.length === 3) {
        const [p0, p1, p2] = parts;
        const [y, m, d] = p0.length === 4 ? [p0, p1, p2] : [p2, p1, p0];
        if (path === 'page6.to_date_day') return d;
        if (path === 'page6.to_date_month') return m;
        if (path === 'page6.to_date_year') return y;
      }
    }
  }

  // Page 3 other members alias (checks other_persons, family_other_members, and other_members)
  const otherMemMatch = path.match(/page3\.(?:family_other_members|other_members)\[(\d+)\]\.(.*)/);
  if (otherMemMatch) {
    const idx = parseInt(otherMemMatch[1], 10);
    const subKey = otherMemMatch[2];

    // Check direct array first
    const fom = obj?.page3?.family_other_members?.[idx];
    if (fom && fom[subKey] !== undefined && fom[subKey] !== '') return fom[subKey];

    const om = obj?.page3?.other_members?.[idx];
    if (om && om[subKey] !== undefined && om[subKey] !== '') return om[subKey];

    const otherPersons = obj?.page3?.other_persons || [];
    for (const tryIdx of [idx - 1, idx]) {
      if (tryIdx >= 0 && tryIdx < otherPersons.length) {
        const item = otherPersons[tryIdx];
        if (subKey === 'name') return item.name || '';
        if (subKey === 'national_id' || subKey === 'nid') return item.national_id || '';
        if (subKey === 'relavent' || subKey === 'kinship') return item.kinship || item.relavent || '';
        if (subKey === 'Status' || subKey === 'social_status') return item.social_status || item.Status || '';
        if (subKey === 'sYear' || subKey === 'education_job') return item.education_job || item.sYear || '';
        if (subKey === 'income') return item.income || '';
        if (subKey === 'confession_father') return item.confession_father || '';
      }
    }
  }

  return '';
}

/**
 * High-performance immutable nested setting using structural sharing.
 * Avoids cloning huge base64 images on every keystroke, reducing update time from 80ms to <0.05ms!
 */
function setDeepValueImmutable(target: any, parts: string[], idx: number, value: any): any {
  if (idx >= parts.length) return value;
  const key = parts[idx];
  const isNextIndex = idx + 1 < parts.length && /^\d+$/.test(parts[idx + 1]);

  let currentSub = target != null ? target[key] : undefined;
  if (currentSub == null || typeof currentSub !== 'object') {
    currentSub = isNextIndex ? [] : {};
  }

  const updatedSub = setDeepValueImmutable(currentSub, parts, idx + 1, value);

  if (Array.isArray(target)) {
    const copy = [...target];
    const num = parseInt(key, 10);
    copy[num] = updatedSub;
    return copy;
  } else {
    return {
      ...(target || {}),
      [key]: updatedSub
    };
  }
}

// Utility: Set value by path safely returning an updated clone and updating aliases
function setValueByPath(obj: any, path: string, value: any): any {
  const parts = path.replace(/\[/g, '.').replace(/\]/g, '').split('.').filter(Boolean);
  let newObj = setDeepValueImmutable(obj || {}, parts, 0, value);

  // Special Page 3 other members bidirectional sync
  const otherMemMatch = path.match(/page3\.(?:family_other_members|other_members)\[(\d+)\]\.(.*)/);
  if (otherMemMatch) {
    const rowIdx = parseInt(otherMemMatch[1], 10); // 1-indexed: 1, 2, 3, 4
    const subKey = otherMemMatch[2];
    const arrayIdx = rowIdx - 1; // 0-indexed: 0, 1, 2, 3

    let mappedProp = subKey;
    if (subKey === 'relavent') mappedProp = 'kinship';
    if (subKey === 'Status') mappedProp = 'social_status';
    if (subKey === 'sYear') mappedProp = 'education_job';

    // Update in other_persons
    newObj = setDeepValueImmutable(newObj, ['page3', 'other_persons', String(arrayIdx), mappedProp], 0, value);
    if (!newObj?.page3?.other_persons?.[arrayIdx]?.id) {
      newObj = setDeepValueImmutable(newObj, ['page3', 'other_persons', String(arrayIdx), 'id'], 0, String(rowIdx));
    }
    // Also mirror to both family_other_members and other_members
    newObj = setDeepValueImmutable(newObj, ['page3', 'family_other_members', String(rowIdx), subKey], 0, value);
    newObj = setDeepValueImmutable(newObj, ['page3', 'other_members', String(rowIdx), subKey], 0, value);
  }

  // Special Page 4 Pension sync
  if (path === 'الدخل الشهري - معاش') {
    newObj = setDeepValueImmutable(newObj, ['page4', 'income', 'pension'], 0, value);
    newObj = setDeepValueImmutable(newObj, ['page4', 'pension'], 0, value);
  }

  // Synchronize aliases so forms and canvas stay in lockstep
  const alts = BINDING_ALIASES[path];
  if (alts) {
    for (const alt of alts) {
      const altParts = alt.replace(/\[/g, '.').replace(/\]/g, '').split('.').filter(Boolean);
      newObj = setDeepValueImmutable(newObj, altParts, 0, value);
    }
  }

  return newObj;
}

// =========================================================================
// PIXEL-PERFECT SMART AUTO-FIT FONT SIZING ENGINE
// Optimized specifically for "IBM Plex Sans Arabic" font metrics:
// - Ascender: +1.025, Descender: -0.4 (Total span: 1.425)
// - Sub-millisecond Canvas 2D text measurement (Zero DOM reflow thrashing)
// =========================================================================

let measureCanvas: HTMLCanvasElement | null = null;
let measureCtx: CanvasRenderingContext2D | null = null;

function measureTextWidth(
  text: string,
  fontSize: number,
  isBold: boolean = false,
  isMono: boolean = false
): number {
  if (!text) return 0;
  if (!measureCanvas) {
    measureCanvas = document.createElement('canvas');
    measureCtx = measureCanvas.getContext('2d');
  }
  if (!measureCtx) return text.length * fontSize * 0.58;

  const weight = isBold ? '700' : '500';
  const fontFam = isMono
    ? 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace'
    : '"IBM Plex Sans Arabic", -apple-system, BlinkMacSystemFont, sans-serif';
  measureCtx.font = `${weight} ${fontSize}px ${fontFam}`;
  return measureCtx.measureText(text).width;
}

function calculatePixelPerfectFontSize(
  text: string,
  boxWidthPx: number,
  boxHeightPx: number,
  isBold: boolean = false,
  isMono: boolean = false,
  minFontSize: number = 8.5,
  maxCapFontSize: number = 28.0
): number {
  // 1. Symmetrical vertical height constraint:
  const innerHeight = Math.max(6, boxHeightPx - 3.5);
  const maxVert = Math.min(maxCapFontSize, Math.max(minFontSize, innerHeight / 1.4));

  // If empty or whitespace, return maxVert for prominent placeholder/cursor sizing
  if (!text || text.trim().length === 0) {
    return Math.round(maxVert * 10) / 10;
  }

  // 2. Horizontal width constraint:
  // Subtract borders (2x2px = 4px) + padding (2x4px = 8px) + breathing buffer (4px) = 16px total
  const availWidth = Math.max(10, boxWidthPx - 16);

  // 3. Sub-millisecond shaped text measurement:
  // Monospace digits (National ID / numbers) have an exact width ratio of 0.602
  let refWidth = 0;
  if (isMono && /^\d+$/.test(text)) {
    refWidth = text.length * 16 * 0.605;
  } else {
    refWidth = measureTextWidth(text, 16, isBold, isMono);
  }
  if (refWidth <= 0) return Math.round(maxVert * 10) / 10;

  // 4. Exact font size that fits availWidth (0.94 safety factor for subpixel rendering)
  const maxHoriz = (availWidth / refWidth) * 16 * 0.94;

  // 5. Smart ideal font size:
  // Short text: maxHoriz >> maxVert -> fills vertical box height boldly!
  // Long text: maxHoriz < maxVert -> scales down smoothly to prevent overflow!
  const ideal = Math.min(maxVert, maxHoriz);

  // 6. Never make text "too small": clamp to min legible size
  const finalSize = Math.max(minFontSize, ideal);

  return Math.round(finalSize * 10) / 10;
}

const AutoFitTextInput: React.FC<{
  id?: string;
  title?: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  type?: string;
  maxLength?: number;
  readOnly?: boolean;
  className?: string;
  style?: React.CSSProperties;
  fontSizePreference?: number | 'auto';
  boxWidthPct: number;
  boxHeightPct: number;
  isBold?: boolean;
  isMono?: boolean;
}> = ({
  id,
  title,
  value,
  onChange,
  placeholder,
  type = 'text',
  maxLength,
  readOnly = false,
  className,
  style,
  fontSizePreference = 'auto',
  boxWidthPct,
  boxHeightPct,
  isBold = false,
  isMono = false
}) => {
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Exact pixel dimensions on 820x1160 standard document canvas
  const boxWidthPx = (boxWidthPct / 100) * 820;
  const boxHeightPx = (boxHeightPct / 100) * 1160;

  // Calculate ideal font size directly and deterministically
  const appliedFontSize = React.useMemo(() => {
    if (typeof fontSizePreference === 'number' && fontSizePreference > 0) {
      // Ensure the preferred font size fits the container box width without horizontal overflow
      const maxHoriz = calculatePixelPerfectFontSize(
        value,
        boxWidthPx,
        boxHeightPx,
        isBold,
        isMono,
        10.0,
        fontSizePreference
      );
      return Math.min(fontSizePreference, maxHoriz);
    }
    return calculatePixelPerfectFontSize(
      value,
      boxWidthPx,
      boxHeightPx,
      isBold,
      isMono,
      8.5,
      28.0
    );
  }, [value, boxWidthPx, boxHeightPx, isBold, isMono, fontSizePreference]);

  return (
    <input
      id={id}
      title={title}
      ref={inputRef}
      type={type}
      readOnly={readOnly}
      maxLength={maxLength}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`${className || ''} transition-[font-size,border-color,background-color] duration-150 ease-out`}
      style={{
        ...style,
        fontSize: `${appliedFontSize}px`,
        boxSizing: 'border-box',
        lineHeight: 'normal',
        overflow: 'hidden',
        whiteSpace: 'nowrap'
      }}
    />
  );
};

// =========================================================================
// AUTO-FIT TEXTAREA
// Starts at comfortable paragraph size and smoothly steps down as lines expand
// =========================================================================
const AutoFitTextarea: React.FC<{
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
  style?: React.CSSProperties;
  fontSizePreference?: number | 'auto';
  boxWidthPct: number;
  boxHeightPct: number;
}> = ({
  value,
  onChange,
  placeholder,
  className,
  style,
  fontSizePreference = 'auto',
  boxWidthPct,
  boxHeightPct
}) => {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const boxHeightPx = (boxHeightPct / 100) * 1160;

  // Comfortable paragraph starting font size: 12.5px - 16px
  const idealStartSize = Math.max(12, Math.min(16, Math.round(Math.sqrt(boxHeightPx) * 1.55)));
  const [fontSize, setFontSize] = React.useState<number>(
    typeof fontSizePreference === 'number' && fontSizePreference > 0
      ? fontSizePreference
      : idealStartSize
  );

  React.useLayoutEffect(() => {
    if (typeof fontSizePreference === 'number' && fontSizePreference > 0) {
      setFontSize(fontSizePreference);
      return;
    }
    if (!textareaRef.current) return;
    const el = textareaRef.current;

    let current = idealStartSize;
    el.style.fontSize = `${current}px`;

    if (value && value.trim().length > 0) {
      while (
        (el.scrollHeight > el.clientHeight || el.scrollWidth > el.clientWidth) &&
        current > 8.5
      ) {
        current = +(current - 0.5).toFixed(1);
        el.style.fontSize = `${current}px`;
      }
    }
    setFontSize(current);
  }, [value, idealStartSize, fontSizePreference]);

  return (
    <textarea
      ref={textareaRef}
      rows={3}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`${className || ''} transition-[font-size] duration-150 ease-out`}
      style={{
        ...style,
        fontSize: `${fontSize}px`,
        lineHeight: 1.35,
        boxSizing: 'border-box',
        resize: 'none'
      }}
    />
  );
};

export const InteractiveDocumentCanvas: React.FC<InteractiveDocumentCanvasProps> = ({
  page,
  data,
  onChange,
  onOpenCropper,
  onOpenHusbandCropper,
  onOpenWifeCropper,
  onDeletePage,
  scale,
  layout = DEFAULT_DOCUMENT_LAYOUT,
  highlightedFieldId = null,
  lockedChurchName = null
}) => {
  const getPageImage = (p: number) => getTemplatePageImage(p);
  const [husbandMenuOpen, setHusbandMenuOpen] = React.useState<boolean>(false);
  const [wifeMenuOpen, setWifeMenuOpen] = React.useState<boolean>(false);

  // Automatically scroll into view and focus highlighted erroneous field
  React.useEffect(() => {
    if (highlightedFieldId) {
      const timer = setTimeout(() => {
        const el = document.getElementById(`field-input-${highlightedFieldId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.focus();
        }
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [highlightedFieldId, page]);

  const handleFieldChange = (binding: string, val: any) => {
    // If church name is locked, prevent modifying page1.church_name
    if (lockedChurchName && (binding === 'page1.church_name' || binding === 'Page1.churchName')) {
      return;
    }
    let updated = setValueByPath(data, binding, val);

    // Intelligent auto-sync between Spouse Status and Name
    if (binding === 'page2.husband.name') {
      const nameStr = String(val || '').trim();
      if (nameStr.includes('متوفي') || nameStr.includes('المرحوم')) {
        if (updated.page2?.husband?.status !== 'deceased') {
          updated = setValueByPath(updated, 'page2.husband.status', 'deceased');
        }
      }
    } else if (binding === 'page2.wife.name') {
      const nameStr = String(val || '').trim();
      if (nameStr.includes('متوفية') || nameStr.includes('متوفي') || nameStr.includes('المرحومة')) {
        if (updated.page2?.wife?.status !== 'deceased') {
          updated = setValueByPath(updated, 'page2.wife.status', 'deceased');
        }
      }
    } else if (binding === 'page2.husband.status') {
      if (val === 'deceased') {
        const currentName = String(data.page2?.husband?.name || '').trim();
        if (!currentName) {
          updated = setValueByPath(updated, 'page2.husband.name', 'متوفي');
        }
      } else if (val === 'present') {
        const currentName = String(data.page2?.husband?.name || '').trim();
        if (currentName === 'متوفي') {
          updated = setValueByPath(updated, 'page2.husband.name', '');
        }
      }
    } else if (binding === 'page2.wife.status') {
      if (val === 'deceased') {
        const currentName = String(data.page2?.wife?.name || '').trim();
        if (!currentName) {
          updated = setValueByPath(updated, 'page2.wife.name', 'متوفية');
        }
      } else if (val === 'present') {
        const currentName = String(data.page2?.wife?.name || '').trim();
        if (currentName === 'متوفية' || currentName === 'متوفي') {
          updated = setValueByPath(updated, 'page2.wife.name', '');
        }
      }
    }

    const isPage4Related =
      binding.startsWith('page4') ||
      binding.startsWith('الدخل الشهري') ||
      binding.includes('salary');

    if (isPage4Related && updated.page4) {
      updated = {
        ...updated,
        page4: recalculatePage4Totals(updated.page4, updated)
      };
    }
    onChange(updated);
  };

  const handleImageFileSelect = (slotIdx: number, file: File, extraPageIndex: number) => {
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          const currentExtras = [...(data.extra_pages || [])];
          const targetPage = currentExtras[extraPageIndex];
          if (targetPage && (targetPage.type === 'id_cards' || targetPage.type === 'birth_certs')) {
            const newImages = [...targetPage.images];
            newImages[slotIdx] = ev.target.result as string;
            currentExtras[extraPageIndex] = {
              ...targetPage,
              images: newImages
            } as any;
            onChange({ extra_pages: currentExtras });
          }
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const isSlotPickingRef = useRef<boolean>(false);

  const handleSlotPickImage = async (slotIdx: number, extraPageIndex: number) => {
    if (isSlotPickingRef.current) return;
    isSlotPickingRef.current = true;

    try {
      const isTauri =
        typeof window !== "undefined" &&
        ("__TAURI_INTERNALS__" in window || "__TAURI__" in window);

      if (isTauri) {
        try {
          const { open } = await import("@tauri-apps/plugin-dialog");
          const { invoke } = await import("@tauri-apps/api/core");

          const selected = await open({
            multiple: false,
            filters: [
              {
                name: "Images",
                extensions: ["png", "jpg", "jpeg", "webp", "bmp"]
              }
            ]
          });

          if (!selected) return;

          const filePath = typeof selected === "string" ? selected : (selected as any).path;
          if (!filePath) return;

          const dataUrl = await invoke<string>("read_image_data_url", { path: filePath });
          if (dataUrl) {
            const currentExtras = [...(data.extra_pages || [])];
            const targetPage = currentExtras[extraPageIndex];
            if (targetPage && (targetPage.type === 'id_cards' || targetPage.type === 'birth_certs')) {
              const newImages = [...targetPage.images];
              newImages[slotIdx] = dataUrl;
              currentExtras[extraPageIndex] = {
                ...targetPage,
                images: newImages
              } as any;
              onChange({ extra_pages: currentExtras });
            }
          }
          return;
        } catch (tauriErr) {
          console.error("Tauri slot picker error:", tauriErr);
          return;
        }
      }

      // Web Browser Fallback: single-use file input
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.onchange = (e: any) => {
        const file = e.target?.files?.[0];
        if (file) {
          handleImageFileSelect(slotIdx, file, extraPageIndex);
        }
      };
      input.click();
    } finally {
      isSlotPickingRef.current = false;
    }
  };

  const handleImageClear = (slotIdx: number, extraPageIndex: number) => {
    const currentExtras = [...(data.extra_pages || [])];
    const targetPage = currentExtras[extraPageIndex];
    if (targetPage && (targetPage.type === 'id_cards' || targetPage.type === 'birth_certs')) {
      const newImages = [...targetPage.images];
      newImages[slotIdx] = undefined;
      currentExtras[extraPageIndex] = {
        ...targetPage,
        images: newImages
      } as any;
      onChange({ extra_pages: currentExtras });
    }
  };

  const handleRotateImage = (slotIdx: number, extraPageIndex: number) => {
    const targetPage = data.extra_pages?.[extraPageIndex];
    if (!targetPage || !('images' in targetPage)) return;
    const currentImg = targetPage.images?.[slotIdx];
    if (!currentImg) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.height;
      canvas.height = img.width;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((90 * Math.PI) / 180);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);
      const rotatedDataUrl = canvas.toDataURL('image/jpeg', 0.95);

      const currentExtras = [...(data.extra_pages || [])];
      const pageToUpdate = { ...currentExtras[extraPageIndex] };
      if ('images' in pageToUpdate) {
        const newImages = [...(pageToUpdate.images || [])];
        newImages[slotIdx] = rotatedDataUrl;
        pageToUpdate.images = newImages;
        currentExtras[extraPageIndex] = pageToUpdate as any;
        onChange({ extra_pages: currentExtras });
      }
    };
    img.src = currentImg;
  };

  // =========================================================================
  // RENDER DYNAMIC EXTRA PAGES (Page > 6)
  // =========================================================================
  if (page > 6) {
    const extraPageIndex = page - 7;
    const extraPage = data.extra_pages?.[extraPageIndex];

    if (!extraPage) {
      return (
        <div className="bg-slate-900 text-slate-300 p-8 rounded-2xl border border-slate-800 text-center">
          الصفحة المطلوبة غير متوفرة.
        </div>
      );
    }

    // 1. DUPLICATED LEDGER PAGE (Duplicate of Page 6)
    if (extraPage.type === 'duplicated_ledger') {
      const ledgerFields: FieldConfig[] = layout[6] || DEFAULT_DOCUMENT_LAYOUT[6] || [];
      const syntheticData = {
        ...data,
        page6: {
          ...data.page6,
          ...(extraPage.page6Data || {}),
          church_records_id: (extraPage.page6Data?.church_records_id || data.page6?.church_records_id || data.page1?.church_study_id || ""),
          cathedral_care_id: (extraPage.page6Data?.cathedral_care_id || data.page6?.cathedral_care_id || data.page1?.cathedral_care_id || ""),
          church_membership_id: (extraPage.page6Data?.church_membership_id || data.page6?.church_membership_id || data.page1?.church_membership_id || ""),
          family_head: (extraPage.page6Data?.family_head || data.page6?.family_head || getHeadOfHouseholdName(data) || "")
        }
      };

      const handleLedgerFieldChange = (binding: string, val: any) => {
        const updatedPage6 = setValueByPath(syntheticData, binding, val).page6;
        const currentExtras = [...(data.extra_pages || [])];
        currentExtras[extraPageIndex] = {
          ...extraPage,
          page6Data: updatedPage6
        };
        onChange({ extra_pages: currentExtras });
      };

      return (
        <div
          dir="rtl"
          className="relative bg-white shadow-2xl transition-transform duration-100 origin-top select-none font-['IBM_Plex_Sans_Arabic']"
          style={{
            width: '820px',
            minHeight: '1160px',
            transform: `scale(${scale})`,
            marginBottom: `${(scale - 1) * 1160}px`
          }}
        >
          {/* Top Banner indicating duplicated ledger */}
          <div className="absolute top-2 left-4 right-4 z-20 flex items-center justify-between bg-amber-500/90 text-slate-950 px-3 py-1.5 rounded-lg shadow-md backdrop-blur-sm text-xs font-bold pointer-events-auto">
            <div className="flex items-center gap-1.5">
              <CopyPlus className="w-4 h-4" />
              <span>{extraPage.title || `سجل الصرف (متابعة ${extraPageIndex + 2})`}</span>
              <span className="text-[10px] bg-slate-950/20 px-1.5 py-0.5 rounded">شهري إضافي</span>
            </div>
            {onDeletePage && (
              <button
                type="button"
                onClick={() => onDeletePage(extraPageIndex)}
                className="flex items-center gap-1 px-2 py-0.5 rounded bg-rose-700 hover:bg-rose-800 text-white text-[11px] transition-colors cursor-pointer"
                title="حذف هذه الصفحة المكررة"
              >
                <Trash2 className="w-3 h-3" />
                <span>حذف الصفحة</span>
              </button>
            )}
          </div>

          <img
            src={getPageImage(6)}
            alt={extraPage.title}
            className="w-full h-auto block select-none pointer-events-none"
            draggable={false}
          />

          <div className="absolute inset-0 select-auto pt-8">
            {ledgerFields.map((field) => {
              const val = getValueByPath(syntheticData, field.binding);
              const rect = field.rect;
              const style = field.style || {};

              return (
                <div
                  key={field.id}
                  className="absolute"
                  style={{
                    left: `${rect.left}%`,
                    top: `${rect.top}%`,
                    width: `${rect.width}%`,
                    height: `${rect.height}%`
                  }}
                >
                  <AutoFitTextInput
                    id={`extra-ledger-${field.id}`}
                    placeholder={field.placeholder || ''}
                    value={String(val || '')}
                    onChange={(newVal) => handleLedgerFieldChange(field.binding, newVal)}
                    boxWidthPct={rect.width}
                    boxHeightPct={rect.height}
                    isBold={Boolean(style.isBold)}
                    isMono={Boolean(style.isMono)}
                    fontSizePreference={style.fontSize}
                    className="w-full h-full rounded text-slate-950 font-medium px-1 py-0 focus:outline-none transition-all box-border flex items-center leading-normal overflow-hidden border border-amber-500/40 bg-white/80 hover:bg-white focus:bg-white focus:ring-2 focus:ring-amber-500"
                    style={{
                      textAlign: style.textAlign || 'right',
                      color: style.textColor || undefined,
                      boxSizing: 'border-box',
                      lineHeight: 'normal'
                    }}
                  />
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    // 2. ID CARDS PAGE (Vertical, White Background, 8 Evenly Distributed Slots)
    if (extraPage.type === 'id_cards') {
      const images = extraPage.images || [];

      return (
        <div
          dir="rtl"
          className="relative bg-white shadow-2xl transition-transform duration-100 origin-top select-none font-['IBM_Plex_Sans_Arabic'] rounded-sm border border-slate-200"
          style={{
            width: '820px',
            minHeight: '1160px',
            transform: `scale(${scale})`,
            marginBottom: `${(scale - 1) * 1160}px`
          }}
        >
          {/* Header Banner */}
          <div className="p-5 pb-3 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
            <div>
              <div className="text-xs text-amber-700 font-bold tracking-wide">
                {(data.page1?.church_name || data.Page1?.churchName) ? `${data.page1?.church_name || data.Page1?.churchName} - خدمة أخوة الرب` : 'خدمة أخوة الرب'}
              </div>
              <h1 className="text-lg font-bold text-slate-900 mt-0.5 flex items-center gap-2">
                <span>صفحة بطاقات الرقم القومي</span>
                <span className="text-xs bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded-full border border-amber-300">
                  8 بطاقات شخصية
                </span>
              </h1>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-left text-xs text-slate-500 font-mono">
                <div>رقم البحث: <strong className="text-slate-800">{data.page1?.church_study_id ? `#${data.page1.church_study_id}` : '—'}</strong></div>
                <div>رب الأسرة: <strong className="text-slate-800">{getHeadOfHouseholdName(data) || '—'}</strong></div>
              </div>
              {onDeletePage && (
                <button
                  type="button"
                  onClick={() => onDeletePage(extraPageIndex)}
                  className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2.5 py-1.5 rounded-lg border border-rose-200 transition-colors flex items-center gap-1 cursor-pointer font-bold"
                  title="حذف هذه الصفحة"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>حذف</span>
                </button>
              )}
            </div>
          </div>

          {/* 8 Evenly Distributed Boxes Grid (2 columns x 4 rows) */}
          <div className="p-5 grid grid-cols-2 gap-3.5 select-auto">
            {Array.from({ length: 8 }).map((_, slotIdx) => {
              const img = images[slotIdx];
              const defaultLabel = `بطاقة رقم ${slotIdx + 1}${slotIdx % 2 === 0 ? ' (الوجه)' : ' (الظهر)'}`;
              const label = extraPage.labels?.[slotIdx] || defaultLabel;

              return (
                <div
                  key={slotIdx}
                  className={`relative h-[242px] rounded-xl border-2 transition-all duration-200 overflow-hidden flex flex-col bg-slate-50/70 group ${
                    img
                      ? 'border-amber-500/80 shadow-sm bg-white'
                      : 'border-dashed border-slate-300 hover:border-amber-500 hover:bg-amber-50/40'
                  }`}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const file = e.dataTransfer.files?.[0];
                    if (file) handleImageFileSelect(slotIdx, file, extraPageIndex);
                  }}
                >
                  {/* Slot Header Badge */}
                  <div className="px-3 py-1.5 bg-slate-100/90 border-b border-slate-200 flex items-center justify-between text-xs select-none">
                    <span className="font-bold text-slate-800">{label}</span>
                    <span className="text-[10px] text-slate-500 font-mono font-bold">#{slotIdx + 1}</span>
                  </div>

                  {/* Slot Main Body */}
                  <div className="flex-1 relative flex items-center justify-center p-2">
                    {img ? (
                      <>
                        <img
                          src={img}
                          alt={label}
                          className="w-full h-full object-contain"
                        />
                        <div className="absolute inset-0 bg-slate-950/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-2">
                          <button
                            type="button"
                            onClick={() => onOpenCropper?.(`extra_pages[${extraPageIndex}].images[${slotIdx}]`, label, 'id_card')}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-md cursor-pointer transition-all"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>تعديل واقتصاص</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleImageClear(slotIdx, extraPageIndex)}
                            className="p-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white shadow-md cursor-pointer transition-all"
                            title="حذف الصورة"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </>
                    ) : (
                      <div
                        role="button"
                        onClick={() => handleSlotPickImage(slotIdx, extraPageIndex)}
                        className="w-full h-full flex flex-col items-center justify-center cursor-pointer p-4 text-center select-none"
                      >
                        <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform">
                          <Upload className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-bold text-slate-700 group-hover:text-amber-700">
                          انقر لرفع صورة البطاقة
                        </span>
                        <span className="text-[10px] text-slate-400 mt-0.5">
                          أو اسحب الصورة وأفلتها هنا
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    // 3. BIRTH CERTIFICATES PAGE (Landscape A4 Default, White Background, 2 Halves: Right & Left)
    if (extraPage.type === 'birth_certs') {
      const images = extraPage.images || [undefined, undefined];

      return (
        <div
          dir="rtl"
          className="relative bg-white shadow-2xl transition-transform duration-100 origin-top select-none font-['IBM_Plex_Sans_Arabic'] rounded-sm border border-slate-200"
          style={{
            width: '1160px',
            minHeight: '820px',
            transform: `scale(${scale})`,
            marginBottom: `${(scale - 1) * 820}px`
          }}
        >
          {/* Header Banner */}
          <div className="p-5 pb-3 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
            <div>
              <div className="text-xs text-sky-800 font-bold tracking-wide">
                {(data.page1?.church_name || data.Page1?.churchName) ? `${data.page1?.church_name || data.Page1?.churchName} - خدمة أخوة الرب` : 'خدمة أخوة الرب'}
              </div>
              <h1 className="text-lg font-bold text-slate-900 mt-0.5 flex items-center gap-2">
                <span>صفحة شهادات الميلاد (عرض أفقي Landscape)</span>
                <span className="text-xs bg-sky-100 text-sky-900 font-bold px-2 py-0.5 rounded-full border border-sky-300">
                  شهادتين (شهادة 1 وشهادة 2)
                </span>
              </h1>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-left text-xs text-slate-500 font-mono">
                <div>رقم البحث: <strong className="text-slate-800">{data.page1?.church_study_id ? `#${data.page1.church_study_id}` : '—'}</strong></div>
                <div>رب الأسرة: <strong className="text-slate-800">{getHeadOfHouseholdName(data) || '—'}</strong></div>
              </div>
              {onDeletePage && (
                <button
                  type="button"
                  onClick={() => onDeletePage(extraPageIndex)}
                  className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2.5 py-1.5 rounded-lg border border-rose-200 transition-colors flex items-center gap-1 cursor-pointer font-bold"
                  title="حذف هذه الصفحة"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>حذف</span>
                </button>
              )}
            </div>
          </div>

          {/* Two Halves Grid: شهادة 1 و شهادة 2 (Landscape layout) */}
          <div className="p-5 grid grid-cols-2 gap-5 select-auto">
            {[0, 1].map((slotIdx) => {
              const img = images[slotIdx];
              const defaultLabel = slotIdx === 0 ? 'شهادة 1' : 'شهادة 2';
              const rawLabel = extraPage.labels?.[slotIdx];
              const label = (rawLabel && !rawLabel.includes("علوي") && !rawLabel.includes("سفلي")) ? rawLabel : defaultLabel;

              return (
                <div
                  key={slotIdx}
                  className={`relative h-[680px] rounded-2xl border-2 transition-all duration-200 overflow-hidden flex flex-col bg-slate-50/70 group ${
                    img
                      ? 'border-sky-500/80 shadow-md bg-white'
                      : 'border-dashed border-slate-300 hover:border-sky-500 hover:bg-sky-50/30'
                  }`}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const file = e.dataTransfer.files?.[0];
                    if (file) handleImageFileSelect(slotIdx, file, extraPageIndex);
                  }}
                >
                  {/* Slot Header */}
                  <div className="px-4 py-2.5 bg-slate-100/90 border-b border-slate-200 flex items-center justify-between text-xs select-none">
                    <span className="font-bold text-slate-900">{label}</span>
                    <span className="text-[11px] text-sky-800 font-mono bg-sky-100 px-2.5 py-0.5 rounded-full border border-sky-300 font-bold">
                      {slotIdx === 0 ? 'شهادة 1' : 'شهادة 2'}
                    </span>
                  </div>

                  {/* Slot Main Body */}
                  <div className="flex-1 relative flex items-center justify-center p-3">
                    {img ? (
                      <>
                        <img
                          src={img}
                          alt={label}
                          className="w-full h-full object-contain"
                        />
                        <div className="absolute inset-0 bg-slate-950/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 p-3">
                          <button
                            type="button"
                            onClick={() => handleRotateImage(slotIdx, extraPageIndex)}
                            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-lg cursor-pointer transition-all"
                            title="تدوير الصورة 90 درجة مع عقارب الساعة"
                          >
                            <RotateCw className="w-4 h-4" />
                            <span>تدوير 90°</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => onOpenCropper?.(`extra_pages[${extraPageIndex}].images[${slotIdx}]`, label, 'certificate')}
                            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-lg cursor-pointer transition-all"
                          >
                            <Edit3 className="w-4 h-4" />
                            <span>تعديل واقتصاص</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleImageClear(slotIdx, extraPageIndex)}
                            className="p-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white shadow-lg cursor-pointer transition-all"
                            title="حذف الصورة"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </>
                    ) : (
                      <div
                        role="button"
                        onClick={() => handleSlotPickImage(slotIdx, extraPageIndex)}
                        className="w-full h-full flex flex-col items-center justify-center cursor-pointer p-6 text-center select-none"
                      >
                        <div className="w-16 h-16 rounded-2xl bg-sky-100 text-sky-700 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-sm">
                          <Upload className="w-8 h-8" />
                        </div>
                        <span className="text-sm font-bold text-slate-800 group-hover:text-sky-800">
                          انقر لاختيار صورة شهادة الميلاد
                        </span>
                        <span className="text-xs text-slate-400 mt-1">
                          أو اسحب ملف الصورة هنا مباشرة (A4 أفقية أو رأسية)
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    }
  }

  // =========================================================================
  // STANDARD BASE PAGES (Pages 1 to 6)
  // =========================================================================
  const pageFields: FieldConfig[] = layout[page] || DEFAULT_DOCUMENT_LAYOUT[page] || [];

  return (
    <div
      dir="rtl"
      className="relative bg-white shadow-2xl transition-transform duration-100 origin-top select-none font-['IBM_Plex_Sans_Arabic']"
      style={{
        width: '820px',
        minHeight: '1160px',
        transform: `scale(${scale})`,
        marginBottom: `${(scale - 1) * 1160}px`
      }}
    >
      {/* 300 DPI Original Template Image */}
      <img
        src={getPageImage(page)}
        alt={`صفحة ${page}`}
        className="w-full h-auto block select-none pointer-events-none"
        draggable={false}
      />

      {/* Dynamic Overlay Fields from Visual Studio Layout */}
      <div className="absolute inset-0 select-auto">
        {/* In-Canvas Quick Husband & Wife Status Pills for Page 2 */}
        {page === 2 && (
          <>
            {/* Husband Status Control (Right Side) */}
            <div
              className="absolute z-20 flex items-center justify-center px-1"
              style={{
                left: '70%',
                top: '6.2%',
                width: '22%',
                height: '3.8%'
              }}
            >
              <div className="relative flex items-center">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setHusbandMenuOpen((prev) => !prev);
                    setWifeMenuOpen(false);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold shadow-md border transition-all cursor-pointer select-none active:scale-95 ${
                    isHusbandAbsent(data.page2?.husband)
                      ? "bg-amber-500 hover:bg-amber-400 text-slate-950 border-amber-600 ring-2 ring-amber-400/50"
                      : "bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-700 shadow-sm"
                  }`}
                  title="انقر لتحديد حالة الزوج بدقة (متوفي، عايش، إلخ)"
                >
                  <span className="text-[9.5px] opacity-80">الزوج:</span>
                  <span>{getHusbandStatusLabel(data.page2?.husband)}</span>
                  <ChevronDown
                    className={`w-3 h-3 stroke-[2.5] transition-transform duration-200 ${
                      husbandMenuOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {/* Dropdown Menu for Husband */}
                {husbandMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-30 cursor-default"
                      onClick={(e) => {
                        e.stopPropagation();
                        setHusbandMenuOpen(false);
                      }}
                    />
                    <div
                      className="absolute top-full mt-1.5 right-0 w-48 bg-slate-900/98 border border-amber-500/60 rounded-xl shadow-2xl p-1.5 flex flex-col gap-0.5 z-40 backdrop-blur-md animate-in fade-in zoom-in-95 duration-100"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="text-[10px] text-amber-300 font-bold px-2 py-1 border-b border-slate-700/80 mb-0.5 flex items-center justify-between">
                        <span>تحديد حالة الزوج:</span>
                        <span className="text-[9px] text-slate-400 font-normal">(نقل رب الأسرة)</span>
                      </div>
                      {[
                        { id: "present", label: "🟢 متواجد (عايش)" },
                        { id: "deceased", label: "⚰️ متوفي" },
                        { id: "abandoned", label: "🚪 تارك المنزل" },
                        { id: "apostate", label: "⚠️ خارج الحظيرة" },
                        { id: "separated", label: "⚖️ منفصل / طلاق" },
                        { id: "traveler", label: "✈️ مسافر / غائب" },
                        { id: "prisoner", label: "🔒 سجين / محبوس" },
                        { id: "other", label: "✍️ أخرى..." }
                      ].map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            handleFieldChange("page2.husband.status", item.id);
                            if (item.id !== "other") {
                              setHusbandMenuOpen(false);
                            }
                          }}
                          className={`text-right px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center justify-between ${
                            (data.page2?.husband?.status || "present") === item.id
                              ? "bg-amber-500 text-slate-950 font-extrabold"
                              : "text-slate-200 hover:bg-slate-800 hover:text-amber-300"
                          }`}
                        >
                          <span>{item.label}</span>
                          {(data.page2?.husband?.status || "present") === item.id && (
                            <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                          )}
                        </button>
                      ))}

                      {(data.page2?.husband?.status || "present") === "other" && (
                        <div className="p-1.5 mt-1 border-t border-slate-700/80 flex flex-col gap-1">
                          <span className="text-[10px] text-teal-300 font-bold">الحالة المخصصة للزوج:</span>
                          <input
                            type="text"
                            value={data.page2?.husband?.custom_status || ""}
                            onChange={(e) => handleFieldChange("page2.husband.custom_status", e.target.value)}
                            placeholder="اكتب الحالة..."
                            className="w-full text-[11px] font-bold rounded px-2 py-1 border border-teal-500 bg-slate-950 text-white focus:outline-none"
                            autoFocus
                          />
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Wife Status Control (Left Side) */}
            <div
              className="absolute z-20 flex items-center justify-center px-1"
              style={{
                left: '13%',
                top: '6.2%',
                width: '22%',
                height: '3.8%'
              }}
            >
              <div className="relative flex items-center">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setWifeMenuOpen((prev) => !prev);
                    setHusbandMenuOpen(false);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold shadow-md border transition-all cursor-pointer select-none active:scale-95 ${
                    isWifeAbsent(data.page2?.wife)
                      ? "bg-amber-500 hover:bg-amber-400 text-slate-950 border-amber-600 ring-2 ring-amber-400/50"
                      : "bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-700 shadow-sm"
                  }`}
                  title="انقر لتحديد حالة الزوجة بدقة (متوفية، عايشة، إلخ)"
                >
                  <span className="text-[9.5px] opacity-80">الزوجة:</span>
                  <span>{getWifeStatusLabel(data.page2?.wife)}</span>
                  <ChevronDown
                    className={`w-3 h-3 stroke-[2.5] transition-transform duration-200 ${
                      wifeMenuOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {/* Dropdown Menu for Wife */}
                {wifeMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-30 cursor-default"
                      onClick={(e) => {
                        e.stopPropagation();
                        setWifeMenuOpen(false);
                      }}
                    />
                    <div
                      className="absolute top-full mt-1.5 left-0 w-48 bg-slate-900/98 border border-amber-500/60 rounded-xl shadow-2xl p-1.5 flex flex-col gap-0.5 z-40 backdrop-blur-md animate-in fade-in zoom-in-95 duration-100"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="text-[10px] text-amber-300 font-bold px-2 py-1 border-b border-slate-700/80 mb-0.5 flex items-center justify-between">
                        <span>تحديد حالة الزوجة:</span>
                        <span className="text-[9px] text-slate-400 font-normal">(نقل رب الأسرة)</span>
                      </div>
                      {[
                        { id: "present", label: "🟢 متواجدة (عايشة)" },
                        { id: "deceased", label: "⚰️ متوفية" },
                        { id: "abandoned", label: "🚪 تاركة المنزل" },
                        { id: "apostate", label: "⚠️ خارج الحظيرة" },
                        { id: "separated", label: "⚖️ منفصلة / طلاق" },
                        { id: "traveler", label: "✈️ مسافرة / غائبة" },
                        { id: "prisoner", label: "🔒 سجينة / محبوسة" },
                        { id: "other", label: "✍️ أخرى..." }
                      ].map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            handleFieldChange("page2.wife.status", item.id);
                            if (item.id !== "other") {
                              setWifeMenuOpen(false);
                            }
                          }}
                          className={`text-right px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center justify-between ${
                            (data.page2?.wife?.status || "present") === item.id
                              ? "bg-amber-500 text-slate-950 font-extrabold"
                              : "text-slate-200 hover:bg-slate-800 hover:text-amber-300"
                          }`}
                        >
                          <span>{item.label}</span>
                          {(data.page2?.wife?.status || "present") === item.id && (
                            <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                          )}
                        </button>
                      ))}

                      {(data.page2?.wife?.status || "present") === "other" && (
                        <div className="p-1.5 mt-1 border-t border-slate-700/80 flex flex-col gap-1">
                          <span className="text-[10px] text-teal-300 font-bold">الحالة المخصصة للزوجة:</span>
                          <input
                            type="text"
                            value={data.page2?.wife?.custom_status || ""}
                            onChange={(e) => handleFieldChange("page2.wife.custom_status", e.target.value)}
                            placeholder="اكتب الحالة..."
                            className="w-full text-[11px] font-bold rounded px-2 py-1 border border-teal-500 bg-slate-950 text-white focus:outline-none"
                            autoFocus
                          />
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </>
        )}

        {pageFields.map((field) => {
          const val = getValueByPath(data, field.binding);
          const rect = field.rect;
          const style = field.style || {};
          const isHighlighted = highlightedFieldId === field.id;

          // -------------------------------------------------------------------
          // 1. IMAGE DROPZONES (Husband & Wife ID Cards, Photos)
          // -------------------------------------------------------------------
          if (field.type === 'image') {
            const handleCardClick = () => {
              if (onOpenCropper) {
                onOpenCropper(field.binding, field.label, 'id_card');
              } else if (field.binding.includes('husband')) {
                onOpenHusbandCropper?.();
              } else {
                onOpenWifeCropper?.();
              }
            };

            const handleFileDrop = (e: React.DragEvent) => {
              e.preventDefault();
              e.stopPropagation();
              const file = e.dataTransfer.files?.[0];
              if (file && file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (ev) => {
                  if (ev.target?.result) {
                    handleFieldChange(field.binding, ev.target.result as string);
                  }
                };
                reader.readAsDataURL(file);
              }
            };

            const imgSrc = val;

            return (
              <div
                key={field.id}
                id={`field-container-${field.id}`}
                onClick={handleCardClick}
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleFileDrop}
                className={`absolute rounded-lg border-2 border-dashed transition-all duration-200 overflow-hidden group shadow-sm flex items-center justify-center cursor-pointer z-10 ${
                  imgSrc
                    ? 'border-amber-500/80 hover:border-amber-400 bg-slate-900/10'
                    : 'border-amber-500/60 hover:border-amber-500 bg-white/90 hover:bg-amber-50/70'
                } ${
                  isHighlighted ? 'animate-field-shake animate-field-error-glow ring-4 ring-rose-500' : ''
                }`}
                style={{
                  left: `${rect.left}%`,
                  top: `${rect.top}%`,
                  width: `${rect.width}%`,
                  height: `${rect.height}%`
                }}
                title={`${field.label} - انقر للرفع والتعديل أو اسحب الصورة هنا`}
              >
                {imgSrc ? (
                  <div className="w-full h-full relative flex items-center justify-center p-0.5">
                    <img
                      src={imgSrc}
                      alt={field.label}
                      className="w-full h-full object-contain"
                    />
                    <div className="absolute top-1 right-1 bg-slate-950/80 text-amber-300 text-[9px] font-bold px-1.5 py-0.5 rounded shadow pointer-events-none">
                      {field.label}
                    </div>
                    <div className="absolute inset-0 bg-slate-950/75 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCardClick();
                        }}
                        className="flex items-center gap-1 px-2 py-1 rounded bg-amber-500 text-slate-950 text-xs font-bold shadow hover:bg-amber-400 active:scale-95 transition-all"
                      >
                        <Edit3 className="w-3 h-3" />
                        تعديل
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleFieldChange(field.binding, undefined);
                        }}
                        className="p-1 rounded bg-rose-500 text-white shadow hover:bg-rose-400 active:scale-95 transition-all"
                        title="حذف"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-0.5 text-center p-1.5">
                    <Upload className="w-4 h-4 text-amber-600 group-hover:scale-110 transition-transform" />
                    <span className="text-[11px] font-bold text-slate-800 leading-tight">{field.label}</span>
                    <span className="text-[8.5px] text-slate-500">انقر للرفع أو اسحب الصورة</span>
                  </div>
                )}
              </div>
            );
          }

          // -------------------------------------------------------------------
          // 2. TEXTAREA (Notes, Housing Description, Committee Reason)
          // -------------------------------------------------------------------
          if (field.type === 'textarea') {
            return (
              <div
                key={field.id}
                id={`field-container-${field.id}`}
                className={`absolute z-10 ${
                  isHighlighted ? 'animate-field-shake animate-field-error-glow ring-4 ring-rose-500 rounded' : ''
                }`}
                style={{
                  left: `${rect.left}%`,
                  top: `${rect.top}%`,
                  width: `${rect.width}%`,
                  height: `${rect.height}%`
                }}
              >
                <AutoFitTextarea
                  placeholder={field.placeholder || ''}
                  value={String(val || '')}
                  onChange={(newVal) => handleFieldChange(field.binding, newVal)}
                  boxWidthPct={rect.width}
                  boxHeightPct={rect.height}
                  fontSizePreference={style.fontSize}
                  className="w-full h-full bg-transparent hover:bg-amber-500/10 focus:bg-white/95 focus:ring-2 focus:ring-amber-500/80 focus:outline-none rounded text-slate-950 font-medium px-2 py-1 leading-relaxed resize-none transition-colors border border-slate-300/80"
                  style={{
                    textAlign: style.textAlign || 'right'
                  }}
                />
              </div>
            );
          }

          // -------------------------------------------------------------------
          // 3. CHECKBOX
          // -------------------------------------------------------------------
          if (field.type === 'checkbox') {
            return (
              <label
                key={field.id}
                id={`field-container-${field.id}`}
                className={`absolute flex items-center gap-1.5 cursor-pointer z-10 px-1 py-0.5 rounded hover:bg-amber-500/15 ${
                  isHighlighted ? 'animate-field-shake animate-field-error-glow ring-4 ring-rose-500' : ''
                }`}
                style={{
                  left: `${rect.left}%`,
                  top: `${rect.top}%`,
                  width: `${rect.width}%`,
                  height: `${rect.height}%`
                }}
              >
                <input
                  id={`field-input-${field.id}`}
                  type="checkbox"
                  checked={Boolean(val)}
                  onChange={(e) => handleFieldChange(field.binding, e.target.checked)}
                  className="w-4 h-4 text-amber-600 rounded border-slate-400 focus:ring-amber-500"
                />
                <span className="text-[11px] font-bold text-slate-900">{field.label}</span>
              </label>
            );
          }

          // -------------------------------------------------------------------
          // 4. DROPDOWN / SELECT (With Proportional Smart Sizing)
          // -------------------------------------------------------------------
          if (field.type === 'select') {
            const isChurchField = field.binding === 'page1.church_name' || field.id === 'p1_select_1865';
            const isLockedChurch = isChurchField && Boolean(lockedChurchName);

            const selectBoxHeightPx = (rect.height / 100) * 1160;
            const selectFontSize = Math.max(10, Math.min(14, Math.round((selectBoxHeightPx - 3.5) / 1.55 * 10) / 10));

            // If this is the church field and it is locked to a licensed church name:
            if (isLockedChurch && lockedChurchName) {
              return (
                <div
                  key={field.id}
                  id={`field-container-${field.id}`}
                  className={`absolute z-10 ${
                    isHighlighted ? 'animate-field-shake animate-field-error-glow ring-4 ring-rose-500 rounded' : ''
                  }`}
                  style={{
                    left: `${rect.left}%`,
                    top: `${rect.top}%`,
                    width: `${rect.width}%`,
                    height: `${rect.height}%`
                  }}
                >
                  <div
                    id={`field-input-${field.id}`}
                    title={`اسم الكنيسة معتمد بناءً على ترخيص البرنامج: ${lockedChurchName}`}
                    className="w-full h-full bg-white/95 text-slate-950 font-bold px-2 py-0 rounded border border-amber-500/50 shadow-xs flex items-center select-none transition-all"
                    style={{
                      fontSize: `${selectFontSize}px`,
                      boxSizing: 'border-box'
                    }}
                  >
                    <span className="truncate">{lockedChurchName}</span>
                  </div>
                </div>
              );
            }

            const rawOptions = field.options && field.options.length > 0 ? field.options : ['نعم', 'لا'];
            // Deduplicate options while preserving exact order
            const options = Array.from(new Set(rawOptions));

            // Determine if a separate empty/placeholder option is needed:
            // 1. If options already contains 'بلا', do NOT prepend a placeholder option.
            // 2. If placeholder matches an option (e.g. 'معاش تكافل وكرامة'), NEVER add it as a duplicate empty option!
            const hasDefaultNoneOption = options.includes('بلا');
            const placeholderMatchesOption = Boolean(field.placeholder && options.includes(field.placeholder));
            const showPlaceholder = !hasDefaultNoneOption && !placeholderMatchesOption && field.placeholder !== '';

            // Selected value: if field has 'بلا' as first option and value is empty, default to 'بلا'
            const effectiveVal = val ?? (hasDefaultNoneOption ? options[0] : '');

            return (
              <select
                key={field.id}
                id={`field-input-${field.id}`}
                value={effectiveVal}
                onChange={(e) => handleFieldChange(field.binding, e.target.value)}
                className={`absolute bg-white/95 hover:bg-white focus:ring-2 focus:ring-amber-500 rounded text-slate-950 font-bold px-1.5 py-0 shadow-sm border border-slate-300 z-10 cursor-pointer ${
                  isHighlighted ? 'animate-field-shake animate-field-error-glow ring-4 ring-rose-500' : ''
                }`}
                style={{
                  left: `${rect.left}%`,
                  top: `${rect.top}%`,
                  width: `${rect.width}%`,
                  height: `${rect.height}%`,
                  fontSize: `${selectFontSize}px`,
                  textAlign: style.textAlign || 'right',
                  boxSizing: 'border-box'
                }}
              >
                {showPlaceholder && (
                  <option value="">{field.placeholder || '-- اختر --'}</option>
                )}
                {options.map((opt, i) => (
                  <option key={i} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            );
          }

          // -------------------------------------------------------------------
          // 5. AUTO-FIT TEXT / NUMBER / DATE (Pixel-Perfect Smart Engine)
          // -------------------------------------------------------------------
          const isNationalId =
            field.binding.includes('national_id') || field.binding.includes('nid');
          const isPage4IncomeTotal =
            field.binding === 'page4.income.total_income' || field.id === 'p4_inc_total';
          const isPage4ExpenseTotal =
            field.binding === 'page4.expenses.total_expenses' || field.id === 'p4_exp_total';
          const isPage4AidTotal =
            field.binding === 'page4.total_church_aid' ||
            field.binding === 'page4.church_aid.Total' ||
            field.binding === 'page4.church_aid_total' ||
            field.id === 'p4_church_aid_total';
          const isPage4Total = isPage4IncomeTotal || isPage4ExpenseTotal || isPage4AidTotal;

          const isPage4TableNumber =
            field.page === 4 &&
            (field.binding.startsWith('page4.income.') ||
             field.binding.startsWith('page4.expenses.') ||
             field.binding.startsWith('page4.church_aid[') ||
             field.id.startsWith('p4_inc_') ||
             field.id.startsWith('p4_exp_') ||
             field.id.startsWith('p4_aid_') ||
             field.id.startsWith('number_') ||
             field.id.startsWith('p4_number_'));

          const rawStr = String(val || '');
          const hasVal = rawStr.trim().length > 0;
          const nidInfo = isNationalId ? parseEgyptianNationalId(rawStr) : null;
          const isNidValid = nidInfo?.isValid;

          // Determine dynamic border & background state for National ID, totals, or normal inputs
          let borderStyles = 'border border-slate-300/80 bg-white/40 hover:bg-amber-500/10 focus:bg-white/95 focus:border-amber-500/90';
          if (isNationalId && hasVal) {
            if (isNidValid) {
              borderStyles = 'border-2 border-emerald-500 bg-emerald-50/25 ring-2 ring-emerald-500/20 text-emerald-950 font-bold shadow-sm';
            } else {
              borderStyles = 'border-2 border-rose-500 bg-rose-50/35 ring-2 ring-rose-500/30 text-rose-950 font-bold shadow-sm';
            }
          } else if (isPage4IncomeTotal) {
            borderStyles = 'border-2 border-amber-500 bg-amber-50/95 text-emerald-700 font-bold shadow-sm cursor-default';
          } else if (isPage4ExpenseTotal) {
            borderStyles = 'border-2 border-amber-500 bg-amber-50/95 text-rose-700 font-bold shadow-sm cursor-default';
          } else if (isPage4AidTotal) {
            borderStyles = 'border-2 border-amber-500 bg-amber-50/95 text-slate-900 font-bold shadow-sm cursor-default';
          } else if (isPage4TableNumber) {
            borderStyles = 'border border-slate-300/90 bg-white/95 hover:bg-white focus:bg-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-slate-950 font-bold shadow-xs [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none';
          }

          const highlightStyles = isHighlighted
            ? 'animate-field-shake animate-field-error-glow ring-4 ring-rose-500 rounded-md z-30'
            : '';

          const isHusbandName = field.binding === 'page2.husband.name';
          const isHusbandDeceasedOrAbsent = isHusbandName && isHusbandAbsent(data.page2?.husband);
          const isWifeName = field.binding === 'page2.wife.name';
          const isWifeDeceasedOrAbsent = isWifeName && isWifeAbsent(data.page2?.wife);
          const isBaseSalary = field.binding === 'page4.income.base_salary';
          const page2Salaries = isBaseSalary ? calculatePage2Salaries(data) : 0;

          const effectivePlaceholder =
            isHusbandDeceasedOrAbsent && !rawStr
              ? `(الزوج ${getHusbandStatusLabel(data.page2?.husband)})`
              : isWifeDeceasedOrAbsent && !rawStr
              ? `(الزوجة ${getWifeStatusLabel(data.page2?.wife)})`
              : isBaseSalary && !rawStr && page2Salaries > 0
              ? `مجموع ص2: ${page2Salaries}`
              : (field.placeholder || '');

          return (
            <div
              key={field.id}
              id={`field-container-${field.id}`}
              className={`absolute z-10 transition-all ${highlightStyles}`}
              style={{
                left: `${rect.left}%`,
                top: `${rect.top}%`,
                width: `${rect.width}%`,
                height: `${rect.height}%`
              }}
            >
              <AutoFitTextInput
                id={`field-input-${field.id}`}
                title={
                  isNationalId && hasVal
                    ? (isNidValid
                        ? `✓ الرقم القومي سليم: ${nidInfo.governorate} • ${nidInfo.age} سنة • ${nidInfo.gender}`
                        : `⚠️ ${nidInfo?.errorMessage || 'الرقم القومي غير صحيح'}`)
                    : isPage4Total
                    ? `∑ ${field.label} (محسوب تلقائياً من عناصر الجدول)`
                    : isHusbandName && isHusbandDeceasedOrAbsent
                    ? `حالة الزوج: ${getHusbandStatusLabel(data.page2?.husband)} — الزوجة هي رب الأسرة`
                    : isWifeName && isWifeDeceasedOrAbsent
                    ? `حالة الزوجة: ${getWifeStatusLabel(data.page2?.wife)}`
                    : undefined
                }
                type={isPage4Total ? 'text' : (field.type === 'number' && !isNationalId ? 'number' : 'text')}
                readOnly={isPage4Total}
                maxLength={isNationalId ? 14 : undefined}
                placeholder={effectivePlaceholder}
                value={rawStr}
                onChange={(newVal) => handleFieldChange(field.binding, newVal)}
                boxWidthPct={rect.width}
                boxHeightPct={rect.height}
                isBold={Boolean(style.isBold || isPage4Total || isPage4TableNumber)}
                isMono={Boolean(style.isMono || isNationalId || isPage4Total || isPage4TableNumber)}
                fontSizePreference={style.fontSize}
                className={`w-full h-full rounded text-slate-950 font-medium px-1 py-0 focus:outline-none transition-all box-border flex items-center leading-normal overflow-hidden ${borderStyles} ${
                  style.isMono || isNationalId || isPage4Total || isPage4TableNumber ? 'font-mono' : ''
                } ${style.isBold || isPage4Total || isPage4TableNumber ? 'font-bold' : ''}`}
                style={{
                  textAlign: style.textAlign || (isNationalId || isPage4Total || isPage4TableNumber ? 'center' : 'right'),
                  color: style.textColor || undefined,
                  boxSizing: 'border-box',
                  lineHeight: 'normal'
                }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};
