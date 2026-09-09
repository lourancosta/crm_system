import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { KbArticlesPage } from './KbArticlesPage';
import { KbCategoriesPage } from './KbCategoriesPage';
import { FileStorageBanner } from '../../shared/components/SetupBanner/FileStorageBanner';

type Tab = 'categories' | 'articles';

export function KnowledgeBaseSettingsPage() {
  const location = useLocation();
  const initialTab = (location.state as { tab?: Tab } | null)?.tab ?? 'categories';
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <div className="page-header">
        <h1>Knowledge Base</h1>
      </div>

      <div className="detail-tabs" style={{ marginBottom: 16 }}>
        <button
          className={`detail-tab${activeTab === 'categories' ? ' detail-tab--active' : ''}`}
          onClick={() => setActiveTab('categories')}
        >
          Categories
        </button>
        <button
          className={`detail-tab${activeTab === 'articles' ? ' detail-tab--active' : ''}`}
          onClick={() => setActiveTab('articles')}
        >
          Articles
        </button>
      </div>

      <FileStorageBanner />

      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        {activeTab === 'categories' ? <KbCategoriesPage /> : <KbArticlesPage />}
      </div>
    </div>
  );
}
