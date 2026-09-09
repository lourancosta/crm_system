import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { User as UserIcon, UserRoundPen } from 'lucide-react';
import { Button } from '../../../shared/components/Button/Button';
import { Select } from '../../../shared/components/Dropdown/Select';
import { SettingsCard } from '../../../shared/components/SettingsCard/SettingsCard';
import { landingPageOptionsFor } from '../../../shared/constants/navGroups';
import { useAuth } from '../../../shared/contexts/AuthContext';
import { useAvatarSrc } from '../../../shared/hooks/useAvatarSrc';
import { FileStorageBanner } from '../../../shared/components/SetupBanner/FileStorageBanner';
import styles from './ProfileTab.module.css';

// Every user's own info (name/phone/photo) plus which object list they land
// on after login — the self-service counterpart to the admin-only User
// Information form on Settings > Users & Permission.
export function ProfileTab() {
  const { user, updateMe, uploadAvatar } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [defaultLandingPage, setDefaultLandingPage] = useState('dashboard');
  const [isSaving, setIsSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const avatarSrc = useAvatarSrc(user?.avatarUrl);

  useEffect(() => {
    if (!user) return;
    setFirstName(user.firstName);
    setLastName(user.lastName);
    setPhone(user.phone ?? '');
    setDefaultLandingPage(user.defaultLandingPage);
  }, [user]);

  if (!user) return null;

  const landingPageOptions = landingPageOptionsFor(user.accountType);

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    setSaveMsg('');
    try {
      await updateMe({ firstName, lastName, phone, defaultLandingPage });
      setSaveMsg('Saved');
      setTimeout(() => setSaveMsg(''), 2500);
    } catch {
      setSaveMsg('Failed to save');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setIsUploadingAvatar(true);
    setAvatarError('');
    try {
      await uploadAvatar(file);
    } catch {
      setAvatarError('Failed to upload photo');
    } finally {
      setIsUploadingAvatar(false);
    }
  }

  return (
    <div style={{ maxWidth: 560, marginBottom: 16 }}>
      <SettingsCard title="Your Information">
        <form onSubmit={handleSave} className={`settings-form ${styles['profile-form']}`}>
          <FileStorageBanner />
          <div className="form-group">
            <label>Profile Image</label>
            <button
              type="button"
              className={styles['avatar-button']}
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingAvatar}
              aria-label="Upload profile photo"
            >
              {avatarSrc ? (
                <img src={avatarSrc} alt="" className={styles['avatar-image']} />
              ) : (
                <UserIcon size={32} className={styles['avatar-placeholder-icon']} />
              )}
              <span className={styles['avatar-hover-overlay']}>
                <UserRoundPen size={32} className={styles['avatar-hover-icon']} />
              </span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={handleAvatarChange}
            />
            {avatarError && <span className={styles['save-error']}>{avatarError}</span>}
          </div>
          <div className="form-group">
            <label>First name</label>
            <input value={firstName} onChange={(e) => setFirstName(e.target.value)} required autoFocus />
          </div>
          <div className="form-group">
            <label>Last name</label>
            <input value={lastName} onChange={(e) => setLastName(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Phone</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Default landing page</label>
            <Select
              value={defaultLandingPage}
              onChange={setDefaultLandingPage}
              options={landingPageOptions}
              ariaLabel="Default landing page"
            />
          </div>
          <div className="settings-form-footer">
            <Button type="submit" disabled={isSaving}>
              {isSaving ? 'Saving…' : 'Save changes'}
            </Button>
            {saveMsg && (
              <span className={saveMsg === 'Saved' ? styles['save-success'] : styles['save-error']}>{saveMsg}</span>
            )}
          </div>
        </form>
      </SettingsCard>
    </div>
  );
}
