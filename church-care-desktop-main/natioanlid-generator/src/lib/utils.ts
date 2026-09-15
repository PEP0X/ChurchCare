export function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export function isValidDate(year: number, month: number, day: number): boolean {
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

export function formatDate(date: Date, locale: string = "en-GB"): string {
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      textarea.remove();
      return true;
    } catch {
      return false;
    }
  }
}

export function randomPastDate(year: number): { year: number; month: number; day: number } {
  const today = new Date();
  if (year === today.getFullYear()) {
    return {
      year,
      month: today.getMonth() + 1,
      day: Math.floor(Math.random() * today.getDate()) + 1,
    };
  }
  const month = Math.floor(Math.random() * 12) + 1;
  return {
    year,
    month,
    day: Math.floor(Math.random() * daysInMonth(year, month)) + 1,
  };
}
