export type Ticket = {
  id: string;
  hubspotId: string | null;
  archived: boolean;
  subject: string | null;
  content: string | null;
  hsPipeline: string | null;
  hsPipelineStage: string | null;
  hsTicketPriority: string | null;
  hsTicketCategory: string | null;
  createdAt: string;
  updatedAt: string;
};

export type BoardTicket = {
  id: string;
  subject: string | null;
  hsPipeline: string | null;
  hsPipelineStage: string | null;
  hsTicketPriority: string | null;
};

export type CreateTicketInput = {
  subject: string;
  content?: string;
  hsTicketPriority?: string;
  hsTicketCategory?: string;
};

export type UpdateTicketInput = Partial<CreateTicketInput>;

export type AssociatedTicket = {
  id: string;
  subject: string | null;
  hsPipelineStage: string | null;
  hsTicketPriority: string | null;
  createdAt: string;
};
