import { del, get, post, put } from './client';
import type { ObjectValue } from '../../features/settings/objects/ObjectsPage';

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

export type UpdatePropertyInput = {
  object: ObjectValue;
  label: string;
  groupId: string | null;
};

export const objectPropertiesApi = {
  list: (object: ObjectValue) => get<ObjectProperty[]>(`/object-properties?object=${object}`),
  updateProperty: (columnName: string, input: UpdatePropertyInput) => put<void>(`/object-properties/${columnName}`, input),

  listGroups: (object: ObjectValue) => get<PropertyGroup[]>(`/object-properties/groups?object=${object}`),
  createGroup: (object: ObjectValue, label: string) => post<PropertyGroup>('/object-properties/groups', { object, label }),
  updateGroup: (id: string, label: string) => put<PropertyGroup>(`/object-properties/groups/${id}`, { label }),
  deleteGroup: (id: string) => del(`/object-properties/groups/${id}`),

  // Raw record values (every column, unlike each object's own curated
  // xxxApi.getById) — used by GroupedPropertiesPanel to render values
  // alongside the property/group metadata above.
  getRecordValues: (object: ObjectValue, id: string) => get<Record<string, unknown>>(`/object-properties/record?object=${object}&id=${id}`),
  updateRecordValues: (object: ObjectValue, id: string, values: Record<string, unknown>) =>
    put<void>('/object-properties/record', { object, id, values }),
};
