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

export function parseEgyptianNationalId(id: string | number | undefined | null): NationalIdInfo {
  const raw = String(id ?? "");
  const cleanId = sanitize(raw);

  if (!cleanId) {
    return { isValid: false, cleanId: "" };
  }

  if (cleanId.length < 14) {
    return {
      isValid: false,
      cleanId,
      errorMessage: `الرقم القومي غير مكتمل (${cleanId.length} من 14 رقماً)`
    };
  }

  if (cleanId.length > 14) {
    return {
      isValid: false,
      cleanId,
      errorMessage: `الرقم القومي يجب أن يتكون من 14 رقماً فقط (${cleanId.length} رقماً)`
    };
  }

  const valid = validate(cleanId);
  if (!valid) {
    return {
      isValid: false,
      cleanId,
      errorMessage: "الرقم القومي غير صحيح (فشل فحص المطابقة Mod-11 أو تاريخ الميلاد أو كود المحافظة)"
    };
  }

  try {
    const analysis = parse(cleanId);
    return {
      isValid: true,
      cleanId,
      birthDate: `${analysis.birthYear}-${String(analysis.birthMonth).padStart(2, "0")}-${String(analysis.birthDay).padStart(2, "0")}`,
      age: analysis.age,
      gender: analysis.gender.toLowerCase() === "female" ? "أنثى" : "ذكر",
      governorate: analysis.governorate?.nameAr || "غير محدد",
      region: analysis.region,
      isAdult: analysis.isAdult,
      analysis
    };
  } catch {
    return {
      isValid: false,
      cleanId,
      errorMessage: "تعذر تحليل بيانات الرقم القومي"
    };
  }
}

export function useNationalId(nationalId: string): NationalIdInfo {
  return useMemo(() => parseEgyptianNationalId(nationalId), [nationalId]);
}

