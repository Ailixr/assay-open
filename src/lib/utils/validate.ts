import { z } from "zod";

// --- Feedback schema (for invoice creation and provider defaults) ---
const feedbackCategorySchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  label_km: z.string().optional(),
}).strict();

const feedbackTagSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  sentiment: z.enum(["positive", "negative"]),
}).strict();

export const feedbackSchemaSchema = z.object({
  categories: z.array(feedbackCategorySchema).min(1).max(6).optional(),
  tags: z.array(feedbackTagSchema).optional(),
  comment_prompt: z.string().max(200).optional(),
  comment_prompt_km: z.string().max(200).optional(),
}).strict();

// --- New invoice creation: task + cost + optional feedback + options ---
const taskInputSchema = z.object({
  description: z.string().min(1).max(500),
  type: z.string().max(100).optional(),
  model: z.string().max(100).optional(),
  tokens_in: z.number().int().optional(),
  tokens_out: z.number().int().optional(),
  tools_used: z.number().int().optional(),
  duration_ms: z.number().int().optional(),
  metadata: z.record(z.unknown()).optional(),
}).strict();

const costLineItemSchema = z.object({
  label: z.string().min(1),
  amount: z.number().min(0),
  detail: z.string().max(200).optional(),
}).strict();

const costInputSchema = z.object({
  line_items: z.array(costLineItemSchema).min(1),
  total: z.number().positive().max(10000),
  currency: z.enum(["USD", "KHR"]).default("USD"),
}).strict();

const invoiceOptionsSchema = z.object({
  currency: z.enum(["USD", "KHR"]).optional(),
  expires_in_hours: z.number().positive().max(720).optional(),
  tip_presets: z.array(z.number().min(0)).max(10).optional(),
  locale: z.string().max(10).optional(),
}).strict();

/** New nested body: { task, cost, feedback?, options? } */
export const createInvoiceBodySchema = z.object({
  task: taskInputSchema,
  cost: costInputSchema,
  feedback: feedbackSchemaSchema.optional(),
  options: invoiceOptionsSchema.optional(),
}).strict();

/** Legacy flat body (backward compat) */
export const createInvoiceLegacySchema = z.object({
  task_description: z.string().min(1).max(500),
  external_id: z.string().optional(),
  model: z.string().optional(),
  tokens_in: z.number().int().optional(),
  tokens_out: z.number().int().optional(),
  tools_used: z.number().int().optional(),
  duration_ms: z.number().int().optional(),
  base_cost: z.number().positive().max(10000),
  currency: z.enum(["USD", "KHR"]).default("USD"),
  line_items: z.array(z.object({
    description: z.string(),
    amount: z.number(),
    model: z.string().optional(),
    tools: z.number().optional(),
  })).optional(),
  expires_in_hours: z.number().positive().default(72),
});

/** Accept either new or legacy shape */
export const createInvoiceSchema = z.union([
  createInvoiceBodySchema,
  createInvoiceLegacySchema,
]);

/** Rating submission: overall + category ratings + tags + comment + tip */
export const rateInvoiceSchema = z.object({
  overall_rating: z.number().int().min(1).max(5),
  category_ratings: z.record(z.string(), z.number().int().min(1).max(5)).optional(),
  tags: z.array(z.string().min(1)).optional(),
  comment: z.string().max(1000).optional(),
  tip_amount: z.number().min(0).max(10000).optional(),
});

export const disputeInvoiceSchema = z.object({
  reason: z.enum([
    "wrong_output", "incomplete", "wrong_language",
    "harmful", "duplicate_charge", "not_requested", "other",
  ]),
  comment: z.string().max(1000).optional(),
});

export const submitTipFeedbackSchema = z.object({
  tip_amount: z.number().min(0).max(10000),
  rating: z.number().int().min(1).max(5).optional(),
  comment: z.string().max(1000).optional(),
});

/** Provider feedback defaults */
export const feedbackDefaultsSchema = z.object({
  task_type: z.string().min(1).max(100),
  feedback: feedbackSchemaSchema,
}).strict();

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
export type CreateInvoiceBodyInput = z.infer<typeof createInvoiceBodySchema>;
export type RateInvoiceInput = z.infer<typeof rateInvoiceSchema>;
export type DisputeInvoiceInput = z.infer<typeof disputeInvoiceSchema>;
export type SubmitTipFeedbackInput = z.infer<typeof submitTipFeedbackSchema>;
export type FeedbackDefaultsInput = z.infer<typeof feedbackDefaultsSchema>;
