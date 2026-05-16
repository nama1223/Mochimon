import { useState } from 'react';
import type { Item, Member } from '../types';
import './TransferModal.css';

interface Props {
  item: Item;
  members: Member[];
  onTransfer: (toMemberId: string, toMemberName: string) => Promise<void>;
  onClose: () => void;
}

export default function TransferModal({ item, members, onTransfer, onClose }: Props) {
  const [selectedId, setSelectedId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const targets = members.filter(m => m.id !== item.ownerId).sort((a, b) => a.order - b.order);

  async function handleTransfer() {
    if (!selectedId) return;
    const target = members.find(m => m.id === selectedId);
    if (!target) return;
    setLoading(true);
    setError('');
    try {
      await onTransfer(target.id, target.name);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : '移転エラー');
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()}>
        <div className="modal-handle" />
        <h3 className="modal-title">持ち物を移転</h3>
        <div className="modal-item-name">{item.name}</div>
        <p className="modal-from">
          現在: <strong>{item.ownerName}</strong>
        </p>

        <p className="modal-label">移転先メンバーを選択</p>
        <div className="modal-member-list">
          {targets.length === 0 ? (
            <p className="modal-empty">他のメンバーがいません</p>
          ) : (
            targets.map(m => (
              <button
                key={m.id}
                className={`modal-member-btn${selectedId === m.id ? ' selected' : ''}`}
                onClick={() => setSelectedId(m.id)}
              >
                {m.name}
              </button>
            ))
          )}
        </div>

        {error && <p className="modal-error">{error}</p>}

        <div className="modal-actions">
          <button className="modal-cancel" onClick={onClose}>キャンセル</button>
          <button
            className="modal-confirm"
            onClick={handleTransfer}
            disabled={!selectedId || loading}
          >
            {loading ? '移転中…' : '移転する'}
          </button>
        </div>
      </div>
    </div>
  );
}
