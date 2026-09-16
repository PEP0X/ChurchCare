import React, { useState, useMemo, useEffect, useRef } from "react";
import { CaseStudyData } from "./types/schema";
import { DocumentLayout } from "./types/layout";
import { DEFAULT_DOCUMENT_LAYOUT } from "./config/defaultDocumentLayout";
import { InteractiveDocumentCanvas } from "./components/canvas/InteractiveDocumentCanvas";
import { VisualCoordinateStudio } from "./components/studio/VisualCoordinateStudio";
import { ImageCropperModal } from "./components/studio/ImageCropperModal";
import { invoke } from "@tauri-apps/api/core";
import { ActivationModal } from "./components/ActivationModal";
import { AboutModal } from "./components/AboutModal";
import { useSidecar } from "./hooks/useSidecar";
import { parseEgyptianNationalId } from "./hooks/useNationalId";
import { recalculatePage4Totals } from "./utils/page4Calculations";
import { saveSessionToIndexedDB, loadSessionFromIndexedDB } from "./utils/sessionStorage";
import {
  FileDown,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  ZoomIn,
  ZoomOut,
  HeartHandshake,
  CheckCircle2,
  RotateCcw,
  Sliders,
  AlertCircle,
  AlertTriangle,
  X,
  PanelRightClose,
  PanelRightOpen,
  FileBadge,
  Calendar,
  UserCheck,
  Users,
  Coins,
  Scale,
  FileSignature,
  Check,
  ShieldCheck,
  FolderOpen,
  Save,
  FileText,
  Info,
  Home,
  CreditCard,
  FileSpreadsheet,
  CopyPlus,
  Trash2
} from "lucide-react";
import {
  ExtraPage,
  ExtraIdCardsPage,
  ExtraBirthCertsPage,
  DuplicatedLedgerPage
} from "./types/schema";
import { isChurchNameLocked, getLockedChurchName } from "./utils/churchLicense";
import { getHeadOfHouseholdName, getCaseStudyFileName, getCaseStudyDisplayName } from "./utils/caseStudyUtils";

const BINDING_ALIASES: Record<string, string[]> = {
  "page6.head_name": ["page6.family_head", "page2.husband.name", "page2.wife.name"],
  "page6.family_head": ["page6.head_name", "page2.husband.name", "page2.wife.name"],
  "page6.church_id": ["page6.church_records_id"],
  "page6.church_records_id": ["page6.church_id"],
  "page6.care_id": ["page6.cathedral_care_id"],
  "page6.cathedral_care_id": ["page6.care_id"],
  "page6.member_id": ["page6.church_membership_id"],
  "page6.church_membership_id": ["page6.member_id"],
  "page5.other_notes": ["page5.notes"],
  "page5.notes": ["page5.other_notes"],
  "page4.total_church_aid": ["page4.church_aid.Total", "page4.church_aid_total"],
  "page4.church_aid.Total": ["page4.total_church_aid", "page4.church_aid_total"],
  "page4.church_aid_total": ["page4.total_church_aid", "page4.church_aid.Total"],
  "page4.church_aid_total_notes": ["page4.church_aid.purpose"],
  "page4.church_aid.purpose": ["page4.church_aid_total_notes"],
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

// Safe path value writer with alias synchronization
function setValueByPath(obj: any, path: string, value: any): any {
  const parts = path.replace(/\[/g, ".").replace(/\]/g, "").split(".").filter(Boolean);
  const newObj = JSON.parse(JSON.stringify(obj));
  let current = newObj;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (current[part] == null) {
      const nextPart = parts[i + 1];
      current[part] = /^\d+$/.test(nextPart) ? [] : {};
    }
    current = current[part];
  }
  current[parts[parts.length - 1]] = value;

  // Synchronize aliases so both root keys and sub-paths remain in sync
  const alts = BINDING_ALIASES[path];
  if (alts) {
    for (const alt of alts) {
      const altParts = alt.replace(/\[/g, ".").replace(/\]/g, "").split(".").filter(Boolean);
      let altCurrent = newObj;
      for (let i = 0; i < altParts.length - 1; i++) {
        const altPart = altParts[i];
        if (altCurrent[altPart] == null) {
          const nextPart = altParts[i + 1];
          altCurrent[altPart] = /^\d+$/.test(nextPart) ? [] : {};
        }
        altCurrent = altCurrent[altPart];
      }
      altCurrent[altParts[altParts.length - 1]] = value;
    }
  }

  return newObj;
}

// Counts all embedded images in case study
function countEmbeddedImages(d: CaseStudyData): number {
  let count = 0;
  if (d.husband_id_image && typeof d.husband_id_image === "string" && d.husband_id_image.trim()) count++;
  if (d.husband_id_back_image && typeof d.husband_id_back_image === "string" && d.husband_id_back_image.trim()) count++;
  if (d.wife_id_image && typeof d.wife_id_image === "string" && d.wife_id_image.trim()) count++;
  if (d.wife_id_back_image && typeof d.wife_id_back_image === "string" && d.wife_id_back_image.trim()) count++;
  if (Array.isArray(d.extra_pages)) {
    for (const ep of d.extra_pages) {
      if (ep.type === "id_cards" || ep.type === "birth_certs") {
        for (const img of ep.images || []) {
          if (img && typeof img === "string" && img.trim()) {
            count++;
          }
        }
      }
    }
  }
  return count;
}

const INITIAL_EMPTY_STATE: CaseStudyData = {
  husband_id_image: undefined,
  husband_id_back_image: undefined,
  wife_id_image: undefined,
  wife_id_back_image: undefined,
  page1: {
    study_date: "",
    church_study_id: "",
    church_name: "",
    day: "",
    month: "",
    year: "",
    area: "",
    responsible_priest: "",
    cathedral_care_id: "",
    church_membership_id: ""
  },
  page2: {
    husband: {
      name: "",
      nickname: "",
      national_id: "",
      job: "",
      salary: "",
      phone: "",
      confession_father: "",
      insurance_no: ""
    },
    wife: {
      name: "",
      nickname: "",
      national_id: "",
      job: "",
      salary: "",
      phone: "",
      confession_father: "",
      insurance_no: ""
    },
    address: {
      street: "",
      building_no: "",
      governorate: "",
      area: "",
      landmark: "",
      housing_type: "",
      children_phones: "",
      notes: ""
    },
    gov_programs: {
      has_ration_card: "نعم",
      ration_members_count: "",
      program_1: "بلا",
      program_2: "بلا"
    }
  },
  page3: {
    family_members: [],
    other_persons: [],
    housing_description: "",
    medical_conditions: {
      diseases: "",
      mental_addiction: "",
      disability: "",
      abandoned_parent: "",
      other_circumstances: ""
    }
  },
  page4: {
    church_aid: [],
    income: {
      church_aid: "",
      medical_aid: "",
      study_aid: "",
      base_salary: "",
      side_project: "",
      relatives_aid: "",
      total_income: ""
    },
    expenses: {
      living_basics: "",
      utilities: "",
      phone: "",
      rent: "",
      medical: "",
      education: "",
      total_expenses: ""
    }
  },
  page5: {
    duration: "",
    entry_reason: "",
    approved_amount: "",
    notes: "",
    committee_members: ["", "", ""]
  },
  page6: {
    family_head: "",
    church_records_id: "",
    cathedral_care_id: "",
    church_membership_id: "",
    from_date: "",
    to_date: "",
    aid_ledger: [],
    signatures: ["", "", ""]
  }
};

const SAMPLE_STATE: CaseStudyData = {
  husband_id_image: undefined,
  husband_id_back_image: undefined,
  wife_id_image: undefined,
  wife_id_back_image: undefined,
  page1: {
    study_date: "2026/09/04",
    church_study_id: "784/2026",
    church_name: "كنيسة الشهيد العظيم أبي سيفين والقديسة دميانة - القلج",
    day: "04",
    month: "09",
    year: "2026",
    area: "القلج - الخانكة",
    responsible_priest: "القمص بيشوي حليم",
    cathedral_care_id: "CAT-9042",
    church_membership_id: "MEM-1104"
  },
  page2: {
    husband: {
      name: "مينا حنا الله جرجس",
      nickname: "أبو كيرلس",
      national_id: "28504121470997",
      job: "عامل باليومية",
      salary: "3500 ج.م",
      phone: "01223456789",
      confession_father: "أبونا أنطونيوس",
      insurance_no: "9812450"
    },
    wife: {
      name: "مريم فهيم زكي عبد المسيح",
      nickname: "أم كيرلس",
      national_id: "29011041438585",
      job: "ربة منزل",
      salary: "0",
      phone: "01098765432",
      confession_father: "أبونا يوحنا",
      insurance_no: "غير مؤمن عليها"
    },
    address: {
      street: "شارع النور متفرع من الكنيسة",
      building_no: "12",
      governorate: "القليوبية",
      area: "القلج",
      landmark: "خلف مدرسة الأورمان",
      housing_type: "إيجار قديم (150 ج.م)",
      children_phones: "01234567890",
      notes: "المنزل يحتاج ترميم سقف وحمام"
    },
    gov_programs: {
      has_ration_card: "نعم",
      ration_members_count: "4",
      program_1: "معاش تكافل وكرامة",
      program_2: "خدمات متكاملة"
    }
  },
  page3: {
    family_members: [
      {
        id: "1",
        name: "كيرلس مينا حنا الله",
        national_id: "31005121480859",
        social_status: "أعزب",
        education_job: "الصف الأول الثانوي",
        income: "0",
        confession_father: "أبونا بيشوي"
      },
      {
        id: "2",
        name: "مارينا مينا حنا الله",
        national_id: "31408191459081",
        social_status: "عزباء",
        education_job: "الصف الثالث الإعدادي",
        income: "0",
        confession_father: "أبونا بيشوي"
      }
    ],
    other_persons: [],
    housing_description: "شقة غرفتين وصالة وحمام ومطبخ، غسالة عادية، ثلاجة 10 قدم، بوتاجاز 4 شعلة.",
    medical_conditions: {
      diseases: "الزوج يعاني من انزلاق غضروفي قطني مزمن",
      mental_addiction: "لا يوجد",
      disability: "لا يوجد",
      abandoned_parent: "لا يوجد",
      other_circumstances: "الابن يحتاج نظارة طبية ومتابعة رمد"
    }
  },
  page4: {
    church_aid: [
      { id: "1", church_name: "كنيسة الشهيد أبي سيفين بالقلج", value: 1500, purpose: "مساعدة شهرية إعاشة" },
      { id: "2", church_name: "مطرانية شبرا الخيمة", value: 500, purpose: "مساعدة علاجية" }
    ],
    income: {
      church_aid: "2000",
      medical_aid: "500",
      study_aid: "400",
      base_salary: "3500",
      side_project: "0",
      relatives_aid: "300",
      total_income: "6700 ج.م"
    },
    expenses: {
      living_basics: "4000",
      utilities: "650",
      phone: "200",
      rent: "350",
      medical: "800",
      education: "900",
      total_expenses: "6900 ج.م"
    }
  },
  page5: {
    duration: "سنة كاملة تجدد في أول سبتمبر 2027",
    entry_reason: "ضعف دخل الزوج بسبب العجز الصحي ووجود طالبين في مراحل الشهادات",
    approved_amount: "2000",
    notes: "صرف روشتة علاجية شهرية ومتابعة البحث سنوياً",
    committee_members: ["د. سامح منير", "أ. ميخائيل وديع", "م. رامي فايز"]
  },
  page6: {
    family_head: "مينا حنا الله جرجس",
    church_records_id: "784/2026",
    cathedral_care_id: "CAT-9042",
    church_membership_id: "MEM-1104",
    from_date: "2026/09/01",
    to_date: "2027/08/31",
    aid_ledger: [
      {
        id: "1",
        aid_type: "مساعدة شهرية سبتمبر",
        amount: "2000 ج.م",
        entity: "خزينة الكنيسة",
        date: "2026/09/05",
        recipient_signature: "مينا حنا الله"
      }
    ],
    signatures: ["أمين الخدمة", "أمين الصندوق", "كاهن الرعاية"]
  }
};

/**
 * Deeply validates, normalizes, and merges incoming JSON data with INITIAL_EMPTY_STATE
 * to ensure 100% data integrity without missing keys or crash vectors.
 */
function sanitizeAndMergeCaseData(raw: any): CaseStudyData {
  if (!raw || typeof raw !== "object") {
    return { ...INITIAL_EMPTY_STATE };
  }

  // Handle both page1 and legacy Page1
  const rawP1 = raw.page1 || raw.Page1 || {};
  const page1: CaseStudyData["page1"] = {
    study_date: String(rawP1.study_date || rawP1.studyDate || INITIAL_EMPTY_STATE.page1.study_date || ""),
    church_study_id: String(rawP1.church_study_id || rawP1.churchStudyId || rawP1.study_id || ""),
    church_name: String(rawP1.church_name || rawP1.churchName || INITIAL_EMPTY_STATE.page1.church_name || ""),
    day: String(rawP1.day || ""),
    month: String(rawP1.month || ""),
    year: String(rawP1.year || ""),
    area: String(rawP1.area || ""),
    responsible_priest: String(rawP1.responsible_priest || rawP1.responsiblePriest || ""),
    cathedral_care_id: String(rawP1.cathedral_care_id || rawP1.cathedralCareId || ""),
    church_membership_id: String(rawP1.church_membership_id || rawP1.churchMembershipId || "")
  };

  const rawP2 = raw.page2 || raw.Page2 || {};
  const rawHusband = rawP2.husband || {};
  const rawWife = rawP2.wife || {};
  const rawAddress = rawP2.address || {};
  const rawGov = rawP2.gov_programs || {};

  const page2: CaseStudyData["page2"] = {
    husband: {
      name: String(rawHusband.name || ""),
      nickname: String(rawHusband.nickname || ""),
      national_id: String(rawHusband.national_id || rawHusband.nationalId || ""),
      job: String(rawHusband.job || ""),
      salary: rawHusband.salary ?? "",
      phone: String(rawHusband.phone || ""),
      confession_father: String(rawHusband.confession_father || rawHusband.confessionFather || ""),
      insurance_no: String(rawHusband.insurance_no || rawHusband.insuranceNo || "")
    },
    wife: {
      name: String(rawWife.name || ""),
      nickname: String(rawWife.nickname || ""),
      national_id: String(rawWife.national_id || rawWife.nationalId || ""),
      job: String(rawWife.job || ""),
      salary: rawWife.salary ?? "",
      phone: String(rawWife.phone || ""),
      confession_father: String(rawWife.confession_father || rawWife.confessionFather || ""),
      insurance_no: String(rawWife.insurance_no || rawWife.insuranceNo || "")
    },
    address: {
      street: String(rawAddress.street || ""),
      building_no: String(rawAddress.building_no || rawAddress.buildingNo || ""),
      governorate: String(rawAddress.governorate || ""),
      area: String(rawAddress.area || ""),
      landmark: String(rawAddress.landmark || ""),
      housing_type: String(rawAddress.housing_type || rawAddress.housingType || rawP2.housing_type || ""),
      children_phones: String(rawAddress.children_phones || rawAddress.childrenPhones || ""),
      notes: String(rawAddress.notes || "")
    },
    housing_type: rawP2.housing_type,
    emergency_contacts: Array.isArray(rawP2.emergency_contacts) ? rawP2.emergency_contacts : [],
    gov_programs: {
      has_ration_card: String(rawGov.has_ration_card ?? rawGov.hasRationCard ?? "نعم"),
      ration_members_count: rawGov.ration_members_count ?? rawGov.rationMembersCount ?? "",
      program_1: String(rawGov.program_1 || rawGov.program1 || "بلا"),
      program_2: String(rawGov.program_2 || rawGov.program2 || "بلا")
    }
  };

  const rawP3 = raw.page3 || raw.Page3 || {};
  const rawMed = rawP3.medical_conditions || {};
  const page3: CaseStudyData["page3"] = {
    family_members: Array.isArray(rawP3.family_members)
      ? rawP3.family_members.map((m: any, idx: number) => ({
        id: String(m.id || idx + 1),
        name: String(m.name || ""),
        national_id: String(m.national_id || m.nationalId || ""),
        social_status: String(m.social_status || m.socialStatus || ""),
        education_job: String(m.education_job || m.educationJob || ""),
        income: m.income ?? "",
        confession_father: String(m.confession_father || m.confessionFather || "")
      }))
      : [],
    other_persons: Array.isArray(rawP3.other_persons)
      ? rawP3.other_persons.map((o: any, idx: number) => ({
        id: String(o.id || idx + 1),
        name: String(o.name || ""),
        national_id: String(o.national_id || o.nationalId || ""),
        kinship: String(o.kinship || ""),
        social_status: String(o.social_status || o.socialStatus || "")
      }))
      : [],
    housing_description: String(rawP3.housing_description || ""),
    family_members_notes: String(rawP3.family_members_notes || ""),
    other_members_notes: String(rawP3.other_members_notes || ""),
    medical_conditions: {
      diseases: String(rawMed.diseases || ""),
      continuous_treatment: String(rawMed.continuous_treatment || ""),
      mental_addiction: String(rawMed.mental_addiction || ""),
      disability: String(rawMed.disability || ""),
      abandoned_parent: String(rawMed.abandoned_parent || ""),
      other_circumstances: String(rawMed.other_circumstances || "")
    }
  };

  const rawP4 = raw.page4 || raw.Page4 || {};
  const rawIncome = rawP4.income || {};
  const rawExpenses = rawP4.expenses || {};
  let page4: CaseStudyData["page4"] = {
    church_aid: Array.isArray(rawP4.church_aid)
      ? rawP4.church_aid.map((a: any, idx: number) => ({
        id: String(a.id || idx + 1),
        church_name: String(a.church_name || a.churchName || ""),
        value: Number(a.value) || 0,
        purpose: String(a.purpose || "")
      }))
      : [],
    total_church_aid: rawP4.total_church_aid ?? 0,
    church_aid_total_notes: String(rawP4.church_aid_total_notes || ""),
    income: {
      church_aid: rawIncome.church_aid ?? "",
      medical_aid: rawIncome.medical_aid ?? "",
      study_aid: rawIncome.study_aid ?? "",
      base_salary: rawIncome.base_salary ?? "",
      side_project: rawIncome.side_project ?? "",
      relatives_aid: rawIncome.relatives_aid ?? "",
      total_income: rawIncome.total_income ?? ""
    },
    expenses: {
      living_basics: rawExpenses.living_basics ?? "",
      utilities: rawExpenses.utilities ?? "",
      phone: rawExpenses.phone ?? "",
      rent: rawExpenses.rent ?? "",
      medical: rawExpenses.medical ?? "",
      education: rawExpenses.education ?? "",
      total_expenses: rawExpenses.total_expenses ?? ""
    }
  };
  page4 = recalculatePage4Totals(page4);

  const rawP5 = raw.page5 || raw.Page5 || {};
  const rawComm = Array.isArray(rawP5.committee_members) ? rawP5.committee_members : [];
  const page5: CaseStudyData["page5"] = {
    duration: String(rawP5.duration || ""),
    entry_reason: String(rawP5.entry_reason || ""),
    approved_amount: rawP5.approved_amount ?? "",
    notes: String(rawP5.notes || ""),
    other_notes: String(rawP5.other_notes || ""),
    committee_members: [
      String(rawComm[0] || ""),
      String(rawComm[1] || ""),
      String(rawComm[2] || "")
    ]
  };

  const rawP6 = raw.page6 || raw.Page6 || {};
  const rawSigs = Array.isArray(rawP6.signatures) ? rawP6.signatures : [];
  const page6: CaseStudyData["page6"] = {
    family_head: String(rawP6.family_head || rawP6.head_name || rawHusband.name || rawWife.name || ""),
    church_records_id: String(rawP6.church_records_id || rawP6.church_id || ""),
    cathedral_care_id: String(rawP6.cathedral_care_id || rawP6.care_id || rawP1.cathedral_care_id || ""),
    church_membership_id: String(rawP6.church_membership_id || rawP6.member_id || rawP1.church_membership_id || ""),
    from_date: String(rawP6.from_date || ""),
    to_date: String(rawP6.to_date || ""),
    aid_ledger: Array.isArray(rawP6.aid_ledger)
      ? rawP6.aid_ledger.map((e: any, idx: number) => ({
        id: String(e.id || idx + 1),
        aid_type: String(e.aid_type || ""),
        amount: String(e.amount ?? ""),
        entity: String(e.entity || ""),
        date: String(e.date || ""),
        recipient_signature: String(e.recipient_signature || "")
      }))
      : [],
    signatures: [
      String(rawSigs[0] || ""),
      String(rawSigs[1] || ""),
      String(rawSigs[2] || "")
    ]
  };

  // Extra pages normalization
  const extra_pages: ExtraPage[] = Array.isArray(raw.extra_pages)
    ? raw.extra_pages.map((ep: any, idx: number) => {
      if (ep.type === "id_cards") {
        const imgs = Array.isArray(ep.images) ? [...ep.images] : [];
        while (imgs.length < 8) imgs.push(undefined);
        return {
          id: String(ep.id || `extra-id-${idx}`),
          type: "id_cards",
          title: String(ep.title || `صفحة البطايق (${idx + 1})`),
          images: imgs.slice(0, 8),
          labels: Array.isArray(ep.labels) ? ep.labels : undefined
        } as ExtraIdCardsPage;
      } else if (ep.type === "birth_certs") {
        const imgs = Array.isArray(ep.images) ? [ep.images[0], ep.images[1]] : [undefined, undefined];
        return {
          id: String(ep.id || `extra-bc-${idx}`),
          type: "birth_certs",
          title: String(ep.title || `شهادات الميلاد (${idx + 1})`),
          images: imgs,
          labels: (Array.isArray(ep.labels) && ep.labels.length > 0 && !ep.labels[0].includes("يمين") && !ep.labels[0].includes("شمال"))
            ? ep.labels
            : ["شهادة 1", "شهادة 2"]
        } as ExtraBirthCertsPage;
      } else {
        return {
          id: String(ep.id || `extra-ledger-${idx}`),
          type: "duplicated_ledger",
          title: String(ep.title || `سجل الصرف (متابعة ${idx + 2})`),
          page6Data: ep.page6Data ? { ...page6, ...ep.page6Data } : { ...page6, aid_ledger: [] }
        } as DuplicatedLedgerPage;
      }
    })
    : [];

  return {
    husband_id_image: raw.husband_id_image,
    husband_id_back_image: raw.husband_id_back_image,
    wife_id_image: raw.wife_id_image,
    wife_id_back_image: raw.wife_id_back_image,
    page1,
    page2,
    page3,
    page4,
    page5,
    page6,
    extra_pages
  };
}

/**
 * Saves case data to browser/WebView localStorage safely without crashing if size exceeds quota.
 */
function safeSaveToLocalStorage(caseData: CaseStudyData) {
  // Asynchronously preserve 100% of case data and high-res images in IndexedDB (No 5MB limit)
  saveSessionToIndexedDB(caseData).catch((err) => console.warn("IndexedDB save error:", err));

  try {
    localStorage.setItem("church_care_active_case_data", JSON.stringify(caseData));
  } catch (err) {
    console.warn("localStorage quota exceeded, caching stripped metadata copy in localStorage:", err);
    try {
      const stripped: CaseStudyData = {
        ...caseData,
        husband_id_image: undefined,
        husband_id_back_image: undefined,
        wife_id_image: undefined,
        wife_id_back_image: undefined,
        extra_pages: caseData.extra_pages?.map((ep) => {
          if (ep.type === "id_cards") {
            return { ...ep, images: new Array(8).fill(undefined) };
          }
          if (ep.type === "birth_certs") {
            return { ...ep, images: [undefined, undefined] };
          }
          return ep;
        })
      };
      localStorage.setItem("church_care_active_case_data", JSON.stringify(stripped));
    } catch (innerErr) {
      console.warn("Unable to save even stripped state to localStorage:", innerErr);
    }
  }
}

export const App: React.FC = () => {
  // 🛡️ Hardware-Locked Licensing State
  const [isLicensed, setIsLicensed] = useState<boolean>(false);
  const [isVerifyingLicense, setIsVerifyingLicense] = useState<boolean>(true);
  const [isTransitioningToLock, setIsTransitioningToLock] = useState<boolean>(false);
  const [licensedClientName, setLicensedClientName] = useState<string>("");
  const [showActivationModal, setShowActivationModal] = useState<boolean>(false);
  const [showAboutModal, setShowAboutModal] = useState<boolean>(false);
  const [licenseReason, setLicenseReason] = useState<string | null>(null);

  // Church-Locked Licensing: if license client name starts with "كنيسة", lock church everywhere!
  const isChurchLocked = isLicensed && isChurchNameLocked(licensedClientName);
  const lockedChurchName = isChurchLocked ? getLockedChurchName(licensedClientName) : null;

  // References to prevent heartbeat re-entrance and focus race-conditions
  const isLicensedRef = useRef<boolean>(false);
  const isTransitioningRef = useRef<boolean>(false);
  const isCheckingHeartbeatRef = useRef<boolean>(false);

  useEffect(() => {
    isLicensedRef.current = isLicensed;
  }, [isLicensed]);

  useEffect(() => {
    isTransitioningRef.current = isTransitioningToLock;
  }, [isTransitioningToLock]);

  // Helper function to trigger a smooth cinematic transition into the activation screen
  const handleServerRevocation = (message?: string) => {
    // Prevent duplicate triggers if already un-licensed or already in transition
    if (!isLicensedRef.current || isTransitioningRef.current) return;
    isTransitioningRef.current = true;

    console.warn("🚨 License revoked or reset on server:", message);
    setLicenseReason(message || "تم فك ربط أو إلغاء الترخيص من قبل إدارة النظام.");
    setIsTransitioningToLock(true);

    // After 600ms of smooth blur & modal entrance, unmount workspace completely for zero DOM leakage
    setTimeout(() => {
      setIsLicensed(false);
      setIsTransitioningToLock(false);
      setShowActivationModal(true);
      isLicensedRef.current = false;
      isTransitioningRef.current = false;
    }, 600);
  };

  useEffect(() => {
    // 1. Instant local verification on startup (0ms, offline-safe)
    invoke<{ is_licensed: boolean; client_name: string | null; message: string }>("check_license_status")
      .then((status) => {
        setIsVerifyingLicense(false);
        setIsLicensed(status.is_licensed);
        isLicensedRef.current = status.is_licensed;

        if (status.is_licensed) {
          setLicensedClientName(status.client_name || "");
          setShowActivationModal(false);
          setLicenseReason(null);

          // Trigger asynchronous realtime validation once in background
          invoke<{ is_licensed: boolean; client_name: string | null; message: string }>("check_license_heartbeat")
            .then((heartbeatStatus) => {
              if (!heartbeatStatus.is_licensed && isLicensedRef.current) {
                handleServerRevocation(heartbeatStatus.message);
              }
            })
            .catch(() => { });
        } else {
          setLicenseReason(status.message);
          setShowActivationModal(true);
        }
      })
      .catch((err) => {
        setIsVerifyingLicense(false);
        console.error("License check error:", err);
        setIsLicensed(false);
        isLicensedRef.current = false;
        setLicenseReason("تعذر التحقق من ترخيص البرنامج.");
        setShowActivationModal(true);
      });

    // 2. Realtime Background Heartbeat (every 15 seconds)
    // Synchronizes with Supabase & Microservice cleanly in the background
    const heartbeatInterval = setInterval(() => {
      if (!isLicensedRef.current || isTransitioningRef.current || isCheckingHeartbeatRef.current) {
        return;
      }
      isCheckingHeartbeatRef.current = true;

      invoke<{ is_licensed: boolean; client_name: string | null; message: string }>("check_license_heartbeat")
        .then((heartbeatStatus) => {
          if (!heartbeatStatus.is_licensed && isLicensedRef.current) {
            handleServerRevocation(heartbeatStatus.message);
          }
        })
        .catch((err) => {
          console.error("Heartbeat error:", err);
        })
        .finally(() => {
          isCheckingHeartbeatRef.current = false;
        });
    }, 15000);

    return () => {
      clearInterval(heartbeatInterval);
    };
  }, []);

  // Load saved active case from localStorage or fallback to SAMPLE_STATE
  const [data, setData] = useState<CaseStudyData>(() => {
    try {
      const saved = localStorage.getItem("church_care_active_case_data");
      if (saved) {
        const parsed = JSON.parse(saved);
        return sanitizeAndMergeCaseData(parsed);
      }
    } catch (e) {
      console.error("Failed to load saved case data from localStorage:", e);
    }
    return {
      ...SAMPLE_STATE,
      page4: recalculatePage4Totals(SAMPLE_STATE.page4)
    };
  });

  // Keep church_name strictly synchronized to licensed church if license starts with "كنيسة"
  useEffect(() => {
    if (isChurchLocked && lockedChurchName) {
      setData((prev) => {
        if (prev.page1?.church_name !== lockedChurchName) {
          return {
            ...prev,
            page1: {
              ...prev.page1,
              church_name: lockedChurchName
            }
          };
        }
        return prev;
      });
    }
  }, [isChurchLocked, lockedChurchName]);

  const [activePage, setActivePage] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [appMode, setAppMode] = useState<"form" | "studio">("form");
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [ribbonCollapsed, setRibbonCollapsed] = useState<boolean>(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<string>("تم الحفظ محلياً");
  const [toolsMenuOpen, setToolsMenuOpen] = useState<boolean>(false);
  const toolsMenuRef = useRef<HTMLDivElement | null>(null);
  const [pagesMenuOpen, setPagesMenuOpen] = useState<boolean>(false);
  const pagesMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (toolsMenuRef.current && !toolsMenuRef.current.contains(event.target as Node)) {
        setToolsMenuOpen(false);
      }
      if (pagesMenuRef.current && !pagesMenuRef.current.contains(event.target as Node)) {
        setPagesMenuOpen(false);
      }
    }
    if (toolsMenuOpen || pagesMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [toolsMenuOpen, pagesMenuOpen]);

  // Toast Notification
  const [toast, setToast] = useState<{ message: string; type: "success" | "info" | "error" } | null>(null);
  const showToast = (message: string, type: "success" | "info" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Active File Path Tracking for Instant Ctrl+S Saving
  const [currentFilePath, setCurrentFilePath] = useState<string | null>(null);

  // Restore active case session with high-resolution images from IndexedDB on startup
  useEffect(() => {
    loadSessionFromIndexedDB().then((saved) => {
      if (saved) {
        const sanitized = sanitizeAndMergeCaseData(saved);
        setData(sanitized);
      }
    }).catch((e) => console.warn("Failed to load IndexedDB session:", e));
  }, []);

  // Unified Cropper Modal State (Supports all cards & certificates dynamically)
  const [cropperModal, setCropperModal] = useState<{
    isOpen: boolean;
    binding: string;
    title: string;
    image?: string;
    defaultMode?: "id_card" | "certificate" | "free";
  }>({
    isOpen: false,
    binding: "",
    title: "",
    image: undefined,
    defaultMode: "id_card"
  });

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Master Default Document Layout with version synchronization
  const MASTER_LAYOUT_VERSION = "2026.09.16-p4-larger-fonts-v11";
  const [layout, setLayout] = useState<DocumentLayout>(() => {
    try {
      const storedVersion = localStorage.getItem("church_care_doc_layout_version");
      if (storedVersion === MASTER_LAYOUT_VERSION) {
        const saved = localStorage.getItem("church_care_doc_layout");
        if (saved) return JSON.parse(saved);
      } else {
        localStorage.setItem("church_care_doc_layout_version", MASTER_LAYOUT_VERSION);
        localStorage.setItem("church_care_doc_layout", JSON.stringify(DEFAULT_DOCUMENT_LAYOUT));
        return DEFAULT_DOCUMENT_LAYOUT;
      }
    } catch (e) {
      console.error("Failed to load saved layout from localStorage:", e);
    }
    return DEFAULT_DOCUMENT_LAYOUT;
  });

  const handleSaveLayout = (newLayout: DocumentLayout) => {
    setLayout(newLayout);
    try {
      localStorage.setItem("church_care_doc_layout_version", MASTER_LAYOUT_VERSION);
      localStorage.setItem("church_care_doc_layout", JSON.stringify(newLayout));
      showToast("تم حفظ إحداثيات وتصميم الحقول بنجاح!");
    } catch (e) {
      console.error("Failed to save layout to localStorage:", e);
    }
  };

  const { generatePdf, isGenerating, lastResult } = useSidecar();

  const [highlightedFieldId, setHighlightedFieldId] = useState<string | null>(null);
  const [validationAlert, setValidationAlert] = useState<{
    message: string;
    fieldLabel: string;
    page: number;
    fieldId: string;
  } | null>(null);

  const handleUpdate = (updated: Partial<CaseStudyData>) => {
    setData((prev) => {
      let next = { ...prev, ...updated };
      if (isChurchLocked && lockedChurchName && next.page1) {
        next.page1 = {
          ...next.page1,
          church_name: lockedChurchName
        };
      }
      if (updated.page4) {
        next.page4 = recalculatePage4Totals(next.page4);
      }
      return next;
    });
    setHasUnsavedChanges(true);
    setSaveStatus("تعديلات غير محفوظة (Ctrl+S للحفظ)");
  };

  // Safe path value reader
  const getValueByPath = (obj: any, path: string): any => {
    if (!path || !obj) return "";
    if (obj[path] !== undefined && obj[path] !== null && obj[path] !== "") return obj[path];
    const parts = path.replace(/\[/g, ".").replace(/\]/g, "").split(".").filter(Boolean);
    let current = obj;
    for (const part of parts) {
      if (current == null) return "";
      current = current[part];
    }
    return current ?? "";
  };

  // Real-time National ID Validation across all pages
  const validationErrors = useMemo(() => {
    const errs: {
      page: number;
      fieldId: string;
      label: string;
      binding: string;
      message: string;
      currentValue: string;
    }[] = [];

    for (let p = 1; p <= 6; p++) {
      const pageFields = layout[p] || [];
      for (const field of pageFields) {
        if (field.binding.includes("national_id") || field.binding.includes("nid")) {
          const val = getValueByPath(data, field.binding);
          const str = String(val || "").trim();
          if (str.length > 0) {
            const info = parseEgyptianNationalId(str);
            if (!info.isValid) {
              errs.push({
                page: p,
                fieldId: field.id,
                label: field.label || "الرقم القومي",
                binding: field.binding,
                message: info.errorMessage || "الرقم القومي غير صحيح",
                currentValue: str
              });
            }
          }
        }
      }
    }
    return errs;
  }, [data, layout]);

  // Navigate user automatically to the erroneous field and focus it
  const navigateToError = (err: { page: number; fieldId: string; label?: string; message?: string }) => {
    setActivePage(err.page);
    setHighlightedFieldId(err.fieldId);
    if (err.message) {
      setValidationAlert({
        page: err.page,
        fieldId: err.fieldId,
        fieldLabel: err.label || "الرقم القومي",
        message: err.message
      });
    }
    setTimeout(() => {
      setHighlightedFieldId(null);
    }, 4500);
  };

  // Explicit Save Feature (حفظ مباشر وسريع Ctrl+S)
  const handleSave = async () => {
    const isTauri =
      typeof window !== "undefined" &&
      ("__TAURI_INTERNALS__" in window || "__TAURI__" in window);

    // If an active file is open or was previously saved, save directly to it
    if (isTauri && currentFilePath) {
      try {
        const { invoke } = await import("@tauri-apps/api/core");
        const jsonStr = JSON.stringify(data, null, 2);
        await invoke("save_text_file", { path: currentFilePath, content: jsonStr });

        safeSaveToLocalStorage(data);
        setHasUnsavedChanges(false);
        const fileName = currentFilePath.split(/[\/\\]/).pop() || currentFilePath;
        const now = new Date();
        const timeStr = now.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });
        const imgCount = countEmbeddedImages(data);
        setSaveStatus(`تم الحفظ (${timeStr})`);
        showToast(`تم حفظ التعديلات في ملف الحالة (${fileName}) بنجاح متضمناً ${imgCount} صورة مدمجة!`, "success");
        return;
      } catch (e: any) {
        console.error("Direct save error:", e);
      }
    }

    // If no file opened yet, open Save As dialog
    if (isTauri && !currentFilePath) {
      handleSaveAs();
      return;
    }

    // Web Fallback
    try {
      safeSaveToLocalStorage(data);
      setHasUnsavedChanges(false);
      const now = new Date();
      const timeStr = now.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });
      setSaveStatus(`تم الحفظ (${timeStr})`);
      showToast("تم حفظ الاستمارة بنجاح (Ctrl+S)", "success");
    } catch (e) {
      console.error("Save error:", e);
      showToast("تعذر الحفظ في الذاكرة المحلية", "error");
    }
  };

  // Explicit Save As Feature (حفظ دراسة الحالة بصيغة .care المخصصة أو JSON)
  const handleSaveAs = async (forceJson: boolean = false) => {
    const isTauri =
      typeof window !== "undefined" &&
      ("__TAURI_INTERNALS__" in window || "__TAURI__" in window);

    const ext = forceJson ? "json" : "care";
    const defaultFileName = getCaseStudyFileName(data, ext);
    const jsonStr = JSON.stringify(data, null, 2);

    if (isTauri) {
      try {
        const { save } = await import("@tauri-apps/plugin-dialog");
        const { invoke } = await import("@tauri-apps/api/core");

        const chosenPath = await save({
          defaultPath: defaultFileName,
          filters: forceJson
            ? [
              { name: "ملفات استمارة البحث JSON (*.json)", extensions: ["json"] },
              { name: "ملفات دراسة الحالة الكنسية (*.care)", extensions: ["care"] }
            ]
            : [
              { name: "ملفات دراسة الحالة الكنسية (*.care)", extensions: ["care"] },
              { name: "ملفات استمارة البحث JSON (*.json)", extensions: ["json"] },
              { name: "كافة ملفات الحالات (*.care, *.json)", extensions: ["care", "json"] }
            ]
        });

        if (!chosenPath) {
          // User closed or cancelled the dialog
          return;
        }

        // Use native Rust file writing command (bypasses all sandbox/scope limitations)
        await invoke("save_text_file", { path: chosenPath, content: jsonStr });

        setCurrentFilePath(chosenPath);
        safeSaveToLocalStorage(data);
        setHasUnsavedChanges(false);
        const fileName = chosenPath.split(/[\/\\]/).pop() || chosenPath;
        const imgCount = countEmbeddedImages(data);
        setSaveStatus("تم الحفظ في ملف");
        showToast(`تم حفظ ملف الحالة (${fileName}) بنجاح مع تضمين كافة الصور والبطاقات (${imgCount} صورة مدمجة)!`, "success");
        return;
      } catch (e: any) {
        console.error("Tauri save error:", e);
        showToast(`فشل حفظ الملف: ${e?.message || e}`, "error");
        return;
      }
    }

    // Web Browser Fallback
    try {
      const blob = new Blob([jsonStr], { type: "application/json;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = defaultFileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      safeSaveToLocalStorage(data);
      setHasUnsavedChanges(false);
      const imgCount = countEmbeddedImages(data);
      setSaveStatus(`تم حفظ ملف .${ext}`);
      showToast(`تم تنزيل ملف الحالة (.${ext}) متضمناً ${imgCount} صورة بنجاح!`, "success");
    } catch (err: any) {
      showToast("تعذر تنزيل الملف في المتصفح", "error");
    }
  };

  // Export 300 DPI PDF with strict validation protection and dynamic layout
  const handleExport = async () => {
    if (validationErrors.length > 0) {
      const firstErr = validationErrors[0];
      navigateToError(firstErr);
      return;
    }
    setValidationAlert(null);

    const isTauri =
      typeof window !== "undefined" &&
      ("__TAURI_INTERNALS__" in window || "__TAURI__" in window);

    const defaultFileName = getCaseStudyFileName(data, "pdf");

    let chosenPath = `/Users/saitama/Downloads/${defaultFileName}`;

    if (isTauri) {
      try {
        const { save } = await import("@tauri-apps/plugin-dialog");
        const selected = await save({
          defaultPath: defaultFileName,
          filters: [{ name: "ملفات PDF للطباعة (300 DPI)", extensions: ["pdf"] }]
        });
        if (!selected) {
          return; // User cancelled file picker
        }
        chosenPath = selected;
      } catch (e: any) {
        console.warn("Tauri save dialog fallback:", e);
      }
    }

    const res = await generatePdf(data, chosenPath, undefined, layout);
    if (res.status === "success") {
      showToast(`تم تصدير ملف الـ PDF بنجاح بدقة طباعة 300 DPI في: ${chosenPath}`, "success");
    } else {
      showToast(res.errorMessage || "حدث خطأ أثناء تصدير الملف", "error");
    }
  };

  // Keyboard Shortcuts (Ctrl+S: Save, Ctrl+Shift+S: Save As, Ctrl+O: Open, Arrow keys: page navigation)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT";

      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "s") {
        e.preventDefault();
        handleSaveAs();
        return;
      }

      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key.toLowerCase() === "s") {
        e.preventDefault();
        handleSave();
        return;
      }

      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key.toLowerCase() === "o") {
        e.preventDefault();
        handleOpenJson();
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "p") {
        e.preventDefault();
        handleExport();
        return;
      }

      if (!isInput) {
        const totalPages = 6 + (data.extra_pages?.length || 0);
        if (e.key === "ArrowLeft") {
          e.preventDefault();
          setActivePage((p) => Math.min(totalPages, p + 1));
        } else if (e.key === "ArrowRight") {
          e.preventDefault();
          setActivePage((p) => Math.max(1, p - 1));
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [data, validationErrors]);

  // Explicit Open Case File Feature (فتح ملف دراسة الحالة .care أو .json)
  const handleOpenJson = async () => {
    const isTauri =
      typeof window !== "undefined" &&
      ("__TAURI_INTERNALS__" in window || "__TAURI__" in window);

    if (isTauri) {
      try {
        const { open } = await import("@tauri-apps/plugin-dialog");
        const { invoke } = await import("@tauri-apps/api/core");

        const selected = await open({
          multiple: false,
          directory: false,
          filters: [
            { name: "كافة ملفات الحالات (*.care, *.json)", extensions: ["care", "json"] },
            { name: "ملفات دراسة الحالة الكنسية (*.care)", extensions: ["care"] },
            { name: "ملفات استمارة البحث JSON (*.json)", extensions: ["json"] }
          ]
        });

        if (!selected) {
          // User cancelled or closed the file picker
          return;
        }

        const filePath = typeof selected === "string" ? selected : (selected as any).path;
        if (!filePath) return;

        const fileContent = await invoke<string>("read_text_file", { path: filePath });
        if (!fileContent || !fileContent.trim()) {
          showToast("الملف المحدد فارغ!", "error");
          return;
        }

        let parsed: any;
        try {
          parsed = JSON.parse(fileContent);
        } catch (parseErr) {
          showToast("الملف المحدد غير صالح أو تالف (ليس بتنسيق .care / JSON صحيح)", "error");
          return;
        }

        const sanitized = sanitizeAndMergeCaseData(parsed);
        if (isChurchLocked && lockedChurchName) {
          sanitized.page1.church_name = lockedChurchName;
        }
        setData(sanitized);
        setCurrentFilePath(filePath);
        safeSaveToLocalStorage(sanitized);
        setHasUnsavedChanges(false);
        setActivePage(1);

        const fileName = filePath.split(/[\/\\]/).pop() || filePath;
        const headName = getHeadOfHouseholdName(sanitized) || "الحالة";
        const imgCount = countEmbeddedImages(sanitized);
        showToast(`تم فتح ملف الحالة بنجاح (${headName}): ${fileName} [مضمن به ${imgCount} صورة]`, "success");
        return;
      } catch (e: any) {
        console.error("Tauri open error:", e);
        showToast(`فشل فتح الملف: ${e?.message || e}`, "error");
        return;
      }
    }

    // Web Fallback: Click hidden file input
    fileInputRef.current?.click();
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const rawText = ev.target?.result as string;
          const parsed = JSON.parse(rawText);
          const sanitized = sanitizeAndMergeCaseData(parsed);
          if (isChurchLocked && lockedChurchName) {
            sanitized.page1.church_name = lockedChurchName;
          }
          setData(sanitized);
          safeSaveToLocalStorage(sanitized);
          setHasUnsavedChanges(false);
          setActivePage(1);

          const headName = getHeadOfHouseholdName(sanitized) || "الحالة";
          showToast(`تم استيراد ملف الحالة بنجاح (${headName})`, "success");
        } catch (err) {
          showToast("تعذر قراءة ملف JSON، يرجى التأكد من صحة الملف", "error");
        }
      };
      reader.readAsText(file);
    }
    // Always reset input value to allow opening the same file again cleanly
    e.target.value = "";
  };

  // Page 1 Helper Actions
  const handleSetToday = () => {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, "0");
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const year = String(now.getFullYear());
    const formatted = `${year}/${month}/${day}`;

    setData((prev) => ({
      ...prev,
      page1: {
        ...prev.page1,
        day,
        month,
        year,
        study_date: formatted
      }
    }));
    setHasUnsavedChanges(true);
    showToast(`تم تعيين تاريخ اليوم: ${formatted}`);
  };

  // Page Completion Stats Calculation
  const pageStats = useMemo(() => {
    // Page 1
    const p1 = data.page1;
    let p1Count = 0;
    if (p1.church_study_id) p1Count++;
    if (p1.church_name) p1Count++;
    if (p1.area) p1Count++;
    if (p1.responsible_priest) p1Count++;
    if (data.husband_id_image) p1Count++;
    if (data.husband_id_back_image) p1Count++;
    if (data.wife_id_image) p1Count++;
    if (data.wife_id_back_image) p1Count++;
    const p1Pct = Math.round((p1Count / 8) * 100);

    // Page 2
    const p2 = data.page2;
    let p2Count = 0;
    if (p2.husband.name) p2Count++;
    if (p2.husband.national_id) p2Count++;
    if (p2.wife.name) p2Count++;
    if (p2.wife.national_id) p2Count++;
    if (p2.address.street) p2Count++;
    const p2Pct = Math.round((p2Count / 5) * 100);

    // Page 3
    const p3 = data.page3;
    const p3Pct = (p3.family_members?.length || 0) > 0 || p3.housing_description ? 100 : 30;

    // Page 4
    const p4 = data.page4;
    const p4Pct = p4.income.total_income || p4.expenses.total_expenses ? 100 : 20;

    // Page 5
    const p5 = data.page5;
    const p5Pct = p5.approved_amount || p5.entry_reason ? 100 : 20;

    // Page 6
    const p6 = data.page6;
    const p6Pct = (p6.aid_ledger?.length || 0) > 0 || p6.family_head ? 100 : 20;

    const overall = Math.round((p1Pct + p2Pct + p3Pct + p4Pct + p5Pct + p6Pct) / 6);

    return {
      pages: [p1Pct, p2Pct, p3Pct, p4Pct, p5Pct, p6Pct],
      overall
    };
  }, [data]);

  // Duplicate Last Page Handler
  const handleDuplicateLastPage = () => {
    const nextTotal = 6 + (data.extra_pages?.length || 0) + 1;
    let newExtraPage: ExtraPage;

    if (!data.extra_pages || data.extra_pages.length === 0) {
      newExtraPage = {
        id: `duplicated_ledger_${Date.now()}`,
        type: "duplicated_ledger",
        title: `سجل الصرف (متابعة 2)`,
        page6Data: {
          ...data.page6,
          from_date: "",
          to_date: "",
          aid_ledger: []
        }
      };
    } else {
      const lastExtra = data.extra_pages[data.extra_pages.length - 1];
      if (lastExtra.type === "duplicated_ledger") {
        newExtraPage = {
          id: `duplicated_ledger_${Date.now()}`,
          type: "duplicated_ledger",
          title: `سجل الصرف (متابعة ${data.extra_pages.length + 2})`,
          page6Data: {
            ...lastExtra.page6Data,
            from_date: "",
            to_date: "",
            aid_ledger: []
          }
        };
      } else if (lastExtra.type === "id_cards") {
        newExtraPage = {
          id: `id_cards_${Date.now()}`,
          type: "id_cards",
          title: `صفحة البطايق (${data.extra_pages.length + 1})`,
          images: Array(8).fill(undefined),
          labels: [
            "بطاقة 1 (الوجه)", "بطاقة 1 (الظهر)",
            "بطاقة 2 (الوجه)", "بطاقة 2 (الظهر)",
            "بطاقة 3 (الوجه)", "بطاقة 3 (الظهر)",
            "بطاقة 4 (الوجه)", "بطاقة 4 (الظهر)"
          ]
        };
      } else {
        newExtraPage = {
          id: `birth_certs_${Date.now()}`,
          type: "birth_certs",
          title: `شهادات الميلاد (${data.extra_pages.length + 1})`,
          images: [undefined, undefined],
          labels: ["شهادة 1", "شهادة 2"]
        };
      }
    }

    const updated = [...(data.extra_pages || []), newExtraPage];
    setData((prev) => ({ ...prev, extra_pages: updated }));
    setActivePage(nextTotal);
    setHasUnsavedChanges(true);
    showToast(`تمت إضافة وتكرار صفحة جديدة (صفحة ${nextTotal}) بنجاح!`, "success");
  };

  // Add ID Cards Page (Vertical, 8 boxes)
  const handleAddIdCardsPage = () => {
    const nextTotal = 6 + (data.extra_pages?.length || 0) + 1;
    const newPage: ExtraIdCardsPage = {
      id: `id_cards_${Date.now()}`,
      type: "id_cards",
      title: "صفحة البطايق",
      images: Array(8).fill(undefined),
      labels: [
        "بطاقة 1 (الوجه)", "بطاقة 1 (الظهر)",
        "بطاقة 2 (الوجه)", "بطاقة 2 (الظهر)",
        "بطاقة 3 (الوجه)", "بطاقة 3 (الظهر)",
        "بطاقة 4 (الوجه)", "بطاقة 4 (الظهر)"
      ]
    };
    const updated = [...(data.extra_pages || []), newPage];
    setData((prev) => ({ ...prev, extra_pages: updated }));
    setActivePage(nextTotal);
    setHasUnsavedChanges(true);
    showToast(`تمت إضافة صفحة البطايق (8 بطاقات - رأسي) برقم ${nextTotal}!`, "success");
  };

  // Add Birth Certificates Page (Portrait A4, 2 stacked boxes)
  const handleAddBirthCertsPage = () => {
    const nextTotal = 6 + (data.extra_pages?.length || 0) + 1;
    const newPage: ExtraBirthCertsPage = {
      id: `birth_certs_${Date.now()}`,
      type: "birth_certs",
      title: "شهادات الميلاد (رأسي)",
      images: [undefined, undefined],
      labels: ["شهادة 1 (النصف العلوي)", "شهادة 2 (النصف السفلي)"]
    };
    const updated = [...(data.extra_pages || []), newPage];
    setData((prev) => ({ ...prev, extra_pages: updated }));
    setActivePage(nextTotal);
    setHasUnsavedChanges(true);
    showToast(`تمت إضافة صفحة شهادات الميلاد (A4 رأسي للطباعة) برقم ${nextTotal}!`, "success");
  };

  // Delete Extra Page
  const handleDeleteExtraPage = (extraPageIndex: number) => {
    if (!window.confirm("هل أنت متأكد من رغبتك في حذف هذه الصفحة؟")) return;
    const updated = [...(data.extra_pages || [])];
    updated.splice(extraPageIndex, 1);
    setData((prev) => ({ ...prev, extra_pages: updated }));
    setActivePage((prev) => Math.max(1, Math.min(prev, 6 + updated.length)));
    setHasUnsavedChanges(true);
    showToast("تم حذف الصفحة الإضافية بنجاح", "info");
  };

  const pages = useMemo(() => {
    const basePages = [
      { id: 1, title: "1. الأساسية والبطاقات", sub: "البيانات وبطاقات الرقم القومي", icon: Home, isDeletable: false, extraIdx: -1 },
      { id: 2, title: "2. الزوجان والسكن", sub: "الزوجان والبيانات والتموين", icon: Users, isDeletable: false, extraIdx: -1 },
      { id: 3, title: "3. الأبناء والحالة", sub: "الأبناء والحالة الصحية", icon: UserCheck, isDeletable: false, extraIdx: -1 },
      { id: 4, title: "4. المساعدات والميزانية", sub: "مساعدات الكنائس والدخل", icon: Coins, isDeletable: false, extraIdx: -1 },
      { id: 5, title: "5. قرارات اللجنة", sub: "توصيات وموافقة اللجنة", icon: Scale, isDeletable: false, extraIdx: -1 },
      { id: 6, title: "6. سجل المساعدات الشهرية", sub: "سجل الصرف والتوقيعات", icon: FileSignature, isDeletable: false, extraIdx: -1 }
    ];

    const extraItems = (data.extra_pages || []).map((ep, idx) => {
      const pageId = 7 + idx;
      let icon = CopyPlus;
      let sub = "سجل صرف إضافي";
      if (ep.type === "id_cards") {
        icon = CreditCard;
        sub = "8 بطاقات رقم قومي (عمودي)";
      } else if (ep.type === "birth_certs") {
        icon = FileSpreadsheet;
        sub = "شهادات الميلاد (أفقي)";
      }

      return {
        id: pageId,
        title: `${pageId}. ${ep.title}`,
        sub,
        icon,
        isDeletable: true,
        extraIdx: idx
      };
    });

    return [...basePages, ...extraItems];
  }, [data.extra_pages]);

  // 🛡️ ZERO DOM LEAKAGE GATE:
  // If verifying or unlicensed, DO NOT RENDER A SINGLE PIXEL OR ELEMENT of the application workspace!
  if (isVerifyingLicense) {
    return (
      <div dir="rtl" className="h-screen w-screen bg-slate-950 flex flex-col items-center justify-center text-white select-none font-['IBM_Plex_Sans_Arabic']">
        <div className="w-16 h-16 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-4 animate-pulse">
          <ShieldCheck className="w-9 h-9" />
        </div>
        <p className="text-base font-bold text-white mb-1">خدمة القلب المتسع</p>
        <p className="text-xs text-slate-400">جاري التحقق من أمان الترخيص المشفر بالعتاد...</p>
      </div>
    );
  }

  if (!isLicensed && !isTransitioningToLock) {
    return (
      <div dir="rtl" className="h-screen w-screen bg-slate-950 flex items-center justify-center p-4 select-none font-['IBM_Plex_Sans_Arabic']">
        {/* ONLY ActivationModal exists in the DOM tree. The app workspace, canvas, forms, and data DO NOT EXIST IN DOM. */}
        <ActivationModal
          isOpen={true}
          reason={licenseReason}
          onActivated={(clientName) => {
            setIsLicensed(true);
            isLicensedRef.current = true;
            isTransitioningRef.current = false;
            setLicensedClientName(clientName);
            setLicenseReason(null);
            setShowActivationModal(false);
            showToast(`تم تفعيل البرنامج بنجاح (${clientName})!`, "success");
          }}
        />
      </div>
    );
  }

  // If in Visual Studio mode, render the Drag-and-Drop Studio directly
  if (appMode === "studio") {
    return (
      <VisualCoordinateStudio
        layout={layout}
        onSaveLayout={handleSaveLayout}
        onCloseStudio={() => setAppMode("form")}
        currentPage={activePage}
      />
    );
  }

  return (
    <div
      dir="rtl"
      className={`h-screen w-screen overflow-hidden bg-slate-950 text-slate-100 font-['IBM_Plex_Sans_Arabic'] flex flex-col antialiased selection:bg-amber-500 selection:text-black transition-all duration-700 ease-out relative ${isTransitioningToLock ? "filter blur-xl scale-95 opacity-25 pointer-events-none" : "animate-in fade-in duration-500"
        }`}
    >
      {/* If currently transitioning to lock, render the ActivationModal overlay on top smoothly */}
      {isTransitioningToLock && (
        <ActivationModal
          isOpen={true}
          reason={licenseReason}
          onActivated={(clientName) => {
            setIsLicensed(true);
            isLicensedRef.current = true;
            isTransitioningRef.current = false;
            setLicensedClientName(clientName);
            setLicenseReason(null);
            setIsTransitioningToLock(false);
            setShowActivationModal(false);
            showToast(`تم تفعيل البرنامج بنجاح (${clientName})!`, "success");
          }}
        />
      )}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileImport}
        accept=".care,.json"
        className="hidden"
      />

      {/* ==================================================================== */}
      {/* 1. ELEGANT STREAMLINED APPLICATION HEADER                           */}
      {/* ==================================================================== */}
      {/* ==================================================================== */}
      {/* 1. MICROSOFT WORD / OFFICE 365 TOP TITLE BAR                         */}
      {/* ==================================================================== */}
      <div className="h-10 bg-slate-900 border-b border-slate-800 px-3 flex items-center justify-between select-none z-40 shrink-0 text-xs">
        {/* Right (RTL): App Emblem, Quick Save & Auto-Save */}
        <div className="flex items-center gap-2.5 whitespace-nowrap shrink-0">
          <div 
            onClick={() => setShowAboutModal(true)}
            className="flex items-center gap-2 cursor-pointer group"
            title="حول البرنامج ومعلومات الترخيص"
          >
            <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center text-slate-950 font-bold shadow-sm group-hover:scale-105 transition-transform">
              <HeartHandshake className="w-3.5 h-3.5" />
            </div>
            <span className="font-bold text-white tracking-wide text-xs group-hover:text-amber-300 transition-colors">
              خدمة أخوة الرب
            </span>
          </div>

          <div className="h-3.5 w-px bg-slate-800" />

          {/* Quick Save Button (Word Quick Access) */}
          <button
            type="button"
            onClick={handleSave}
            className="p-1 rounded hover:bg-slate-800 text-slate-300 hover:text-amber-400 transition-colors cursor-pointer"
            title="حفظ سريع (Ctrl+S)"
          >
            <Save className="w-3.5 h-3.5 text-amber-400" />
          </button>

          {/* Auto-save status indicator */}
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-950/70 border border-slate-800 text-[10px] text-slate-400 font-medium">
            <span className={`w-1.5 h-1.5 rounded-full ${hasUnsavedChanges ? "bg-amber-400 animate-pulse" : "bg-emerald-400"}`} />
            <span>{hasUnsavedChanges ? "تعديلات غير محفوظة" : "حفظ تلقائي: تم الحفظ"}</span>
          </div>
        </div>

        {/* Center: Document Title & Church Name (Word Document Titlebar) */}
        <div className="hidden md:flex items-center justify-center gap-2 text-xs font-semibold text-slate-300 flex-1 px-4 truncate">
          <span className="text-white font-bold truncate max-w-sm">
            {lockedChurchName || data.page1.church_name || "كنيسة معتمدة"}
          </span>
          <span className="text-slate-600">•</span>
          <span className="text-slate-300 text-[11px] font-mono font-bold whitespace-nowrap">
            دراسة حالة #{data.page1.church_study_id || "784/2026"}
          </span>
          <span className="text-slate-600">•</span>
          <span className="text-amber-300 text-[11px] font-bold truncate max-w-[220px] flex items-center gap-1">
            <Users className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>{getHeadOfHouseholdName(data) ? `رب الأسرة: ${getHeadOfHouseholdName(data)}` : "حالة جديدة"}</span>
          </span>
          <span className="text-slate-600">•</span>
          <span className="text-[10px] bg-amber-500/15 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-medium whitespace-nowrap">
            القلب المتسع 2026
          </span>
        </div>

        {/* Left (RTL): License badge & Window/About action */}
        <div className="flex items-center gap-2 whitespace-nowrap shrink-0">
          <button
            type="button"
            onClick={() => setShowAboutModal(true)}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-950/80 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer text-[11px]"
            title="بيانات ترخيص البرنامج والإصدار"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span className="max-w-[160px] truncate">{licensedClientName || "ترخيص معتمد"}</span>
          </button>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 2. MICROSOFT WORD RIBBON TABS STRIP                                  */}
      {/* ==================================================================== */}
      <div className="h-9 bg-slate-950 border-b border-slate-800 px-3 flex items-center justify-between select-none z-30 shrink-0">
        <div className="flex items-center h-full overflow-x-auto scrollbar-none">
          {/* Form Pages Tabs (Word-style navigation) */}
          <nav className="flex items-center h-full pr-1">
            {pages.map((p) => {
              const Icon = p.icon;
              const isActive = activePage === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setActivePage(p.id)}
                  className={`h-full px-3 text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 border-b-2 whitespace-nowrap ${isActive
                    ? "bg-slate-900 text-amber-400 font-bold border-amber-400"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/50 border-transparent"
                    }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? "text-amber-400" : "text-slate-400"}`} />
                  <span>{p.title}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Left (RTL): Status badge & Navigation Pane toggle */}
        <div className="flex items-center gap-2 shrink-0">
          {validationErrors.length === 0 ? (
            <span className="hidden sm:flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/40 font-medium whitespace-nowrap">
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              <span>مدققة ✓</span>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => navigateToError(validationErrors[0])}
              className="flex items-center gap-1 text-[11px] font-bold text-rose-300 bg-rose-950/70 hover:bg-rose-900/80 px-2.5 py-0.5 rounded border border-rose-600/60 shadow-sm cursor-pointer whitespace-nowrap"
              title="انقر لتصحيح الرقم القومي"
            >
              <AlertTriangle className="w-3 h-3 text-rose-400" />
              <span>{validationErrors.length} رقم به خطأ</span>
            </button>
          )}

          <div className="h-3.5 w-px bg-slate-800" />

          {/* Word-Style Navigation Pane Toggle */}
          <button
            type="button"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${sidebarOpen
              ? "bg-slate-800 text-amber-400 border border-slate-700"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent"
              }`}
            title="إظهار / إخفاء لوحة التنقل (Navigation Pane)"
          >
            {sidebarOpen ? <PanelRightClose className="w-3.5 h-3.5" /> : <PanelRightOpen className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">لوحة التنقل</span>
          </button>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 3. MICROSOFT WORD / OFFICE COMMAND RIBBON (The Command Toolbar)      */}
      {/* ==================================================================== */}
      {!ribbonCollapsed ? (
        <div className="h-20 bg-slate-900/95 border-b border-slate-800 px-3 flex items-stretch justify-between select-none z-20 shrink-0 backdrop-blur-md overflow-x-auto scrollbar-none">
          <div className="flex items-stretch gap-1">
            {/* Group 1: Document & Files (المستند والملفات) */}
            <div className="flex flex-col justify-between py-1 px-2 border-l border-slate-800">
              <div className="flex items-center gap-1.5 flex-1">
                {/* Hero CTA Button: Export PDF 300 DPI */}
                <button
                  type="button"
                  disabled={isGenerating}
                  onClick={handleExport}
                  className="flex flex-col items-center justify-center px-4 py-1 rounded-xl bg-gradient-to-b from-amber-400 via-amber-300 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-bold shadow-md shadow-amber-500/20 ring-1 ring-amber-300/50 cursor-pointer active:scale-98 transition-all disabled:opacity-50 h-[48px]"
                  title="تصدير استمارة البحث الرسمية كملف PDF مفرود وجاهز للطباعة بدقة 300 DPI"
                >
                  <FileDown className={`w-4 h-4 ${isGenerating ? "animate-bounce" : ""}`} />
                  <span className="text-[11px] font-bold mt-0.5 whitespace-nowrap">
                    {isGenerating ? "جارٍ التصدير..." : "تصدير PDF"}
                  </span>
                </button>

                {/* Save Study Button */}
                <button
                  type="button"
                  onClick={handleSave}
                  className="flex flex-col items-center justify-center px-3 py-1 rounded-xl bg-slate-950/70 hover:bg-slate-800 text-slate-200 hover:text-amber-400 border border-slate-800 cursor-pointer transition-colors h-[48px]"
                  title="حفظ التعديلات في ذاكرة البرنامج (Ctrl+S)"
                >
                  <Save className="w-4 h-4 text-amber-400" />
                  <span className="text-[10px] font-semibold mt-0.5 whitespace-nowrap">حفظ (Ctrl+S)</span>
                </button>

                {/* Open Study Button */}
                <button
                  type="button"
                  onClick={handleOpenJson}
                  className="flex flex-col items-center justify-center px-3 py-1 rounded-xl bg-slate-950/70 hover:bg-slate-800 text-slate-200 hover:text-sky-300 border border-slate-800 cursor-pointer transition-colors h-[48px]"
                  title="فتح واستيراد ملف دراسة حالة (Ctrl+O)"
                >
                  <FolderOpen className="w-4 h-4 text-sky-400" />
                  <span className="text-[10px] font-semibold mt-0.5 whitespace-nowrap">فتح (Ctrl+O)</span>
                </button>

                {/* Reset / New Form Button */}
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm("هل أنت متأكد من رغبتك في تفريغ كافة الحقول والبدء باستمارة جديدة؟\n(يُفضل حفظ نسخة من الملف الحالي أولاً إذا كنت ترغب بالاحتفاظ ببياناته)")) {
                      const newEmpty = {
                        ...INITIAL_EMPTY_STATE,
                        page1: {
                          ...INITIAL_EMPTY_STATE.page1,
                          church_name: (isChurchLocked && lockedChurchName) ? lockedChurchName : INITIAL_EMPTY_STATE.page1.church_name
                        }
                      };
                      setData(newEmpty);
                      safeSaveToLocalStorage(newEmpty);
                      setHasUnsavedChanges(false);
                      showToast("تم تفريغ كافة الحقول والبدء باستمارة جديدة بنجاح", "info");
                    }
                  }}
                  className="flex flex-col items-center justify-center px-2.5 py-1 rounded-xl bg-slate-950/70 hover:bg-rose-950/30 text-slate-400 hover:text-rose-300 border border-slate-800 cursor-pointer transition-colors h-[48px]"
                  title="تفريغ كافة الحقول والبدء باستمارة فارغة"
                >
                  <RotateCcw className="w-4 h-4 text-rose-400/80" />
                  <span className="text-[10px] font-semibold mt-0.5 whitespace-nowrap">جديد</span>
                </button>
              </div>
              <span className="text-[9px] text-slate-400 text-center font-semibold block mt-0.5 pt-0.5 border-t border-slate-800/40">المستند والملفات</span>
            </div>

            {/* Group 2: Insert Pages (إدراج وتكرار صفحات) */}
            <div className="flex flex-col justify-between py-1 px-2 border-l border-slate-800">
              <div className="flex items-center gap-1.5 flex-1">
                <button
                  type="button"
                  onClick={handleDuplicateLastPage}
                  className="flex flex-col items-center justify-center px-3 py-1 rounded-xl bg-slate-950/70 hover:bg-emerald-950/40 text-slate-200 hover:text-emerald-300 border border-slate-800 hover:border-emerald-500/40 transition-all cursor-pointer h-[48px]"
                  title="تكرار سجل المساعدات لشهر جديد"
                >
                  <CopyPlus className="w-4 h-4 text-emerald-400" />
                  <span className="text-[10px] font-semibold mt-0.5 whitespace-nowrap">تكرار سجل الصرف</span>
                </button>

                <button
                  type="button"
                  onClick={handleAddIdCardsPage}
                  className="flex flex-col items-center justify-center px-3 py-1 rounded-xl bg-slate-950/70 hover:bg-amber-950/40 text-slate-200 hover:text-amber-300 border border-slate-800 hover:border-amber-500/40 transition-all cursor-pointer h-[48px]"
                  title="إضافة صفحة بطاقات رقم قومي (8 خانات رأسية)"
                >
                  <CreditCard className="w-4 h-4 text-amber-400" />
                  <span className="text-[10px] font-semibold mt-0.5 whitespace-nowrap">صفحة بطاقات (8)</span>
                </button>

                <button
                  type="button"
                  onClick={handleAddBirthCertsPage}
                  className="flex flex-col items-center justify-center px-3 py-1 rounded-xl bg-slate-950/70 hover:bg-sky-950/40 text-slate-200 hover:text-sky-300 border border-slate-800 hover:border-sky-500/40 transition-all cursor-pointer h-[48px]"
                  title="إضافة صفحة شهادات ميلاد (شهادتين أفقيتين)"
                >
                  <FileSpreadsheet className="w-4 h-4 text-sky-400" />
                  <span className="text-[10px] font-semibold mt-0.5 whitespace-nowrap">شهادات ميلاد (أفقي)</span>
                </button>
              </div>
              <span className="text-[9px] text-slate-400 text-center font-semibold block mt-0.5 pt-0.5 border-t border-slate-800/40">إدراج صفحات</span>
            </div>

            {/* Group 3: Tools & Layout (أدوات وتخصيص) */}
            <div className="flex flex-col justify-between py-1 px-2 border-l border-slate-800">
              <div className="flex items-center gap-1.5 flex-1">
                <button
                  type="button"
                  onClick={() => setAppMode("studio")}
                  className="flex flex-col items-center justify-center px-3 py-1 rounded-xl bg-slate-950/70 hover:bg-slate-800 text-slate-200 hover:text-amber-400 border border-slate-800 transition-all cursor-pointer h-[48px]"
                  title="تعديل أماكن الحقول بالسحب والإفلات"
                >
                  <Sliders className="w-4 h-4 text-amber-400" />
                  <span className="text-[10px] font-semibold mt-0.5 whitespace-nowrap">استوديو الإحداثيات</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowAboutModal(true)}
                  className="flex flex-col items-center justify-center px-3 py-1 rounded-xl bg-slate-950/70 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-800 transition-all cursor-pointer h-[48px]"
                  title="حول البرنامج والترخيص"
                >
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span className="text-[10px] font-semibold mt-0.5 whitespace-nowrap">حول البرنامج</span>
                </button>
              </div>
              <span className="text-[9px] text-slate-400 text-center font-semibold block mt-0.5 pt-0.5 border-t border-slate-800/40">أدوات وتخصيص</span>
            </div>
          </div>

          {/* Far Left: Ribbon Collapse Toggle (Like Word Ctrl+F1) */}
          <div className="flex items-center pl-1">
            <button
              type="button"
              onClick={() => setRibbonCollapsed(!ribbonCollapsed)}
              className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="طي شريط الأوامر"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        /* Collapsed Ribbon Minimal Bar */
        <div className="h-2.5 bg-slate-900 border-b border-slate-800 flex items-center justify-end px-3">
          <button
            type="button"
            onClick={() => setRibbonCollapsed(false)}
            className="text-[10px] text-slate-400 hover:text-amber-400 flex items-center gap-1 cursor-pointer py-0.5"
            title="توسيع شريط الأوامر"
          >
            <ChevronDown className="w-3.5 h-3.5" />
            <span>عرض شريط الأوامر</span>
          </button>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 4. MAIN WORKSPACE & NAVIGATION PANE                                  */}
      {/* ==================================================================== */}
      <div className="flex-1 flex min-h-0 overflow-hidden relative">
        {/* Right Collapsible Sidebar: Microsoft Word-Style Navigation Pane (لوحة التنقل) */}
        <aside
          className={`shrink-0 h-full bg-slate-900/95 border-l border-slate-800 flex flex-col transition-all duration-300 z-20 ${sidebarOpen ? "w-72 lg:w-76" : "w-0 overflow-hidden border-none"
            }`}
        >
          {sidebarOpen && (
            <div className="p-3 space-y-4 overflow-y-auto flex-1 min-h-0 select-none">
              {/* Navigation Pane Header */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-bold text-slate-200">لوحة التنقل</span>
                </div>
                <span className="text-[10px] font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                  الصفحة {activePage} من {pages.length}
                </span>
              </div>

              {/* Pages Navigator Checklist */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[11px] font-semibold text-slate-400">
                    أقسام الاستمارة ({pages.length} صفحات)
                  </span>
                </div>

                <div className="space-y-1">
                  {pages.map((p) => {
                    const Icon = p.icon;
                    const isActive = activePage === p.id;

                    return (
                      <div
                        key={p.id}
                        className={`w-full text-right p-2 rounded-xl text-xs transition-all flex items-center justify-between border group ${isActive
                          ? "bg-amber-500/15 border-amber-500/50 text-white font-bold shadow-sm ring-1 ring-amber-500/30"
                          : "bg-slate-950/40 border-slate-800/60 text-slate-300 hover:bg-slate-800/70 hover:text-white"
                          }`}
                      >
                        <button
                          type="button"
                          onClick={() => setActivePage(p.id)}
                          className="flex items-center gap-2.5 flex-1 min-w-0 text-right cursor-pointer"
                        >
                          <div
                            className={`p-1.5 rounded-lg shrink-0 ${isActive
                              ? "bg-amber-500 text-slate-950 font-bold"
                              : "bg-slate-800 text-slate-400"
                              }`}
                          >
                            <Icon className="w-3.5 h-3.5" />
                          </div>
                          <div className="truncate">
                            <div className="font-bold truncate text-xs">{p.title}</div>
                            <div className="text-[10px] text-slate-400 font-normal truncate">{p.sub}</div>
                          </div>
                        </button>

                        <div className="flex items-center gap-1 shrink-0">
                          {p.isDeletable && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteExtraPage(p.extraIdx);
                              }}
                              className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 transition-colors opacity-60 group-hover:opacity-100 cursor-pointer"
                              title="حذف هذه الصفحة"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {isActive && (
                            <div className="w-1.5 h-5 rounded-full bg-amber-400 shrink-0" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Document Overview Summary Widget */}
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-[11px] space-y-2">
                <span className="font-bold text-slate-300 flex items-center gap-1.5">
                  <FileBadge className="w-3.5 h-3.5 text-amber-400" />
                  <span>ملخص المستندات</span>
                </span>
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                    <span className="text-slate-400 block">البطاقات المرفقة:</span>
                    <span className={`font-bold ${data.husband_id_image && data.wife_id_image ? "text-emerald-400" : "text-amber-400"}`}>
                      {(data.husband_id_image ? 1 : 0) + (data.husband_id_back_image ? 1 : 0) + (data.wife_id_image ? 1 : 0) + (data.wife_id_back_image ? 1 : 0)} من 4
                    </span>
                  </div>
                  <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                    <span className="text-slate-400 block">أفراد الأسرة:</span>
                    <span className="font-bold text-white">
                      {data.page3?.family_members?.length || 0} أفراد
                    </span>
                  </div>
                </div>
              </div>

              {/* Keyboard Shortcuts Guide */}
              <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800 text-[11px] text-slate-400 space-y-1.5">
                <span className="font-semibold text-slate-300 block mb-1">اختصارات لوحة المفاتيح</span>
                <div className="flex items-center justify-between">
                  <span>حفظ الاستمارة:</span>
                  <kbd className="bg-slate-800 px-1.5 py-0.5 rounded text-amber-400 font-mono text-[10px]">Ctrl+S</kbd>
                </div>
                <div className="flex items-center justify-between">
                  <span>حفظ باسم:</span>
                  <kbd className="bg-slate-800 px-1.5 py-0.5 rounded text-amber-400 font-mono text-[10px]">Ctrl+Shift+S</kbd>
                </div>
                <div className="flex items-center justify-between">
                  <span>تصدير PDF:</span>
                  <kbd className="bg-slate-800 px-1.5 py-0.5 rounded text-amber-400 font-mono text-[10px]">Ctrl+P</kbd>
                </div>
                <div className="flex items-center justify-between">
                  <span>التنقل بين الصفحات:</span>
                  <span className="font-mono text-slate-300 text-[10px]">◀ ▶</span>
                </div>
              </div>
            </div>
          )}
        </aside>

        {/* Central Workspace: Document Canvas & Interactive Viewport */}
        <div className="flex-1 flex flex-col min-h-0 h-full overflow-hidden relative bg-[#0b0e14]">
          {/* Toast Notification Banner */}
          {toast && (
            <div
              className={`fixed top-28 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-2xl shadow-2xl backdrop-blur-xl border flex items-center gap-2.5 text-xs font-bold animate-in fade-in slide-in-from-top-3 ${toast.type === "success"
                ? "bg-emerald-950/90 text-emerald-200 border-emerald-500"
                : toast.type === "error"
                  ? "bg-rose-950/90 text-rose-200 border-rose-500"
                  : "bg-slate-900/90 text-amber-200 border-amber-500"
                }`}
            >
              {toast.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : toast.type === "error" ? (
                <AlertCircle className="w-4 h-4 text-rose-400" />
              ) : (
                <Info className="w-4 h-4 text-amber-400" />
              )}
              <span>{toast.message}</span>
            </div>
          )}

          {/* Main Canvas Container - ONLY this area scrolls when scrolling down */}
          <main className="flex-1 min-h-0 overflow-y-auto overflow-x-auto py-6 px-4 md:px-8 flex flex-col items-center">
            {/* Validation Alert Banner */}
            {validationAlert && (
              <div className="w-full max-w-4xl mb-4 p-3 rounded-2xl bg-gradient-to-r from-rose-950/95 to-slate-900/95 text-white shadow-2xl border border-rose-500 flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-4 backdrop-blur-lg">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 bg-rose-600/30 rounded-xl shrink-0 border border-rose-500/50">
                    <AlertCircle className="w-5 h-5 text-rose-400 animate-bounce" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-rose-300">
                      يوجد خطأ في ({validationAlert.fieldLabel} - صفحة {validationAlert.page})
                    </div>
                    <div className="text-[11px] text-rose-100/90 font-medium">
                      {validationAlert.message}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => navigateToError({ page: validationAlert.page, fieldId: validationAlert.fieldId })}
                    className="px-3 py-1 rounded-lg bg-rose-500 hover:bg-rose-400 text-white text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer"
                  >
                    تصحيح الحقل الآن
                  </button>
                  <button
                    onClick={() => setValidationAlert(null)}
                    className="p-1 rounded-lg hover:bg-rose-800/60 text-rose-300 transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            <div className="w-full flex justify-center items-start">
              <InteractiveDocumentCanvas
                page={activePage}
                data={data}
                onChange={handleUpdate}
                onOpenCropper={(binding, title, mode) => {
                  const img = getValueByPath(data, binding);
                  const validImg = (typeof img === "string" && img.trim().length > 0) ? img : undefined;
                  const chosenMode = mode || (
                    binding.includes("birth_cert") || title.includes("شهادة")
                      ? "certificate"
                      : "id_card"
                  );
                  setCropperModal({
                    isOpen: true,
                    binding,
                    title: `استوديو معالجة وتدوير (${title})`,
                    image: validImg,
                    defaultMode: chosenMode
                  });
                }}
                onOpenHusbandCropper={() => {
                  setCropperModal({
                    isOpen: true,
                    binding: "husband_id_image",
                    title: "استوديو معالجة بطاقة الزوج (الوجه)",
                    image: data.husband_id_image,
                    defaultMode: "id_card"
                  });
                }}
                onOpenWifeCropper={() => {
                  setCropperModal({
                    isOpen: true,
                    binding: "wife_id_image",
                    title: "استوديو معالجة بطاقة الزوجة (الوجه)",
                    image: data.wife_id_image,
                    defaultMode: "id_card"
                  });
                }}
                scale={scale}
                layout={layout}
                highlightedFieldId={highlightedFieldId}
                lockedChurchName={lockedChurchName}
                onDeletePage={(idx) => handleDeleteExtraPage(idx)}
              />
            </div>
          </main>
        </div>
      </div>

      {/* ================================================================ */}
      {/* 5. MICROSOFT OFFICE DESKTOP STATUS BAR (Full-width bottom bar)    */}
      {/* ================================================================ */}
      <footer className="h-9 shrink-0 w-full bg-slate-900/95 border-t border-slate-800 px-4 flex items-center justify-between text-xs select-none z-30 backdrop-blur-md">
        {/* Right (RTL): Page Counter & Saving Status */}
        <div className="flex items-center gap-3 text-[11px] text-slate-300 font-medium whitespace-nowrap shrink-0">
          <div className="flex items-center gap-1.5 bg-slate-950/80 px-2.5 py-1 rounded border border-slate-800 font-mono">
            <span className="text-slate-500">الصفحة:</span>
            <span className="font-bold text-amber-400">{activePage}</span>
            <span className="text-slate-600">/</span>
            <span className="text-slate-400">{pages.length}</span>
          </div>

          <div className="h-3.5 w-px bg-slate-800 hidden sm:block" />
          <span className="hidden sm:inline text-slate-400">طباعة رسمية 300 DPI</span>

          <div className="h-3.5 w-px bg-slate-800 hidden md:block" />
          <span className="hidden md:inline text-slate-400 font-mono text-[10px]">{saveStatus}</span>
        </div>

        {/* Center: Page Stepper Buttons with Home Shortcut */}
        <div className="flex items-center gap-1 whitespace-nowrap shrink-0">
          <button
            type="button"
            onClick={() => setActivePage(1)}
            className="flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-amber-400 hover:text-amber-300 transition-colors text-[11px] cursor-pointer whitespace-nowrap"
            title="العودة للصفحة الرئيسية (الصفحة 1)"
          >
            <Home className="w-3 h-3" />
            <span className="hidden sm:inline font-bold">الرئيسية</span>
          </button>

          <div className="h-3 w-px bg-slate-700 mx-0.5" />

          <button
            type="button"
            disabled={activePage <= 1}
            onClick={() => setActivePage((p) => Math.max(1, p - 1))}
            className="flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-30 transition-colors text-[11px] cursor-pointer whitespace-nowrap"
            title="الصفحة السابقة"
          >
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">السابقة</span>
          </button>

          <span className="text-[11px] font-mono text-slate-400 px-2 font-bold max-w-[160px] truncate hidden md:inline">
            {pages[activePage - 1]?.title}
          </span>

          <button
            type="button"
            disabled={activePage >= pages.length}
            onClick={() => setActivePage((p) => Math.min(pages.length, p + 1))}
            className="flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-30 transition-colors text-[11px] cursor-pointer whitespace-nowrap"
            title="الصفحة التالية"
          >
            <span className="hidden sm:inline">التالية</span>
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Left (RTL): Office Zoom Slider & View Presets */}
        <div className="flex items-center gap-2 whitespace-nowrap shrink-0">
          <div className="flex items-center gap-1 bg-slate-950/70 p-0.5 rounded border border-slate-800">
            <button
              type="button"
              onClick={() => setScale((s) => Math.max(0.6, s - 0.15))}
              className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="تصغير (-)"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>

            <span className="font-mono text-[11px] text-amber-400 w-10 text-center font-bold">
              {Math.round(scale * 100)}%
            </span>

            <button
              type="button"
              onClick={() => setScale((s) => Math.min(1.8, s + 0.15))}
              className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="تكبير (+)"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-3.5 w-px bg-slate-800 hidden lg:block" />

          <div className="hidden lg:flex items-center gap-1">
            <button
              type="button"
              onClick={() => setScale(0.85)}
              className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors cursor-pointer ${Math.abs(scale - 0.85) < 0.05
                ? "bg-amber-500 text-slate-950 font-bold"
                : "text-slate-400 hover:text-white hover:bg-slate-800"
                }`}
              title="ملء الصفحة على الشاشة"
            >
              ملء الصفحة
            </button>

            <button
              type="button"
              onClick={() => setScale(1.0)}
              className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors cursor-pointer ${Math.abs(scale - 1.0) < 0.05
                ? "bg-amber-500 text-slate-950 font-bold"
                : "text-slate-400 hover:text-white hover:bg-slate-800"
                }`}
              title="الحجم الطبيعي 100%"
            >
              100%
            </button>

            <button
              type="button"
              onClick={() => setScale(1.15)}
              className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors cursor-pointer ${Math.abs(scale - 1.15) < 0.05
                ? "bg-amber-500 text-slate-950 font-bold"
                : "text-slate-400 hover:text-white hover:bg-slate-800"
                }`}
              title="عرض مريح للقراءة والكتابة"
            >
              عرض مريح
            </button>
          </div>
        </div>
      </footer>

      {/* ==================================================================== */}
      {/* 3. DYNAMIC CROPPER MODAL (Cards & Certificates)                      */}
      {/* ==================================================================== */}
      <ImageCropperModal
        isOpen={cropperModal.isOpen}
        title={cropperModal.title}
        initialImage={cropperModal.image}
        defaultMode={cropperModal.defaultMode}
        onClose={() => setCropperModal({ isOpen: false, binding: "", title: "", image: undefined, defaultMode: "id_card" })}
        onSave={(croppedBase64) => {
          if (cropperModal.binding) {
            const updated = setValueByPath(data, cropperModal.binding, croppedBase64);
            setData(updated);
            safeSaveToLocalStorage(updated);
            const isCert = cropperModal.defaultMode === "certificate" || cropperModal.binding.includes("birth_cert");
            showToast(isCert ? "تم حفظ واقتصاص صورة شهادة الميلاد بنجاح!" : "تم حفظ واقتصاص صورة البطاقة بنجاح!");
          }
          setCropperModal({ isOpen: false, binding: "", title: "", image: undefined, defaultMode: "id_card" });
        }}
      />

      {/* ==================================================================== */}
      {/* 4. ABOUT & LICENSE MODAL                                             */}
      {/* ==================================================================== */}
      <AboutModal
        isOpen={showAboutModal}
        onClose={() => setShowAboutModal(false)}
        clientName={licensedClientName}
        onOpenActivation={() => setShowActivationModal(true)}
      />

      {/* Re-activation overlay if requested by user while licensed */}
      {showActivationModal && isLicensed && (
        <ActivationModal
          isOpen={true}
          reason={licenseReason}
          onActivated={(clientName) => {
            setIsLicensed(true);
            isLicensedRef.current = true;
            setLicensedClientName(clientName);
            setShowActivationModal(false);
            showToast(`تم تحديث ترخيص البرنامج بنجاح (${clientName})!`, "success");
          }}
        />
      )}
    </div>
  );
};

export default App;
