ALTER TABLE proposal_items ADD COLUMN IF NOT EXISTS kelvin text;
ALTER TABLE proposal_items ADD COLUMN IF NOT EXISTS watt text;
ALTER TABLE proposal_items ADD COLUMN IF NOT EXISTS lumen text;
ALTER TABLE proposal_items ADD COLUMN IF NOT EXISTS width decimal(10, 2);
ALTER TABLE proposal_items ADD COLUMN IF NOT EXISTS length decimal(10, 2);
ALTER TABLE proposal_items ADD COLUMN IF NOT EXISTS piece_count integer;
