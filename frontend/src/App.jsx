import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth, isRecruiter } from './context/AuthContext';
import { EnrollmentsProvider } from './context/EnrollmentsContext';
import { ApplicationsProvider } from './context/ApplicationsContext';
import { ToastProvider } from './context/ToastContext';
import Sidebar from './components/Layout/Sidebar';
import Topbar from './components/Layout/Topbar';
import { LearnerRoute, RecruiterRoute } from './components/RoleRoute';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import OverviewPage from './pages/OverviewPage';
import SkillsPage from './pages/SkillsPage';
import JobsPage from './pages/JobsPage';
import CoursesPage from './pages/CoursesPage';
import ApplicationsPage from './pages/ApplicationsPage';
import AssessmentsPage from './pages/AssessmentsPage';
import CredentialsPage from './pages/CredentialsPage';
import HelpPage from './pages/HelpPage';
import BusinessDashboardPage from './pages/BusinessDashboardPage';

const appStyles = {
  app: {
    display: 'grid',
    gridTemplateColumns: '248px 1fr',
    minHeight: '100vh',
  },
  main: {
    minWidth: 0,
  },
  content: {
    padding: '42px clamp(20px, 4vw, 56px) 90px',
    maxWidth: 1450,
  },
  mobileOnly: {
    display: 'none',
  },
};

function ProtectedRoute() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return (
    <div style={appStyles.app}>
      <Sidebar />
      <main style={appStyles.main}>
        <Topbar />
        <div style={appStyles.content}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}

function PublicRoute() {
  const { user } = useAuth();
  if (user) return <Navigate to={isRecruiter(user) ? '/business-dashboard' : '/'} replace />;
  return <Outlet />;
}

function RoleRedirect() {
  const { user } = useAuth();
  return <Navigate to={isRecruiter(user) ? '/business-dashboard' : '/'} replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <EnrollmentsProvider>
          <ApplicationsProvider>
            <ToastProvider>
            <Routes>
            <Route element={<PublicRoute />}>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
            </Route>
            <Route element={<ProtectedRoute />}>
              <Route element={<LearnerRoute />}>
                <Route path="/" element={<OverviewPage />} />
                <Route path="/skills" element={<SkillsPage />} />
                <Route path="/jobs" element={<JobsPage />} />
                <Route path="/courses" element={<CoursesPage />} />
                <Route path="/applications" element={<ApplicationsPage />} />
                <Route path="/assessments" element={<AssessmentsPage />} />
                <Route path="/credentials" element={<CredentialsPage />} />
              </Route>
              <Route element={<RecruiterRoute />}>
                <Route path="/business-dashboard" element={<BusinessDashboardPage />} />
              </Route>
              <Route path="/help" element={<HelpPage />} />
            </Route>
            <Route path="*" element={<RoleRedirect />} />
          </Routes>
          </ToastProvider>
          </ApplicationsProvider>
        </EnrollmentsProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
