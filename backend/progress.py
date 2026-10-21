"""PostgreSQL persistence for visitor-owned activity progress."""

from __future__ import annotations

import os
from uuid import UUID

import psycopg
from psycopg.types.json import Jsonb
from flask import Blueprint, jsonify, request
try:
    from .database import connect_database
except ImportError:  # Support `python app.py` from backend/.
    from database import connect_database


progress = Blueprint("progress", __name__)
FEATURES = {"home", "atlas", "bedtime", "lullaby"}
ATLAS_DISCOVERIES = {"lantern", "sail", "whale", "garden", "bell"}
STORY_ADVENTURES = {
    "missing-star", "lumi-wish", "music-box", "lantern-path", "little-lights",
    "ember-glow", "nova-day", "mochi-place", "pippa-song",
}
STORY_SCENES = {
    "opening", "hill", "cloud", "skyEnding", "gardenEnding", "nightlightEnding",
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


def _database_error(error):
    if isinstance(error, psycopg.errors.UndefinedTable):
        return jsonify(error="Required visitor progress storage is not set up yet. A site administrator must apply the backend migrations."), 503
    return jsonify(error="Visitor progress storage is temporarily unavailable."), 503


def _unique_values(value, allowed, maximum):
    if not isinstance(value, list) or len(value) > maximum:
        return None
    output = []
    for item in value:
        if type(item) not in {int, str} or item not in allowed:
            return None
        if item not in output:
            output.append(item)
    return output


def _validated_progress(feature, value):
    if not isinstance(value, dict) or value.get("version") != 1 or type(value.get("version")) is not int:
        return None
    if feature == "home":
        if set(value) != {"version", "collected", "collectedButterflies"}:
            return None
        stars = _unique_values(value["collected"], set(range(5)), 5)
        butterflies = _unique_values(value["collectedButterflies"], set(range(2)), 2)
        return {"version": 1, "collected": stars, "collectedButterflies": butterflies} if stars is not None and butterflies is not None else None
    if feature == "atlas":
        if set(value) - {"version", "discovered", "puzzleComplete"} or "discovered" not in value:
            return None
        discovered = _unique_values(value["discovered"], ATLAS_DISCOVERIES, 5)
        puzzle_complete = value.get("puzzleComplete", False)
        if discovered is None or type(puzzle_complete) is not bool:
            return None
        return {"version": 1, "discovered": discovered, "puzzleComplete": puzzle_complete}
    if feature == "bedtime":
        if set(value) - {"version", "scene", "visited", "adventure", "completed"} or not {"scene", "visited"} <= set(value):
            return None
        scene = value["scene"]
        visited = _unique_values(value["visited"], STORY_SCENES, len(STORY_SCENES))
        adventure = value.get("adventure")
        completed = _unique_values(value.get("completed", []), STORY_ADVENTURES, len(STORY_ADVENTURES))
        if (
            not isinstance(scene, str) or scene not in STORY_SCENES or visited is None or scene not in visited
            or (adventure is not None and adventure not in STORY_ADVENTURES) or completed is None
        ):
            return None
        return {"version": 1, "scene": scene, "visited": visited, "adventure": adventure, "completed": completed}
    if feature == "lullaby":
        if set(value) != {"version", "bubbles", "deletedBubbles"} or not isinstance(value["bubbles"], list) or len(value["bubbles"]) > 20:
            return None
        deleted = value["deletedBubbles"]
        if not isinstance(deleted, list) or len(deleted) > 40:
            return None
        if any(not isinstance(item, str) or not item.strip() or len(item) > 240 for item in [*value["bubbles"], *deleted]):
            return None
        deleted = list(dict.fromkeys(item.strip() for item in deleted))
        bubbles = list(dict.fromkeys(item.strip() for item in value["bubbles"] if item.strip() not in deleted))
        return {"version": 1, "bubbles": bubbles[:20], "deletedBubbles": deleted[-40:]}
    return None


def _merge_progress(feature, current, incoming):
    if feature == "home":
        return {
            "version": 1,
            "collected": sorted(set(current["collected"]) | set(incoming["collected"])),
            "collectedButterflies": sorted(set(current["collectedButterflies"]) | set(incoming["collectedButterflies"])),
        }
    if feature == "atlas":
        return {
            "version": 1,
            "discovered": [item for item in ATLAS_DISCOVERIES if item in set(current["discovered"]) | set(incoming["discovered"])],
            "puzzleComplete": current["puzzleComplete"] or incoming["puzzleComplete"],
        }
    if feature == "lullaby":
        deleted = list(dict.fromkeys([*current["deletedBubbles"], *incoming["deletedBubbles"]]))[-40:]
        bubbles = list(dict.fromkeys([*current["bubbles"], *incoming["bubbles"]]))
        return {
            "version": 1,
            "bubbles": [item for item in bubbles if item not in deleted][-20:],
            "deletedBubbles": deleted,
        }
    return {
        "version": 1,
        "scene": incoming["scene"],
        "visited": [item for item in STORY_SCENES if item in set(current["visited"]) | set(incoming["visited"])],
        "adventure": incoming.get("adventure") or current.get("adventure"),
        "completed": [item for item in STORY_ADVENTURES if item in set(current.get("completed", [])) | set(incoming.get("completed", []))],
    }


@progress.get("/api/progress/<uuid:visitor_id>/<feature>")
def get_progress(visitor_id: UUID, feature: str):
    if feature not in FEATURES:
        return jsonify(error="Unknown visitor progress feature."), 404
    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        return jsonify(error="Visitor progress storage is temporarily unavailable."), 503
    try:
        with connect_database(database_url) as connection:
            row = connection.execute(
                "SELECT revision, data FROM visitor_progress WHERE visitor_id = %s AND feature_key = %s",
                (visitor_id, feature),
            ).fetchone()
    except psycopg.Error as error:
        return _database_error(error)
    if row is None:
        return jsonify(data=None, revision=0), 200
    return jsonify(data=row[1], revision=row[0]), 200


@progress.put("/api/progress/<uuid:visitor_id>/<feature>")
def put_progress(visitor_id: UUID, feature: str):
    if feature not in FEATURES:
        return jsonify(error="Unknown visitor progress feature."), 404
    if not request.is_json:
        return jsonify(error="A JSON request body is required."), 400
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict) or set(payload) != {"revision", "data"}:
        return jsonify(error="A revision and progress data are required."), 400
    expected = payload["revision"]
    data = _validated_progress(feature, payload["data"])
    if not isinstance(expected, int) or isinstance(expected, bool) or expected < 0 or data is None:
        return jsonify(error="Progress data or revision is invalid."), 400
    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        return jsonify(error="Visitor progress storage is temporarily unavailable."), 503

    next_revision = None
    current = None
    try:
        with connect_database(database_url) as connection:
            current = connection.execute(
                "SELECT revision, data FROM visitor_progress WHERE visitor_id = %s AND feature_key = %s FOR UPDATE",
                (visitor_id, feature),
            ).fetchone()
            if current is None and expected == 0:
                inserted = connection.execute(
                    """INSERT INTO visitor_progress (visitor_id, feature_key, revision, data)
                       VALUES (%s, %s, 1, %s) ON CONFLICT (visitor_id, feature_key) DO NOTHING
                       RETURNING revision""",
                    (visitor_id, feature, Jsonb(data)),
                ).fetchone()
                if inserted:
                    next_revision = inserted[0]
                else:
                    current = connection.execute(
                        "SELECT revision, data FROM visitor_progress WHERE visitor_id = %s AND feature_key = %s",
                        (visitor_id, feature),
                    ).fetchone()
            elif current is not None and current[0] == expected:
                updated = connection.execute(
                    """UPDATE visitor_progress SET revision = revision + 1, data = %s,
                       updated_at = CURRENT_TIMESTAMP WHERE visitor_id = %s AND feature_key = %s
                       AND revision = %s RETURNING revision""",
                    (Jsonb(data), visitor_id, feature, expected),
                ).fetchone()
                next_revision = updated[0] if updated else None
                if next_revision is None:
                    current = connection.execute(
                        "SELECT revision, data FROM visitor_progress WHERE visitor_id = %s AND feature_key = %s",
                        (visitor_id, feature),
                    ).fetchone()
    except psycopg.Error as error:
        return _database_error(error)

    if next_revision is not None:
        return jsonify(revision=next_revision), 200
    current_revision, current_data = current if current else (0, None)
    if current_data is not None:
        normalized = _validated_progress(feature, current_data)
        if normalized is not None:
            current_data = _merge_progress(feature, normalized, data)
    return jsonify(error="Progress changed elsewhere; merge and retry.", revision=current_revision, data=current_data), 409


@progress.get("/api/stories/context/<uuid:visitor_id>")
def story_context(visitor_id: UUID):
    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        return jsonify(error="Story context is temporarily unavailable."), 503
    try:
        with connect_database(database_url) as connection:
            rows = connection.execute(
                """SELECT p.id, p.name, p.description, p.status, s.name
                   FROM atlas_projects p
                   LEFT JOIN atlas_project_skills ps ON ps.project_id = p.id
                   LEFT JOIN atlas_skills s ON s.id = ps.skill_id
                   ORDER BY p.name_key, s.name_key"""
            ).fetchall()
            garden_row = connection.execute(
                "SELECT state FROM garden_states WHERE visitor_id = %s", (visitor_id,)
            ).fetchone()
            progress_rows = connection.execute(
                "SELECT feature_key, data FROM visitor_progress WHERE visitor_id = %s AND feature_key IN ('home', 'atlas', 'lullaby')",
                (visitor_id,),
            ).fetchall()
    except psycopg.Error as error:
        return _database_error(error)

    projects = {}
    for project_id, name, description, status, skill_name in rows:
        item = projects.setdefault(project_id, {
            "id": project_id, "name": name, "description": description,
            "status": status, "skills": [],
        })
        if skill_name and skill_name not in item["skills"]:
            item["skills"].append(skill_name)

    achievements = []
    visitor_progress = {feature: data for feature, data in progress_rows}
    home = _validated_progress("home", visitor_progress["home"]) if "home" in visitor_progress else None
    atlas_data = _validated_progress("atlas", visitor_progress["atlas"]) if "atlas" in visitor_progress else None
    garden = garden_row[0] if garden_row else None
    if home:
        if home["collected"]:
            achievements.append({"source": "home", "label": f"Collected {len(home['collected'])} of 5 dream stars."})
        if home["collectedButterflies"]:
            achievements.append({"source": "home", "label": f"Collected {len(home['collectedButterflies'])} of 2 butterflies."})
    if atlas_data:
        if atlas_data["discovered"]:
            achievements.append({"source": "atlas", "label": f"Recorded {len(atlas_data['discovered'])} constellation discoveries."})
        if atlas_data["puzzleComplete"]:
            achievements.append({"source": "atlas", "label": "Completed the Sleepy Fox star puzzle."})
    lullaby_data = _validated_progress("lullaby", visitor_progress["lullaby"]) if "lullaby" in visitor_progress else None
    if lullaby_data and lullaby_data["bubbles"]:
        achievements.append({"source": "lullaby", "label": f"Saved {len(lullaby_data['bubbles'])} Lullaby Lab dream notes."})
    if garden:
        plants = sum(1 for plot in garden.get("plots", []) if plot)
        friends = len(garden.get("creatures", []))
        wishes = len(garden.get("fulfilled", []))
        if plants:
            achievements.append({"source": "garden", "label": f"Grew {plants} garden flowers."})
        if friends:
            achievements.append({"source": "garden", "label": f"Found {friends} garden friends."})
        if wishes:
            achievements.append({"source": "garden", "label": f"Fulfilled {wishes} garden wishes."})
    return jsonify(projects=list(projects.values()), achievements=achievements), 200
