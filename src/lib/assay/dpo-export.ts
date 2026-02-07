import { supabase } from "@/lib/supabase/client";

export interface DPOPair {
  prompt: string;
  chosen_id: string;
  chosen_score: number;
  chosen_rating: number;
  chosen_tip_ratio: number;
  rejected_id: string;
  rejected_score: number;
  rejected_rating: number | null;
  rejected_reason: string | null;
  model: string | null;
  metadata: {
    chosen_payment_method: string | null;
    rejected_payment_method: string | null;
    export_timestamp: string;
  };
}

export async function generateDPOExport(
  providerId: string,
  opts: { model?: string; since?: string; until?: string; limit?: number } = {}
) {
  let preferredQ = supabase
    .from("invoices").select("*").eq("provider_id", providerId)
    .in("signal_class", ["preferred"]).order("quality_score", { ascending: false });
  let rejectedQ = supabase
    .from("invoices").select("*").eq("provider_id", providerId)
    .in("signal_class", ["rejected", "neutral"]).order("quality_score", { ascending: true });

  if (opts.model) { preferredQ = preferredQ.eq("model", opts.model); rejectedQ = rejectedQ.eq("model", opts.model); }
  if (opts.since) { preferredQ = preferredQ.gte("created_at", opts.since); rejectedQ = rejectedQ.gte("created_at", opts.since); }
  if (opts.until) { preferredQ = preferredQ.lte("created_at", opts.until); rejectedQ = rejectedQ.lte("created_at", opts.until); }

  const [{ data: preferred }, { data: rejected }] = await Promise.all([preferredQ, rejectedQ]);

  if (!preferred?.length || !rejected?.length) {
    return { pairs: [], stats: { total_preferred: preferred?.length || 0, total_rejected: rejected?.length || 0, total_pairs: 0, models: [], date_range: { from: opts.since || "", to: opts.until || "" } } };
  }

  const pairs: DPOPair[] = [];
  const limit = opts.limit || 1000;

  for (const pref of preferred) {
    for (const rej of rejected) {
      if (pairs.length >= limit) break;
      if (pref.model && rej.model && pref.model !== rej.model) continue;
      pairs.push({
        prompt: pref.task_description,
        chosen_id: pref.id, chosen_score: pref.quality_score, chosen_rating: pref.rating,
        chosen_tip_ratio: pref.tip_amount / pref.base_cost,
        rejected_id: rej.id, rejected_score: rej.quality_score || 0, rejected_rating: rej.rating,
        rejected_reason: rej.dispute_reason, model: pref.model,
        metadata: { chosen_payment_method: pref.payment_method, rejected_payment_method: rej.payment_method, export_timestamp: new Date().toISOString() },
      });
    }
    if (pairs.length >= limit) break;
  }

  const models = [...new Set([...preferred.map(i => i.model).filter(Boolean), ...rejected.map(i => i.model).filter(Boolean)])];
  return { pairs, stats: { total_preferred: preferred.length, total_rejected: rejected.length, total_pairs: pairs.length, models, date_range: { from: opts.since || preferred[preferred.length - 1]?.created_at || "", to: opts.until || preferred[0]?.created_at || "" } } };
}
