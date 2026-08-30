import { Navigate, Outlet } from 'react-router-dom';
import { useAuth, isRecruiter, isCourseProvider, getDashboardPath } from '../context/AuthContext';

export function LearnerRoute() {
  const { user } = useAuth();
  if (isRecruiter(user) || isCourseProvider(user)) return <Navigate to={getDashboardPath(user)} replace />;
  return <Outlet />;
}

export function RecruiterRoute() {
  const { user } = useAuth();
  if (!isRecruiter(user)) return <Navigate to={getDashboardPath(user)} replace />;
  return <Outlet />;
}

export function CourseProviderRoute() {
  const { user } = useAuth();
  if (!isCourseProvider(user)) return <Navigate to={getDashboardPath(user)} replace />;
  return <Outlet />;
}

export function CourseStudioRoute() {
  const { user } = useAuth();
  if (!isRecruiter(user) && !isCourseProvider(user)) return <Navigate to={getDashboardPath(user)} replace />;
  return <Outlet />;
}