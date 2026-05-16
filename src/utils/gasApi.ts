import { GAS_URL } from '../config';
import type { OrgInfo, OrgData, Member, Category, Item, TransferRecord } from '../types';

async function post<T>(action: string, data: Record<string, unknown> = {}): Promise<T> {
  if (!GAS_URL) throw new Error('GAS URLが設定されていません');
  const res = await fetch(GAS_URL, {
    method: 'POST',
    redirect: 'follow',
    body: JSON.stringify({ action, ...data }),
  });
  const json = await res.json() as { ok: boolean; data: T; error?: string };
  if (!json.ok) throw new Error(json.error ?? 'GASエラー');
  return json.data;
}

// ---- Auth ----

export async function authLogin(password: string): Promise<OrgInfo> {
  return post<OrgInfo>('auth', { password });
}

export async function adminVerify(token: string): Promise<void> {
  await post('admin/verify', { token });
}

export async function adminGetOrgs(token: string): Promise<(OrgInfo & { password: string })[]> {
  return post('admin/orgs', { token });
}

export async function adminCreateOrg(token: string, name: string, password: string): Promise<OrgInfo> {
  return post<OrgInfo>('admin/orgs/create', { token, name, password });
}

export async function adminDeleteOrg(token: string, orgId: string): Promise<void> {
  await post('admin/orgs/delete', { token, orgId });
}

// ---- Data ----

export async function getData(orgId: string): Promise<OrgData> {
  return post<OrgData>('getData', { orgId });
}

// ---- Members ----

export async function upsertMember(orgId: string, member: Partial<Member> & { name: string; order: number }): Promise<Member> {
  return post<Member>('members/upsert', { orgId, member });
}

export async function deleteMember(memberId: string): Promise<void> {
  await post('members/delete', { memberId });
}

export async function reorderMembers(orgId: string, order: { id: string; order: number }[]): Promise<void> {
  await post('members/reorder', { orgId, order });
}

// ---- Categories ----

export async function upsertCategory(orgId: string, category: Partial<Category> & { name: string; order: number }): Promise<Category> {
  return post<Category>('categories/upsert', { orgId, category });
}

export async function deleteCategory(categoryId: string): Promise<void> {
  await post('categories/delete', { categoryId });
}

export async function reorderCategories(orgId: string, order: { id: string; order: number }[]): Promise<void> {
  await post('categories/reorder', { orgId, order });
}

// ---- Items ----

export async function upsertItem(orgId: string, item: Partial<Item> & { name: string; categoryId: string; categoryName: string; ownerId: string; ownerName: string; order: number }): Promise<Item> {
  return post<Item>('items/upsert', { orgId, item });
}

export async function deleteItem(itemId: string): Promise<void> {
  await post('items/delete', { itemId });
}

export async function reorderItems(orgId: string, order: { id: string; order: number }[]): Promise<void> {
  await post('items/reorder', { orgId, order });
}

export async function transferItem(
  orgId: string,
  itemId: string,
  toMemberId: string,
  toMemberName: string,
): Promise<{ transfer: TransferRecord; updatedItem: Partial<Item> }> {
  return post('items/transfer', { orgId, itemId, toMemberId, toMemberName });
}
