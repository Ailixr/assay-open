#!/bin/bash
# Test Assay API with pretend vendor/invoice details
# Requires: ASSAY_API_KEY env var (run npm run seed:key first to create one)

BASE="${ASSAY_BASE_URL:-http://localhost:3000}"
KEY="${ASSAY_API_KEY:-}"

echo "=== 1. Health check (no auth) ==="
curl -s "$BASE/api/health" | jq .

echo ""
echo "=== 2. POST /api/invoices (pretend vendor details) ==="
if [ -z "$KEY" ]; then
  echo "Set ASSAY_API_KEY first (run: npm run seed:key)"
  echo "Example: ASSAY_API_KEY=ask_xxxxx ./scripts/test-api.sh"
  exit 1
fi

curl -s -X POST "$BASE/api/invoices" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $KEY" \
  -d '{
    "task_description": "Summarize 10 documents (pretend vendor task)",
    "external_id": "ext_test_001",
    "model": "gpt-4o-mini",
    "tokens_in": 15000,
    "tokens_out": 1200,
    "tools_used": 3,
    "duration_ms": 4200,
    "base_cost": 0.85,
    "currency": "USD",
    "line_items": [
      { "description": "Input tokens", "amount": 0.45, "model": "gpt-4o-mini" },
      { "description": "Output tokens", "amount": 0.36, "model": "gpt-4o-mini" },
      { "description": "Tool calls", "amount": 0.04, "tools": 3 }
    ],
    "expires_in_hours": 72
  }' | jq .
