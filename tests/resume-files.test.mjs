import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  attachmentPath,
  saveAttachment,
  readAttachment,
} from "../src/lib/resumes/files.ts";

const owner = "10000000-0000-4000-8000-000000000001";
const other = "10000000-0000-4000-8000-000000000002";

test("파일은 사용자별 비공개 경로에 원문 그대로 저장된다", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "resume-files-test-"));
  const original = process.env.RESUME_STORAGE_DIR;
  process.env.RESUME_STORAGE_DIR = dir;
  try {
    const bytes = "%PDF-1.7\nfixture";
    const file = await saveAttachment(
      owner,
      new File([bytes], "../../이력서.pdf"),
    );
    assert.equal(file.name, "이력서.pdf");
    assert.equal((await readAttachment(owner, file.id)).toString(), bytes);
    assert.equal(
      (await stat(attachmentPath(owner, file.id))).mode & 0o777,
      0o600,
    );
    await assert.rejects(readAttachment(other, file.id));
    assert.throws(() => attachmentPath("../outside", file.id));
    assert.throws(() => attachmentPath(owner, "../outside"));
  } finally {
    if (original === undefined) delete process.env.RESUME_STORAGE_DIR;
    else process.env.RESUME_STORAGE_DIR = original;
    await rm(dir, { recursive: true, force: true });
  }
});

test("허용하지 않은 확장자, 잘못된 형식, 빈 파일과 큰 파일을 거부한다", async () => {
  await assert.rejects(
    saveAttachment(owner, new File(["text"], "payload.html")),
  );
  await assert.rejects(saveAttachment(owner, new File(["text"], "fake.pdf")));
  await assert.rejects(saveAttachment(owner, new File(["text"], "fake.docx")));
  await assert.rejects(saveAttachment(owner, new File([], "empty.txt")));
  await assert.rejects(
    saveAttachment(owner, new File([new Uint8Array(10485761)], "large.txt")),
  );
});
