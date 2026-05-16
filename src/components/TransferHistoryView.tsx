import { useState, useMemo } from 'react';
import type { TransferRecord, Category } from '../types';
import './TransferHistoryView.css';

interface Props {
  transfers: TransferRecord[];
  categories: Category[];
}

export default function TransferHistoryView({ transfers, categories }: Props) {
  const [filterName, setFilterName] = useState('');
  const [filterCat, setFilterCat] = useState('');

  // transfers don't store categoryId — filter by category name substring
  const filtered = useMemo(() => {
    let list = [...transfers];
    if (filterName) list = list.filter(t => t.itemName.includes(filterName));
    if (filterCat) {
      const cat = categories.find(c => c.id === filterCat);
      if (cat) list = list.filter(t => t.itemName.includes(cat.name));
    }
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

      <p className="history-count">{filtered.length} 件</p>

      {filtered.length === 0 ? (
        <p className="history-empty">移転履歴がありません</p>
      ) : (
        <ul className="history-list">
          {filtered.map(t => (
            <li key={t.id} className="history-item">
              <div className="history-item-name">{t.itemName}</div>
              <div className="history-item-route">
                <span className="history-from">{t.fromMemberName ?? '（未登録）'}</span>
                <span className="history-arrow">→</span>
                <span className="history-to">{t.toMemberName}</span>
              </div>
              <div className="history-item-date">{t.transferDate}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
