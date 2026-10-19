import os
import threading
import time
from datetime import datetime
from collections import defaultdict, deque
from pathlib import Path
from flask import Flask, jsonify, request
from dotenv import load_dotenv
import psycopg
from psycopg.types.json import Jsonb

project_root = Path(__file__).resolve().parent.parent
load_dotenv(project_root / ".env")

app = Flask(__name__)
try:
    from .atlas import atlas as atlas_blueprint, owner_required
    from .database import connect_database, database_url
    from .progress import progress as progress_blueprint
except ImportError:  # Support the documented `python app.py` launch from backend/.
    from atlas import atlas as atlas_blueprint, owner_required
    from database import connect_database, database_url
    from progress import progress as progress_blueprint
app.register_blueprint(atlas_blueprint)
app.register_blueprint(progress_blueprint)
app.config["MAX_CONTENT_LENGTH"] = 16 * 1024
GUESTBOOK_NAME_MAX_LENGTH = 60
GUESTBOOK_MESSAGE_MAX_LENGTH = 1000
GUESTBOOK_DEFAULT_LIMIT = 20
GUESTBOOK_MAX_LIMIT = 100
GARDEN_SEEDS = {"moonblush", "sunpocket", "cloudbell", "starfern", "dreamrose"}
GARDEN_CREATURE_SEEDS = {
    "moth": "moonblush",
    "snail": "starfern",
    "sprite": "cloudbell",
    "rabbit": "sunpocket",
    "fox": "dreamrose",
    "bird": "cloudbell",
}
GARDEN_PLOT_COUNT = 5
GUESTBOOK_RATE_LIMIT = 5
GUESTBOOK_RATE_WINDOW_SECONDS = 600
guestbook_requests = defaultdict(deque)
guestbook_rate_lock = threading.Lock()


def database_unavailable():
    app.logger.error("Guestbook database request failed.")
    return jsonify(error="Guestbook is temporarily unavailable."), 503


def garden_database_unavailable(error):
    if isinstance(error, psycopg.errors.UndefinedTable):
        app.logger.error("Garden storage schema is missing; apply the backend migration.")
        message = "Garden storage is not set up yet; a site administrator must apply the backend migration."
    else:
        app.logger.error("Garden database request failed (%s).", type(error).__name__)
        message = "Garden storage is temporarily unavailable."
    return jsonify(error=message), 503


def garden_state_conflict(current):
    return jsonify(
        error="Garden state changed elsewhere; refresh and merge before saving.",
        revision=current[0] if current else 0,
        state=current[1] if current else None,
    ), 409


def validate_garden_state(value):
    if not isinstance(value, dict) or set(value) not in (
        {"version", "plots", "creatures", "plotOwners", "fulfilled"},
        {"version", "plots", "creatures", "plotOwners", "fulfilled", "dreamJournal"},
    ):
        return None
    if type(value["version"]) is not int or value["version"] != 1:
        return None

    plots = value["plots"]
    creatures = value["creatures"]
    owners = value["plotOwners"]
    fulfilled = value["fulfilled"]
    dream_journal = value.get("dreamJournal", [])
    if not isinstance(plots, list) or len(plots) != GARDEN_PLOT_COUNT:
        return None
    if not isinstance(creatures, list) or any(
        not isinstance(creature, str) or creature not in GARDEN_CREATURE_SEEDS
        for creature in creatures
    ) or len(set(creatures)) != len(creatures):
        return None
    if not isinstance(owners, list) or len(owners) != GARDEN_PLOT_COUNT:
        return None
    if not isinstance(fulfilled, list) or any(
        not isinstance(creature, str) or creature not in GARDEN_CREATURE_SEEDS
        for creature in fulfilled
    ) or len(set(fulfilled)) != len(fulfilled):
        return None
    if not isinstance(dream_journal, list) or len(dream_journal) > 20:
        return None
    normalized_journal = []
    for entry in dream_journal:
        if not isinstance(entry, dict) or set(entry) != {"id", "wish", "creature", "createdAt"}:
            return None
        entry_id, wish, creature, created_at = (
            entry["id"], entry["wish"], entry["creature"], entry["createdAt"]
        )
        if (
            not isinstance(entry_id, str) or not entry_id or len(entry_id) > 64
            or not isinstance(wish, str) or not wish.strip() or len(wish) > 250
            or not isinstance(creature, str) or creature not in GARDEN_CREATURE_SEEDS
            or not isinstance(created_at, str)
        ):
            return None
        try:
            datetime.fromisoformat(created_at.replace("Z", "+00:00"))
        except ValueError:
            return None
        normalized_journal.append({
            "id": entry_id, "wish": wish.strip(), "creature": creature, "createdAt": created_at
        })
    if len({entry["id"] for entry in normalized_journal}) != len(normalized_journal):
        return None

    normalized_plots = []
    for plot, owner in zip(plots, owners):
        if owner is not None and (
            not isinstance(owner, str)
            or owner not in GARDEN_CREATURE_SEEDS
            or owner not in creatures
        ):
            return None
        if plot is None:
            if owner is not None:
                return None
            normalized_plots.append(None)
            continue
        if not isinstance(plot, dict) or set(plot) != {"seed", "stage"}:
            return None
        seed = plot["seed"]
        stage = plot["stage"]
        if (
            not isinstance(seed, str)
            or seed not in GARDEN_SEEDS
            or not isinstance(stage, int)
            or isinstance(stage, bool)
            or stage not in (0, 1, 2)
        ):
            return None
        normalized_plots.append({"seed": seed, "stage": stage})

    for creature in fulfilled:
        if creature not in creatures or not any(
            plot is not None
            and plot["stage"] == 2
            and plot["seed"] == GARDEN_CREATURE_SEEDS[creature]
            and owners[index] == creature
            for index, plot in enumerate(normalized_plots)
        ):
            return None

    normalized = {
        "version": 1,
        "plots": normalized_plots,
        "creatures": creatures,
        "plotOwners": owners,
        "fulfilled": fulfilled,
    }
    if "dreamJournal" in value:
        normalized["dreamJournal"] = normalized_journal
    return normalized


def guestbook_rate_limited():
    now = time.monotonic()
    client = request.remote_addr or "unknown"
    with guestbook_rate_lock:
        requests = guestbook_requests[client]
        while requests and now - requests[0] >= GUESTBOOK_RATE_WINDOW_SECONDS:
            requests.popleft()
        if len(requests) >= GUESTBOOK_RATE_LIMIT:
            return True
        requests.append(now)
    return False


@app.after_request
def apply_cors(response):
    origin = request.headers.get("Origin")
    allowed = {
        item.strip()
        for item in os.environ.get(
            "CORS_ALLOWED_ORIGINS",
            "http://127.0.0.1:5500,http://localhost:5500",
        ).split(",")
        if item.strip()
    }
    if origin and origin in allowed:
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, PATCH, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type, X-Admin-Token"
        response.vary.add("Origin")
    return response


@app.errorhandler(413)
def request_too_large(_error):
    return jsonify(error="Request body is too large."), 413


@app.get("/api/health")
def health():
    return jsonify(status="ok", service="dear-pip-api"), 200


@app.get("/api/ready")
def ready():
    connection_url = database_url()
    if not connection_url:
        return jsonify(status="unavailable", database="unavailable"), 503

    required_tables = {
        "guestbook_entries", "garden_states", "atlas_skills", "atlas_projects",
        "atlas_skill_evidence", "atlas_project_skills", "visitor_progress",
    }
    try:
        with connect_database(connection_url) as connection:
            connection.execute("SELECT 1")
    except (psycopg.Error, ValueError):
        return jsonify(status="unavailable", database="unavailable", schema="unchecked"), 503

    try:
        with connect_database(connection_url) as connection:
            rows = connection.execute(
                """SELECT table_name FROM information_schema.tables
                   WHERE table_schema = current_schema() AND table_type = 'BASE TABLE'
                   AND table_name = ANY(%s)""",
                (list(required_tables),),
            ).fetchall()
    except (psycopg.Error, ValueError):
        app.logger.error("Database readiness schema check failed.")
        return jsonify(status="unavailable", database="available", schema="unchecked"), 503
    missing = sorted(required_tables - {row[0] for row in rows})
    if missing:
        return jsonify(
            status="not_ready", database="available", schema="missing_tables",
            missing_tables=missing,
        ), 503

    return jsonify(status="ok", database="available", schema="ready"), 200


@app.get("/api/guestbook/pending")
@owner_required
def list_pending_guestbook_entries():
    connection_url = database_url()
    if not connection_url:
        return database_unavailable()
    try:
        with connect_database(connection_url) as connection:
            rows = connection.execute(
                """SELECT id, display_name, dream_message, created_at
                   FROM guestbook_entries WHERE status = %s
                   ORDER BY created_at ASC, id ASC LIMIT 100""",
                ("pending",),
            ).fetchall()
    except psycopg.errors.UndefinedTable:
        app.logger.error("Guestbook table is missing; apply migration 001_garden_state.sql.")
        return jsonify(error="Guestbook storage is not set up yet."), 503
    except psycopg.Error as error:
        app.logger.error("Pending guestbook query failed (%s).", type(error).__name__)
        return database_unavailable()
    return jsonify(entries=[
        {
            "id": row[0], "display_name": row[1],
            "dream_message": row[2], "created_at": row[3].isoformat(),
        }
        for row in rows
    ]), 200


@app.patch("/api/guestbook/<int:entry_id>/moderation")
@owner_required
def moderate_guestbook_entry(entry_id):
    if not request.is_json:
        return jsonify(error="A JSON request body is required."), 400
    payload = request.get_json(silent=True)
    if (
        not isinstance(payload, dict) or set(payload) != {"status"}
        or not isinstance(payload["status"], str)
        or payload["status"] not in {"approved", "rejected"}
    ):
        return jsonify(error="Choose approved or rejected."), 400
    connection_url = database_url()
    if not connection_url:
        return database_unavailable()
    try:
        with connect_database(connection_url) as connection:
            row = connection.execute(
                """UPDATE guestbook_entries SET status = %s
                   WHERE id = %s AND status = 'pending'
                   RETURNING id, status, created_at""",
                (payload["status"], entry_id),
            ).fetchone()
            if row is None:
                exists = connection.execute(
                    "SELECT 1 FROM guestbook_entries WHERE id = %s", (entry_id,)
                ).fetchone()
    except psycopg.errors.UndefinedTable:
        app.logger.error("Guestbook table is missing; apply migration 001_garden_state.sql.")
        return jsonify(error="Guestbook storage is not set up yet."), 503
    except psycopg.Error as error:
        app.logger.error("Guestbook moderation failed (%s).", type(error).__name__)
        return database_unavailable()
    if row is None:
        if exists is None:
            return jsonify(error="Guestbook entry not found."), 404
        return jsonify(error="Only pending entries can be moderated."), 409
    return jsonify(entry={"id": row[0], "status": row[1], "created_at": row[2].isoformat()}), 200


@app.get("/api/guestbook")
def list_guestbook_entries():
    raw_limit = request.args.get("limit", str(GUESTBOOK_DEFAULT_LIMIT))
    try:
        limit = int(raw_limit)
    except ValueError:
        return jsonify(error="Limit must be an integer from 1 to 100."), 400
    if not 1 <= limit <= GUESTBOOK_MAX_LIMIT:
        return jsonify(error="Limit must be an integer from 1 to 100."), 400

    connection_url = database_url()
    if not connection_url:
        return database_unavailable()

    try:
        with connect_database(connection_url) as connection:
            rows = connection.execute(
                """
                SELECT id, display_name, dream_message, created_at
                FROM guestbook_entries
                WHERE status = %s
                ORDER BY created_at DESC, id DESC
                LIMIT %s
                """,
                ("approved", limit),
            ).fetchall()
    except psycopg.errors.UndefinedTable:
        app.logger.error("Guestbook table is missing; verify its database schema.")
        return jsonify(error="Guestbook storage is not set up yet. Please contact the site administrator."), 503
    except (psycopg.Error, ValueError) as error:
        app.logger.error("Guestbook list failed (%s).", type(error).__name__)
        return jsonify(error="Guestbook is temporarily unavailable."), 503

    return jsonify(entries=[
        {
            "id": row[0],
            "display_name": row[1],
            "dream_message": row[2],
            "created_at": row[3].isoformat(),
        }
        for row in rows
    ]), 200


@app.post("/api/guestbook")
def submit_guestbook_entry():
    if not request.is_json:
        return jsonify(error="A JSON request body is required."), 400
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return jsonify(error="A JSON object is required."), 400

    dream_message = payload.get("dream_message")
    if not isinstance(dream_message, str):
        return jsonify(error="Dream message must be a string."), 400
    dream_message = dream_message.strip()
    if not dream_message:
        return jsonify(error="Dream message is required."), 400
    if len(dream_message) > GUESTBOOK_MESSAGE_MAX_LENGTH:
        return jsonify(error="Dream message must be 1000 characters or fewer."), 400

    display_name = payload.get("display_name")
    if display_name is not None and not isinstance(display_name, str):
        return jsonify(error="Display name must be a string."), 400
    if isinstance(display_name, str):
        display_name = display_name.strip() or None
        if display_name and len(display_name) > GUESTBOOK_NAME_MAX_LENGTH:
            return jsonify(error="Display name must be 60 characters or fewer."), 400

    connection_url = database_url()
    if not connection_url:
        return database_unavailable()
    if guestbook_rate_limited():
        return jsonify(error="Please wait a little while before sending another dream."), 429

    try:
        with connect_database(connection_url) as connection:
            row = connection.execute(
                """
                INSERT INTO guestbook_entries (display_name, dream_message, status)
                VALUES (%s, %s, %s)
                RETURNING id, status, created_at
                """,
                (display_name, dream_message, "pending"),
            ).fetchone()
    except psycopg.errors.UndefinedTable:
        app.logger.error("Guestbook table is missing; apply the backend migration.")
        return jsonify(error="Guestbook storage is not set up yet. Please try again later."), 503
    except (psycopg.Error, ValueError) as error:
        app.logger.error("Guestbook submission failed (%s).", type(error).__name__)
        return jsonify(error="Guestbook is temporarily unavailable."), 503

    return jsonify(
        message="Your dream was received and is awaiting review.",
        entry={
            "id": row[0],
            "status": row[1],
            "created_at": row[2].isoformat(),
        },
    ), 201


@app.get("/api/garden/state/<uuid:visitor_id>")
def get_garden_state(visitor_id):
    connection_url = database_url()
    if not connection_url:
        return jsonify(error="Garden storage is temporarily unavailable."), 503
    try:
        with connect_database(connection_url) as connection:
            row = connection.execute(
                "SELECT revision, state FROM garden_states WHERE visitor_id = %s",
                (visitor_id,),
            ).fetchone()
    except psycopg.Error as error:
        return garden_database_unavailable(error)
    if row is None:
        return jsonify(state=None, revision=0), 200
    return jsonify(state=row[1], revision=row[0]), 200


@app.put("/api/garden/state/<uuid:visitor_id>")
def put_garden_state(visitor_id):
    if request.content_length and request.content_length > 12 * 1024:
        return jsonify(error="Garden state is too large."), 413
    if not request.is_json:
        return jsonify(error="A JSON request body is required."), 400
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict) or set(payload) != {"revision", "state"}:
        return jsonify(error="A revision and Garden state are required."), 400
    expected_revision = payload["revision"]
    if (
        not isinstance(expected_revision, int)
        or isinstance(expected_revision, bool)
        or expected_revision < 0
    ):
        return jsonify(error="Revision must be a non-negative integer."), 400
    state = validate_garden_state(payload["state"])
    if state is None:
        return jsonify(error="Garden state is invalid."), 400
    connection_url = database_url()
    if not connection_url:
        return jsonify(error="Garden storage is temporarily unavailable."), 503

    revision = None
    current = None
    try:
        with connect_database(connection_url) as connection:
            current = connection.execute(
                "SELECT revision, state FROM garden_states WHERE visitor_id = %s FOR UPDATE",
                (visitor_id,),
            ).fetchone()
            if current is None and expected_revision == 0:
                inserted = connection.execute(
                    """
                    INSERT INTO garden_states (visitor_id, revision, state)
                    VALUES (%s, 1, %s)
                    ON CONFLICT (visitor_id) DO NOTHING
                    RETURNING revision
                    """,
                    (visitor_id, Jsonb(state)),
                ).fetchone()
                if inserted is not None:
                    revision = inserted[0]
                else:
                    current = connection.execute(
                        "SELECT revision, state FROM garden_states WHERE visitor_id = %s",
                        (visitor_id,),
                    ).fetchone()
            elif current is not None and current[0] == expected_revision:
                updated = connection.execute(
                    """
                    UPDATE garden_states
                    SET revision = revision + 1, state = %s, updated_at = CURRENT_TIMESTAMP
                    WHERE visitor_id = %s AND revision = %s
                    RETURNING revision
                    """,
                    (Jsonb(state), visitor_id, expected_revision),
                ).fetchone()
                revision = updated[0] if updated else None
                if revision is None:
                    current = connection.execute(
                        "SELECT revision, state FROM garden_states WHERE visitor_id = %s",
                        (visitor_id,),
                    ).fetchone()
            else:
                revision = None
    except psycopg.Error as error:
        return garden_database_unavailable(error)

    if revision is not None:
        return jsonify(revision=revision), 200
    return garden_state_conflict(current)


def run_server():
    render_port = os.environ.get("PORT")
    app.run(
        host="0.0.0.0" if render_port else "127.0.0.1",
        port=int(render_port or 5000),
        debug=not bool(render_port),
    )


if __name__ == "__main__":
    run_server()
