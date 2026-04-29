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
import { ClassSchedulesPage } from './pages/reports/ClassSchedulesPage';
import { AttendanceReportPage } from './pages/reports/AttendanceReportPage';
import { StudentLookupPage } from './pages/students/StudentLookupPage';
import { ClassesOfferedPage } from './pages/rosters/ClassesOfferedPage';
import { ChangePasswordPage } from './pages/ChangePasswordPage';
import { AfternoonRostersPage } from './pages/rosters/AfternoonRostersPage';
import { StudentServiceRostersPage } from './pages/rosters/StudentServiceRostersPage';
import { NightRostersPage } from './pages/rosters/NightRostersPage';
import { HardToFindWordsPage } from './pages/tools/HardToFindWordsPage';
import { ByTermReportPage } from './pages/reports/ByTermReportPage';
import { PhotoDisplayPage } from './pages/reports/PhotoDisplayPage';
import { PlusMinusReportPage } from './pages/reports/PlusMinusReportPage';
import { PlusMinus5WkReportPage } from './pages/reports/PlusMinus5WkReportPage';
import { WriteEthicsPage } from './pages/ethics/WriteEthicsPage';
import { EthicsHistoryPage } from './pages/ethics/EthicsHistoryPage';
import { CampusEthicsPage } from './pages/ethics/CampusEthicsPage';
import { MyProgramPage } from './pages/programs/MyProgramPage';
import { CramPage } from './pages/standards/CramPage';
import { SuccessStoriesPage } from './pages/standards/SuccessStoriesPage';
import { RoutingInboxPage } from './pages/routing/RoutingInboxPage';
import { StartRoutePage } from './pages/routing/StartRoutePage';
import { RoutingLookupPage } from './pages/routing/RoutingLookupPage';
import { CollegeApplicationsPage } from './pages/college/CollegeApplicationsPage';

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
  if (user.mustChangePassword && window.location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />;
  }
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
        path="/change-password"
        element={
          <ProtectedRoute>
            <ChangePasswordPage />
          </ProtectedRoute>
        }
      />

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
        <Route path="/programs" element={<MyProgramPage />} />
        <Route path="/ethics" element={<WriteEthicsPage />} />
        <Route path="/ethics/history" element={<EthicsHistoryPage />} />
        <Route path="/ethics/campus" element={<CampusEthicsPage />} />
        <Route path="/tools/htfw" element={<HardToFindWordsPage />} />
        <Route path="/students/lookup" element={<StudentLookupPage />} />
        <Route path="/reports/by-term" element={<ByTermReportPage />} />
        <Route path="/reports/class-schedules" element={<ClassSchedulesPage />} />
        <Route path="/reports/attendance" element={<AttendanceReportPage />} />
        <Route path="/reports/photos" element={<PhotoDisplayPage />} />
        <Route path="/reports/plus-minus" element={<PlusMinusReportPage />} />
        <Route path="/reports/plus-minus-5wk" element={<PlusMinus5WkReportPage />} />
        <Route path="/rosters/seminars" element={<SeminarsListPage />} />
        <Route path="/rosters/afternoon" element={<AfternoonRostersPage />} />
        <Route path="/rosters/student-service" element={<StudentServiceRostersPage />} />
        <Route path="/rosters/night" element={<NightRostersPage />} />
        <Route path="/rosters/offered" element={<ClassesOfferedPage />} />
        <Route path="/college-applications" element={<CollegeApplicationsPage />} />
        <Route path="/standards/cram" element={<CramPage />} />
        <Route path="/standards/success-stories" element={<SuccessStoriesPage />} />
        <Route path="/routing/inbox" element={<RoutingInboxPage />} />
        <Route path="/routing/start" element={<StartRoutePage />} />
        <Route path="/routing/lookup" element={<RoutingLookupPage />} />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

