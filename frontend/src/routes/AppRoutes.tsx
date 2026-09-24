import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import { AppLayout } from '../components/layout/AppLayout.js';
import { LoginPage } from '../pages/LoginPage.js';
import { RegisterPage } from '../pages/RegisterPage.js';
import { PageLoader } from '../components/ui/StateComponents.js';

// Route-level code-splitting for fast mobile bundle loading and smooth navigation
const DashboardView = React.lazy(() => import('../features/dashboard/DashboardView.js').then((m) => ({ default: m.DashboardView })));
const MembersPage = React.lazy(() => import('../pages/MembersPage.js').then((m) => ({ default: m.MembersPage })));
const MealsPage = React.lazy(() => import('../pages/MealsPage.js').then((m) => ({ default: m.MealsPage })));
const BazarPage = React.lazy(() => import('../pages/BazarPage.js').then((m) => ({ default: m.BazarPage })));
const ExpensesPage = React.lazy(() => import('../pages/ExpensesPage.js').then((m) => ({ default: m.ExpensesPage })));
const BillsUtilitiesPage = React.lazy(() => import('../pages/BillsUtilitiesPage.js').then((m) => ({ default: m.BillsUtilitiesPage })));
const LedgerPage = React.lazy(() => import('../pages/LedgerPage.js').then((m) => ({ default: m.LedgerPage })));
const NotificationsPage = React.lazy(() => import('../pages/NotificationsPage.js').then((m) => ({ default: m.NotificationsPage })));
const ProfileSettingsPage = React.lazy(() => import('../pages/ProfileSettingsPage.js').then((m) => ({ default: m.ProfileSettingsPage })));
const ReportsPage = React.lazy(() => import('../pages/ReportsPage.js').then((m) => ({ default: m.ReportsPage })));
const DocumentsPage = React.lazy(() => import('../pages/DocumentsPage.js').then((m) => ({ default: m.DocumentsPage })));
const MonthEndPage = React.lazy(() => import('../pages/MonthEndPage.js').then((m) => ({ default: m.MonthEndPage })));
const SettlementPage = React.lazy(() => import('../pages/SettlementPage.js').then((m) => ({ default: m.SettlementPage })));
const MessSettingsPage = React.lazy(() => import('../pages/MessSettingsPage.js').then((m) => ({ default: m.MessSettingsPage })));
const MemberDetailPage = React.lazy(() => import('../pages/MemberDetailPage.js').then((m) => ({ default: m.MemberDetailPage })));
const MemberStatementPage = React.lazy(() => import('../pages/MemberStatementPage.js').then((m) => ({ default: m.MemberStatementPage })));
const AcceptInvitationPage = React.lazy(() => import('../pages/AcceptInvitationPage.js').then((m) => ({ default: m.AcceptInvitationPage })));
const AuditLogsPage = React.lazy(() => import('../pages/AuditLogsPage.js').then((m) => ({ default: m.AuditLogsPage })));
const OnboardingPage = React.lazy(() => import('../pages/OnboardingPage.js').then((m) => ({ default: m.OnboardingPage })));

const ProtectedRoute: React.FC<{ children: React.ReactNode; allowNoMess?: boolean }> = ({ children, allowNoMess }) => {
  const { token, isLoading, user, activeMess } = useAuth();

  // Only block if loading and we have no cached user data to render immediately
  if (isLoading && !user && token) {
    return <PageLoader message="Authenticating session..." />;
  }

  if (!isLoading && !token) {
    return <Navigate to="/login" replace />;
  }

  if (!isLoading && token && !activeMess && !allowNoMess) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
};

const RoleRoute: React.FC<{
  allowedRoles: string[];
  children: React.ReactNode;
}> = ({ allowedRoles, children }) => {
  const { activeMess } = useAuth();
  const userRole = activeMess?.myRole || 'MEMBER';
  const effectiveRole = userRole === 'OWNER' ? 'MANAGER' : userRole;

  if (!allowedRoles.includes(userRole) && !allowedRoles.includes(effectiveRole)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

// Prefetch critical chunks during browser idle time so tab clicks are instant
const prefetchKeyRoutes = () => {
  const loaders = [
    () => import('../features/dashboard/DashboardView.js'),
    () => import('../pages/MealsPage.js'),
    () => import('../pages/BazarPage.js'),
    () => import('../pages/ExpensesPage.js'),
    () => import('../pages/LedgerPage.js'),
    () => import('../pages/MembersPage.js'),
    () => import('../pages/BillsUtilitiesPage.js'),
  ];
  loaders.forEach((loader, idx) => {
    setTimeout(() => {
      loader().catch(() => {});
    }, 1200 + idx * 300);
  });
};

export const AppRoutes: React.FC = () => {
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      if ('requestIdleCallback' in window) {
        (window as any).requestIdleCallback(() => prefetchKeyRoutes());
      } else {
        setTimeout(prefetchKeyRoutes, 1500);
      }
    }
  }, []);

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        path="/onboarding"
        element={
          <ProtectedRoute allowNoMess>
            <Suspense fallback={<PageLoader message="Loading workspace onboarding..." />}>
              <OnboardingPage />
            </Suspense>
          </ProtectedRoute>
        }
      />
      <Route
        path="/invite/:token"
        element={
          <Suspense fallback={<PageLoader message="Loading invitation..." />}>
            <AcceptInvitationPage />
          </Suspense>
        }
      />

      {/* Protected routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardView />} />
        <Route path="dashboard" element={<DashboardView />} />
        <Route path="members" element={<MembersPage />} />
        <Route path="members/:memberId" element={<MemberDetailPage />} />
        <Route path="members/:memberId/statement" element={<MemberStatementPage />} />
        <Route path="meals" element={<MealsPage />} />
        <Route path="bazar" element={<BazarPage />} />
        <Route path="bazaar" element={<BazarPage />} />
        <Route path="expenses" element={<ExpensesPage />} />
        <Route path="bills-utilities" element={<BillsUtilitiesPage />} />
        <Route path="bills" element={<Navigate to="/bills-utilities" replace />} />
        <Route path="fixed-bills" element={<Navigate to="/bills-utilities" replace />} />
        <Route path="utilities" element={<Navigate to="/bills-utilities" replace />} />
        <Route path="utilities-rent" element={<Navigate to="/bills-utilities" replace />} />
        <Route path="finance" element={<ExpensesPage />} />
        <Route path="ledger" element={<LedgerPage />} />
        <Route path="settlement" element={<SettlementPage />} />
        <Route
          path="month-end"
          element={
            <RoleRoute allowedRoles={['OWNER', 'MANAGER']}>
              <MonthEndPage />
            </RoleRoute>
          }
        />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="documents" element={<DocumentsPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="profile" element={<ProfileSettingsPage />} />
        <Route
          path="settings"
          element={
            <RoleRoute allowedRoles={['OWNER', 'MANAGER']}>
              <MessSettingsPage />
            </RoleRoute>
          }
        />
        <Route
          path="audit-logs"
          element={
            <RoleRoute allowedRoles={['OWNER', 'MANAGER']}>
              <AuditLogsPage />
            </RoleRoute>
          }
        />
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};
