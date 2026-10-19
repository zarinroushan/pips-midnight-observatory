import os
import unittest
from pathlib import Path
from unittest.mock import patch

from backend import app as backend_app
from backend import atlas as atlas_module


class FakeAtlasConnection:
    def __init__(self):
        self.skills = {}
        self.evidence = set()
        self.next_id = 1
        self.fetchone_result = None

    def __enter__(self):
        return self

    def __exit__(self, *_args):
        return False

    def execute(self, query, params=()):
        compact = " ".join(query.split())
        if compact.startswith("INSERT INTO atlas_skills"):
            name, key, category, status, source = params
            if key in self.skills:
                self.fetchone_result = None
            else:
                row = (self.next_id, name, category, status, source)
                self.skills[key] = row
                self.next_id += 1
                self.fetchone_result = row
        elif compact.startswith("SELECT id, name, category, evidence_status, source_type FROM atlas_skills"):
            self.fetchone_result = self.skills.get(params[0])
        elif compact.startswith("INSERT INTO atlas_skill_evidence"):
            skill_id = params[0]
            self.evidence.add((skill_id, "manually_added", ""))
            self.fetchone_result = None
        else:
            raise AssertionError(f"Unexpected Atlas test query: {compact}")
        return self

    def fetchone(self):
        return self.fetchone_result


class DreamAtlasApiTests(unittest.TestCase):
    owner_token = "test-owner-token-that-is-long-enough-32-characters"

    def setUp(self):
        self.client = backend_app.app.test_client()

    def test_private_owner_routes_require_a_configured_token(self):
        with patch.dict(os.environ, {"ATLAS_ADMIN_TOKEN": self.owner_token}, clear=True):
            response = self.client.post("/api/atlas/owner/unlock")
            self.assertEqual(response.status_code, 401)
            authorized = self.client.post(
                "/api/atlas/owner/unlock",
                headers={"X-Admin-Token": self.owner_token},
            )
            self.assertEqual(authorized.status_code, 200)
            self.assertEqual(authorized.get_json(), {"authorized": True})

    def test_owner_actions_report_missing_server_configuration_safely(self):
        with patch.dict(os.environ, {"ATLAS_ADMIN_TOKEN": "too-short"}, clear=True):
            response = self.client.post("/api/atlas/owner/unlock")
        self.assertEqual(response.status_code, 503)
        self.assertIn("ATLAS_ADMIN_TOKEN", response.get_json()["error"])

    def test_scan_endpoint_rejects_browser_supplied_paths(self):
        with patch.dict(os.environ, {"ATLAS_ADMIN_TOKEN": self.owner_token}, clear=True), patch(
            "backend.atlas.scan_repository"
        ) as scan:
            response = self.client.post(
                "/api/atlas/scan/preview",
                json={"path": "C:/private-folder"},
                headers={"X-Admin-Token": self.owner_token},
            )
        self.assertEqual(response.status_code, 400)
        scan.assert_not_called()

    def test_scan_preview_returns_repository_evidence_only_after_owner_check(self):
        with patch.dict(os.environ, {"ATLAS_ADMIN_TOKEN": self.owner_token}, clear=True):
            denied = self.client.post("/api/atlas/scan/preview")
            response = self.client.post(
                "/api/atlas/scan/preview",
                headers={"X-Admin-Token": self.owner_token},
            )
        self.assertEqual(denied.status_code, 401)
        self.assertEqual(response.status_code, 200)
        scan = response.get_json()["scan"]
        self.assertGreater(scan["scanned_files"], 0)
        self.assertIn("Python", {item["name"] for item in scan["skills"]})
        self.assertNotIn("root", scan)
        self.assertNotIn("source", scan)

    def test_public_reads_do_not_return_database_configuration(self):
        with patch.dict(os.environ, {}, clear=True):
            response = self.client.get("/api/skills")
        self.assertEqual(response.status_code, 503)
        self.assertNotIn("DATABASE_URL", response.get_data(as_text=True))

    def test_manual_input_and_project_values_are_validated_before_database_access(self):
        with patch.dict(os.environ, {"ATLAS_ADMIN_TOKEN": self.owner_token}, clear=True), patch(
            "backend.database.psycopg.connect"
        ) as connect:
            headers = {"X-Admin-Token": self.owner_token}
            empty = self.client.post("/api/skills", json={"skills": [" "]}, headers=headers)
            too_long = self.client.post("/api/skills", json={"skills": ["x" * 61]}, headers=headers)
            invalid_url = self.client.post(
                "/api/projects",
                json={"name": "Dream Project", "repository_url": "javascript:alert(1)"},
                headers=headers,
            )
            invalid_status = self.client.post(
                "/api/projects",
                json={"name": "Dream Project", "status": []},
                headers=headers,
            )
        self.assertEqual(empty.status_code, 400)
        self.assertEqual(too_long.status_code, 400)
        self.assertEqual(invalid_url.status_code, 400)
        self.assertEqual(invalid_status.status_code, 400)
        connect.assert_not_called()

    def test_manual_duplicates_reuse_skills_without_overwriting_source(self):
        connection = FakeAtlasConnection()
        with patch.dict(
            os.environ,
            {"ATLAS_ADMIN_TOKEN": self.owner_token, "DATABASE_URL": "postgresql://test"},
            clear=True,
        ), patch("backend.database.psycopg.connect", return_value=connection):
            headers = {"X-Admin-Token": self.owner_token}
            first = self.client.post("/api/skills", json={"skills": ["  HTML   ", "html", "CSS"]}, headers=headers)
            second = self.client.post("/api/skills", json={"skills": ["html"]}, headers=headers)
        self.assertEqual(first.status_code, 201)
        self.assertEqual([item["name"] for item in first.get_json()["saved"]], ["HTML", "CSS"])
        self.assertTrue(first.get_json()["saved"][0]["created"])
        self.assertEqual(second.status_code, 201)
        self.assertFalse(second.get_json()["saved"][0]["created"])
        self.assertEqual(len(connection.skills), 2)
        self.assertEqual(len(connection.evidence), 2)
        self.assertEqual(connection.skills["html"][4], "manually_added")


class RepositoryScannerTests(unittest.TestCase):
    def test_actual_repository_candidates_have_relative_evidence(self):
        scan = atlas_module.scan_repository()
        by_name = {skill["name"]: skill for skill in scan["skills"]}
        for expected in ("Python", "Flask", "Psycopg 3", "PostgreSQL", "HTML", "CSS", "JavaScript", "Three.js"):
            self.assertIn(expected, by_name)
            self.assertTrue(by_name[expected]["evidence"])
        self.assertGreater(scan["scanned_files"], 0)
        for skill in scan["skills"]:
            for evidence in skill["evidence"]:
                self.assertFalse(Path(evidence["reference"]).is_absolute())
                self.assertNotIn(".env", evidence["reference"].casefold())
                self.assertNotIn("snippet", evidence)

    def test_scanner_never_reads_hidden_env_or_secret_text_files(self):
        root = Path(atlas_module.__file__).resolve().parent
        original_stat = Path.stat

        def guard_stat(path, *args, **kwargs):
            if path.name in {".env", "credentials.txt"}:
                raise AssertionError("The scanner must skip private files before opening them.")
            return original_stat(path, *args, **kwargs)

        with patch.object(atlas_module, "PROJECT_ROOT", root), patch.object(
            atlas_module.os,
            "walk",
            return_value=[(str(root), [], [".env", "credentials.txt", "app.py", "requirements.txt"])],
        ), patch.object(Path, "stat", autospec=True, side_effect=guard_stat):
            scan = atlas_module.scan_repository()
        self.assertIn("Flask", {item["name"] for item in scan["skills"]})
        references = [evidence["reference"] for item in scan["skills"] for evidence in item["evidence"]]
        self.assertIn("app.py", references)
        self.assertIn("requirements.txt", references)
        self.assertTrue(set(references).issubset({"app.py", "requirements.txt"}))
        self.assertNotIn("do-not-read", str(scan))


if __name__ == "__main__":
    unittest.main()
