import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ApiError } from '../../shared/api/client';
import { Button } from '../../shared/components/Button/Button';
import { Input } from '../../shared/components/Input/Input';
import { authApi } from './api/auth';
import styles from './Auth.module.css';

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') ?? '';
  const isInvite = searchParams.get('invite') === '1';
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const heading = isInvite ? 'Welcome to CRM System' : 'Reset password';
  const subtitle = isInvite ? 'Set your password to get started' : '';
  const submitLabel = isInvite ? 'Set password' : 'Reset password';

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setIsLoading(true);
    try {
      await authApi.resetPassword(token, password);
      navigate('/login', { state: { resetSuccess: true } });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  }

  if (!token) {
    return (
      <div className={styles['auth-page']}>
        <div className={styles['auth-card']}>
          <div className={styles['auth-card-logo']}>CRM System</div>
          <h2>Reset password</h2>
          <div className="alert alert-error">This reset link is invalid or has expired.</div>
          <div className={styles['auth-footer']}>
            <Link to="/forgot-password">Request a new link</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles['auth-page']}>
      <div className={styles['auth-card']}>
        <div className={styles['auth-card-logo']}>CRM System</div>
        <h2 className={isInvite ? styles['auth-card-heading-center'] : undefined}>{heading}</h2>
        {subtitle && (
          <p className={`${styles['auth-panel-subtitle']} ${isInvite ? styles['auth-panel-subtitle-left'] : ''}`}>{subtitle}</p>
        )}
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={handleSubmit} className="form">
          <Input
            label="New password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            autoFocus
          />
          <Input
            label="Confirm new password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={8}
          />
          <Button type="submit" isLoading={isLoading} fullWidth>
            {submitLabel}
          </Button>
        </form>
        <div className={styles['auth-footer']}>
          <Link to="/login">Back to login</Link>
        </div>
      </div>
    </div>
  );
}
