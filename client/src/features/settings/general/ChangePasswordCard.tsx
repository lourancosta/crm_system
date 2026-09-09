import { useState } from 'react';
import type { FormEvent } from 'react';
import { ApiError } from '../../../shared/api/client';
import { Button } from '../../../shared/components/Button/Button';
import { SettingsCard } from '../../../shared/components/SettingsCard/SettingsCard';
import { authApi } from '../../auth/api/auth';
import styles from './ProfileTab.module.css';

export function ChangePasswordCard() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [saveMsgIsError, setSaveMsgIsError] = useState(false);

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setSaveMsg('');
    if (newPassword !== confirmPassword) {
      setSaveMsgIsError(true);
      setSaveMsg('New passwords do not match');
      return;
    }
    setIsSaving(true);
    try {
      await authApi.changePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setSaveMsgIsError(false);
      setSaveMsg('Saved');
      setTimeout(() => setSaveMsg(''), 2500);
    } catch (err) {
      setSaveMsgIsError(true);
      setSaveMsg(err instanceof ApiError ? err.message : 'Failed to change password');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <SettingsCard title="Change Password">
      <form onSubmit={handleSave} className="settings-form">
        <div className="form-group">
          <label>Current password</label>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label>New password</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            minLength={8}
          />
        </div>
        <div className="form-group">
          <label>Confirm new password</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={8}
          />
        </div>
        <div className="settings-form-footer">
          <Button type="submit" disabled={isSaving}>
            {isSaving ? 'Saving…' : 'Change password'}
          </Button>
          {saveMsg && (
            <span className={saveMsgIsError ? styles['save-error'] : styles['save-success']}>{saveMsg}</span>
          )}
        </div>
      </form>
    </SettingsCard>
  );
}
