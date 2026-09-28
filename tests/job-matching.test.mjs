import assert from "node:assert/strict";
import test from "node:test";
import {
  compareRequirement,
  extractRequirements,
} from "../src/lib/jobs/matching.ts";

test("공고 원문에서 제목만 제외하고 비교할 문장을 분리한다", () => {
  const requirements = extractRequirements(
    "자격 요건\n- React와 TypeScript를 이용한 화면 개발 경험\n- 코드 리뷰와 협업 경험",
  );
  assert.deepEqual(requirements, [
    "React와 TypeScript를 이용한 화면 개발 경험",
    "코드 리뷰와 협업 경험",
  ]);
});

test("직접 일치, 일부 단어, 근거 없음 상태에 원문 근거를 연결한다", () => {
  const exact = compareRequirement(
    "React로 사용자 화면 개발 경험",
    "React로 사용자 화면 개발 경험을 보유했습니다.",
  );
  assert.equal(exact.status, "matched");
  assert.equal(exact.evidence, "React로 사용자 화면 개발 경험을 보유했습니다.");

  const partial = compareRequirement(
    "React와 TypeScript를 이용한 화면 개발 경험",
    "React 프로젝트에서 화면을 개발했습니다.",
  );
  assert.equal(partial.status, "partial");
  assert.equal(partial.evidence, "React 프로젝트에서 화면을 개발했습니다.");

  const unknown = compareRequirement(
    "AWS 운영 경험",
    "React 프로젝트에서 화면을 개발했습니다.",
  );
  assert.equal(unknown.status, "unknown");
  assert.equal(unknown.evidence, "");
});
