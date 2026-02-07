interface QualityInput {
  rating: number;
  tipRatio: number;
  isDisputed: boolean;
  hasComment?: boolean;
}

export function calculateQualityScore(input: QualityInput): number {
  if (input.isDisputed) return 0;
  const ratingScore = (input.rating - 1) / 4;
  const tipScore = Math.min(input.tipRatio, 1);
  const disputeScore = input.isDisputed ? 0 : 1;
  const commentScore = input.hasComment ? 1 : 0;
  const score = ratingScore * 0.4 + tipScore * 0.25 + disputeScore * 0.25 + commentScore * 0.1;
  return Math.round(score * 10000) / 10000;
}

export function classifySignal(qualityScore: number, isDisputed: boolean): string {
  if (isDisputed) return "rejected";
  if (qualityScore >= 0.75) return "preferred";
  if (qualityScore >= 0.45) return "acceptable";
  return "neutral";
}
