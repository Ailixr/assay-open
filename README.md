# Assay

**Open-source AI quality measurement:** unique invoice URLs, tipping, feedback, and ABA (PayWay) payments. Self-hosted; you configure your own PayWay and Supabase via `.env.local`.

---

## Table of contents

- [Features](#features)
- [Screenshots](#screenshots)
- [Quick start](#quick-start)
- [Step-by-step setup](#step-by-step-setup)
- [Environment variables](#environment-variables)
- [Invoice generation](#invoice-generation)
- [API reference](#api-reference)
- [End-to-end flow](#end-to-end-flow)
- [Testing the flow](#testing-the-flow)
- [License](#license)

---

## Features

| Feature | Description |
|--------|-------------|
| **Unique invoice URLs** | Each invoice gets a public page at `/invoice/[id]` (e.g. `https://yoursite.com/invoice/inv_abc123`). |
| **Tipping & feedback** | On the invoice page, payers choose a tip (0%, 10%, 15%, 20%, or custom %) and optional 1–5 rating + comment. |
| **ABA (PayWay) payments** | After confirming amount + tip, the app generates an ABA payment link; PayWay webhooks confirm payment and update the invoice. |
| **DPO export** | Export training signals (chosen vs rejected) for DPO/fine-tuning via `GET /api/export/dpo`. |
| **API key auth** | Create invoices and list/read them using API keys (`Bearer ask_xxxxx`) with scopes `invoices:read` and `invoices:write`. |

---

## Screenshots

Add your own screenshots to `docs/screenshots/` and reference them here. Suggested filenames:

| Page | Path | Description |
|------|------|-------------|
| Home | `docs/screenshots/home.png` | Landing page with service name and quick API hints. |
| Invoice (unpaid) | `docs/screenshots/invoice-unpaid.png` | Invoice view with amount, tip options, feedback (rating + comment), and “Confirm & pay with ABA”. |
| Invoice (paid) | `docs/screenshots/invoice-paid.png` | Thank-you state after payment. |
| Rate (post-pay) | `docs/screenshots/rate.png` | Rate & tip page (when implemented). |
| Dispute | `docs/screenshots/dispute.png` | Dispute form (when implemented). |
| QR pay | `docs/screenshots/qr.png` | Scan to pay (KHQR) page (when implemented). |

Example with images (uncomment and add files):

```markdown
### Home
![Home](docs/screenshots/home.png)

### Invoice page (unpaid)
![Invoice unpaid](docs/screenshots/invoice-unpaid.png)

### Invoice page (paid)
![Invoice paid](docs/screenshots/invoice-paid.png)
```

---

## Quick start

```bash
git clone https://github.com/your-org/assay.git
cd assay
npm install
cp .env.example .env.local
# Edit .env.local: Supabase + PayWay + Assay (see Environment variables)
# Run migrations in Supabase SQL Editor (see Step-by-step setup)
npm run dev
```

Then create an API key and an invoice:

```bash
npm run seed:key
# Use the printed key as ASSAY_API_KEY in .env.local or when calling the API
curl -X POST http://localhost:3000/api/invoices \
  -H "Authorization: Bearer ask_xxxxx" \
  -H "Content-Type: application/json" \
  -d '{"task_description":"Test task","base_cost":1.50,"currency":"USD"}'
```

---

## Step-by-step setup

### 1. Clone and install

```bash
git clone https://github.com/your-org/assay.git
cd assay
npm install
```

### 2. Environment file

```bash
cp .env.example .env.local
```

Edit `.env.local` with your values. See [Environment variables](#environment-variables) for a full list.

### 3. Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. In **Project Settings → API**, copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY`
3. In the **SQL Editor**, run the migrations in order:
   - `src/lib/supabase/migrations/001_initial.sql`
   - `src/lib/supabase/migrations/002_invoice_feedback_schema.sql`

### 4. PayWay (ABA)

1. Sign up at [PayWay](https://payway.com.kh) and get sandbox/production credentials.
2. Set in `.env.local`:
   - `PAYWAY_MERCHANT_ID`
   - `PAYWAY_API_KEY`
   - `PAYWAY_BASE_URL` (e.g. `https://checkout-sandbox.payway.com.kh` for sandbox)
   - Optional: `PAYWAY_WEBHOOK_SECRET` for webhook verification

### 5. Assay settings

- `ASSAY_API_KEY_SALT` — Random string used to hash API keys (e.g. `openssl rand -hex 24`).
- `ASSAY_BASE_URL` — Your app’s public URL (e.g. `https://assay.yourdomain.com` or `http://localhost:3000` for dev). Used for invoice links and PayWay webhook URL.

### 6. Create an API key

```bash
npm run seed:key
```

Save the printed key; it’s shown only once. Add it to `.env.local` as `ASSAY_API_KEY` for scripts, or pass it when calling the API.

### 7. Run the app

```bash
npm run dev
```

Open `http://localhost:3000`. For production, set `ASSAY_BASE_URL` to your real URL (e.g. on Vercel).

---

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| **Supabase** | | |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL. |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key (server-only). |
| **PayWay** | | |
| `PAYWAY_MERCHANT_ID` | Yes (for payments) | PayWay merchant ID. |
| `PAYWAY_API_KEY` | Yes (for payments) | PayWay API key. |
| `PAYWAY_BASE_URL` | Yes (for payments) | PayWay API base URL (e.g. sandbox or production). |
| `PAYWAY_WEBHOOK_SECRET` | No | Optional webhook secret for verification. |
| **Assay** | | |
| `ASSAY_API_KEY_SALT` | Yes | Random string used to hash API keys. |
| `ASSAY_BASE_URL` | Yes | Public URL of this app (invoice links, webhooks). |
| `ASSAY_API_KEY` | No | API key for scripts (e.g. `test:flow`, `demo`). |
| `ASSAY_TEST_WEBHOOK` | No | Set to `1` to allow test webhook simulation (`test_simulation: true`). |

Use `.env.local` for local overrides (gitignored). See `.env.example` in the repo for a template.

---

## Invoice generation

You can create invoices with either the **new nested body** or the **legacy flat body**. Both are accepted by `POST /api/invoices`.

### New format (recommended)

```json
{
  "task": {
    "description": "Summarize the attached documents",
    "type": "customer_service",
    "model": "gpt-4o-mini",
    "tokens_in": 1200,
    "tokens_out": 400,
    "tools_used": 0,
    "duration_ms": 2300,
    "metadata": {}
  },
  "cost": {
    "line_items": [
      { "label": "Input tokens", "amount": 0.24, "detail": "1200 × 0.0002" },
      { "label": "Output tokens", "amount": 0.12, "detail": "400 × 0.0003" }
    ],
    "total": 0.36,
    "currency": "USD"
  },
  "feedback": {
    "categories": [
      { "key": "accuracy", "label": "Accuracy" },
      { "key": "tone", "label": "Tone" }
    ],
    "tags": [
      { "key": "helpful", "label": "Helpful", "sentiment": "positive" },
      { "key": "wrong_info", "label": "Wrong info", "sentiment": "negative" }
    ],
    "comment_prompt": "Any additional feedback?"
  },
  "options": {
    "currency": "USD",
    "expires_in_hours": 72,
    "tip_presets": [0, 0.1, 0.15, 0.2],
    "locale": "en"
  }
}
```

- **task**: `description` required; `type`, `model`, `tokens_in`, `tokens_out`, `tools_used`, `duration_ms`, `metadata` optional.
- **cost**: `line_items` (each: `label`, `amount`, optional `detail`), `total`, `currency` (`"USD"` or `"KHR"`).
- **feedback**: Optional; `categories`, `tags` (with `sentiment`: `"positive"` or `"negative"`), `comment_prompt`, and optional `comment_prompt_km`.
- **options**: Optional; `expires_in_hours` (default 72, max 720), `tip_presets`, `locale`.

### Legacy format (flat)

```json
{
  "task_description": "Summarize the attached documents",
  "external_id": "your-ref-123",
  "model": "gpt-4o-mini",
  "tokens_in": 1200,
  "tokens_out": 400,
  "tools_used": 0,
  "duration_ms": 2300,
  "base_cost": 0.36,
  "currency": "USD",
  "line_items": [
    { "description": "Input tokens", "amount": 0.24 },
    { "description": "Output tokens", "amount": 0.12 }
  ],
  "expires_in_hours": 72
}
```

- **task_description** (required), **base_cost** (required), **currency** (`USD` or `KHR`).
- **line_items**: optional array of `{ description, amount }`.
- **expires_in_hours**: optional, default 72.

### Create response

```json
{
  "id": "inv_xxxxxxxxxxxxxxxx",
  "status": "sent",
  "base_cost": 0.36,
  "currency": "USD",
  "invoice_url": "https://your-app.com/invoice/inv_xxxxxxxxxxxxxxxx",
  "expires_at": "2025-02-10T12:00:00.000Z"
}
```

Use `invoice_url` for the payer; the page at `/invoice/[id]` shows amount, tip, feedback, and “Confirm & pay with ABA”.

---

## API reference

All authenticated endpoints expect:

```http
Authorization: Bearer ask_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

API keys are created with `npm run seed:key` and stored hashed in Supabase; the raw key is shown once.

---

### Health

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/health` | No | Health check. Returns `{ status, service, timestamp }`. |

---

### Invoices (authenticated)

| Method | Path | Scope | Description |
|--------|------|-------|-------------|
| POST | `/api/invoices` | `invoices:write` | Create invoice. Body: [new or legacy](#invoice-generation). Returns `id`, `invoice_url`, `status`, `base_cost`, `currency`, `expires_at`. |
| GET | `/api/invoices` | `invoices:read` | List invoices. Query: `limit` (default 20, max 100), `offset`, `status`. Returns `{ data, count, limit, offset }`. |
| GET | `/api/invoices/[id]` | `invoices:read` | Get single invoice (full object). 403 if not your provider. |

---

### Invoices (public, no auth)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/invoices/public/[id]` | Get public invoice (used by the invoice page). Returns safe fields: `id`, `task_description`, `base_cost`, `currency`, `line_items`, `status`, `tip_amount`, `rating`, `rating_comment`, `payway_payment_link`, `paid_at`, `paid_amount`, `expires_at`, `feedback_schema`, etc. |
| POST | `/api/invoices/[id]/tip-feedback` | Submit tip + optional rating/comment. Body: `{ tip_amount, rating?, comment? }`. Allowed when status is `sent` or `viewed`. |
| POST | `/api/invoices/[id]/create-payment` | Create ABA (PayWay) payment link for base + tip. Returns `{ payment_link }`. Errors: `not_found`, `already_paid`, `invalid_amount`. |
| GET | `/api/invoices/[id]/status` | Lightweight status: `{ id, status, paid, rated }`. No auth. |
| POST | `/api/invoices/[id]/rate` | Submit full rating after payment. Body: `rateInvoiceSchema` (overall_rating, category_ratings?, tags?, comment?, tip_amount?). Invoice must be `paid`. |

---

### Export & other (authenticated)

| Method | Path | Scope | Description |
|--------|------|-------|-------------|
| GET | `/api/export/dpo` | `invoices:read` | DPO export. Query: `model`, `since`, `until`, `limit`, `format` (`json` or `jsonl`). Returns chosen/rejected pairs for training. |

---

### Webhooks

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/webhooks/payway` | Redirect: query `merchant_ref` or `invoice_id` → redirect to `ASSAY_BASE_URL/invoice/[id]`. |
| POST | `/api/webhooks/payway` | PayWay payment webhook. With `ASSAY_TEST_WEBHOOK=1`, body `{ test_simulation: true, merchant_ref, payment_amount?, transaction_id? }` marks invoice paid without calling PayWay. |

---

### Endpoint summary

| Endpoint | Auth | Purpose |
|----------|------|--------|
| `GET /api/health` | No | Health check |
| `POST /api/invoices` | API key | Create invoice |
| `GET /api/invoices` | API key | List invoices |
| `GET /api/invoices/[id]` | API key | Get invoice (owner) |
| `GET /api/invoices/public/[id]` | No | Public invoice (page data) |
| `POST /api/invoices/[id]/tip-feedback` | No | Tip + feedback |
| `POST /api/invoices/[id]/create-payment` | No | Create ABA payment link |
| `GET /api/invoices/[id]/status` | No | Status only |
| `POST /api/invoices/[id]/rate` | No | Rate after payment |
| `GET /api/export/dpo` | API key | DPO export |
| `GET/POST /api/webhooks/payway` | No | PayWay redirect + webhook |

---

## End-to-end flow

1. **You** create an invoice via `POST /api/invoices` (API key). Response includes `invoice_url`.
2. **Payer** opens `invoice_url` → sees amount, line items, tip options, and optional feedback (1–5 rating + comment).
3. **Payer** confirms amount + tip → app saves tip/feedback with `POST /api/invoices/[id]/tip-feedback`, then creates ABA link with `POST /api/invoices/[id]/create-payment` and redirects to PayWay.
4. **Payer** pays on PayWay. PayWay sends a webhook to `ASSAY_BASE_URL/api/webhooks/payway`; your server verifies the transaction and marks the invoice `paid` (or `rated` if rating was already submitted).
5. Optionally, **payer** submits full rating via `POST /api/invoices/[id]/rate` or the rate page.

---

## Testing the flow

1. Start dev server: `npm run dev`
2. Create API key: `npm run seed:key`; add it to `.env.local` as `ASSAY_API_KEY` (or pass inline).
3. (Optional) For webhook simulation: add `ASSAY_TEST_WEBHOOK=1` to `.env.local` and restart.

Run the simulation:

```bash
ASSAY_API_KEY=ask_xxxxx ASSAY_BASE_URL=http://localhost:3000 npm run test:flow
```

The script runs:

1. **Create invoice** — `POST /api/invoices` (with API key)
2. **Get public invoice** — `GET /api/invoices/public/[id]`
3. **Submit tip + feedback** — `POST /api/invoices/[id]/tip-feedback`
4. **Create ABA payment** — `POST /api/invoices/[id]/create-payment` (requires PayWay; may fail if not configured)
5. **Simulate webhook** — `POST /api/webhooks/payway` with `test_simulation: true` (only if `ASSAY_TEST_WEBHOOK=1`)
6. **Verify paid** — `GET /api/invoices/public/[id]` again

Other scripts:

- `npm run demo` — Create a sample invoice (API or direct Supabase).
- `npm run test:invoice` — Create a customer-service example invoice (requires `ASSAY_API_KEY`).

---

## License

MIT — see [LICENSE](LICENSE).
