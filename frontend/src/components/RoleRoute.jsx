import { Navigate, Outlet } from 'react-router-dom';
import { useAuth, isRecruiter } from '../context/AuthContext';

export function LearnerRoute() {
  const { user } = useAuth();
  if (isRecruiter(user)) return <Navigate to="/business-dashboard" replace />;
  return <Outlet />;
}

export function RecruiterRoute() {
  const { user } = useAuth();
  if (!isRecruiter(user)) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}