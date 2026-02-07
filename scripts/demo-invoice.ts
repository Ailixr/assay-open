/**
 * Create one demo invoice and print its URL so you can open the invoice page.
 * Loads .env and .env.local. Needs either Supabase (to insert directly) or ASSAY_API_KEY (to create via API).
 *
 * Run: npm run demo
 */

import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { nanoid } from "nanoid";

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
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

async function createViaApi(): Promise<string | null> {
  if (!API_KEY) return null;
  const res = await fetch(`${BASE}/api/invoices`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      task_description: "Demo: Summarize 5 documents",
      external_id: "demo_001",
      model: "gpt-4o-mini",
      tokens_in: 8000,
      tokens_out: 600,
      base_cost: 0.99,
      currency: "USD",
      line_items: [
        { description: "Input tokens", amount: 0.54 },
        { description: "Output tokens", amount: 0.45 },
      ],
      expires_in_hours: 72,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (res.ok && data.id) return data.id;
  return null;
}

async function createViaSupabase(): Promise<string | null> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return null;
  const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const id = `inv_${nanoid(16)}`;
  const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000);
  const { error } = await supabase.from("invoices").insert({
    id,
    provider_id: "demo",
    task_description: "Demo: Summarize 5 documents",
    external_id: "demo_001",
    model: "gpt-4o-mini",
    tokens_in: 8000,
    tokens_out: 600,
    base_cost: 0.99,
    currency: "USD",
    line_items: [
      { description: "Input tokens", amount: 0.54 },
      { description: "Output tokens", amount: 0.45 },
    ],
    status: "sent",
    expires_at: expiresAt.toISOString(),
  });
  if (error) {
    console.error("Supabase insert error:", error.message);
    return null;
  }
  return id;
}

async function main() {
  console.log("\n  Assay — Invoice demo\n");
  let invoiceId: string | null = null;

  invoiceId = await createViaApi();
  if (invoiceId) {
    console.log("  Created invoice via API.");
  } else {
    invoiceId = await createViaSupabase();
    if (invoiceId) console.log("  Created demo invoice via Supabase.");
  }

  if (!invoiceId) {
    console.log("  No ASSAY_API_KEY or Supabase credentials found.");
    console.log("  Add to .env or .env.local:");
    console.log("    - ASSAY_API_KEY=ask_xxx (run: npm run seed:key first)");
    console.log("    - Or: NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY");
    console.log("  Then ensure the dev server is running: npm run dev\n");
    process.exit(1);
  }

  const url = `${BASE}/invoice/${invoiceId}`;
  console.log("\n  Invoice URL (open in browser):");
  console.log("  " + url + "\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
