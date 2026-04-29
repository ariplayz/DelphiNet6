---
title: Home
layout: default
nav_order: 1
---

# DelphiNet 6
{: .fs-9 }

A modern, mobile-first school portal — TypeScript, React, NestJS, PostgreSQL — that ships as a single `docker compose up` stack.
{: .fs-6 .fw-300 }

[Get started](getting-started){: .btn .btn-primary .fs-5 .mb-4 .mb-md-0 .mr-2 }
[View on GitHub](https://github.com/ariplayz/DelphiNet6){: .btn .fs-5 .mb-4 .mb-md-0 }

---

## What it does

DelphiNet 6 is a complete rewrite of the legacy DelphiNet 5 school portal,
designed around the daily realities of a small boarding school:

- **Roll-call & attendance points** with weekly resets every Tuesday and a
  4-point restriction threshold.
- **Student-council verification** of attendance points (verify or excuse
  with a reason).
- **Dorms & dorm captains** — bedroom-aware roll-calls, plus a
  "Mark Messy +1" point for untidy rooms.
- **Class supervision** — supervisors get only their classes' roll-calls.
- **Adaptive dashboard** — drag-and-resize widgets that remember layout per
  user, per breakpoint.
- **Modular role system** — every role is a checkbox, every permission is a
  string, no inheritance hierarchies to fight.
- **Multi-tenant** — the whole system is `schoolId`-aware so future schools
  can join the same deployment cleanly.

## Why a rewrite?

DelphiNet 5 was a single PHP file per page, 100% server-rendered, no API,
no real role system, no mobile UI, and changes to one feature regularly
broke another. DelphiNet 6 fixes all of that with:

- **Event-driven architecture** — modules don't import each other; they emit
  and subscribe to typed events.
- **Mobile-first React frontend** — touch targets, bottom nav, slide-over
  drawer, sheets-instead-of-modals.
- **Dark theme with `#016745` accents** that matches the school's brand.
- **One-command deploy** that auto-updates on new git tags.

## How it's built

| Layer | Tech |
|---|---|
| Reverse proxy | Caddy 2 |
| Frontend | React 18, Vite, Tailwind, react-grid-layout |
| Backend | NestJS 10, Socket.IO, BullMQ |
| ORM | Prisma 5 |
| Database | PostgreSQL 16 |
| Cache / queue | Redis 7 |
| Dev mail | Mailpit |

All packaged into one `docker-compose.yml` listening on port **8090**.

## Where to next

- **[Getting started](getting-started)** — run it locally in 60 seconds.
- **[Deployment](deployment)** — one-command server install + auto-deploy.
- **[Architecture](architecture)** — modules, events, tenancy.
- **[Roles & permissions](roles-and-permissions)** — how the role system works.
- **[Mobile-first guide](mobile-first)** — UI patterns to follow.
- **[Phase progress](progress)** — what's done, what's next.
- **[Contributing](contributing)** — for human and AI contributors.
