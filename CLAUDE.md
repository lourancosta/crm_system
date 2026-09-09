# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project structure

Full-stack CRM with an Express/TypeScript backend (`src/`) and a React/Vite frontend (`client/`).

```
crm-system/
├── src/                  # Express backend
│   ├── db/               # Drizzle client, schema, connection helper
│   ├── middlewares/      # errorHandler, auth (JWT)
│   ├── modules/
│   │   ├── auth/         # register, login, /me endpoints
│   │   └── contacts/     # contacts CRUD
│   ├── types/            # express.d.ts — extends Request with user
│   └── server.ts
├── client/               # React 18 + Vite frontend
│   └── src/
│       ├── api/          # fetch wrappers (client.ts, auth.ts, contacts.ts)
│       ├── components/   # Layout, Modal, ContactForm, ProtectedRoute
│       ├── contexts/     # AuthContext (user state + token management)
│       ├── pages/        # LoginPage, RegisterPage, ContactsPage
│       └── types/        # Shared TS types
├── docker-compose.yml    # Local MySQL container
└── drizzle.config.ts
```

## Commands

### Backend

```bash
npm run dev          # Start Express with hot reload (tsx watch)
npm run build        # Compile TypeScript to dist/
npm run start        # Run compiled output (production)
npm test             # Run all tests (Node native test runner)
npm run db:generate  # Generate Drizzle migration files
npm run db:push      # Push schema directly to DB (skips migration files)
npm run db:studio    # Open Drizzle Studio in browser
```

To run a single test file:
```bash
node --import tsx --test src/modules/contacts/contact.schema.test.ts
```

### Frontend

```bash
npm run client:dev    # Start Vite dev server (port 5173, proxies /api → :80)
npm run client:build  # Build React app to client/dist/
npm run client:install  # npm install inside client/
```

Or directly from `client/`:
```bash
cd client && npm run dev
```

## Database setup (Docker)

Start the local MySQL container:
```bash
docker compose up -d
```

Copy and configure env:
```bash
cp .env.example .env
# .env defaults match docker-compose (user: root, pass: mysql, db: crm)
# Add a JWT_SECRET value
```

Push the schema:
```bash
npm run db:push
```

## Architecture

### Backend request flow
```
Route → Controller → Service → Repository → Drizzle ORM → MySQL
```

All routes are prefixed with `/api`. Protected routes require a `Bearer <token>` header validated by `src/middlewares/auth.ts`.

**Public endpoints:**
- `POST /api/auth/register` — `{ name, email, password }` → `{ user, token }`
- `POST /api/auth/login` — `{ email, password }` → `{ user, token }`

**Authenticated endpoints** (require `Authorization: Bearer <token>`):
- `GET /api/auth/me`
- `GET /api/contacts`
- `POST /api/contacts`
- `GET /api/contacts/:id`
- `PUT /api/contacts/:id`
- `DELETE /api/contacts/:id`

In production (`NODE_ENV=production`), Express serves `client/dist` as static files with SPA fallback.

### Auth module (`src/modules/auth/`)

- `auth.repository.ts` — DB queries; `findByEmail` returns full row (including `passwordHash`); `findById` and `create` use partial select to never return `passwordHash`
- `auth.service.ts` — bcryptjs for password hashing (cost 10), jsonwebtoken for 7-day JWT; `verifyToken` is also called by the auth middleware
- Error helpers (`conflict`, `unauthorized`, `notFound`) attach `statusCode` to errors so the global `errorHandler` middleware maps them to the correct HTTP status

### Key conventions

- Validation via Zod `.parse()` happens in controllers only — never in service or repository
- Repository functions return `null` for not-found; services convert that to a thrown error with `statusCode: 404`
- All thrown errors flow to `src/middlewares/errorHandler.ts` via `next(error)`
- The `contact` schema maps `companyName` (TypeScript) → `company` (DB column)
- `src/types/express.d.ts` extends `Express.Request` with `user?: { userId, email }`
- Tests use Node's built-in test runner (`node:test`) — no Jest or Vitest
- MySQL/Drizzle has no `RETURNING` clause and no `.onConflictDoUpdate()`/`.onConflictDoNothing()`. All primary keys are `varchar(36)` with a DB-side `default(sql\`(uuid())\`)`. The established pattern for inserts that need the created row back: generate the id in application code with `randomUUID()` from `"crypto"`, pass it explicitly in `.values({ id, ... })`, then follow up with a `select` by that id. For updates/deletes, run the mutation then either re-select using the exact same `where` clause (including any scope condition) or check `result.affectedRows` from the destructured `[result]` — never assume `.returning()`-style behavior. Upserts use `.onDuplicateKeyUpdate({ set })` (no `target`); "do nothing on conflict" uses `.insert(...).ignore().values(...)`.

### Frontend

- `AuthContext` initialises by calling `GET /api/auth/me` with any stored token; on failure it clears the token
- JWT is stored in `localStorage` under the key `token`
- `client/src/api/client.ts` is the base fetch wrapper — automatically attaches the Bearer token and throws `ApiError` on non-2xx responses
- `ProtectedRoute` redirects to `/login` when unauthenticated; `LoginPage`/`RegisterPage` redirect to `/` when already authenticated
- Vite proxies all `/api` requests to `http://localhost:80` in development
