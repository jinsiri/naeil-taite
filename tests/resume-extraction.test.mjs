import assert from "node:assert/strict";
import test from "node:test";
import "./helpers/register-typescript.mjs";
const { extractResumeFile } = await import("../src/lib/resumes/extract.ts");
const { loadStoredResumeFile } = await import("../src/lib/resumes/storage.ts");

function pdfFixture() {
  const stream = "BT /F1 12 Tf 72 720 Td (Resume experience) Tj ET";
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
  ];
  let pdf = "%PDF-1.4\n" + ("%" + " ".repeat(1022) + "\n").repeat(6144);
  const offsets = [0];
  for (let index = 0; index < objects.length; index++) {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${index + 1} 0 obj\n${objects[index]}\nendobj\n`;
  }
  const xref = Buffer.byteLength(pdf);
  pdf += `xref\n0 6\n0000000000 65535 f \n${offsets
    .slice(1)
    .map((n) => `${String(n).padStart(10, "0")} 00000 n \n`)
    .join("")}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new File([pdf], "resume.pdf", { type: "application/pdf" });
}
const owner = "10000000-0000-4000-8000-000000000001";
const id = "20000000-0000-4000-8000-000000000001";
function clientFixture(file, overrides = {}) {
  const filters = {};
  const row = {
    id,
    user_id: owner,
    name: file.name,
    size: file.size,
    state: "pending",
    ...overrides,
  };
  const query = {
    select() {
      return this;
    },
    eq(key, value) {
      filters[key] = value;
      return this;
    },
    async maybeSingle() {
      return {
        data:
          filters.user_id === row.user_id && filters.id === row.id ? row : null,
        error: null,
      };
    },
  };
  return {
    from(table) {
      assert.equal(table, "resume_files");
      return query;
    },
    storage: {
      from(bucket) {
        assert.equal(bucket, "resume-originals");
        return {
          async download(path) {
            assert.equal(path, `${owner}/${id}`);
            return { data: file, error: null };
          },
        };
      },
    },
  };
}

test("6MB PDF를 Storage에서 읽어 파일 재전송 없이 텍스트를 추출한다", async () => {
  const file = pdfFixture();
  assert.ok(file.size > 6 * 1024 * 1024);
  const stored = await loadStoredResumeFile(clientFixture(file), owner, id);
  assert.match(await extractResumeFile(stored.file), /Resume experience/);
});
test("다른 사용자, 취소한 파일, 크기가 다른 파일은 추출 전에 거절한다", async () => {
  const file = new File(["experience"], "resume.txt");
  await assert.rejects(
    loadStoredResumeFile(
      clientFixture(file),
      "10000000-0000-4000-8000-000000000002",
      id,
    ),
  );
  await assert.rejects(
    loadStoredResumeFile(
      clientFixture(file, { state: "discarded" }),
      owner,
      id,
    ),
  );
  await assert.rejects(
    loadStoredResumeFile(clientFixture(file, { size: 1 }), owner, id),
  );
});
test("서버 추출은 위장 형식과 10MB 초과 파일을 거절한다", async () => {
  await assert.rejects(extractResumeFile(new File(["fake pdf"], "resume.pdf")));
  await assert.rejects(
    extractResumeFile(new File([new Uint8Array(10485761)], "resume.txt")),
  );
  assert.equal(
    await extractResumeFile(new File(["경력: 직접 작성"], "resume.txt")),
    "경력: 직접 작성",
  );
});
