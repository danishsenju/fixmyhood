import { createClient } from "@/lib/supabase/client";

const POINTS = {
  report_created: 10,
  comment: 2,
  progress_update: 5,
  confirm_fix: 5,
  verified_fix: 15,
} as const;

export async function awardPoints(userId: string, action: keyof typeof POINTS) {
  const supabase = createClient();
  const points = POINTS[action];

  const { data: profile } = await supabase
    .from("profiles")
    .select("points")
    .eq("id", userId)
    .single();

  if (profile) {
    await supabase
      .from("profiles")
      .update({ points: profile.points + points })
      .eq("id", userId);
  }
}

export async function checkAndAwardBadges(userId: string) {
  const supabase = createClient();

  // Fetch existing badges + all counts in parallel (was 4+ sequential queries)
  const [badgesResult, reportsCount, commentsCount, confirmFixes] =
    await Promise.all([
      supabase.from("user_badges").select("badge_type").eq("user_id", userId),
      supabase.from("reports").select("id", { count: "exact", head: true }).eq("creator_id", userId),
      supabase.from("comments").select("id", { count: "exact", head: true }).eq("user_id", userId),
      supabase.from("comments").select("id").eq("user_id", userId).eq("comment_type", "confirm_fix"),
    ]);

  const earned = new Set(badgesResult.data?.map((b) => b.badge_type) ?? []);
  const badgesToInsert: { user_id: string; badge_type: "first_report" | "helper" | "resolver" }[] = [];

  if (!earned.has("first_report") && (reportsCount.count ?? 0) >= 1) {
    badgesToInsert.push({ user_id: userId, badge_type: "first_report" });
  }

  if (!earned.has("helper") && (commentsCount.count ?? 0) >= 5) {
    badgesToInsert.push({ user_id: userId, badge_type: "helper" });
  }

  if (!earned.has("resolver") && confirmFixes.data && confirmFixes.data.length > 0) {
    const ids = confirmFixes.data.map((c) => c.id);
    const { data: verifications } = await supabase
      .from("comment_verifications")
      .select("comment_id")
      .in("comment_id", ids);

    const counts: Record<string, number> = {};
    verifications?.forEach((v) => {
      counts[v.comment_id] = (counts[v.comment_id] || 0) + 1;
    });

    if (Object.values(counts).filter((c) => c >= 3).length >= 2) {
      badgesToInsert.push({ user_id: userId, badge_type: "resolver" });
    }
  }

  // Batch upsert all earned badges at once
  if (badgesToInsert.length > 0) {
    await supabase
      .from("user_badges")
      .upsert(badgesToInsert, { onConflict: "user_id,badge_type" });
  }
}
