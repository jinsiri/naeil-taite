import type { SalaryRecord } from "./schema";

export function sortSalaryRecords(records: SalaryRecord[]) {
  return [...records].sort(
    (a, b) =>
      b.effective_on.localeCompare(a.effective_on) ||
      b.created_at.localeCompare(a.created_at) ||
      b.id.localeCompare(a.id),
  );
}
export function latestByCareer(records: SalaryRecord[]) {
  const latest = new Map<number, SalaryRecord>();
  for (const record of sortSalaryRecords(records))
    if (!latest.has(record.career_year)) latest.set(record.career_year, record);
  return [...latest.values()].sort((a, b) => a.career_year - b.career_year);
}
export function previousSalaryRecord(
  record: SalaryRecord,
  records: SalaryRecord[],
) {
  const sorted = sortSalaryRecords([
    ...records.filter((item) => item.id !== record.id),
    record,
  ]);
  const index = sorted.findIndex((item) => item.id === record.id);
  return sorted[index + 1] ?? null;
}
export function salaryDifference(amount: number, reference: number) {
  return {
    amount: amount - reference,
    percent: reference > 0 ? ((amount - reference) / reference) * 100 : null,
  };
}
export const formatSalary = (amount: number) =>
  `${amount.toLocaleString("ko-KR")}만원`;
export function formatDifference(amount: number, reference: number) {
  const difference = salaryDifference(amount, reference);
  return `${difference.amount > 0 ? "+" : ""}${formatSalary(difference.amount)}${difference.percent === null ? "" : ` (${difference.percent > 0 ? "+" : ""}${difference.percent.toFixed(1)}%)`}`;
}
