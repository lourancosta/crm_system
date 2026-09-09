import type { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import styles from './Layout.module.css';

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className={styles.layout}>
      <Sidebar />
      <div className={styles['content-area']}>
        <TopBar />
        <main className={styles['main-content']}>{children}</main>
      </div>
    </div>
  );
}
