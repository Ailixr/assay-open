import { nanoid } from "nanoid";
import { supabase } from "@/lib/supabase/client";
import { getPayWayClient } from "@/lib/payway/client";
import { resolveFeedbackSchema } from "@/lib/assay/feedback-schema";
import type { CreateInvoiceInput, CreateInvoiceBodyInput } from "@/lib/utils/validate";
import type { Invoice, LineItem } from "@/types";

function isNewInvoiceBody(input: CreateInvoiceInput): input is CreateInvoiceBodyInput {
  return "task" in input && "cost" in input;
}

export async function createInvoice(
  providerId: string,
  input: CreateInvoiceInput
): Promise<Invoice> {
  const invoiceId = `inv_${nanoid(16)}`;

  let taskDescription: string;
  let taskType: string | null = null;
  let taskMetadata: Record<string, unknown> = {};
  let model: string | null = null;
  let tokensIn: number | null = null;
  let tokensOut: number | null = null;
  let toolsUsed: number | null = null;
  let durationMs: number | null = null;
  let baseCost: number;
  let currency: string;
  let lineItems: LineItem[];
  let expiresInHours = 72;

  if (isNewInvoiceBody(input)) {
    taskDescription = input.task.description;
    taskType = input.task.type ?? null;
    taskMetadata = input.task.metadata ?? {};
    model = input.task.model ?? null;
    tokensIn = input.task.tokens_in ?? null;
    tokensOut = input.task.tokens_out ?? null;
    toolsUsed = input.task.tools_used ?? null;
    durationMs = input.task.duration_ms ?? null;
    baseCost = input.cost.total;
    currency = input.cost.currency;
    lineItems = input.cost.line_items.map((li) => ({
      label: li.label,
      amount: li.amount,
      detail: li.detail,
    }));
    expiresInHours = input.options?.expires_in_hours ?? 72;
  } else {
    taskDescription = input.task_description;
    baseCost = input.base_cost;
    currency = input.currency;
    lineItems = (input.line_items || []).map((li) => ({
      label: li.description,
      amount: li.amount,
      detail: li.model != null ? `model: ${li.model}` : li.tools != null ? `${li.tools} tools` : undefined,
    }));
    model = input.model ?? null;
    tokensIn = input.tokens_in ?? null;
    tokensOut = input.tokens_out ?? null;
    toolsUsed = input.tools_used ?? null;
    durationMs = input.duration_ms ?? null;
    expiresInHours = (input as { expires_in_hours?: number }).expires_in_hours ?? 72;
  }

  const feedbackSchema = await resolveFeedbackSchema(
    providerId,
    taskType,
    isNewInvoiceBody(input) ? input.feedback ?? null : null
  );

  const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);

  const invoiceRow = {
    id: invoiceId,
    provider_id: providerId,
    external_id: isNewInvoiceBody(input) ? undefined : (input as { external_id?: string }).external_id || null,
    task_description: taskDescription,
    task_type: taskType,
    task_metadata: taskMetadata,
    model,
    tokens_in: tokensIn,
    tokens_out: tokensOut,
    tools_used: toolsUsed,
    duration_ms: durationMs,
    base_cost: baseCost,
    currency,
    line_items: lineItems,
    feedback_schema: feedbackSchema,
    status: "sent",
    payway_payment_link: null,
    expires_at: expiresAt.toISOString(),
  };

  const { data, error } = await supabase.from("invoices").insert(invoiceRow).select().single();
  if (error) throw new Error(`Failed to create invoice: ${error.message}`);
  return data;
}

export async function getInvoice(invoiceId: string): Promise<Invoice | null> {
  const { data } = await supabase.from("invoices").select("*").eq("id", invoiceId).single();
  return data || null;
}

export async function listInvoices(
  providerId: string,
  opts: { limit?: number; offset?: number; status?: string } = {}
): Promise<{ data: Invoice[]; count: number }> {
  let query = supabase
    .from("invoices")
    .select("*", { count: "exact" })
    .eq("provider_id", providerId)
    .order("created_at", { ascending: false })
    .range(opts.offset || 0, (opts.offset || 0) + (opts.limit || 20) - 1);

  if (opts.status) query = query.eq("status", opts.status);

  const { data, error, count } = await query;
  if (error) throw new Error(`Failed to list invoices: ${error.message}`);
  return { data: data || [], count: count || 0 };
}

export async function markInvoiceViewed(invoiceId: string): Promise<void> {
  await supabase.from("invoices").update({ status: "viewed" }).eq("id", invoiceId).eq("status", "sent");
}

/** Public invoice fields for the unique URL page (no auth). */
export function toPublicInvoice(invoice: Invoice) {
  return {
    id: invoice.id,
    task_description: invoice.task_description,
    task_type: invoice.task_type ?? undefined,
    base_cost: invoice.base_cost,
    currency: invoice.currency,
    line_items: invoice.line_items,
    feedback_schema: invoice.feedback_schema ?? { categories: [], tags: [], comment_prompt: "Any additional feedback?" },
    status: invoice.status,
    tip_amount: invoice.tip_amount ?? 0,
    rating: invoice.rating,
    rating_comment: invoice.rating_comment,
    category_ratings: invoice.category_ratings ?? {},
    tags_selected: invoice.tags_selected ?? [],
    payway_payment_link: invoice.payway_payment_link,
    paid_at: invoice.paid_at,
    paid_amount: invoice.paid_amount,
    expires_at: invoice.expires_at,
  };
}

export async function submitTipFeedback(
  invoiceId: string,
  input: { tip_amount: number; rating?: number; comment?: string }
): Promise<void> {
  const { data: invoice } = await supabase.from("invoices").select("id, status").eq("id", invoiceId).single();
  if (!invoice) throw new Error("not_found");
  if (!["sent", "viewed"].includes(invoice.status))
    throw new Error("invalid_status");
  const { error } = await supabase
    .from("invoices")
    .update({
      tip_amount: input.tip_amount,
      rating: input.rating ?? null,
      rating_comment: input.comment ?? null,
    })
    .eq("id", invoiceId);
  if (error) throw new Error(`Failed to save tip/feedback: ${error.message}`);
}

export async function createPaymentLinkForInvoice(invoiceId: string): Promise<string> {
  const { data: invoice } = await supabase.from("invoices").select("*").eq("id", invoiceId).single();
  if (!invoice) throw new Error("not_found");
  if (invoice.status === "paid" || invoice.status === "rated")
    throw new Error("already_paid");
  if (invoice.payway_payment_link)
    return invoice.payway_payment_link;
  const total = Number(invoice.base_cost) + Number(invoice.tip_amount || 0);
  if (total <= 0) throw new Error("invalid_amount");
  const expiresAt = invoice.expires_at ? new Date(invoice.expires_at) : new Date(Date.now() + 72 * 60 * 60 * 1000);
  const payway = getPayWayClient();
  const webhookUrl = `${process.env.ASSAY_BASE_URL}/api/webhooks/payway`;
  const result = await payway.createPaymentLink({
    title: invoice.task_description?.slice(0, 100) || `Invoice ${invoiceId}`,
    amount: total.toFixed(2),
    currency: (invoice.currency || "USD") as "USD" | "KHR",
    description: `Assay Invoice ${invoiceId}`,
    merchant_ref_no: invoiceId,
    return_url: webhookUrl,
    payment_limit: 1,
    expired_date: Math.floor(expiresAt.getTime() / 1000),
  });
  const paymentLink = result.data.payment_link;
  await supabase
    .from("invoices")
    .update({ payway_payment_link: paymentLink })
    .eq("id", invoiceId);
  await supabase.from("payment_events").insert({
    invoice_id: invoiceId,
    event_type: "payment_link_created",
    raw_payload: result,
  });
  return paymentLink;
}
