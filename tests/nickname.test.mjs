import assert from "node:assert/strict";
import test from "node:test";
import {
  generateNickname,
  getDisplayNickname,
  readNickname,
} from "../src/lib/auth/nickname.ts";

test("생성한 닉네임은 한글 수식어와 명사 조합이다", () => {
  for (let i = 0; i < 100; i++) {
    const nickname = generateNickname();
    assert.match(nickname, /^[가-힣]+(?: [가-힣]+){1,2}$/);
    assert.ok(nickname.length <= 40);
  }
});

test("저장된 닉네임을 우선하며 잘못된 메타데이터를 거부한다", () => {
  assert.equal(
    getDisplayNickname("user-id", { nickname: "노래하는 족제비" }),
    "노래하는 족제비",
  );
  for (const metadata of [
    null,
    {},
    { nickname: " " },
    { nickname: 42 },
    { nickname: "가".repeat(41) },
  ]) {
    assert.equal(readNickname(metadata), null);
    assert.equal(
      getDisplayNickname("user-id", metadata),
      getDisplayNickname("user-id", {}),
    );
  }
});
