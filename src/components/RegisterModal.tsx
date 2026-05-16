import { useState } from 'react';
import type { Member, Category } from '../types';
import './RegisterModal.css';

interface Props {
  members: Member[];
  categories: Category[];
  onAddMember: (name: string) => Promise<unknown>;
  onUpdateMember: (id: string, name: string) => Promise<void>;
  onRemoveMember: (id: string) => Promise<void>;
  onMoveMember: (id: string, dir: 'up' | 'down') => Promise<void>;
  onAddCategory: (name: string) => Promise<unknown>;
  onUpdateCategory: (id: string, name: string) => Promise<void>;
  onRemoveCategory: (id: string) => Promise<void>;
  onMoveCategory: (id: string, dir: 'up' | 'down') => Promise<void>;
  onClose: () => void;
}

type Tab = 'members' | 'categories';

export default function RegisterModal({
  members, categories,
  onAddMember, onUpdateMember, onRemoveMember, onMoveMember,
  onAddCategory, onUpdateCategory, onRemoveCategory, onMoveCategory,
  onClose,
}: Props) {
  const [tab, setTab] = useState<Tab>('members');
  const [newMemberName, setNewMemberName] = useState('');
  const [newCatName, setNewCatName] = useState('');
  const [editingMember, setEditingMember] = useState<{ id: string; name: string } | null>(null);
  const [editingCategory, setEditingCategory] = useState<{ id: string; name: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const sortedMembers = [...members].sort((a, b) => a.order - b.order);
  const sortedCats = [...categories].sort((a, b) => a.order - b.order);

  async function wrap(fn: () => Promise<void>) {
    setBusy(true);
    try { await fn(); } finally { setBusy(false); }
  }

  async function handleAddMember(e: React.FormEvent) {
    e.preventDefault();
    const name = newMemberName.trim();
    if (!name) return;
    await wrap(async () => { await onAddMember(name); setNewMemberName(''); });
  }

  async function handleAddCategory(e: React.FormEvent) {
    e.preventDefault();
    const name = newCatName.trim();
    if (!name) return;
    await wrap(async () => { await onAddCategory(name); setNewCatName(''); });
  }

  async function handleSaveMember(e: React.FormEvent) {
    e.preventDefault();
    if (!editingMember?.name.trim()) return;
    await wrap(async () => {
      await onUpdateMember(editingMember.id, editingMember.name.trim());
      setEditingMember(null);
    });
  }

  async function handleSaveCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!editingCategory?.name.trim()) return;
    await wrap(async () => {
      await onUpdateCategory(editingCategory.id, editingCategory.name.trim());
      setEditingCategory(null);
    });
  }

  return (
    <div className="reg-overlay" onClick={onClose}>
      <div className="reg-sheet" onClick={e => e.stopPropagation()}>
        <div className="reg-handle" />
        <div className="reg-tabs">
          <button className={`reg-tab${tab === 'members' ? ' active' : ''}`} onClick={() => setTab('members')}>
            メンバー
          </button>
          <button className={`reg-tab${tab === 'categories' ? ' active' : ''}`} onClick={() => setTab('categories')}>
            カテゴリ
          </button>
        </div>

        {tab === 'members' && (
          <div className="reg-section">
            <form onSubmit={handleAddMember} className="reg-add-form">
              <input
                className="reg-input"
                placeholder="新しいメンバー名"
                value={newMemberName}
                onChange={e => setNewMemberName(e.target.value)}
              />
              <button type="submit" className="reg-add-btn" disabled={busy || !newMemberName.trim()}>
                追加
              </button>
            </form>

            <ul className="reg-list">
              {sortedMembers.map((m, i) => (
                <li key={m.id} className="reg-item">
                  {editingMember?.id === m.id ? (
                    <form onSubmit={handleSaveMember} className="reg-edit-form">
                      <input
                        className="reg-input"
                        value={editingMember.name}
                        onChange={e => setEditingMember({ ...editingMember, name: e.target.value })}
                        autoFocus
                      />
                      <button type="submit" className="reg-save-btn" disabled={busy}>保存</button>
                      <button type="button" className="reg-cancel-btn" onClick={() => setEditingMember(null)}>✕</button>
                    </form>
                  ) : (
                    <>
                      <span className="reg-item-name">{m.name}</span>
                      <div className="reg-item-actions">
                        <button className="reg-arrow" disabled={busy || i === 0} onClick={() => wrap(() => onMoveMember(m.id, 'up'))}>↑</button>
                        <button className="reg-arrow" disabled={busy || i === sortedMembers.length - 1} onClick={() => wrap(() => onMoveMember(m.id, 'down'))}>↓</button>
                        <button className="reg-edit-btn" onClick={() => setEditingMember({ id: m.id, name: m.name })}>編集</button>
                        <button className="reg-del-btn" disabled={busy} onClick={() => { if (confirm(`「${m.name}」を削除しますか？`)) wrap(() => onRemoveMember(m.id)); }}>削除</button>
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {tab === 'categories' && (
          <div className="reg-section">
            <form onSubmit={handleAddCategory} className="reg-add-form">
              <input
                className="reg-input"
                placeholder="新しいカテゴリ名"
                value={newCatName}
                onChange={e => setNewCatName(e.target.value)}
              />
              <button type="submit" className="reg-add-btn" disabled={busy || !newCatName.trim()}>
                追加
              </button>
            </form>

            <ul className="reg-list">
              {sortedCats.map((c, i) => (
                <li key={c.id} className="reg-item">
                  {editingCategory?.id === c.id ? (
                    <form onSubmit={handleSaveCategory} className="reg-edit-form">
                      <input
                        className="reg-input"
                        value={editingCategory.name}
                        onChange={e => setEditingCategory({ ...editingCategory, name: e.target.value })}
                        autoFocus
                      />
                      <button type="submit" className="reg-save-btn" disabled={busy}>保存</button>
                      <button type="button" className="reg-cancel-btn" onClick={() => setEditingCategory(null)}>✕</button>
                    </form>
                  ) : (
                    <>
                      <span className="reg-item-name">{c.name}</span>
                      <div className="reg-item-actions">
                        <button className="reg-arrow" disabled={busy || i === 0} onClick={() => wrap(() => onMoveCategory(c.id, 'up'))}>↑</button>
                        <button className="reg-arrow" disabled={busy || i === sortedCats.length - 1} onClick={() => wrap(() => onMoveCategory(c.id, 'down'))}>↓</button>
                        <button className="reg-edit-btn" onClick={() => setEditingCategory({ id: c.id, name: c.name })}>編集</button>
                        <button className="reg-del-btn" disabled={busy} onClick={() => { if (confirm(`「${c.name}」を削除しますか？`)) wrap(() => onRemoveCategory(c.id)); }}>削除</button>
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
