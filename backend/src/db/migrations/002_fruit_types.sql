PRAGMA foreign_keys = ON;

BEGIN;

-- Canonical list of produce types
CREATE TABLE fruit_types (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- Insert a "General" type so existing rates and weigh_ins have somewhere to point
INSERT INTO fruit_types (name) VALUES ('General');

-- Add fruit_type_id to rates (nullable so existing rows don't break)
ALTER TABLE rates ADD COLUMN fruit_type_id INTEGER REFERENCES fruit_types(id);

-- Point all existing rates at the General fruit type
UPDATE rates SET fruit_type_id = (SELECT id FROM fruit_types WHERE name = 'General');

-- Add fruit_type_id to weigh_ins (nullable for backward compat with existing rows)
ALTER TABLE weigh_ins ADD COLUMN fruit_type_id INTEGER REFERENCES fruit_types(id);

-- Point all existing weigh_ins at the General fruit type
UPDATE weigh_ins SET fruit_type_id = (SELECT id FROM fruit_types WHERE name = 'General');

CREATE INDEX idx_rates_fruit_type ON rates (fruit_type_id);
CREATE INDEX idx_weigh_ins_fruit_type ON weigh_ins (fruit_type_id);

COMMIT;
