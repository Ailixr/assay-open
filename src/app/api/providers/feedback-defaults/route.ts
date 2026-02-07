import { NextRequest, NextResponse } from "next/server";
import { authenticate } from "@/lib/auth/middleware";
import { upsertFeedbackDefaults } from "@/lib/assay/feedback-schema";
import { feedbackDefaultsSchema } from "@/lib/utils/validate";
import { errorResponse } from "@/lib/utils/errors";

export async function PUT(request: NextRequest) {
  try {
    const auth = await authenticate(request, "invoices:write");
    if (auth instanceof NextResponse) return auth;
    const body = await request.json();
    const input = feedbackDefaultsSchema.parse(body);
    const feedback = {
      categories: input.feedback.categories ?? [],
      tags: input.feedback.tags ?? [],
      comment_prompt: input.feedback.comment_prompt,
      comment_prompt_km: input.feedback.comment_prompt_km,
    };
    await upsertFeedbackDefaults(auth.providerId, input.task_type, feedback);
    return NextResponse.json({ ok: true, task_type: input.task_type });
  } catch (error) {
    return errorResponse(error);
  }
}
