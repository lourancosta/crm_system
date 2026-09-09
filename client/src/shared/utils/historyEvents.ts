import type { HistoryEvent } from '../components/RecordDetail/RecordDetail';
import type { HistoryEntry } from '../types/index';
import { htmlToPlainText } from './htmlToPlainText';

// Real HTML always contains a tag (e.g. "<p>...</p>"); plain text a user
// typed essentially never does, even if it contains a stray "<"/">" (e.g.
// "check if x < y" has no closing tag to match). Detecting structurally
// rather than trusting `type` matters because 'note'/'call'/'meeting'
// entries are a mix: manually logged ones are plain text (typed in a
// <textarea>), but HubSpot-synced ones (see engagementActivity module) are
// real HTML just like 'email' always is.
const HTML_TAG_PATTERN = /<[a-z][\s\S]*>/i;

export function toHistoryEvents(entries: HistoryEntry[]): HistoryEvent[] {
  return entries.map((e) => {
    const content = e.description ?? e.title;
    return {
      id: e.id,
      date: e.occurredAt,
      type: e.type,
      title: HTML_TAG_PATTERN.test(content) ? htmlToPlainText(content) : content,
      description: e.userName ? `by ${e.userName}` : undefined,
    };
  });
}
