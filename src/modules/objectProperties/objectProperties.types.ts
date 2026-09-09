export type ObjectProperty = {
  columnName: string;
  dataType: string;
  nullable: boolean;
  label: string;
  groupId: string | null;
  groupLabel: string | null;
};

export type PropertyGroup = {
  id: string;
  hubspotGroupName: string;
  label: string;
  displayOrder: number | null;
  propertyCount: number;
};
