export type Contact = {
  id: string;
  hubspotId: string | null;
  archived: boolean;
  firstname: string | null;
  lastname: string | null;
  email: string | null;
  phone: string | null;
  mobilephone: string | null;
  company: string | null;
  jobtitle: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  country: string | null;
  website: string | null;
  lifecyclestage: string | null;
  hsLeadStatus: string | null;
  hubspotOwnerId: string | null;
  createdate: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateContactDTO = {
  firstname: string;
  lastname?: string;
  email: string;
  phone?: string;
  mobilephone?: string;
  company?: string;
  jobtitle?: string;
  city?: string;
  state?: string;
  country?: string;
};

export type UpdateContactDTO = Partial<CreateContactDTO>;

export type PaginatedResult<T> = {
  data: T[];
  total: number;
  page: number;
  limit: number;
};
