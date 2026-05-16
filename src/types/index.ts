export interface OrgInfo {
  id: string;
  name: string;
}

export interface Member {
  id: string;
  orgId: string;
  name: string;
  order: number;
}

export interface Category {
  id: string;
  orgId: string;
  name: string;
  order: number;
}

export interface Item {
  id: string;
  orgId: string;
  name: string;
  categoryId: string;
  categoryName: string;
  ownerId: string;
  ownerName: string;
  order: number;
  lastTransferDate: string | null;
}

export interface TransferRecord {
  id: string;
  orgId: string;
  itemId: string;
  itemName: string;
  fromMemberId: string | null;
  fromMemberName: string | null;
  toMemberId: string;
  toMemberName: string;
  transferDate: string;
}

export interface OrgData {
  members: Member[];
  categories: Category[];
  items: Item[];
  transfers: TransferRecord[];
}

export type ViewMode = 'member' | 'all' | 'history' | 'search';
