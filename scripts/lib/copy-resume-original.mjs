import { createHash } from "node:crypto";
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");

export async function copyResumeOriginal(bucket, path, bytes, contentType) {
  const existing = await bucket.exists(path);
  if (existing.error && ![400, 404].includes(Number(existing.error.status)))
    throw new Error("CHECK_FAILED");
  if (!existing.data) {
    const result = await bucket.upload(path, bytes, {
      contentType,
      upsert: false,
    });
    if (result.error) throw new Error("UPLOAD_FAILED");
  }
  const remote = await bucket.download(path);
  if (
    remote.error ||
    !remote.data ||
    hash(Buffer.from(await remote.data.arrayBuffer())) !== hash(bytes)
  )
    throw new Error("VERIFY_FAILED");
}
