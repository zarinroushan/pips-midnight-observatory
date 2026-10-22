import os
import unittest
from datetime import datetime, timezone
from unittest.mock import patch
from uuid import UUID

from backend import app as backend_app
from backend.journal import record_event
from backend.progress import _record_progress_journal_events


class JournalStore:
    def __init__(self):
        self.rows = []
        self.dedupe = set()

    def __enter__(self):
        return self

    def __exit__(self, *_args):
        return False

    def execute(self, query, params=()):
        normalized = " ".join(query.split())
        if normalized.startswith("INSERT INTO public_journal_events"):
            event_type, reference_key, dedupe_key = params
            self.result = None
            if dedupe_key not in self.dedupe:
                self.dedupe.add(dedupe_key)
                self.rows.append((event_type, reference_key, datetime.now(timezone.utc), dedupe_key))
                self.result = (len(self.rows),)
        elif normalized.startswith("SELECT event_type, reference_key, created_at"):
            self.rows.sort(key=lambda row: row[2], reverse=True)
            self.result = [row[:3] for row in self.rows[:params[0]]]
        elif normalized.startswith("SAVEPOINT") or normalized.startswith("RELEASE SAVEPOINT"):
            self.result = None
        else:
            raise AssertionError(f"Unexpected journal query: {normalized}")
        return self

    def fetchone(self):
        return self.result

    def fetchall(self):
        return self.result


class PublicJournalTests(unittest.TestCase):
    visitor_id = UUID("1fa85f64-5717-4562-b3fc-2c963f66afa6")
    secret = "test-public-journal-secret-at-least-32-bytes"

    def setUp(self):
        self.store = JournalStore()
        self.connection_patch = patch("backend.journal.connect_database", return_value=self.store)
        self.database_patch = patch("backend.journal.database_url", return_value="postgresql://test")
        self.connection_patch.start()
        self.database_patch.start()
        self.previous_secret = backend_app.app.config.get("SECRET_KEY")
        backend_app.app.config["SECRET_KEY"] = self.secret
        self.client = backend_app.app.test_client()

    def tearDown(self):
        backend_app.app.config["SECRET_KEY"] = self.previous_secret
        self.database_patch.stop()
        self.connection_patch.stop()

    def record(self, event_key, event_type, reference_key=None):
        with backend_app.app.test_request_context("/api/progress", environ_base={"REMOTE_ADDR": "192.0.2.12"}):
            return record_event(
                self.store,
                self.visitor_id,
                event_key,
                event_type,
                reference_key=reference_key,
                secret_key=self.secret,
            )

    def test_timeline_is_shared_persistent_and_duplicate_safe(self):
        self.assertTrue(self.record("home:all-stars", "home_stars"))
        self.assertFalse(self.record("home:all-stars", "home_stars"))

        first_visitor = self.client.get("/api/public-journal")
        second_visitor = backend_app.app.test_client().get("/api/public-journal")
        after_refresh = self.client.get("/api/public-journal")
        self.assertEqual(first_visitor.status_code, 200)
        self.assertEqual(first_visitor.get_json(), second_visitor.get_json())
        self.assertEqual(first_visitor.get_json(), after_refresh.get_json())
        entries = first_visitor.get_json()["entries"]
        self.assertEqual(len(entries), 1)
        self.assertEqual(entries[0]["eventType"], "home_stars")
        self.assertNotIn("storyId", entries[0])
        self.assertEqual(entries[0]["title"], "Five stars gathered")
        self.assertEqual(entries[0]["category"], "Dream Garden")

    def test_private_wish_text_and_arbitrary_public_submissions_never_enter_feed(self):
        private_text = "My private wish is to move to 12 Moon Lane"
        self.assertTrue(self.record("garden-wish:private-77", "garden_wish"))
        response = self.client.get("/api/public-journal")
        self.assertNotIn(private_text, response.get_data(as_text=True))
        self.assertNotIn("private-77", response.get_data(as_text=True))
        self.assertEqual(response.get_json()["entries"][0]["eventType"], "garden_wish")
        self.assertNotIn("private-77", repr(self.store.rows))
        self.assertEqual(
            self.client.post("/api/public-journal", json={"message": private_text}).status_code,
            405,
        )
        self.assertFalse(self.record("forged", "custom_message", reference_key=private_text))
        self.assertEqual(len(self.client.get("/api/public-journal").get_json()["entries"]), 1)

    def test_only_real_milestone_transitions_create_home_atlas_and_story_entries(self):
        with backend_app.app.test_request_context("/api/progress", environ_base={"REMOTE_ADDR": "192.0.2.13"}):
            incomplete = {"collected": [0, 1, 2, 3], "puzzleComplete": False}
            _record_progress_journal_events(self.store, self.visitor_id, "home", incomplete, {"collected": [0, 1, 2, 3]}, self.secret)
            _record_progress_journal_events(self.store, self.visitor_id, "atlas", {"puzzleComplete": False}, {"puzzleComplete": True}, self.secret)
            _record_progress_journal_events(self.store, self.visitor_id, "bedtime", {"completed": []}, {
                "completed": ["missing-star"], "visited": ["star-start", "star-garden"],
            }, self.secret)
            _record_progress_journal_events(self.store, self.visitor_id, "bedtime", {"completed": []}, {
                "completed": ["music-box"], "visited": ["music-start", "music-rain"],
            }, self.secret)

        response = self.client.get("/api/public-journal")
        self.assertEqual(response.status_code, 200)
        entries = response.get_json()["entries"]
        messages = {entry["message"] for entry in entries}
        self.assertEqual(len(entries), 2)
        self.assertIn("A constellation was connected in the Dream Atlas.", messages)
        self.assertIn(
            "Pip helped a tiny fallen star find a gentle home among the sky, clouds, or garden.",
            messages,
        )
        self.assertNotIn("We reached the happy ending of The Sleeping Music Box together!", messages)
        story_entry = next(entry for entry in entries if entry["eventType"] == "story_complete")
        self.assertEqual(story_entry["storyId"], "missing-star")
        self.assertEqual(story_entry["title"], "Pip read Pip and the Missing Star to Anonymous Visitor")
        self.assertEqual(story_entry["visitorName"], "Anonymous Visitor")

    def test_story_events_require_allowlisted_story_ids(self):
        self.assertFalse(self.record("bedtime:unknown", "story_complete", "unknown"))
        self.assertEqual(self.client.get("/api/public-journal").get_json()["entries"], [])

    def test_lullaby_discoveries_are_recorded_as_distinct_events_and_never_use_home_stars(self):
        with backend_app.app.test_request_context("/api/progress", environ_base={"REMOTE_ADDR": "192.0.2.14"}):
            initial = {"version": 1, "bubbles": [], "deletedBubbles": [], "hiddenStarFound": False, "hiddenButterflyFound": False}
            partial_star = {"version": 1, "bubbles": [], "deletedBubbles": [], "hiddenStarFound": False, "hiddenButterflyFound": False}
            found_star = {"version": 1, "bubbles": [], "deletedBubbles": [], "hiddenStarFound": True, "hiddenButterflyFound": False}
            found_both = {"version": 1, "bubbles": [], "deletedBubbles": [], "hiddenStarFound": True, "hiddenButterflyFound": True}

            # Partial collection does not create a discovery event.
            _record_progress_journal_events(self.store, self.visitor_id, "lullaby", initial, partial_star, self.secret)
            self.assertEqual(self.client.get("/api/public-journal").get_json()["entries"], [])
            # Star discovery creates lullaby_hidden_star, never home_stars
            _record_progress_journal_events(self.store, self.visitor_id, "lullaby", initial, found_star, self.secret)
            # Duplicate save does not create duplicate event
            _record_progress_journal_events(self.store, self.visitor_id, "lullaby", found_star, found_star, self.secret)
            # Butterfly discovery creates lullaby_hidden_butterfly
            _record_progress_journal_events(self.store, self.visitor_id, "lullaby", found_star, found_both, self.secret)

        response = self.client.get("/api/public-journal")
        self.assertEqual(response.status_code, 200)
        entries = response.get_json()["entries"]
        self.assertEqual(len(entries), 2)
        event_types = [entry["eventType"] for entry in entries]
        self.assertIn("lullaby_hidden_star", event_types)
        self.assertIn("lullaby_hidden_butterfly", event_types)
        self.assertNotIn("home_stars", event_types)

        star_entry = next(entry for entry in entries if entry["eventType"] == "lullaby_hidden_star")
        self.assertEqual(star_entry["category"], "Lullaby Lab")
        self.assertEqual(star_entry["icon"], "✦")
        self.assertEqual(star_entry["title"], "Found the Hidden Stars")
        self.assertEqual(star_entry["message"], "Anonymous Visitor completed the hidden-star discovery in Lullaby Lab.")

        butterfly_entry = next(entry for entry in entries if entry["eventType"] == "lullaby_hidden_butterfly")
        self.assertEqual(butterfly_entry["category"], "Lullaby Lab")
        self.assertEqual(butterfly_entry["icon"], "🦋")
        self.assertEqual(butterfly_entry["title"], "Found the Hidden Butterflies")
        self.assertEqual(butterfly_entry["message"], "Anonymous Visitor completed the hidden-butterfly discovery in Lullaby Lab.")

    def test_atlas_puzzle_and_game_completed_are_separate_and_do_not_trigger_each_other(self):
        with backend_app.app.test_request_context("/api/progress", environ_base={"REMOTE_ADDR": "192.0.2.15"}):
            initial = {"version": 1, "discovered": ["lantern"], "puzzleComplete": False, "gameCompleted": False}
            started = {"version": 1, "discovered": ["lantern", "sail"], "puzzleComplete": False, "gameCompleted": False}
            # Merely selecting or starting does not create any events
            _record_progress_journal_events(self.store, self.visitor_id, "atlas", initial, started, self.secret)
            self.assertEqual(len(self.client.get("/api/public-journal").get_json()["entries"]), 0)

            # Completing puzzle records atlas_puzzle ONLY
            puzzle_done = {
                "version": 1,
                "discovered": ["lantern", "sail"],
                "puzzleComplete": True,
                "gameCompleted": False,
                "puzzleConstellation": "sail",
            }
            _record_progress_journal_events(self.store, self.visitor_id, "atlas", started, puzzle_done, self.secret)
            # Duplicate save does not create another event
            _record_progress_journal_events(self.store, self.visitor_id, "atlas", puzzle_done, puzzle_done, self.secret)

            # Completing full adventure records atlas_game_completed ONLY
            game_done = {"version": 1, "discovered": ["lantern", "sail"], "puzzleComplete": True, "gameCompleted": True}
            _record_progress_journal_events(self.store, self.visitor_id, "atlas", puzzle_done, game_done, self.secret)
            # Duplicate save does not create another event
            _record_progress_journal_events(self.store, self.visitor_id, "atlas", game_done, game_done, self.secret)

        response = self.client.get("/api/public-journal")
        self.assertEqual(response.status_code, 200)
        entries = response.get_json()["entries"]
        self.assertEqual(len(entries), 2)
        event_types = [entry["eventType"] for entry in entries]
        self.assertEqual(event_types, ["atlas_game_completed", "atlas_puzzle"])

        puzzle_event = next(e for e in entries if e["eventType"] == "atlas_puzzle")
        self.assertEqual(puzzle_event["category"], "Games")
        self.assertEqual(puzzle_event["title"], "Pip helped Anonymous Visitor connect The Moon-Sail")
        self.assertEqual(puzzle_event["message"], "Anonymous Visitor connected The Moon-Sail in the Dream Atlas.")
        self.assertEqual(puzzle_event["visitorName"], "Anonymous Visitor")

        game_event = next(e for e in entries if e["eventType"] == "atlas_game_completed")
        self.assertEqual(game_event["category"], "Games")
        self.assertEqual(
            game_event["message"],
            "Pip’s Wishbound Adventure reached its victory at the far end of the cloud path.",
        )
        self.assertEqual(
            game_event["title"],
            "Pip helped Anonymous Visitor complete the Dream Atlas adventure",
        )

    def test_historical_home_stars_records_remain_preserved_and_render_correctly(self):
        self.assertTrue(self.record("historical-entry-key", "home_stars"))
        response = self.client.get("/api/public-journal")
        self.assertEqual(response.status_code, 200)
        entry = next(e for e in response.get_json()["entries"] if e["eventType"] == "home_stars")
        self.assertEqual(entry["category"], "Dream Garden")
        self.assertEqual(entry["message"], "I found all five sparkling stars in the garden!")


if __name__ == "__main__":
    unittest.main()
