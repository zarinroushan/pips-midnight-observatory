import os
import unittest
from unittest.mock import patch
from uuid import uuid4

import psycopg

from backend import app as backend_app


TEST_DATABASE_URL = os.environ.get("DEAR_PIP_TEST_DATABASE_URL")


@unittest.skipUnless(
    TEST_DATABASE_URL,
    "Set DEAR_PIP_TEST_DATABASE_URL to an isolated database with the migrations applied.",
)
class PostgreSQLApiIntegrationTests(unittest.TestCase):
    def setUp(self):
        self.database_patch = patch.dict(
            os.environ,
            {"DATABASE_URL": TEST_DATABASE_URL},
        )
        self.database_patch.start()
        self.visitor_id = uuid4()
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

    def test_garden_persistence_and_guestbook_moderation_contract(self):
        client = backend_app.app.test_client()
        state = {
            "version": 1,
            "plots": [{"seed": "moonblush", "stage": 1}, None, None, None, None],
            "creatures": [],
            "plotOwners": [None] * 5,
            "fulfilled": [],
        }
        path = f"/api/garden/state/{self.visitor_id}"

        initial = client.get(path)
        self.assertEqual(initial.status_code, 200)
        self.assertEqual(initial.get_json(), {"state": None, "revision": 0})

        saved = client.put(path, json={"revision": 0, "state": state})
        self.assertEqual(saved.status_code, 200)
        self.assertEqual(saved.get_json()["revision"], 1)

        loaded = client.get(path)
        self.assertEqual(loaded.status_code, 200)
        self.assertEqual(loaded.get_json(), {"state": state, "revision": 1})

        progress_path = f"/api/progress/{self.visitor_id}/home"
        progress_data = {"version": 1, "collected": [0], "collectedButterflies": []}
        progress_saved = client.put(
            progress_path, json={"revision": 0, "data": progress_data}
        )
        self.assertEqual(progress_saved.status_code, 200)
        self.assertEqual(client.get(progress_path).get_json()["data"], progress_data)

        context = client.get(f"/api/stories/context/{self.visitor_id}")
        self.assertEqual(context.status_code, 200)
        self.assertTrue(any(
            project["name"] == "Dear Pip — Midnight Nursery"
            for project in context.get_json()["projects"]
        ))

        submission = client.post(
            "/api/guestbook",
            json={
                "display_name": "Integration Test",
                "dream_message": f"Temporary integration entry {self.visitor_id}",
            },
        )
        self.assertEqual(submission.status_code, 201)
        self.assertEqual(submission.get_json()["entry"]["status"], "pending")
        self.guestbook_entry_id = submission.get_json()["entry"]["id"]

        approved_entries = client.get("/api/guestbook?limit=100")
        self.assertEqual(approved_entries.status_code, 200)
        self.assertNotIn(
            self.guestbook_entry_id,
            [entry["id"] for entry in approved_entries.get_json()["entries"]],
        )


if __name__ == "__main__":
    unittest.main()
