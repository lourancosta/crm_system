export type ParsedInboundEmail = {
  messageId: string;
  inReplyTo?: string;
  references?: string[];
  subject?: string;
  text?: string;
  html?: string;
  fromAddress: string;
  fromName?: string;
};
