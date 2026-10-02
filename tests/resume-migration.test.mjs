import assert from "node:assert/strict";
import test from "node:test";
import { copyResumeOriginal } from "../scripts/lib/copy-resume-original.mjs";

test("이전 도구는 없는 파일을 업로드하고 바이트 일치를 확인한다", async () => {
  let uploaded = false;
  const bytes = Buffer.from("original");
  await copyResumeOriginal(
    {
      async exists() {
        return { data: false, error: { status: 404 } };
      },
      async upload(path, data, options) {
        assert.equal(path, "owner/id");
        assert.deepEqual(data, bytes);
        assert.equal(options.upsert, false);
        uploaded = true;
        return { error: null };
      },
      async download() {
        assert.ok(uploaded);
        return { data: new Blob([bytes]), error: null };
      },
    },
    "owner/id",
    bytes,
    "text/plain",
  );
});
test("이미 이전한 파일은 덮어쓰지 않으며 내용이 다르면 연결 전환을 거부한다", async () => {
  const bucket = {
    async exists() {
      return { data: true, error: null };
    },
    async upload() {
      assert.fail("Must never overwrite");
    },
    async download() {
      return { data: new Blob(["different"]), error: null };
    },
  };
  await assert.rejects(
    copyResumeOriginal(
      bucket,
      "owner/id",
      Buffer.from("original"),
      "text/plain",
    ),
    /VERIFY_FAILED/,
  );
  await copyResumeOriginal(
    bucket,
    "owner/id",
    Buffer.from("different"),
    "text/plain",
  );
});
test("연결 오류를 파일 없음으로 취급하지 않는다", async () => {
  await assert.rejects(
    copyResumeOriginal(
      {
        async exists() {
          return { data: false, error: { status: 503 } };
        },
        async upload() {
          assert.fail("Must not upload after failed check");
        },
      },
      "owner/id",
      Buffer.from("original"),
      "text/plain",
    ),
    /CHECK_FAILED/,
  );
});
