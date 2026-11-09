import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Suspense, useEffect } from 'react';
import * as apiClient from './api/client';
import { lazyPage, retryFailedPages } from './lib/lazyPage';
import { loginUrlFor, resolvePostLoginPath } from './lib/returnPath';
import TideTransition from './components/water/TideTransition';
import ChunkErrorBoundary from './components/shared/ChunkErrorBoundary';
import { trackPageview } from './lib/analytics';
import { AuthProvider, useAuth } from './context/AuthContext';
import { EnrollmentsProvider } from './context/EnrollmentsContext';
import { ApplicationsProvider } from './context/ApplicationsContext';
import { ToastProvider } from './context/ToastContext';
import { CookieConsentProvider } from './context/CookieConsentContext';
import { getDashboardPath as getDashboardPathStore } from './context/AuthContext';
import AppShell from './components/Layout/AppShell';
import CookieBanner from './components/shared/CookieBanner';
import { LearnerRoute, RecruiterRoute, CourseProviderRoute, CourseStudioRoute } from './components/RoleRoute';
const LandingPage = lazyPage(() => import('./pages/LandingPage'));
const LoginPage = lazyPage(() => import('./pages/LoginPage'));
const RegisterPage = lazyPage(() => import('./pages/RegisterPage'));
const ConfirmEmailPage = lazyPage(() => import('./pages/ConfirmEmailPage'));
const ForgotPasswordPage = lazyPage(() => import('./pages/ForgotPasswordPage'));
const ResetPasswordPage = lazyPage(() => import('./pages/ResetPasswordPage'));
const OverviewPage = lazyPage(() => import('./pages/OverviewPage'));
const SkillsPage = lazyPage(() => import('./pages/SkillsPage'));
const JobsPage = lazyPage(() => import('./pages/JobsPage'));
const JobDetailPage = lazyPage(() => import('./pages/JobDetailPage'));
const CoursesPage = lazyPage(() => import('./pages/CoursesPage'));
const CourseContentPage = lazyPage(() => import('./pages/CourseContentPage'));
const ApplicationsPage = lazyPage(() => import('./pages/ApplicationsPage'));
const AssessmentsPage = lazyPage(() => import('./pages/AssessmentsPage'));
const CredentialsPage = lazyPage(() => import('./pages/CredentialsPage'));
const CertificateDetailPage = lazyPage(() => import('./pages/CertificateDetailPage'));
const HelpPage = lazyPage(() => import('./pages/HelpPage'));
const BusinessDashboardPage = lazyPage(() => import('./pages/BusinessDashboardPage'));
const PostJobPage = lazyPage(() => import('./pages/PostJobPage'));
const EditJobPage = lazyPage(() => import('./pages/EditJobPage'));
const JobApplicationsPage = lazyPage(() => import('./pages/JobApplicationsPage'));
const NotFoundPage = lazyPage(() => import('./pages/NotFoundPage'));
const ProfilePage = lazyPage(() => import('./pages/ProfilePage'));
const CompanyProfilePage = lazyPage(() => import('./pages/CompanyProfilePage'));
const CompanyProfileEditPage = lazyPage(() => import('./pages/CompanyProfileEditPage'));
const PrivacyPolicyPage = lazyPage(() => import('./pages/PrivacyPolicyPage'));
const TermsOfServicePage = lazyPage(() => import('./pages/TermsOfServicePage'));
const VerifyCertificatePage = lazyPage(() => import('./pages/VerifyCertificatePage'));
const CourseManagementPage = lazyPage(() => import('./pages/CourseManagementPage'));
const ProviderDashboardPage = lazyPage(() => import('./pages/ProviderDashboardPage'));

function PageFallback() {
  // `data-route-loading` lets the shell hide the footer while the page chunk loads (see AppShell.module.css),
  // so it cannot shift when the page's own skeleton/content mounts.
  return <div role="status" aria-live="polite" data-route-loading="true" style={{ padding: 24, color: 'var(--muted)' }}>Loading...</div>;
}

/**
 * Route outlet: TideTransition keyed by pathname around a Suspense + error boundary, so a failed
 * chunk load shows a retryable message while the shell and current page URL stay in place.
 */
function PageOutlet() {
  const { pathname } = useLocation();
  return (
    <ChunkErrorBoundary key={pathname} onRetry={retryFailedPages}>
      <TideTransition transitionKey={pathname}>
        <Suspense fallback={<PageFallback />}>
          <Outlet />
        </Suspense>
      </TideTransition>
    </ChunkErrorBoundary>
  );
}

function ProtectedRoute() {
  // useAuth now delegates to Zustand (useAuthStore) - see src/stores/authStore.js
  const { user } = useAuth();
  const location = useLocation();
  if (!user) return <Navigate to={loginUrlFor(location)} replace />;
  return <AppShell />;
}

function PublicRoute() {
  const { user } = useAuth();
  const location = useLocation();
  if (user) return <Navigate to={resolvePostLoginPath(user, location.search)} replace />;
  return <PageOutlet />;
}

/** Lets the API client's redirects (401, 403) go through react-router instead of a full reload. */
function ApiNavigatorBridge() {
  const navigate = useNavigate();
  useEffect(() => {
    try {
      apiClient.setApiNavigator?.((url) => navigate(url, { replace: true }));
    } catch {
      // api client mocked without setApiNavigator (tests)
    }
    return () => {
      try {
        apiClient.setApiNavigator?.(null);
      } catch {
        // ignore
      }
    };
  }, [navigate]);
  return null;
}
function RootRoute() {
  return <LandingPage />;
}

function RouteTracker() {
  const location = useLocation();
  useEffect(() => {
    trackPageview(location.pathname);
  }, [location.pathname]);
  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <RouteTracker />
      <ApiNavigatorBridge />
      <AuthProvider>
        <CookieConsentProvider>
          <EnrollmentsProvider>
            <ApplicationsProvider>
              <ToastProvider>
                <Routes>
                  <Route element={<PageOutlet />}>
                  <Route path="/" element={<RootRoute />} />
                  </Route>
                  <Route element={<PublicRoute />}>
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/register" element={<RegisterPage />} />
                    <Route path="/confirm-email" element={<ConfirmEmailPage />} />
                    <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                    <Route path="/reset-password" element={<ResetPasswordPage />} />
                  </Route>
                  <Route element={<ProtectedRoute />}>
                    <Route element={<PageOutlet />}>
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
                      <Route path="/credentials/:certificateId" element={<CertificateDetailPage />} />
                    </Route>
                    <Route element={<RecruiterRoute />}>
                      <Route path="/business-dashboard" element={<BusinessDashboardPage />} />
                      <Route path="/post-job" element={<PostJobPage />} />
                      <Route path="/edit-job/:postId" element={<EditJobPage />} />
                      <Route path="/job-applications" element={<JobApplicationsPage />} />
                      <Route path="/company-profile" element={<CompanyProfileEditPage />} />
                    </Route>
                    <Route element={<CourseProviderRoute />}>
                      <Route path="/provider-dashboard" element={<ProviderDashboardPage />} />
                    </Route>
                    <Route element={<CourseStudioRoute />}>
                      <Route path="/company-courses" element={<CourseManagementPage />} />
                      <Route path="/company-courses/new" element={<CourseManagementPage />} />
                      <Route path="/company-courses/:courseId/edit" element={<CourseManagementPage />} />
                    </Route>
                    <Route path="/profile" element={<ProfilePage />} />
                    <Route path="/help" element={<HelpPage />} />
                    </Route>
                  </Route>
                  <Route element={<PageOutlet />}>
                    <Route path="/companies/:companyId" element={<CompanyProfilePage />} />
                    <Route path="/privacy" element={<PrivacyPolicyPage />} />
                    <Route path="/terms" element={<TermsOfServicePage />} />
                    <Route path="/verify/:serialNumber" element={<VerifyCertificatePage />} />
                    <Route path="*" element={<NotFoundPage />} />
                  </Route>
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
