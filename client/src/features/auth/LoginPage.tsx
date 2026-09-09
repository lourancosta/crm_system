import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../shared/contexts/AuthContext';
import { ApiError } from '../../shared/api/client';
import { Button } from '../../shared/components/Button/Button';
import { pathForLandingPage } from '../../shared/constants/navGroups';
import styles from './Auth.module.css';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const resetSuccess = Boolean((location.state as { resetSuccess?: boolean } | null)?.resetSuccess);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const user = await login(email, password);
      navigate(pathForLandingPage(user.defaultLandingPage, user.accountType));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Login failed');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className={styles['auth-split']}>
      <div className={styles['auth-split-inner']}>
        <div className={styles['auth-hero']}>
          <div className={styles['auth-hero-logo']}>CRM System</div>
          <h1>
            Manage every customer relationship
            <br />
            <span className={styles['auth-hero-accent']}>in one place</span>
          </h1>
          <p>
            The CRM platform for your business. Track contacts, deals, invoices and support in a single
            workspace built around your team.
          </p>
        </div>

        <div className={styles['auth-panel']}>
          <div className={styles['auth-panel-card']}>
            <h2>Welcome back</h2>
            <p className={styles['auth-panel-subtitle']}>Sign in to your account</p>
            {resetSuccess && (
              <div className="alert alert-success">Password reset. Sign in with your new password.</div>
            )}
            {error && <div className="alert alert-error">{error}</div>}
            <form onSubmit={handleSubmit} className="form">
              <div className="form-group">
                <label htmlFor="login-email">Email</label>
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <div className="form-group">
                <div className={styles['auth-field-row']}>
                  <label htmlFor="login-password">Password</label>
                  <Link to="/forgot-password">Forgot password?</Link>
                </div>
                <input
                  id="login-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" variant="primary" isLoading={isLoading} fullWidth>
                Sign in
              </Button>
            </form>
          </div>
          <div className={styles['auth-panel-footer']}>
            © {new Date().getFullYear()} CRM System. All rights reserved.
          </div>
        </div>
      </div>
    </div>
  );
}
