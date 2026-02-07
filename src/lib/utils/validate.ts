import { z } from "zod";

export const createInvoiceSchema = z.object({
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

export const rateInvoiceSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
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

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
export type RateInvoiceInput = z.infer<typeof rateInvoiceSchema>;
export type DisputeInvoiceInput = z.infer<typeof disputeInvoiceSchema>;
export type SubmitTipFeedbackInput = z.infer<typeof submitTipFeedbackSchema>;
