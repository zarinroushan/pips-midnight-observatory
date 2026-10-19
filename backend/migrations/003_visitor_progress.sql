BEGIN;

-- Visitor-scoped progress for the existing interactive pages. The UUID is the
-- same opaque browser-local identifier already used by Dream Garden.
CREATE TABLE IF NOT EXISTS visitor_progress (
    visitor_id UUID NOT NULL,
    feature_key VARCHAR(24) NOT NULL
        CHECK (feature_key IN ('home', 'atlas', 'bedtime', 'lullaby')),
    revision INTEGER NOT NULL CHECK (revision >= 1),
    data JSONB NOT NULL CHECK (jsonb_typeof(data) = 'object'),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (visitor_id, feature_key)
);

CREATE INDEX IF NOT EXISTS idx_visitor_progress_updated
    ON visitor_progress (updated_at DESC);

COMMIT;
