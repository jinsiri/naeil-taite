import assert from "node:assert/strict";
import test from "node:test";
import {
  uploadInputSchema,
  storagePath,
  safeFileName,
  fileContentType,
} from "../src/lib/resumes/storage-schema.ts";

test("6MB와 10MB 이력서는 허용하고 빈 파일·초과 파일·다른 형식은 거부한다", () => {
  for (const size of [6 * 1024 * 1024, 10 * 1024 * 1024]) {
    assert.equal(
      uploadInputSchema.safeParse({ name: "이력서.PDF", size }).success,
      true,
    );
  }
  for (const input of [
    { name: "x.pdf", size: 0 },
    { name: "x.pdf", size: 10485761 },
    { name: "x.html", size: 10 },
  ]) {
    assert.equal(uploadInputSchema.safeParse(input).success, false);
  }
});
test("파일명은 저장 경로로 쓰지 않고 사용자 UUID와 파일 UUID로만 만든다", () => {
  const owner = "10000000-0000-4000-8000-000000000001";
  const id = "20000000-0000-4000-8000-000000000001";
  assert.equal(storagePath(owner, id), `${owner}/${id}`);
  assert.throws(() => storagePath("../outside", id));
  assert.throws(() => storagePath(owner, "../outside"));
  assert.equal(safeFileName("C:\\private\\이력서.pdf"), "이력서.pdf");
  assert.equal(safeFileName("../../이력서\n.pdf"), "이력서.pdf");
  assert.equal(fileContentType("이력서.PDF"), "application/pdf");
  assert.equal(
    fileContentType("이력서.docx"),
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  );
  assert.throws(() => fileContentType("x.html"));
});
