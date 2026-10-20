# Dear Pip API

## Local environment

The Flask app reads `DATABASE_URL` from the project-root `.env` through
`python-dotenv`. Keep credentials in that ignored file locally and in Render
environment settings in production. Never place database credentials in the
frontend or commit them.

Set `CORS_ALLOWED_ORIGINS` to a comma-separated list of exact frontend origins.
For local Live Server, the default allows `http://127.0.0.1:5500` and
`http://localhost:5500`. The Garden preserves the frontend hostname when
selecting its local API host so both services remain same-site. For a deployed
frontend, configure the exact origin explicitly. The Dream Garden API base can
be set in its `dear-pip-api-base` meta element; blank uses localhost only when
the page itself is served from localhost, and otherwise uses the same origin.

Set a stable, random `SESSION_SECRET` of at least 32 characters in the ignored
project-root `.env` and in the backend's private deployment settings. Flask uses
it to sign the HTTP-only Garden session cookie; changing it invalidates existing
sessions. Never expose it in frontend code or logs. `SESSION_COOKIE_SECURE`
defaults to false locally and true when `PORT` or `APP_ENV=production` is set.
Use `SESSION_COOKIE_SAMESITE=Lax` when the frontend and API are same-site. Only
use `SESSION_COOKIE_SAMESITE=None` with `SESSION_COOKIE_SECURE=true` when a
separately hosted frontend truly requires cross-site cookies.

Run the Flask API from the `backend/` directory in PowerShell:

```powershell
Set-Location .\backend
..\.venv\Scripts\Activate.ps1
python .\app.py
```

Install dependencies from that same directory if needed:

```powershell
python -m pip install -r .\requirements.txt
```

Serve `frontend/` using VS Code Live Server over HTTP, not `file://`. The
browser requests a session from Flask; Flask generates the visitor UUID and
stores it in its signed, HTTP-only cookie. The Garden API accepts no visitor ID
from the URL or request body and requires the cookie for private state reads
and writes. State-changing Garden requests also require an exact trusted
`Origin`. No login, fingerprinting, or personal profile is used.

## Database migrations

Migrations are additive and safe to re-run; they do not drop or truncate data.
Migration `001_garden_state.sql` creates Garden state storage, the guestbook
table if absent, and its approved-entry index. Migration `002_atlas.sql` creates Dream Atlas skills, evidence, project,
and project-skill relationship tables, then adds the verified Dear Pip project
record without a repository URL. It leaves existing project details unchanged.
If `guestbook_entries` already exists, ensure it has `id`, `display_name`,
`dream_message`, `status`, and `created_at` columns before applying migration 001.
Migration `003_visitor_progress.sql` adds revisioned progress for home, Atlas,
bedtime reading, and Lullaby Lab notes.

No schema migration is needed for server-validated Garden sessions: the
existing `garden_states.visitor_id` UUID key stores the server-generated
identity. Existing rows keyed by browser-generated UUIDs are left untouched and
are not treated as authenticated sessions. If the original browser still has
its local Garden backup, the frontend can sync that local progress into its new
server-issued session. Legacy database rows are never exposed by supplying
their old UUID.

Set `DATABASE_URL` privately in the current PowerShell session, then from the
repository root run:

```powershell
& 'C:\Program Files\PostgreSQL\18\bin\psql.exe' "$env:DATABASE_URL" -v ON_ERROR_STOP=1 -f .\backend\migrations\001_garden_state.sql
& 'C:\Program Files\PostgreSQL\18\bin\psql.exe' "$env:DATABASE_URL" -v ON_ERROR_STOP=1 -f .\backend\migrations\002_atlas.sql
& 'C:\Program Files\PostgreSQL\18\bin\psql.exe' "$env:DATABASE_URL" -v ON_ERROR_STOP=1 -f .\backend\migrations\003_visitor_progress.sql
```

Do not paste credentials into source files or share terminal output that includes
the connection URL. On Render, use the PostgreSQL connection URL from the
attached database and apply the same migration once before enabling Garden sync.

## Render web service

Create a Python web service with `backend` as its root directory. Use
`pip install -r requirements.txt` as the build command and
`waitress-serve --listen=0.0.0.0:$PORT app:app` as the recommended start command.
The `python app.py` entry point also binds to `0.0.0.0` and the supplied `PORT`
when that variable is present, while keeping local development on
`127.0.0.1:5000`. Configure
`DATABASE_URL` with the Render PostgreSQL URL and set `CORS_ALLOWED_ORIGINS` to
the exact deployed frontend origin when the frontend is hosted separately.
Render supplies `PORT`; the Flask development server is only for local use.

If the frontend and API have different origins, set the
`dear-pip-api-base` meta element in `frontend/dream-garden.html` to the deployed
API base URL and `CORS_ALLOWED_ORIGINS` to the exact frontend origin.
Credentialed CORS never uses a wildcard. For HTTPS production, set
`SESSION_COOKIE_SECURE=true` and a stable `SESSION_SECRET`; keep SameSite=Lax
when both services share a site. If they are on different sites, SameSite=None
is required, but browser third-party-cookie blocking can still prevent the
session from working. A same-site deployment (for example, routing `/api`
through the frontend host or using frontend/API subdomains under one site) is
the robust option.

## API

- `GET /api/health` checks the Flask process.
- `GET /api/ready` distinguishes unavailable PostgreSQL from missing required
  schema and invalid session configuration; it reports only readiness and
  missing table names, never connection settings.
- `GET /api/garden/session` creates a server-generated anonymous visitor
  identity and sets a signed, HTTP-only, one-year session cookie. It does not
  return the identity in the response body.
- `GET /api/garden/state` loads state for the cookie-bound session or returns
  `state: null`, `revision: 0` for a new visitor.
- `PUT /api/garden/state` creates or updates version-1 Garden state for the
  cookie-bound session with an optimistic `revision`; a stale revision returns
  HTTP 409 and that session's current state for a safe merge. Requests require
  a trusted `Origin`; client-supplied visitor IDs are not accepted. The optional
  `creatureLayout` state map stores validated per-visitor animal positions
  (0–100 percent) and scale (0.65–1.5) in the existing JSONB state column; it
  does not require a database migration. The legacy `sprite` ID remains accepted
  only to keep previously saved Garden records readable.
- `GET /api/garden/wish-counts` returns public totals by guardian ID from
  currently persisted private-wish records. It never returns wish text or
  visitor identifiers.
- `GET /api/guestbook?limit=20` returns approved entries only (limit 1–100).
- `POST /api/guestbook` accepts `display_name` (optional, up to 60 characters)
  and `dream_message` (required, up to 1000 characters); entries remain pending.
- `GET /api/guestbook/pending` and
  `PATCH /api/guestbook/<id>/moderation` require the owner token; moderation
  changes only a pending record to `approved` or `rejected`.
- `GET /api/skills` and `GET /api/projects` return public Atlas records;
  `GET /api/skills/<id>` and `GET /api/projects/<id>` return individual records.
- `POST /api/atlas/owner/unlock`, `POST /api/atlas/scan/preview`,
  `POST /api/atlas/scan/import`, `POST /api/skills`, and `POST /api/projects`
  require `X-Admin-Token` and the private `ATLAS_ADMIN_TOKEN` setting. Owner
  management remains disabled until a token of at least 32 characters is set.

Anonymous sessions are not accounts and cannot be recovered after the browser
cookie is cleared or expires. A valid signed session cookie is a bearer
credential; protect it with HTTPS in production. Public guardian wish totals
remain aggregate counts and never include wish text or visitor identifiers.

The repository preview scans only the directory containing this installation.
It accepts no browser path, executes no source, and skips `.env`, hidden files,
credential and private-key files, dependency trees, generated output, and binary
assets. Results contain technology names and relative evidence references, not
source excerpts. Import rescans and accepts only selected findings still
present in the configured repository. Detection records repository presence;
it does not assign proficiency.

For local use, add a randomly generated secret of at least 32 characters to the
ignored project-root `.env` as `ATLAS_ADMIN_TOKEN=...`. Keep it private and use
HTTPS in production. The Dream Atlas sends it only in an API request header,
keeps it in memory for the current tab, and never writes it to browser storage.
Set `dear-pip-api-base` in `frontend/dream-atlas.html` for a separately hosted
API and allow the frontend's exact origin in `CORS_ALLOWED_ORIGINS`.

Rate limiting is in-memory per
application process, so production deployments with multiple workers/instances
should add shared rate limiting before broad public launch.

If merging local and server Garden progress would require more than the five
available plots, the current device's local Garden is retained and the server
copy is left unchanged rather than discarding either side. The two versions
will need to be reconciled before their progress can be combined.

## Tests

From the repository root:

```powershell
.\.venv\Scripts\python.exe -m unittest discover -s backend\tests -v
```

The default tests mock Psycopg calls and do not connect to the configured
database. An explicitly opt-in integration test exercises PostgreSQL-backed
Garden persistence across Flask process restarts using the same signed cookie
and guestbook moderation against a separate test database.
Set `DEAR_PIP_TEST_DATABASE_URL` only to an isolated database with migrations
001–003 applied, then run:

```powershell
$env:DEAR_PIP_TEST_DATABASE_URL = '<isolated test database URL>'
..\.venv\Scripts\python.exe -B -m unittest backend.tests.test_postgres_integration -v
Remove-Item Env:DEAR_PIP_TEST_DATABASE_URL
```

The integration test creates temporary rows with unique identifiers and deletes
only those rows during cleanup. Do not point it at production or a database
whose data must remain untouched. The default suite does not prove live
PostgreSQL behavior; run the integration test to verify the isolated database.

## Visitor progress and story context

The visitor UUID is the opaque UUID already used by Garden state. It is stored
in browser localStorage and is not an authentication credential. `GET` and
`PUT /api/progress/<visitor_uuid>/<feature>` support `home`, `atlas`,
`bedtime`, and `lullaby`; writes use revisions and return HTTP 409 on stale
updates. Local values remain as a fallback/cache. `GET
/api/stories/context/<visitor_uuid>` returns verified project/skill names and
saved milestones; story prose remains authored fiction.

## Which pages use the API

The Dream Garden, Dream Atlas, and visitor progress features use the Flask API.
The static Workshop shows only verified project information. No payment or
external AI story provider is configured in this repository.

The guestbook has no visitor-facing moderation interface. An authorized
operator can review pending entries through the protected API. Its current rate
limit is in-memory per application process, not shared across Render workers or
instances.
