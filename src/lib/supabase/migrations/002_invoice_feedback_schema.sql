-- Invoice feedback schema: task type, metadata, categories, tags, provider defaults, presets

-- Invoices: new columns for task and structured feedback
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS task_type TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS task_metadata JSONB DEFAULT '{}';
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS feedback_schema JSONB DEFAULT '{}';
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS category_ratings JSONB DEFAULT '{}';
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS tags_selected TEXT[] DEFAULT '{}';

-- Provider feedback defaults (per task_type)
CREATE TABLE IF NOT EXISTS feedback_defaults (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id TEXT NOT NULL,
  task_type TEXT NOT NULL,
  categories JSONB NOT NULL DEFAULT '[]',
  tags JSONB NOT NULL DEFAULT '[]',
  comment_prompt TEXT,
  tip_presets JSONB DEFAULT '[0.05, 0.10, 0.25]',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(provider_id, task_type)
);

CREATE INDEX IF NOT EXISTS idx_feedback_defaults_provider ON feedback_defaults(provider_id, task_type);

CREATE TRIGGER feedback_defaults_updated_at
  BEFORE UPDATE ON feedback_defaults
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Preset feedback schemas (Assay defaults)
CREATE TABLE IF NOT EXISTS feedback_presets (
  task_type TEXT PRIMARY KEY,
  categories JSONB NOT NULL,
  tags JSONB NOT NULL,
  comment_prompt TEXT DEFAULT 'Any additional feedback?'
);

-- Seed presets (idempotent: insert or update)
INSERT INTO feedback_presets (task_type, categories, tags, comment_prompt) VALUES
('code', 
  '[{"key":"correctness","label":"Code Correctness"},{"key":"style","label":"Code Style"},{"key":"efficiency","label":"Efficiency"},{"key":"documentation","label":"Documentation"}]'::jsonb,
  '[{"key":"ran_first_try","label":"Ran first try","sentiment":"positive"},{"key":"clean_code","label":"Clean code","sentiment":"positive"},{"key":"good_comments","label":"Good comments","sentiment":"positive"},{"key":"syntax_error","label":"Syntax error","sentiment":"negative"},{"key":"wrong_approach","label":"Wrong approach","sentiment":"negative"},{"key":"hallucinated_api","label":"Hallucinated API","sentiment":"negative"},{"key":"incomplete","label":"Incomplete","sentiment":"negative"}]'::jsonb,
  'Any additional feedback?'),
('customer_service',
  '[{"key":"accuracy","label":"Accuracy"},{"key":"tone","label":"Tone"},{"key":"language","label":"Language Quality"},{"key":"helpfulness","label":"Helpfulness"}]'::jsonb,
  '[{"key":"polite","label":"Polite","sentiment":"positive"},{"key":"empathetic","label":"Empathetic","sentiment":"positive"},{"key":"resolved","label":"Resolved issue","sentiment":"positive"},{"key":"too_formal","label":"Too formal","sentiment":"negative"},{"key":"wrong_info","label":"Wrong information","sentiment":"negative"},{"key":"robotic","label":"Sounds robotic","sentiment":"negative"}]'::jsonb,
  'Any additional feedback?'),
('bookkeeping',
  '[{"key":"accuracy","label":"Number Accuracy"},{"key":"categorization","label":"Categorization"},{"key":"formatting","label":"Formatting"}]'::jsonb,
  '[{"key":"all_correct","label":"All numbers correct","sentiment":"positive"},{"key":"good_categories","label":"Good categories","sentiment":"positive"},{"key":"wrong_amount","label":"Wrong amount","sentiment":"negative"},{"key":"wrong_category","label":"Wrong category","sentiment":"negative"},{"key":"missing_entry","label":"Missing entry","sentiment":"negative"},{"key":"duplicate","label":"Duplicate entry","sentiment":"negative"}]'::jsonb,
  'Any additional feedback?'),
('translation',
  '[{"key":"accuracy","label":"Translation Accuracy"},{"key":"fluency","label":"Fluency / Naturalness"},{"key":"register","label":"Register / Formality"}]'::jsonb,
  '[{"key":"natural","label":"Sounds natural","sentiment":"positive"},{"key":"correct_register","label":"Correct register","sentiment":"positive"},{"key":"literal","label":"Too literal","sentiment":"negative"},{"key":"wrong_word","label":"Wrong word choice","sentiment":"negative"},{"key":"grammar_error","label":"Grammar error","sentiment":"negative"}]'::jsonb,
  'Any additional feedback?'),
('general',
  '[{"key":"quality","label":"Overall Quality"},{"key":"accuracy","label":"Accuracy"},{"key":"usefulness","label":"Usefulness"}]'::jsonb,
  '[{"key":"helpful","label":"Helpful","sentiment":"positive"},{"key":"clear","label":"Clear","sentiment":"positive"},{"key":"fast","label":"Fast","sentiment":"positive"},{"key":"wrong","label":"Wrong","sentiment":"negative"},{"key":"confusing","label":"Confusing","sentiment":"negative"},{"key":"incomplete","label":"Incomplete","sentiment":"negative"}]'::jsonb,
  'Any additional feedback?')
ON CONFLICT (task_type) DO UPDATE SET
  categories = EXCLUDED.categories,
  tags = EXCLUDED.tags,
  comment_prompt = EXCLUDED.comment_prompt;

-- RLS for feedback_defaults
ALTER TABLE feedback_defaults ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON feedback_defaults FOR ALL USING (auth.role() = 'service_role');
