import { NextRequest, NextResponse } from "next/server";
import { getPayWayClient } from "@/lib/payway/client";
import { parseWebhookPayload } from "@/lib/payway/webhook";
import { supabase } from "@/lib/supabase/client";
import { calculateQualityScore, classifySignal } from "@/lib/assay/quality-score";

const BASE_URL = process.env.ASSAY_BASE_URL || "";

export async function GET(request: NextRequest) {
  const invoiceId = request.nextUrl.searchParams.get("merchant_ref") || request.nextUrl.searchParams.get("invoice_id");
  if (invoiceId && BASE_URL) {
    return NextResponse.redirect(`${BASE_URL}/invoice/${invoiceId}`);
  }
  return NextResponse.json({ ok: true });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const invoiceId = body.merchant_ref ?? body.merchant_ref_no;

    // Test simulation: skip PayWay verification when ASSAY_TEST_WEBHOOK=1 and body.test_simulation === true
    if (process.env.ASSAY_TEST_WEBHOOK === "1" && body.test_simulation === true && invoiceId) {
      const { data: invoice } = await supabase.from("invoices").select("*").eq("id", invoiceId).single();
      if (!invoice || invoice.status === "paid" || invoice.status === "rated") {
        return NextResponse.json({ received: true });
      }
      const paidAmount =
        Number(body.payment_amount) ||
        Number(invoice.base_cost) + Number(invoice.tip_amount || 0);
      const update: Record<string, unknown> = {
        status: "paid",
        paid_at: new Date().toISOString(),
        paid_amount: paidAmount,
        payway_txn_id: body.transaction_id || "test_sim_" + Date.now(),
      };
      const rating = invoice.rating ?? null;
      const tipAmount = Number(invoice.tip_amount || 0);
      const baseCost = Number(invoice.base_cost || 0);
      if (rating != null && baseCost > 0) {
        const tipRatio = tipAmount / baseCost;
        const qualityScore = calculateQualityScore({
          overallRating: rating,
          tipRatio,
          isDisputed: false,
          hasComment: !!invoice.rating_comment,
        });
        update.quality_score = qualityScore;
        update.signal_class = classifySignal(qualityScore, false);
        update.status = "rated";
      }
      await supabase.from("invoices").update(update).eq("id", invoiceId);
      await supabase.from("payment_events").insert({
        invoice_id: invoiceId,
        event_type: "payment_approved",
        payway_txn_id: body.transaction_id || "test_sim",
        amount: paidAmount,
        currency: invoice.currency,
        payment_method: body.payment_type || "TEST",
        raw_payload: body,
      });
      return NextResponse.json({ received: true, simulated: true });
    }

    const payload = parseWebhookPayload(body);
    if (!payload) {
      return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
    }
    const client = getPayWayClient();
    const detail = await client.getTransactionDetail(payload.transaction_id);
    if (!detail?.data) {
      return NextResponse.json({ error: "transaction_not_found" }, { status: 400 });
    }
    const data = detail.data as {
      payment_status_code?: number;
      payment_status?: string;
      original_amount?: number;
      payment_amount?: number;
      transaction_id?: string;
    };
    const approved =
      data.payment_status_code === 0 &&
      (data.payment_status === "APPROVED" || String(data.payment_status).toUpperCase() === "APPROVED");
    const resolvedInvoiceId = payload.merchant_ref || body.merchant_ref;
    if (!resolvedInvoiceId) {
      return NextResponse.json({ error: "missing_merchant_ref" }, { status: 400 });
    }
    const { data: invoice } = await supabase.from("invoices").select("*").eq("id", resolvedInvoiceId).single();
    if (!invoice) {
      return NextResponse.json({ error: "invoice_not_found" }, { status: 404 });
    }
    if (invoice.status === "paid" || invoice.status === "rated") {
      return NextResponse.json({ received: true });
    }
    if (approved) {
      const paidAmount = Number(data.payment_amount ?? data.original_amount ?? invoice.base_cost) + Number(invoice.tip_amount || 0);
      const update: Record<string, unknown> = {
        status: "paid",
        paid_at: new Date().toISOString(),
        paid_amount: paidAmount,
        payway_txn_id: payload.transaction_id ?? data.transaction_id,
      };
      const rating = invoice.rating ?? null;
      const tipAmount = Number(invoice.tip_amount || 0);
      const baseCost = Number(invoice.base_cost || 0);
      if (rating != null && baseCost > 0) {
        const tipRatio = tipAmount / baseCost;
        const qualityScore = calculateQualityScore({
          overallRating: rating,
          tipRatio,
          isDisputed: false,
          hasComment: !!invoice.rating_comment,
        });
        update.quality_score = qualityScore;
        update.signal_class = classifySignal(qualityScore, false);
        update.status = "rated";
      }
      await supabase.from("invoices").update(update).eq("id", resolvedInvoiceId);
      await supabase.from("payment_events").insert({
        invoice_id: resolvedInvoiceId,
        event_type: "payment_approved",
        payway_txn_id: payload.transaction_id,
        amount: paidAmount,
        currency: invoice.currency,
        payment_method: payload.payment_type,
        raw_payload: body,
      });
    }
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[PayWay webhook]", error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
