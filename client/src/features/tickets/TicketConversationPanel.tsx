import { useState } from 'react';
import type { FormEvent } from 'react';
import { Button } from '../../shared/components/Button/Button';
import { htmlToPlainText } from '../../shared/utils/htmlToPlainText';
import { ticketsApi } from './api/tickets';
import type { HistoryEntry } from '../../shared/types/index';
import styles from './TicketConversationPanel.module.css';

type Props = {
  ticketId: string;
  history: HistoryEntry[];
  onSent: () => void;
};

// 'Reply sent' is the title already persisted on older history rows from
// before this was renamed — keep matching both so past messages still show
// up on the right side of the thread.
const OUTBOUND_TITLES = new Set(['Reply sent', 'Message sent']);

function fmt(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function TicketConversationPanel({ ticketId, history, onSent }: Props) {
  const [content, setContent] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');

  const messages = history
    .filter((h) => h.type === 'email')
    .sort((a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime());

  async function handleSend(e: FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    setError('');
    setIsSending(true);
    try {
      await ticketsApi.sendReply(ticketId, content.trim());
      setContent('');
      onSent();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className={styles.panel}>
      <h3 className={styles.title}>Conversation</h3>

      <div className={styles.thread}>
        {messages.length === 0 ? (
          <div className="empty">No messages yet</div>
        ) : (
          messages.map((m) => {
            const outbound = OUTBOUND_TITLES.has(m.title);
            return (
              <div key={m.id} className={`${styles.message} ${outbound ? styles['message--outbound'] : styles['message--inbound']}`}>
                <div className={styles['message-header']}>
                  <span className={styles['message-sender']}>{outbound ? m.userName ?? 'You' : 'Requester'}</span>
                  <span className={styles['message-date']}>{fmt(m.occurredAt)}</span>
                </div>
                <div className={styles['message-body']}>{htmlToPlainText(m.description ?? '')}</div>
              </div>
            );
          })
        )}
      </div>

      <form onSubmit={handleSend} className={styles.composer}>
        {error && <div className="alert alert-error">{error}</div>}
        <div className="form-group">
          <textarea
            rows={4}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write a message…"
          />
        </div>
        <Button type="submit" disabled={isSending || !content.trim()}>
          {isSending ? 'Sending…' : 'Send message'}
        </Button>
      </form>
    </div>
  );
}
