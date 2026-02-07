export type InvoiceStatus = "draft" | "sent" | "viewed" | "paid" | "rated" | "disputed";
export type SignalClass = "preferred" | "acceptable" | "neutral" | "rejected";

/** Line item: label + amount; detail optional (e.g. "3 tool calls"). */
export interface LineItem {
  label: string;
  amount: number;
  detail?: string;
  /** @deprecated use label */
  description?: string;
  model?: string;
  tools?: number;
}

/** Feedback category: 1–5 stars per dimension (e.g. accuracy, tone). */
export interface FeedbackCategory {
  key: string;
  label: string;
  label_km?: string;
  [k: string]: string | undefined;
}

/** Feedback tag: quick-tap with sentiment (positive/negative). */
export interface FeedbackTag {
  key: string;
  label: string;
  sentiment: "positive" | "negative";
}

/** Feedback schema: categories, tags, comment prompt. */
export interface FeedbackSchema {
  categories: FeedbackCategory[];
  tags: FeedbackTag[];
  comment_prompt?: string;
  comment_prompt_km?: string;
}

export interface Invoice {
  id: string;
  provider_id: string;
  external_id: string | null;
  task_description: string;
  task_type?: string | null;
  task_metadata?: Record<string, unknown>;
  model: string | null;
  tokens_in: number | null;
  tokens_out: number | null;
  tools_used: number | null;
  duration_ms: number | null;
  base_cost: number;
  currency: string;
  line_items: LineItem[];
  feedback_schema?: FeedbackSchema | null;
  status: InvoiceStatus;
  payway_payment_link: string | null;
  payway_txn_id: string | null;
  payment_method: string | null;
  paid_at: string | null;
  paid_amount: number | null;
  rating: number | null;
  rating_comment: string | null;
  rated_at: string | null;
  category_ratings?: Record<string, number>;
  tags_selected?: string[];
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
