export type InvoiceStatus = "draft" | "sent" | "viewed" | "paid" | "rated" | "disputed";
export type SignalClass = "preferred" | "acceptable" | "neutral" | "rejected";

export interface LineItem {
  description: string;
  amount: number;
  model?: string;
  tools?: number;
}

export interface Invoice {
  id: string;
  provider_id: string;
  external_id: string | null;
  task_description: string;
  model: string | null;
  tokens_in: number | null;
  tokens_out: number | null;
  tools_used: number | null;
  duration_ms: number | null;
  base_cost: number;
  currency: string;
  line_items: LineItem[];
  status: InvoiceStatus;
  payway_payment_link: string | null;
  payway_txn_id: string | null;
  payment_method: string | null;
  paid_at: string | null;
  paid_amount: number | null;
  rating: number | null;
  rating_comment: string | null;
  rated_at: string | null;
  tip_amount: number;
  tip_payway_txn_id: string | null;
  tip_paid_at: string | null;
  dispute_reason: string | null;
  dispute_comment: string | null;
  dispute_refund_txn_id: string | null;
  disputed_at: string | null;
  refund_amount: number | null;
  refund_status: string | null;
  quality_score: number | null;
  signal_class: SignalClass | null;
  created_at: string;
  updated_at: string;
  expires_at: string | null;
}

export interface PaymentEvent {
  id: string;
  invoice_id: string;
  event_type: string;
  payway_txn_id: string | null;
  amount: number | null;
  currency: string | null;
  payment_method: string | null;
  raw_payload: any;
  created_at: string;
}
