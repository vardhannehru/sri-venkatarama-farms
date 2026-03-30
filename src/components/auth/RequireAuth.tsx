import { Navigate, useLocation } from 'react-router-dom';
import type { UserRole } from '../../types';
import { getCurrentRole, isAuthed } from '../../lib/auth';

export function RequireAuth({
  children,
  allowedRoles,
}: {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}) {
  const location = useLocation();
  if (!isAuthed()) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  if (allowedRoles?.length) {
    const role = getCurrentRole();
    if (!role || !allowedRoles.includes(role)) {
      return <Navigate to={role === 'salesman' ? '/billing' : '/'} replace />;
    }
  }
  return <>{children}</>;
}
