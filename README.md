# Assay

Open-source AI quality measurement: invoices with unique URLs, tipping, feedback, and ABA (PayWay) payments. Each deployment is self-hosted; you configure your own PayWay and Supabase via `.env.local`.

## Features

- **Unique invoice URLs** — Each invoice gets a public page at `/invoice/[id]` (e.g. `https://yoursite.com/invoice/inv_abc123`).
- **Tipping & feedback** — On the invoice page, payers choose a tip and optional rating/comment; results are saved on your server.
- **ABA (PayWay) payments** — After the payer confirms amount + tip, the app generates an ABA payment link; PayWay webhooks confirm paid/not and update the invoice.

## Setup (per user / per deployment)

1. **Clone and install**

   ```bash
   git clone https://github.com/your-org/assay.git
   cd assay
   npm install
   ```

2. **Configure environment**

   Copy the example env and fill in your own values in `.env.local` (this file is gitignored):

   ```bash
   cp .env.example .env.local
   ```

   Edit `.env.local` with:

   - **PayWay (ABA)** — `PAYWAY_MERCHANT_ID`, `PAYWAY_API_KEY`, `PAYWAY_BASE_URL`, optional `PAYWAY_WEBHOOK_SECRET`.
   - **Supabase** — `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.
   - **Assay** — `ASSAY_API_KEY_SALT` (random string), `ASSAY_BASE_URL` (your app’s public URL, e.g. `https://assay.yourdomain.com`).

   See `.env.example` for all variables and comments.

3. **Database**

   Run the Supabase migration in your project’s SQL editor:  
   `src/lib/supabase/migrations/001_initial.sql`

4. **Run**

   ```bash
   npm run dev
   ```

   Set `ASSAY_BASE_URL` in `.env.local` to your real URL when deploying (e.g. Vercel); it’s used for invoice links and PayWay webhooks.

## Flow

1. You create an invoice via the API (authenticated with your API key). The response includes `invoice_url` (unique public page).
2. Payer opens the invoice URL → sees amount, tip options, and feedback (rating + comment).
3. Payer confirms amount + tip → tip and feedback are saved; then an ABA (PayWay) payment link is generated for the total.
4. Payer completes payment on PayWay; the webhook hits your server, which verifies the transaction with PayWay and marks the invoice as paid (or not).

## Testing the flow (simulation)

A script simulates each step of the flow against your running dev server:

1. **Create invoice** — `POST /api/invoices` (with API key)
2. **Get public invoice** — `GET /api/invoices/public/[id]`
3. **Submit tip + feedback** — `POST /api/invoices/[id]/tip-feedback`
4. **Create ABA payment** — `POST /api/invoices/[id]/create-payment` (requires PayWay; can fail if not configured)
5. **Simulate webhook** — `POST /api/webhooks/payway` with `test_simulation: true` (requires `ASSAY_TEST_WEBHOOK=1` in `.env.local`)
6. **Verify paid** — `GET /api/invoices/public/[id]` again

```bash
# Create an API key first
npm run seed:key
# Add ASSAY_TEST_WEBHOOK=1 to .env.local for step 5, then:
ASSAY_API_KEY=ask_xxxxx ASSAY_BASE_URL=http://localhost:3000 npm run test:flow
```

With `ASSAY_TEST_WEBHOOK=1`, the webhook accepts a body with `test_simulation: true` and `merchant_ref` and marks the invoice as paid without calling PayWay (for local/testing only).

## API (high level)

- **Create invoice** — `POST /api/invoices` (API key). Returns `invoice_url`.
- **Public invoice** — `GET /api/invoices/public/[id]` (no auth). Used by the invoice page.
- **Tip + feedback** — `POST /api/invoices/[id]/tip-feedback` (no auth). Body: `{ tip_amount, rating?, comment? }`.
- **Create payment** — `POST /api/invoices/[id]/create-payment` (no auth). Creates ABA link for base + tip; returns `payment_link`.

## License

MIT — see [LICENSE](LICENSE).
