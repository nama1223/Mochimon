import { useState, useCallback } from 'react';
import type { Member, Category, Item, TransferRecord } from '../types';
import * as api from '../utils/gasApi';

export function useData(orgId: string) {
  const [members, setMembers] = useState<Member[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [transfers, setTransfers] = useState<TransferRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getData(orgId);
      setMembers(data.members);
      setCategories(data.categories);
      setItems(data.items);
      setTransfers(data.transfers);
    } catch (e) {
      setError(e instanceof Error ? e.message : '読み込みエラー');
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  // ---- Members ----

  async function addMember(name: string): Promise<Member> {
    const order = members.length > 0 ? Math.max(...members.map(m => m.order)) + 1 : 0;
    const created = await api.upsertMember(orgId, { name, order });
    setMembers(prev => [...prev, created]);
    return created;
  }

  async function updateMember(id: string, name: string) {
    const m = members.find(m => m.id === id);
    if (!m) return;
    const updated = await api.upsertMember(orgId, { ...m, name });
    setMembers(prev => prev.map(x => x.id === id ? updated : x));
    // update ownerName in items
    setItems(prev => prev.map(item =>
      item.ownerId === id ? { ...item, ownerName: name } : item
    ));
  }

  async function removeMember(id: string) {
    await api.deleteMember(id);
    setMembers(prev => prev.filter(m => m.id !== id));
  }

  async function moveMember(id: string, dir: 'up' | 'down') {
    const sorted = [...members].sort((a, b) => a.order - b.order);
    const idx = sorted.findIndex(m => m.id === id);
    const swapIdx = dir === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;

    const next = sorted.map((m, i) => {
      if (i === idx) return { ...m, order: sorted[swapIdx].order };
      if (i === swapIdx) return { ...m, order: sorted[idx].order };
      return m;
    });
    setMembers(next);
    await api.reorderMembers(orgId, next.map(m => ({ id: m.id, order: m.order })));
  }

  // ---- Categories ----

  async function addCategory(name: string): Promise<Category> {
    const order = categories.length > 0 ? Math.max(...categories.map(c => c.order)) + 1 : 0;
    const created = await api.upsertCategory(orgId, { name, order });
    setCategories(prev => [...prev, created]);
    return created;
  }

  async function updateCategory(id: string, name: string) {
    const c = categories.find(c => c.id === id);
    if (!c) return;
    const updated = await api.upsertCategory(orgId, { ...c, name });
    setCategories(prev => prev.map(x => x.id === id ? updated : x));
    setItems(prev => prev.map(item =>
      item.categoryId === id ? { ...item, categoryName: name } : item
    ));
  }

  async function removeCategory(id: string) {
    await api.deleteCategory(id);
    setCategories(prev => prev.filter(c => c.id !== id));
  }

  async function moveCategory(id: string, dir: 'up' | 'down') {
    const sorted = [...categories].sort((a, b) => a.order - b.order);
    const idx = sorted.findIndex(c => c.id === id);
    const swapIdx = dir === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;

    const next = sorted.map((c, i) => {
      if (i === idx) return { ...c, order: sorted[swapIdx].order };
      if (i === swapIdx) return { ...c, order: sorted[idx].order };
      return c;
    });
    setCategories(next);
    await api.reorderCategories(orgId, next.map(c => ({ id: c.id, order: c.order })));
  }

  // ---- Items ----

  async function addItem(
    ownerId: string,
    ownerName: string,
    name: string,
    categoryId: string,
    categoryName: string,
  ): Promise<Item> {
    const ownerItems = items.filter(i => i.ownerId === ownerId);
    const order = ownerItems.length > 0 ? Math.max(...ownerItems.map(i => i.order)) + 1 : 0;
    const created = await api.upsertItem(orgId, {
      name, categoryId, categoryName, ownerId, ownerName, order, lastTransferDate: null,
    });
    setItems(prev => [...prev, created]);
    return created;
  }

  async function updateItem(id: string, patch: Partial<Pick<Item, 'name' | 'categoryId' | 'categoryName'>>) {
    const item = items.find(i => i.id === id);
    if (!item) return;
    const updated = await api.upsertItem(orgId, { ...item, ...patch });
    setItems(prev => prev.map(x => x.id === id ? updated : x));
  }

  async function removeItem(id: string) {
    await api.deleteItem(id);
    setItems(prev => prev.filter(i => i.id !== id));
  }

  async function moveItem(id: string, ownerId: string, dir: 'up' | 'down') {
    const ownerItems = [...items]
      .filter(i => i.ownerId === ownerId)
      .sort((a, b) => a.order - b.order);
    const idx = ownerItems.findIndex(i => i.id === id);
    const swapIdx = dir === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= ownerItems.length) return;

    const nextOwnerItems = ownerItems.map((item, i) => {
      if (i === idx) return { ...item, order: ownerItems[swapIdx].order };
      if (i === swapIdx) return { ...item, order: ownerItems[idx].order };
      return item;
    });
    setItems(prev => prev.map(item => {
      const found = nextOwnerItems.find(n => n.id === item.id);
      return found ?? item;
    }));
    await api.reorderItems(orgId, nextOwnerItems.map(i => ({ id: i.id, order: i.order })));
  }

  async function transferItemTo(itemId: string, toMemberId: string, toMemberName: string) {
    const { transfer, updatedItem } = await api.transferItem(orgId, itemId, toMemberId, toMemberName);
    setItems(prev => prev.map(item =>
      item.id === itemId ? { ...item, ...updatedItem } : item
    ));
    setTransfers(prev => [transfer, ...prev]);
  }

  return {
    members, categories, items, transfers,
    loading, error, load,
    addMember, updateMember, removeMember, moveMember,
    addCategory, updateCategory, removeCategory, moveCategory,
    addItem, updateItem, removeItem, moveItem, transferItemTo,
  };
}
