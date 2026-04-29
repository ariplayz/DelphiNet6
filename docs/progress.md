---
title: Phase progress
layout: default
nav_order: 9
permalink: /progress
---

# Phase progress

Live snapshot of which phases of the DelphiNet 6 build are shipped vs.
in flight. The detailed phase plan, including acceptance criteria and
file-by-file change lists, lives in [`docs/PROGRESS.md`](https://github.com/ariplayz/DelphiNet6/blob/main/docs/PROGRESS.md) on GitHub.

## Shipped

| # | Phase | Tag |
|---|---|---|
| 1 | Repo scaffold + tooling | v0.1 |
| 2 | Prisma schema + seed | v0.1 |
| 3 | Auth + RBAC (Argon2 + sessions) | v0.1 |
| 4 | Event bus + audit module | v0.1 |
| 5 | Multi-tenancy middleware | v0.1 |
| 6 | React frontend shell + design system | v0.1 |
| 6b | Mobile-first responsive pass | v0.1 |
| – | Deploy scripts (server-install, watch-deploy) | v0.1 |
| – | Install fix #1 (random DB password from .env) | v0.1.1 |
| 7 | Dashboard widgets (react-grid-layout) | v0.1.2 |
| 8 | Classes / sessions / rosters | v0.1.2 |
| 9 | Roll call + attendance points | v0.1.2 |
| 10 | Weekly Tuesday reset | v0.1.2 |
| 11 | Student-council verification | v0.1.2 |
| – | Install hardening (self-heal stale volumes, log dump) | v0.1.2 |
| – | Prisma client regeneration fix | v0.1.3 |
| 12 | Dorms + captains + dorm roll calls (Mark Messy +1) | v0.1.3 |

## Pending

13. **Programs** — student programs + templates
14. **Success stories**
15. **Cramming** (per-class study session tracker)
16. **Ethics** (forms + flow)
17. **Routing forms** (workflow engine)
18. **College** (applications tracker)
19. **Photos** (gallery + tagging)
20. **Reference** (per-student reference letters)
21. **Parents** (parent accounts + read-only views)
22. **Notifications** (email + in-app + push)
23. **Analytics admin** (page-views + nav graph + restricted lists)
24. **E2E polish + Playwright suite**
25. **Multi-tenancy hardening for new schools**
