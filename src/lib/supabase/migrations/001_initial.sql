-- Assay Schema v1 — Run in Supabase SQL Editor
-- PayWay (ABA Bank Cambodia) payment integration

-- API Keys for provider authentication
CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  label TEXT,
  scopes TEXT[] DEFAULT '{"invoices:write","invoices:read"}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ
);

CREATE INDEX idx_api_keys_hash ON api_keys(key_hash);
CREATE INDEX idx_api_keys_provider ON api_keys(provider_id);

-- Invoices: one per AI task
CREATE TABLE invoices (
  id TEXT PRIMARY KEY,
  provider_id TEXT NOT NULL,
  external_id TEXT,
  task_description TEXT NOT NULL,
  model TEXT,
  tokens_in INTEGER,
  tokens_out INTEGER,
  tools_used INTEGER,
  duration_ms INTEGER,
  base_cost DECIMAL(10,4) NOT NULL,
  currency TEXT DEFAULT 'USD',
  line_items JSONB DEFAULT '[]',
  status TEXT DEFAULT 'draft',
  payway_payment_link TEXT,
  payway_txn_id TEXT,
  payment_method TEXT,
  paid_at TIMESTAMPTZ,
  paid_amount DECIMAL(10,4),
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  rating_comment TEXT,
  rated_at TIMESTAMPTZ,
  tip_amount DECIMAL(10,4) DEFAULT 0,
  tip_payway_txn_id TEXT,
  tip_paid_at TIMESTAMPTZ,
  dispute_reason TEXT,
  dispute_comment TEXT,
  dispute_refund_txn_id TEXT,
  disputed_at TIMESTAMPTZ,
  refund_amount DECIMAL(10,4),
  refund_status TEXT,
  quality_score DECIMAL(5,4),
  signal_class TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ
);

CREATE INDEX idx_invoices_provider ON invoices(provider_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_signal ON invoices(signal_class);
CREATE INDEX idx_invoices_created ON invoices(created_at DESC);
CREATE INDEX idx_invoices_external ON invoices(provider_id, external_id);

-- Payment events log (append-only)
CREATE TABLE payment_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id TEXT REFERENCES invoices(id),
  event_type TEXT NOT NULL,
  payway_txn_id TEXT,
  amount DECIMAL(10,4),
  currency TEXT,
  payment_method TEXT,
  raw_payload JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_events_invoice ON payment_events(invoice_id);
CREATE INDEX idx_events_type ON payment_events(event_type);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER invoices_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only" ON api_keys FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON invoices FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON payment_events FOR ALL USING (auth.role() = 'service_role');
