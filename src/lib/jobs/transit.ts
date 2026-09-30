import { z } from "zod";

const addressResponse = z.object({
  documents: z.array(z.object({ x: z.string(), y: z.string() })),
});
const keywordSearchResponse = z.object({
  documents: z.array(z.object({ x: z.string(), y: z.string() })),
});
const routeResponse = z.object({
  routes: z.array(
    z.object({ properties: z.object({ totalTime: z.number().nonnegative() }) }),
  ),
});

async function coordinates(address: string, key: string) {
  const url = new URL("https://dapi.kakao.com/v2/local/search/address.json");
  url.searchParams.set("query", address);
  const response = await fetch(url, {
    headers: { Authorization: `KakaoAK ${key}` },
    signal: AbortSignal.timeout(8_000),
  });
  if (response.ok) {
    const data = addressResponse.safeParse(
      await response.json().catch(() => null),
    );
    const first = data.success ? data.data.documents[0] : undefined;
    if (first) return { x: first.x, y: first.y };
  }
  const keywordUrl = new URL(
    "https://dapi.kakao.com/v2/local/search/keyword.json",
  );
  keywordUrl.searchParams.set("query", address);
  const keywordResponse = await fetch(keywordUrl, {
    headers: { Authorization: `KakaoAK ${key}` },
    signal: AbortSignal.timeout(8_000),
  });
  if (!keywordResponse.ok) return null;
  const data = keywordSearchResponse.safeParse(
    await keywordResponse.json().catch(() => null),
  );
  const first = data.success ? data.data.documents[0] : undefined;
  return first ? { x: first.x, y: first.y } : null;
}

export async function getPublicTransitMinutes(
  from: string,
  to: string,
  key: string,
) {
  try {
    const [start, end] = await Promise.all([
      coordinates(from, key),
      coordinates(to, key),
    ]);
    if (!start || !end) return null;
    const url = new URL("https://dapi.kakao.com/v2/routing/publictraffic");
    url.searchParams.set("start_x", start.x);
    url.searchParams.set("start_y", start.y);
    url.searchParams.set("end_x", end.x);
    url.searchParams.set("end_y", end.y);
    url.searchParams.set("input_coord", "WGS84");
    const response = await fetch(url, {
      headers: { Authorization: `KakaoAK ${key}` },
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) return null;
    const data = routeResponse.safeParse(
      await response.json().catch(() => null),
    );
    const seconds = data.success
      ? data.data.routes[0]?.properties.totalTime
      : undefined;
    return seconds === undefined ? null : Math.ceil(seconds / 60);
  } catch {
    return null;
  }
}

export function commuteFitScore(minutes: number, ideal: number, max: number) {
  if (minutes <= ideal) return 100;
  if (minutes >= max) return 0;
  return Math.round((1 - (minutes - ideal) / (max - ideal)) * 100);
}
