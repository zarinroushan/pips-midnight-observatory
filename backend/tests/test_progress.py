import os
import unittest
from unittest.mock import patch
from uuid import UUID

import psycopg

from backend import app as backend_app
from backend.progress import _merge_progress, _validated_progress


class FakeProgressConnection:
    def __init__(self):
        self.progress = {}
        self.fetchone_result = None
        self.fetchall_result = []

    def __enter__(self):
        return self

    def __exit__(self, *_args):
        return False

    def execute(self, query, params=()):
        query = " ".join(query.split())
        if query.startswith("SELECT revision, data FROM visitor_progress"):
            self.fetchone_result = self.progress.get((str(params[0]), params[1]))
        elif query.startswith("INSERT INTO visitor_progress"):
            visitor_id, feature, data = params
            key = (str(visitor_id), feature)
            if key in self.progress:
                self.fetchone_result = None
            else:
                self.progress[key] = (1, data.obj)
                self.fetchone_result = (1,)
        elif query.startswith("UPDATE visitor_progress"):
            data, visitor_id, feature, expected = params
            key = (str(visitor_id), feature)
            current = self.progress.get(key)
            if current and current[0] == expected:
                self.progress[key] = (expected + 1, data.obj)
                self.fetchone_result = (expected + 1,)
            else:
                self.fetchone_result = None
        elif query.startswith("SELECT p.id, p.name"):
            self.fetchall_result = [(1, "Verified Project", "Description from Atlas", "active", "Python")]
        elif query.startswith("SELECT state FROM garden_states"):
            self.fetchone_result = ( {
                "plots": [{"seed": "moonblush", "stage": 2}],
                "creatures": ["moth"], "fulfilled": ["moth"],
            }, )
        elif query.startswith("SELECT feature_key, data FROM visitor_progress"):
            self.fetchall_result = [
                ("home", {"version": 1, "collected": [0, 1], "collectedButterflies": []}),
                ("atlas", {"version": 1, "discovered": ["lantern"], "puzzleComplete": True}),
            ]
        elif query.startswith("SAVEPOINT") or query.startswith("RELEASE SAVEPOINT") or query.startswith("ROLLBACK"):
            self.fetchone_result = None
        elif query.startswith("INSERT INTO public_journal_events"):
            self.fetchone_result = (1,)
        else:
            raise AssertionError(f"Unexpected progress query: {query}")
        return self

    def fetchone(self):
        return self.fetchone_result

    def fetchall(self):
        return self.fetchall_result


class VisitorProgressApiTests(unittest.TestCase):
    visitor_id = "1fa85f64-5717-4562-b3fc-2c963f66afa6"

    def setUp(self):
        self.client = backend_app.app.test_client()
        self.connection = FakeProgressConnection()
        self.connect_patch = patch("backend.database.psycopg.connect", return_value=self.connection)
        self.connect_patch.start()
        self.env_patch = patch.dict(os.environ, {"DATABASE_URL": "postgresql://test"})
        self.env_patch.start()

    def tearDown(self):
        self.env_patch.stop()
        self.connect_patch.stop()

    def test_progress_load_save_and_revision_conflict(self):
        url = f"/api/progress/{self.visitor_id}/home"
        initial = self.client.get(url)
        self.assertEqual(initial.status_code, 200)
        self.assertEqual(initial.get_json(), {"data": None, "revision": 0})
        data = {"version": 1, "collected": [0], "collectedButterflies": []}
        saved = self.client.put(url, json={"revision": 0, "data": data})
        self.assertEqual(saved.status_code, 200)
        self.assertEqual(saved.get_json()["revision"], 1)
        loaded = self.client.get(url)
        self.assertEqual(loaded.get_json(), {"data": data, "revision": 1})
        conflict = self.client.put(url, json={
            "revision": 0,
            "data": {"version": 1, "collected": [1], "collectedButterflies": [0]},
        })
        self.assertEqual(conflict.status_code, 409)
        self.assertEqual(conflict.get_json()["revision"], 1)
        self.assertEqual(conflict.get_json()["data"]["collected"], [0, 1])

    def test_progress_rejects_unknown_features_and_invalid_values(self):
        self.assertEqual(self.client.get(f"/api/progress/{self.visitor_id}/secrets").status_code, 404)
        invalid = self.client.put(
            f"/api/progress/{self.visitor_id}/home",
            json={"revision": 0, "data": {"version": 1, "collected": [99], "collectedButterflies": []}},
        )
        self.assertEqual(invalid.status_code, 400)

    def test_bedtime_progress_accepts_current_story_and_legacy_scenes(self):
        scenes = {
            "star-start", "star-hill", "star-cloud", "star-home", "star-garden", "star-nightlight",
            "lumi-start", "lumi-question", "lumi-meadow", "lumi-seedlings", "lumi-meadow-ending", "lumi-seedlings-ending",
            "music-start", "music-clue", "music-rain", "music-hum", "music-rain-ending", "music-hum-ending",
            "lantern-start", "lantern-crossroads", "lantern-fireflies", "lantern-call", "lantern-friend", "lantern-ending",
            "lights-start", "lights-challenge", "lights-circle", "lights-rhythm", "lights-circle-ending", "lights-rhythm-ending",
            "ember-start", "ember-choice", "ember-flowers", "ember-pond", "ember-flower-ending", "ember-pond-ending",
            "nova-start", "nova-choice", "nova-stones", "nova-rest", "nova-stones-ending", "nova-rest-ending",
            "mochi-start", "mochi-choice", "mochi-willow", "mochi-flowers", "mochi-willow-ending", "mochi-flowers-ending",
            "pippa-start", "pippa-choice", "pippa-petals", "pippa-bellflower", "pippa-petals-ending", "pippa-bellflower-ending",
        }
        legacy_scenes = {"opening", "hill", "cloud", "skyEnding", "gardenEnding", "nightlightEnding"}
        for scene in scenes | legacy_scenes:
            with self.subTest(scene=scene):
                progress = _validated_progress(
                    "bedtime",
                    {"version": 1, "scene": scene, "visited": [scene]},
                )
                self.assertEqual(progress, {"version": 1, "scene": scene, "visited": [scene], "adventure": None, "completed": []})

    def test_bedtime_progress_validates_and_merges_completed_adventures(self):
        current = _validated_progress("bedtime", {
            "version": 1, "scene": "lantern-friend", "visited": ["lantern-start", "lantern-friend"],
            "adventure": "lantern-path", "completed": ["missing-star"],
        })
        incoming = _validated_progress("bedtime", {
            "version": 1, "scene": "lights-rhythm", "visited": ["lights-start", "lights-rhythm"],
            "adventure": "little-lights", "completed": ["little-lights", "missing-star"],
        })
        self.assertIsNotNone(current)
        self.assertIsNotNone(incoming)
        merged = _merge_progress("bedtime", current, incoming)
        self.assertEqual(merged["adventure"], "little-lights")
        self.assertEqual(set(merged["completed"]), {"missing-star", "little-lights"})
        self.assertIn("lantern-friend", merged["visited"])
        self.assertIn("lights-rhythm", merged["visited"])
        self.assertIsNone(_validated_progress("bedtime", {
            "version": 1, "scene": "lights-start", "visited": ["lights-start"], "adventure": "unknown-story",
        }))

    def test_story_context_uses_saved_project_skills_and_visitor_achievements(self):
        response = self.client.get(f"/api/stories/context/{self.visitor_id}")
        self.assertEqual(response.status_code, 200)
        context = response.get_json()
        self.assertEqual(context["projects"][0]["description"], "Description from Atlas")
        self.assertEqual(context["projects"][0]["skills"], ["Python"])
        labels = {item["label"] for item in context["achievements"]}
        self.assertIn("Collected 2 of 5 dream stars.", labels)
        self.assertIn("Completed the Sleepy Fox star puzzle.", labels)
        self.assertIn("Fulfilled 1 garden wishes.", labels)

    def test_lullaby_progress_validation_merging_and_discoveries(self):
        # Validates without discovery flags (backward compatible)
        base = _validated_progress("lullaby", {"version": 1, "bubbles": ["sweet dream"], "deletedBubbles": []})
        self.assertIsNotNone(base)
        self.assertFalse(base["hiddenStarFound"])
        self.assertFalse(base["hiddenButterflyFound"])
        self.assertEqual(base["bubbles"], ["sweet dream"])

        # Validates with discovery flags
        discovered = _validated_progress("lullaby", {
            "version": 1,
            "bubbles": ["sweet dream"],
            "deletedBubbles": [],
            "hiddenStarFound": True,
            "hiddenButterflyFound": True,
        })
        self.assertIsNotNone(discovered)
        self.assertTrue(discovered["hiddenStarFound"])
        self.assertTrue(discovered["hiddenButterflyFound"])

        # Rejects non-boolean discovery flags
        self.assertIsNone(_validated_progress("lullaby", {
            "version": 1,
            "bubbles": [],
            "deletedBubbles": [],
            "hiddenStarFound": "yes",
        }))

        # Merging preserves discovery state across sessions
        merged = _merge_progress("lullaby", base, discovered)
        self.assertTrue(merged["hiddenStarFound"])
        self.assertTrue(merged["hiddenButterflyFound"])

        # Saving and loading via API
        url = f"/api/progress/{self.visitor_id}/lullaby"
        put_response = self.client.put(url, json={"revision": 0, "data": discovered})
        self.assertEqual(put_response.status_code, 200)
        self.assertEqual(put_response.get_json()["revision"], 1)

        get_response = self.client.get(url)
        self.assertEqual(get_response.status_code, 200)
        loaded_data = get_response.get_json()["data"]
        self.assertTrue(loaded_data["hiddenStarFound"])
        self.assertTrue(loaded_data["hiddenButterflyFound"])

    def test_missing_progress_table_returns_safe_migration_error(self):
        with patch("backend.database.psycopg.connect", side_effect=psycopg.errors.UndefinedTable("private table detail")):
            response = self.client.get(f"/api/progress/{self.visitor_id}/home")
        self.assertEqual(response.status_code, 503)
        self.assertNotIn("private table detail", response.get_data(as_text=True))


if __name__ == "__main__":
    unittest.main()
