export type Product = {
  id: string;
  hubspotId: string | null;
  archived: boolean;
  name: string | null;
  description: string | null;
  hsPriceUsd: string | null;
  price: string | null;
  hsPricingModel: string | null;
  hsProductType: string | null;
  hsProductClassification: string | null;
  hsStatus: string | null;
  hsFolder: string | null;
  recurringbillingfrequency: string | null;
  controllerOriginalQuantity: string | null;
  controllerTotalLicenseUnits: string | null;
  controllerUnitPrice: string | null;
  module: string | null;
  groupLicense: string | null;
  createdate: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateProductInput = {
  name: string;
  description?: string;
  hsPriceUsd?: string;
  hsProductType?: string;
  hsPricingModel?: string;
  recurringbillingfrequency?: string;
  controllerOriginalQuantity?: string;
  module?: string;
  groupLicense?: string;
};

export type UpdateProductInput = Partial<CreateProductInput>;
