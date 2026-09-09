import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { createPortal } from 'react-dom';
import { Bold, Braces, Image as ImageIcon, Italic, Link as LinkIcon, List, MessageSquareQuote } from 'lucide-react';
import { knowledgeBaseApi } from '../knowledge-base/api/knowledgeBase';
import { useDropdownPosition } from '../../shared/hooks/useDropdownPosition';
import { buildButtonHtml } from '../../shared/utils/richEditorButton';
import type { EmailToken } from './emailTemplateTokens';
import rowActionsStyles from '../../shared/components/Dropdown/RowActionsMenu.module.css';
import styles from '../../shared/components/RichTextEditor/RichTextEditor.module.css';

type EmailTemplateEditorProps = {
  value: string;
  onChange: (html: string) => void;
  tokens?: EmailToken[];
};

function TokenMenuButton({ tokens, onInsert }: { tokens: EmailToken[]; onInsert: (token: string) => void }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const { pos, menuRef, open: openAt, close: resetPos } = useDropdownPosition();

  const filteredTokens = tokens.filter((t) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return t.label.toLowerCase().includes(q) || t.token.toLowerCase().includes(q);
  });

  function openMenu() {
    openAt(triggerRef.current);
    setOpen(true);
    setSearch('');
    requestAnimationFrame(() => searchRef.current?.focus());
  }

  function closeMenu() {
    setOpen(false);
    resetPos();
  }

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (triggerRef.current?.contains(e.target as Node) || menuRef.current?.contains(e.target as Node)) return;
      closeMenu();
    }
    function onDismiss(e: Event) {
      if (menuRef.current?.contains(e.target as Node)) return;
      closeMenu();
    }
    document.addEventListener('mousedown', onDocClick);
    window.addEventListener('scroll', onDismiss, true);
    window.addEventListener('resize', onDismiss);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      window.removeEventListener('scroll', onDismiss, true);
      window.removeEventListener('resize', onDismiss);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={styles['rich-editor-btn']}
        onClick={() => (open ? closeMenu() : openMenu())}
        title="Insert token"
      >
        <Braces size={15} />
      </button>
      {open &&
        pos &&
        createPortal(
          <div
            ref={menuRef}
            className={rowActionsStyles['row-actions-dropdown']}
            style={{ top: pos.top, bottom: pos.bottom, left: pos.left, padding: 0, overflow: 'hidden' }}
          >
            <div style={{ padding: '8px 8px 4px', borderBottom: '1px solid var(--border)' }}>
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.stopPropagation()}
                placeholder="Search fields…"
                style={{ width: '100%', boxSizing: 'border-box', padding: 4 }}
              />
            </div>
            <div style={{ maxHeight: 280, overflowY: 'auto', padding: '4px 0' }}>
              {filteredTokens.length === 0 && (
                <div style={{ padding: '6px 12px', fontSize: 13, color: 'var(--text-muted)' }}>No matching fields</div>
              )}
              {filteredTokens.map((t) => (
                <button
                  key={t.label}
                  type="button"
                  className={rowActionsStyles['row-actions-item']}
                  onClick={() => {
                    closeMenu();
                    onInsert(t.token);
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

// Email HTML has to stand on its own in the recipient's inbox — no app
// stylesheet, no flexbox/CSS-variable support in clients like Outlook — so
// every inserted block below carries its own inline styles instead of a
// className, and there's no video button (iframes get stripped by every
// major email client).
export function EmailTemplateEditor({ value, onChange, tokens = [] }: EmailTemplateEditorProps) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (bodyRef.current && !initialized.current) {
      bodyRef.current.innerHTML = value;
      initialized.current = true;
    }
  }, [value]);

  function emitChange() {
    if (bodyRef.current) onChange(bodyRef.current.innerHTML);
  }

  function exec(command: string, arg?: string) {
    bodyRef.current?.focus();
    document.execCommand(command, false, arg);
    emitChange();
  }

  function handleAddCallout() {
    bodyRef.current?.focus();
    document.execCommand(
      'insertHTML',
      false,
      '<div style="padding:12px 14px;margin:12px 0;background-color:#dcfce7;border-left:3px solid #1e5e6c;border-radius:6px;font-size:14px;color:#111827;">💡 Callout text</div><p><br></p>',
    );
    emitChange();
  }

  function handleAddButton() {
    const url = window.prompt('Button URL (e.g. a link to the invoice preview):');
    if (!url) return;
    const label = window.prompt('Button text:', 'View invoice') || 'View invoice';
    bodyRef.current?.focus();
    document.execCommand('insertHTML', false, buildButtonHtml(url, label));
    emitChange();
  }

  function handleInsertToken(token: string) {
    bodyRef.current?.focus();
    document.execCommand('insertText', false, `{{${token}}}`);
    emitChange();
  }

  async function handleFileSelected(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      // Email assets are viewed by recipients in their own inbox, with no CRM
      // login at all, so they always need the public bucket regardless of
      // any KB visibility concept.
      const { url } = await knowledgeBaseApi.uploadMedia(file, 'public');
      bodyRef.current?.focus();
      document.execCommand(
        'insertHTML',
        false,
        `<img src="${url}" alt="" style="max-width:100%;border-radius:6px;margin:8px 0;" />`,
      );
      emitChange();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Upload failed');
    }
  }

  return (
    <div className={styles['rich-editor']}>
      <div className={styles['rich-editor-toolbar']}>
        <button type="button" className={styles['rich-editor-btn']} onClick={() => exec('bold')} title="Bold">
          <Bold size={15} />
        </button>
        <button type="button" className={styles['rich-editor-btn']} onClick={() => exec('italic')} title="Italic">
          <Italic size={15} />
        </button>
        <button
          type="button"
          className={styles['rich-editor-btn']}
          onClick={() => exec('insertUnorderedList')}
          title="Bullet list"
        >
          <List size={15} />
        </button>
        <div className={styles['rich-editor-btn-divider']} />
        <button
          type="button"
          className={styles['rich-editor-btn']}
          onClick={() => fileInputRef.current?.click()}
          title="Insert image"
        >
          <ImageIcon size={15} />
        </button>
        <button type="button" className={styles['rich-editor-btn']} onClick={handleAddCallout} title="Insert callout">
          <MessageSquareQuote size={15} />
        </button>
        <button type="button" className={styles['rich-editor-btn']} onClick={handleAddButton} title="Insert button (link)">
          <LinkIcon size={15} />
        </button>
        {tokens.length > 0 && (
          <>
            <div className={styles['rich-editor-btn-divider']} />
            <TokenMenuButton tokens={tokens} onInsert={handleInsertToken} />
          </>
        )}
      </div>
      <div ref={bodyRef} className={styles['rich-editor-body']} contentEditable onInput={emitChange} onBlur={emitChange} />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleFileSelected}
      />
    </div>
  );
}
