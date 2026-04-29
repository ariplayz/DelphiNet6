import React, { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import {
  LayoutDashboard,
  BookOpen,
  GraduationCap,
  ClipboardList,
  ClipboardCheck,
  CheckCircle2,
  Home,
  Shield,
  Settings,
  CalendarDays,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  MoreHorizontal,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';

interface AssignmentCounts {
  supervisedClasses: number;
  captainDorms: number;
  pendingVerifications: number;
}

interface NavItem {
  to: string;
  icon: React.ReactNode;
  label: string;
  permission?: string;
  // When true, only shown to users that hold the `student` role.
  // Used for nav items that represent the user's *own* student data
  // (their attendance, their classes, their program). Staff/admins
  // who happen to also be students will still see these.
  studentOnly?: boolean;
  /**
   * If set, this nav item is only shown when the user has at least one
   * matching assignment. Permission alone is not enough — they must
   * actually be assigned (e.g. supervise a class, captain a dorm).
   */
  requiresAssignment?: 'supervisedClasses' | 'captainDorms' | 'pendingVerifications';
}

const mainNav: NavItem[] = [
  { to: '/dashboard', icon: <LayoutDashboard size={18} />, label: 'Dashboard' },
  { to: '/programs', icon: <BookOpen size={18} />, label: 'Programs', studentOnly: true },
  { to: '/classes', icon: <GraduationCap size={18} />, label: 'Classes', studentOnly: true },
  { to: '/roll-call', icon: <ClipboardCheck size={18} />, label: 'Roll Call', permission: 'attendance.record', requiresAssignment: 'supervisedClasses' },
  { to: '/verification', icon: <CheckCircle2 size={18} />, label: 'Verification', permission: 'attendance.verify', requiresAssignment: 'pendingVerifications' },
  { to: '/me/attendance', icon: <ClipboardList size={18} />, label: 'My Attendance', studentOnly: true },
  { to: '/me/schedule', icon: <CalendarDays size={18} />, label: 'Schedule', studentOnly: true },
  { to: '/dorms', icon: <Home size={18} />, label: 'Dorms', studentOnly: true },
  { to: '/dorm-roll-call', icon: <ClipboardCheck size={18} />, label: 'Dorm Roll Call', permission: 'dorm.roll_call', requiresAssignment: 'captainDorms' },
  { to: '/me/settings', icon: <Settings size={18} />, label: 'Settings' },
];

const adminNav: NavItem[] = [
  { to: '/admin/users', icon: <Settings size={18} />, label: 'Users', permission: 'users.manage' },
  { to: '/admin/roles', icon: <Shield size={18} />, label: 'Roles', permission: 'roles.assign' },
  { to: '/admin/stats', icon: <LayoutDashboard size={18} />, label: 'Analytics', permission: 'analytics.view' },
];

// Bottom tabs on mobile — first 4 main nav items + a More button that opens the drawer
const bottomTabs = mainNav.slice(0, 4);

function SidebarLink({
  item,
  collapsed,
  assignments,
}: {
  item: NavItem;
  collapsed: boolean;
  assignments?: AssignmentCounts;
}) {
  const { hasPermission, user } = useAuth();
  if (item.permission && !hasPermission(item.permission)) return null;
  if (item.studentOnly) {
    const isStudent = user?.roles?.some((r) => r.name === 'student');
    if (!isStudent) return null;
  }
  if (item.requiresAssignment) {
    // Hide until we know — avoid flashing the link in for users who don't
    // actually have an assignment.
    if (!assignments) return null;
    if ((assignments[item.requiresAssignment] ?? 0) <= 0) return null;
  }
  return (
    <NavLink
      to={item.to}
      className={({ isActive }) =>
        clsx(
          'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors min-h-[44px] touch-manipulation',
          isActive
            ? 'bg-brand text-white'
            : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover',
          collapsed && 'justify-center px-2',
        )
      }
      title={collapsed ? item.label : undefined}
    >
      <span className="flex-shrink-0">{item.icon}</span>
      {!collapsed && <span className="truncate">{item.label}</span>}
    </NavLink>
  );
}

export function AppLayout() {
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { user, logout, hasPermission } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Close drawer on route change
  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (drawerOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [drawerOpen]);

  const hasAnyAdminPerm = adminNav.some((item) => item.permission && hasPermission(item.permission));

  // Pull lightweight assignment counts so we can hide nav items the user has
  // permission for but no actual assignments on (e.g. a former supervisor).
  const { data: assignments } = useQuery<AssignmentCounts>({
    queryKey: ['me', 'assignments'],
    queryFn: async () => (await api.get<AssignmentCounts>('/me/assignments')).data,
    staleTime: 60_000,
    enabled: !!user,
  });

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const userInitials = user ? `${user.firstName[0] ?? ''}${user.lastName[0] ?? ''}` : '';

  // Render full nav (used inside drawer + sidebar)
  const renderNav = (collapsed: boolean) => (
    <>
      {mainNav.map((item) => (
        <SidebarLink key={item.to} item={item} collapsed={collapsed} assignments={assignments} />
      ))}
      {hasAnyAdminPerm && (
        <>
          <div className="my-2 border-t border-border" />
          {!collapsed && (
            <p className="text-xs text-text-disabled uppercase font-semibold px-3 py-1">Admin</p>
          )}
          {adminNav.map((item) => (
            <SidebarLink key={item.to} item={item} collapsed={collapsed} assignments={assignments} />
          ))}
        </>
      )}
    </>
  );

  return (
    <div className="flex h-[100dvh] bg-bg-base overflow-hidden">
      {/* ─── Desktop / tablet sidebar (hidden on mobile) ─── */}
      <aside
        className={clsx(
          'hidden md:flex flex-col bg-bg-surface border-r border-border transition-all duration-200 flex-shrink-0',
          // Tablet: always 60px. Desktop: 240px (or 60px when collapsed).
          desktopCollapsed ? 'w-[60px]' : 'md:w-[60px] lg:w-[240px]',
        )}
      >
        <div
          className={clsx(
            'flex items-center gap-3 px-4 py-4 border-b border-border',
            (desktopCollapsed || true) && 'lg:justify-start justify-center px-2 lg:px-4',
          )}
        >
          <img
            src="/logo.png"
            alt=""
            aria-hidden="true"
            className="w-9 h-9 rounded-lg object-contain flex-shrink-0 select-none"
            draggable={false}
          />
          {!desktopCollapsed && (
            <span className="hidden lg:inline font-semibold text-text-primary text-sm">DelphiNet 6</span>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto p-2 flex flex-col gap-1">
          {/* On tablet (md), force collapsed=true. On lg+, follow desktopCollapsed. */}
          <div className="lg:hidden flex flex-col gap-1">{renderNav(true)}</div>
          <div className="hidden lg:flex flex-col gap-1">{renderNav(desktopCollapsed)}</div>
        </nav>

        <div className="border-t border-border p-2">
          {!desktopCollapsed && user && (
            <div className="hidden lg:flex items-center gap-2 px-2 py-2 mb-1">
              <div className="w-7 h-7 rounded-full bg-brand-muted border border-brand/30 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-medium text-brand">{userInitials}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-text-primary truncate">{user.firstName} {user.lastName}</p>
                <p className="text-xs text-text-secondary truncate">{user.email}</p>
              </div>
              <button
                onClick={handleLogout}
                className="text-text-disabled hover:text-danger transition-colors p-1.5"
                aria-label="Sign out"
              >
                <LogOut size={14} />
              </button>
            </div>
          )}
          <button
            onClick={() => setDesktopCollapsed(!desktopCollapsed)}
            className="hidden lg:flex w-full items-center justify-center py-2 rounded-lg text-text-secondary hover:bg-bg-hover transition-colors"
            aria-label={desktopCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {desktopCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
          {/* Tablet logout button (icon-only) */}
          <button
            onClick={handleLogout}
            className="lg:hidden flex w-full items-center justify-center py-2 rounded-lg text-text-secondary hover:text-danger transition-colors"
            aria-label="Sign out"
          >
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      {/* ─── Mobile drawer overlay ─── */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setDrawerOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ─── Mobile slide-over drawer ─── */}
      <div
        className={clsx(
          'fixed inset-y-0 left-0 z-50 w-[280px] bg-bg-surface border-r border-border',
          'flex flex-col md:hidden transition-transform duration-200 ease-in-out',
          drawerOpen ? 'translate-x-0' : '-translate-x-full',
        )}
        role="dialog"
        aria-label="Navigation menu"
      >
        <div className="flex items-center justify-between px-4 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt=""
              aria-hidden="true"
              className="w-9 h-9 rounded-lg object-contain select-none"
              draggable={false}
            />
            <span className="font-semibold text-text-primary text-sm">DelphiNet 6</span>
          </div>
          <button
            onClick={() => setDrawerOpen(false)}
            className="p-2 -mr-2 text-text-secondary hover:text-text-primary touch-manipulation"
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 flex flex-col gap-1">
          {renderNav(false)}
        </nav>

        {user && (
          <div className="border-t border-border p-3 pb-safe">
            <div className="flex items-center gap-3 px-2 py-2 mb-1">
              <div className="w-9 h-9 rounded-full bg-brand-muted border border-brand/30 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-medium text-brand">{userInitials}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary truncate">{user.firstName} {user.lastName}</p>
                <p className="text-xs text-text-secondary truncate">{user.email}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-medium text-text-secondary hover:text-danger hover:bg-bg-hover transition-colors min-h-[44px] touch-manipulation"
            >
              <LogOut size={16} />
              Sign out
            </button>
          </div>
        )}
      </div>

      {/* ─── Main content ─── */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Top bar */}
        <header className="h-14 border-b border-border bg-bg-surface flex items-center px-3 sm:px-6 flex-shrink-0 gap-3">
          {/* Mobile hamburger */}
          <button
            onClick={() => setDrawerOpen(true)}
            className="md:hidden p-2 -ml-2 text-text-secondary hover:text-text-primary touch-manipulation"
            aria-label="Open menu"
          >
            <Menu size={22} />
          </button>

          {/* Mobile title (centered-ish) */}
          <span className="md:hidden font-semibold text-text-primary text-sm flex-1">DelphiNet</span>

          {/* Desktop spacer */}
          <div className="hidden md:flex flex-1 items-center" />

          {/* Mobile user avatar (right) */}
          {user && (
            <button
              onClick={() => setDrawerOpen(true)}
              className="md:hidden w-9 h-9 rounded-full bg-brand-muted border border-brand/30 flex items-center justify-center touch-manipulation"
              aria-label="Open user menu"
            >
              <span className="text-xs font-semibold text-brand">{userInitials}</span>
            </button>
          )}
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto pb-[calc(64px+env(safe-area-inset-bottom))] md:pb-0">
          <Outlet />
        </main>
      </div>

      {/* ─── Mobile bottom tab bar ─── */}
      <nav
        className="fixed bottom-0 inset-x-0 z-30 md:hidden bg-bg-surface border-t border-border flex pb-safe"
        aria-label="Primary"
      >
        {bottomTabs.map((tab) => {
          if (tab.permission && !hasPermission(tab.permission)) return null;
          if (tab.studentOnly && !user?.roles?.some((r) => r.name === 'student')) return null;
          if (tab.requiresAssignment) {
            if (!assignments) return null;
            if ((assignments[tab.requiresAssignment] ?? 0) <= 0) return null;
          }
          return (
            <NavLink
              key={tab.to}
              to={tab.to}
              className={({ isActive }) =>
                clsx(
                  'flex-1 flex flex-col items-center justify-center gap-0.5 min-h-[56px] py-1 touch-manipulation',
                  'text-[11px] font-medium transition-colors',
                  isActive ? 'text-brand' : 'text-text-secondary active:text-text-primary',
                )
              }
            >
              {tab.icon}
              <span className="truncate max-w-full px-1">{tab.label}</span>
            </NavLink>
          );
        })}
        <button
          onClick={() => setDrawerOpen(true)}
          className="flex-1 flex flex-col items-center justify-center gap-0.5 min-h-[56px] py-1 touch-manipulation text-[11px] font-medium text-text-secondary active:text-text-primary transition-colors"
          aria-label="More options"
        >
          <MoreHorizontal size={18} />
          <span>More</span>
        </button>
      </nav>
    </div>
  );
}
