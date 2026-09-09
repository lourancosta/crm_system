// Barrel re-export — types live in per-domain files below (mirroring the
// backend's src/modules/<domain>/ split), but every existing import in the
// app goes through this one file, so nothing else had to change when this
// was split out of one 1000+ line file.
export * from './permissions';
export * from './users';
export * from './contacts';
export * from './companies';
export * from './deals';
export * from './invoices';
export * from './licenses';
export * from './partnerships';
export * from './products';
export * from './quotes';
export * from './payments';
export * from './tickets';
export * from './creditMemos';
export * from './reminders';
export * from './dashboard';
export * from './history';
export * from './pipelines';
export * from './knowledgeBase';
export * from './emailAccounts';
export * from './emailTemplates';
export * from './supportInbox';
export * from './search';
export * from './snippets';
export * from './associations';
