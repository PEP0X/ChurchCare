import { useMemo } from "react";
import { validate, sanitize, parse, type NationalIdAnalysis } from "egypt-natid";

export interface NationalIdInfo {
  isValid: boolean;
  cleanId: string;
  errorMessage?: string;
  birthDate?: string;
  age?: number;
  gender?: "ذكر" | "أنثى";
  governorate?: string;
  region?: string;
  isAdult?: boolean;
  analysis?: NationalIdAnalysis | null;
}

const nationalIdCache = new Map<string, NationalIdInfo>();
const MAX_NID_CACHE = 250;

export function parseEgyptianNationalId(id: string | number | undefined | null): NationalIdInfo {
  const raw = String(id ?? "");
  if (!raw.trim()) {
    return { isValid: false, cleanId: "" };
  }

  const cached = nationalIdCache.get(raw);
  if (cached) {
    return cached;
  }

  const cleanId = sanitize(raw);

  const cacheAndReturn = (info: NationalIdInfo): NationalIdInfo => {
    if (nationalIdCache.size >= MAX_NID_CACHE) {
      const first = nationalIdCache.keys().next().value;
      if (first) nationalIdCache.delete(first);
    }
    nationalIdCache.set(raw, info);
    return info;
  };

  if (!cleanId) {
    return cacheAndReturn({ isValid: false, cleanId: "" });
  }

  if (cleanId.length < 14) {
    return cacheAndReturn({
      isValid: false,
      cleanId,
      errorMessage: `الرقم القومي غير مكتمل (${cleanId.length} من 14 رقماً)`
    });
  }

  if (cleanId.length > 14) {
    return cacheAndReturn({
      isValid: false,
      cleanId,
      errorMessage: `الرقم القومي يجب أن يتكون من 14 رقماً فقط (${cleanId.length} رقماً)`
    });
  }

  const valid = validate(cleanId);
  if (!valid) {
    return cacheAndReturn({
      isValid: false,
      cleanId,
      errorMessage: "الرقم القومي غير صحيح (فشل فحص المطابقة Mod-11 أو تاريخ الميلاد أو كود المحافظة)"
    });
  }

  try {
    const analysis = parse(cleanId);
    return cacheAndReturn({
      isValid: true,
      cleanId,
      birthDate: `${analysis.birthYear}-${String(analysis.birthMonth).padStart(2, "0")}-${String(analysis.birthDay).padStart(2, "0")}`,
      age: analysis.age,
      gender: analysis.gender.toLowerCase() === "female" ? "أنثى" : "ذكر",
      governorate: analysis.governorate?.nameAr || "غير محدد",
      region: analysis.region,
      isAdult: analysis.isAdult,
      analysis
    });
  } catch {
    return cacheAndReturn({
      isValid: false,
      cleanId,
      errorMessage: "تعذر تحليل بيانات الرقم القومي"
    });
  }
}

export function useNationalId(nationalId: string): NationalIdInfo {
  return useMemo(() => parseEgyptianNationalId(nationalId), [nationalId]);
}

