import { useState, useCallback, useRef } from 'react';
import type { Member, Category, Item, TransferRecord } from '../types';
import * as api from '../utils/gasApi';

function tmpId() {
  return `tmp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export function useData(orgId: string) {
  const [members, setMembers] = useState<Member[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [transfers, setTransfers] = useState<TransferRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [bgError, setBgError] = useState<string | null>(null);
  // 移転中のアイテムIDセット（多重操作防止）
  const [pendingItems, setPendingItems] = useState<Set<string>>(new Set());

  const errorTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showBgError(msg: string) {
    setBgError(msg);
    if (errorTimer.current) clearTimeout(errorTimer.current);
    errorTimer.current = setTimeout(() => setBgError(null), 4000);
  }

  const load = useCallback(async () => {
    setLoading(true);
    setBgError(null);
    try {
      const data = await api.getData(orgId);
      setMembers(data.members);
      setCategories(data.categories);
      setItems(data.items);
      setTransfers(data.transfers);
    } catch (e) {
      setBgError(e instanceof Error ? e.message : '読み込みエラー');
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  // ---- Members ----

  async function addMember(name: string): Promise<Member> {
    const order = members.length > 0 ? Math.max(...members.map(m => m.order)) + 1 : 0;
    const tid = tmpId();
    const temp: Member = { id: tid, orgId, name, order };
    setMembers(prev => [...prev, temp]);
    try {
      const created = await api.upsertMember(orgId, { name, order });
      setMembers(prev => prev.map(m => m.id === tid ? created : m));
      return created;
    } catch (e) {
      setMembers(prev => prev.filter(m => m.id !== tid));
      showBgError(e instanceof Error ? e.message : 'メンバー追加失敗');
      throw e;
    }
  }

  async function updateMember(id: string, name: string) {
    const prev = members.find(m => m.id === id);
    if (!prev) return;
    setMembers(ms => ms.map(m => m.id === id ? { ...m, name } : m));
    setItems(is => is.map(i => i.ownerId === id ? { ...i, ownerName: name } : i));
    try {
      await api.upsertMember(orgId, { ...prev, name });
    } catch (e) {
      setMembers(ms => ms.map(m => m.id === id ? prev : m));
      showBgError(e instanceof Error ? e.message : 'メンバー更新失敗');
    }
  }

  async function removeMember(id: string) {
    const snap = members.find(m => m.id === id);
    setMembers(prev => prev.filter(m => m.id !== id));
    try {
      await api.deleteMember(id);
    } catch (e) {
      if (snap) setMembers(prev => [...prev, snap].sort((a, b) => a.order - b.order));
      showBgError(e instanceof Error ? e.message : 'メンバー削除失敗');
    }
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
    try {
      await api.reorderMembers(orgId, next.map(m => ({ id: m.id, order: m.order })));
    } catch (e) {
      setMembers(sorted);
      showBgError(e instanceof Error ? e.message : '並び替え失敗');
    }
  }

  // ---- Categories ----

  async function addCategory(name: string): Promise<Category> {
    const order = categories.length > 0 ? Math.max(...categories.map(c => c.order)) + 1 : 0;
    const tid = tmpId();
    const temp: Category = { id: tid, orgId, name, order };
    setCategories(prev => [...prev, temp]);
    try {
      const created = await api.upsertCategory(orgId, { name, order });
      setCategories(prev => prev.map(c => c.id === tid ? created : c));
      return created;
    } catch (e) {
      setCategories(prev => prev.filter(c => c.id !== tid));
      showBgError(e instanceof Error ? e.message : 'カテゴリ追加失敗');
      throw e;
    }
  }

  async function updateCategory(id: string, name: string) {
    const prev = categories.find(c => c.id === id);
    if (!prev) return;
    setCategories(cs => cs.map(c => c.id === id ? { ...c, name } : c));
    setItems(is => is.map(i => i.categoryId === id ? { ...i, categoryName: name } : i));
    try {
      await api.upsertCategory(orgId, { ...prev, name });
    } catch (e) {
      setCategories(cs => cs.map(c => c.id === id ? prev : c));
      showBgError(e instanceof Error ? e.message : 'カテゴリ更新失敗');
    }
  }

  async function removeCategory(id: string) {
    const snap = categories.find(c => c.id === id);
    setCategories(prev => prev.filter(c => c.id !== id));
    try {
      await api.deleteCategory(id);
    } catch (e) {
      if (snap) setCategories(prev => [...prev, snap].sort((a, b) => a.order - b.order));
      showBgError(e instanceof Error ? e.message : 'カテゴリ削除失敗');
    }
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
    try {
      await api.reorderCategories(orgId, next.map(c => ({ id: c.id, order: c.order })));
    } catch (e) {
      setCategories(sorted);
      showBgError(e instanceof Error ? e.message : '並び替え失敗');
    }
  }

  // ---- Items ----

  async function addItem(
    ownerId: string, ownerName: string,
    name: string, categoryId: string, categoryName: string,
  ): Promise<Item> {
    const ownerItems = items.filter(i => i.ownerId === ownerId);
    const order = ownerItems.length > 0 ? Math.max(...ownerItems.map(i => i.order)) + 1 : 0;
    const tid = tmpId();
    const temp: Item = { id: tid, orgId, name, categoryId, categoryName, ownerId, ownerName, order, lastTransferDate: null };
    setItems(prev => [...prev, temp]);
    try {
      const created = await api.upsertItem(orgId, { name, categoryId, categoryName, ownerId, ownerName, order, lastTransferDate: null });
      setItems(prev => prev.map(i => i.id === tid ? created : i));
      return created;
    } catch (e) {
      setItems(prev => prev.filter(i => i.id !== tid));
      showBgError(e instanceof Error ? e.message : 'アイテム追加失敗');
      throw e;
    }
  }

  async function updateItem(id: string, patch: Partial<Pick<Item, 'name' | 'categoryId' | 'categoryName'>>) {
    const prev = items.find(i => i.id === id);
    if (!prev) return;
    const updated = { ...prev, ...patch };
    setItems(is => is.map(i => i.id === id ? updated : i));
    try {
      await api.upsertItem(orgId, updated);
    } catch (e) {
      setItems(is => is.map(i => i.id === id ? prev : i));
      showBgError(e instanceof Error ? e.message : 'アイテム更新失敗');
    }
  }

  async function removeItem(id: string) {
    const snap = items.find(i => i.id === id);
    setItems(prev => prev.filter(i => i.id !== id));
    try {
      await api.deleteItem(id);
    } catch (e) {
      if (snap) setItems(prev => [...prev, snap].sort((a, b) => a.order - b.order));
      showBgError(e instanceof Error ? e.message : 'アイテム削除失敗');
    }
  }

  async function moveItem(id: string, ownerId: string, dir: 'up' | 'down') {
    const ownerItems = [...items].filter(i => i.ownerId === ownerId).sort((a, b) => a.order - b.order);
    const idx = ownerItems.findIndex(i => i.id === id);
    const swapIdx = dir === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= ownerItems.length) return;
    const nextOwner = ownerItems.map((item, i) => {
      if (i === idx) return { ...item, order: ownerItems[swapIdx].order };
      if (i === swapIdx) return { ...item, order: ownerItems[idx].order };
      return item;
    });
    setItems(prev => prev.map(item => nextOwner.find(n => n.id === item.id) ?? item));
    try {
      await api.reorderItems(orgId, nextOwner.map(i => ({ id: i.id, order: i.order })));
    } catch (e) {
      setItems(prev => prev.map(item => ownerItems.find(o => o.id === item.id) ?? item));
      showBgError(e instanceof Error ? e.message : '並び替え失敗');
    }
  }

  async function transferItemTo(itemId: string, toMemberId: string, toMemberName: string) {
    // 同一アイテムの二重操作を防ぐ
    if (pendingItems.has(itemId)) return;
    setPendingItems(s => new Set(s).add(itemId));

    const prevItem = items.find(i => i.id === itemId);
    const today = new Date().toISOString().split('T')[0];

    // 楽観的更新: アイテム所有者を即時変更
    setItems(is => is.map(i =>
      i.id === itemId ? { ...i, ownerId: toMemberId, ownerName: toMemberName, lastTransferDate: today } : i
    ));

    try {
      const { transfer } = await api.transferItem(orgId, itemId, toMemberId, toMemberName);
      // GASから返ってきた移転履歴を追加
      setTransfers(prev => [transfer, ...prev]);
    } catch (e) {
      // 失敗時: 元の状態に戻す
      if (prevItem) {
        setItems(is => is.map(i => i.id === itemId ? prevItem : i));
      }
      showBgError(e instanceof Error ? e.message : '移転に失敗しました');
    } finally {
      setPendingItems(s => { const next = new Set(s); next.delete(itemId); return next; });
    }
  }

  return {
    members, categories, items, transfers,
    loading, bgError, pendingItems, load,
    addMember, updateMember, removeMember, moveMember,
    addCategory, updateCategory, removeCategory, moveCategory,
    addItem, updateItem, removeItem, moveItem, transferItemTo,
  };
}
