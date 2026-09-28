import { Card, CardContent } from "@/components/ui/card";

export function JobMigrationNotice() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">채용공고</h1>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">
          공고 저장을 위한 데이터베이스 준비가 필요합니다.
        </p>
      </div>
      <Card>
        <CardContent className="space-y-3 py-7">
          <h2 className="text-lg font-semibold">
            채용공고 테이블이 아직 없어요
          </h2>
          <p className="text-sm leading-6 text-muted-foreground">
            Supabase SQL Editor에서 프로젝트의
            <code className="mx-1 rounded bg-secondary px-1.5 py-0.5 text-foreground">
              supabase/migrations/202609280001_job_postings.sql
            </code>
            을 실행한 다음 이 페이지를 새로고침해 주세요. 공고가 0개인 상태는
            정상적으로 빈 목록으로 표시됩니다.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
