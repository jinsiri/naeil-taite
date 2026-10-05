import Link from "next/link";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  nextActionSchema,
  actionDueLabel,
} from "@/lib/applications/next-action-schema";

export async function NextActionsSummary({
  client,
  userId,
}: {
  client: SupabaseClient;
  userId: string;
}) {
  const { data, error } = await client
    .from("next_actions")
    .select(
      "*,applications!inner(job_posting_id,job_postings!inner(title,company))",
    )
    .eq("user_id", userId)
    .is("completed_at", null)
    .order("due_on", { ascending: true, nullsFirst: false })
    .order("id")
    .limit(6);
  if (error)
    return (
      <Card>
        <CardContent className="py-6 text-sm text-muted-foreground">
          다음 행동을 불러오지 못했어요. 잠시 후 다시 확인해 주세요.
        </CardContent>
      </Card>
    );
  const actions = z
    .array(
      nextActionSchema.extend({
        applications: z.object({
          job_posting_id: z.uuid(),
          job_postings: z.object({ title: z.string(), company: z.string() }),
        }),
      }),
    )
    .parse(data);
  return (
    <Card>
      <CardHeader>
        <CardTitle>다음에 할 일</CardTitle>
        <p className="text-sm text-muted-foreground">
          미완료 행동을 기한순으로 최대 6개 보여드려요.
        </p>
      </CardHeader>
      <CardContent>
        {!actions.length ? (
          <p className="text-sm text-muted-foreground">
            공고 상세에서 다음 행동과 기한을 추가해 보세요.
          </p>
        ) : (
          <ul className="divide-y">
            {actions.map((action) => (
              <li key={action.id} className="py-3">
                <Link
                  href={`/jobs/${action.applications.job_posting_id}#next-actions`}
                  className="block space-y-1 hover:text-primary"
                >
                  <p className="font-medium">{action.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {action.applications.job_postings.company} ·{" "}
                    {action.applications.job_postings.title} ·{" "}
                    {actionDueLabel(action.due_on, false)}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
