import { useEffect, useRef } from 'react';
import { Bold, ChevronDown, Italic, List } from 'lucide-react';
import { RowActionsMenu } from '../Dropdown/RowActionsMenu';
import styles from './RichTextEditor.module.css';
import type { Snippet } from '../../types/index';

type Props = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  // Stretches the editor (and its contentEditable body) to fill the height
  // of a flex parent instead of the default fixed min/max-height.
  fillHeight?: boolean;
  // When provided (and non-empty), adds an "Insert snippet" menu to the
  // toolbar — registered under Settings > Object > Invoices > Templates.
  snippets?: Snippet[];
};

// Minimal bold/italic/bullet-list editor — the same contentEditable +
// document.execCommand approach as ArticleEditor.tsx and
// EmailTemplateEditor.tsx (this codebase's established pattern, no
// third-party rich-text library), just without their image/video/callout/
// token extras, which none of this component's callers need. Produces a
// plain HTML string, the same shape already stored/rendered (via
// dangerouslySetInnerHTML) for KB articles, email templates, and quotes'
// own hsComments/hsTerms fields.
export function RichTextEditor({ value, onChange, placeholder, fillHeight, snippets }: Props) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);

  // Only runs once per mount, not on every value change, so it doesn't
  // clobber cursor position while the user is actively typing.
  useEffect(() => {
    if (bodyRef.current && !initialized.current) {
      bodyRef.current.innerHTML = value;
      initialized.current = true;
    }
  }, [value]);

  function emitChange() {
    if (!bodyRef.current) return;
    onChange(bodyRef.current.innerHTML);
  }

  function exec(command: string) {
    bodyRef.current?.focus();
    document.execCommand(command, false);
    emitChange();
  }

  // Inserts at the current cursor position (falls back to the end when the
  // editor isn't focused) — same execCommand mechanism as the bold/italic/
  // list buttons above, just passing HTML instead of a formatting command.
  function insertSnippet(html: string) {
    bodyRef.current?.focus();
    document.execCommand('insertHTML', false, html);
    emitChange();
  }

  return (
    <div
      className={styles['rich-editor']}
      style={fillHeight ? { display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 } : undefined}
    >
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
        {snippets && snippets.length > 0 && (
          <>
            <span className={styles['rich-editor-btn-divider']} />
            <RowActionsMenu
              label="Insert snippet"
              icon={ChevronDown}
              actions={snippets.map((s) => ({ label: s.name, onClick: () => insertSnippet(s.content) }))}
            />
          </>
        )}
      </div>
      <div
        ref={bodyRef}
        className={styles['rich-editor-body']}
        style={fillHeight ? { flex: 1, minHeight: 0, maxHeight: 'none' } : undefined}
        contentEditable
        onInput={emitChange}
        onBlur={emitChange}
        data-placeholder={placeholder}
      />
    </div>
  );
}
