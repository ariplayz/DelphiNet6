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
import { ClassSupervisorOverviewPage } from './pages/classes/ClassSupervisorOverviewPage';
import { SeminarsListPage } from './pages/seminars/SeminarsListPage';
import { SeminarRollCallPage } from './pages/seminars/SeminarRollCallPage';
import { MySeminarsLeadingPage } from './pages/seminars/MySeminarsLeadingPage';
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
import { ComingSoonPage } from './pages/ComingSoonPage';

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
        <Route path="/classes/:id/overview" element={<ClassSupervisorOverviewPage />} />
        <Route path="/seminars" element={<SeminarsListPage />} />
        <Route path="/seminar-roll-call" element={<MySeminarsLeadingPage />} />
        <Route path="/seminar-roll-call/:id" element={<SeminarRollCallPage />} />
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

        {/* Legacy DN5 menu placeholders — full pages land in later releases */}
        <Route path="/programs" element={<ComingSoonPage title="My Program" />} />
        <Route path="/ethics" element={<ComingSoonPage title="Write/Review Ethics Reports" />} />
        <Route path="/ethics/history" element={<ComingSoonPage title="My Ethics Report History" />} />
        <Route path="/ethics/campus" element={<ComingSoonPage title="Campus Ethics Reports" />} />
        <Route path="/tools/math-facts" element={<ComingSoonPage title="Math Facts" />} />
        <Route path="/tools/htfw" element={<ComingSoonPage title="Hard to Find Words" />} />
        <Route path="/students/lookup" element={<ComingSoonPage title="Student Lookup" />} />
        <Route path="/reports/by-term" element={<ComingSoonPage title="Report Generator (Students By Term)" />} />
        <Route path="/reports/class-schedules" element={<ComingSoonPage title="All Student Class Schedules" />} />
        <Route path="/reports/attendance" element={<ComingSoonPage title="Attendance Report" />} />
        <Route path="/reports/photos" element={<ComingSoonPage title="Photo Display" />} />
        <Route path="/reports/plus-minus" element={<ComingSoonPage title="+/- Days Report" />} />
        <Route path="/reports/plus-minus-5wk" element={<ComingSoonPage title="Five Week +/- Days Report" />} />
        <Route path="/rosters/seminars" element={<SeminarsListPage />} />
        <Route path="/rosters/afternoon" element={<ComingSoonPage title="Afternoon Class Rosters" />} />
        <Route path="/rosters/student-service" element={<ComingSoonPage title="Student Service Rosters" />} />
        <Route path="/rosters/night" element={<ComingSoonPage title="Night Class / Activity Rosters" />} />
        <Route path="/rosters/offered" element={<ComingSoonPage title="List of Classes Offered" />} />
        <Route path="/college-applications" element={<ComingSoonPage title="College Applications" />} />
        <Route path="/standards/cram" element={<ComingSoonPage title="Off Course Correction Assignments" />} />
        <Route path="/standards/success-stories" element={<ComingSoonPage title="My Success Story Entry" />} />
        <Route path="/routing/inbox" element={<ComingSoonPage title="My Routes To Handle" />} />
        <Route path="/routing/start" element={<ComingSoonPage title="Start Route" />} />
        <Route path="/routing/lookup" element={<ComingSoonPage title="Route Lookup By Student" />} />
        <Route path="/parents/student-info" element={<ComingSoonPage title="Student Info (Parent View)" />} />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

