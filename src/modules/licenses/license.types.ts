export type License = {
  id: string;
  hubspotId: string | null;
  archived: boolean;
  name: string | null;
  status: string | null;
  customerName: string | null;
  partnerName: string | null;
  typeObj: string | null;
  subscription: string | null;
  quantity: string | null;
  platformCreatedDate: Date | null;
  activationDate: Date | null;
  expirationDate: Date | null;
  licenseGroup: string | null;
  module: string | null;
  revokeDate: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateLicenseInput = {
  name: string;
  status?: string;
  customerName?: string;
  partnerName?: string;
  typeObj?: string;
  subscription?: string;
  quantity?: string;
  platformCreatedDate?: string;
  activationDate?: string;
  expirationDate?: string;
  revokeDate?: string;
  licenseGroup?: string;
  module?: string;
};

export type UpdateLicenseInput = {
  name?: string;
  status?: string;
  customerName?: string;
  partnerName?: string;
  typeObj?: string;
  subscription?: string;
  quantity?: string;
  activationDate?: string;
  expirationDate?: string;
  revokeDate?: string;
  licenseGroup?: string;
  module?: string;
};

export type PaginatedResult<T> = {
  data: T[];
  total: number;
  page: number;
  limit: number;
};
