import { useEffect, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { ChevronDown, ChevronRight } from 'lucide-react';
import clsx from 'clsx';

export interface MenuLeaf {
  kind: 'link';
  label: string;
  to: string;
  external?: boolean;
  /** RBAC: any of these permissions grants access. */
  anyOf?: string[];
  /** Only show when the user has the `student` role. */
  studentOnly?: boolean;
  /** Only show when this assignment count is > 0. */
  requiresAssignment?: 'supervisedClasses' | 'captainDorms' | 'pendingVerifications' | 'ledSeminars';
}

export interface MenuGroup {
  kind: 'group';
  label: string;
  items: MenuNode[];
  anyOf?: string[];
}

export type MenuNode = MenuLeaf | MenuGroup;

export interface TopMenu {
  label: string;
  items: MenuNode[];
}

interface Ctx {
  hasPermission: (p: string) => boolean;
  isStudent: boolean;
  assignments?: { supervisedClasses: number; captainDorms: number; pendingVerifications: number; ledSeminars: number };
}

function nodeVisible(n: MenuNode, ctx: Ctx): boolean {
  if (n.kind === 'link') {
    if (n.studentOnly && !ctx.isStudent) return false;
    if (n.requiresAssignment) {
      if (!ctx.assignments) return false;
      if ((ctx.assignments[n.requiresAssignment] ?? 0) <= 0) return false;
    }
    if (n.anyOf && n.anyOf.length > 0 && !n.anyOf.some(ctx.hasPermission)) return false;
    return true;
  }
  if (n.anyOf && n.anyOf.length > 0 && !n.anyOf.some(ctx.hasPermission)) return false;
  return n.items.some((c) => nodeVisible(c, ctx));
}

function MenuList({ items, ctx, depth = 0 }: { items: MenuNode[]; ctx: Ctx; depth?: number }) {
  return (
    <ul className="py-1 min-w-[220px]">
      {items.filter((i) => nodeVisible(i, ctx)).map((item, i) => (
        <li key={i}>
          {item.kind === 'link' ? (
            item.external ? (
              <a
                href={item.to}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center px-3 py-2 text-sm text-text-secondary hover:bg-bg-hover hover:text-text-primary"
              >
                {item.label}
              </a>
            ) : (
              <NavLink
                to={item.to}
                className={({ isActive }) =>
                  clsx(
                    'flex items-center px-3 py-2 text-sm hover:bg-bg-hover',
                    isActive ? 'text-brand font-medium' : 'text-text-secondary hover:text-text-primary',
                  )
                }
              >
                {item.label}
              </NavLink>
            )
          ) : (
            <Submenu group={item} ctx={ctx} depth={depth + 1} />
          )}
        </li>
      ))}
    </ul>
  );
}

function Submenu({ group, ctx, depth }: { group: MenuGroup; ctx: Ctx; depth: number }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2 text-sm text-text-secondary hover:bg-bg-hover hover:text-text-primary"
      >
        <span>{group.label}</span>
        <ChevronRight size={14} className="text-text-disabled" />
      </button>
      {open && (
        <div
          className={clsx(
            'absolute top-0 z-50 bg-bg-surface border border-border rounded-md shadow-lg',
            // flip to the left when nested deep to avoid going off-screen
            depth >= 2 ? 'right-full mr-1' : 'left-full ml-1',
          )}
        >
          <MenuList items={group.items} ctx={ctx} depth={depth} />
        </div>
      )}
    </div>
  );
}

/**
 * A single top-level dropdown ("Home", "Students & School", …) — click to
 * toggle, click-outside to close.
 */
export function TopDropdown({ menu, ctx }: { menu: TopMenu; ctx: Ctx }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const loc = useLocation();

  useEffect(() => setOpen(false), [loc.pathname]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('mousedown', handler);
    return () => window.removeEventListener('mousedown', handler);
  }, [open]);

  if (!menu.items.some((i) => nodeVisible(i, ctx))) return null;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={clsx(
          'flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-md transition-colors',
          open
            ? 'bg-bg-hover text-text-primary'
            : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary',
        )}
      >
        {menu.label}
        <ChevronDown size={14} className={clsx('transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 bg-bg-surface border border-border rounded-md shadow-lg">
          <MenuList items={menu.items} ctx={ctx} />
        </div>
      )}
    </div>
  );
}

/**
 * Mobile-friendly accordion rendering of the same TopMenu tree, used inside
 * the slide-over drawer.
 */
export function MobileAccordion({ menus, ctx }: { menus: TopMenu[]; ctx: Ctx }) {
  return (
    <div className="flex flex-col gap-1">
      {menus.map((m, i) => {
        if (!m.items.some((it) => nodeVisible(it, ctx))) return null;
        return <AccordionSection key={i} menu={m} ctx={ctx} />;
      })}
    </div>
  );
}

function AccordionSection({ menu, ctx }: { menu: TopMenu; ctx: Ctx }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="border-b border-border last:border-0 pb-1">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2.5 text-sm font-semibold text-text-primary"
      >
        <span>{menu.label}</span>
        <ChevronDown size={16} className={clsx('transition-transform', !open && '-rotate-90')} />
      </button>
      {open && <AccordionList items={menu.items} ctx={ctx} depth={1} />}
    </div>
  );
}

function AccordionList({ items, ctx, depth }: { items: MenuNode[]; ctx: Ctx; depth: number }) {
  return (
    <ul className="flex flex-col">
      {items.filter((i) => nodeVisible(i, ctx)).map((item, idx) => (
        <li key={idx}>
          {item.kind === 'link' ? (
            item.external ? (
              <a
                href={item.to}
                target="_blank"
                rel="noopener noreferrer"
                className="block px-3 py-2.5 text-sm text-text-secondary min-h-[44px]"
                style={{ paddingLeft: `${0.75 + depth * 0.75}rem` }}
              >
                {item.label}
              </a>
            ) : (
              <NavLink
                to={item.to}
                className={({ isActive }) =>
                  clsx(
                    'block px-3 py-2.5 text-sm min-h-[44px]',
                    isActive
                      ? 'text-brand bg-brand/10 font-medium'
                      : 'text-text-secondary active:text-text-primary',
                  )
                }
                style={{ paddingLeft: `${0.75 + depth * 0.75}rem` }}
              >
                {item.label}
              </NavLink>
            )
          ) : (
            <NestedAccordion group={item} ctx={ctx} depth={depth} />
          )}
        </li>
      ))}
    </ul>
  );
}

function NestedAccordion({ group, ctx, depth }: { group: MenuGroup; ctx: Ctx; depth: number }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between py-2.5 text-sm text-text-secondary"
        style={{ paddingLeft: `${0.75 + depth * 0.75}rem`, paddingRight: '0.75rem' }}
      >
        <span>{group.label}</span>
        <ChevronDown size={14} className={clsx('transition-transform', !open && '-rotate-90')} />
      </button>
      {open && <AccordionList items={group.items} ctx={ctx} depth={depth + 1} />}
    </>
  );
}
