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
  createdate: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateContactInput = {
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

export type UpdateContactInput = Partial<CreateContactInput>;

export type AssociatedContact = {
  id: string;
  firstname: string | null;
  lastname: string | null;
  email: string | null;
  jobtitle: string | null;
  company: string | null;
};
