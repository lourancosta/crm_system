# CRM System

A full-stack TypeScript CRM covering the sales-to-billing flow: contacts, companies, deals, quotes, invoices, payments, credit memos, licenses, partnerships, products and support tickets, plus a knowledge base.

- **Backend:** Express API with a layered architecture on MySQL through Drizzle ORM.
- **Frontend:** React single-page app built with Vite.
- **Deployment:** both ship together as one Docker image on Kubernetes.
- **Users:** internal staff, partners and customers, each seeing only the records they're allowed to see.
- **Data:** stays in sync with HubSpot.

## Contents

- [Architecture](#architecture)
- [Tech stack](#tech-stack)
- [Project structure](#project-structure)
- [Backend](#backend)
- [Access control](#access-control)
- [Data layer](#data-layer)
- [Background jobs and integrations](#background-jobs-and-integrations)
- [Frontend](#frontend)
- [Infrastructure and deployment](#infrastructure-and-deployment)
- [Getting started](#getting-started)
- [Scripts](#scripts)
- [Environment variables](#environment-variables)
- [Known limitations and next steps](#known-limitations-and-next-steps)

## Architecture

```
 Browser (React SPA)
      │  fetch /api/*  +  Authorization: Bearer <JWT>
      ▼
 ┌──────────────── Single Node.js container (port 80) ────────────────┐
 │ Express                                                             │
 │  ├─ /healthz              Kubernetes readiness/liveness probes      │
 │  ├─ /api/public/*         anonymous: invoice/quote previews, KB     │
 │  ├─ /api/*  → authenticate → requireInternal / requireModule        │
 │  │            → Controller → Service → Repository → Drizzle         │
 │  ├─ client/dist static files + SPA fallback (GET * → index.html)    │
 │  └─ node-cron jobs (reminders, IMAP polling, activity sync)         │
 └─────────────────────────────────────────────────────────────────────┘
      │ writer pool          │ reader pool (optional replica)
      ▼                      ▼
   MySQL 8 ◄──── external sync tool (mirrors HubSpot data into the same tables)

 External: SMTP (nodemailer) · IMAP / Microsoft 365 OAuth2 (imapflow) · Google Cloud Storage
```

Every protected request goes through the same layers:

```
Route → authenticate → authorize → Controller → Service → Repository → Drizzle ORM → MySQL
```

## Tech stack

| Area | Technology |
|---|---|
| Backend | Node 22, Express 4, TypeScript, Zod, jsonwebtoken, bcryptjs |
| Data | MySQL 8, Drizzle ORM, mysql2 connection pools (writer and reader) |
| Frontend | React 18, Vite 5, React Router 6, CSS Modules, lucide-react |
| Background jobs | node-cron, running inside the API process |
| Integrations | nodemailer (SMTP), imapflow + Microsoft 365 OAuth2, Google Cloud Storage, HubSpot (through an external sync tool) |
| Infrastructure | Docker, GitLab CI (shared organization template), Helm on Kubernetes, GCP |
| Tests | Node's built-in test runner (`node:test`) through `tsx` |

## Project structure

```
crm-system/
├── src/                      # Express backend
│   ├── app.ts                # Middleware, route mounting, static client, error handler
│   ├── server.ts             # Entry point: starts HTTP server and cron jobs
│   ├── cron/                 # Scheduled jobs
│   ├── db/                   # Drizzle clients, schema.ts, lightTables.ts, connection helpers
│   ├── lib/                  # permissions, scopeFilter, encryption, storage, email, OAuth
│   ├── middlewares/          # auth (JWT), authorize (permissions), errorHandler
│   ├── modules/<feature>/    # ~30 feature modules (see below)
│   ├── scripts/              # One-off / manual scripts (reminders, backfills)
│   └── types/                # Express Request augmentation (req.user, req.scope)
├── client/                   # React + Vite frontend
│   └── src/
│       ├── features/<domain>/  # Pages, panels and API calls for each domain
│       └── shared/             # api/, components/, contexts/, hooks/, types/, utils/
├── drizzle/                  # Generated SQL migrations
├── Dockerfile                # Single image: builds API + client
├── docker-compose.yml        # Local MySQL 8.4
├── docker-compose.prod.yml   # Run the published image on a single VM
├── config.conf               # Values for the shared Helm chart
└── .gitlab-ci.yml            # Includes the organization's pipeline template
```

## Backend

### Module layout

Each feature lives in `src/modules/<feature>/` and follows the same structure:

| File | Responsibility |
|---|---|
| `*.routes.ts` | Maps URLs to handlers and attaches permission middleware to each route |
| `*.controller.ts` | Validates input with Zod `.parse()`, resolves the caller's access scope, calls the service |
| `*.service.ts` | Business rules; turns a `null` from the repository into a 404 |
| `*.repository.ts` | Drizzle queries only; returns `null` when nothing is found |
| `*.schema.ts` / `*.types.ts` | Zod schemas and TypeScript types |

Conventions:

- Validation happens **only in controllers**, so services and repositories can assume their input is valid.
- Errors are passed to `next(error)` and handled by one global handler.

### Error handling

`src/middlewares/errorHandler.ts` maps every error to an HTTP response:

| Error | Response |
|---|---|
| `ZodError` | **400** with a list of problems for each field |
| MySQL `ER_DUP_ENTRY` | **409** with a readable message (e.g. duplicate contact email) |
| Error with a `statusCode` property | That status (the `notFound`, `unauthorized` and `conflict` helpers set it) |
| Anything else | **500** |

### Authentication

- `POST /api/auth/login` returns a JWT that is **valid for 7 days**. It carries `sub`, `email`, `accountType`, `role` and `companyId`.
- Other auth endpoints:
  - `forgot-password` and `reset-password`
  - `GET` / `PUT /api/auth/me`
  - `PUT /api/auth/me/password`
  - `/api/auth/me/avatar`
- There is no self-registration; administrators create users.
- Passwords are hashed with bcrypt (cost 10). Queries are written so the password hash is never selected back out.
- `authenticate` rejects requests without a valid Bearer token.
- `optionalAuthenticate` (used by the public knowledge base) identifies the caller when a token is present but never blocks the request.

### API surface

- **Public, no token needed:**
  - `/healthz`
  - `/api/auth/login`, `/api/auth/forgot-password`, `/api/auth/reset-password`
  - `/api/public/*` (invoice and quote previews, quote signing, account defaults)
  - `/api/public/knowledge-base/*`
- **Record modules** (`authenticate` + `requireModule`):
  - contacts, companies, deals, tickets, invoices, quotes, licenses, partnerships, products, payments, credit memos, users
  - associations, search
  - knowledge-base browsing
- **Internal only** (`authenticate` + `requireInternal`):
  - dashboard, history, pipelines, lifecycle stages
  - email accounts, email templates, support inboxes, invoice reminder rules
  - permission sets, snippets, account defaults, Google Storage settings, object properties

See `src/app.ts` for the full list of mounted routes.

## Access control

There are three account types: **internal**, **partner** and **customer**. The rules live in `src/lib/permissions.ts`.

- **Internal users** get their permissions from a **permission set stored in the database**, with view/create/edit/delete settings for each module. It is **looked up on every request instead of being stored in the JWT**, so an administrator's changes take effect immediately without users logging in again.
- **Partner and customer users** get one of five **fixed roles defined in code**: `partner_admin`, `partner_user`, `partner_billing`, `customer_admin` and `customer_user`. Portal users can never delete or merge records; this rule is enforced in one helper so an individual role can't loosen it.
- **Each permission has a scope of `none`, `own` or `all`:**
  - `own` for an internal user means records whose HubSpot owner is that user.
  - `own` for a portal user means records that user created.
  - `all` for a portal user means **only records associated with their own company**, never data from other companies.

Enforcement has two steps:

1. `requireModule(module, action)` (`src/middlewares/authorize.ts`) looks up the caller's permissions, returns **403** if the action isn't allowed, and attaches `req.scope`.
2. `resolveAccessScope()` (`src/lib/scopeFilter.ts`) turns that scope into a **SQL filter on each row**. For company scope, this is an `EXISTS` subquery on `dynamic_associations`. Repositories add it to their `WHERE` clause.

The rules **fail closed**: if a scope can't be resolved (for example, no owner or company to match against), the query returns nothing.

`requireInternal` protects system configuration. The route guards in the frontend only hide pages from users; the backend is the real security boundary.

## Data layer

All tables live in one MySQL database (`src/db/schema.ts` and `src/db/lightTables.ts`), in two groups:

- **Business-record tables** (contacts, companies, deals, invoices, licenses, line items, partnerships, quotes, payments, products, and the shared `dynamic_associations` join table):
  - An external sync tool creates and alters these tables to mirror HubSpot. It adds a column for each HubSpot property on its own schedule.
  - Records created directly in this app go into the same tables with a synthetic `local-<uuid>` ID.
- **App-owned tables:** authentication and infrastructure, workflow configuration, audit history, the knowledge base, email tooling, and small child tables that the sync tool knows nothing about.

> The two groups used to live in separate Postgres schemas (`dynamic` and `public`), which stopped the sync tool from ever touching the app's tables. MySQL has no clean equivalent, so the move to MySQL removed that boundary. **The sync tool and this app now keep out of each other's tables and columns by convention.**

Other details:

- **Associations between records.** Any record links to any other through one `dynamic_associations` table (type and ID on each side), following HubSpot's association model.
- **Slim table definitions.** Some synced tables are very wide (contacts has 600+ columns). Using their full Drizzle definitions in queries pushes TypeScript past its type-instantiation depth limit. `lightTables.ts` declares slim definitions of the same physical tables, with only the columns the app actually queries.
- **Separate writer and reader connections.** `db` connects to the writer (`DB_HOST`). `readerDb` connects to `DB_HOST_READ`, or to the writer when that variable isn't set. No code uses `readerDb` yet.
- **Workarounds for MySQL.**
  - MySQL has no `RETURNING` clause. Primary keys are `varchar(36)` UUIDs: generate the ID with `randomUUID()`, insert it, then select the row back.
  - After updates and deletes, run the query again with the same `WHERE` clause (scope filter included), or check `affectedRows`.
  - For inserts that update an existing row instead, use `.onDuplicateKeyUpdate({ set })`.
- **Migrations.** drizzle-kit generates SQL files into `drizzle/`, or `db:push` applies the schema directly.

## Background jobs and integrations

`src/server.ts` starts these `node-cron` jobs in the same process as the API:

| Job | Schedule | What it does |
|---|---|---|
| Invoice reminders | daily at 08:00 | Emails reminders based on configurable reminder rules |
| Support inbox | every 5 min | Polls connected IMAP mailboxes and turns incoming emails into tickets |
| Email activity sync | every 5 min (`EMAIL_ACTIVITY_CRON_SCHEDULE`) | Turns HubSpot-synced emails into activity timeline entries, 500 rows per page |
| Engagement activity sync | every 5 min (`ENGAGEMENT_ACTIVITY_CRON_SCHEDULE`) | Turns HubSpot-synced notes, calls and meetings into activity timeline entries, 500 rows per page |

Integrations:

- **Outgoing email (SMTP):** accounts are set up in *Settings > Email Accounts*, one per feature (invoice reminders, quotes, user emails, and so on). Passwords are **encrypted at rest with AES-256-GCM** (`src/lib/encryption.ts`, key in `EMAIL_ENCRYPTION_KEY`).
- **Incoming email (IMAP):** supports plain passwords and Microsoft 365 app-only OAuth2 (`src/lib/microsoftOAuth.ts`).
- **File storage (Google Cloud Storage):**
  - A **public** bucket holds knowledge-base and email template assets.
  - A **private** bucket holds files that are only streamed through routes that check the caller's session.
  - Credentials are stored encrypted in the database (*Settings > File Storage*), so rotating them in the UI doesn't need a restart.
- **Safety switch:** `TEST_EMAIL_OVERRIDE` sends all outgoing email to one address. Set it in dev and staging, because the database holds real customer contacts synced from HubSpot.

## Frontend

- **Organized by feature:**
  - `client/src/features/<domain>/` holds each domain's pages, slide-over panels and `api/` calls.
  - `client/src/shared/` holds reusable pieces: Table, Pipeline (Kanban board), SlideOverPanel, RichTextEditor, SearchSelect, GlobalSearch, RecordDetail, and more.
- **API client:** `shared/api/client.ts` is a thin `fetch` wrapper.
  - It adds the Bearer token from `localStorage` (key `token`).
  - On an error response it throws a typed `ApiError`, including Zod's per-field problems so forms can show them next to each field.
- **Auth:**
  - `AuthContext` calls `GET /api/auth/me` on load with the stored token and clears the token if the call fails.
  - `ProtectedRoute` takes a list of allowed account types, so portal users never see pages meant only for internal staff.
- **Routing:** record detail views open as **slide-over panels on top of the list** and also work as standalone pages.
- **Notable features:**
  - Kanban board for deal pipelines
  - Multi-step quote wizard with e-signature (`signature_pad`)
  - Public invoice and quote preview pages
  - Knowledge base with an internal side and a public portal
  - Settings area for users, permission sets, custom properties, email accounts, templates and file storage
- **Dev server:** Vite serves the app on port 5173 and forwards `/api` requests to `http://localhost:80`.

## Infrastructure and deployment

- **Image:** the root `Dockerfile` (node:22-alpine) builds the API and the client into **one image**.
  - Express serves `client/dist` and sends any unknown route to `index.html`, so one container serves both the app and the API.
  - `curl` is installed because the Kubernetes readiness probe runs `curl` against `/healthz`.
- **CI/CD:** `.gitlab-ci.yml` only **includes** the platform team's shared pipeline (`pipeline-2.0/repo-default`), which builds and deploys the image.
- **Kubernetes:** `config.conf` supplies values to the shared Helm chart:
  - ClusterIP service with the autoscaler (HPA) enabled
  - Three environments: **dev**, **hml** (staging) and **prd**
  - Liveness and readiness probes on `/healthz`
  - Every environment runs 1 replica (see [limitations](#known-limitations-and-next-steps))
- **Single VM (alternative):** `docker-compose.prod.yml` runs the published image and joins an existing Docker network.
- **Local development:** `docker-compose.yml` runs only MySQL 8.4. The API and Vite run on your machine.
- **Configuration:**
  - Environment variables hold infrastructure settings (database, secrets).
  - Settings that change while the app runs (SMTP, IMAP, file storage) are stored encrypted in the database and managed from the UI.

## Getting started

Requirements: Node.js 20+ and Docker (or access to a remote MySQL instance).

### 1. Start MySQL

**Option A: local container**

```bash
docker compose up -d
```

**Option B: MySQL on a GCP VM through an SSH tunnel** (keep this terminal open)

```bash
gcloud compute ssh YOUR_VM_NAME --zone YOUR_ZONE -- -L 3306:localhost:3306
```

### 2. Configure environment variables

```bash
npm install
npm run client:install
cp .env.example .env
```

Edit `.env`. For the local container, use `DB_HOST=localhost`, `DB_USERNAME=root`, `DB_PASSWORD=mysql` and `DB_DATABASE=crm`. Generate `JWT_SECRET` and `EMAIL_ENCRYPTION_KEY` with the commands in `.env.example`. See [Environment variables](#environment-variables) for the full list.

If your password contains characters like `#`, `@` or `:`, use the separate `DB_*` variables instead of `DATABASE_URL`, so you don't have to URL-encode the password.

### 3. Create the database schema

```bash
npm run db:push
```

### 4. Run the app

```bash
npm run dev          # API on http://localhost:80 (restarts on file changes)
npm run client:dev   # Frontend on http://localhost:5173
```

Health check:

```bash
curl http://localhost:80/healthz
```

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the API and restart it on file changes (`tsx watch`) |
| `npm run build` | Compile the API to `dist/` and build the client to `client/dist/` |
| `npm run start` | Run the compiled build |
| `npm test` | Run the test suite (Node's built-in test runner) |
| `npm run db:generate` | Generate Drizzle migration files into `drizzle/` |
| `npm run db:push` | Apply the schema directly to the database |
| `npm run db:studio` | Open Drizzle Studio (a database browser) |
| `npm run reminders:run` | Run the invoice reminder job once, by hand |
| `npm run invoices:backfill-installments` | One-off backfill of invoice installments |
| `npm run client:install` / `client:dev` / `client:build` | Install, run or build the frontend |

To run a single test file:

```bash
node --import tsx --test src/modules/contacts/contact.schema.test.ts
```

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `PORT` | no | HTTP port (default `80`) |
| `APP_BASE_URL` | yes | Public URL of the app, used to build links in emails (no trailing slash) |
| `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_DATABASE` | yes* | Connection to the writer database |
| `DB_HOST_READ` | no | Read replica host (defaults to `DB_HOST`) |
| `DATABASE_URL` | yes* | Alternative to the `DB_*` variables |
| `JWT_SECRET` | yes | Secret used to sign JWTs |
| `EMAIL_ENCRYPTION_KEY` | yes | Base64-encoded 32-byte key that encrypts stored SMTP, IMAP and storage credentials |
| `TEST_EMAIL_OVERRIDE` | dev/staging | Sends all outgoing email to this address |
| `EMAIL_ACTIVITY_CRON_SCHEDULE`, `ENGAGEMENT_ACTIVITY_CRON_SCHEDULE` | no | Override the default 5-minute schedules |

\* Set either the `DB_*` variables or `DATABASE_URL`.

## Known limitations and next steps

| Area | Current state | Next step |
|---|---|---|
| Scheduled jobs | Run inside the API process, so **every replica would run every job**. Each environment is set to 1 replica to avoid that. | Move them to a separate worker, a distributed lock, or Kubernetes CronJobs, then scale the API horizontally. |
| Permission lookups | One extra database query per protected request (the price of immediate revocation). | Add a short-lived cache. |
| Token storage | The JWT is in `localStorage`, where an XSS (script injection) bug could read it. | Move to an httpOnly cookie with CSRF protection. |
| Shared database with the sync tool | Ownership of tables and columns relies on convention. | Document naming rules and add schema checks in CI. |
| Read replica | `readerDb` is set up but no code uses it. | Move read-heavy list and search queries onto it. |
| Tests | Unit tests cover the error handler, database connection, associations, email and OAuth helpers. | Add integration tests for scope filters and end-to-end tests for the quote → invoice flow. |

See [CONTRIBUTING.md](CONTRIBUTING.md) for the branching and merge request workflow.
