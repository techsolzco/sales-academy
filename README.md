# Sales Academy

A role-based SaaS platform for managing salesperson training.

## Tech Stack

- **Next.js 14** (App Router) + **TypeScript**
- **Tailwind CSS** + **shadcn/ui**
- **Supabase** — Postgres, Auth, Row Level Security, Storage

## Getting Started

### 1. Clone & Install

```bash
git clone https://github.com/<your-org>/sales-academy.git
cd sales-academy
npm install
```

### 2. Environment Variables

Copy the example and fill in your Supabase credentials:

```bash
cp .env.example .env.local
```

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon/publishable key (safe for browser) |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key — **server-side only, never expose to browser** |

### 3. Run the Database Migration

Open your [Supabase SQL Editor](https://supabase.com/dashboard) and run:

```
supabase/migrations/001_initial_schema.sql
```

This creates all tables, foreign keys, indexes, and RLS policies.

### 4. Seed Test Users

```bash
npm run seed
```

Creates:
- **Admin**: `admin@salesacademy.com` / `Admin@1234!`
- **Salesman**: `salesman@salesacademy.com` / `Sales@1234!`

### 5. Start Dev Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Folder Structure

```
sales-academy/
├── app/
│   ├── auth/          # Login, forgot-password, reset-password
│   ├── admin/         # Admin-only routes (role=admin)
│   └── dashboard/     # Salesman routes (role=salesman)
├── components/
│   ├── auth/          # SignOutButton
│   ├── layout/        # Sidebar
│   └── ui/            # StatCard, shared primitives
├── hooks/             # Custom React hooks (future)
├── lib/
│   ├── supabase/      # client.ts, server.ts, admin.ts
│   └── utils.ts
├── supabase/
│   ├── migrations/    # SQL migration files
│   └── seed.ts        # Seed script
└── types/
    └── index.ts       # Shared TypeScript types
```

## Role-Based Access

| Role | Routes | How enforced |
|------|--------|-------------|
| `admin` | `/admin/*` | Middleware (edge) + Layout server check + RLS |
| `salesman` | `/dashboard/*` | Middleware (edge) + Layout server check + RLS |

Security is applied at **three levels**:
1. **Next.js Middleware** — blocks at the edge before rendering
2. **Server Component layouts** — re-verifies role from DB
3. **Supabase RLS** — enforces at the database level regardless of who queries

> Passwords are **never stored in plaintext**. Supabase handles bcrypt hashing automatically.

## Extending Roles

To add `manager` or `trainer` roles:
1. Update the `CHECK` constraint in `profiles` (already includes them in the constraint list)
2. Add a line to `types/index.ts`: `export type UserRole = 'admin' | 'salesman' | 'manager' | 'trainer'`
3. Add RLS policies for the new role
4. Add middleware route rules

No Postgres `ALTER TYPE` migration needed — the `role` column is `TEXT`, not an `ENUM`.
