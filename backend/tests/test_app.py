import json
import os
import unittest
from datetime import datetime, timezone
from unittest.mock import patch

import psycopg

from backend import app as backend_app


class FakeConnection:
    def __init__(self, state_store, guestbook_rows=None, guestbook_insert=None):
        self.state_store = state_store
        self.guestbook_rows = guestbook_rows or []
        self.guestbook_insert = guestbook_insert or (
            1,
            "pending",
            datetime(2026, 1, 1, tzinfo=timezone.utc),
        )
        self.last_query = ""
        self.tables = {
            "guestbook_entries", "garden_states", "atlas_skills", "atlas_projects",
            "atlas_skill_evidence", "atlas_project_skills", "visitor_progress",
            "public_journal_events",
        }
        self.pending_guestbook = {77: "pending"}
        self.journal_dedupe_keys = set()

    def __enter__(self):
        return self

    def __exit__(self, _exc_type, _exc, _traceback):
        return False

    def execute(self, query, params=()):
        self.last_query = " ".join(query.split())
        if self.last_query.startswith(("SAVEPOINT", "RELEASE SAVEPOINT", "ROLLBACK TO SAVEPOINT")):
            self.fetchone_result = None
            return self
        if self.last_query.startswith("INSERT INTO public_journal_events"):
            _event_type, _reference_key, dedupe_key = params
            if dedupe_key in self.journal_dedupe_keys:
                self.fetchone_result = None
            else:
                self.journal_dedupe_keys.add(dedupe_key)
                self.fetchone_result = (len(self.journal_dedupe_keys),)
            return self
        if self.last_query.startswith("SELECT table_name FROM information_schema.tables"):
            self.fetchall_result = [(name,) for name in sorted(self.tables.intersection(params[0]))]
            return self
        if self.last_query.startswith("SELECT 1 FROM guestbook_entries"):
            self.fetchone_result = (1,) if params[0] in self.pending_guestbook else None
            return self
        if self.last_query.startswith("SELECT 1"):
            return self
        if self.last_query.startswith("SELECT id, display_name"):
            self.params = params
            requested_status = params[0]
            self.fetchall_result = [
                row[:4]
                for row in self.guestbook_rows
                if (row[4] if len(row) > 4 else "approved") == requested_status
            ]
            return self
        if self.last_query.startswith("INSERT INTO guestbook_entries"):
            self.insert_params = params
            self.fetchone_result = self.guestbook_insert
            self.guestbook_rows.append((
                self.guestbook_insert[0],
                params[0],
                params[1],
                self.guestbook_insert[2],
                params[2],
            ))
            return self
        if self.last_query.startswith("UPDATE guestbook_entries SET status"):
            status, entry_id = params
            if self.pending_guestbook.get(entry_id) == "pending":
                self.pending_guestbook[entry_id] = status
                self.fetchone_result = (
                    entry_id, status, datetime(2026, 1, 3, tzinfo=timezone.utc),
                )
            else:
                self.fetchone_result = None
            return self
        if self.last_query.startswith("SELECT revision, state"):
            self.fetchone_result = self.state_store.get(str(params[0]))
            return self
        if self.last_query.startswith("SELECT wish->>'creature' AS creature, COUNT(*)"):
            allowed_creatures = set(params[0])
            counts = {}
            for _, state in self.state_store.values():
                for wish in state.get("dreamJournal", []):
                    creature = wish.get("creature")
                    if creature in allowed_creatures:
                        counts[creature] = counts.get(creature, 0) + 1
            self.fetchall_result = sorted(counts.items())
            return self
        if self.last_query.startswith("INSERT INTO garden_states"):
            visitor_id, state = params
            key = str(visitor_id)
            if key in self.state_store:
                self.fetchone_result = None
            else:
                self.state_store[key] = (1, state.obj)
                self.fetchone_result = (1,)
            return self
        if self.last_query.startswith("UPDATE garden_states"):
            state, visitor_id, expected_revision = params
            key = str(visitor_id)
            current = self.state_store.get(key)
            if current and current[0] == expected_revision:
                self.state_store[key] = (current[0] + 1, state.obj)
                self.fetchone_result = (current[0] + 1,)
            else:
                self.fetchone_result = None
            return self
        raise AssertionError(f"Unexpected query: {self.last_query}")

    def fetchone(self):
        return getattr(self, "fetchone_result", None)

    def fetchall(self):
        return getattr(self, "fetchall_result", [])


class GuestbookAndGardenApiTests(unittest.TestCase):
    origin = "http://127.0.0.1:5500"
    empty_state = {
        "version": 1,
        "plots": [None] * 5,
        "creatures": [],
        "plotOwners": [None] * 5,
        "fulfilled": [],
    }

    def setUp(self):
        self.previous_secret = backend_app.app.config.get("SECRET_KEY")
        backend_app.app.config["SECRET_KEY"] = "test-only-session-secret-at-least-32-bytes"
        self.state_store = {}
        self.guestbook_rows = [
            (
                2,
                "Approved Dreamer",
                "<script>not markup</script>",
                datetime(2026, 1, 2, tzinfo=timezone.utc),
            ),
        ]
        self.connection = FakeConnection(
            self.state_store,
            self.guestbook_rows,
        )
        self.connect_patch = patch(
            "backend.database.psycopg.connect",
            return_value=self.connection,
        )
        self.connect_patch.start()
        self.env_patch = patch.dict(
            os.environ,
            {
                "DATABASE_URL": "postgresql://test",
                "CORS_ALLOWED_ORIGINS": f"{self.origin},http://localhost:5500",
            },
        )
        self.env_patch.start()
        self.client = backend_app.app.test_client()
        self.client.get("/api/garden/session", headers={"Origin": self.origin})
        backend_app.guestbook_requests.clear()

    def tearDown(self):
        self.env_patch.stop()
        self.connect_patch.stop()
        backend_app.app.config["SECRET_KEY"] = self.previous_secret

    def save_state(self, client, revision, state):
        return client.put(
            "/api/garden/state",
            json={"revision": revision, "state": state},
            headers={"Origin": self.origin},
        )

    def test_health_and_readiness(self):
        self.assertEqual(
            self.client.get("/api/health").get_json(),
            {"status": "ok", "service": "dear-pip-api"},
        )
        self.assertEqual(self.client.get("/api/health").status_code, 200)
        readiness = self.client.get("/api/ready")
        self.assertEqual(readiness.status_code, 200)
        self.assertEqual(readiness.get_json()["schema"], "ready")

    def test_readiness_distinguishes_missing_tables_from_connection_failure(self):
        self.connection.tables.remove("atlas_projects")
        missing = self.client.get("/api/ready")
        self.assertEqual(missing.status_code, 503)
        self.assertEqual(missing.get_json()["database"], "available")
        self.assertEqual(missing.get_json()["schema"], "missing_tables")
        self.assertEqual(missing.get_json()["missing_tables"], ["atlas_projects"])
        with patch("backend.database.psycopg.connect", side_effect=psycopg.OperationalError("hidden")):
            unavailable = self.client.get("/api/ready")
        self.assertEqual(unavailable.status_code, 503)
        self.assertEqual(unavailable.get_json()["database"], "unavailable")

    def test_guestbook_requires_valid_json_and_lengths(self):
        self.assertEqual(self.client.post("/api/guestbook", data="{}").status_code, 400)
        self.assertEqual(
            self.client.post("/api/guestbook", json={"dream_message": " "}).status_code,
            400,
        )
        self.assertEqual(
            self.client.post(
                "/api/guestbook",
                json={"dream_message": "x" * 1001},
            ).status_code,
            400,
        )
        self.assertEqual(
            self.client.post(
                "/api/guestbook",
                json={"display_name": "x" * 61, "dream_message": "A dream"},
            ).status_code,
            400,
        )
        self.assertEqual(
            self.client.post(
                "/api/guestbook",
                json={"dream_message": "A dream", "unexpected": "value"},
            ).status_code,
            400,
        )

    def test_guestbook_submission_is_published_immediately_and_parameterized(self):
        response = self.client.post(
            "/api/guestbook",
            json={
                "display_name": "Test Dreamer",
                "dream_message": "I wish Pip could build a tiny star-catching machine.",
            },
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.get_json()["entry"]["status"], "approved")
        self.assertEqual(
            self.connection.insert_params,
            (
                "Test Dreamer",
                "I wish Pip could build a tiny star-catching machine.",
                "approved",
            ),
        )
        self.assertIn("VALUES (%s, %s, %s)", self.connection.last_query)

    def test_guestbook_empty_name_is_anonymous_and_published(self):
        response = self.client.post(
            "/api/guestbook",
            json={"display_name": "  ", "dream_message": "A small, hopeful dream"},
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(self.connection.insert_params[0], "Anonymous")
        self.assertEqual(self.connection.insert_params[2], "approved")
        self.assertEqual(response.get_json()["entry"]["status"], "approved")
        public_entries = self.client.get("/api/guestbook").get_json()["entries"]
        self.assertNotIn(response.get_json()["entry"]["id"], [entry["id"] for entry in public_entries])

    def test_guestbook_lists_public_entries_and_bounds_limit(self):
        response = self.client.get("/api/guestbook?limit=2")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()["entries"][0]["display_name"], "Approved Dreamer")
        self.assertEqual(self.connection.params, ("approved", 2))
        self.assertIn("WHERE status = %s", self.connection.last_query)
        self.assertIn("ORDER BY created_at DESC, id DESC", self.connection.last_query)
        self.assertEqual(self.client.get("/api/guestbook?limit=101").status_code, 400)

    def test_production_guestbook_preflight_uses_exact_credentialed_origin(self):
        origin = "https://dear-pip-pearl.vercel.app"
        with patch.dict(os.environ, {"CORS_ALLOWED_ORIGINS": origin}):
            response = self.client.options(
                "/api/guestbook",
                headers={
                    "Origin": origin,
                    "Access-Control-Request-Method": "POST",
                    "Access-Control-Request-Headers": "content-type",
                },
            )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.headers["Access-Control-Allow-Origin"], origin)
        self.assertEqual(response.headers["Access-Control-Allow-Credentials"], "true")
        self.assertIn("POST", response.headers["Access-Control-Allow-Methods"])
        self.assertIn("Content-Type", response.headers["Access-Control-Allow-Headers"])

    def test_workspace_preview_origin_is_allowed_by_local_defaults(self):
        origin = "http://127.0.0.1:8766"
        with patch.object(backend_app, "production_mode", False), patch.dict(
            os.environ, {}, clear=True
        ):
            response = self.client.get("/api/health", headers={"Origin": origin})
        self.assertEqual(response.headers["Access-Control-Allow-Origin"], origin)

    def test_guestbook_moderation_requires_owner_and_only_transitions_pending(self):
        token = "guestbook-review-test-token-that-is-long-enough"
        with patch.dict(os.environ, {"ATLAS_ADMIN_TOKEN": token}):
            denied = self.client.get("/api/guestbook/pending")
            pending = self.client.get("/api/guestbook/pending", headers={"X-Admin-Token": token})
            invalid = self.client.patch(
                "/api/guestbook/77/moderation", json={"status": []},
                headers={"X-Admin-Token": token},
            )
            approved = self.client.patch(
                "/api/guestbook/77/moderation", json={"status": "approved"},
                headers={"X-Admin-Token": token},
            )
            repeated = self.client.patch(
                "/api/guestbook/77/moderation", json={"status": "rejected"},
                headers={"X-Admin-Token": token},
            )
        self.assertEqual(denied.status_code, 401)
        self.assertEqual(pending.status_code, 200)
        self.assertEqual(invalid.status_code, 400)
        self.assertEqual(approved.get_json()["entry"]["status"], "approved")
        self.assertEqual(repeated.status_code, 409)

    def test_guestbook_rate_limited(self):
        for _ in range(backend_app.GUESTBOOK_RATE_LIMIT):
            response = self.client.post("/api/guestbook", json={"dream_message": "A dream"})
            self.assertEqual(response.status_code, 201)
        response = self.client.post("/api/guestbook", json={"dream_message": "One too many"})
        self.assertEqual(response.status_code, 429)

    def test_missing_guestbook_table_returns_safe_setup_message(self):
        with patch(
            "backend.database.psycopg.connect",
            side_effect=psycopg.errors.UndefinedTable("private schema detail"),
        ):
            response = self.client.get("/api/guestbook")
        self.assertEqual(response.status_code, 503)
        self.assertNotIn("private", response.get_data(as_text=True))

    def test_guestbook_database_failures_are_safe(self):
        with patch(
            "backend.database.psycopg.connect",
            side_effect=psycopg.OperationalError("private connection detail"),
        ):
            listing = self.client.get("/api/guestbook")
            submission = self.client.post(
                "/api/guestbook",
                json={"dream_message": "A temporary test dream"},
            )
        self.assertEqual(listing.status_code, 503)
        self.assertEqual(submission.status_code, 503)
        self.assertNotIn("private", listing.get_data(as_text=True))
        self.assertNotIn("private", submission.get_data(as_text=True))

    def test_garden_state_load_save_and_revision_conflict(self):
        self.assertEqual(
            self.client.get("/api/garden/state").get_json(),
            {"state": None, "revision": 0},
        )
        save = self.save_state(self.client, 0, self.empty_state)
        self.assertEqual(save.status_code, 200)
        self.assertEqual(save.get_json()["revision"], 1)
        loaded = self.client.get("/api/garden/state")
        self.assertEqual(loaded.get_json()["state"], self.empty_state)
        conflict = self.save_state(self.client, 0, self.empty_state)
        self.assertEqual(conflict.status_code, 409)
        self.assertEqual(conflict.get_json()["revision"], 1)

    def test_garden_creature_layout_is_persisted_and_validated(self):
        state = {
            **self.empty_state,
            "creatureLayout": {
                "moth": {"x": 31.5, "y": 42, "scale": 1.2},
                "fox": {"x": 84, "y": 35, "scale": 0.8},
            },
        }
        saved = self.save_state(self.client, 0, state)
        self.assertEqual(saved.status_code, 200)
        self.assertEqual(self.client.get("/api/garden/state").get_json()["state"], state)

        invalid_layouts = (
            {"moth": {"x": -1, "y": 42, "scale": 1}},
            {"moth": {"x": 31, "y": 42, "scale": 1.6}},
            {"sprite": {"x": 31, "y": 42, "scale": 1}},
            {"moth": {"x": True, "y": 42, "scale": 1}},
        )
        for layout in invalid_layouts:
            with self.subTest(layout=layout):
                response = self.save_state(
                    self.client,
                    1,
                    {**self.empty_state, "creatureLayout": layout},
                )
                self.assertEqual(response.status_code, 400)

    def test_flower_bloom_does_not_reject_or_fulfill_legacy_wish_flags(self):
        legacy_state = {
            **self.empty_state,
            "fulfilled": ["moth"],
            "plots": [{"seed": "moonblush", "stage": 2}, None, None, None, None],
            "creatures": ["moth"],
            "plotOwners": ["moth", None, None, None, None],
        }
        saved = self.save_state(self.client, 0, legacy_state)
        self.assertEqual(saved.status_code, 200)
        restored = self.client.get("/api/garden/state").get_json()["state"]
        self.assertEqual(restored["fulfilled"], ["moth"])
        self.assertNotIn("fulfilledWishes", restored)

    def test_flower_growth_and_garden_reset_do_not_mark_wishes_fulfilled(self):
        active = {
            **self.empty_state,
            "plots": [{"seed": "moonblush", "stage": 2}, None, None, None, None],
            "creatures": ["moth"],
            "plotOwners": ["moth", None, None, None, None],
            "dreamJournal": [{
                "id": "still-active",
                "wish": "Spend more time making art.",
                "creature": "moth",
                "createdAt": "2026-01-01T00:00:00Z",
            }],
        }
        self.assertEqual(self.save_state(self.client, 0, active).status_code, 200)
        bloomed = self.client.get("/api/garden/state").get_json()["state"]
        self.assertEqual(bloomed["dreamJournal"][0]["id"], "still-active")
        self.assertNotIn("fulfilledWishes", bloomed)

        reset = self.save_state(self.client, 1, self.empty_state)
        self.assertEqual(reset.status_code, 200)
        cleared = self.client.get("/api/garden/state").get_json()["state"]
        self.assertEqual(cleared["fulfilled"], [])
        self.assertEqual(cleared.get("fulfilledWishes", []), [])
        self.assertEqual(cleared.get("dreamJournal", []), [])

    def test_fulfillment_is_explicit_specific_visitor_scoped_and_preserves_other_wishes(self):
        state = {
            **self.empty_state,
            "fulfilled": ["moth"],
            "dreamJournal": [
                {
                    "id": "wish-one",
                    "wish": "Finish my first story.",
                    "creature": "moth",
                    "createdAt": "2026-01-01T00:00:00Z",
                },
                {
                    "id": "wish-two",
                    "wish": "Learn to bake bread.",
                    "creature": "rabbit",
                    "createdAt": "2026-01-02T00:00:00Z",
                },
            ],
        }
        self.assertEqual(self.save_state(self.client, 0, state).status_code, 200)
        response = self.client.post(
            "/api/garden/wishes/wish-one/fulfill",
            json={"revision": 1},
            headers={"Origin": self.origin},
        )
        self.assertEqual(response.status_code, 200)
        result = response.get_json()
        self.assertEqual(result["revision"], 2)
        self.assertEqual([wish["id"] for wish in result["state"]["dreamJournal"]], ["wish-two"])
        fulfilled = result["state"]["fulfilledWishes"]
        self.assertEqual(len(fulfilled), 1)
        self.assertEqual(fulfilled[0]["id"], "wish-one")
        self.assertEqual(fulfilled[0]["wish"], "Finish my first story.")
        fulfilled_at = datetime.fromisoformat(fulfilled[0]["fulfilledAt"].replace("Z", "+00:00"))
        self.assertGreater(fulfilled_at, datetime.fromisoformat("2026-01-01T00:00:00+00:00"))
        self.assertEqual(result["state"]["fulfilled"], ["moth"])

        old_client_state = {key: value for key, value in result["state"].items() if key != "fulfilledWishes"}
        old_client_state["dreamJournal"] = []
        preserved = self.save_state(self.client, 2, old_client_state)
        self.assertEqual(preserved.status_code, 200)
        reread = self.client.get("/api/garden/state").get_json()["state"]
        self.assertEqual([wish["id"] for wish in reread["fulfilledWishes"]], ["wish-one"])
        self.assertEqual(reread["dreamJournal"], [])

        other = backend_app.app.test_client()
        other.get("/api/garden/session", headers={"Origin": self.origin})
        hidden = other.post(
            "/api/garden/wishes/wish-two/fulfill",
            json={"revision": 1},
            headers={"Origin": self.origin},
        )
        self.assertEqual(hidden.status_code, 404)
        self.assertEqual(other.get("/api/garden/state").get_json()["state"], None)

    def test_fulfillment_rejects_invalid_targets_stale_revision_and_untrusted_origin(self):
        state = {
            **self.empty_state,
            "dreamJournal": [{
                "id": "active-wish",
                "wish": "Take a walk under the stars.",
                "creature": "bird",
                "createdAt": "2026-01-03T00:00:00Z",
            }],
        }
        self.assertEqual(self.save_state(self.client, 0, state).status_code, 200)
        missing = self.client.post(
            "/api/garden/wishes/other-wish/fulfill",
            json={"revision": 1},
            headers={"Origin": self.origin},
        )
        stale = self.client.post(
            "/api/garden/wishes/active-wish/fulfill",
            json={"revision": 0},
            headers={"Origin": self.origin},
        )
        untrusted = self.client.post(
            "/api/garden/wishes/active-wish/fulfill",
            json={"revision": 1},
        )
        self.assertEqual(missing.status_code, 404)
        self.assertEqual(stale.status_code, 409)
        self.assertEqual(untrusted.status_code, 403)

    def test_regular_state_save_cannot_invent_fulfilled_wishes(self):
        forged = {
            **self.empty_state,
            "fulfilledWishes": [{
                "id": "never-saved",
                "wish": "Claim this happened.",
                "creature": "fox",
                "createdAt": "2026-01-01T00:00:00Z",
                "fulfilledAt": "2026-01-02T00:00:00Z",
            }],
        }
        response = self.save_state(self.client, 0, forged)
        self.assertEqual(response.status_code, 400)

    def test_legacy_sprite_wish_remains_readable_without_public_active_count(self):
        legacy_state = {
            **self.empty_state,
            "creatures": ["sprite"],
            "dreamJournal": [{
                "id": "legacy-sprite-wish",
                "wish": "A wish saved before the garden friends changed.",
                "creature": "sprite",
                "createdAt": "2026-01-01T00:00:00Z",
            }],
        }
        self.assertEqual(self.save_state(self.client, 0, legacy_state).status_code, 200)
        restored = self.client.get("/api/garden/state").get_json()["state"]
        self.assertEqual(restored["dreamJournal"], legacy_state["dreamJournal"])
        self.assertEqual(restored["creatures"], ["sprite"])
        self.assertNotIn("sprite", self.client.get("/api/garden/wish-counts").get_json()["counts"])

    def test_private_garden_requires_session_and_ignores_client_supplied_ids(self):
        anonymous = backend_app.app.test_client()
        self.assertEqual(anonymous.get("/api/garden/state").status_code, 401)
        private_state = {**self.empty_state, "dreamJournal": [{
            "id": "private-wish",
            "wish": "Only my session should see this.",
            "creature": "moth",
            "createdAt": "2026-01-01T00:00:00Z",
        }]}
        self.assertEqual(self.save_state(self.client, 0, private_state).status_code, 200)

        other = backend_app.app.test_client()
        other.get("/api/garden/session", headers={"Origin": self.origin})
        self.assertEqual(
            other.get("/api/garden/state").get_json(),
            {"state": None, "revision": 0},
        )
        self.assertEqual(
            other.get("/api/garden/state/1fa85f64-5717-4562-b3fc-2c963f66afa6").status_code,
            404,
        )
        self.assertEqual(
            other.put(
                "/api/garden/state",
                json={"revision": 0, "state": self.empty_state, "visitor_id": "1fa85f64-5717-4562-b3fc-2c963f66afa6"},
                headers={"Origin": self.origin},
            ).status_code,
            400,
        )
        self.assertEqual(
            self.client.get("/api/garden/state").get_json()["state"]["dreamJournal"][0]["wish"],
            "Only my session should see this.",
        )

    def test_garden_reset_is_scoped_to_the_current_session(self):
        first = {**self.empty_state, "dreamJournal": [{
            "id": "first-wish", "wish": "First private wish", "creature": "moth",
            "createdAt": "2026-01-01T00:00:00Z",
        }]}
        second = {**self.empty_state, "dreamJournal": [{
            "id": "second-wish", "wish": "Second private wish", "creature": "fox",
            "createdAt": "2026-01-02T00:00:00Z",
        }]}
        other = backend_app.app.test_client()
        other.get("/api/garden/session", headers={"Origin": self.origin})
        self.assertEqual(self.save_state(self.client, 0, first).status_code, 200)
        self.assertEqual(self.save_state(other, 0, second).status_code, 200)
        self.assertEqual(self.save_state(self.client, 1, self.empty_state).status_code, 200)
        self.assertEqual(
            self.client.get("/api/garden/state").get_json()["state"].get("dreamJournal", []),
            [],
        )
        self.assertEqual(
            other.get("/api/garden/state").get_json()["state"]["dreamJournal"][0]["id"],
            "second-wish",
        )

    def test_garden_state_rejects_invalid_values_and_oversize(self):
        invalid = json.loads(json.dumps(self.empty_state))
        invalid["plots"][0] = {"seed": "<script>", "stage": 0}
        self.assertEqual(
            self.save_state(self.client, 0, invalid).status_code,
            400,
        )
        self.assertEqual(
            self.client.put(
                "/api/garden/state",
                data="x" * 13_000,
                content_type="application/json",
                headers={"Origin": self.origin},
            ).status_code,
            413,
        )
        invalid["plots"][0] = None
        invalid["version"] = True
        self.assertEqual(
            self.save_state(self.client, 0, invalid).status_code,
            400,
        )

    def test_garden_wish_counts_are_aggregated_without_exposing_wish_text(self):
        second_visitor = backend_app.app.test_client()
        second_visitor.get("/api/garden/session", headers={"Origin": self.origin})
        first_state = {
            **self.empty_state,
            "dreamJournal": [
                {
                    "id": "first-wish",
                    "wish": "A private first wish",
                    "creature": "moth",
                    "createdAt": "2026-01-01T00:00:00Z",
                },
                {
                    "id": "second-wish",
                    "wish": "Another private wish",
                    "creature": "moth",
                    "createdAt": "2026-01-02T00:00:00Z",
                },
            ],
        }
        second_state = {
            **self.empty_state,
            "dreamJournal": [
                {
                    "id": "third-wish",
                    "wish": "A third private wish",
                    "creature": "fox",
                    "createdAt": "2026-01-03T00:00:00Z",
                },
            ],
        }
        self.save_state(self.client, 0, first_state)
        self.save_state(second_visitor, 0, second_state)

        response = self.client.get("/api/garden/wish-counts")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()["counts"]["moth"], 2)
        self.assertEqual(response.get_json()["counts"]["fox"], 1)
        self.assertEqual(response.get_json()["counts"]["snail"], 0)
        self.assertNotIn("private", response.get_data(as_text=True))

        self.save_state(self.client, 1, self.empty_state)
        updated = self.client.get("/api/garden/wish-counts").get_json()["counts"]
        self.assertEqual(updated["moth"], 0)
        self.assertEqual(updated["fox"], 1)

    def test_database_failure_is_safe(self):
        with patch(
            "backend.database.psycopg.connect",
            side_effect=psycopg.OperationalError("private connection detail"),
        ):
            response = self.client.get("/api/garden/state")
        self.assertEqual(response.status_code, 503)
        self.assertNotIn("private", response.get_data(as_text=True))

    def test_missing_garden_schema_returns_safe_setup_message(self):
        with patch(
            "backend.database.psycopg.connect",
            side_effect=psycopg.errors.UndefinedTable("private schema detail"),
        ):
            response = self.client.get("/api/garden/state")
        self.assertEqual(response.status_code, 503)
        self.assertNotIn("private", response.get_data(as_text=True))

    def test_cors_only_echoes_allowed_origins(self):
        with patch.dict(
            os.environ,
            {"CORS_ALLOWED_ORIGINS": "http://localhost:5500,https://nursery.example"},
        ):
            production = self.client.get(
                "/api/health",
                headers={"Origin": "https://nursery.example"},
            )
        allowed = self.client.get(
            "/api/health",
            headers={"Origin": "http://localhost:5500"},
        )
        preflight = self.client.options(
            "/api/garden/state",
            headers={
                "Origin": "http://localhost:5500",
                "Access-Control-Request-Method": "PUT",
                "Access-Control-Request-Headers": "content-type",
            },
        )
        denied = self.client.get(
            "/api/health",
            headers={"Origin": "https://untrusted.example"},
        )
        self.assertEqual(allowed.headers.get("Access-Control-Allow-Origin"), "http://localhost:5500")
        self.assertEqual(production.headers.get("Access-Control-Allow-Origin"), "https://nursery.example")
        self.assertEqual(production.headers.get("Access-Control-Allow-Credentials"), "true")
        self.assertEqual(preflight.headers.get("Access-Control-Allow-Origin"), "http://localhost:5500")
        self.assertIn("PUT", preflight.headers.get("Access-Control-Allow-Methods", ""))
        self.assertIsNone(denied.headers.get("Access-Control-Allow-Origin"))

    def test_garden_writes_require_a_trusted_origin(self):
        response = self.client.put(
            "/api/garden/state",
            json={"revision": 0, "state": self.empty_state},
            headers={"Origin": "https://untrusted.example"},
        )
        self.assertEqual(response.status_code, 403)

    def test_session_cookie_is_http_only_and_configuration_requires_strong_secret(self):
        response = self.client.get("/api/garden/session", headers={"Origin": self.origin})
        self.assertIn("HttpOnly", response.headers["Set-Cookie"])
        self.assertIn("SameSite=Lax", response.headers["Set-Cookie"])
        backend_app.app.config["SECRET_KEY"] = "short"
        unavailable = self.client.get("/api/garden/session")
        self.assertEqual(unavailable.status_code, 503)

    def test_server_binding_uses_local_default_and_render_port(self):
        with patch.dict(os.environ, {}, clear=True), patch("backend.app.app.run") as run:
            backend_app.run_server()
        run.assert_called_once_with(host="127.0.0.1", port=5000, debug=True)

        with patch.dict(os.environ, {"PORT": "8080"}, clear=True), patch("backend.app.app.run") as run:
            backend_app.run_server()
        run.assert_called_once_with(host="0.0.0.0", port=8080, debug=False)


if __name__ == "__main__":
    unittest.main()
