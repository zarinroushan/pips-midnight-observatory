# Dear Pip — Midnight Observatory

Dear Pip is a storybook-style interactive web experience built around Pip and a collection of dreamy rooms. It combines a static HTML/CSS/JavaScript frontend with a Flask API and PostgreSQL-backed persistence for selected features.

The experience is designed as an interactive world rather than a conventional portfolio page: visitors enter through the Midnight Nursery, explore Dreamworld, and open rooms for projects, garden activities, constellations, stories, and gentle sound experiments.

## Project structure

```text
project-root/
├── README.md
├── .gitignore
├── .env                         # Local secrets; ignored by Git
├── .venv/                       # Local Python environment; not deployed
├── frontend/
│   ├── index.html               # Midnight Nursery
│   ├── dreamworld.html          # Room-selection hub and island map
│   ├── workshop.html            # Project/workshop page
│   ├── dream-garden.html        # Garden, wishes, guardians, guestbook
│   ├── dream-atlas.html         # Constellations and technical notes
│   ├── bedtime-stories.html     # Branching story experience
│   ├── lullaby-lab.html         # Soundscape and listening game
│   ├── style.css                # Shared and page-specific styles
│   ├── *.js                     # Page logic and shared utilities
│   └── assets/                  # Images, animation files, and media
└── backend/
    ├── app.py                   # Flask API
    ├── requirements.txt
    ├── README.md                # API, environment, privacy, deployment
    ├── migrations/              # PostgreSQL schema migrations
    └── tests/                   # Backend tests
```

Keep `.env`, database URLs, session secrets, and admin tokens out of frontend files and version control. The `.venv/` directory is for local development only.

## The rooms

- **Midnight Nursery (`frontend/index.html`)** — Entry experience with a velvet-curtain intro, theme and sound controls, interactive Pip, and a portal transition into Dreamworld. Pip uses Rive when the runtime and asset load; a fallback presentation is available if they do not.
- **Dreamworld (`frontend/dreamworld.html`)** — Room-selection hub with an interactive island/map scene, destination controls, Pip's dialogue, and room previews.
- **Workshop (`frontend/workshop.html`)** — Presents the project information verified in the repository. Avoid adding unverified repository links, demos, or credentials.
- **Dream Garden (`frontend/dream-garden.html`)** — Seed selection, planting, five garden guardians and their stories, saved wishes, journal features, and a separate guestbook. Selected state can sync through Flask, with browser-local storage used as a fallback/cache.
- **Dream Atlas (`frontend/dream-atlas.html`)** — Fictional constellation discoveries paired with technical notes. Story elements are imaginative; technical claims should be supported by the implementation.
- **Bedtime Stories (`frontend/bedtime-stories.html`)** — Branching fictional stories with browser-local reading progress.
- **Lullaby Lab (`frontend/lullaby-lab.html`)** — Procedural sound controls that start after user interaction, browser-local dream bubbles, and a small listening game.

The guided tour is shared across supported pages through `frontend/pip-tour.js` and its CSS rules. Tour step wording and descriptions can be edited there. Check a page's script includes before adding the tour to another page; the homepage may intentionally use its own intro.

## Pip: images, Rive, and 3D

Pip appears in different visual formats. These assets serve different purposes and are not interchangeable.

### 2D images and illustrations

Images are stored under `frontend/assets/`, including the main Pip artwork and page-specific illustrations. The Dream Garden uses guardian images in `frontend/assets/garden-animals/`. HTML and CSS position and scale these images. When replacing an asset, preserve its filename/path or update every reference.

### Rive animation

The homepage's animated 2D Pip integration references `frontend/assets/pip-body.riv`. `frontend/script.js` handles Rive loading/playback, while `frontend/style.css` controls canvas sizing and fallback appearance. The `.riv` file is distinct from both the PNG illustrations and the 3D model. If the asset changes, verify that the Rive runtime can load it and that the expected artboard, animation, or state-machine names exist.

### 3D model in Dreamworld

Dreamworld's separate Three.js scene references `frontend/assets/animated_pip.glb`. The integration is implemented in `frontend/dreamworld-3d.js`, with page structure and fallback/map controls in `frontend/dreamworld.html` and styling in `frontend/style.css`.

- The `.glb` is a bundled 3D character model, separate from the `.riv` animation and 2D images.
- Three.js renders the interactive scene, including islands/portals, lighting, and Pip. The 3D scene code selects and plays animation clips available in the GLB.
- Three.js is progressively loaded from a pinned jsDelivr URL. The full scene requires a WebGL-capable browser and access to that CDN. The illustrated map and room controls provide a fallback if 3D initialization fails.
- Keep the GLB at the path expected by the loader, or update the model URL in `dreamworld-3d.js`. After changing the model or clips, verify scale, orientation, floor contact, looping, and desktop/mobile behavior.

The model has been worked on through a 3D modelling and rigging workflow involving Blender and generated/downloaded model assets. Intermediate exports or skeleton files kept outside the deployed `frontend/assets/` directory are not automatically used by the website: only files referenced by the running code are runtime dependencies.

### Asset checklist

Before committing or deploying asset changes:
1. Confirm the referenced image, `.riv`, or `.glb` exists at the expected path and is included in the deployment.
2. Match filename casing exactly, especially for Linux hosting.
3. Check browser Network/Console panels for 404, CORS, or decoding errors.
4. Verify Rive artboard/animation names and GLB animation clips against the relevant JavaScript.
5. Test the fallback if an external runtime or the 3D scene cannot load.

## Frontend technologies

- HTML for page structure and accessible controls.
- CSS for themes, responsive layout, animation, cards, dialogs, and pop-ups.
- Vanilla JavaScript for navigation, interaction, page state, browser storage, audio, tours, and API calls.
- Rive Web runtime for animated 2D Pip where integrated.
- Three.js for Dreamworld's 3D scene and GLB model.
- `localStorage` and `sessionStorage` for selected local progress and transition state.

The frontend is static and does not currently require a Node build step. Serve it over HTTP rather than opening it as a `file://` URL.

## Backend and persistence

The Flask API lives in `backend/` and uses PostgreSQL for supported shared/server-backed features. Frontend and API can be hosted separately.

- Supported Garden and Atlas features use API endpoints backed by the configured database.
- Visitor progress for supported features uses the API with browser-local fallback/cache. The opaque browser UUID used by visitor progress is not an authenticated account.
- Dream Garden private state uses a server-issued, signed HTTP-only session cookie.
- Some reading progress, sound preferences, and dream bubbles may remain local to the browser and are not necessarily synced across devices.
- Database schema changes are applied through SQL migrations; the API does not automatically run migrations at startup.

See [`backend/README.md`](backend/README.md) for endpoint details, environment variables, privacy/security behavior, migrations, tests, and Render settings.

## Run locally

### 1. Start Flask

From a PowerShell terminal at the project root:

```powershell
Set-Location .\backend
..\.venv\Scripts\Activate.ps1
python .\app.py
```

The API listens at `http://127.0.0.1:5000` by default. If dependencies are missing, install them from `backend/`:

```powershell
python -m pip install -r .\requirements.txt
```

### 2. Serve the frontend

Open the frontend folder in VS Code:

```powershell
code .\frontend
```

Open `frontend/index.html` and choose **Live Server: Open with Live Server**. A typical address is `http://127.0.0.1:5500`. The backend's local CORS defaults allow the standard `localhost` and `127.0.0.1` Live Server origins.

Some page scripts detect a local frontend and use `http://127.0.0.1:5000` for the API. When frontend and API are hosted separately, configure the relevant `dear-pip-api-base` meta element and allow the exact frontend origin in backend CORS settings.

### 3. Local secrets

Keep these server-side settings in the ignored project-root `.env` file, as applicable:

- `DATABASE_URL` — PostgreSQL connection string.
- `SESSION_SECRET` — stable random secret of at least 32 characters for signed session cookies.
- `ATLAS_ADMIN_TOKEN` — private token of at least 32 characters for protected Atlas owner-management operations.

Flask loads the project-root `.env` relative to `backend/app.py`, so starting from `backend/` does not require moving the file. Keep secrets out of shell history, screenshots, logs, commits, and frontend code. Changing `SESSION_SECRET` invalidates existing signed sessions.

## PostgreSQL migrations

Apply migrations manually before using database-backed features. Back up important data and verify `DATABASE_URL` before applying migrations to a production database. The current sequence is:

```powershell
& 'C:\Program Files\PostgreSQL\18\bin\psql.exe' "$env:DATABASE_URL" -v ON_ERROR_STOP=1 -f .\backend\migrations\001_garden_state.sql
& 'C:\Program Files\PostgreSQL\18\bin\psql.exe' "$env:DATABASE_URL" -v ON_ERROR_STOP=1 -f .\backend\migrations\002_atlas.sql
& 'C:\Program Files\PostgreSQL\18\bin\psql.exe' "$env:DATABASE_URL" -v ON_ERROR_STOP=1 -f .\backend\migrations\003_visitor_progress.sql
& 'C:\Program Files\PostgreSQL\18\bin\psql.exe' "$env:DATABASE_URL" -v ON_ERROR_STOP=1 -f .\backend\migrations\004_public_journal.sql
& 'C:\Program Files\PostgreSQL\18\bin\psql.exe' "$env:DATABASE_URL" -v ON_ERROR_STOP=1 -f .\backend\migrations\005_public_journal_discoveries.sql
& 'C:\Program Files\PostgreSQL\18\bin\psql.exe' "$env:DATABASE_URL" -v ON_ERROR_STOP=1 -f .\backend\migrations\006_public_journal_details.sql
```

Adjust the PostgreSQL executable path if needed. Never run integration tests against production.

## Tests and checks

Run mocked backend tests from the project root; these should not connect to the configured database:

```powershell
.\.venv\Scripts\python.exe -B -m unittest discover -s backend\tests -v
```

The optional real-PostgreSQL integration test is separate. Follow the isolated test-database instructions in [`backend/README.md`](backend/README.md).

If Node.js is installed, check frontend JavaScript syntax:

```powershell
Get-ChildItem .\frontend -Filter *.js -File | ForEach-Object { node --check $_.FullName }
```

Also test theme switching, navigation, guided-tour steps, dialogs/pop-ups, keyboard focus, API fallback behavior, Rive loading, and Dreamworld's 3D-to-illustrated fallback in a browser.

## Deployment

### Static frontend

Publish the contents of `frontend/` to a static host. Include the full `assets/` directory and every referenced CSS/JS file. If the host publishes the repository root instead, the root redirect page can route visitors to `frontend/index.html`; confirm the host's configured publish directory.

### Render Flask service

- **Root directory:** `backend/`
- **Build command:** `pip install -r requirements.txt`
- **Start command:** `waitress-serve --listen=0.0.0.0:$PORT app:app`
- Set `DATABASE_URL`, `CORS_ALLOWED_ORIGINS`, `SESSION_SECRET`, and other backend settings privately in the hosting dashboard.
- Use `SESSION_COOKIE_SECURE=true` on HTTPS hosting.
- Configure the frontend API-base meta element with the deployed API origin when frontend and backend are separate.

For cross-site frontend/API hosting, cookie behavior depends on browser third-party-cookie policies. Configure SameSite and Secure deliberately and consult `backend/README.md`. Never place database credentials, session secrets, or the Atlas admin token in frontend code. This README does not assume that Vercel, Render, or other hosting configuration files are checked into the repository; verify actual provider settings separately.

## Where to edit things

- **Page text and structure:** the relevant `.html` file in `frontend/`.
- **Shared styling, cards, pop-ups, dialogs, responsive rules:** `frontend/style.css`. Search for the class and check later override blocks before adding CSS.
- **Homepage interactions and Rive playback:** `frontend/script.js`.
- **Dreamworld dialogue, map, and destination selection:** `frontend/dreamworld.js` and `frontend/dreamworld.html`.
- **Dreamworld 3D scene and GLB animation:** `frontend/dreamworld-3d.js`.
- **Garden mechanics and guardian descriptions:** `frontend/dream-garden.js` and `frontend/dream-garden.html`.
- **Atlas mechanics:** `frontend/dream-atlas.js` and `frontend/dream-atlas.html`.
- **Bedtime Stories logic:** `frontend/bedtime-stories.js` and `frontend/bedtime-stories.html`.
- **Lullaby Lab controls/game:** `frontend/lullaby-lab.js` and `frontend/lullaby-lab.html`.
- **Guided tour copy and steps:** `frontend/pip-tour.js` and tour styles in `frontend/style.css`.
- **Audio helpers:** `frontend/sounds.js`.
- **API, database, security, deployment:** `backend/` and [`backend/README.md`](backend/README.md).

Prefer targeted edits over replacing whole files. Preserve existing IDs, `data-*` attributes, relative asset paths, API contracts, and storage keys unless all dependent code and tests are updated together.

## Accuracy notes

The characters, stories, and imagined inventions are authored fiction, not claims about real-world projects. A model, image, or animation sitting in a working folder is not necessarily used at runtime; the real dependency is the path referenced by the page or JavaScript. Keep this README aligned with the files included in deployment and the code that actually loads them.
