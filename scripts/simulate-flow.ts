/**
 * Simulate the full invoice flow step by step.
 *
 * Prerequisites:
 * - Dev server running: npm run dev
 * - API key: npm run seed:key, then add ASSAY_API_KEY=ask_xxxx to .env.local (or pass it when running)
 * - For step 5 (webhook simulation): set ASSAY_TEST_WEBHOOK=1 in .env.local and restart dev server
 *
 * Run: npm run test:flow
 * Or:  ASSAY_API_KEY=ask_xxx npm run test:flow
 */

import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";
import { nanoid } from "nanoid";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..");

// Load .env and .env.local from project root (later file wins; skip empty values)
function loadEnvFile(filename: string) {
  const path = resolve(projectRoot, filename);
  if (!existsSync(path)) return;
  const content = readFileSync(path, "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const eq = trimmed.indexOf("=");
      if (eq > 0) {
        const key = trimmed.slice(0, eq).trim();
        const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
        if (key && value !== "") process.env[key] = value;
      }
    }
  }
}
loadEnvFile(".env");
loadEnvFile(".env.local");

const BASE = process.env.ASSAY_BASE_URL || "http://localhost:3000";
const API_KEY = process.env.ASSAY_API_KEY || "";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

function log(step: number, title: string, ok: boolean, detail?: unknown) {
  const icon = ok ? "✓" : "✗";
  const status = ok ? "OK" : "FAIL";
  console.log(`\n--- Step ${step}: ${title} [${icon} ${status}] ---`);
  if (detail !== undefined) console.log(detail);
}

async function createInvoiceViaSupabase(): Promise<string | null> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return null;
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const id = `inv_${nanoid(16)}`;
  const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000);
  const { error } = await supabase.from("invoices").insert({
    id,
    provider_id: "sim_flow",
    task_description: "Simulated task: summarize 5 documents",
    external_id: "sim_ext_001",
    model: "gpt-4o-mini",
    tokens_in: 8000,
    tokens_out: 600,
    base_cost: 0.42,
    currency: "USD",
    line_items: [
      { description: "Input tokens", amount: 0.24 },
      { description: "Output tokens", amount: 0.18 },
    ],
    status: "sent",
    expires_at: expiresAt.toISOString(),
  });
  if (error) return null;
  return id;
}

async function step1CreateInvoice(): Promise<string | null> {
  // Try API first if key is set
  if (API_KEY) {
    const res = await fetch(`${BASE}/api/invoices`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        task_description: "Simulated task: summarize 5 documents",
        external_id: "sim_ext_001",
        model: "gpt-4o-mini",
        tokens_in: 8000,
        tokens_out: 600,
        base_cost: 0.42,
        currency: "USD",
        line_items: [
          { description: "Input tokens", amount: 0.24 },
          { description: "Output tokens", amount: 0.18 },
        ],
        expires_in_hours: 72,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.id) {
      log(1, "Create invoice (POST /api/invoices)", true, data);
      return data.id;
    }
    log(1, "Create invoice (POST /api/invoices)", false, data);
  } else {
    log(1, "Create invoice (POST /api/invoices)", false, { note: "ASSAY_API_KEY not set, trying Supabase…" });
  }

  // Fallback: create invoice directly via Supabase
  const id = await createInvoiceViaSupabase();
  if (id) {
    log(1, "Create invoice (via Supabase)", true, { id, invoice_url: `${BASE}/invoice/${id}` });
    return id;
  }
  log(1, "Create invoice", false, {
    error: "No invoice created.",
    what_to_do: "Set ASSAY_API_KEY (npm run seed:key) or Supabase (NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY) in .env.local",
  });
  return null;
}

async function step2GetPublicInvoice(invoiceId: string): Promise<boolean> {
  const res = await fetch(`${BASE}/api/invoices/public/${invoiceId}`);
  const data = await res.json().catch(() => ({}));
  const ok = res.ok && data.id === invoiceId && data.base_cost != null;
  log(2, "Get public invoice (GET /api/invoices/public/[id])", ok, {
    id: data.id,
    base_cost: data.base_cost,
    currency: data.currency,
    status: data.status,
  });
  return ok;
}

async function step3SubmitTipAndFeedback(invoiceId: string): Promise<boolean> {
  const res = await fetch(`${BASE}/api/invoices/${invoiceId}/tip-feedback`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      tip_amount: 0.08,
      rating: 5,
      comment: "Simulated feedback: great result!",
    }),
  });
  const data = await res.json().catch(() => ({}));
  const ok = res.ok && (data.ok === true || res.status === 200);
  log(3, "Submit tip + feedback (POST /api/invoices/[id]/tip-feedback)", ok, data);
  return ok;
}

async function step4CreatePayment(invoiceId: string): Promise<boolean> {
  const res = await fetch(`${BASE}/api/invoices/${invoiceId}/create-payment`, {
    method: "POST",
  });
  const data = await res.json().catch(() => ({}));
  const ok = res.ok && data.payment_link;
  if (!ok && (data.error === "invalid_amount" || res.status === 500)) {
    log(4, "Create ABA payment (POST /api/invoices/[id]/create-payment)", false, {
      ...data,
      note: "PayWay may not be configured. Step 5 (simulate webhook) can still mark invoice as paid.",
    });
  } else {
    log(4, "Create ABA payment (POST /api/invoices/[id]/create-payment)", ok, {
      payment_link: data.payment_link ? "(present)" : data.payment_link,
      ...(data.error && { error: data.error }),
    });
  }
  return ok;
}

async function step5SimulateWebhook(invoiceId: string): Promise<boolean> {
  const totalAmount = 0.42 + 0.08; // base + tip from step 1 & 3
  const res = await fetch(`${BASE}/api/webhooks/payway`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      test_simulation: true,
      merchant_ref: invoiceId,
      transaction_id: "sim_txn_" + Date.now(),
      payment_status_code: 0,
      payment_status: "APPROVED",
      payment_amount: totalAmount,
      payment_currency: "USD",
      payment_type: "TEST",
    }),
  });
  const data = await res.json().catch(() => ({}));
  const ok = res.ok && (data.received === true || data.simulated === true);
  if (!ok && (data.error === "invalid_payload" || res.status === 400)) {
    log(5, "Simulate webhook – mark paid (POST /api/webhooks/payway)", false, {
      ...data,
      note: "Set ASSAY_TEST_WEBHOOK=1 in .env.local and restart dev server to allow test simulation.",
    });
  } else {
    log(5, "Simulate webhook – mark paid (POST /api/webhooks/payway)", ok, data);
  }
  return ok;
}

async function step6VerifyPaid(invoiceId: string): Promise<boolean> {
  const res = await fetch(`${BASE}/api/invoices/public/${invoiceId}`);
  const data = await res.json().catch(() => ({}));
  const ok = res.ok && (data.status === "paid" || data.status === "rated") && data.paid_amount != null;
  log(6, "Verify invoice paid (GET /api/invoices/public/[id])", ok, {
    status: data.status,
    paid_amount: data.paid_amount,
    quality_score: data.quality_score,
    signal_class: data.signal_class,
  });
  return ok;
}

async function main() {
  console.log("Assay flow simulation");
  console.log("BASE_URL:", BASE);
  console.log("API_KEY:", API_KEY ? `${API_KEY.slice(0, 12)}...` : "(not set)");

  const invoiceId = await step1CreateInvoice();
  if (!invoiceId) {
    console.log("\nStopping: no invoice id. Set ASSAY_API_KEY and ensure server is running.");
    process.exit(1);
  }

  await step2GetPublicInvoice(invoiceId);
  await step3SubmitTipAndFeedback(invoiceId);
  await step4CreatePayment(invoiceId);
  await step5SimulateWebhook(invoiceId);
  await step6VerifyPaid(invoiceId);

  console.log("\n--- Done ---");
  console.log("Invoice URL:", `${BASE}/invoice/${invoiceId}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
