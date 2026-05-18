import { useState, useMemo } from 'react';
import type { TransferRecord, Category } from '../types';
import './TransferHistoryView.css';

interface Props {
  transfers: TransferRecord[];
  categories: Category[];
  onSelectMember: (id: string) => void;
  onDeleteInvalid: () => void;
}

export default function TransferHistoryView({ transfers, categories, onSelectMember, onDeleteInvalid }: Props) {
  const [filterName, setFilterName] = useState('');
  const [filterCat, setFilterCat] = useState('');

  const invalidCount = transfers.filter(t => !t.itemName).length;

  const filtered = useMemo(() => {
    let list = [...transfers];
    if (filterName) list = list.filter(t => t.itemName.includes(filterName));
    if (filterCat) {
      const cat = categories.find(c => c.id === filterCat);
      if (cat) list = list.filter(t => t.itemName.includes(cat.name));
    }
    list.sort((a, b) => String(b.transferDate).localeCompare(String(a.transferDate)));
    return list;
  }, [transfers, filterName, filterCat, categories]);

  return (
    <div className="history">
      <div className="history-filters">
        <input
          className="history-filter-input"
          placeholder="名前で絞り込み"
          value={filterName}
          onChange={e => setFilterName(e.target.value)}
        />
        <select
          className="history-filter-select"
          value={filterCat}
          onChange={e => setFilterCat(e.target.value)}
        >
          <option value="">全カテゴリ</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {/* 不正履歴が残っている場合に削除ボタンを表示 */}
      {invalidCount > 0 && (
        <button
          className="history-clean-btn"
          onClick={() => {
            if (confirm(`移転ミスによる不正な履歴が ${invalidCount} 件あります。削除しますか？`)) {
              onDeleteInvalid();
            }
          }}
        >
          ⚠ 不正な履歴を削除（{invalidCount} 件）
        </button>
      )}

      <p className="history-count">{filtered.length} 件</p>

      {filtered.length === 0 ? (
        <p className="history-empty">移転履歴がありません</p>
      ) : (
        <ul className="history-list">
          {filtered.map(t => (
            <li key={t.id} className={`history-item${!t.itemName ? ' invalid' : ''}`}>
              {t.itemName
                ? <div className="history-item-name">{t.itemName}</div>
                : <div className="history-item-name invalid-label">（移転ミス・アイテム未登録）</div>
              }
              <div className="history-item-route">
                {t.fromMemberId ? (
                  <button className="history-member-btn" onClick={() => onSelectMember(t.fromMemberId!)}>
                    {t.fromMemberName}
                  </button>
                ) : (
                  <span className="history-from">（未登録）</span>
                )}
                <span className="history-arrow">→</span>
                <button className="history-member-btn to" onClick={() => onSelectMember(t.toMemberId)}>
                  {t.toMemberName}
                </button>
              </div>
              <div className="history-item-date">{t.transferDate}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
