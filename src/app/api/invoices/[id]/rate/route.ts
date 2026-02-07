import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";
import { rateInvoiceSchema } from "@/lib/utils/validate";
import { calculateQualityScore, classifySignal } from "@/lib/assay/quality-score";
import { errorResponse } from "@/lib/utils/errors";
import type { FeedbackSchema } from "@/types";

function tagSentimentMapFromSchema(schema: FeedbackSchema | null): Record<string, "positive" | "negative"> {
  const map: Record<string, "positive" | "negative"> = {};
  if (!schema?.tags) return map;
  for (const t of schema.tags) {
    map[t.key] = t.sentiment;
  }
  return map;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const input = rateInvoiceSchema.parse(body);
    const { data: invoice } = await supabase.from("invoices").select("*").eq("id", id).single();
    if (!invoice) return NextResponse.json({ error: "not_found" }, { status: 404 });
    if (invoice.status !== "paid")
      return NextResponse.json(
        { error: "invalid_status", message: "Invoice must be paid before rating" },
        { status: 400 }
      );

    const baseCost = Number(invoice.base_cost);
    const tipAmount = input.tip_amount ?? invoice.tip_amount ?? 0;
    const tipRatio = baseCost > 0 ? tipAmount / baseCost : 0;
    const tagSentimentMap = tagSentimentMapFromSchema(invoice.feedback_schema ?? null);

    const qualityScore = calculateQualityScore({
      overallRating: input.overall_rating,
      categoryRatings: input.category_ratings,
      tagsSelected: input.tags,
      tagSentimentMap: Object.keys(tagSentimentMap).length ? tagSentimentMap : undefined,
      tipRatio,
      isDisputed: false,
      hasComment: !!input.comment,
    });
    const signalClass = classifySignal(qualityScore, false);

    await supabase
      .from("invoices")
      .update({
        status: "rated",
        rating: input.overall_rating,
        rating_comment: input.comment || null,
        category_ratings: input.category_ratings ?? {},
        tags_selected: input.tags ?? [],
        tip_amount: tipAmount,
        rated_at: new Date().toISOString(),
        quality_score: qualityScore,
        signal_class: signalClass,
      })
      .eq("id", id);

    return NextResponse.json({
      status: "rated",
      rating: input.overall_rating,
      quality_score: qualityScore,
      signal_class: signalClass,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
