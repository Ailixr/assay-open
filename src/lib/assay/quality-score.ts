/** Normalize 1–5 rating to 0–1 */
function normalizeRating(r: number): number {
  return Math.max(0, Math.min(1, (r - 1) / 4));
}

export interface QualityInput {
  overallRating: number;
  categoryRatings?: Record<string, number>;
  tagsSelected?: string[];
  tagSentimentMap?: Record<string, "positive" | "negative">;
  tipRatio: number;
  isDisputed: boolean;
  hasComment?: boolean;
}

/**
 * quality_score = (
 *   overall_weight    × normalize(overall_rating) +        // 25%
 *   category_weight   × avg(normalize(category_ratings)) +  // 25%
 *   tag_weight        × tag_sentiment_ratio +                // 15%
 *   tip_weight        × min(tip_ratio, 1.0) +               // 20%
 *   dispute_weight    × (1 if not disputed else 0) +         // 10%
 *   comment_weight    × (1 if has_comment else 0)            // 5%
 * )
 * tag_sentiment_ratio = positive_tags / total_tags (or 0.5 if no tags)
 */
export function calculateQualityScore(input: QualityInput): number {
  if (input.isDisputed) return 0;

  const overallWeight = 0.25;
  const categoryWeight = 0.25;
  const tagWeight = 0.15;
  const tipWeight = 0.2;
  const disputeWeight = 0.1;
  const commentWeight = 0.05;

  const overallScore = normalizeRating(input.overallRating);
  const tipScore = Math.min(input.tipRatio, 1);

  let categoryScore = 0.5;
  if (input.categoryRatings && Object.keys(input.categoryRatings).length > 0) {
    const values = Object.values(input.categoryRatings);
    categoryScore = values.reduce((s, r) => s + normalizeRating(r), 0) / values.length;
  }

  let tagScore = 0.5;
  if (input.tagsSelected?.length && input.tagSentimentMap) {
    const total = input.tagsSelected.length;
    const positive = input.tagsSelected.filter((k) => input.tagSentimentMap![k] === "positive").length;
    tagScore = total > 0 ? positive / total : 0.5;
  }

  const disputeScore = input.isDisputed ? 0 : 1;
  const commentScore = input.hasComment ? 1 : 0;

  const score =
    overallWeight * overallScore +
    categoryWeight * categoryScore +
    tagWeight * tagScore +
    tipWeight * tipScore +
    disputeWeight * disputeScore +
    commentWeight * commentScore;

  return Math.round(score * 10000) / 10000;
}

export function classifySignal(qualityScore: number, isDisputed: boolean): string {
  if (isDisputed) return "rejected";
  if (qualityScore >= 0.75) return "preferred";
  if (qualityScore >= 0.45) return "acceptable";
  return "neutral";
}
