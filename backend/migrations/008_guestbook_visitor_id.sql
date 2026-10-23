BEGIN;

ALTER TABLE guestbook_entries
ADD COLUMN IF NOT EXISTS visitor_id UUID;

CREATE INDEX IF NOT EXISTS idx_guestbook_visitor_id
ON guestbook_entries (visitor_id);

COMMIT;