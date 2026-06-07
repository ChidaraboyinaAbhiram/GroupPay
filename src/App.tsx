import React, { useState, useEffect, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet, useSearchParams } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { ToastProvider } from './components/ui/Toast';
import { Layout } from './components/Layout';
import { Loading } from './components/ui/Loading';
import { ExpenseModal } from './components/ExpenseModal';
import { ErrorBoundary } from './components/ui/ErrorBoundary';

// Lazy-loaded Pages for code splitting & performance optimization
const Landing = React.lazy(() => import('./pages/Landing'));
const Login = React.lazy(() => import('./pages/auth/Login'));
const Signup = React.lazy(() => import('./pages/auth/Signup'));
const ForgotPassword = React.lazy(() => import('./pages/auth/ForgotPassword'));
const Dashboard = React.lazy(() => import('./pages/dashboard/Dashboard'));
const Friends = React.lazy(() => import('./pages/friends/Friends'));
const Groups = React.lazy(() => import('./pages/groups/Groups'));
const GroupDetails = React.lazy(() => import('./pages/groups/GroupDetails'));
const Profile = React.lazy(() => import('./pages/profile/Profile'));
const Settings = React.lazy(() => import('./pages/settings/Settings'));
const Activity = React.lazy(() => import('./pages/activity/Activity'));
const Settlements = React.lazy(() => import('./pages/settlements/Settlements'));
const NotFound = React.lazy(() => import('./pages/NotFound'));

// Protects routes and binds them with the global Layout shell
function ProtectedRoute({ onAddExpenseClick }: { onAddExpenseClick: () => void }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <Loading fullPage message="Authenticating session security..." />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <Layout onAddExpenseClick={onAddExpenseClick}>
      <Outlet />
    </Layout>
  );
}

// Inner content component to access React Router hooks like useSearchParams
function AppContent() {
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    // Detect action triggers from URLs (e.g. ?action=add-expense)
    if (searchParams.get('action') === 'add-expense') {
      setExpenseModalOpen(true);
      // Clean query parameters without adding history entry
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const handleExpenseSuccess = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <>
      <Suspense fallback={<Loading fullPage message="Assembling workspace assets..." />}>
        <Routes>
          {/* Public Landing Page */}
          <Route path="/" element={<Landing />} />

          {/* Public Auth Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />

          {/* Protected Application Workspace */}
          <Route element={<ProtectedRoute onAddExpenseClick={() => setExpenseModalOpen(true)} />}>
            <Route path="/dashboard" element={<Dashboard key={`dash-${refreshTrigger}`} />} />
            <Route path="/friends" element={<Friends key={`friends-${refreshTrigger}`} />} />
            <Route path="/groups" element={<Groups key={`groups-${refreshTrigger}`} />} />
            <Route path="/groups/:groupId" element={<GroupDetails key={`groupdetails-${refreshTrigger}`} />} />
            <Route path="/activity" element={<Activity key={`activity-${refreshTrigger}`} />} />
            <Route path="/settlements" element={<Settlements key={`settlements-${refreshTrigger}`} />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/settings" element={<Settings />} />
          </Route>

          {/* 404 Fallback page */}
          <Route path="/404" element={<NotFound />} />
          <Route path="*" element={<Navigate to="/404" replace />} />
        </Routes>
      </Suspense>

      {/* Global Add/Edit Expense Overlay Modal */}
      <ExpenseModal
        isOpen={expenseModalOpen}
        onClose={() => setExpenseModalOpen(false)}
        onSuccess={handleExpenseSuccess}
      />
    </>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <ErrorBoundary>
            <AppContent />
          </ErrorBoundary>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}

export default App;
