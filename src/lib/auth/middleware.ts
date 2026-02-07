import { nanoid } from "nanoid";
import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";

const KEY_PREFIX = "ask_"; // assay key

export function generateApiKey(): { key: string; hash: string; prefix: string } {
  const raw = nanoid(40);
  const key = `${KEY_PREFIX}${raw}`;
  const hash = hashKey(key);
  const prefix = key.slice(0, 12);
  return { key, hash, prefix };
}

export function hashKey(key: string): string {
  const salt = process.env.ASSAY_API_KEY_SALT || "assay-default-salt";
  return createHash("sha256").update(`${salt}:${key}`).digest("hex");
}

export async function validateApiKey(key: string): Promise<{
  valid: boolean;
  providerId?: string;
  scopes?: string[];
}> {
  if (!key.startsWith(KEY_PREFIX)) return { valid: false };

  const hash = hashKey(key);
  const { data, error } = await supabase
    .from("api_keys")
    .select("provider_id, scopes, is_active, expires_at")
    .eq("key_hash", hash)
    .single();

  if (error || !data || !data.is_active) return { valid: false };
  if (data.expires_at && new Date(data.expires_at) < new Date()) return { valid: false };

  // Update last_used_at (fire and forget)
  supabase.from("api_keys").update({ last_used_at: new Date().toISOString() }).eq("key_hash", hash).then();

  return { valid: true, providerId: data.provider_id, scopes: data.scopes };
}

export async function createApiKey(providerId: string, label?: string) {
  const { key, hash, prefix } = generateApiKey();
  const { error } = await supabase.from("api_keys").insert({
    provider_id: providerId,
    key_hash: hash,
    key_prefix: prefix,
    label: label || "default",
  });
  if (error) throw new Error(`Failed to create API key: ${error.message}`);
  return { key, prefix };
}

// --- Route handler helper ---

export interface AuthContext {
  providerId: string;
  scopes: string[];
}

export async function authenticate(
  request: NextRequest,
  requiredScope?: string
): Promise<AuthContext | NextResponse> {
  const authHeader = request.headers.get("authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return NextResponse.json(
      { error: "unauthorized", message: "Missing or invalid Authorization header. Use: Bearer ask_xxxxx" },
      { status: 401 }
    );
  }

  const key = authHeader.slice(7);
  const result = await validateApiKey(key);

  if (!result.valid) {
    return NextResponse.json({ error: "unauthorized", message: "Invalid or expired API key" }, { status: 401 });
  }

  if (requiredScope && !result.scopes?.includes(requiredScope)) {
    return NextResponse.json(
      { error: "forbidden", message: `Missing required scope: ${requiredScope}` },
      { status: 403 }
    );
  }

  return { providerId: result.providerId!, scopes: result.scopes || [] };
}
