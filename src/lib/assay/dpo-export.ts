import { supabase } from "@/lib/supabase/client";

function tagsBySentiment(
  tagsSelected: string[] | null,
  tagSentimentMap: Record<string, "positive" | "negative">
): { positive: string[]; negative: string[] } {
  const positive: string[] = [];
  const negative: string[] = [];
  if (!tagsSelected?.length) return { positive, negative };
  for (const key of tagsSelected) {
    if (tagSentimentMap[key] === "positive") positive.push(key);
    else if (tagSentimentMap[key] === "negative") negative.push(key);
  }
  return { positive, negative };
}

export interface DPOPair {
  prompt: string;
  chosen_id: string;
  chosen_overall: number | null;
  chosen_categories: Record<string, number>;
  chosen_tags_positive: string[];
  chosen_tags_negative: string[];
  chosen_tip_ratio: number;
  chosen_score: number;
  rejected_id: string;
  rejected_overall: number | null;
  rejected_categories: Record<string, number>;
  rejected_tags_positive: string[];
  rejected_tags_negative: string[];
  rejected_tip_ratio: number;
  rejected_score: number;
  rejected_dispute_reason: string | null;
  model: string | null;
  task_type: string | null;
  metadata: Record<string, unknown>;
}

export async function generateDPOExport(
  providerId: string,
  opts: { model?: string; since?: string; until?: string; limit?: number } = {}
) {
  let preferredQ = supabase
    .from("invoices")
    .select("*")
    .eq("provider_id", providerId)
    .in("signal_class", ["preferred"])
    .order("quality_score", { ascending: false });
  let rejectedQ = supabase
    .from("invoices")
    .select("*")
    .eq("provider_id", providerId)
    .in("signal_class", ["rejected", "neutral"])
    .order("quality_score", { ascending: true });

  if (opts.model) {
    preferredQ = preferredQ.eq("model", opts.model);
    rejectedQ = rejectedQ.eq("model", opts.model);
  }
  if (opts.since) {
    preferredQ = preferredQ.gte("created_at", opts.since);
    rejectedQ = rejectedQ.gte("created_at", opts.since);
  }
  if (opts.until) {
    preferredQ = preferredQ.lte("created_at", opts.until);
    rejectedQ = rejectedQ.lte("created_at", opts.until);
  }

  const [{ data: preferred }, { data: rejected }] = await Promise.all([preferredQ, rejectedQ]);

  if (!preferred?.length || !rejected?.length) {
    return {
      pairs: [],
      stats: {
        total_preferred: preferred?.length || 0,
        total_rejected: rejected?.length || 0,
        total_pairs: 0,
        models: [],
        date_range: { from: opts.since || "", to: opts.until || "" },
      },
    };
  }

  const pairs: DPOPair[] = [];
  const limit = opts.limit || 1000;

  for (const pref of preferred) {
    const prefTagMap = buildTagSentimentMap(pref.feedback_schema);
    const prefTags = tagsBySentiment(pref.tags_selected ?? [], prefTagMap);
    const prefBase = Number(pref.base_cost) || 1;
    const prefTipRatio = (Number(pref.tip_amount) || 0) / prefBase;

    for (const rej of rejected) {
      if (pairs.length >= limit) break;
      if (pref.model && rej.model && pref.model !== rej.model) continue;

      const rejTagMap = buildTagSentimentMap(rej.feedback_schema);
      const rejTags = tagsBySentiment(rej.tags_selected ?? [], rejTagMap);
      const rejBase = Number(rej.base_cost) || 1;
      const rejTipRatio = (Number(rej.tip_amount) || 0) / rejBase;

      pairs.push({
        prompt: pref.task_description,
        chosen_id: pref.id,
        chosen_overall: pref.rating ?? null,
        chosen_categories: (pref.category_ratings as Record<string, number>) ?? {},
        chosen_tags_positive: prefTags.positive,
        chosen_tags_negative: prefTags.negative,
        chosen_tip_ratio: prefTipRatio,
        chosen_score: pref.quality_score ?? 0,
        rejected_id: rej.id,
        rejected_overall: rej.rating ?? null,
        rejected_categories: (rej.category_ratings as Record<string, number>) ?? {},
        rejected_tags_positive: rejTags.positive,
        rejected_tags_negative: rejTags.negative,
        rejected_tip_ratio: rejTipRatio,
        rejected_score: rej.quality_score ?? 0,
        rejected_dispute_reason: rej.dispute_reason ?? null,
        model: pref.model,
        task_type: pref.task_type ?? null,
        metadata: (pref.task_metadata as Record<string, unknown>) ?? {},
      });
    }
    if (pairs.length >= limit) break;
  }

  const models = [
    ...new Set([
      ...preferred.map((i) => i.model).filter(Boolean),
      ...rejected.map((i) => i.model).filter(Boolean),
    ]),
  ];
  return {
    pairs,
    stats: {
      total_preferred: preferred.length,
      total_rejected: rejected.length,
      total_pairs: pairs.length,
      models,
      date_range: {
        from: opts.since || preferred[preferred.length - 1]?.created_at || "",
        to: opts.until || preferred[0]?.created_at || "",
      },
    },
  };
}

function buildTagSentimentMap(
  schema: { tags?: Array<{ key: string; sentiment: string }> } | null
): Record<string, "positive" | "negative"> {
  const map: Record<string, "positive" | "negative"> = {};
  if (!schema?.tags) return map;
  for (const t of schema.tags) {
    if (t.sentiment === "positive" || t.sentiment === "negative") map[t.key] = t.sentiment;
  }
  return map;
}
