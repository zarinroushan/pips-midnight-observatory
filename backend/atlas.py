"""PostgreSQL-backed Dream Atlas data and fixed-root repository discovery."""

from __future__ import annotations

import hmac
import json
import os
import re
from functools import wraps
from pathlib import Path
from urllib.parse import urlsplit

import psycopg
from flask import Blueprint, current_app, jsonify, request
try:
    from .database import connect_database, database_url
except ImportError:  # Support `python app.py` from backend/.
    from database import connect_database, database_url


atlas = Blueprint("atlas", __name__)
PROJECT_ROOT = Path(__file__).resolve().parent.parent
SKILL_NAME_MAX = 60
SKILL_BATCH_MAX = 100
PROJECT_NAME_MAX = 120
PROJECT_DESCRIPTION_MAX = 2000
PROJECT_STATUSES = {"active", "in_progress", "completed", "archived"}
IGNORED_DIRS = {
    ".git", ".hg", ".svn", ".venv", "venv", "env", "virtualenv",
    "node_modules", "bower_components", "__pycache__", ".pytest_cache",
    ".mypy_cache", ".ruff_cache", ".tox", "dist", "build", "coverage",
    ".next", ".nuxt", "target", "vendor", "site-packages", "assets",
}
SCANNABLE_SUFFIXES = {".py", ".js", ".mjs", ".cjs", ".ts", ".html", ".css", ".sql", ".toml", ".json", ".txt"}
SECRET_FILE_NAMES = {
    "id_rsa", "id_ed25519", "credentials", "secrets.json", "secrets.toml",
    "service-account.json", "private.key", "private.pem",
}
DEPENDENCY_NAMES = {
    "flask": ("Flask", "Backend"),
    "psycopg": ("Psycopg 3", "Database"),
    "psycopg2": ("Psycopg 2", "Database"),
    "python-dotenv": ("python-dotenv", "Backend"),
    "waitress": ("Waitress", "Backend"),
    "sqlalchemy": ("SQLAlchemy", "Database"),
    "django": ("Django", "Backend"),
    "fastapi": ("FastAPI", "Backend"),
    "requests": ("Requests", "Backend"),
    "pytest": ("pytest", "Testing"),
    "numpy": ("NumPy", "Data"),
    "pandas": ("pandas", "Data"),
}


def _db_url():
    return database_url()


def _db_error(error):
    if isinstance(error, psycopg.errors.UndefinedTable):
        current_app.logger.error("Dream Atlas schema is missing; apply migration 002_atlas.sql.")
        return jsonify(error="Dream Atlas storage is not set up yet. A site administrator must apply its database migration."), 503
    current_app.logger.error("Dream Atlas database request failed (%s).", type(error).__name__)
    return jsonify(error="Dream Atlas storage is temporarily unavailable."), 503


def _owner_error():
    configured = os.environ.get("ATLAS_ADMIN_TOKEN", "")
    if len(configured) < 32:
        return jsonify(error="Owner management is not configured. Set a private ATLAS_ADMIN_TOKEN of at least 32 characters."), 503
    supplied = request.headers.get("X-Admin-Token", "")
    if not hmac.compare_digest(supplied.encode("utf-8"), configured.encode("utf-8")):
        return jsonify(error="Owner authorization is required."), 401
    return None


def owner_required(function):
    @wraps(function)
    def wrapped(*args, **kwargs):
        error = _owner_error()
        return error if error else function(*args, **kwargs)
    return wrapped


def _normalize_name(value):
    if not isinstance(value, str):
        return None
    value = " ".join(value.split())
    if not value or len(value) > SKILL_NAME_MAX or any(ord(char) < 32 for char in value):
        return None
    return value


def _name_key(value):
    return " ".join(value.casefold().split())


def _project_id(value):
    if value is None:
        return None
    if isinstance(value, bool) or not isinstance(value, int) or value <= 0:
        return False
    return value


def _valid_repository_url(value):
    if value is None or value == "":
        return None
    if not isinstance(value, str) or len(value) > 2048 or any(char.isspace() for char in value):
        return False
    try:
        parsed = urlsplit(value)
        parsed.port  # Accessing port validates malformed port numbers.
        return bool(
            parsed.scheme in {"http", "https"}
            and parsed.hostname
            and parsed.username is None
            and parsed.password is None
        )
    except ValueError:
        return False


def scan_repository():
    """Scan only this installation's source tree; never accept a path from a request."""
    candidates = {}
    scanned_files = 0
    scanned_bytes = 0

    def add(name, category, path, detail):
        key = _name_key(name)
        item = candidates.setdefault(key, {"name": name, "category": category, "evidence": []})
        evidence = {"reference": path.as_posix(), "detail": detail}
        if evidence not in item["evidence"] and len(item["evidence"]) < 12:
            item["evidence"].append(evidence)

    files = []
    for directory, child_dirs, names in os.walk(PROJECT_ROOT, followlinks=False):
        parent = Path(directory)
        child_dirs[:] = [
            name for name in child_dirs
            if name.casefold() not in IGNORED_DIRS
            and not name.startswith(".")
            and not (parent / name).is_symlink()
        ]
        for name in names:
            path = parent / name
            lowered = name.casefold()
            suffix = path.suffix.casefold()
            is_requirements = bool(re.fullmatch(r"requirements(?:[-_.][a-z0-9_-]+)?\.txt", name, re.I))
            if (
                path.is_symlink()
                or lowered.startswith(".env")
                or lowered in SECRET_FILE_NAMES
                or any(marker in lowered for marker in ("secret", "credential", "private", "token"))
                or lowered.endswith((".pem", ".key", ".p12", ".pfx", ".crt", ".cer"))
                or suffix not in SCANNABLE_SUFFIXES
                or (suffix == ".toml" and lowered != "pyproject.toml")
                or (suffix == ".json" and lowered != "package.json")
                or (suffix == ".txt" and not is_requirements)
                or name.startswith(".")
            ):
                continue
            try:
                size = path.stat().st_size
            except OSError:
                continue
            if size > 512 * 1024:
                continue
            files.append(path)
            if len(files) >= 3000:
                break
        if len(files) >= 3000:
            break

    requirements = []
    for path in sorted(files):
        if path.resolve() == Path(__file__).resolve():
            continue
        relative = path.relative_to(PROJECT_ROOT)
        try:
            raw = path.read_bytes()
        except OSError:
            continue
        scanned_files += 1
        scanned_bytes += len(raw)
        if scanned_bytes > 32 * 1024 * 1024:
            break
        try:
            text = raw.decode("utf-8")
        except UnicodeDecodeError:
            continue

        suffix = path.suffix.casefold()
        if suffix == ".py":
            add("Python", "Backend", relative, "Python source file")
        elif suffix == ".html":
            add("HTML", "Frontend", relative, "HTML page")
        elif suffix == ".css":
            add("CSS", "Frontend", relative, "Stylesheet")
        elif suffix in {".js", ".mjs", ".cjs", ".ts"}:
            add("JavaScript", "Frontend", relative, "JavaScript source file")
        elif suffix == ".sql":
            if re.search(r"\b(CREATE\s+TABLE|INSERT\s+INTO|JSONB|UUID)\b", text, re.I):
                add("PostgreSQL", "Database", relative, "SQL database migration")

        if path.name.casefold() == "pyproject.toml":
            for dependency in re.findall(r"['\"]([A-Za-z0-9_.-]+)(?:\[[^\]]+\])?(?:[<>=!~][^'\"]*)?['\"]", text):
                requirements.append((dependency.casefold().replace("_", "-"), relative))
        elif path.suffix.casefold() == ".txt":
            for line in text.splitlines():
                requirement = re.match(r"\s*([A-Za-z0-9_.-]+)", line)
                if requirement:
                    requirements.append((requirement.group(1).casefold().replace("_", "-"), relative))
        elif path.name.casefold() == "package.json":
            try:
                manifest = json.loads(text)
            except (ValueError, TypeError):
                manifest = {}
            for section in ("dependencies", "devDependencies", "peerDependencies"):
                for dependency in (manifest.get(section) or {}):
                    normalized = dependency.casefold()
                    if normalized == "three":
                        add("Three.js", "Frontend", relative, f"{section} dependency")
                    elif normalized.startswith("@rive-app/"):
                        add("Rive", "Frontend", relative, f"{section} dependency")

        if re.search(r"\bpostgres(?:ql)?://|\bpostgresql\b", text, re.I) and suffix not in {".md", ".txt"}:
            add("PostgreSQL", "Database", relative, "PostgreSQL connection or configuration reference")
        if re.search(r"(?:from\s+|import\s+)flask\b|Flask\s*\(", text):
            add("Flask", "Backend", relative, "Flask application import or initialization")
        if re.search(r"\b(?:import\s+psycopg\b|from\s+psycopg\b|psycopg\.connect\b)", text, re.I):
            add("Psycopg 3", "Database", relative, "Psycopg database driver reference")
        if "@rive-app/" in text or "rive.rive(" in text.casefold():
            add("Rive", "Frontend", relative, "Rive runtime reference")
        if "from 'three'" in text or 'from "three"' in text or "three.module.js" in text:
            add("Three.js", "Frontend", relative, "Three.js module reference")

    for dependency, relative in requirements:
        match = DEPENDENCY_NAMES.get(dependency)
        if match:
            add(match[0], match[1], relative, f"Dependency manifest entry: {dependency}")
        elif dependency in {"psycopg", "psycopg-binary", "psycopg2-binary"}:
            add("Psycopg 3" if dependency.startswith("psycopg") else "Psycopg 2", "Database", relative, f"Dependency manifest entry: {dependency}")

    return {
        "project": PROJECT_ROOT.name,
        "scanned_files": scanned_files,
        "scanned_bytes": scanned_bytes,
        "skills": sorted(candidates.values(), key=lambda item: item["name"].casefold()),
    }


def _skill_rows(connection):
    rows = connection.execute(
        "SELECT id, name, category, evidence_status, source_type, created_at, updated_at FROM atlas_skills ORDER BY name_key"
    ).fetchall()
    skills = {row[0]: {
        "id": row[0], "name": row[1], "category": row[2], "status": row[3],
        "source_type": row[4], "created_at": row[5].isoformat(), "updated_at": row[6].isoformat(),
        "evidence": [], "projects": [],
    } for row in rows}
    if not skills:
        return []
    for row in connection.execute(
        "SELECT skill_id, source_type, evidence_reference, detail FROM atlas_skill_evidence ORDER BY id"
    ).fetchall():
        if row[0] in skills:
            skills[row[0]]["evidence"].append({"source_type": row[1], "reference": row[2] or None, "detail": row[3]})
    for row in connection.execute(
        """SELECT ps.skill_id, p.id, p.name, p.status, ps.evidence_reference
           FROM atlas_project_skills ps JOIN atlas_projects p ON p.id = ps.project_id
           ORDER BY p.name_key"""
    ).fetchall():
        if row[0] in skills:
            skills[row[0]]["projects"].append({
                "id": row[1], "name": row[2], "status": row[3], "evidence_reference": row[4] or None,
            })
    return list(skills.values())


def _project_record(connection, project_id):
    row = connection.execute(
        "SELECT id, name, description, repository_url, status, created_at, updated_at FROM atlas_projects WHERE id = %s",
        (project_id,),
    ).fetchone()
    if not row:
        return None
    project = {
        "id": row[0], "name": row[1], "description": row[2], "repository_url": row[3],
        "status": row[4], "created_at": row[5].isoformat(), "updated_at": row[6].isoformat(), "skills": [],
    }
    for skill in connection.execute(
        """SELECT s.id, s.name, s.category, s.source_type, s.evidence_status, ps.evidence_reference
           FROM atlas_project_skills ps JOIN atlas_skills s ON s.id = ps.skill_id
           WHERE ps.project_id = %s ORDER BY s.name_key""",
        (project_id,),
    ).fetchall():
        project["skills"].append({
            "id": skill[0], "name": skill[1], "category": skill[2], "source_type": skill[3],
            "status": skill[4], "evidence_reference": skill[5] or None,
        })
    return project


def _valid_project_id(connection, project_id):
    return project_id is None or connection.execute(
        "SELECT 1 FROM atlas_projects WHERE id = %s", (project_id,)
    ).fetchone() is not None


def _save_skill(connection, name, category, source_type, evidence_status):
    key = _name_key(name)
    row = connection.execute(
        """INSERT INTO atlas_skills (name, name_key, category, evidence_status, source_type)
           VALUES (%s, %s, %s, %s, %s) ON CONFLICT (name_key) DO NOTHING
           RETURNING id, name, category, evidence_status, source_type""",
        (name, key, category, evidence_status, source_type),
    ).fetchone()
    created = row is not None
    if row is None:
        row = connection.execute(
            "SELECT id, name, category, evidence_status, source_type FROM atlas_skills WHERE name_key = %s",
            (key,),
        ).fetchone()
    return row, created


def _associate(connection, project_id, skill_id, evidence_reference):
    if project_id is not None:
        connection.execute(
            """INSERT INTO atlas_project_skills (project_id, skill_id, evidence_reference)
               VALUES (%s, %s, %s) ON CONFLICT (project_id, skill_id, evidence_reference) DO NOTHING""",
            (project_id, skill_id, evidence_reference or ""),
        )


def _valid_json_object():
    if not request.is_json:
        return None, (jsonify(error="A JSON request body is required."), 400)
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return None, (jsonify(error="A JSON object is required."), 400)
    return payload, None


@atlas.get("/api/skills")
def list_skills():
    if not _db_url():
        return jsonify(error="Dream Atlas storage is temporarily unavailable."), 503
    try:
        with connect_database(_db_url()) as connection:
            return jsonify(skills=_skill_rows(connection)), 200
    except psycopg.Error as error:
        return _db_error(error)


@atlas.get("/api/skills/<int:skill_id>")
def get_skill(skill_id):
    if not _db_url():
        return jsonify(error="Dream Atlas storage is temporarily unavailable."), 503
    try:
        with connect_database(_db_url()) as connection:
            skills = _skill_rows(connection)
    except psycopg.Error as error:
        return _db_error(error)
    skill = next((item for item in skills if item["id"] == skill_id), None)
    return (jsonify(skill=skill), 200) if skill else (jsonify(error="Skill not found."), 404)


@atlas.get("/api/projects")
def list_projects():
    if not _db_url():
        return jsonify(error="Dream Atlas storage is temporarily unavailable."), 503
    try:
        with connect_database(_db_url()) as connection:
            ids = connection.execute("SELECT id FROM atlas_projects ORDER BY name_key").fetchall()
            projects = [_project_record(connection, row[0]) for row in ids]
    except psycopg.Error as error:
        return _db_error(error)
    return jsonify(projects=projects), 200


@atlas.get("/api/projects/<int:project_id>")
def get_project(project_id):
    if not _db_url():
        return jsonify(error="Dream Atlas storage is temporarily unavailable."), 503
    try:
        with connect_database(_db_url()) as connection:
            project = _project_record(connection, project_id)
    except psycopg.Error as error:
        return _db_error(error)
    return (jsonify(project=project), 200) if project else (jsonify(error="Project not found."), 404)


@atlas.post("/api/atlas/owner/unlock")
@owner_required
def unlock_owner_tools():
    return jsonify(authorized=True), 200


@atlas.post("/api/atlas/scan/preview")
@owner_required
def preview_repository_scan():
    payload = request.get_json(silent=True) if request.is_json else {}
    if payload not in ({}, None):
        return jsonify(error="Repository scanning always uses the configured project directory."), 400
    return jsonify(scan=scan_repository()), 200


@atlas.post("/api/atlas/scan/import")
@owner_required
def import_repository_scan():
    payload, error = _valid_json_object()
    if error:
        return error
    if set(payload) - {"skills", "project_id"}:
        return jsonify(error="Import accepts only previewed skill names and an optional saved project ID."), 400
    names = payload.get("skills")
    project_id = _project_id(payload.get("project_id"))
    if not isinstance(names, list) or not names or len(names) > SKILL_BATCH_MAX or project_id is False:
        return jsonify(error="Choose one or more previewed skills and a valid optional project."), 400
    normalized_names = []
    for raw_name in names:
        name = _normalize_name(raw_name)
        if not name:
            return jsonify(error="Each selected skill must be a name of 1–60 characters."), 400
        if _name_key(name) not in {_name_key(item) for item in normalized_names}:
            normalized_names.append(name)
    current_scan = scan_repository()
    detected = {_name_key(item["name"]): item for item in current_scan["skills"]}
    if any(_name_key(name) not in detected for name in normalized_names):
        return jsonify(error="One or more selected technologies are no longer detected. Preview the repository again."), 409
    if not _db_url():
        return jsonify(error="Dream Atlas storage is temporarily unavailable."), 503
    saved = []
    try:
        with connect_database(_db_url()) as connection:
            if not _valid_project_id(connection, project_id):
                return jsonify(error="The selected project no longer exists."), 400
            for name in normalized_names:
                item = detected[_name_key(name)]
                row, created = _save_skill(connection, item["name"], item["category"], "repository_detected", "evidence_found")
                skill_id = row[0]
                for evidence in item["evidence"]:
                    connection.execute(
                        """INSERT INTO atlas_skill_evidence (skill_id, source_type, evidence_reference, detail)
                           VALUES (%s, 'repository_detected', %s, %s)
                           ON CONFLICT (skill_id, source_type, evidence_reference) DO NOTHING""",
                        (skill_id, evidence["reference"], evidence["detail"]),
                    )
                    _associate(connection, project_id, skill_id, evidence["reference"])
                saved.append({"id": skill_id, "name": row[1], "created": created, "source_type": row[4]})
    except psycopg.Error as db_error:
        return _db_error(db_error)
    return jsonify(saved=saved, message="Approved repository evidence was imported."), 200


@atlas.post("/api/skills")
@owner_required
def add_manual_skills():
    payload, error = _valid_json_object()
    if error:
        return error
    raw_skills = payload.get("skills")
    project_id = _project_id(payload.get("project_id"))
    if not isinstance(raw_skills, list) or not raw_skills or len(raw_skills) > SKILL_BATCH_MAX or project_id is False:
        return jsonify(error="Provide 1–100 skill names and a valid optional project."), 400
    names = []
    for raw in raw_skills:
        name = _normalize_name(raw)
        if not name:
            return jsonify(error="Each skill must contain 1–60 characters."), 400
        if _name_key(name) not in {_name_key(item) for item in names}:
            names.append(name)
    if not _db_url():
        return jsonify(error="Dream Atlas storage is temporarily unavailable."), 503
    saved = []
    try:
        with connect_database(_db_url()) as connection:
            if not _valid_project_id(connection, project_id):
                return jsonify(error="The selected project no longer exists."), 400
            for name in names:
                row, created = _save_skill(connection, name, "Uncategorized", "manually_added", "manually_added")
                skill_id = row[0]
                connection.execute(
                    """INSERT INTO atlas_skill_evidence (skill_id, source_type, evidence_reference, detail)
                       VALUES (%s, 'manually_added', '', 'Added by the project owner')
                       ON CONFLICT (skill_id, source_type, evidence_reference) DO NOTHING""",
                    (skill_id,),
                )
                _associate(connection, project_id, skill_id, "")
                saved.append({
                    "id": skill_id, "name": row[1], "category": row[2], "status": row[3],
                    "source_type": row[4], "created": created,
                })
    except psycopg.Error as db_error:
        return _db_error(db_error)
    return jsonify(saved=saved, message="Skills saved."), 201


@atlas.post("/api/projects")
@owner_required
def add_project():
    payload, error = _valid_json_object()
    if error:
        return error
    name = payload.get("name")
    description = payload.get("description", "")
    repository_url = _valid_repository_url(payload.get("repository_url"))
    status = payload.get("status", "active")
    raw_skills = payload.get("skills", [])
    if (
        not isinstance(name, str) or not (name := " ".join(name.split()))
        or len(name) > PROJECT_NAME_MAX
        or not isinstance(description, str) or len(description.strip()) > PROJECT_DESCRIPTION_MAX
        or repository_url is False
        or not isinstance(status, str) or status not in PROJECT_STATUSES
        or not isinstance(raw_skills, list) or len(raw_skills) > SKILL_BATCH_MAX
    ):
        return jsonify(error="Check the project name, description, repository URL, status, and technology list."), 400
    skill_names = []
    for raw in raw_skills:
        skill = _normalize_name(raw)
        if not skill:
            return jsonify(error="Each technology must contain 1–60 characters."), 400
        if _name_key(skill) not in {_name_key(item) for item in skill_names}:
            skill_names.append(skill)
    if not _db_url():
        return jsonify(error="Dream Atlas storage is temporarily unavailable."), 503
    try:
        with connect_database(_db_url()) as connection:
            row = connection.execute(
                """INSERT INTO atlas_projects (name, name_key, description, repository_url, status)
                   VALUES (%s, %s, %s, %s, %s) ON CONFLICT (name_key) DO NOTHING
                   RETURNING id""",
                (name, _name_key(name), description.strip(), repository_url, status),
            ).fetchone()
            created = row is not None
            project_id = row[0] if row else connection.execute(
                "SELECT id FROM atlas_projects WHERE name_key = %s", (_name_key(name),)
            ).fetchone()[0]
            for skill_name in skill_names:
                skill_row, _ = _save_skill(connection, skill_name, "Uncategorized", "manually_added", "manually_added")
                connection.execute(
                    """INSERT INTO atlas_skill_evidence (skill_id, source_type, evidence_reference, detail)
                       VALUES (%s, 'manually_added', '', 'Added with a project by the project owner')
                       ON CONFLICT (skill_id, source_type, evidence_reference) DO NOTHING""",
                    (skill_row[0],),
                )
                _associate(connection, project_id, skill_row[0], "")
            project = _project_record(connection, project_id)
    except psycopg.Error as db_error:
        return _db_error(db_error)
    return jsonify(project=project, created=created), 201 if created else 200
