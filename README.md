# CRM Contacts API

Node.js + TypeScript + Express + MySQL + Drizzle ORM project using layered architecture.

## Architecture

```text
Route -> Controller -> Service -> Repository -> Drizzle ORM -> MySQL
```

## Database schema

All tables live in a single MySQL database (`src/db/schema.ts` + `src/db/lightTables.ts`). Two groups of tables coexist in it:

- **Business-record tables** (contacts, companies, deals, invoices, licenses, line items, partnerships, quotes, payments, products, and the unified `dynamic_associations` join table). These are auto-created and auto-altered by an external sync tool that mirrors data from an external CRM platform — one column per external property, added on its own schedule. Records created natively in this app (not synced externally) are written into these same tables too, tagged with a synthetic `local-<uuid>` ID instead of a real one.
- **App-owned tables**: auth/infra tables, workflow config, audit history, knowledge base, email tooling, and small child tables that the sync tool has no concept of.

> Prior to the MySQL migration, these two groups lived in separate Postgres schemas (`dynamic`/`public`) as a hard boundary so the sync tool could never collide with the app's own tables. That boundary doesn't have a clean MySQL equivalent and was collapsed as part of the migration — the sync tool and this app now share one database and must coordinate table/column ownership by convention instead of a schema wall.

## Requirements

- Node.js 20+
- MySQL running in Docker on your GCP VM
- SSH access to your VM

## 1. Open the SSH tunnel

On your laptop, run this command and keep the terminal open:

```bash
gcloud compute ssh YOUR_VM_NAME --zone YOUR_ZONE -- -L 3306:localhost:3306
```

This forwards your laptop port `3306` to the VM port `3306`.

## 2. Configure environment variables

In another terminal, inside the project:

```bash
npm install
cp .env.example .env
nano .env
```

For SSH tunnel usage, keep the host as `localhost`:

```env
PORT=80
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=your_password
DB_DATABASE=crm
```

If your password contains characters like `#`, `@`, or `:`, using the `DB_*` variables avoids URL-encoding issues.

Optional alternative:

```env
DATABASE_URL=mysql://root:your_password@localhost:3306/crm
```

## 3. Create/update the database schema

This project uses Drizzle, so you do not need `psql` installed locally.

```bash
npm run db:push
```

Optional: open Drizzle Studio to view data in the browser:

```bash
npm run db:studio
```

## 4. Start development server

```bash
npm run dev
```

Health check:

```bash
curl http://localhost:80/health
```

## Contacts endpoints

### Create contact

```bash
curl -X POST http://localhost:80/contacts \
  -H "Content-Type: application/json" \
  -d '{
    "firstname": "John",
    "lastname": "Doe",
    "email": "john@example.com",
    "phone": "+1 604 000 0000",
    "companyName": "Example Company"
  }'
```

### List contacts

```bash
curl http://localhost:80/contacts
```

### Get contact by ID

```bash
curl http://localhost:80/contacts/CONTACT_ID
```

### Update contact

```bash
curl -X PUT http://localhost:80/contacts/CONTACT_ID \
  -H "Content-Type: application/json" \
  -d '{"firstname":"Jane"}'
```

### Delete contact

```bash
curl -X DELETE http://localhost:80/contacts/CONTACT_ID
```
