"use server";

import { revalidatePath } from "next/cache";
import { getIdentity } from "@/lib/supabase/server";
import { salaryInputSchema, salaryDeleteSchema } from "@/lib/salaries/schema";

function errorMessage(code: string) {
  return code === "40001"
    ? "다른 창에서 기록이 바뀌었어요. 새로고침 후 다시 확인해 주세요."
    : "저장을 완료하지 못했어요. 입력 내용을 확인하고 다시 시도해 주세요.";
}
export async function saveSalary(input: unknown) {
  const parsed = salaryInputSchema.safeParse(input);
  if (!parsed.success)
    return {
      error: parsed.error.issues[0]?.message ?? "입력 내용을 확인해 주세요.",
    };
  const identity = await getIdentity();
  if (!identity) return { error: "로그인한 뒤 다시 시도해 주세요." };
  const v = parsed.data;
  const { error } = await identity.client.rpc("save_salary_record", {
    p_id: v.id,
    p_expected_revision: v.expectedRevision,
    p_effective_on: v.effectiveOn,
    p_career_year: v.careerYear,
    p_company: v.company,
    p_amount: v.amount,
    p_note: v.note,
  });
  if (error) return { error: errorMessage(error.code) };
  revalidatePath("/salaries");
  return { success: true };
}
export async function deleteSalary(input: unknown) {
  const parsed = salaryDeleteSchema.safeParse(input);
  if (!parsed.success)
    return { error: "삭제할 기록과 확인 여부를 확인해 주세요." };
  const identity = await getIdentity();
  if (!identity) return { error: "로그인한 뒤 다시 시도해 주세요." };
  const { error } = await identity.client.rpc("delete_salary_record", {
    p_id: parsed.data.id,
    p_expected_revision: parsed.data.expectedRevision,
    p_approved: parsed.data.approved,
  });
  if (error)
    return {
      error:
        error.code === "40001"
          ? errorMessage(error.code)
          : "삭제하지 못했어요. 기록을 다시 확인해 주세요.",
    };
  revalidatePath("/salaries");
  return { success: true };
}
