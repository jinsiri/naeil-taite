"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  nextActionFieldsSchema,
  actionDueLabel,
  type NextAction,
  type NextActionFields,
} from "@/lib/applications/next-action-schema";
import { saveNextAction } from "@/app/applications/next-action-actions";

type Seed = { id: string; text: string };
export function NextActionPanel({
  applicationId,
  actions,
  seed,
}: {
  applicationId: string;
  actions: NextAction[];
  seed?: Seed;
}) {
  const ordered = [...actions].sort(
    (a, b) =>
      Number(Boolean(a.completed_at)) - Number(Boolean(b.completed_at)) ||
      (a.due_on ?? "9999").localeCompare(b.due_on ?? "9999") ||
      a.id.localeCompare(b.id),
  );
  return (
    <Card id="next-actions">
      <CardHeader>
        <CardTitle>다음 행동과 기한</CardTitle>
        <p className="text-sm text-muted-foreground">
          지원 준비, 면접 준비 등 다음에 할 일을 기록하고 완료한 일을
          확인하세요.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <ActionForm
          key={seed?.id ?? "new"}
          applicationId={applicationId}
          seed={seed}
        />
        {!actions.length && (
          <p className="text-sm text-muted-foreground">
            아직 다음 행동이 없어요.
          </p>
        )}
        <ol className="space-y-3">
          {ordered.map((action) => (
            <li key={action.id} className="rounded-lg border p-4">
              <details>
                <summary className="cursor-pointer space-y-1">
                  <span className="font-medium">{action.title}</span>
                  <span className="ml-3 text-xs text-muted-foreground">
                    {actionDueLabel(
                      action.due_on,
                      Boolean(action.completed_at),
                    )}
                  </span>
                </summary>
                <div className="mt-4">
                  <ActionForm
                    key={action.revision}
                    applicationId={applicationId}
                    action={action}
                  />
                </div>
              </details>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}

function ActionForm({
  applicationId,
  action,
  seed,
}: {
  applicationId: string;
  action?: NextAction;
  seed?: Seed;
}) {
  const router = useRouter();
  const request = useRef<{ payload: string; id: string } | null>(null);
  const [message, setMessage] = useState("");
  const [source, setSource] = useState(seed?.id ?? null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<NextActionFields>({
    resolver: zodResolver(nextActionFieldsSchema),
    defaultValues: {
      title: action?.title ?? seed?.text.slice(0, 160) ?? "",
      note: action?.note ?? seed?.text ?? "",
      dueOn: action?.due_on ?? "",
      completed: Boolean(action?.completed_at),
    },
  });
  return (
    <form
      className="space-y-3"
      onSubmit={(event) =>
        handleSubmit(async (values) => {
          const payload = {
            ...values,
            applicationId,
            expectedRevision: action?.revision ?? 0,
            sourceReflectionId: action?.source_reflection_id ?? source,
          };
          const serialized = JSON.stringify(payload);
          if (request.current?.payload !== serialized)
            request.current = {
              payload: serialized,
              id: action?.id ?? crypto.randomUUID(),
            };
          setMessage("");
          try {
            const result = await saveNextAction({
              ...payload,
              id: request.current.id,
            });
            if (result.error) {
              setMessage(result.error);
              return;
            }
            if (!action) {
              reset({ title: "", note: "", dueOn: "", completed: false });
              setSource(null);
              request.current = null;
            }
            setMessage("다음 행동을 저장했어요.");
            router.refresh();
          } catch {
            setMessage(
              "완료를 확인하지 못했어요. 기록을 확인하거나 같은 내용으로 다시 시도해 주세요.",
            );
          }
        })(event)
      }
    >
      <fieldset disabled={isSubmitting} className="space-y-3">
        {source && (
          <p className="text-xs text-primary">
            회고에서 가져온 초안입니다. 내용과 기한을 확인한 뒤 추가해 주세요.
          </p>
        )}
        <label className="block space-y-2 text-sm font-medium">
          다음 행동
          <Input
            {...register("title")}
            maxLength={160}
            placeholder="예: 면접에서 설명할 프로젝트 경험 정리"
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block space-y-2 text-sm font-medium">
            기한 (선택)
            <Input type="date" {...register("dueOn")} />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" {...register("completed")} />
            완료한 행동
          </label>
        </div>
        <label className="block space-y-2 text-sm font-medium">
          메모 (선택)
          <Textarea {...register("note")} maxLength={2000} />
        </label>
        {Object.values(errors).map((error, index) => (
          <p key={index} role="alert" className="text-sm text-destructive">
            {error.message}
          </p>
        ))}
        <Button type="submit" variant="outline" disabled={isSubmitting}>
          {isSubmitting ? "저장 중…" : action ? "변경 저장" : "다음 행동 추가"}
        </Button>
      </fieldset>
      {message && (
        <p role="status" className="text-sm text-muted-foreground">
          {message}
        </p>
      )}
    </form>
  );
}
