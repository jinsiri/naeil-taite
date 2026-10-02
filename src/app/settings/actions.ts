"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getIdentity } from "@/lib/supabase/server";
import {
  DEFAULT_SCORE_WEIGHTS,
  scoringPreferencesWeightsSchema,
} from "@/lib/jobs/scoring";

const schema = z
  .object({
    homeLocation: z.string().trim().max(160),
    commuteIdeal: z.coerce.number().int().min(0).max(240),
    commuteMax: z.coerce.number().int().min(1).max(300),
    transitConsent: z.boolean(),
    weights: scoringPreferencesWeightsSchema,
  })
  .refine((value) => value.commuteMax > value.commuteIdeal);

export async function saveScoringPreferences(formData: FormData) {
  const identity = await getIdentity();
  if (!identity) redirect("/login");
  const parsed = schema.safeParse({
    homeLocation: formData.get("homeLocation"),
    commuteIdeal: formData.get("commuteIdeal"),
    commuteMax: formData.get("commuteMax"),
    transitConsent: formData.get("transitConsent") === "on",
    weights: Object.fromEntries(
      Object.keys(DEFAULT_SCORE_WEIGHTS).map((key) => [
        key,
        Number(formData.get(`weight_${key}`)),
      ]),
    ),
  });
  if (!parsed.success) redirect("/settings/scoring?error=invalid");
  const { error } = await identity.client.from("scoring_preferences").upsert({
    user_id: identity.user.id,
    home_location: parsed.data.homeLocation,
    commute_ideal_minutes: parsed.data.commuteIdeal,
    commute_max_minutes: parsed.data.commuteMax,
    transit_consent: parsed.data.transitConsent,
    weights: parsed.data.weights,
    updated_at: new Date().toISOString(),
  });
  if (error) redirect("/settings/scoring?error=save");
  revalidatePath("/settings/scoring");
  redirect("/settings/scoring?saved=1");
}
