export type SearchResultType =
  | 'contact'
  | 'company'
  | 'deal'
  | 'ticket'
  | 'invoice'
  | 'payment'
  | 'creditMemo'
  | 'license'
  | 'partnership'
  | 'quote';

export type SearchResultItem = {
  type: SearchResultType;
  id: string;
  title: string;
  subtitle: string | null;
};

export type SearchResultGroup = {
  type: SearchResultType;
  label: string;
  items: SearchResultItem[];
};
