BEGIN;

-- Forward-only schema update for databases that already applied migration 004.
-- Expands public_journal_events allowed event types to include:
-- 'atlas_game_completed', 'lullaby_hidden_star', and 'lullaby_hidden_butterfly'.
-- Retains 'garden_wish', 'home_stars', 'atlas_puzzle', and 'story_complete'.
-- Preserves all historical records, indexes, and existing table data.
ALTER TABLE public_journal_events
    DROP CONSTRAINT IF EXISTS public_journal_events_event_type_check;

ALTER TABLE public_journal_events
    ADD CONSTRAINT public_journal_events_event_type_check CHECK (
        event_type IN (
            'garden_wish',
            'home_stars',
            'atlas_puzzle',
            'atlas_game_completed',
            'lullaby_hidden_star',
            'lullaby_hidden_butterfly',
            'story_complete'
        )
    );

COMMIT;