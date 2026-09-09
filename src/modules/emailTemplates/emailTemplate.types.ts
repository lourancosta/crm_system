// Extend when a new feature's templates need their own token set.
export const EMAIL_TEMPLATE_OBJECTS = ['contacts', 'companies', 'deals', 'invoices'] as const;
export type EmailTemplateObject = (typeof EMAIL_TEMPLATE_OBJECTS)[number];

export type EmailTemplate = {
  id: string;
  name: string;
  subject: string;
  htmlBody: string;
  objects: EmailTemplateObject[];
  createdAt: Date;
  updatedAt: Date;
};

export type CreateEmailTemplateInput = {
  name: string;
  subject: string;
  htmlBody: string;
  objects: EmailTemplateObject[];
};

export type UpdateEmailTemplateInput = Partial<CreateEmailTemplateInput>;

export type PaginatedResult<T> = {
  data: T[];
  total: number;
  page: number;
  limit: number;
};
