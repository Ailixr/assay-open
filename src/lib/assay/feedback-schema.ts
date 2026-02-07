import { supabase } from "@/lib/supabase/client";
import type { FeedbackSchema } from "@/types";

/** Resolution order: 1) invoice-level, 2) provider default for task_type, 3) preset for task_type, 4) general preset */
export async function resolveFeedbackSchema(
  providerId: string,
  taskType: string | null,
  invoiceFeedback: Partial<FeedbackSchema> | null
): Promise<FeedbackSchema> {
  if (invoiceFeedback && hasCategoriesOrTags(invoiceFeedback)) {
    return normalizeFeedbackSchema(invoiceFeedback);
  }

  const effectiveType = taskType || "general";
  const { data: providerDefault } = await supabase
    .from("feedback_defaults")
    .select("categories, tags, comment_prompt")
    .eq("provider_id", providerId)
    .eq("task_type", effectiveType)
    .single();

  if (providerDefault && (providerDefault.categories?.length || providerDefault.tags?.length)) {
    return normalizeFeedbackSchema({
      categories: providerDefault.categories || [],
      tags: providerDefault.tags || [],
      comment_prompt: providerDefault.comment_prompt ?? undefined,
    });
  }

  const { data: preset } = await supabase
    .from("feedback_presets")
    .select("categories, tags, comment_prompt")
    .eq("task_type", effectiveType)
    .single();

  if (preset) {
    return normalizeFeedbackSchema({
      categories: preset.categories || [],
      tags: preset.tags || [],
      comment_prompt: preset.comment_prompt ?? undefined,
    });
  }

  const { data: general } = await supabase
    .from("feedback_presets")
    .select("categories, tags, comment_prompt")
    .eq("task_type", "general")
    .single();

  if (general) {
    return normalizeFeedbackSchema({
      categories: general.categories || [],
      tags: general.tags || [],
      comment_prompt: general.comment_prompt ?? undefined,
    });
  }

  return {
    categories: [{ key: "quality", label: "Overall Quality" }],
    tags: [],
    comment_prompt: "Any additional feedback?",
  };
}

function hasCategoriesOrTags(f: Partial<FeedbackSchema>): boolean {
  return !!(f.categories?.length || f.tags?.length);
}

function normalizeFeedbackSchema(raw: Partial<FeedbackSchema>): FeedbackSchema {
  return {
    categories: raw.categories ?? [],
    tags: raw.tags ?? [],
    comment_prompt: raw.comment_prompt ?? "Any additional feedback?",
    comment_prompt_km: raw.comment_prompt_km,
  };
}

export async function upsertFeedbackDefaults(
  providerId: string,
  taskType: string,
  feedback: FeedbackSchema,
  tipPresets?: number[]
): Promise<void> {
  const { error } = await supabase.from("feedback_defaults").upsert(
    {
      provider_id: providerId,
      task_type: taskType,
      categories: feedback.categories,
      tags: feedback.tags,
      comment_prompt: feedback.comment_prompt || null,
      tip_presets: tipPresets ?? [0.05, 0.1, 0.25],
      updated_at: new Date().toISOString(),
    },
    { onConflict: "provider_id,task_type" }
  );
  if (error) throw new Error(`Failed to save feedback defaults: ${error.message}`);
}
