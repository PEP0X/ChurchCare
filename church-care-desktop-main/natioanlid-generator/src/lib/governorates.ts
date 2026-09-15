export interface GovernorateInfo {
  code: number;
  nameEn: string;
  nameAr: string;
  region: string;
}

export const GOVERNORATES: GovernorateInfo[] = [
  { code: 1, nameEn: "Cairo", nameAr: "القاهرة", region: "Cairo" },
  { code: 21, nameEn: "Giza", nameAr: "الجيزة", region: "Cairo" },
  { code: 14, nameEn: "Qalyubia", nameAr: "القليوبية", region: "Cairo" },
  { code: 2, nameEn: "Alexandria", nameAr: "الإسكندرية", region: "Alexandria" },
  { code: 18, nameEn: "Beheira", nameAr: "البحيرة", region: "Alexandria" },
  { code: 33, nameEn: "Matrouh", nameAr: "مطروح", region: "Alexandria" },
  { code: 11, nameEn: "Damietta", nameAr: "دمياط", region: "Delta" },
  { code: 12, nameEn: "Dakahlia", nameAr: "الدقهلية", region: "Delta" },
  { code: 13, nameEn: "Sharqia", nameAr: "الشرقية", region: "Delta" },
  { code: 15, nameEn: "Kafr El Sheikh", nameAr: "كفر الشيخ", region: "Delta" },
  { code: 16, nameEn: "Gharbia", nameAr: "الغربية", region: "Delta" },
  { code: 17, nameEn: "Monufia", nameAr: "المنوفية", region: "Delta" },
  { code: 3, nameEn: "Port Said", nameAr: "بورسعيد", region: "Canal" },
  { code: 4, nameEn: "Suez", nameAr: "السويس", region: "Canal" },
  { code: 19, nameEn: "Ismailia", nameAr: "الإسماعيلية", region: "Canal" },
  { code: 34, nameEn: "North Sinai", nameAr: "شمال سيناء", region: "Canal" },
  { code: 35, nameEn: "South Sinai", nameAr: "جنوب سيناء", region: "Canal" },
  { code: 22, nameEn: "Beni Suef", nameAr: "بني سويف", region: "UpperEgyptNorth" },
  { code: 23, nameEn: "Fayoum", nameAr: "الفيوم", region: "UpperEgyptNorth" },
  { code: 24, nameEn: "Minya", nameAr: "المنيا", region: "UpperEgyptNorth" },
  { code: 25, nameEn: "Asyut", nameAr: "أسيوط", region: "UpperEgyptMiddle" },
  { code: 32, nameEn: "New Valley", nameAr: "الوادي الجديد", region: "UpperEgyptMiddle" },
  { code: 26, nameEn: "Sohag", nameAr: "سوهاج", region: "UpperEgyptSouth" },
  { code: 27, nameEn: "Qena", nameAr: "قنا", region: "UpperEgyptSouth" },
  { code: 28, nameEn: "Aswan", nameAr: "أسوان", region: "UpperEgyptSouth" },
  { code: 29, nameEn: "Luxor", nameAr: "الأقصر", region: "UpperEgyptSouth" },
  { code: 88, nameEn: "Abroad (Foreign)", nameAr: "خارج مصر", region: "Foreign" },
];

export const REGIONS: { key: string; label: string }[] = [
  { key: "Cairo", label: "Greater Cairo" },
  { key: "Alexandria", label: "Alexandria & Northwest" },
  { key: "Delta", label: "Nile Delta" },
  { key: "Canal", label: "Suez Canal & Sinai" },
  { key: "UpperEgyptNorth", label: "Northern Upper Egypt" },
  { key: "UpperEgyptMiddle", label: "Middle Upper Egypt" },
  { key: "UpperEgyptSouth", label: "Southern Upper Egypt" },
  { key: "Foreign", label: "Abroad" },
];

export function governorateByCode(code: number): GovernorateInfo | undefined {
  return GOVERNORATES.find((g) => g.code === code);
}

export function regionLabel(key: string): string {
  return REGIONS.find((r) => r.key === key)?.label ?? key;
}
