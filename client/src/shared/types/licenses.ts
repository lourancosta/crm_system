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
  platformCreatedDate: string | null;
  activationDate: string | null;
  expirationDate: string | null;
  licenseGroup: string | null;
  module: string | null;
  revokeDate: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateLicenseInput = {
  name: string;
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

export type AssociatedLicense = {
  id: string;
  name: string | null;
  status: string | null;
  customerName: string | null;
  expirationDate: string | null;
};
