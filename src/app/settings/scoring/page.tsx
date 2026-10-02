import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { requireIdentity } from "@/lib/resumes/data";
import {
  DEFAULT_SCORE_WEIGHTS,
  normalizeScoreWeights,
  scoreWeightsSchema,
} from "@/lib/jobs/scoring";
import { ScoringWeightsFields } from "@/components/settings/scoring-weights-fields";
import { saveScoringPreferences } from "@/app/settings/actions";

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
  const weights = normalizeScoreWeights(
    scoreWeightsSchema.parse({
      ...DEFAULT_SCORE_WEIGHTS,
      ...(data?.weights ?? {}),
    }),
  );
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {search.saved === "1" && (
        <p role="status" className="text-sm text-primary">
          평가 설정을 저장했어요.
        </p>
      )}
      {search.error && (
        <p role="alert" className="text-sm text-destructive">
          설정을 저장하지 못했어요. 비중 합계가 100%인지와 출퇴근 시간을 확인해
          주세요.
        </p>
      )}
      <div>
        <h1 className="text-3xl font-bold">평가 기준 설정</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          전체 100% 중 각 평가 항목에 할애할 비중을 정해 주세요. 점수가 없는
          항목은 제외하고 나머지 비중에 비례해 계산합니다.
        </p>
      </div>
      <form action={saveScoringPreferences} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>평가 항목별 비중</CardTitle>
          </CardHeader>
          <CardContent>
            <ScoringWeightsFields weights={weights} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>대중교통 출퇴근</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm leading-6 text-muted-foreground">
              입력한 출발 위치에서 공고의 근무지 주소까지 대중교통으로 이동할
              때의 예상 소요시간 기준입니다. 집 주소나 출발역·랜드마크를 입력할
              수 있고, 입력 지점과 실제 이동 시간대에 따라 차이가 날 수
              있습니다. Kakao REST API 키를 설정한 뒤 경로 계산이 활성화됩니다.
            </p>
            <label className="block space-y-2 text-sm font-medium">
              출발 위치 (주소·역·장소)
              <Input
                name="homeLocation"
                maxLength={160}
                defaultValue={data?.home_location ?? ""}
                placeholder="예: 서울시 마포구 월드컵북로 123 또는 합정역"
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
                동의: 대중교통 시간을 계산할 때 입력한 출발 위치와 해당 공고의
                근무지 주소를 Kakao 지도 API에 전송합니다.
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
