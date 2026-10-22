BEGIN;

-- Allow only safe, allowlisted constellation IDs as details on Atlas puzzle
-- events. Historical rows with no reference remain valid.
ALTER TABLE public_journal_events
    DROP CONSTRAINT IF EXISTS public_journal_events_check;

ALTER TABLE public_journal_events
    DROP CONSTRAINT IF EXISTS public_journal_events_reference_key_check;

ALTER TABLE public_journal_events
    ADD CONSTRAINT public_journal_events_reference_key_check CHECK (
        (event_type = 'story_complete' AND reference_key IN (
            'missing-star', 'lumi-wish', 'music-box', 'lantern-path', 'little-lights',
            'ember-glow', 'nova-day', 'mochi-place', 'pippa-song'
        ))
        OR (
            event_type = 'atlas_puzzle'
            AND (reference_key IS NULL OR reference_key IN (
                'lantern', 'sail', 'whale', 'garden', 'bell'
            ))
        )
        OR (event_type NOT IN ('story_complete', 'atlas_puzzle') AND reference_key IS NULL)
    );

COMMIT;
