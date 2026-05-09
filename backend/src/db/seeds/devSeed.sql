BEGIN;

-- Change this if you want to run the app in another currency for local testing.
UPDATE app_config
SET currency_code = 'AUD',
    updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE id = 1;

INSERT INTO workers (worker_number, name) VALUES
  ('101', 'Sample Worker'),
  ('102', 'Second Worker');

-- Seed fruit types with per-type rates
INSERT INTO fruit_types (name) VALUES
  ('Strawberry'),
  ('Blueberry'),
  ('Raspberry')
ON CONFLICT(name) DO NOTHING;

INSERT INTO rates (fruit_type_id, cents_per_kg, currency_code, effective_from)
SELECT
  ft.id,
  r.cents_per_kg,
  ac.currency_code,
  strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
FROM (VALUES
  ('Strawberry', 350),
  ('Blueberry',  500),
  ('Raspberry',  450)
) AS r(name, cents_per_kg)
JOIN fruit_types ft ON ft.name = r.name
JOIN app_config ac ON ac.id = 1;

INSERT INTO weigh_ins (
  worker_number,
  weight_grams,
  rate_cents_per_kg_snapshot,
  currency_code_snapshot,
  fruit_type_id
)
SELECT
  '101',
  22400,
  r.cents_per_kg,
  r.currency_code,
  r.fruit_type_id
FROM rates r
JOIN fruit_types ft ON ft.id = r.fruit_type_id
WHERE ft.name = 'Strawberry'
ORDER BY r.effective_from DESC, r.id DESC
LIMIT 1;

INSERT INTO payments (worker_number, amount_cents, currency_code_snapshot, note)
SELECT
  '101',
  3000,
  currency_code,
  'Sample payment'
FROM app_config
WHERE id = 1;

COMMIT;
