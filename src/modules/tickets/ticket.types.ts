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
  createdAt: Date;
  updatedAt: Date;
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
  hsPipeline?: string;
  hsPipelineStage?: string;
};

export type UpdateTicketInput = Partial<CreateTicketInput>;

export type AssociatedContact = {
  id: string;
  firstname: string | null;
  lastname: string | null;
  email: string | null;
  jobtitle: string | null;
  company: string | null;
};

export type AssociatedCompany = {
  id: string;
  name: string | null;
  domain: string | null;
  website: string | null;
};

export type AssociatedDeal = {
  id: string;
  dealname: string | null;
  amount: string | null;
  closedate: Date | null;
};

export type PaginatedResult<T> = {
  data: T[];
  total: number;
  page: number;
  limit: number;
};
