import { Card, CardContent } from "@/components/ui/card";

export function JobMigrationNotice({
  migrationFile = "202609280001_job_postings.sql",
  feature = "채용공고 저장",
}: {
  migrationFile?: string;
  feature?: string;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">채용공고</h1>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">
          {feature}을 위한 데이터베이스 준비가 필요합니다.
        </p>
      </div>
      <Card>
        <CardContent className="space-y-3 py-7">
          <h2 className="text-lg font-semibold">
            필요한 데이터베이스 변경이 아직 적용되지 않았어요
          </h2>
          <p className="text-sm leading-6 text-muted-foreground">
            Supabase SQL Editor에서 프로젝트의
            <code className="mx-1 rounded bg-secondary px-1.5 py-0.5 text-foreground">
              supabase/migrations/{migrationFile}
            </code>
            을 Supabase SQL Editor에서 실행한 다음 이 페이지를 새로고침해
            주세요. 데이터가 0개인 상태와 데이터베이스 준비가 안 된 상태를
            구분합니다.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
