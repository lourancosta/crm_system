import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { createPortal } from 'react-dom';
import { Bold, Image as ImageIcon, Italic, Link as LinkIcon, List, MessageSquareQuote, Video as VideoIcon } from 'lucide-react';
import { knowledgeBaseApi } from './api/knowledgeBase';
import { buildButtonHtml } from '../../shared/utils/richEditorButton';
import { isPrivateMediaUrl, resolvePrivateMediaUrl } from '../../shared/utils/privateMedia';
import { useDropdownPosition } from '../../shared/hooks/useDropdownPosition';
import rowActionsStyles from '../../shared/components/Dropdown/RowActionsMenu.module.css';
import styles from '../../shared/components/RichTextEditor/RichTextEditor.module.css';

type ArticleEditorProps = {
  value: string;
  onChange: (html: string) => void;
  visibility: string;
  // Stretches the editor (and its contentEditable body) to fill the height
  // of a flex parent instead of the default fixed min/max-height - used by
  // the fullscreen article editor modal.
  fillHeight?: boolean;
};

// Matches the .kb-callout--<id> modifier classes in index.css (global,
// non-CSS-modules - see the comment there for why).
const CALLOUT_TYPES = [
  { id: 'tip', label: 'Tip', color: '#6FB8C9' },
  { id: 'note', label: 'Note', color: '#6FCDA8' },
  { id: 'caution', label: 'Caution', color: '#EFA6A3' },
  { id: 'warning', label: 'Warning', color: '#D97C4F' },
] as const;

type CalloutType = (typeof CALLOUT_TYPES)[number];

function toEmbedUrl(url: string): string {
  const youtube = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([\w-]+)/);
  if (youtube) return `https://www.youtube.com/embed/${youtube[1]}`;
  const vimeo = url.match(/vimeo\.com\/(\d+)/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
  return url;
}

function CalloutMenuButton({ onSelect }: { onSelect: (type: CalloutType) => void }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const { pos, menuRef, open: openAt, close: resetPos } = useDropdownPosition();

  function openMenu() {
    openAt(triggerRef.current);
    setOpen(true);
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
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={styles['rich-editor-btn']}
        onClick={() => (open ? closeMenu() : openMenu())}
        title="Insert callout"
      >
        <MessageSquareQuote size={15} />
      </button>
      {open &&
        pos &&
        createPortal(
          <div
            ref={menuRef}
            className={rowActionsStyles['row-actions-dropdown']}
            style={{ top: pos.top, bottom: pos.bottom, left: pos.left }}
          >
            {CALLOUT_TYPES.map((type) => (
              <button
                key={type.id}
                type="button"
                className={rowActionsStyles['row-actions-item']}
                onClick={() => {
                  closeMenu();
                  onSelect(type);
                }}
              >
                <span
                  style={{
                    display: 'inline-block',
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    background: type.color,
                    flexShrink: 0,
                  }}
                />
                {type.label}
              </button>
            ))}
          </div>,
          document.body,
        )}
    </>
  );
}

export function ArticleEditor({ value, onChange, visibility, fillHeight }: ArticleEditorProps) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const initialized = useRef(false);
  // Private media is displayed as a session-local blob: URL (a plain <img>
  // can't send the Bearer header GCS needs), but persisted content must keep
  // the stable canonical path - this maps blob URL -> canonical path so
  // emitChange can reverse the swap before it reaches onChange.
  const mediaUrlMap = useRef(new Map<string, string>());

  useEffect(() => {
    if (bodyRef.current && !initialized.current) {
      bodyRef.current.innerHTML = value;
      initialized.current = true;
      void displayPrivateMedia(bodyRef.current);
    }
  }, [value]);

  async function displayPrivateMedia(root: HTMLElement) {
    const imgs = Array.from(root.querySelectorAll('img')).filter((img) =>
      isPrivateMediaUrl(img.getAttribute('src') ?? ''),
    );
    await Promise.all(
      imgs.map(async (img) => {
        const canonical = img.getAttribute('src')!;
        try {
          const blobUrl = await resolvePrivateMediaUrl(canonical);
          mediaUrlMap.current.set(blobUrl, canonical);
          img.src = blobUrl;
        } catch {
          // leave the broken image as-is
        }
      }),
    );
  }

  function emitChange() {
    if (!bodyRef.current) return;
    const clone = bodyRef.current.cloneNode(true) as HTMLElement;
    clone.querySelectorAll('img').forEach((img) => {
      const canonical = mediaUrlMap.current.get(img.getAttribute('src') ?? '');
      if (canonical) img.setAttribute('src', canonical);
    });
    onChange(clone.innerHTML);
  }

  function exec(command: string, arg?: string) {
    bodyRef.current?.focus();
    document.execCommand(command, false, arg);
    emitChange();
  }

  function handleAddVideo() {
    const url = window.prompt('Video URL (YouTube, Vimeo, or a direct .mp4 link):');
    if (!url) return;
    bodyRef.current?.focus();
    const embed = toEmbedUrl(url);
    const html = /\.mp4($|\?)/.test(url)
      ? `<video controls src="${embed}" style="max-width:100%"></video><p><br></p>`
      : `<div class="kb-video-embed"><iframe src="${embed}" allowfullscreen frameborder="0"></iframe></div><p><br></p>`;
    document.execCommand('insertHTML', false, html);
    emitChange();
  }

  function insertCallout(type: CalloutType) {
    bodyRef.current?.focus();
    document.execCommand(
      'insertHTML',
      false,
      `<div class="kb-callout kb-callout--${type.id}"><strong>${type.label}:</strong> Callout text</div><p><br></p>`,
    );
    emitChange();
  }

  function handleAddButton() {
    const url = window.prompt('Button URL (e.g. a link to an external document):');
    if (!url) return;
    const label = window.prompt('Button text:', 'Learn more') || 'Learn more';
    bodyRef.current?.focus();
    document.execCommand('insertHTML', false, buildButtonHtml(url, label));
    emitChange();
  }

  async function handleFileSelected(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const { url } = await knowledgeBaseApi.uploadMedia(file, visibility);
      bodyRef.current?.focus();
      document.execCommand('insertImage', false, url);
      if (isPrivateMediaUrl(url) && bodyRef.current) {
        await displayPrivateMedia(bodyRef.current);
      }
      emitChange();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Upload failed');
    }
  }

  return (
    <div className={styles['rich-editor']} style={fillHeight ? { display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 } : undefined}>
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
        <button type="button" className={styles['rich-editor-btn']} onClick={handleAddVideo} title="Insert video">
          <VideoIcon size={15} />
        </button>
        <CalloutMenuButton onSelect={insertCallout} />
        <button type="button" className={styles['rich-editor-btn']} onClick={handleAddButton} title="Insert button (link)">
          <LinkIcon size={15} />
        </button>
      </div>
      <div
        ref={bodyRef}
        className={styles['rich-editor-body']}
        style={fillHeight ? { flex: 1, minHeight: 0, maxHeight: 'none' } : undefined}
        contentEditable
        onInput={emitChange}
        onBlur={emitChange}
      />
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
