import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { applicationOverviewSchema, type ApplicationOverview } from "./schema";

export async function loadApplicationOverview(
  client: SupabaseClient,
  userId: string,
) {
  const rows: ApplicationOverview[] = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await client
      .from("application_overview")
      .select("*")
      .eq("user_id", userId)
      .order("id")
      .range(offset, offset + 499);
    if (error) return { rows: [], error };
    const page = z.array(applicationOverviewSchema).parse(data);
    rows.push(...page);
    if (page.length < 500) return { rows, error: null };
  }
}
