@'
BEGIN;

-- Keep existing guestbook entries and journal events intact.
ALTER TABLE guestbook_entries
    ADD COLUMN IF NOT EXISTS public_journal_event_id BIGINT
    REFERENCES public_journal_events(id) ON DELETE SET NULL;

-- The same browser visitor can now be associated with future public events.
ALTER TABLE public_journal_events
    ADD COLUMN IF NOT EXISTS visitor_id UUID;

CREATE INDEX IF NOT EXISTS idx_public_journal_events_visitor
    ON public_journal_events (visitor_id, id DESC)
    WHERE visitor_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_guestbook_public_event
    ON guestbook_entries (public_journal_event_id)
    WHERE public_journal_event_id IS NOT NULL;

-- Open the existing wall: old pending entries become published too.
UPDATE guestbook_entries
SET status = 'approved'
WHERE status = 'pending';

ALTER TABLE guestbook_entries
    ALTER COLUMN status SET DEFAULT 'approved';

COMMIT;
'@ | Set-Content backend\migrations\007_guestbook_workshop_link.sql