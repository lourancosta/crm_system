export type ProductRecord = {
  id: string;
  hubspotId: string | null;
  archived: boolean;
  name: string | null;
  description: string | null;
  hsSku: string | null;
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
  createdate: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateProductInput = {
  name: string;
  description?: string;
  hsSku?: string;
  hsPriceUsd?: string;
  controllerUnitPrice?: string;
  hsProductType?: string;
  hsPricingModel?: string;
  recurringbillingfrequency?: string;
  controllerOriginalQuantity?: string;
  module?: string;
  groupLicense?: string;
};

export type UpdateProductInput = Partial<CreateProductInput>;

export type PaginatedResult<T> = {
  data: T[];
  total: number;
  page: number;
  limit: number;
};
