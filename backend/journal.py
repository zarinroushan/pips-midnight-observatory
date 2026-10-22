"""Anonymous, server-authored events for Pip's shared public journal."""

from __future__ import annotations

from collections import defaultdict, deque
from datetime import timezone
import hashlib
import hmac
import threading
import time

import psycopg
from flask import Blueprint, current_app, jsonify, request

try:
    from .database import connect_database, database_url
except ImportError:  # Support `python app.py` from backend/.
    from database import connect_database, database_url


journal = Blueprint("public_journal", __name__)
PUBLIC_JOURNAL_LIMIT = 60
PUBLIC_JOURNAL_READ_LIMIT = 120
PUBLIC_JOURNAL_READ_WINDOW_SECONDS = 300
PUBLIC_JOURNAL_EVENT_LIMIT = 60
PUBLIC_JOURNAL_EVENT_WINDOW_SECONDS = 300
read_requests = defaultdict(deque)
event_requests = defaultdict(deque)
read_requests_lock = threading.Lock()

EVENT_PRESENTATION = {
    "garden_wish": {
        "category": "Dream Garden",
        "icon": "✿",
        "title": "A garden wish found a little more room for hope",
        "message": "Pip made a little more room for hope in the garden.",
    },
    "home_stars": {
        "category": "Dream Garden",
        "icon": "✦",
        "title": "Five stars gathered",
        "message": "I found all five sparkling stars in the garden!",
    },
    "atlas_puzzle": {
        "category": "Games",
        "icon": "☾",
        "message": "A constellation was connected in the Dream Atlas.",
    },
    "atlas_game_completed": {
        "category": "Games",
        "icon": "★",
        "title": "Pip helped Anonymous Visitor complete the Dream Atlas adventure",
        "message": "Pip’s Wishbound Adventure reached its victory at the far end of the cloud path.",
    },
    "lullaby_hidden_star": {
        "category": "Lullaby Lab",
        "icon": "✦",
        "title": "Found the Hidden Stars",
        "message": "Anonymous Visitor completed the hidden-star discovery in Lullaby Lab.",
    },
    "lullaby_hidden_butterfly": {
        "category": "Lullaby Lab",
        "icon": "🦋",
        "title": "Found the Hidden Butterflies",
        "message": "Anonymous Visitor completed the hidden-butterfly discovery in Lullaby Lab.",
    },
}

STORY_TITLES = {
    "missing-star": "Pip and the Missing Star",
    "lumi-wish": "Lumi's Shimmering Wish",
    "music-box": "The Sleeping Music Box",
    "lantern-path": "The Lantern Path",
    "little-lights": "Garden of Little Lights",
    "ember-glow": "Ember's Brave Little Glow",
    "nova-day": "Nova's Slow and Steady Day",
    "mochi-place": "Mochi's Peaceful Place",
    "pippa-song": "Pippa's Song of Stars",
}
STORY_DESCRIPTIONS = {
    "missing-star": "Pip helped a tiny fallen star find a gentle home among the sky, clouds, or garden.",
    "lumi-wish": "Lumi learned that helping each flower one at a time could bring her shimmering wish to life.",
    "music-box": "Pip followed a remembered melody until the sleeping music box could offer comfort again.",
    "lantern-path": "Pip followed a warm lantern path and helped a lost friend find the way home.",
    "little-lights": "Pip and the Garden Friends discovered how their small lights belong together.",
    "ember-glow": "Ember discovered that courage can be a small light shared with a friend.",
    "nova-day": "Nova found a slow, steady pace for the journey to plant a moonflower seed.",
    "mochi-place": "Mochi and Pip found a quiet corner where the garden felt safe and peaceful.",
    "pippa-song": "Pippa found her beloved melody again with patient listening and a friend nearby.",
}
ATLAS_PUZZLE_NAMES = {
    "lantern": "The Lantern Fox",
    "sail": "The Moon-Sail",
    "whale": "The Cloud Whale",
    "garden": "The Dreaming Garden",
    "bell": "The Pillow Bell",
}


def _dedupe_key(visitor_id, event_key, secret_key):
    if not isinstance(secret_key, str) or len(secret_key) < 32:
        return None
    message = f"{visitor_id}:{event_key}".encode("utf-8")
    return hmac.new(secret_key.encode("utf-8"), message, hashlib.sha256).hexdigest()


def _allow_event_write():
    now = time.monotonic()
    client = request.remote_addr or "unknown"
    with read_requests_lock:
        for address, timestamps in list(event_requests.items()):
            while timestamps and now - timestamps[0] >= PUBLIC_JOURNAL_EVENT_WINDOW_SECONDS:
                timestamps.popleft()
            if not timestamps:
                event_requests.pop(address, None)
        attempts = event_requests[client]
        if len(attempts) >= PUBLIC_JOURNAL_EVENT_LIMIT:
            return False
        attempts.append(now)
    return True


def record_event(connection, visitor_id, event_key, event_type, reference_key=None, secret_key=None):
    """Record a fixed event once without storing the visitor identifier or personal text."""
    if event_type not in EVENT_PRESENTATION and event_type != "story_complete":
        return False
    if event_type == "story_complete" and reference_key not in STORY_TITLES:
        return False
    if event_type == "atlas_puzzle" and reference_key is not None and reference_key not in ATLAS_PUZZLE_NAMES:
        return False
    digest = _dedupe_key(visitor_id, event_key, secret_key)
    if not digest:
        return False
    if not _allow_event_write():
        return False
    inserted = connection.execute(
        """INSERT INTO public_journal_events (event_type, reference_key, dedupe_key)
           VALUES (%s, %s, %s) ON CONFLICT (dedupe_key) DO NOTHING RETURNING id""",
        (event_type, reference_key, digest),
    ).fetchone()
    return inserted is not None


def _safe_event(row):
    event_type, reference_key, created_at = row
    if event_type == "story_complete":
        title = STORY_TITLES.get(reference_key)
        if not title:
            return None
        presentation = {
            "category": "Stories",
            "icon": "✧",
            "title": f"Pip read {title} to Anonymous Visitor",
            "message": STORY_DESCRIPTIONS[reference_key],
        }
    else:
        presentation = EVENT_PRESENTATION.get(event_type)
        if not presentation:
            return None
        if event_type == "atlas_puzzle":
            puzzle_name = ATLAS_PUZZLE_NAMES.get(reference_key)
            presentation = {
                **presentation,
                "title": (
                    f"Pip helped Anonymous Visitor connect {puzzle_name}"
                    if puzzle_name else
                    "Pip helped Anonymous Visitor connect a constellation"
                ),
                "message": (
                    f"Anonymous Visitor connected {puzzle_name} in the Dream Atlas."
                    if puzzle_name else presentation["message"]
                ),
            }
        elif event_type in {"garden_wish", "home_stars"}:
            presentation = {**presentation, "title": presentation["title"]}
    happened_at = created_at
    if happened_at.tzinfo is None:
        happened_at = happened_at.replace(tzinfo=timezone.utc)
    return {
        "eventType": event_type,
        "category": presentation["category"],
        "icon": presentation["icon"],
        "title": presentation["title"],
        "message": presentation["message"],
        "visitorName": "Anonymous Visitor",
        "happenedAt": happened_at.isoformat(),
        **({"storyId": reference_key} if event_type == "story_complete" else {}),
    }


def _read_rate_limited():
    now = time.monotonic()
    client = request.remote_addr or "unknown"
    with read_requests_lock:
        for address, timestamps in list(read_requests.items()):
            while timestamps and now - timestamps[0] >= PUBLIC_JOURNAL_READ_WINDOW_SECONDS:
                timestamps.popleft()
            if not timestamps:
                read_requests.pop(address, None)
        requests = read_requests[client]
        while requests and now - requests[0] >= PUBLIC_JOURNAL_READ_WINDOW_SECONDS:
            requests.popleft()
        if len(requests) >= PUBLIC_JOURNAL_READ_LIMIT:
            return True
        requests.append(now)
    return False


@journal.get("/api/public-journal")
def get_public_journal():
    if _read_rate_limited():
        return jsonify(error="The shared journal is receiving many visits. Please try again shortly."), 429
    connection_url = database_url()
    if not connection_url:
        return jsonify(error="The shared journal is taking a quiet moment."), 503
    try:
        with connect_database(connection_url) as connection:
            rows = connection.execute(
                """SELECT event_type, reference_key, created_at
                   FROM public_journal_events ORDER BY id DESC LIMIT %s""",
                (PUBLIC_JOURNAL_LIMIT,),
            ).fetchall()
    except psycopg.Error as error:
        current_app.logger.info("Public journal is temporarily unavailable (%s).", type(error).__name__)
        return jsonify(error="The shared journal is taking a quiet moment."), 503
    return jsonify(entries=[entry for row in rows if (entry := _safe_event(row)) is not None]), 200
