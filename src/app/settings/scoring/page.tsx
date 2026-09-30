import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { requireIdentity } from "@/lib/resumes/data";
import { DEFAULT_SCORE_WEIGHTS, type ScoreWeights } from "@/lib/jobs/scoring";
import { saveScoringPreferences } from "@/app/settings/actions";

const labels: Record<keyof ScoreWeights, string> = {
  careerCapital: "커리어 자산",
  roleFit: "직무 적합도",
  companyQuality: "회사 조건",
  targetAlignment: "커리어 목표",
  personalFit: "개인 선호",
  publicTransitFit: "대중교통 출퇴근",
};

export default async function ScoringSettingsPage({
  searchParams,
}: PageProps<"/settings/scoring">) {
  const search = await searchParams;
  const { client, user } = await requireIdentity();
  const { data } = await client
    .from("scoring_preferences")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();
  const weights = { ...DEFAULT_SCORE_WEIGHTS, ...(data?.weights ?? {}) };
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {search.saved === "1" && (
        <p role="status" className="text-sm text-primary">
          평가 설정을 저장했어요.
        </p>
      )}
      {search.error && (
        <p role="alert" className="text-sm text-destructive">
          설정을 저장하지 못했어요. 입력값과 데이터베이스 마이그레이션을 확인해
          주세요.
        </p>
      )}
      <div>
        <h1 className="text-3xl font-bold">평가 기준 설정</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          점수별 중요도를 직접 조정합니다. 사용 가능한 항목의 가중치 합계로
          정규화됩니다.
        </p>
      </div>
      <form action={saveScoringPreferences} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>점수 가중치</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            {Object.entries(labels).map(([key, label]) => (
              <label key={key} className="space-y-2 text-sm font-medium">
                {label}
                <Input
                  name={`weight_${key}`}
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  defaultValue={weights[key as keyof typeof weights]}
                />
              </label>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>대중교통 출퇴근</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm leading-6 text-muted-foreground">
              출발지와 근무지 사이의 대중교통 예상 소요시간 기준입니다. 시/구
              대표 위치를 사용하므로 실제 출발점·시간대와 차이가 날 수 있습니다.
              Kakao REST API 키를 설정한 뒤 경로 계산이 활성화됩니다.
            </p>
            <label className="block space-y-2 text-sm font-medium">
              희망 거주 시/구
              <Input
                name="homeDistrict"
                maxLength={80}
                defaultValue={data?.home_district ?? ""}
                placeholder="예: 서울시 마포구"
              />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2 text-sm font-medium">
                이 시간까지 선호 (분)
                <Input
                  name="commuteIdeal"
                  type="number"
                  min="0"
                  max="240"
                  defaultValue={data?.commute_ideal_minutes ?? 30}
                />
              </label>
              <label className="space-y-2 text-sm font-medium">
                이 시간부터 0점 (분)
                <Input
                  name="commuteMax"
                  type="number"
                  min="1"
                  max="300"
                  defaultValue={data?.commute_max_minutes ?? 90}
                />
              </label>
            </div>
            <label className="flex items-start gap-3 text-sm leading-6">
              <input
                className="mt-1 size-4"
                type="checkbox"
                name="transitConsent"
                defaultChecked={data?.transit_consent ?? false}
              />
              <span>
                동의: 대중교통 시간을 계산할 때 Kakao 지도 API에 희망 거주
                시/구와 해당 공고의 근무지를 전송합니다.
              </span>
            </label>
          </CardContent>
        </Card>
        <p className="text-sm text-muted-foreground">
          출퇴근 항목을 쓰려면 공고에 근무지가 있어야 하고 서버에{" "}
          <code>KAKAO_REST_API_KEY</code>가 설정되어야 합니다. 국가 제공 API는
          필요하지 않으며, 키는 채팅에 공유하지 말고 로컬/Vercel 서버 환경변수로
          등록하세요.
        </p>
        <Button type="submit">설정 저장</Button>
      </form>
    </div>
  );
}
