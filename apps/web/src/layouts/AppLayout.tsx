import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import {
  LayoutDashboard,
  ClipboardCheck,
  CalendarDays,
  ClipboardList,
  LogOut,
  Menu,
  X,
  MoreHorizontal,
  Settings,
  ChevronDown,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';
import { TopDropdown, MobileAccordion } from '../components/TopNav';
import { TOP_MENUS } from '../lib/menu';

interface AssignmentCounts {
  supervisedClasses: number;
  captainDorms: number;
  pendingVerifications: number;
  pendingStories?: number;
  ledSeminars: number;
}

// Bottom tabs on mobile — quick access to the four most-used screens.
const bottomTabs = [
  { to: '/dashboard', icon: <LayoutDashboard size={18} />, label: 'Home' },
  { to: '/me/schedule', icon: <CalendarDays size={18} />, label: 'Schedule', studentOnly: true },
  { to: '/me/attendance', icon: <ClipboardList size={18} />, label: 'Points', studentOnly: true },
  { to: '/roll-call', icon: <ClipboardCheck size={18} />, label: 'Roll Call', permission: 'attendance.record', requiresAssignment: 'supervisedClasses' as const },
];

export function AppLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { user, logout, hasPermission } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    setDrawerOpen(false);
    setUserMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (drawerOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [drawerOpen]);

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
  const isStudent = !!user?.roles?.some((r) => r.name === 'student');

  const ctx = {
    hasPermission,
    isStudent,
    assignments,
  };

  return (
    <div className="flex flex-col h-[100dvh] bg-bg-base overflow-hidden">
      {/* ─── Top bar (always visible) ─── */}
      <header className="h-14 border-b border-border bg-bg-surface flex items-center px-3 sm:px-6 flex-shrink-0 gap-3 z-30">
        {/* Mobile hamburger */}
        <button
          onClick={() => setDrawerOpen(true)}
          className="md:hidden p-2 -ml-2 text-text-secondary hover:text-text-primary touch-manipulation"
          aria-label="Open menu"
        >
          <Menu size={22} />
        </button>

        {/* Logo + title */}
        <NavLink to="/dashboard" className="flex items-center gap-2 flex-shrink-0">
          <img
            src="/logo.png"
            alt=""
            aria-hidden="true"
            className="w-8 h-8 rounded-md object-contain select-none"
            draggable={false}
          />
          <span className="hidden sm:inline font-semibold text-text-primary text-sm">DelphiNet 6</span>
        </NavLink>

        {/* Desktop dropdown nav */}
        <nav className="hidden md:flex items-center gap-0.5 ml-4">
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              clsx(
                'px-3 py-2 text-sm font-medium rounded-md transition-colors',
                isActive
                  ? 'bg-bg-hover text-text-primary'
                  : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary',
              )
            }
          >
            Dashboard
          </NavLink>
          {TOP_MENUS.map((menu) => (
            <TopDropdown key={menu.label} menu={menu} ctx={ctx} />
          ))}
        </nav>

        <div className="flex-1" />

        {/* User menu */}
        {user && (
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen((v) => !v)}
              className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-bg-hover transition-colors touch-manipulation"
              aria-label="Open user menu"
            >
              <div className="w-8 h-8 rounded-full bg-brand-muted border border-brand/30 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-semibold text-brand">{userInitials}</span>
              </div>
              <span className="hidden lg:inline text-sm text-text-primary">{user.firstName}</span>
              <ChevronDown size={14} className="hidden lg:inline text-text-disabled" />
            </button>
            {userMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setUserMenuOpen(false)}
                  aria-hidden="true"
                />
                <div className="absolute right-0 top-full mt-1 z-50 w-56 bg-bg-surface border border-border rounded-md shadow-lg py-1">
                  <div className="px-3 py-2 border-b border-border">
                    <p className="text-sm font-medium text-text-primary truncate">{user.firstName} {user.lastName}</p>
                    <p className="text-xs text-text-secondary truncate">{user.email}</p>
                  </div>
                  <NavLink
                    to="/me/settings"
                    className="flex items-center gap-2 px-3 py-2 text-sm text-text-secondary hover:bg-bg-hover hover:text-text-primary"
                  >
                    <Settings size={14} /> Settings
                  </NavLink>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-secondary hover:bg-bg-hover hover:text-danger"
                  >
                    <LogOut size={14} /> Sign out
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </header>

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
          'fixed inset-y-0 left-0 z-50 w-[300px] bg-bg-surface border-r border-border',
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

        <nav className="flex-1 overflow-y-auto p-2">
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              clsx(
                'block px-3 py-2.5 text-sm font-semibold rounded min-h-[44px]',
                isActive ? 'text-brand bg-brand/10' : 'text-text-primary',
              )
            }
          >
            Dashboard
          </NavLink>
          <MobileAccordion menus={TOP_MENUS} ctx={ctx} />
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
            <NavLink
              to="/me/settings"
              className="w-full flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-medium text-text-secondary hover:bg-bg-hover transition-colors min-h-[44px] mb-1"
            >
              <Settings size={16} /> Settings
            </NavLink>
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-medium text-text-secondary hover:text-danger hover:bg-bg-hover transition-colors min-h-[44px] touch-manipulation"
            >
              <LogOut size={16} /> Sign out
            </button>
          </div>
        )}
      </div>

      {/* ─── Main content ─── */}
      <main className="flex-1 overflow-y-auto pb-[calc(64px+env(safe-area-inset-bottom))] md:pb-0">
        <Outlet />
      </main>

      {/* ─── Mobile bottom tab bar ─── */}
      <nav
        className="fixed bottom-0 inset-x-0 z-30 md:hidden bg-bg-surface border-t border-border flex pb-safe"
        aria-label="Primary"
      >
        {bottomTabs.map((tab) => {
          if (tab.permission && !hasPermission(tab.permission)) return null;
          if (tab.studentOnly && !isStudent) return null;
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
