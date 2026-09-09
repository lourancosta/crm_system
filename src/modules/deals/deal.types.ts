export type Deal = {
  id: string;
  hubspotId: string | null;
  archived: boolean;
  dealname: string | null;
  closedate: Date | null;
  dealstage: string | null;
  pipeline: string | null;
  amount: string | null;
  certificationModules: string | null;
  dealPartnerType: string | null;
  controllerDealOwnerName: string | null;
  createdate: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type BoardDeal = {
  id: string;
  dealname: string | null;
  amount: string | null;
  dealstage: string | null;
  pipeline: string | null;
  closedate: Date | null;
};

export type CreateDealInput = {
  dealname: string;
  pipeline?: string;
  dealstage?: string;
  amount?: string;
  closedate?: string;
  certificationModules?: string;
  dealPartnerType?: string;
};

export type UpdateDealInput = Partial<CreateDealInput>;

export type PaginatedResult<T> = {
  data: T[];
  total: number;
  page: number;
  limit: number;
};
