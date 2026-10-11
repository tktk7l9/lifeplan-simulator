import { afterEach, describe, expect, it, vi } from "vitest";
import { ageToBirthDate, calcAge, MAX_AGE, MIN_AGE } from "../steps/age";

afterEach(() => {
  vi.useRealTimers();
});

describe("age helpers", () => {
  it("counts a birthday only once it has come this year", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 11)); // 2026-10-11
    expect(calcAge("1990-10-11")).toBe(36); // birthday today
    expect(calcAge("1990-10-12")).toBe(35); // tomorrow
    expect(calcAge("1990-11-01")).toBe(35); // next month
    expect(calcAge("1990-09-30")).toBe(36); // last month
  });

  it("turns an age back into today's date that many years ago", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 5)); // 2026-01-05
    expect(ageToBirthDate(30)).toBe("1996-01-05");
    expect(calcAge(ageToBirthDate(30))).toBe(30);
  });

  it("keeps the 18-80 range the birth-year picker and the schema share", () => {
    expect([MIN_AGE, MAX_AGE]).toEqual([18, 80]);
  });
});
