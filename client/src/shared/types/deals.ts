export type Deal = {
  id: string;
  hubspotId: string | null;
  archived: boolean;
  dealname: string | null;
  closedate: string | null;
  dealstage: string | null;
  pipeline: string | null;
  amount: string | null;
  certificationModules: string | null;
  controllerDealOwnerName: string | null;
  createdate: string | null;
  createdAt: string;
  updatedAt: string;
};

export type BoardDeal = {
  id: string;
  dealname: string | null;
  amount: string | null;
  dealstage: string | null;
  pipeline: string | null;
  closedate: string | null;
};

export type CreateDealInput = {
  dealname: string;
  dealstage?: string;
  amount?: string;
  closedate?: string;
  certificationModules?: string;
};

export type UpdateDealInput = Partial<CreateDealInput>;

export type AssociatedDeal = {
  id: string;
  dealname: string | null;
  amount: string | null;
  closedate: string | null;
};
