import { z } from "zod";
import { requireIdentity } from "@/lib/resumes/data";
import { salaryRecordSchema, type SalaryRecord } from "@/lib/salaries/schema";
import { SalaryManager } from "@/components/salaries/salary-manager";
import { Card, CardContent } from "@/components/ui/card";

export default async function SalariesPage() {
  const { client, user } = await requireIdentity();
  const records: SalaryRecord[] = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await client
      .from("salary_records")
      .select("*")
      .eq("user_id", user.id)
      .order("id")
      .range(offset, offset + 499);
    if (error && ["42P01", "PGRST205"].includes(error.code))
      return (
        <div className="space-y-6">
          <h1 className="text-3xl font-bold">연봉관리</h1>
          <Card>
            <CardContent className="space-y-2 py-8">
              <p>연봉 기록 저장소를 준비하고 있어요.</p>
              <p className="text-sm text-muted-foreground">
                관리자가 연봉관리 데이터베이스 변경을 적용하면 사용할 수
                있습니다.
              </p>
            </CardContent>
          </Card>
        </div>
      );
    if (error) throw new Error("연봉 기록을 불러오지 못했어요.");
    const page = z.array(salaryRecordSchema).parse(data);
    records.push(...page);
    if (page.length < 500) break;
  }
  return (
    <div className="space-y-8">
      <div>
        <p className="mb-3 text-sm text-primary">쌓아온 경력, 달라진 보상</p>
        <h1 className="text-3xl font-bold tracking-tight">연봉관리</h1>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">
          업종이 바뀌어도 이어지는 내 연봉 이력. 연차별 변화와 직전 연봉 대비
          증감률을 확인하세요.
        </p>
      </div>
      <SalaryManager records={records} />
    </div>
  );
}
