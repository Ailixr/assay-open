import type { PayWayWebhookPayload } from "./types";

export function parseWebhookPayload(body: any): PayWayWebhookPayload | null {
  if (!body.transaction_id || body.payment_status_code === undefined) {
    return null;
  }
  return {
    transaction_id: body.transaction_id,
    transaction_date: body.transaction_date,
    original_currency: body.original_currency,
    original_amount: Number(body.original_amount),
    bank_ref: body.bank_ref || "",
    apv: body.apv || "",
    payment_status_code: Number(body.payment_status_code),
    payment_status: body.payment_status,
    payment_currency: body.payment_currency,
    payment_amount: Number(body.payment_amount),
    payment_type: body.payment_type,
    payer_account: body.payer_account || "",
    bank_name: body.bank_name || "",
    merchant_ref: body.merchant_ref,
  };
}

export function isPaymentApproved(payload: PayWayWebhookPayload): boolean {
  return payload.payment_status_code === 0 && payload.payment_status === "APPROVED";
}
