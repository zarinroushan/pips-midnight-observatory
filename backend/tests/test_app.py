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
        }
        self.pending_guestbook = {77: "pending"}

    def __enter__(self):
        return self

    def __exit__(self, _exc_type, _exc, _traceback):
        return False

    def execute(self, query, params=()):
        self.last_query = " ".join(query.split())
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
            self.fetchall_result = self.guestbook_rows
            return self
        if self.last_query.startswith("INSERT INTO guestbook_entries"):
            self.insert_params = params
            self.fetchone_result = self.guestbook_insert
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
    visitor_id = "1fa85f64-5717-4562-b3fc-2c963f66afa6"
    empty_state = {
        "version": 1,
        "plots": [None] * 5,
        "creatures": [],
        "plotOwners": [None] * 5,
        "fulfilled": [],
    }

    def setUp(self):
        self.client = backend_app.app.test_client()
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
        self.env_patch = patch.dict(os.environ, {"DATABASE_URL": "postgresql://test"})
        self.env_patch.start()
        backend_app.guestbook_requests.clear()

    def tearDown(self):
        self.env_patch.stop()
        self.connect_patch.stop()

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

    def test_guestbook_submission_is_pending_and_parameterized(self):
        response = self.client.post(
            "/api/guestbook",
            json={
                "display_name": "Test Dreamer",
                "dream_message": "I wish Pip could build a tiny star-catching machine.",
            },
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.get_json()["entry"]["status"], "pending")
        self.assertEqual(
            self.connection.insert_params,
            (
                "Test Dreamer",
                "I wish Pip could build a tiny star-catching machine.",
                "pending",
            ),
        )
        self.assertIn("VALUES (%s, %s, %s)", self.connection.last_query)

    def test_guestbook_lists_approved_only_and_bounds_limit(self):
        response = self.client.get("/api/guestbook?limit=2")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()["entries"][0]["display_name"], "Approved Dreamer")
        self.assertEqual(self.connection.params, ("approved", 2))
        self.assertIn("WHERE status = %s", self.connection.last_query)
        self.assertIn("ORDER BY created_at DESC, id DESC", self.connection.last_query)
        self.assertEqual(self.client.get("/api/guestbook?limit=101").status_code, 400)

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
        path = f"/api/garden/state/{self.visitor_id}"
        self.assertEqual(self.client.get(path).get_json(), {"state": None, "revision": 0})
        save = self.client.put(path, json={"revision": 0, "state": self.empty_state})
        self.assertEqual(save.status_code, 200)
        self.assertEqual(save.get_json()["revision"], 1)
        loaded = self.client.get(path)
        self.assertEqual(loaded.get_json()["state"], self.empty_state)
        conflict = self.client.put(path, json={"revision": 0, "state": self.empty_state})
        self.assertEqual(conflict.status_code, 409)
        self.assertEqual(conflict.get_json()["revision"], 1)

    def test_garden_state_rejects_invalid_values_and_oversize(self):
        path = f"/api/garden/state/{self.visitor_id}"
        invalid = json.loads(json.dumps(self.empty_state))
        invalid["plots"][0] = {"seed": "<script>", "stage": 0}
        self.assertEqual(
            self.client.put(path, json={"revision": 0, "state": invalid}).status_code,
            400,
        )
        self.assertEqual(
            self.client.put(path, data="x" * 13_000, content_type="application/json").status_code,
            413,
        )
        invalid["plots"][0] = None
        invalid["version"] = True
        self.assertEqual(
            self.client.put(path, json={"revision": 0, "state": invalid}).status_code,
            400,
        )

    def test_database_failure_is_safe(self):
        with patch(
            "backend.database.psycopg.connect",
            side_effect=psycopg.OperationalError("private connection detail"),
        ):
            response = self.client.get(f"/api/garden/state/{self.visitor_id}")
        self.assertEqual(response.status_code, 503)
        self.assertNotIn("private", response.get_data(as_text=True))

    def test_missing_garden_schema_returns_safe_setup_message(self):
        with patch(
            "backend.database.psycopg.connect",
            side_effect=psycopg.errors.UndefinedTable("private schema detail"),
        ):
            response = self.client.get(f"/api/garden/state/{self.visitor_id}")
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
            f"/api/garden/state/{self.visitor_id}",
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
        self.assertNotIn("Access-Control-Allow-Credentials", production.headers)
        self.assertEqual(preflight.headers.get("Access-Control-Allow-Origin"), "http://localhost:5500")
        self.assertIn("PUT", preflight.headers.get("Access-Control-Allow-Methods", ""))
        self.assertIsNone(denied.headers.get("Access-Control-Allow-Origin"))

    def test_server_binding_uses_local_default_and_render_port(self):
        with patch.dict(os.environ, {}, clear=True), patch("backend.app.app.run") as run:
            backend_app.run_server()
        run.assert_called_once_with(host="127.0.0.1", port=5000, debug=True)

        with patch.dict(os.environ, {"PORT": "8080"}, clear=True), patch("backend.app.app.run") as run:
            backend_app.run_server()
        run.assert_called_once_with(host="0.0.0.0", port=8080, debug=False)


if __name__ == "__main__":
    unittest.main()
