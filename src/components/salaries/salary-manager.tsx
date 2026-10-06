"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Plus,
  Wallet,
  TrendingUp,
  History,
  Pencil,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  salaryFieldsSchema,
  type SalaryFields,
  type SalaryRecord,
} from "@/lib/salaries/schema";
import {
  latestByCareer,
  sortSalaryRecords,
  previousSalaryRecord,
  formatSalary,
  formatDifference,
  salaryDifference,
} from "@/lib/salaries/comparison";
import { saveSalary, deleteSalary } from "@/app/salaries/actions";

export function SalaryManager({ records }: { records: SalaryRecord[] }) {
  const router = useRouter();
  const [editor, setEditor] = useState<SalaryRecord | "new" | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const sorted = sortSalaryRecords(records);
  const byCareer = latestByCareer(records);
  const latest = sorted[0];
  const previous = latest ? previousSalaryRecord(latest, records) : null;
  const difference =
    latest && previous
      ? salaryDifference(latest.amount, previous.amount)
      : null;
  const maxAmount = Math.max(1, ...byCareer.map((record) => record.amount));
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          세전 계약연봉 · 만원 단위 · 성과급·퇴직금 제외
        </p>
        <Button
          onClick={() => {
            setEditor("new");
            setMessage("");
          }}
          disabled={editor !== null}
        >
          <Plus aria-hidden="true" />
          연봉 기록하기
        </Button>
      </div>
      {editor !== null && (
        <SalaryForm
          key={editor === "new" ? "new" : `${editor.id}:${editor.revision}`}
          record={editor === "new" ? undefined : editor}
          onClose={() => setEditor(null)}
          onSaved={() => {
            setEditor(null);
            setMessage("연봉 기록을 저장했어요.");
            router.refresh();
          }}
        />
      )}
      {message && (
        <p role="status" className="text-sm text-muted-foreground">
          {message}
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-3">
        <Summary
          label="최근 적용 연봉"
          value={latest ? formatSalary(latest.amount) : "—"}
          detail={
            latest
              ? `${latest.career_year}년차 · ${latest.effective_on} 적용`
              : "첫 연봉을 기록해 주세요"
          }
          icon={Wallet}
        />
        <Summary
          label="직전 연봉 대비 증감률"
          value={
            difference?.percent === null || !difference
              ? "—"
              : `${difference.percent > 0 ? "+" : ""}${difference.percent.toFixed(1)}%`
          }
          detail={
            previous && latest
              ? `${previous.effective_on} 기준 · ${formatDifference(latest.amount, previous.amount).split(" (")[0]}`
              : latest
                ? "비교할 이전 연봉 기록이 없어요"
                : "직전 연봉 기록을 추가하면 비교할 수 있어요"
          }
          icon={TrendingUp}
        />
        <Summary
          label="쌓인 연봉 기록"
          value={`${records.length}건`}
          detail={`${byCareer.length}개 연차의 연봉을 기록했어요`}
          icon={History}
        />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>연차별 연봉 변화</CardTitle>
          <p className="text-sm leading-6 text-muted-foreground">
            업종과 관계없이 직접 입력한 전체 경력 연차로 비교합니다. 같은 연차에
            여러 기록이 있으면 적용일이 가장 최근인 연봉을 표시합니다.
          </p>
        </CardHeader>
        <CardContent>
          {!byCareer.length ? (
            <div className="space-y-3 py-10 text-center">
              <Wallet
                aria-hidden="true"
                className="mx-auto size-9 text-primary"
              />
              <p className="font-medium">
                첫 연봉부터 지금까지, 차곡차곡 기록해 보세요
              </p>
              <p className="text-sm text-muted-foreground">
                적용일·전체 경력 연차·세전 연봉만 입력하면 시작할 수 있어요.
              </p>
            </div>
          ) : (
            <ol aria-label="연차별 연봉 비교" className="space-y-5">
              {byCareer.map((record) => (
                <li
                  key={record.id}
                  className="grid grid-cols-[4rem_minmax(0,1fr)] items-center gap-3"
                >
                  <span className="text-sm font-medium">
                    {record.career_year}년차
                  </span>
                  <div className="space-y-2">
                    <div className="flex flex-wrap justify-between gap-2 text-sm">
                      <span className="text-muted-foreground">
                        {record.effective_on.slice(0, 4)}년
                        {record.company ? ` · ${record.company}` : ""}
                      </span>
                      <strong className="tabular-nums">
                        {formatSalary(record.amount)}
                      </strong>
                    </div>
                    <div
                      aria-hidden="true"
                      className="h-3 overflow-hidden rounded-full bg-secondary"
                    >
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{
                          width: `${(record.amount / maxAmount) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>연봉 이력과 직전 연봉 비교</CardTitle>
          <p className="text-sm leading-6 text-muted-foreground">
            증감률 = (해당 연봉 − 직전 연봉) ÷ 직전 연봉 × 100. 연봉 적용일
            순서로 비교하므로 같은 해의 변경이나 2년 이상 간격의 이직도
            반영합니다. 적용일이 같으면 등록 시각 순서로 비교합니다. 연간
            인상률이 아니라 두 계약 연봉 사이의 증감률입니다.
          </p>
        </CardHeader>
        <CardContent>
          {!sorted.length ? (
            <p className="py-4 text-sm text-muted-foreground">
              아직 저장된 연봉 기록이 없어요.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[44rem] text-left text-sm">
                <caption className="sr-only">
                  적용일 내림차순 연봉 기록과 직전 연봉 대비 증감
                </caption>
                <thead>
                  <tr className="border-b text-muted-foreground">
                    {[
                      "적용일 / 연차",
                      "회사 / 메모",
                      "세전 연봉",
                      "직전 연봉 대비",
                      "관리",
                    ].map((label) => (
                      <th
                        key={label}
                        scope="col"
                        className="px-3 py-3 font-medium"
                      >
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {sorted.map((record) => {
                    const reference = previousSalaryRecord(record, records);
                    return (
                      <tr key={record.id}>
                        <td className="px-3 py-4">
                          <time dateTime={record.effective_on}>
                            {record.effective_on}
                          </time>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {record.career_year}년차
                          </p>
                        </td>
                        <td className="max-w-64 px-3 py-4">
                          <p>{record.company || "회사 미입력"}</p>
                          {record.note && (
                            <p className="mt-1 text-xs whitespace-pre-wrap text-muted-foreground">
                              {record.note}
                            </p>
                          )}
                        </td>
                        <td className="px-3 py-4 font-medium whitespace-nowrap tabular-nums">
                          {formatSalary(record.amount)}
                        </td>
                        <td className="px-3 py-4 tabular-nums">
                          {reference ? (
                            <>
                              <p>
                                {formatDifference(
                                  record.amount,
                                  reference.amount,
                                )}
                              </p>
                              <p className="mt-1 text-xs text-muted-foreground">
                                {reference.effective_on} ·{" "}
                                {formatSalary(reference.amount)}
                              </p>
                            </>
                          ) : (
                            <span className="text-muted-foreground">
                              직전 연봉 기록 없음
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-4">
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={editor !== null || deleting !== null}
                              aria-label={`${record.effective_on} 연봉 수정`}
                              onClick={() => setEditor(record)}
                            >
                              <Pencil aria-hidden="true" />
                              수정
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={deleting !== null || editor !== null}
                              aria-label={`${record.effective_on} 연봉 삭제`}
                              onClick={async () => {
                                if (
                                  !window.confirm(
                                    `${record.effective_on}의 ${formatSalary(record.amount)} 기록을 삭제할까요? 비교 결과도 다시 계산되며 되돌릴 수 없습니다.`,
                                  )
                                )
                                  return;
                                setDeleting(record.id);
                                setMessage("");
                                try {
                                  const result = await deleteSalary({
                                    id: record.id,
                                    expectedRevision: record.revision,
                                    approved: true,
                                  });
                                  setMessage(
                                    result.error ?? "연봉 기록을 삭제했어요.",
                                  );
                                  if (!result.error) router.refresh();
                                } catch {
                                  setMessage(
                                    "삭제 완료를 확인하지 못했어요. 새로고침해 기록을 확인해 주세요.",
                                  );
                                } finally {
                                  setDeleting(null);
                                }
                              }}
                            >
                              <Trash2 aria-hidden="true" />
                              {deleting === record.id ? "삭제 중…" : "삭제"}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
function Summary({
  label,
  value,
  detail,
  icon: Icon,
}: {
  label: string;
  value: string;
  detail: string;
  icon: typeof Wallet;
}) {
  return (
    <Card>
      <CardContent className="space-y-3 p-5">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{label}</span>
          <Icon aria-hidden="true" className="size-5 text-primary" />
        </div>
        <p className="text-2xl font-semibold tabular-nums">{value}</p>
        <p className="text-xs text-muted-foreground">{detail}</p>
      </CardContent>
    </Card>
  );
}
function SalaryForm({
  record,
  onClose,
  onSaved,
}: {
  record?: SalaryRecord;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [message, setMessage] = useState("");
  const request = useRef<{ key: string; id: string } | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SalaryFields>({
    resolver: zodResolver(salaryFieldsSchema),
    defaultValues: {
      effectiveOn: record?.effective_on ?? "",
      careerYear: record?.career_year,
      company: record?.company ?? "",
      amount: record?.amount,
      note: record?.note ?? "",
    },
  });
  return (
    <Card id="salary-editor" className="border-primary/40">
      <CardHeader>
        <CardTitle>{record ? "연봉 기록 수정" : "연봉 기록하기"}</CardTitle>
        <p className="text-sm text-muted-foreground">
          이직이나 연봉 인상은 새 기록으로 추가하세요. 수정은 잘못 입력한 내용을
          바로잡을 때 사용할 수 있어요.
        </p>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-4"
          onSubmit={(event) =>
            handleSubmit(async (values) => {
              const key = JSON.stringify(values);
              if (request.current?.key !== key)
                request.current = {
                  key,
                  id: record?.id ?? crypto.randomUUID(),
                };
              setMessage("");
              try {
                const result = await saveSalary({
                  ...values,
                  id: request.current.id,
                  expectedRevision: record?.revision ?? 0,
                });
                if (result.error) setMessage(result.error);
                else onSaved();
              } catch {
                setMessage(
                  "저장 완료를 확인하지 못했어요. 기록을 확인하거나 같은 내용으로 다시 시도해 주세요.",
                );
              }
            })(event)
          }
        >
          <fieldset
            disabled={isSubmitting}
            className="grid gap-4 sm:grid-cols-2"
          >
            <label className="space-y-2 text-sm font-medium">
              연봉 적용일
              <Input
                type="date"
                autoFocus
                {...register("effectiveOn")}
                aria-invalid={!!errors.effectiveOn}
              />
              {errors.effectiveOn && (
                <span role="alert" className="text-xs text-destructive">
                  {errors.effectiveOn.message}
                </span>
              )}
            </label>
            <label className="space-y-2 text-sm font-medium">
              전체 경력 연차
              <Input
                type="number"
                min={1}
                max={60}
                placeholder="예: 3"
                {...register("careerYear", { valueAsNumber: true })}
                aria-invalid={!!errors.careerYear}
              />
              <span className="text-xs font-normal text-muted-foreground">
                업종이 바뀌어도 전체 경력을 기준으로 입력하세요.
              </span>
              {errors.careerYear && (
                <span role="alert" className="block text-xs text-destructive">
                  {errors.careerYear.message}
                </span>
              )}
            </label>
            <label className="space-y-2 text-sm font-medium">
              세전 계약연봉 (만원)
              <Input
                type="number"
                min={1}
                max={1000000}
                step={1}
                placeholder="예: 4500"
                {...register("amount", { valueAsNumber: true })}
                aria-invalid={!!errors.amount}
              />
              {errors.amount && (
                <span role="alert" className="text-xs text-destructive">
                  {errors.amount.message}
                </span>
              )}
            </label>
            <label className="space-y-2 text-sm font-medium">
              회사 (선택)
              <Input maxLength={100} {...register("company")} />
              {errors.company && (
                <span role="alert" className="text-xs text-destructive">
                  {errors.company.message}
                </span>
              )}
            </label>
            <label className="space-y-2 text-sm font-medium sm:col-span-2">
              메모 (선택)
              <Textarea
                maxLength={1000}
                placeholder="예: 업종 전환, 이직, 연봉 인상"
                {...register("note")}
              />
              {errors.note && (
                <span role="alert" className="text-xs text-destructive">
                  {errors.note.message}
                </span>
              )}
            </label>
          </fieldset>
          {message && (
            <p role="alert" className="text-sm text-destructive">
              {message}
            </p>
          )}
          <div className="flex gap-2">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "저장 중…" : "저장하기"}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={onClose}
            >
              취소
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
