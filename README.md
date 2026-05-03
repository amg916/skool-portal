# Community & School Portal

A full-stack community and learning portal built with React (Vite), Express, and PostgreSQL.

## Tech Stack

- **Frontend**: React 18, Vite, Tailwind CSS v4, TanStack Query, Wouter, shadcn/ui
- **Backend**: Express, Pino, Zod, express-rate-limit
- **Database**: PostgreSQL via Drizzle ORM
- **Monorepo**: pnpm workspaces

## Prerequisites

- Node.js 20+
- pnpm 9+
- PostgreSQL 15+

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string, e.g. `postgres://user:pass@localhost:5432/portal` |
| `PORT` | No | Port for the API server (default: assigned by workflow) |

Create a `.env` file in `artifacts/api-server/` (or export the vars in your shell):

```
DATABASE_URL=postgres://postgres:password@localhost:5432/portal
```

## Database Migration

Push the schema to your database with Drizzle:

```bash
pnpm --filter @workspace/db run push
```

This creates all tables. Re-run after schema changes.

## Seeding (First Run)

Seed the default admin account and channels:

```bash
pnpm --filter @workspace/api-server run seed
```

## Starting Dev

Workflows are managed by Replit and start automatically. To start manually:

```bash
# API server (from artifacts/api-server)
pnpm --filter @workspace/api-server run dev

# Portal frontend (from artifacts/portal)
pnpm --filter @workspace/portal run dev
```

## Default Admin Credentials

After seeding:

| Field | Value |
|---|---|
| Email | `admin@portal.local` |
| Password | `admin1234` |

**Change the password after first login.**

## Project Structure

```
artifacts/
  api-server/   Express REST API
  portal/       React SPA frontend
lib/
  db/           Drizzle schema & migrations
  api-spec/     OpenAPI spec + generated client
```
