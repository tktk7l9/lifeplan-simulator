// Age helpers shared by BasicInfoStep and its validation schema (schemas.ts).

export const MIN_AGE = 18;
export const MAX_AGE = 80;

export function calcAge(birthDate: string): number {
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

export function ageToBirthDate(age: number): string {
  const today = new Date();
  const year = today.getFullYear() - age;
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
}
