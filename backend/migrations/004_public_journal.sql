BEGIN;

-- Public entries contain only allowlisted event codes, optional story IDs,
-- keyed deduplication hashes, and timestamps. Visitor IDs and wish text are
-- deliberately not stored in this shared table.
CREATE TABLE IF NOT EXISTS public_journal_events (
    id BIGSERIAL PRIMARY KEY,
    event_type VARCHAR(32) NOT NULL CHECK (
        event_type IN ('garden_wish', 'home_stars', 'atlas_puzzle', 'story_complete')
    ),
    reference_key VARCHAR(32),
    dedupe_key CHAR(64) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (
        (event_type = 'story_complete' AND reference_key IN (
            'missing-star', 'lumi-wish', 'music-box', 'lantern-path', 'little-lights',
            'ember-glow', 'nova-day', 'mochi-place', 'pippa-song'
        ))
        OR (event_type <> 'story_complete' AND reference_key IS NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_public_journal_events_created
    ON public_journal_events (created_at DESC, id DESC);

COMMIT;
