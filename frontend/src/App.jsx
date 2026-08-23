import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth, isRecruiter } from './context/AuthContext';
import { EnrollmentsProvider } from './context/EnrollmentsContext';
import { ApplicationsProvider } from './context/ApplicationsContext';
import { ToastProvider } from './context/ToastContext';
import { CookieConsentProvider } from './context/CookieConsentContext';
import Sidebar from './components/Layout/Sidebar';
import Topbar from './components/Layout/Topbar';
import MobileNav from './components/Layout/MobileNav';
import Footer from './components/Layout/Footer';
import CookieBanner from './components/shared/CookieBanner';
import { LearnerRoute, RecruiterRoute } from './components/RoleRoute';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ConfirmEmailPage from './pages/ConfirmEmailPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import OverviewPage from './pages/OverviewPage';
import SkillsPage from './pages/SkillsPage';
import JobsPage from './pages/JobsPage';
import JobDetailPage from './pages/JobDetailPage';
import CoursesPage from './pages/CoursesPage';
import CourseContentPage from './pages/CourseContentPage';
import ApplicationsPage from './pages/ApplicationsPage';
import AssessmentsPage from './pages/AssessmentsPage';
import CredentialsPage from './pages/CredentialsPage';
import HelpPage from './pages/HelpPage';
import BusinessDashboardPage from './pages/BusinessDashboardPage';
import PostJobPage from './pages/PostJobPage';
import EditJobPage from './pages/EditJobPage';
import JobApplicationsPage from './pages/JobApplicationsPage';
import NotFoundPage from './pages/NotFoundPage';
import ProfilePage from './pages/ProfilePage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import TermsOfServicePage from './pages/TermsOfServicePage';

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
    <div className="app-shell" style={appStyles.app}>
      <Sidebar />
      <main style={appStyles.main}>
        <Topbar />
        <div className="page-content" style={appStyles.content}>
          <Outlet />
        </div>
        <Footer />
      </main>
      <MobileNav />
    </div>
  );
}

function PublicRoute() {
  const { user } = useAuth();
  if (user) return <Navigate to={isRecruiter(user) ? '/business-dashboard' : '/dashboard'} replace />;
  return <Outlet />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CookieConsentProvider>
          <EnrollmentsProvider>
            <ApplicationsProvider>
              <ToastProvider>
                <Routes>
                  <Route path="/" element={<LandingPage />} />
                  <Route element={<PublicRoute />}>
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/register" element={<RegisterPage />} />
                    <Route path="/confirm-email" element={<ConfirmEmailPage />} />
                    <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                    <Route path="/reset-password" element={<ResetPasswordPage />} />
                  </Route>
                  <Route element={<ProtectedRoute />}>
                    <Route element={<LearnerRoute />}>
                      <Route path="/dashboard" element={<OverviewPage />} />
                      <Route path="/skills" element={<SkillsPage />} />
                      <Route path="/jobs" element={<JobsPage />} />
                      <Route path="/jobs/:postId" element={<JobDetailPage />} />
                      <Route path="/courses" element={<CoursesPage />} />
                      <Route path="/courses/:courseId/learn" element={<CourseContentPage />} />
                      <Route path="/courses/:courseId/learn/:lessonId" element={<CourseContentPage />} />
                      <Route path="/applications" element={<ApplicationsPage />} />
                      <Route path="/assessments" element={<AssessmentsPage />} />
                      <Route path="/credentials" element={<CredentialsPage />} />
                    </Route>
                    <Route element={<RecruiterRoute />}>
                      <Route path="/business-dashboard" element={<BusinessDashboardPage />} />
                      <Route path="/post-job" element={<PostJobPage />} />
                      <Route path="/edit-job/:postId" element={<EditJobPage />} />
                      <Route path="/job-applications" element={<JobApplicationsPage />} />
                    </Route>
                    <Route path="/profile" element={<ProfilePage />} />
                    <Route path="/help" element={<HelpPage />} />
                  </Route>
                  <Route path="/privacy" element={<PrivacyPolicyPage />} />
                  <Route path="/terms" element={<TermsOfServicePage />} />
                  <Route path="*" element={<NotFoundPage />} />
                </Routes>
                <CookieBanner />
              </ToastProvider>
            </ApplicationsProvider>
          </EnrollmentsProvider>
        </CookieConsentProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
