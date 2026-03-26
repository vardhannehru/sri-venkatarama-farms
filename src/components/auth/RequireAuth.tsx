import { Navigate, useLocation } from 'react-router-dom';
import { isAuthed } from '../../lib/auth';

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  if (!isAuthed()) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <>{children}</>;
}
