---
title: Mobile-first
layout: default
nav_order: 6
---

# Mobile-first design

DelphiNet 6's UI is **mobile-first, not mobile-tolerant**. Roughly half of
all sessions come from phones. Every page must look and feel native on a
small screen before it's allowed near a desktop.

## Hard rules

| Rule | Why |
|---|---|
| Touch targets **≥ 44×44px** (Apple HIG) | Fingers aren't precise. Use `min-h-[44px]` (or 48 for thumb-zone primary). |
| Inputs **`text-base`** (16 px) | Anything smaller triggers iOS Safari's auto-zoom. |
| `h-[100dvh]`, never `h-screen` | Mobile browsers' URL bar shrinks/grows; `dvh` adapts. |
| `pb-safe` on bottom-anchored UI | Respect the iOS home-indicator inset. |
| Modals → bottom sheets on `<md` | Centre modals are unreachable with a thumb. Use `<Sheet>`. |
| Tables → card stacks on `xs` | Horizontal scroll is hostile on phones. |
| Hover-only actions are forbidden | There's no hover on touch devices. Always-visible primary action. |
| Sidebar → slide-over drawer | Use the existing `<MobileNav>` + `<Drawer>` primitives. |

## Layout patterns

### Sidebar vs drawer

```tsx
// AppLayout.tsx
<div className="flex h-[100dvh]">
  <Sidebar className="hidden md:flex" />
  <MobileTopBar className="md:hidden" />   {/* hamburger + brand */}
  <main className="flex-1 overflow-y-auto pb-safe pb-16 md:pb-0">
    {children}
  </main>
  <BottomNav className="md:hidden" />
</div>
```

The sidebar is always visible from `md` up. Below `md`, the same nav lives
in a slide-over `<Drawer>` (hamburger), and the most-used items
duplicate into a `<BottomNav>`.

### Modal vs sheet

Use the `<Modal>` primitive — it auto-switches to a bottom-sheet
presentation under `md`. Don't roll your own.

```tsx
<Modal open={open} onClose={close} title="Add class">
  <ClassForm onSubmit={save} />
</Modal>
```

### Table vs card list

```tsx
{/* Desktop: real table */}
<table className="hidden md:table w-full">...</table>

{/* Mobile: card stack */}
<ul className="md:hidden space-y-2">
  {rows.map(r => (
    <li key={r.id} className="rounded-xl bg-surface p-4">
      <div className="font-medium">{r.name}</div>
      <div className="text-sm text-muted">{r.subtitle}</div>
    </li>
  ))}
</ul>
```

If the data has more than 3 columns, the desktop table likely needs
horizontal scroll — even on desktop, prefer cards there.

## Roll-call: the canonical mobile UX

The roll-call screen exists because supervisors take it on a phone walking
the room. Notes from that build:

- **Each student row is its own tappable card**, full-width.
- The default state is **Here** (green check). Tapping a row reveals
  Late / Absent / Excused buttons inline (no modal hop).
- **Excused** opens a sheet asking for a reason. Required.
- The "Save" button is **fixed to the bottom** with `pb-safe` and shows
  `<unsaved-count> students` until tapped.
- After save, an **optimistic toast** appears at the bottom, dismissible
  by swipe.

## Forms

- One field per row. Labels above inputs.
- Use `<input inputmode="...">` to summon the right mobile keyboard
  (`numeric`, `email`, `tel`, `decimal`, `search`).
- Never disable autofill. Use proper `name`, `autocomplete`, `type`.
- Submit button **full-width** on mobile, right-anchored on desktop.

## Theme

Dark-only with `#016745` (the school's brand green) as the primary accent.
Use Tailwind tokens (`bg-brand`, `text-brand`, `ring-brand`) so future
re-skinning is a one-config change. Never hex-literal colours in components.

## Testing

There's no automated mobile-viewport CI yet — use Chrome DevTools' device
mode (iPhone 14, Pixel 7, iPad mini) for any visible UI change. The
gateway test before merging anything new is:

> "Could a supervisor take roll on this with one thumb while walking?"

If no, fix it first.
