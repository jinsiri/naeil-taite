import assert from "node:assert/strict";
import test from "node:test";
import {
  resumeInputSchema,
  formatResumeDate,
} from "../src/lib/resumes/schema.ts";

test("빈 이력서와 범위를 초과하는 입력을 거부한다", () => {
  for (const input of [
    { title: "  ", content: "경력", changeNote: "" },
    { title: "이력서", content: "\n", changeNote: "" },
    { title: "a".repeat(101), content: "경력", changeNote: "" },
    { title: "이력서", content: "a".repeat(100001), changeNote: "" },
    { title: "이력서", content: "경력", changeNote: "a".repeat(501) },
  ])
    assert.equal(resumeInputSchema.safeParse(input).success, false);
});

test("사용자 본문의 줄바꿈과 사실 표현을 그대로 유지한다", () => {
  const content =
    "  경력: 기간 미확인\nReact 경험 있음. Next.js 경험 없음.\n<script>alert('text')</script>\n  ";
  assert.equal(
    resumeInputSchema.parse({ title: "이력서", content, changeNote: "" })
      .content,
    content,
  );
});

test("시간은 한국 시간대로 표시한다", () => {
  assert.equal(
    formatResumeDate("2026-09-23T15:00:00.000Z"),
    formatResumeDate("2026-09-24T00:00:00+09:00"),
  );
  assert.match(formatResumeDate("2026-09-23T15:00:00.000Z"), /24/);
});
