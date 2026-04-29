import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { Spinner } from './components/ui/Spinner';
import { AppLayout } from './layouts/AppLayout';
import { AuthLayout } from './layouts/AuthLayout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { AdminUsersPage } from './pages/admin/AdminUsersPage';
import { AdminRolesPage } from './pages/admin/AdminRolesPage';
import { AdminStatsPage } from './pages/admin/AdminStatsPage';
import { ClassesListPage } from './pages/classes/ClassesListPage';
import { ClassDetailPage } from './pages/classes/ClassDetailPage';
import { RollCallListPage } from './pages/rollcall/RollCallListPage';
import { RollCallPage } from './pages/rollcall/RollCallPage';
import { MyAttendancePage } from './pages/me/MyAttendancePage';
import { MySchedulePage } from './pages/me/MySchedulePage';
import { SettingsPage } from './pages/SettingsPage';
import { VerificationQueuePage } from './pages/verification/VerificationQueuePage';
import { DormsListPage } from './pages/dorms/DormsListPage';
import { DormDetailPage } from './pages/dorms/DormDetailPage';
import { DormRollCallListPage } from './pages/dorms/DormRollCallListPage';
import { DormRollCallPage } from './pages/dorms/DormRollCallPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="min-h-screen bg-bg-base flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function PermissionRoute({ permission, children }: { permission: string; children: React.ReactNode }) {
  const { user, isLoading, hasPermission } = useAuth();
  if (isLoading) {
    return (
      <div className="min-h-screen bg-bg-base flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (!hasPermission(permission)) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
      </Route>

      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/classes" element={<ClassesListPage />} />
        <Route path="/classes/:id" element={<ClassDetailPage />} />
        <Route
          path="/roll-call"
          element={
            <PermissionRoute permission="attendance.record">
              <RollCallListPage />
            </PermissionRoute>
          }
        />
        <Route
          path="/roll-call/:sessionId"
          element={
            <PermissionRoute permission="attendance.record">
              <RollCallPage />
            </PermissionRoute>
          }
        />
        <Route path="/me/attendance" element={<MyAttendancePage />} />
        <Route path="/me/schedule" element={<MySchedulePage />} />
        <Route path="/me/settings" element={<SettingsPage />} />
        <Route path="/dorms" element={<DormsListPage />} />
        <Route path="/dorms/:id" element={<DormDetailPage />} />
        <Route
          path="/dorm-roll-call"
          element={
            <PermissionRoute permission="dorm.roll_call">
              <DormRollCallListPage />
            </PermissionRoute>
          }
        />
        <Route
          path="/dorm-roll-call/:slotId"
          element={
            <PermissionRoute permission="dorm.roll_call">
              <DormRollCallPage />
            </PermissionRoute>
          }
        />
        <Route
          path="/verification"
          element={
            <PermissionRoute permission="attendance.verify">
              <VerificationQueuePage />
            </PermissionRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <PermissionRoute permission="users.manage">
              <AdminUsersPage />
            </PermissionRoute>
          }
        />
        <Route
          path="/admin/roles"
          element={
            <PermissionRoute permission="roles.assign">
              <AdminRolesPage />
            </PermissionRoute>
          }
        />
        <Route
          path="/admin/stats"
          element={
            <PermissionRoute permission="analytics.view">
              <AdminStatsPage />
            </PermissionRoute>
          }
        />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

