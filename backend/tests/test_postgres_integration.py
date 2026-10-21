import os
import json
import socket
import subprocess
import sys
import time
import unittest
from urllib.error import URLError
from urllib.request import Request, urlopen
from unittest.mock import patch
from uuid import UUID

import psycopg

from backend import app as backend_app
from backend.journal import _dedupe_key


TEST_DATABASE_URL = os.environ.get("DEAR_PIP_TEST_DATABASE_URL")


@unittest.skipUnless(
    TEST_DATABASE_URL,
    "Set DEAR_PIP_TEST_DATABASE_URL to an isolated database with the migrations applied.",
)
class PostgreSQLApiIntegrationTests(unittest.TestCase):
    def setUp(self):
        self.previous_secret = backend_app.app.config.get("SECRET_KEY")
        backend_app.app.config["SECRET_KEY"] = "test-only-session-secret-at-least-32-bytes"
        self.database_patch = patch.dict(
            os.environ,
            {
                "DATABASE_URL": TEST_DATABASE_URL,
                "CORS_ALLOWED_ORIGINS": "http://127.0.0.1:5500",
            },
        )
        self.database_patch.start()
        self.client = backend_app.app.test_client()
        self.origin = "http://127.0.0.1:5500"
        self.client.get("/api/garden/session", headers={"Origin": self.origin})
        with self.client.session_transaction() as visitor_session:
            self.visitor_id = UUID(visitor_session["garden_visitor_id"])
        self.guestbook_entry_id = None

    def tearDown(self):
        try:
            with psycopg.connect(TEST_DATABASE_URL, connect_timeout=3) as connection:
                garden_table = connection.execute(
                    "SELECT to_regclass('garden_states')"
                ).fetchone()[0]
                if garden_table is not None:
                    connection.execute(
                        "DELETE FROM garden_states WHERE visitor_id = %s",
                        (self.visitor_id,),
                    )
                progress_table = connection.execute(
                    "SELECT to_regclass('visitor_progress')"
                ).fetchone()[0]
                if progress_table is not None:
                    connection.execute(
                        "DELETE FROM visitor_progress WHERE visitor_id = %s",
                        (self.visitor_id,),
                    )
                journal_table = connection.execute(
                    "SELECT to_regclass('public_journal_events')"
                ).fetchone()[0]
                if journal_table is not None:
                    dedupe_key = _dedupe_key(
                        self.visitor_id,
                        "home:all-stars",
                        backend_app.app.config["SECRET_KEY"],
                    )
                    connection.execute(
                        "DELETE FROM public_journal_events WHERE dedupe_key = %s",
                        (dedupe_key,),
                    )
                if self.guestbook_entry_id is not None:
                    guestbook_table = connection.execute(
                        "SELECT to_regclass('guestbook_entries')"
                    ).fetchone()[0]
                    if guestbook_table is not None:
                        connection.execute(
                            "DELETE FROM guestbook_entries WHERE id = %s",
                            (self.guestbook_entry_id,),
                        )
        finally:
            self.database_patch.stop()
            backend_app.app.config["SECRET_KEY"] = self.previous_secret

    def assert_state_survives_process_restart(self, cookie, expected_state, expected_revision=1):
        with socket.socket() as port_socket:
            port_socket.bind(("127.0.0.1", 0))
            port = port_socket.getsockname()[1]
        environment = os.environ.copy()
        environment.update({
            "DATABASE_URL": TEST_DATABASE_URL,
            "SESSION_SECRET": "test-only-session-secret-at-least-32-bytes",
            "SESSION_COOKIE_SECURE": "false",
            "SESSION_COOKIE_SAMESITE": "Lax",
            "CORS_ALLOWED_ORIGINS": self.origin,
            "TEST_API_PORT": str(port),
        })
        environment.pop("PORT", None)
        environment["APP_ENV"] = "development"
        code = (
            "import os; from backend.app import app; "
            "app.run(host='127.0.0.1', port=int(os.environ['TEST_API_PORT']), "
            "debug=False, use_reloader=False)"
        )

        def start_server():
            process = subprocess.Popen(
                [sys.executable, "-c", code],
                cwd=os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
                env=environment,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )
            for _ in range(100):
                if process.poll() is not None:
                    self.fail("The isolated Flask test server exited during startup.")
                try:
                    with urlopen(f"http://127.0.0.1:{port}/api/health", timeout=0.25):
                        return process
                except (OSError, URLError):
                    time.sleep(0.05)
            process.terminate()
            process.wait(timeout=5)
            self.fail("The isolated Flask test server did not become ready.")

        def get_state():
            request = Request(
                f"http://127.0.0.1:{port}/api/garden/state",
                headers={"Cookie": cookie, "Origin": self.origin},
            )
            with urlopen(request, timeout=5) as response:
                return json.loads(response.read().decode("utf-8"))

        for _ in range(2):
            process = start_server()
            try:
                self.assertEqual(
                    get_state(),
                    {"state": expected_state, "revision": expected_revision},
                )
            finally:
                process.terminate()
                process.wait(timeout=5)

    def test_garden_persistence_and_guestbook_moderation_contract(self):
        state = {
            "version": 1,
            "plots": [{"seed": "moonblush", "stage": 1}, None, None, None, None],
            "creatures": [],
            "plotOwners": [None] * 5,
            "fulfilled": [],
            "dreamJournal": [{
                "id": f"wish-{self.visitor_id}",
                "wish": "Complete one small step toward my goal.",
                "creature": "moth",
                "createdAt": "2026-01-01T00:00:00Z",
            }],
            "creatureLayout": {
                "moth": {"x": 28.5, "y": 38, "scale": 1.15},
            },
        }
        path = "/api/garden/state"

        initial = self.client.get(path)
        self.assertEqual(initial.status_code, 200)
        self.assertEqual(initial.get_json(), {"state": None, "revision": 0})

        saved = self.client.put(
            path, json={"revision": 0, "state": state},
            headers={"Origin": self.origin},
        )
        self.assertEqual(saved.status_code, 200)
        self.assertEqual(saved.get_json()["revision"], 1)
        garden_cookie = self.client.get_cookie("dearpip_garden")
        self.assert_state_survives_process_restart(
            f"dearpip_garden={garden_cookie.value}",
            state,
        )

        fulfilled = self.client.post(
            f"/api/garden/wishes/wish-{self.visitor_id}/fulfill",
            json={"revision": 1},
            headers={"Origin": self.origin},
        )
        self.assertEqual(fulfilled.status_code, 200)
        state = fulfilled.get_json()["state"]
        self.assertEqual(state["dreamJournal"], [])
        self.assertEqual(
            state["fulfilledWishes"][0]["wish"],
            "Complete one small step toward my goal.",
        )
        self.assert_state_survives_process_restart(
            f"dearpip_garden={garden_cookie.value}",
            state,
            expected_revision=2,
        )

        loaded = self.client.get(path)
        self.assertEqual(loaded.status_code, 200)
        self.assertEqual(loaded.get_json(), {"state": state, "revision": 2})

        progress_path = f"/api/progress/{self.visitor_id}/home"
        progress_data = {"version": 1, "collected": [0], "collectedButterflies": []}
        progress_saved = self.client.put(
            progress_path, json={"revision": 0, "data": progress_data}
        )
        self.assertEqual(progress_saved.status_code, 200)
        self.assertEqual(self.client.get(progress_path).get_json()["data"], progress_data)

        context = self.client.get(f"/api/stories/context/{self.visitor_id}")
        self.assertEqual(context.status_code, 200)
        self.assertTrue(any(
            project["name"] == "Dear Pip — Midnight Nursery"
            for project in context.get_json()["projects"]
        ))

        submission = self.client.post(
            "/api/guestbook",
            json={
                "dream_message": f"Temporary integration entry {self.visitor_id}",
            },
        )
        self.assertEqual(submission.status_code, 201)
        self.assertEqual(submission.get_json()["entry"]["status"], "pending")
        self.guestbook_entry_id = submission.get_json()["entry"]["id"]

        approved_entries = self.client.get("/api/guestbook?limit=100")
        self.assertEqual(approved_entries.status_code, 200)
        self.assertNotIn(
            self.guestbook_entry_id,
            [entry["id"] for entry in approved_entries.get_json()["entries"]],
        )

    def test_public_journal_milestone_is_shared_across_visitors_and_refreshes(self):
        response = self.client.put(
            f"/api/progress/{self.visitor_id}/home",
            json={
                "revision": 0,
                "data": {
                    "version": 1,
                    "collected": [0, 1, 2, 3, 4],
                    "collectedButterflies": [],
                },
            },
        )
        self.assertEqual(response.status_code, 200)

        another_visitor = backend_app.app.test_client().get("/api/public-journal")
        refreshed = self.client.get("/api/public-journal")
        self.assertEqual(another_visitor.status_code, 200)
        self.assertEqual(another_visitor.get_json(), refreshed.get_json())
        self.assertTrue(any(
            entry["message"] == "I found all five sparkling stars in the garden!"
            for entry in refreshed.get_json()["entries"]
        ))


if __name__ == "__main__":
    unittest.main()
