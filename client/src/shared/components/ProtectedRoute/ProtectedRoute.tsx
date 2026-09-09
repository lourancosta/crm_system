import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import type { AccountType } from '../../types/index';

// allowedTypes is defense in depth — the backend is the real boundary — but
// it keeps a partner/customer login from ever rendering an internal-only
// page shell (even briefly) if they navigate to it directly by URL.
export function ProtectedRoute({ children, allowedTypes }: { children: ReactNode; allowedTypes?: AccountType[] }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <div className="loading">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (allowedTypes && !allowedTypes.includes(user.accountType)) return <Navigate to="/" replace />;
  return <>{children}</>;
}
