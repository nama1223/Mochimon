import { useState, useMemo } from 'react';
import type { Item, Category } from '../types';
import './AllItemsView.css';

type SortKey = 'name' | 'category' | 'owner' | 'date';

interface Props {
  items: Item[];
  categories: Category[];
  onSelectMember: (id: string) => void;
}

export default function AllItemsView({ items, categories, onSelectMember }: Props) {
  const [filterName, setFilterName] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [sort, setSort] = useState<SortKey>('name');
  const [sortAsc, setSortAsc] = useState(true);

  const filtered = useMemo(() => {
    let list = [...items];
    if (filterName) list = list.filter(i => i.name.includes(filterName));
    if (filterCat) list = list.filter(i => i.categoryId === filterCat);
    list.sort((a, b) => {
      let cmp = 0;
      switch (sort) {
        case 'name':     cmp = a.name.localeCompare(b.name, 'ja'); break;
        case 'category': cmp = a.categoryName.localeCompare(b.categoryName, 'ja'); break;
        case 'owner':    cmp = a.ownerName.localeCompare(b.ownerName, 'ja'); break;
        case 'date':     cmp = (a.lastTransferDate ?? '').localeCompare(b.lastTransferDate ?? ''); break;
      }
      return sortAsc ? cmp : -cmp;
    });
    return list;
  }, [items, filterName, filterCat, sort, sortAsc]);

  function toggleSort(key: SortKey) {
    if (sort === key) setSortAsc(p => !p);
    else { setSort(key); setSortAsc(true); }
  }

  function sortIcon(key: SortKey) {
    if (sort !== key) return '';
    return sortAsc ? ' ↑' : ' ↓';
  }

  return (
    <div className="all-items">
      <div className="all-filters">
        <input
          className="all-filter-input"
          placeholder="名前で絞り込み"
          value={filterName}
          onChange={e => setFilterName(e.target.value)}
        />
        <select
          className="all-filter-select"
          value={filterCat}
          onChange={e => setFilterCat(e.target.value)}
        >
          <option value="">全カテゴリ</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      <div className="all-sort-row">
        {(['name', 'category', 'owner', 'date'] as SortKey[]).map(key => (
          <button
            key={key}
            className={`all-sort-btn${sort === key ? ' active' : ''}`}
            onClick={() => toggleSort(key)}
          >
            {key === 'name' ? '名前' : key === 'category' ? 'カテゴリ' : key === 'owner' ? '持ち主' : '移転日'}
            {sortIcon(key)}
          </button>
        ))}
      </div>

      <p className="all-count">{filtered.length} 件</p>

      {filtered.length === 0 ? (
        <p className="all-empty">アイテムがありません</p>
      ) : (
        <ul className="all-list">
          {filtered.map(item => (
            <li key={item.id} className="all-list-item">
              <div className="all-item-name">{item.name}</div>
              <div className="all-item-meta">
                <span className="all-badge cat">{item.categoryName || '未分類'}</span>
                <button
                  className="all-badge owner owner-link"
                  onClick={() => onSelectMember(item.ownerId)}
                >
                  {item.ownerName}
                </button>
                {item.lastTransferDate && (
                  <span className="all-badge date">{item.lastTransferDate}</span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
