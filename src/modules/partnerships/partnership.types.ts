export type Partnership = {
  id: string;
  hubspotId: string | null;
  archived: boolean;
  name: string | null;
  companyName: string | null;
  typeObj: string | null;
  mspLevel: string | null;
  hsPipeline: string | null;
  hsPipelineStage: string | null;
  contractSignatureDate: string | null;
  closeDate: string | null;
  distributor: string | null;
  certificationPartnerPrograms: string | null;
  controllerCurrentPartnerOwner: string | null;
  hsCreatedate: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type BoardPartnership = {
  id: string;
  name: string | null;
  hsPipeline: string | null;
  hsPipelineStage: string | null;
  mspLevel: string | null;
  closeDate: string | null;
};

export type CreatePartnershipInput = {
  name: string;
  companyName?: string;
  closeDate?: string;
  typeObj?: string;
  mspLevel?: string;
  distributor?: string;
  certificationPartnerPrograms?: string;
};

export type UpdatePartnershipInput = Partial<CreatePartnershipInput>;

export type PaginatedResult<T> = {
  data: T[];
  total: number;
  page: number;
  limit: number;
};
