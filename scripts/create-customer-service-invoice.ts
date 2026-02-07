/**
 * Create a specific customer_service invoice per the Invoice Specification.
 * Uses POST /api/invoices with full task, cost, feedback, and options.
 *
 * Run: npm run test:invoice
 * Requires: ASSAY_API_KEY in .env or .env.local (npm run seed:key)
 */

import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

function loadEnv(filename: string) {
  const path = resolve(process.cwd(), filename);
  if (!existsSync(path)) return;
  const content = readFileSync(path, "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const eq = trimmed.indexOf("=");
      if (eq > 0) {
        const key = trimmed.slice(0, eq).trim();
        const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
        if (key) process.env[key] = value;
      }
    }
  }
}
loadEnv(".env");
loadEnv(".env.local");

const BASE = process.env.ASSAY_BASE_URL || "http://localhost:3000";
const API_KEY = process.env.ASSAY_API_KEY || "";

const customerServiceInvoice = {
  task: {
    description: "Drafted customer reply about delayed shipment",
    type: "customer_service",
    model: "sonnet-4.5",
    tokens_in: 1500,
    tokens_out: 800,
    tools_used: 3,
    duration_ms: 4200,
    metadata: {
      conversation_id: "conv_abc123",
      language: "km",
      customer_tier: "premium",
    },
  },
  cost: {
    line_items: [
      { label: "Context retrieval", amount: 0.05, detail: "3 tool calls" },
      { label: "Response generation", amount: 0.12, detail: "sonnet-4.5, 800 tokens" },
      { label: "Translation check", amount: 0.03, detail: "Khmer verification" },
    ],
    total: 0.2,
    currency: "USD",
  },
  feedback: {
    categories: [
      { key: "accuracy", label: "Accuracy", label_km: "ភាពត្រឹមត្រូវ" },
      { key: "tone", label: "Tone & Style", label_km: "សម្លេងនិងរចនាបទ" },
      { key: "language", label: "Language Quality", label_km: "គុណភាពភាសា" },
      { key: "completeness", label: "Completeness", label_km: "ភាពពេញលេញ" },
    ],
    tags: [
      { key: "fast", label: "Fast response", sentiment: "positive" as const },
      { key: "polite", label: "Polite tone", sentiment: "positive" as const },
      { key: "khmer_natural", label: "Natural Khmer", sentiment: "positive" as const },
      { key: "wrong_register", label: "Wrong register", sentiment: "negative" as const },
      { key: "too_formal", label: "Too formal", sentiment: "negative" as const },
      { key: "mistranslation", label: "Mistranslation", sentiment: "negative" as const },
      { key: "missing_info", label: "Missing information", sentiment: "negative" as const },
    ],
    comment_prompt: "Anything else about this response?",
    comment_prompt_km: "មានអ្វីផ្សេងទៀតអំពីចម្លើយនេះ?",
  },
  options: {
    currency: "USD",
    expires_in_hours: 72,
    tip_presets: [0.05, 0.1, 0.25],
    locale: "km",
  },
};

async function main() {
  console.log("\n  Assay — Create customer_service invoice (spec)\n");

  if (!API_KEY) {
    console.log("  Set ASSAY_API_KEY in .env or .env.local (run: npm run seed:key)\n");
    process.exit(1);
  }

  const res = await fetch(`${BASE}/api/invoices`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify(customerServiceInvoice),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    console.error("  POST /api/invoices failed:", res.status, data);
    process.exit(1);
  }

  const invoiceId = data.id;
  if (!invoiceId) {
    console.error("  No invoice id in response:", data);
    process.exit(1);
  }

  const url = `${BASE}/invoice/${invoiceId}`;
  console.log("  Created invoice:", invoiceId);
  console.log("  Status:", data.status);
  console.log("  Base cost:", data.base_cost, data.currency);
  console.log("  Invoice URL:", url);
  console.log("  Expires:", data.expires_at ?? "—");
  console.log("");

  // Optional: fetch public invoice to verify feedback_schema
  const pubRes = await fetch(`${BASE}/api/invoices/public/${invoiceId}`);
  if (pubRes.ok) {
    const pub = await pubRes.json();
    console.log("  Public invoice (feedback_schema categories):", pub.feedback_schema?.categories?.length ?? 0);
    console.log("  Public invoice (feedback_schema tags):", pub.feedback_schema?.tags?.length ?? 0);
    console.log("");
  }

  console.log("  To rate this invoice (after paying):");
  console.log(`  curl -X POST "${BASE}/api/invoices/${invoiceId}/rate" \\`);
  console.log(`    -H "Content-Type: application/json" \\`);
  console.log(`    -d '{"overall_rating":4,"category_ratings":{"accuracy":5,"tone":4,"language":3,"completeness":4},"tags":["polite","fast","wrong_register"],"comment":"Good response but used formal Khmer","tip_amount":0.1}'`);
  console.log("");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
