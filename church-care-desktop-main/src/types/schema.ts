export interface FamilyMember {
  id: string;
  name: string;
  national_id: string;
  social_status: string;
  education_job: string;
  income: number | string;
  confession_father: string;
}

export interface OtherResident {
  id: string;
  name: string;
  national_id: string;
  kinship: string;
  social_status: string;
}

export interface ChurchAidItem {
  id: string;
  church_name: string;
  value: number;
  purpose: string;
}

export interface AidLedgerEntry {
  id: string;
  aid_type: string;
  amount: string;
  entity: string;
  date: string;
  recipient_signature: string;
}

export type HusbandStatus =
  | "present"     // متواجد (على قيد الحياة)
  | "deceased"    // متوفي
  | "abandoned"   // تارك المنزل
  | "apostate"    // خارج الحظيرة
  | "separated"   // منفصل / طلاق
  | "traveler"    // مسافر / غائب
  | "prisoner"    // سجين / محبوس
  | "other";      // أخرى

export interface CaseStudyData {
  husband_id_image?: string;
  husband_id_back_image?: string;
  wife_id_image?: string;
  wife_id_back_image?: string;

  page1: {
    study_date: string;
    church_study_id: string;
    church_name?: string;
    day?: string;
    month?: string;
    year?: string;
    area: string;
    responsible_priest: string;
    cathedral_care_id: string;
    church_membership_id: string;
  };

  // Backwards compatibility for any legacy keys
  Page1?: {
    churchName?: string;
    day?: string;
    month?: string;
    year?: string;
    [key: string]: any;
  };

  page2: {
    husband: {
      name: string;
      nickname: string;
      national_id: string;
      job: string;
      salary: string | number;
      phone: string;
      confession_father: string;
      insurance_no: string;
      status?: HusbandStatus;
      custom_status?: string;
    };
    wife: {
      name: string;
      nickname: string;
      national_id: string;
      job: string;
      salary: string | number;
      phone: string;
      confession_father: string;
      insurance_no: string;
      status?: HusbandStatus;
      custom_status?: string;
    };
    address: {
      street: string;
      building_no: string;
      governorate: string;
      area: string;
      landmark: string;
      housing_type: string;
      children_phones: string;
      notes: string;
    };
    housing_type?: string;
    emergency_contacts?: Array<{ name: string; phone: string }>;
    gov_programs: {
      has_ration_card: string;
      ration_members_count: number | string;
      program_1: string;
      program_2: string;
    };
  };

  page3: {
    family_members: FamilyMember[];
    other_persons: OtherResident[];
    family_other_members?: any[];
    other_members?: any[];
    housing_description: string;
    family_members_notes?: string;
    other_members_notes?: string;
    medical_conditions: {
      diseases: string;
      continuous_treatment?: string;
      mental_addiction: string;
      disability: string;
      abandoned_parent: string;
      other_circumstances: string;
      [key: string]: any;
    };
    [key: string]: any;
  };

  page4: {
    church_aid: ChurchAidItem[];
    total_church_aid?: number | string;
    church_aid_total_notes?: string;
    pension?: number | string;
    income: {
      church_aid: number | string;
      medical_aid: number | string;
      study_aid: number | string;
      base_salary: number | string;
      side_project: number | string;
      relatives_aid: number | string;
      pension?: number | string;
      total_income: number | string;
    };
    expenses: {
      living_basics: number | string;
      utilities: number | string;
      phone: number | string;
      rent: number | string;
      medical: number | string;
      education: number | string;
      total_expenses: number | string;
    };
  };

  page5: {
    duration: string;
    entry_reason: string;
    approved_amount: number | string;
    notes: string;
    other_notes?: string;
    committee_members: [string, string, string];
  };

  page6: {
    family_head: string;
    head_name?: string;
    church_records_id: string;
    church_id?: string;
    cathedral_care_id: string;
    care_id?: string;
    church_membership_id: string;
    member_id?: string;
    from_date: string;
    from_date_day?: string;
    from_date_month?: string;
    from_date_year?: string;
    to_date: string;
    to_date_day?: string;
    to_date_month?: string;
    to_date_year?: string;
    aid_ledger: AidLedgerEntry[];
    signatures: [string, string, string];
  };

  extra_pages?: ExtraPage[];
}

export interface ExtraIdCardsPage {
  id: string;
  type: "id_cards";
  title: string;
  images: (string | undefined)[]; // 8 slots: slot 0 to 7
  labels?: string[];
}

export interface ExtraBirthCertsPage {
  id: string;
  type: "birth_certs";
  title: string;
  images: [string | undefined, string | undefined]; // [right (0), left (1)]
  labels?: [string, string];
}

export interface DuplicatedLedgerPage {
  id: string;
  type: "duplicated_ledger";
  title: string;
  page6Data: CaseStudyData["page6"];
}

export type ExtraPage = ExtraIdCardsPage | ExtraBirthCertsPage | DuplicatedLedgerPage;

