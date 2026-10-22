# Dear Pip — Midnight Nursery

The project is split into a static frontend and a Flask API:

```text
frontend/   Website HTML, CSS, JavaScript, and assets
backend/    Flask app, requirements, SQL migrations, and tests
.env        Local server-only settings (ignored by Git)
.gitignore
.venv/      Local Python environment (not part of either application folder)
```

## The nursery pages

- `frontend/index.html` is the Midnight Nursery home, with a persistent night/dawn
  mood, keyboard-friendly star collection, and a direct page directory.
- `frontend/dreamworld.html` is the responsive hub linking every room.
- `frontend/workshop.html` lists only the verified Dear Pip project currently
  present in this repository. Repository/demo links and personal credentials
  are omitted until verified details are supplied.
- `frontend/dream-garden.html` contains the Garden, the separate guestbook, and
  PostgreSQL sync with localStorage fallback.
- `frontend/dream-atlas.html` contains fictional constellation discoveries plus
  technology notes linked to evidence in this project's code.
- `frontend/bedtime-stories.html` is a branching fictional story with local
  reading progress.
- `frontend/lullaby-lab.html` makes procedural tones after an explicit start,
  with device-local dream bubbles and a small listening game.

The Dream Garden, Dream Atlas, and visitor progress for home stars, constellation
discoveries, bedtime reading, and Lullaby Lab notes use the Flask API with
browser-local fallback/cache. Dream Garden private state uses a server-issued,
signed HTTP-only session cookie. The separate cross-page visitor-progress API
still uses an opaque browser UUID and is not an authenticated account. Story
context uses verified project and skill names plus saved milestones; the stories
themselves remain authored fiction.

The Dreamworld progressively loads Three.js r180 from jsDelivr and builds its
islands, portals, sky, and lights from geometry at runtime. It requires a
WebGL-capable browser and network access to that pinned CDN URL; when either is
unavailable, its embedded illustrated map and room controls remain available.
No 3D model files or frontend build step are required.

## Run locally

### Flask API

From a PowerShell terminal at the project root:

```powershell
Set-Location .\backend
..\.venv\Scripts\Activate.ps1
python .\app.py
```

The API listens on `http://127.0.0.1:5000`. Install backend packages when
needed, from the `backend/` directory:

```powershell
python -m pip install -r .\requirements.txt
```

### Static website with VS Code Live Server

Open the frontend folder in VS Code, then start Live Server from
`frontend/index.html`:

```powershell
code .\frontend
```

In VS Code, use **Live Server: Open with Live Server**. The frontend must be
served from `frontend/` over HTTP (normally `http://127.0.0.1:5500`), not
opened as a `file://` URL. The backend's local CORS defaults allow the standard
Live Server `localhost` and `127.0.0.1` origins.

Keep `DATABASE_URL` in the ignored project-root `.env`; never put it in
frontend code. Flask resolves this file relative to `backend/app.py`, so its
working directory does not affect local environment loading.

Add a stable, random `SESSION_SECRET` with at least 32 characters to that same
`.env` file for the signed, HTTP-only Garden session cookie. Keep the secret
private and unchanged across API restarts so the browser session remains valid.
Local cookie defaults are HTTP-compatible and use SameSite=Lax.

Dream Atlas owner management also requires a private `ATLAS_ADMIN_TOKEN` with
at least 32 characters in that ignored `.env`; see `backend/README.md` for its
protected API, scanner limits, and manual-entry workflow.

## Database setup and tests

Apply the non-destructive, rerunnable migrations manually before using the
database-backed features. Migration 003 adds revisioned visitor progress and
does not alter Atlas records. Migrations 004 and 005 create the shared journal
and add the Lullaby Lab discovery event types while retaining historical
entries. From the project root:

```powershell
& 'C:\Program Files\PostgreSQL\18\bin\psql.exe' "$env:DATABASE_URL" -v ON_ERROR_STOP=1 -f .\backend\migrations\001_garden_state.sql
& 'C:\Program Files\PostgreSQL\18\bin\psql.exe' "$env:DATABASE_URL" -v ON_ERROR_STOP=1 -f .\backend\migrations\002_atlas.sql
& 'C:\Program Files\PostgreSQL\18\bin\psql.exe' "$env:DATABASE_URL" -v ON_ERROR_STOP=1 -f .\backend\migrations\003_visitor_progress.sql
& 'C:\Program Files\PostgreSQL\18\bin\psql.exe' "$env:DATABASE_URL" -v ON_ERROR_STOP=1 -f .\backend\migrations\004_public_journal.sql
& 'C:\Program Files\PostgreSQL\18\bin\psql.exe' "$env:DATABASE_URL" -v ON_ERROR_STOP=1 -f .\backend\migrations\005_public_journal_discoveries.sql
& 'C:\Program Files\PostgreSQL\18\bin\psql.exe' "$env:DATABASE_URL" -v ON_ERROR_STOP=1 -f .\backend\migrations\006_public_journal_details.sql
```

The migration does not run at app startup. Do not include a real database URL
in shell history, source files, screenshots, or shared logs.

Run the mocked backend tests from the project root; they do not connect to the
configured database:

```powershell
.\.venv\Scripts\python.exe -B -m unittest discover -s backend\tests -v
```

The optional real-PostgreSQL integration test is separate. Follow the isolated
test-database instructions in [backend/README.md](backend/README.md); never point
it at production.

For backend environment variables, API details, privacy notes, and Render
service settings, see [backend/README.md](backend/README.md).

There are no checked-in Vercel, Render, or other hosting configuration files.
For a static frontend host, publish `frontend/`. For the Render Python web
service, set its root directory to `backend/` and configure server variables
privately in the hosting dashboard. A separately hosted frontend must set the
`dear-pip-api-base` meta element in `frontend/dream-garden.html` to the deployed
API base URL and configure the backend's allowed frontend origin.

For the Render service use `pip install -r requirements.txt` as the build
command and `waitress-serve --listen=0.0.0.0:$PORT app:app` as the start command.
Set `DATABASE_URL` to the hosted PostgreSQL connection string and
`CORS_ALLOWED_ORIGINS` to the exact static frontend origin. Set the Garden page's
`dear-pip-api-base` meta content to the backend origin when the two are hosted
separately. Also set a stable random `SESSION_SECRET` (at least 32 characters)
and `SESSION_COOKIE_SECURE=true`. Keep SameSite=Lax for same-site deployments;
cross-site hosting needs SameSite=None and Secure cookies, which can still be
blocked by browser third-party-cookie restrictions. Do not add database or
session secrets to frontend code.
