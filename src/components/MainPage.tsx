import { useState, useEffect, useMemo } from 'react';
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

export default function MainPage({ org, onLogout: _onLogout }: Props) {
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

  useEffect(() => { data.load(); }, [data.load]);

  // 最初のメンバーを自動選択
  useEffect(() => {
    if (data.members.length > 0 && selectedMemberId === null) {
      setSelectedMemberId(data.members.sort((a, b) => a.order - b.order)[0].id);
    }
  }, [data.members, selectedMemberId]);

  const selectedMember = data.members.find(m => m.id === selectedMemberId) ?? null;

  const memberItems = useMemo(() => {
    if (!selectedMemberId) return [];
    return data.items
      .filter(i => i.ownerId === selectedMemberId)
      .sort((a, b) => a.order - b.order);
  }, [data.items, selectedMemberId]);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.trim();
    return data.items.filter(i => i.name.includes(q));
  }, [data.items, searchQuery]);

  function handleSearchChange(q: string) {
    setSearchQuery(q);
    if (q.trim()) setViewMode('search');
    else setViewMode('member');
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
      await data.addItem(
        selectedMemberId,
        selectedMember.name,
        newItemName.trim(),
        newItemCat,
        cat?.name ?? '',
      );
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
      {/* Header */}
      <header className="main-header">
        <button className="menu-btn" onClick={() => setMenuOpen(true)}>≡</button>
        <div className="header-center">
          <span className="org-name">{org.name}</span>
          {viewMode === 'member' && selectedMember && (
            <span className="selected-member">{selectedMember.name}</span>
          )}
          {viewMode === 'all' && <span className="view-label">全アイテム</span>}
          {viewMode === 'history' && <span className="view-label">移転履歴</span>}
          {viewMode === 'search' && <span className="view-label">検索: {searchQuery}</span>}
        </div>
        <button className="register-btn" onClick={() => setShowRegister(true)}>登録</button>
      </header>

      {/* Main content */}
      <main className="main-content">
        {data.loading && <p className="loading-msg">読み込み中…</p>}
        {data.bgError && <div className="bg-error-toast">{data.bgError}</div>}

        {!data.loading && viewMode === 'all' && (
          <AllItemsView items={data.items} categories={data.categories} />
        )}

        {!data.loading && viewMode === 'history' && (
          <TransferHistoryView transfers={data.transfers} categories={data.categories} />
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
                          <span className="badge owner">{item.ownerName}</span>
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
                {/* Filter bar */}
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

                {/* Add item */}
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

      {/* Side menu */}
      {menuOpen && (
        <SideMenu
          members={data.members}
          selectedMemberId={selectedMemberId}
          viewMode={viewMode}
          searchQuery={searchQuery}
          onSearchChange={handleSearchChange}
          onSelectMember={id => { setSelectedMemberId(id); setViewMode('member'); }}
          onViewAll={() => setViewMode('all')}
          onViewHistory={() => setViewMode('history')}
          onClose={() => setMenuOpen(false)}
        />
      )}

      {/* Register modal */}
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

      {/* Transfer modal */}
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

// ---- MemberItemsFilter: フィルタ付きアイテムリスト ----

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
                  <div className="item-card-top">
                    <span className="item-name">{item.name}</span>
                    <div className="item-badges">
                      {item.categoryName && <span className="badge cat">{item.categoryName}</span>}
                      {item.lastTransferDate && <span className="badge date">{item.lastTransferDate}</span>}
                      {pendingItems.has(item.id) && <span className="badge syncing">同期中…</span>}
                    </div>
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
