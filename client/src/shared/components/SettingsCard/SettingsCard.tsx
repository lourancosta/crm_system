import type { ReactNode } from 'react';
import styles from './SettingsCard.module.css';

type Props = {
  title: string;
  children: ReactNode;
  variant?: 'default' | 'danger';
  // Most cards use the page background for the title bar; steps that sit on
  // top of an input-colored surface (the quote wizard) ask for the same
  // input background instead, so the title bar doesn't look like a plain box.
  titleBackground?: 'default' | 'input';
  shadow?: boolean;
  // Escape hatch for the rare caller that needs the root card itself to
  // participate in a flex layout (e.g. stretching to fill remaining height)
  // instead of just sizing to its content — every other caller leaves this
  // unset and gets the same plain block behavior as before.
  className?: string;
};

// The one bordered "title bar + body" card shape reused across Settings
// pages (User Information, Account Defaults) and the quote wizard's steps
// (Deal/Buyer Info/Your Info) — consolidated here after it had been
// copy-pasted per-file across five separate CSS modules.
export function SettingsCard({
  title,
  children,
  variant = 'default',
  titleBackground = 'default',
  shadow = false,
  className,
}: Props) {
  const cardClassName = [
    styles['settings-card'],
    variant === 'danger' && styles['settings-card--danger'],
    shadow && styles['settings-card--shadow'],
    className,
  ]
    .filter(Boolean)
    .join(' ');
  const titleClassName = `${styles['settings-card-title']}${titleBackground === 'input' ? ` ${styles['settings-card-title--input']}` : ''}`;

  return (
    <div className={cardClassName}>
      <div className={titleClassName}>{title}</div>
      {children}
    </div>
  );
}

export function SettingsCardBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={`${styles['settings-card-body']}${className ? ` ${className}` : ''}`}>{children}</div>;
}
