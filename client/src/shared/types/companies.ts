export type Company = {
  id: string;
  hubspotId: string | null;
  archived: boolean;
  name: string | null;
  lifecyclestage: string | null;
  industry: string | null;
  domain: string | null;
  website: string | null;
  phone: string | null;
  description: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  zip: string | null;
  numberofemployees: string | null;
  annualrevenue: string | null;
  partnerMspLevel: string | null;
  createdate: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateCompanyInput = {
  name: string;
  domain?: string;
  industry?: string;
  lifecyclestage?: string;
  phone?: string;
  website?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
};

export type UpdateCompanyInput = Partial<CreateCompanyInput>;

export type AssociatedCompany = {
  id: string;
  name: string | null;
  domain: string | null;
  website: string | null;
};
