import { useState, useEffect, useMemo, useRef } from 'react';
import type { OrgInfo, Item, ViewMode } from '../types';
import { useData } from '../hooks/useData';
import SideMenu from './SideMenu';
import AllItemsView from './AllItemsView';
import TransferHistoryView from './TransferHistoryView';
import RegisterModal from './RegisterModal';
import TransferModal from './TransferModal';
import './MainPage.css';

interface Props {
  org: OrgInfo;
  onLogout: () => void;
}

function pageKey(orgId: string) { return `mochimon_page_${orgId}`; }

export default function MainPage({ org, onLogout }: Props) {
  const data = useData(org.id);
  const [menuOpen, setMenuOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('member');
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showRegister, setShowRegister] = useState(false);
  const [transferItem, setTransferItem] = useState<Item | null>(null);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [addingItem, setAddingItem] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemCat, setNewItemCat] = useState('');
  const [busy, setBusy] = useState(false);
  const [pageRestored, setPageRestored] = useState(false);
  const [inviteCopied, setInviteCopied] = useState(false);
  const inviteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { data.load(); }, [data.load]);

  // データ読み込み後にLocalStorageから最後のページ状態を復元
  useEffect(() => {
    if (pageRestored || data.loading || data.members.length === 0) return;
    try {
      const saved = localStorage.getItem(pageKey(org.id));
      if (saved) {
        const { memberId, view } = JSON.parse(saved) as { memberId: string | null; view: ViewMode };
        const memberExists = memberId && data.members.find(m => m.id === memberId);
        setSelectedMemberId(memberExists ? memberId : data.members.sort((a, b) => a.order - b.order)[0].id);
        if (view && view !== 'search') setViewMode(view);
      } else {
        setSelectedMemberId(data.members.sort((a, b) => a.order - b.order)[0].id);
      }
    } catch {
      setSelectedMemberId(data.members.sort((a, b) => a.order - b.order)[0].id);
    }
    setPageRestored(true);
  }, [data.loading, data.members, org.id, pageRestored]);

  // ページ状態をLocalStorageに保存
  useEffect(() => {
    if (!pageRestored) return;
    const view = viewMode === 'search' ? 'member' : viewMode;
    localStorage.setItem(pageKey(org.id), JSON.stringify({ memberId: selectedMemberId, view }));
  }, [selectedMemberId, viewMode, pageRestored, org.id]);

  const selectedMember = data.members.find(m => m.id === selectedMemberId) ?? null;

  const memberItems = useMemo(() => {
    if (!selectedMemberId) return [];
    return data.items
      .filter(i => i.ownerId === selectedMemberId)
      .sort((a, b) => a.order - b.order);
  }, [data.items, selectedMemberId]);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return data.items.filter(i => i.name.includes(searchQuery.trim()));
  }, [data.items, searchQuery]);

  function handleSearchChange(q: string) {
    setSearchQuery(q);
    setViewMode(q.trim() ? 'search' : 'member');
  }

  function handleInvite() {
    const base = window.location.origin + window.location.pathname;
    const url = `${base}?invite=${encodeURIComponent(org.id)}&n=${encodeURIComponent(org.name)}`;
    const copy = (text: string) => {
      if (navigator.clipboard) return navigator.clipboard.writeText(text);
      const el = document.createElement('textarea');
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      return Promise.resolve();
    };
    copy(url).finally(() => {
      setInviteCopied(true);
      if (inviteTimer.current) clearTimeout(inviteTimer.current);
      inviteTimer.current = setTimeout(() => setInviteCopied(false), 3000);
    });
  }

  function handleSelectMember(id: string) {
    setSelectedMemberId(id);
    setViewMode('member');
  }

  async function wrap(fn: () => Promise<void>) {
    setBusy(true);
    try { await fn(); } finally { setBusy(false); }
  }

  async function handleAddItem(e: React.FormEvent) {
    e.preventDefault();
    if (!newItemName.trim() || !selectedMemberId || !selectedMember) return;
    const cat = data.categories.find(c => c.id === newItemCat);
    await wrap(async () => {
      await data.addItem(selectedMemberId, selectedMember.name, newItemName.trim(), newItemCat, cat?.name ?? '');
      setNewItemName('');
      setAddingItem(false);
    });
  }

  async function handleUpdateItem(e: React.FormEvent) {
    e.preventDefault();
    if (!editingItem) return;
    const cat = data.categories.find(c => c.id === editingItem.categoryId);
    await wrap(async () => {
      await data.updateItem(editingItem.id, {
        name: editingItem.name,
        categoryId: editingItem.categoryId,
        categoryName: cat?.name ?? editingItem.categoryName,
      });
      setEditingItem(null);
    });
  }

  const sortedCats = [...data.categories].sort((a, b) => a.order - b.order);

  return (
    <div className="main-page">
      <header className="main-header">
        <button className="menu-btn" onClick={() => setMenuOpen(true)}>≡</button>
        <div className="header-center">
          <span className="org-name">{org.name}</span>
          {viewMode === 'member' && selectedMember && <span className="selected-member">{selectedMember.name}</span>}
          {viewMode === 'all' && <span className="view-label">全アイテム</span>}
          {viewMode === 'history' && <span className="view-label">移転履歴</span>}
          {viewMode === 'search' && <span className="view-label">検索: {searchQuery}</span>}
        </div>
        <button className="invite-btn" onClick={handleInvite}>招待</button>
        <button className="register-btn" onClick={() => setShowRegister(true)}>登録</button>
      </header>

      <main className="main-content">
        {data.loading && <p className="loading-msg">読み込み中…</p>}
        {data.bgError && <div className="bg-error-toast">{data.bgError}</div>}
        {inviteCopied && <div className="bg-success-toast">招待URLをコピーしました</div>}

        {!data.loading && viewMode === 'all' && (
          <AllItemsView items={data.items} categories={data.categories} onSelectMember={handleSelectMember} />
        )}

        {!data.loading && viewMode === 'history' && (
          <TransferHistoryView transfers={data.transfers} categories={data.categories} onSelectMember={handleSelectMember} onDeleteInvalid={data.deleteInvalidTransfers} />
        )}

        {!data.loading && viewMode === 'search' && (
          <div className="search-results">
            <p className="search-count">{searchResults.length} 件</p>
            {searchResults.length === 0 ? (
              <p className="search-empty">見つかりません</p>
            ) : (
              <ul className="item-list">
                {searchResults.map(item => (
                  <li key={item.id} className="item-card">
                    <div className="item-card-main">
                      <div className="item-card-top">
                        <span className="item-name">{item.name}</span>
                        <div className="item-badges">
                          {item.categoryName && <span className="badge cat">{item.categoryName}</span>}
                          {/* 持ち主名をクリックするとそのメンバーのリストへ */}
                          <button
                            className="badge owner owner-link"
                            onClick={() => handleSelectMember(item.ownerId)}
                          >
                            {item.ownerName}
                          </button>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {!data.loading && viewMode === 'member' && (
          <div className="member-view">
            {!selectedMember ? (
              <div className="no-member">
                <p>メンバーを選択してください</p>
                <button className="open-register-btn" onClick={() => setShowRegister(true)}>
                  ＋ メンバーを登録する
                </button>
              </div>
            ) : (
              <>
                <MemberItemsFilter
                  categories={sortedCats}
                  items={memberItems}
                  onTransfer={item => setTransferItem(item)}
                  onEdit={item => setEditingItem(item)}
                  onDelete={id => { if (confirm('削除しますか？')) data.removeItem(id); }}
                  onMove={(id, dir) => data.moveItem(id, selectedMemberId!, dir)}
                  busy={busy}
                  pendingItems={data.pendingItems}
                  editingItem={editingItem}
                  onUpdateItem={handleUpdateItem}
                  onCancelEdit={() => setEditingItem(null)}
                  categories_sorted={sortedCats}
                  onEditingItemChange={setEditingItem}
                />

                <div className="add-item-area">
                  {addingItem ? (
                    <form onSubmit={handleAddItem} className="add-item-form">
                      <input
                        className="add-item-input"
                        placeholder="アイテム名"
                        value={newItemName}
                        onChange={e => setNewItemName(e.target.value)}
                        autoFocus
                      />
                      <select
                        className="add-item-select"
                        value={newItemCat}
                        onChange={e => setNewItemCat(e.target.value)}
                      >
                        <option value="">カテゴリなし</option>
                        {sortedCats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                      <div className="add-item-btns">
                        <button type="submit" className="add-item-save" disabled={busy || !newItemName.trim()}>追加</button>
                        <button type="button" className="add-item-cancel" onClick={() => setAddingItem(false)}>キャンセル</button>
                      </div>
                    </form>
                  ) : (
                    <button className="add-item-btn" onClick={() => setAddingItem(true)}>
                      ＋ アイテムを追加
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </main>

      {menuOpen && (
        <SideMenu
          members={data.members}
          selectedMemberId={selectedMemberId}
          viewMode={viewMode}
          searchQuery={searchQuery}
          onSearchChange={handleSearchChange}
          onSelectMember={handleSelectMember}
          onViewAll={() => setViewMode('all')}
          onViewHistory={() => setViewMode('history')}
          onLogout={onLogout}
          onClose={() => setMenuOpen(false)}
        />
      )}

      {showRegister && (
        <RegisterModal
          members={data.members}
          categories={data.categories}
          onAddMember={data.addMember}
          onUpdateMember={data.updateMember}
          onRemoveMember={data.removeMember}
          onMoveMember={data.moveMember}
          onAddCategory={data.addCategory}
          onUpdateCategory={data.updateCategory}
          onRemoveCategory={data.removeCategory}
          onMoveCategory={data.moveCategory}
          onClose={() => setShowRegister(false)}
        />
      )}

      {transferItem && (
        <TransferModal
          item={transferItem}
          members={data.members}
          onTransfer={(toId, toName) => data.transferItemTo(transferItem.id, toId, toName)}
          onClose={() => setTransferItem(null)}
        />
      )}
    </div>
  );
}

// ---- MemberItemsFilter ----

interface FilterProps {
  categories: ReturnType<typeof useData>['categories'] extends (infer T)[] ? T[] : never;
  items: Item[];
  onTransfer: (item: Item) => void;
  onEdit: (item: Item) => void;
  onDelete: (id: string) => void;
  onMove: (id: string, dir: 'up' | 'down') => void;
  busy: boolean;
  pendingItems: Set<string>;
  editingItem: Item | null;
  onUpdateItem: (e: React.FormEvent) => Promise<void>;
  onCancelEdit: () => void;
  categories_sorted: ReturnType<typeof useData>['categories'] extends (infer T)[] ? T[] : never;
  onEditingItemChange: (item: Item) => void;
}

function MemberItemsFilter({
  categories, items, onTransfer, onEdit, onDelete, onMove, busy,
  pendingItems, editingItem, onUpdateItem, onCancelEdit, categories_sorted, onEditingItemChange,
}: FilterProps) {
  const [filterName, setFilterName] = useState('');
  const [filterCat, setFilterCat] = useState('');

  const filtered = useMemo(() => {
    let list = [...items];
    if (filterName) list = list.filter(i => i.name.includes(filterName));
    if (filterCat) list = list.filter(i => i.categoryId === filterCat);
    return list;
  }, [items, filterName, filterCat]);

  return (
    <>
      <div className="member-filters">
        <input
          className="member-filter-input"
          placeholder="絞り込み…"
          value={filterName}
          onChange={e => setFilterName(e.target.value)}
        />
        <select
          className="member-filter-select"
          value={filterCat}
          onChange={e => setFilterCat(e.target.value)}
        >
          <option value="">全カテゴリ</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <p className="member-empty">アイテムがありません</p>
      ) : (
        <ul className="item-list">
          {filtered.map((item, i) => (
            <li key={item.id} className="item-card">
              {editingItem?.id === item.id ? (
                <form onSubmit={onUpdateItem} className="item-edit-form">
                  <input
                    className="item-edit-input"
                    value={editingItem.name}
                    onChange={e => onEditingItemChange({ ...editingItem, name: e.target.value })}
                    autoFocus
                  />
                  <select
                    className="item-edit-select"
                    value={editingItem.categoryId}
                    onChange={e => onEditingItemChange({ ...editingItem, categoryId: e.target.value })}
                  >
                    <option value="">カテゴリなし</option>
                    {categories_sorted.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <div className="item-edit-btns">
                    <button type="submit" className="item-save-btn" disabled={busy}>保存</button>
                    <button type="button" className="item-cancel-btn" onClick={onCancelEdit}>✕</button>
                  </div>
                </form>
              ) : (
                <div className="item-card-main">
                  {/* アイテム名＋カテゴリを同じ行に */}
                  <div className="item-card-top">
                    <span className="item-name">{item.name}</span>
                    {item.categoryName && <span className="badge cat">{item.categoryName}</span>}
                    {item.lastTransferDate && <span className="badge date">{item.lastTransferDate}</span>}
                    {pendingItems.has(item.id) && <span className="badge syncing">同期中…</span>}
                  </div>
                  <div className="item-card-actions">
                    <button
                      className="transfer-btn"
                      onClick={() => onTransfer(item)}
                      disabled={pendingItems.has(item.id)}
                    >
                      移転
                    </button>
                    <button className="item-arrow" disabled={i === 0} onClick={() => onMove(item.id, 'up')}>↑</button>
                    <button className="item-arrow" disabled={i === filtered.length - 1} onClick={() => onMove(item.id, 'down')}>↓</button>
                    <button className="item-edit-btn" onClick={() => onEdit(item)}>編集</button>
                    <button className="item-del-btn" onClick={() => onDelete(item.id)}>削除</button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
