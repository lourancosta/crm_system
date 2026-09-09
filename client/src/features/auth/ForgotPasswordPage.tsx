import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ApiError } from '../../shared/api/client';
import { Button } from '../../shared/components/Button/Button';
import { Input } from '../../shared/components/Input/Input';
import { authApi } from './api/auth';
import styles from './Auth.module.css';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await authApi.forgotPassword(email);
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className={styles['auth-page']}>
      <div className={styles['auth-card']}>
        <div className={styles['auth-card-logo']}>CRM System</div>
        <h2>Forgot password</h2>
        {error && <div className="alert alert-error">{error}</div>}
        {submitted ? (
          <p>If an account exists for that email, we've sent a reset link. Check your inbox.</p>
        ) : (
          <form onSubmit={handleSubmit} className="form">
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
            <Button type="submit" isLoading={isLoading} fullWidth>
              Send reset link
            </Button>
          </form>
        )}
        <div className={styles['auth-footer']}>
          <Link to="/login">Back to login</Link>
        </div>
      </div>
    </div>
  );
}
