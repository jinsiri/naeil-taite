import { randomInt, createHash } from "node:crypto";
import { z } from "zod";

const adjectives = [
  "노래하는",
  "춤추는",
  "꿈꾸는",
  "반짝이는",
  "다정한",
  "씩씩한",
  "포근한",
  "용감한",
  "느긋한",
  "상냥한",
  "호기심 많은",
  "산책하는",
  "웃음 짓는",
  "책 읽는",
  "햇살 같은",
  "생각하는",
];
const nouns = [
  "족제비",
  "다람쥐",
  "수달",
  "고슴도치",
  "토끼",
  "사슴",
  "여우",
  "참새",
  "고양이",
  "강아지",
  "판다",
  "펭귄",
  "부엉이",
  "돌고래",
  "새싹",
  "나무",
];

// Display names may overlap. Authorization always uses the Supabase user ID.
export function generateNickname() {
  return `${adjectives[randomInt(adjectives.length)]} ${nouns[randomInt(nouns.length)]}`;
}

export function readNickname(metadata: unknown) {
  const parsed = z
    .object({ nickname: z.string().trim().min(1).max(40) })
    .safeParse(metadata);
  return parsed.success ? parsed.data.nickname : null;
}

// Existing accounts also get a stable display name without a write during rendering.
export function getDisplayNickname(id: string, metadata: unknown) {
  const saved = readNickname(metadata);
  if (saved) return saved;
  const digest = createHash("sha256").update(id).digest();
  return `${adjectives[digest[0] % adjectives.length]} ${nouns[digest[1] % nouns.length]}`;
}
