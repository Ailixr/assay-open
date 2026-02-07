import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";
import { rateInvoiceSchema } from "@/lib/utils/validate";
import { calculateQualityScore, classifySignal } from "@/lib/assay/quality-score";
import { errorResponse } from "@/lib/utils/errors";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const input = rateInvoiceSchema.parse(body);
    const { data: invoice } = await supabase.from("invoices").select("*").eq("id", params.id).single();
    if (!invoice) return NextResponse.json({ error: "not_found" }, { status: 404 });
    if (invoice.status !== "paid") return NextResponse.json({ error: "invalid_status", message: "Invoice must be paid before rating" }, { status: 400 });

    const tipRatio = invoice.tip_amount / invoice.base_cost;
    const qualityScore = calculateQualityScore({ rating: input.rating, tipRatio, isDisputed: false, hasComment: !!input.comment });
    const signalClass = classifySignal(qualityScore, false);

    await supabase.from("invoices").update({
      status: "rated", rating: input.rating, rating_comment: input.comment || null,
      rated_at: new Date().toISOString(), quality_score: qualityScore, signal_class: signalClass,
    }).eq("id", params.id);

    return NextResponse.json({ status: "rated", rating: input.rating, quality_score: qualityScore, signal_class: signalClass });
  } catch (error) { return errorResponse(error); }
}
