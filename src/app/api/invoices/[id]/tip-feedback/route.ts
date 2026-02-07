import { NextRequest, NextResponse } from "next/server";
import { submitTipFeedback } from "@/lib/assay/invoice";
import { submitTipFeedbackSchema } from "@/lib/utils/validate";
import { errorResponse } from "@/lib/utils/errors";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const input = submitTipFeedbackSchema.parse(body);
    await submitTipFeedback(id, input);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "not_found")
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    if (error instanceof Error && error.message === "invalid_status")
      return NextResponse.json({ error: "invalid_status", message: "Invoice cannot be updated" }, { status: 400 });
    return errorResponse(error);
  }
}
