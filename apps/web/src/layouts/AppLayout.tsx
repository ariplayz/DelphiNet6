import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import {
  LayoutDashboard,
  BookOpen,
  GraduationCap,
  ClipboardList,
  Home,
  Shield,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface NavItem {
  to: string;
  icon: React.ReactNode;
  label: string;
  permission?: string;
}

const mainNav: NavItem[] = [
  { to: '/dashboard', icon: <LayoutDashboard size={18} />, label: 'Dashboard' },
  { to: '/programs', icon: <BookOpen size={18} />, label: 'Programs' },
  { to: '/classes', icon: <GraduationCap size={18} />, label: 'Classes' },
  { to: '/attendance', icon: <ClipboardList size={18} />, label: 'Attendance' },
  { to: '/dorms', icon: <Home size={18} />, label: 'Dorms', permission: 'dorm.captain' },
  { to: '/student-council', icon: <Shield size={18} />, label: 'Student Council', permission: 'success_story.verify' },
];

const adminNav: NavItem[] = [
  { to: '/admin/users', icon: <Settings size={18} />, label: 'Users', permission: 'users.manage' },
  { to: '/admin/roles', icon: <Shield size={18} />, label: 'Roles', permission: 'roles.assign' },
  { to: '/admin/stats', icon: <LayoutDashboard size={18} />, label: 'Analytics', permission: 'analytics.view' },
];

function SidebarLink({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  const { hasPermission } = useAuth();
  if (item.permission && !hasPermission(item.permission)) return null;
  return (
    <NavLink
      to={item.to}
      className={({ isActive }) =>
        clsx(
          'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
          isActive
            ? 'bg-brand text-white'
            : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover',
          collapsed && 'justify-center',
        )
      }
    >
      {item.icon}
      {!collapsed && <span>{item.label}</span>}
    </NavLink>
  );
}

export function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout, hasPermission } = useAuth();
  const navigate = useNavigate();

  const hasAnyAdminPerm = adminNav.some((item) => item.permission && hasPermission(item.permission));

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-bg-base overflow-hidden">
      {/* Sidebar */}
      <aside
        className={clsx(
          'flex flex-col bg-bg-surface border-r border-border transition-all duration-200 flex-shrink-0',
          collapsed ? 'w-[60px]' : 'w-[240px]',
        )}
      >
        {/* Logo */}
        <div className={clsx('flex items-center gap-3 px-4 py-4 border-b border-border', collapsed && 'justify-center px-0')}>
          <div className="w-8 h-8 rounded-lg bg-brand flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-sm">D</span>
          </div>
          {!collapsed && (
            <span className="font-semibold text-text-primary text-sm">DelphiNet 6</span>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto p-2 flex flex-col gap-1">
          {mainNav.map((item) => (
            <SidebarLink key={item.to} item={item} collapsed={collapsed} />
          ))}

          {hasAnyAdminPerm && (
            <>
              <div className="my-2 border-t border-border" />
              {!collapsed && (
                <p className="text-xs text-text-disabled uppercase font-semibold px-3 py-1">Admin</p>
              )}
              {adminNav.map((item) => (
                <SidebarLink key={item.to} item={item} collapsed={collapsed} />
              ))}
            </>
          )}
        </nav>

        {/* User + collapse */}
        <div className="border-t border-border p-2">
          {!collapsed && user && (
            <div className="flex items-center gap-2 px-2 py-2 mb-1">
              <div className="w-7 h-7 rounded-full bg-brand-muted border border-brand/30 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-medium text-brand">
                  {user.firstName[0]}{user.lastName[0]}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-text-primary truncate">{user.firstName} {user.lastName}</p>
                <p className="text-xs text-text-secondary truncate">{user.email}</p>
              </div>
              <button onClick={handleLogout} className="text-text-disabled hover:text-danger transition-colors">
                <LogOut size={14} />
              </button>
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={clsx(
              'w-full flex items-center justify-center py-2 rounded-lg text-text-secondary hover:bg-bg-hover transition-colors',
              collapsed ? 'px-0' : 'px-2',
            )}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="h-14 border-b border-border bg-bg-surface flex items-center px-6 flex-shrink-0">
          <div className="flex-1">
            {user?.schoolId && (
              <span className="text-sm text-text-secondary">
                School: <span className="text-text-primary font-medium">{user.schoolId}</span>
              </span>
            )}
          </div>
          {collapsed && user && (
            <button onClick={handleLogout} className="text-text-secondary hover:text-danger transition-colors p-2">
              <LogOut size={16} />
            </button>
          )}
        </header>
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
